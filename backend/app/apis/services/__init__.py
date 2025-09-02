"""
Services API - CRUD operations for service management in TimeFlow

Provides endpoints to manage services within projects with budget tracking.
All endpoints are auth-protected and use typed Pydantic models.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
import asyncpg
import databutton as db
from app.auth import AuthorizedUser
from datetime import date

router = APIRouter(prefix="/services")

# Pydantic Models
class ServiceCreateRequest(BaseModel):
    """Request model for creating a new service."""
    project_id: int = Field(..., description="Project ID (required)")
    company_id: Optional[int] = Field(None, description="Company ID (optional)")
    name: str = Field(..., min_length=1, description="Service name (required, non-empty)")
    price_type: str = Field(..., description="Price type: FIXED or HOURLY")
    budget_hours: float = Field(0, ge=0, description="Budget hours (default: 0)")
    fixed_price: Optional[float] = Field(None, ge=0, description="Fixed price (for FIXED price type)")
    hourly_rate: Optional[float] = Field(None, ge=0, description="Hourly rate (for HOURLY price type)")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    service_color: Optional[str] = Field(None, description="Service color (hex code)")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Service name cannot be empty')
        return v.strip()
    
    @validator('price_type')
    def validate_price_type(cls, v):
        if v not in ['FIXED', 'HOURLY']:
            raise ValueError('Price type must be FIXED or HOURLY')
        return v
    
    @validator('fixed_price')
    def validate_fixed_price(cls, v, values):
        if values.get('price_type') == 'FIXED' and v is None:
            raise ValueError('Fixed price is required for FIXED price type')
        return v
    
    @validator('hourly_rate')
    def validate_hourly_rate(cls, v, values):
        if values.get('price_type') == 'HOURLY' and v is None:
            raise ValueError('Hourly rate is required for HOURLY price type')
        return v
    
    @validator('start_date', 'end_date')
    def validate_dates(cls, v):
        if v is not None:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v

class ServiceUpdateRequest(BaseModel):
    """Request model for updating an existing service."""
    company_id: Optional[int] = Field(None, description="Company ID")
    name: Optional[str] = Field(None, min_length=1, description="Service name")
    price_type: Optional[str] = Field(None, description="Price type: FIXED or HOURLY")
    budget_hours: Optional[float] = Field(None, ge=0, description="Budget hours")
    fixed_price: Optional[float] = Field(None, ge=0, description="Fixed price")
    hourly_rate: Optional[float] = Field(None, ge=0, description="Hourly rate")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    service_color: Optional[str] = Field(None, description="Service color (hex code)")
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Service name cannot be empty')
        return v.strip() if v else v
    
    @validator('price_type')
    def validate_price_type(cls, v):
        if v is not None and v not in ['FIXED', 'HOURLY']:
            raise ValueError('Price type must be FIXED or HOURLY')
        return v
    
    @validator('start_date', 'end_date')
    def validate_dates(cls, v):
        if v is not None:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v

class ServiceResponse(BaseModel):
    """Response model for service data."""
    id: int
    project_id: int
    company_id: Optional[int]
    name: str
    price_type: str
    budget_hours: float
    fixed_price: Optional[float]
    hourly_rate: Optional[float]
    start_date: Optional[str]
    end_date: Optional[str]
    service_color: Optional[str]
    created_at: str

class ServiceRow(BaseModel):
    """Service row model for project services summary."""
    id: int
    project_id: int
    company_id: Optional[int]
    name: str
    price_type: str  # "FIXED" | "HOURLY"
    budget_hours: float
    fixed_price: Optional[float]
    hourly_rate: Optional[float]
    start_date: Optional[str]
    end_date: Optional[str]
    spent_hours: float
    budget_cost: float
    spent_cost: float

class ServicesTotals(BaseModel):
    """Services totals model for project summary."""
    hours_budget: float
    hours_spent: float
    cost_budget: float
    cost_spent: float

class ProjectServicesSummaryResponse(BaseModel):
    """Response model for project services summary."""
    services: List[ServiceRow]
    totals: ServicesTotals

# Database connection helper
from app.libs.database import get_db_connection

# API Endpoints
@router.post("/", response_model=ServiceResponse)
async def create_service(service: ServiceCreateRequest, user: AuthorizedUser):
    """Create a new service."""
    conn = await get_db_connection()
    try:
        # Check if project exists
        project_query = "SELECT id FROM projects WHERE id = $1"
        project_exists = await conn.fetchrow(project_query, service.project_id)
        
        if not project_exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if company exists (if provided)
        if service.company_id:
            company_query = "SELECT id FROM companies WHERE id = $1"
            company_exists = await conn.fetchrow(company_query, service.company_id)
            
            if not company_exists:
                raise HTTPException(status_code=404, detail="Company not found")
        
        # Validate budget_hours against available hours from project_companies
        try:
            if service.company_id is not None:
                avail_row = await conn.fetchrow(
                    "SELECT available_hours, unlimited_hours FROM project_companies WHERE project_id = $1 AND company_id = $2",
                    service.project_id,
                    service.company_id,
                )
                if avail_row and avail_row["unlimited_hours"]:
                    # Unlimited hours - no validation needed
                    available_hours = 999999
                else:
                    available_hours = float(avail_row["available_hours"]) if avail_row and avail_row["available_hours"] else 0.0
            else:
                # Sum across all companies linked to the project when no company is chosen
                sum_row = await conn.fetchrow(
                    "SELECT COALESCE(SUM(CASE WHEN unlimited_hours = FALSE THEN available_hours ELSE 0 END), 0) AS total_available, COUNT(CASE WHEN unlimited_hours = TRUE THEN 1 END) as unlimited_count FROM project_companies WHERE project_id = $1",
                    service.project_id,
                )
                if sum_row and sum_row["unlimited_count"] > 0:
                    # At least one company has unlimited hours
                    available_hours = 999999
                else:
                    available_hours = float(sum_row["total_available"]) if sum_row else 0.0

            if float(service.budget_hours) > available_hours:
                raise HTTPException(
                    status_code=400,
                    detail=f"budget_hours ({service.budget_hours}) cannot exceed available hours ({available_hours}) from project_companies",
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error validating available hours: {str(e)}")
        
                # Insert service into database
        query = """
            INSERT INTO services (project_id, company_id, name, price_type, budget_hours, fixed_price, hourly_rate, start_date, end_date, service_color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, project_id, company_id, name, price_type, budget_hours, fixed_price, hourly_rate, start_date, end_date, service_color, created_at
"""
        
        # Convert date strings to date objects or None
        start_date_obj = date.fromisoformat(service.start_date) if service.start_date else None
        end_date_obj = date.fromisoformat(service.end_date) if service.end_date else None
        
        row = await conn.fetchrow(
            query,
            service.project_id,
            service.company_id,
            service.name,
            service.price_type,
            service.budget_hours,
            service.fixed_price,
            service.hourly_rate,
            start_date_obj,
            end_date_obj,
            service.service_color,
        )
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create service")
        
        return ServiceResponse(
            id=row['id'],
            project_id=row['project_id'],
            company_id=row['company_id'],
            name=row['name'],
            price_type=row['price_type'],
            budget_hours=float(row['budget_hours']),
            fixed_price=float(row['fixed_price']) if row['fixed_price'] else None,
            hourly_rate=float(row['hourly_rate']) if row['hourly_rate'] else None,
            start_date=row['start_date'].isoformat() if row['start_date'] else None,
            end_date=row['end_date'].isoformat() if row['end_date'] else None,
            service_color=row['service_color'],
            created_at=row['created_at'].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, user: AuthorizedUser):
    """Get a specific service by ID."""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, project_id, company_id, name, price_type, budget_hours, fixed_price, hourly_rate, start_date, end_date, service_color, created_at
            FROM services
            WHERE id = $1
        """
        
        row = await conn.fetchrow(query, service_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Service not found")
        
        return ServiceResponse(
            id=row['id'],
            project_id=row['project_id'],
            company_id=row['company_id'],
            name=row['name'],
            price_type=row['price_type'],
            budget_hours=float(row['budget_hours']),
            fixed_price=float(row['fixed_price']) if row['fixed_price'] else None,
            hourly_rate=float(row['hourly_rate']) if row['hourly_rate'] else None,
            start_date=row['start_date'].isoformat() if row['start_date'] else None,
            end_date=row['end_date'].isoformat() if row['end_date'] else None,
            service_color=row['service_color'],
            created_at=row['created_at'].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: int, service: ServiceUpdateRequest, user: AuthorizedUser):
    """Update an existing service."""
    conn = await get_db_connection()
    try:
        # Check if service exists
        existing_query = "SELECT id, project_id FROM services WHERE id = $1"
        existing_service = await conn.fetchrow(existing_query, service_id)
        
        if not existing_service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Check if company exists (if provided)
        if service.company_id:
            company_query = "SELECT id FROM companies WHERE id = $1"
            company_exists = await conn.fetchrow(company_query, service.company_id)
            
            if not company_exists:
                raise HTTPException(status_code=404, detail="Company not found")
        
        # Build update query dynamically
        update_fields = []
        params = []
        param_count = 1
        
        if service.company_id is not None:
            update_fields.append(f"company_id = ${param_count}")
            params.append(service.company_id)
            param_count += 1
        
        if service.name is not None:
            update_fields.append(f"name = ${param_count}")
            params.append(service.name)
            param_count += 1
        
        if service.price_type is not None:
            update_fields.append(f"price_type = ${param_count}")
            params.append(service.price_type)
            param_count += 1
        
        if service.budget_hours is not None:
            update_fields.append(f"budget_hours = ${param_count}")
            params.append(service.budget_hours)
            param_count += 1
        
        if service.fixed_price is not None:
            update_fields.append(f"fixed_price = ${param_count}")
            params.append(service.fixed_price)
            param_count += 1
        
        if service.hourly_rate is not None:
            update_fields.append(f"hourly_rate = ${param_count}")
            params.append(service.hourly_rate)
            param_count += 1
        
        if service.start_date is not None:
            update_fields.append(f"start_date = ${param_count}")
            params.append(date.fromisoformat(service.start_date))
            param_count += 1
        
        if service.end_date is not None:
            update_fields.append(f"end_date = ${param_count}")
            params.append(date.fromisoformat(service.end_date))
            param_count += 1
        
        if service.service_color is not None:
            update_fields.append(f"service_color = ${param_count}")
            params.append(service.service_color)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Before applying update, enforce budget constraint if budget_hours or company_id is being changed
        try:
            validate_budget = False
            new_company_id = None
            new_budget_hours = None
            
            if service.company_id is not None:
                new_company_id = service.company_id
                validate_budget = True
            else:
                # Keep existing company if not provided in update
                existing_company_row = await conn.fetchrow("SELECT company_id, budget_hours FROM services WHERE id = $1", service_id)
                new_company_id = existing_company_row['company_id'] if existing_company_row else None
            
            if service.budget_hours is not None:
                new_budget_hours = float(service.budget_hours)
                validate_budget = True
            else:
                if 'budget_hours' not in [f.split(' = ')[0] for f in update_fields]:
                    # fetch existing budget_hours if not updating
                    existing_bh_row = await conn.fetchrow("SELECT budget_hours FROM services WHERE id = $1", service_id)
                    new_budget_hours = float(existing_bh_row['budget_hours']) if existing_bh_row else 0.0
            
            if validate_budget:
                if new_company_id is not None:
                    avail_row = await conn.fetchrow(
                        "SELECT COALESCE(available_hours, 0) AS available_hours FROM project_companies WHERE project_id = $1 AND company_id = $2",
                        existing_service['project_id'],
                        new_company_id,
                    )
                    available_hours = float(avail_row['available_hours']) if avail_row else 0.0
                else:
                    sum_row = await conn.fetchrow(
                        "SELECT COALESCE(SUM(available_hours), 0) AS total_available FROM project_companies WHERE project_id = $1",
                        existing_service['project_id'],
                    )
                    available_hours = float(sum_row['total_available']) if sum_row else 0.0
                if float(new_budget_hours or 0.0) > available_hours:
                    raise HTTPException(
                        status_code=400,
                        detail=f"budget_hours ({new_budget_hours}) cannot exceed available hours ({available_hours}) from project_companies",
                    )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error validating available hours: {str(e)}")
        
        # Add service_id to params
        params.append(service_id)
        
        query = f"""
            UPDATE services 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING id, project_id, company_id, name, price_type, budget_hours, fixed_price, hourly_rate, start_date, end_date, service_color, created_at
        """
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to update service")
        
        return ServiceResponse(
            id=row['id'],
            project_id=row['project_id'],
            company_id=row['company_id'],
            name=row['name'],
            price_type=row['price_type'],
            budget_hours=float(row['budget_hours']),
            fixed_price=float(row['fixed_price']) if row['fixed_price'] else None,
            hourly_rate=float(row['hourly_rate']) if row['hourly_rate'] else None,
            start_date=row['start_date'].isoformat() if row['start_date'] else None,
            end_date=row['end_date'].isoformat() if row['end_date'] else None,
            service_color=row['service_color'],
            created_at=row['created_at'].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.delete("/{service_id}")
async def delete_service(service_id: int, user: AuthorizedUser):
    """Delete a service."""
    conn = await get_db_connection()
    try:
        # Check if service exists
        existing_query = "SELECT id FROM services WHERE id = $1"
        existing_service = await conn.fetchrow(existing_query, service_id)
        
        if not existing_service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Check if service has time entries
        time_entries_query = "SELECT COUNT(*) FROM time_entries WHERE service_id = $1"
        time_entries_count = await conn.fetchval(time_entries_query, service_id)
        
        if time_entries_count > 0:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete service that has time entries. Please remove or reassign time entries first."
            )
        
        # Delete the service
        delete_query = "DELETE FROM services WHERE id = $1"
        result = await conn.execute(delete_query, service_id)
        
        if result == "DELETE 0":
            raise HTTPException(status_code=500, detail="Failed to delete service")
        
        return {"message": "Service deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.get("/project/{project_id}/summary", response_model=ProjectServicesSummaryResponse)
async def get_project_services_summary(project_id: int, user: AuthorizedUser):
    """Get services summary for a specific project."""
    conn = await get_db_connection()
    try:
        # First check if project exists
        project_query = "SELECT id FROM projects WHERE id = $1"
        project_exists = await conn.fetchrow(project_query, project_id)
        
        if not project_exists:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get services for the project
        services_query = """
            SELECT 
                s.id,
                s.project_id,
                s.company_id,
                s.name,
                s.price_type,
                s.budget_hours,
                s.fixed_price,
                s.hourly_rate,
                s.start_date,
                s.end_date,
                COALESCE(SUM(te.hours_worked), 0) as spent_hours,
                CASE 
                    WHEN s.price_type = 'FIXED' THEN COALESCE(s.fixed_price, 0)
                    WHEN s.price_type = 'HOURLY' THEN s.budget_hours * COALESCE(s.hourly_rate, 0)
                    ELSE 0
                END as budget_cost,
                CASE 
                    WHEN s.price_type = 'FIXED' THEN 0
                    WHEN s.price_type = 'HOURLY' THEN COALESCE(SUM(te.hours_worked), 0) * COALESCE(s.hourly_rate, 0)
                    ELSE 0
                END as spent_cost
            FROM services s
            LEFT JOIN time_entries te ON s.id = te.service_id
            WHERE s.project_id = $1
            GROUP BY s.id, s.project_id, s.company_id, s.name, s.price_type, 
                     s.budget_hours, s.fixed_price, s.hourly_rate, s.start_date, s.end_date
            ORDER BY s.name
        """
        
        services_rows = await conn.fetch(services_query, project_id)
        
        # Get total available hours from project_companies
        available_hours_query = """
            SELECT 
                COALESCE(SUM(CASE WHEN unlimited_hours = FALSE THEN available_hours ELSE 0 END), 0) as total_available_hours,
                COUNT(CASE WHEN unlimited_hours = TRUE THEN 1 END) as unlimited_companies_count
            FROM project_companies 
            WHERE project_id = $1
        """
        available_row = await conn.fetchrow(available_hours_query, project_id)
        total_available_hours = float(available_row['total_available_hours']) if available_row else 0.0
        has_unlimited_hours = available_row and available_row['unlimited_companies_count'] > 0
        
        # Calculate totals
        services = []
        total_hours_budget = 0
        total_hours_spent = 0
        total_cost_budget = 0
        total_cost_spent = 0
        
        for row in services_rows:
            service = ServiceRow(
                id=row['id'],
                project_id=row['project_id'],
                company_id=row['company_id'],
                name=row['name'],
                price_type=row['price_type'],
                budget_hours=float(row['budget_hours']),
                fixed_price=float(row['fixed_price']) if row['fixed_price'] else None,
                hourly_rate=float(row['hourly_rate']) if row['hourly_rate'] else None,
                start_date=row['start_date'].isoformat() if row['start_date'] else None,
                end_date=row['end_date'].isoformat() if row['end_date'] else None,
                spent_hours=float(row['spent_hours']),
                budget_cost=float(row['budget_cost']),
                spent_cost=float(row['spent_cost'])
            )
            services.append(service)
            
            total_hours_budget += service.budget_hours
            total_hours_spent += service.spent_hours
            total_cost_budget += service.budget_cost
            total_cost_spent += service.spent_cost
        
        # Calculate remaining available hours (total available - total allocated to services)
        # If project has unlimited hours, set remaining to a very high number
        remaining_hours = 999999 if has_unlimited_hours else (total_available_hours - total_hours_budget)
        
        totals = ServicesTotals(
            hours_budget=total_hours_budget,
            hours_spent=total_hours_spent,
            cost_budget=total_cost_budget,
            cost_spent=total_cost_spent
        )
        
        return ProjectServicesSummaryResponse(
            services=services,
            totals=totals
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close() 