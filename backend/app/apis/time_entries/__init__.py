from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
import asyncpg
import databutton as db
import aiohttp
import os
from app.auth import AuthorizedUser
from datetime import date, time, datetime, timedelta

router = APIRouter(prefix="/time-entries")

# ---------------- Pydantic Models ----------------

class TimeEntryCreateRequest(BaseModel):
    company_id: int
    project_id: int
    date: date
    service_id: Optional[int] = None
    comment: Optional[str] = None
    # je mag óf hours_worked meesturen, óf start/end time (of allebei; dan valideren we)
    hours_worked: Optional[float] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    @field_validator("hours_worked")
    @classmethod
    def _validate_hours_range(cls, v):
        if v is None:
            return v
        if v < 0 or v > 24:
            raise ValueError("Hours worked must be between 0 and 24")
        return v


class TimeEntryUpdateRequest(BaseModel):
    service_id: Optional[int] = None
    comment: Optional[str] = None
    hours_worked: Optional[float] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    @field_validator("hours_worked")
    @classmethod
    def _validate_hours_range(cls, v):
        if v is None:
            return v
        if v < 0 or v > 24:
            raise ValueError("Hours worked must be between 0 and 24")
        return v


class TimeEntryResponse(BaseModel):
    id: int
    employee_id: int
    company_id: int
    company_name: str
    project_id: int
    project_name: str
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    service_color: Optional[str] = None
    date: str
    hours_worked: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    comment: Optional[str] = None
    created_at: str


class TimeEntriesListResponse(BaseModel):
    time_entries: List[TimeEntryResponse]
    total: int


class ProjectCompanyAvailableHours(BaseModel):
    company_id: int
    company_name: str
    project_id: int
    project_name: str
    available_hours: float
    used_hours: float
    remaining_hours: float
    unlimited_hours: bool


class AvailableHoursResponse(BaseModel):
    project_companies: List[ProjectCompanyAvailableHours]


class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str


class EmployeesResponse(BaseModel):
    employees: List[EmployeeResponse]

# ---------------- DB helper ----------------

from app.libs.database import get_db_connection

# ---------------- Helpers ----------------

def _to_iso(value):
    if value is None:
        return None
    iso = getattr(value, "isoformat", None)
    if callable(iso):
        return iso()
    return str(value)

async def fetch_user_display_name(user_id: str) -> str:
    """Fetch user's display name from StackAuth API."""
    try:
        # Get StackAuth API key from environment
        api_key = os.getenv('STACK_AUTH_API_KEY')
        project_id = "c1ede18c-21ff-4d6c-8748-f0c50b0c5b2b"
        
        if not api_key:
            print("Warning: STACK_AUTH_API_KEY not found in environment")
            return f"User {user_id}"
        
        # Call StackAuth API to get user info
        url = f"https://api.stack-auth.com/api/v1/users/{user_id}"
        headers = {
            "x-stack-secret-server-key": api_key,
            "x-stack-project-id": project_id,
            "x-stack-access-type": "server"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    display_name = data.get('display_name')
                    if display_name:
                        return display_name
                    else:
                        print(f"No display_name found for user {user_id}")
                        return f"User {user_id}"
                else:
                    print(f"Failed to fetch user info for {user_id}: {response.status}")
                    return f"User {user_id}"
    except Exception as e:
        print(f"Error fetching display name for user {user_id}: {e}")
        return f"User {user_id}"


async def get_or_create_employee(conn: asyncpg.Connection, user: AuthorizedUser) -> int:
    user_id = user.sub
    user_email = getattr(user, 'email', None) or getattr(user, 'primary_email', None) or f"{user_id}@timeflow.local"
    
    # Try to get display name from JWT first, then fetch from API if needed
    user_name = getattr(user, 'display_name', None) or getattr(user, 'name', None)
    if not user_name:
        user_name = await fetch_user_display_name(user_id)

    employee_query = "SELECT id FROM employees WHERE email = $1 OR email = $2"
    employee_row = await conn.fetchrow(employee_query, user_email, user_id)
    if employee_row:
        return employee_row['id']

    create_query = """
        INSERT INTO employees (name, email)
        VALUES ($1, $2)
        RETURNING id
    """
    new_employee = await conn.fetchrow(create_query, user_name, user_email)
    return new_employee['id']


def _duration_hours_from_times(d: date, start_t: time, end_t: time) -> float:
    # aannames: dezelfde dag (geen overnight logging)
    start_dt = datetime.combine(d, start_t)
    end_dt = datetime.combine(d, end_t)
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    duration = end_dt - start_dt
    return duration.total_seconds() / 3600.0


async def _has_overlap(conn: asyncpg.Connection, employee_id: int, d: date, start_t: time, end_t: time, exclude_id: Optional[int] = None) -> bool:
    """
    Check overlapping entries for the same employee & date.
    We consider overlap when NOT (existing_end <= new_start OR existing_start >= new_end).
    Null start/end in DB are ignored for overlap logic.
    """
    where = "employee_id = $1 AND date = $2 AND start_time IS NOT NULL AND end_time IS NOT NULL"
    params = [employee_id, d]

    if exclude_id is not None:
        where += " AND id <> $3"
        params.append(exclude_id)

    # Determine next parameter indices for start/end based on current params length
    next_idx = len(params) + 1
    start_idx = next_idx
    end_idx = next_idx + 1

    query = f"""
        SELECT 1
        FROM time_entries
        WHERE {where}
          AND NOT (end_time <= ${start_idx} OR start_time >= ${end_idx})
        LIMIT 1
    """
    params.extend([start_t, end_t])
    row = await conn.fetchrow(query, *params)
    return row is not None

# ---------------- API ----------------

@router.post("/", response_model=TimeEntryResponse)
async def create_time_entry(entry: TimeEntryCreateRequest, user: AuthorizedUser):
    # Basisvalidering van invoercombinaties
    if entry.start_time and entry.end_time:
        # bereken uren op basis van tijden
        computed = _duration_hours_from_times(entry.date, entry.start_time, entry.end_time)
        if entry.hours_worked is not None:
            # als beide zijn meegegeven moeten ze (ongeveer) overeenkomen
            if abs(entry.hours_worked - computed) > 1e-6:
                raise HTTPException(status_code=400, detail="hours_worked must match the duration between start_time and end_time")
        entry.hours_worked = computed
    elif entry.hours_worked is None:
        # geen tijden en geen uren -> invalid
        raise HTTPException(status_code=400, detail="Provide either hours_worked, or start_time and end_time")

    if entry.hours_worked < 0 or entry.hours_worked > 24:
        raise HTTPException(status_code=400, detail="Hours worked must be between 0 and 24")

    conn = await get_db_connection()
    try:
        async with conn.transaction():
            employee_id = await get_or_create_employee(conn, user)

            # Valideer project-company combinatie
            pc_query = "SELECT COALESCE(available_hours, 0) AS available_hours, unlimited_hours FROM project_companies WHERE project_id = $1 AND company_id = $2"
            pc_row = await conn.fetchrow(pc_query, entry.project_id, entry.company_id)
            if not pc_row:
                raise HTTPException(
                    status_code=400,
                    detail=f"Project {entry.project_id} is not linked to company {entry.company_id}",
                )

            # Skip validation for unlimited hour projects
            if not pc_row["unlimited_hours"]:
                available_hours = float(pc_row["available_hours"])

                # Check huidige verbruik
                used_query = """
                    SELECT COALESCE(SUM(hours_worked), 0) as total_used
                    FROM time_entries
                    WHERE project_id = $1 AND company_id = $2
                """
                used_row = await conn.fetchrow(used_query, entry.project_id, entry.company_id)
                current_used = float(used_row["total_used"])

                if current_used + float(entry.hours_worked) > available_hours:
                    remaining = available_hours - current_used
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot log {entry.hours_worked} hours. Only {remaining} hours remaining.",
                    )

            # Overlapcontrole (alleen als tijden zijn opgegeven)
            if entry.start_time and entry.end_time:
                if await _has_overlap(conn, employee_id, entry.date, entry.start_time, entry.end_time):
                    raise HTTPException(
                        status_code=400,
                        detail="This time range overlaps with an existing entry for this day.",
                    )

            # Invoegen
            insert_query = """
                INSERT INTO time_entries (employee_id, company_id, project_id, service_id, date, hours_worked, start_time, end_time, comment)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, employee_id, company_id, project_id, service_id, date, hours_worked, start_time, end_time, comment, created_at
            """
            row = await conn.fetchrow(
                insert_query,
                employee_id,
                entry.company_id,
                entry.project_id,
                entry.service_id,
                entry.date,
                float(entry.hours_worked),
                entry.start_time,
                entry.end_time,
                entry.comment,
            )

            # Namen ophalen
            names_query = """
                SELECT c.company_name, p.project_name, s.name as service_name
                FROM companies c, projects p
                LEFT JOIN services s ON s.id = $3
                WHERE c.id = $1 AND p.id = $2
            """
            names_row = await conn.fetchrow(names_query, entry.company_id, entry.project_id, entry.service_id)

            return TimeEntryResponse(
                id=row["id"],
                employee_id=row["employee_id"],
                company_id=row["company_id"],
                company_name=names_row["company_name"],
                project_id=row["project_id"],
                project_name=names_row["project_name"],
                service_id=row["service_id"],
                service_name=names_row["service_name"],
                date=_to_iso(row["date"]),
                hours_worked=float(row["hours_worked"]),
                start_time=_to_iso(row["start_time"]) if row["start_time"] else None,
                end_time=_to_iso(row["end_time"]) if row["end_time"] else None,
                comment=row["comment"],
                created_at=_to_iso(row["created_at"]),
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()


@router.get("/", response_model=TimeEntriesListResponse)
async def list_time_entries(
    user: AuthorizedUser,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    employee_id_filter: Optional[int] = None,
):
    conn = await get_db_connection()
    try:
        # Use the filter if provided, otherwise use current user's employee ID
        if employee_id_filter is not None:
            employee_id = employee_id_filter
        else:
            employee_id = await get_or_create_employee(conn, user)

        where_conditions = ["te.employee_id = $1"]
        params = [employee_id]
        param_count = 1

        if start_date:
            param_count += 1
            where_conditions.append(f"te.date >= ${param_count}")
            params.append(start_date)

        if end_date:
            param_count += 1
            where_conditions.append(f"te.date <= ${param_count}")
            params.append(end_date)

        query = f"""
            SELECT te.id, te.employee_id, te.company_id, c.company_name,
                   te.project_id, p.project_name, te.service_id, s.name as service_name, s.service_color,
                   te.date, te.hours_worked, te.start_time, te.end_time, te.comment, te.created_at
            FROM time_entries te
            JOIN companies c ON te.company_id = c.id
            JOIN projects p ON te.project_id = p.id
            LEFT JOIN services s ON te.service_id = s.id
            WHERE {' AND '.join(where_conditions)}
            ORDER BY te.date DESC, te.start_time NULLS LAST, te.created_at DESC
        """

        rows = await conn.fetch(query, *params)

        time_entries = [
            TimeEntryResponse(
                id=r["id"],
                employee_id=r["employee_id"],
                company_id=r["company_id"],
                company_name=r["company_name"],
                project_id=r["project_id"],
                project_name=r["project_name"],
                service_id=r["service_id"],
                service_name=r["service_name"],
                service_color=r["service_color"],
                date=_to_iso(r["date"]),
                hours_worked=float(r["hours_worked"]),
                start_time=_to_iso(r["start_time"]) if r["start_time"] else None,
                end_time=_to_iso(r["end_time"]) if r["end_time"] else None,
                comment=r["comment"],
                created_at=_to_iso(r["created_at"]),
            )
            for r in rows
        ]

        return TimeEntriesListResponse(time_entries=time_entries, total=len(time_entries))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()


@router.get("/available-hours", response_model=AvailableHoursResponse)
async def get_available_hours(user: AuthorizedUser):
    conn = await get_db_connection()
    try:
        query = """
            SELECT 
                pc.company_id, c.company_name,
                pc.project_id, p.project_name,
                pc.available_hours,
                pc.unlimited_hours,
                COALESCE(SUM(te.hours_worked), 0) as used_hours
            FROM project_companies pc
            JOIN companies c ON pc.company_id = c.id
            JOIN projects p ON pc.project_id = p.id
            LEFT JOIN time_entries te ON pc.project_id = te.project_id AND pc.company_id = te.company_id
            GROUP BY pc.company_id, c.company_name, pc.project_id, p.project_name, pc.available_hours, pc.unlimited_hours
            ORDER BY c.company_name, p.project_name
        """
        rows = await conn.fetch(query)
        project_companies = [
            ProjectCompanyAvailableHours(
                company_id=row["company_id"],
                company_name=row["company_name"],
                project_id=row["project_id"],
                project_name=row["project_name"],
                available_hours=999999 if row["unlimited_hours"] else float(row["available_hours"] or 0),
                used_hours=float(row["used_hours"]),
                remaining_hours=999999 if row["unlimited_hours"] else (float(row["available_hours"] or 0) - float(row["used_hours"])),
                unlimited_hours=row["unlimited_hours"],
            )
            for row in rows
        ]
        return AvailableHoursResponse(project_companies=project_companies)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()


@router.put("/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(entry_id: int, payload: TimeEntryUpdateRequest, user: AuthorizedUser):
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            employee_id = await get_or_create_employee(conn, user)

            # Ensure the entry exists and belongs to the user
            current_row = await conn.fetchrow(
                "SELECT id, employee_id, company_id, project_id, date, hours_worked, start_time, end_time FROM time_entries WHERE id = $1 AND employee_id = $2",
                entry_id,
                employee_id,
            )
            if not current_row:
                raise HTTPException(status_code=404, detail="Time entry not found")

            # Determine new values based on provided payload and existing values
            new_start = payload.start_time if payload.start_time is not None else current_row["start_time"]
            new_end = payload.end_time if payload.end_time is not None else current_row["end_time"]

            if new_start and new_end:
                computed = _duration_hours_from_times(current_row["date"], new_start, new_end)
                if payload.hours_worked is not None and abs(payload.hours_worked - computed) > 1e-6:
                    raise HTTPException(status_code=400, detail="hours_worked must match the duration between start_time and end_time")
                new_hours = computed
            else:
                new_hours = payload.hours_worked if payload.hours_worked is not None else float(current_row["hours_worked"])

            if new_hours < 0 or new_hours > 24:
                raise HTTPException(status_code=400, detail="Hours worked must be between 0 and 24")

            # Overlap check (ignore the current entry itself)
            if new_start and new_end:
                if await _has_overlap(conn, employee_id, current_row["date"], new_start, new_end, exclude_id=entry_id):
                    raise HTTPException(status_code=400, detail="This time range overlaps with an existing entry for this day.")

            # Check available hours (excluding this entry)
            used_row = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(hours_worked), 0) AS total_used
                FROM time_entries
                WHERE project_id = $1 AND company_id = $2 AND id <> $3
                """,
                current_row["project_id"],
                current_row["company_id"],
                entry_id,
            )
            current_used_other = float(used_row["total_used"]) if used_row and used_row["total_used"] is not None else 0.0

            avail_row = await conn.fetchrow(
                "SELECT COALESCE(available_hours, 0) AS available_hours, unlimited_hours FROM project_companies WHERE project_id = $1 AND company_id = $2",
                current_row["project_id"],
                current_row["company_id"],
            )
            if not avail_row:
                raise HTTPException(status_code=400, detail="Project is not linked to company")
            
            # Skip validation for unlimited hour projects
            if not avail_row["unlimited_hours"]:
                available_hours = float(avail_row["available_hours"])

                if current_used_other + float(new_hours) > available_hours:
                    remaining = available_hours - current_used_other
                    raise HTTPException(status_code=400, detail=f"Cannot log {new_hours} hours. Only {remaining} hours remaining.")

            # Perform update
            updated = await conn.fetchrow(
                """
                UPDATE time_entries
                SET hours_worked = $1,
                    start_time = $2,
                    end_time = $3,
                    service_id = $4,
                    comment = $5
                WHERE id = $6
                RETURNING id, employee_id, company_id, project_id, service_id, date, hours_worked, start_time, end_time, comment, created_at
                """,
                float(new_hours),
                new_start,
                new_end,
                payload.service_id,
                payload.comment,
                entry_id,
            )

            names = await conn.fetchrow(
                "SELECT c.company_name, p.project_name, s.name as service_name FROM companies c, projects p LEFT JOIN services s ON s.id = $3 WHERE c.id = $1 AND p.id = $2",
                updated["company_id"],
                updated["project_id"],
                updated["service_id"],
            )

            return TimeEntryResponse(
                id=updated["id"],
                employee_id=updated["employee_id"],
                company_id=updated["company_id"],
                company_name=names["company_name"],
                project_id=updated["project_id"],
                project_name=names["project_name"],
                service_id=updated["service_id"],
                service_name=names["service_name"],
                date=_to_iso(updated["date"]),
                hours_worked=float(updated["hours_worked"]),
                start_time=_to_iso(updated["start_time"]) if updated["start_time"] else None,
                end_time=_to_iso(updated["end_time"]) if updated["end_time"] else None,
                comment=updated["comment"],
                created_at=_to_iso(updated["created_at"]),
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()


@router.get("/employees", response_model=EmployeesResponse)
async def get_employees(user: AuthorizedUser):
    """Get all employees."""
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("SELECT id, name, email FROM employees ORDER BY name")
        employees = [
            EmployeeResponse(
                id=row["id"],
                name=row["name"],
                email=row["email"]
            )
            for row in rows
        ]
        return EmployeesResponse(employees=employees)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()


@router.delete("/{entry_id}")
async def delete_time_entry(entry_id: int, user: AuthorizedUser):
    conn = await get_db_connection()
    try:
        employee_id = await get_or_create_employee(conn, user)
        result = await conn.execute("DELETE FROM time_entries WHERE id = $1 AND employee_id = $2", entry_id, employee_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Time entry not found")
        return {"message": "Time entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()