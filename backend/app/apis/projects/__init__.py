"""
Projects API - CRUD operations for project management with company linkage in TimeFlow

Provides endpoints to create, read, update, and delete projects with support for
linking projects to multiple companies with allocated available hours per company.
All endpoints are auth-protected and use typed Pydantic models.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
import asyncpg
import databutton as db
from app.auth import AuthorizedUser
from decimal import Decimal
import json

router = APIRouter(prefix="/projects")

# Pydantic Models
class ProjectCompanyLink(BaseModel):
    """Model for project-company relationship with available hours."""
    company_id: int = Field(..., description="ID of the linked company")
    available_hours: Optional[Decimal] = Field(None, ge=0, description="Available hours for this project-company combination (None = unlimited)")
    unlimited_hours: bool = Field(False, description="Whether this project-company combination has unlimited hours")

class ProjectCompanyResponse(BaseModel):
    """Response model for project-company relationship with company details."""
    company_id: int
    company_name: str
    available_hours: Optional[Decimal]
    unlimited_hours: bool

class ProjectCreateRequest(BaseModel):
    """Request model for creating a new project."""
    project_name: str = Field(..., min_length=1, description="Project name (required, non-empty)")
    description: Optional[str] = Field(None, description="Project description")
    company_links: List[ProjectCompanyLink] = Field(default_factory=list, description="List of companies linked to this project with available hours")
    
    @validator('project_name')
    def validate_project_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Project name cannot be empty')
        return v.strip()
    
    @validator('company_links')
    def validate_company_links(cls, v):
        # Check for duplicate company IDs
        company_ids = [link.company_id for link in v]
        if len(company_ids) != len(set(company_ids)):
            raise ValueError('Duplicate companies are not allowed')
        return v

class ProjectUpdateRequest(BaseModel):
    """Request model for updating an existing project."""
    project_name: Optional[str] = Field(None, min_length=1, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    company_links: Optional[List[ProjectCompanyLink]] = Field(None, description="List of companies linked to this project with available hours")
    
    @validator('project_name')
    def validate_project_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Project name cannot be empty')
        return v.strip() if v else v
    
    @validator('company_links')
    def validate_company_links(cls, v):
        if v is not None:
            # Check for duplicate company IDs
            company_ids = [link.company_id for link in v]
            if len(company_ids) != len(set(company_ids)):
                raise ValueError('Duplicate companies are not allowed')
        return v

class ProjectResponse(BaseModel):
    """Response model for project data."""
    id: int
    project_name: str
    description: Optional[str]
    company_links: List[ProjectCompanyResponse]
    created_at: str  # ISO format datetime string

class ProjectsListResponse(BaseModel):
    """Response model for listing projects."""
    projects: List[ProjectResponse]
    total: int

# Database connection helper
from app.libs.database import get_db_connection

# Helper functions
async def get_project_with_companies(conn: asyncpg.Connection, project_id: int) -> Optional[ProjectResponse]:
    """Get a project with its linked companies."""
    # Get project details
    project_query = """
        SELECT id, project_name, description, created_at
        FROM projects
        WHERE id = $1
    """
    project_row = await conn.fetchrow(project_query, project_id)
    
    if not project_row:
        return None
    
    # Get linked companies with available hours
    companies_query = """
        SELECT c.id, c.company_name, pc.available_hours, pc.unlimited_hours
        FROM project_companies pc
        JOIN companies c ON pc.company_id = c.id
        WHERE pc.project_id = $1
        ORDER BY c.company_name
    """
    companies_rows = await conn.fetch(companies_query, project_id)
    
    company_links = [
        ProjectCompanyResponse(
            company_id=row['id'],
            company_name=row['company_name'],
            available_hours=row['available_hours'],
            unlimited_hours=row['unlimited_hours']
        )
        for row in companies_rows
    ]
    
    return ProjectResponse(
        id=project_row['id'],
        project_name=project_row['project_name'],
        description=project_row['description'],
        company_links=company_links,
        created_at=project_row['created_at'].isoformat()
    )

async def update_project_companies(conn: asyncpg.Connection, project_id: int, company_links: List[ProjectCompanyLink]):
    """Update project-company relationships."""
    # Delete existing relationships
    await conn.execute("DELETE FROM project_companies WHERE project_id = $1", project_id)
    
    # Insert new relationships
    for link in company_links:
        if link.unlimited_hours:
            await conn.execute(
                "INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours) VALUES ($1, $2, NULL, TRUE)",
                project_id, link.company_id
            )
        else:
            await conn.execute(
                "INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours) VALUES ($1, $2, $3, FALSE)",
                project_id, link.company_id, link.available_hours
            )

# API Endpoints
@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreateRequest, user: AuthorizedUser):
    """Create a new project with company links."""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            # Validate that all companies exist
            if project.company_links:
                company_ids = [link.company_id for link in project.company_links]
                existing_companies = await conn.fetch(
                    "SELECT id FROM companies WHERE id = ANY($1)",
                    company_ids
                )
                existing_ids = {row['id'] for row in existing_companies}
                missing_ids = set(company_ids) - existing_ids
                
                if missing_ids:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Companies not found: {', '.join(map(str, missing_ids))}"
                    )
            
            # Insert project
            project_query = """
                INSERT INTO projects (project_name, description)
                VALUES ($1, $2)
                RETURNING id, project_name, description, created_at
            """
            
            project_row = await conn.fetchrow(
                project_query,
                project.project_name,
                project.description
            )
            
            if not project_row:
                raise HTTPException(status_code=500, detail="Failed to create project")
            
            project_id = project_row['id']
            
            # Insert company relationships
            if project.company_links:
                await update_project_companies(conn, project_id, project.company_links)
            
            # Get the complete project with companies
            result = await get_project_with_companies(conn, project_id)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to retrieve created project")
            
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.get("/", response_model=ProjectsListResponse)
async def list_projects(user: AuthorizedUser):
    """List all projects with their company links."""
    conn = await get_db_connection()
    try:
        # Get all projects
        projects_query = """
            SELECT id, project_name, description, created_at
            FROM projects
            ORDER BY created_at DESC
        """
        
        project_rows = await conn.fetch(projects_query)
        
        projects = []
        for project_row in project_rows:
            project = await get_project_with_companies(conn, project_row['id'])
            if project:
                projects.append(project)
        
        return ProjectsListResponse(
            projects=projects,
            total=len(projects)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, user: AuthorizedUser):
    """Get a specific project by ID with its company links."""
    conn = await get_db_connection()
    try:
        result = await get_project_with_companies(conn, project_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, project: ProjectUpdateRequest, user: AuthorizedUser):
    """Update an existing project and its company links."""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            # Check if project exists
            check_query = "SELECT id FROM projects WHERE id = $1"
            existing = await conn.fetchrow(check_query, project_id)
            
            if not existing:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Validate companies if provided
            if project.company_links is not None:
                company_ids = [link.company_id for link in project.company_links]
                if company_ids:
                    existing_companies = await conn.fetch(
                        "SELECT id FROM companies WHERE id = ANY($1)",
                        company_ids
                    )
                    existing_ids = {row['id'] for row in existing_companies}
                    missing_ids = set(company_ids) - existing_ids
                    
                    if missing_ids:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Companies not found: {', '.join(map(str, missing_ids))}"
                        )
            
            # Build dynamic update query for project
            update_fields = []
            params = []
            param_count = 1
            
            if project.project_name is not None:
                update_fields.append(f"project_name = ${param_count}")
                params.append(project.project_name)
                param_count += 1
                
            if project.description is not None:
                update_fields.append(f"description = ${param_count}")
                params.append(project.description)
                param_count += 1
            
            # Update project if there are fields to update
            if update_fields:
                params.append(project_id)
                
                query = f"""
                    UPDATE projects 
                    SET {', '.join(update_fields)}
                    WHERE id = ${param_count}
                """
                
                await conn.execute(query, *params)
            
            # Update company relationships if provided
            if project.company_links is not None:
                await update_project_companies(conn, project_id, project.company_links)
            
            # Get the updated project
            result = await get_project_with_companies(conn, project_id)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated project")
            
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.delete("/{project_id}")
async def delete_project(project_id: int, user: AuthorizedUser):
    """Delete a project and its company links."""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            # Check if project exists
            check_query = "SELECT id FROM projects WHERE id = $1"
            existing = await conn.fetchrow(check_query, project_id)
            
            if not existing:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Check for time entries
            time_entries_query = "SELECT COUNT(*) as count FROM time_entries WHERE project_id = $1"
            time_entries_row = await conn.fetchrow(time_entries_query, project_id)
            
            if time_entries_row['count'] > 0:
                print(f"Warning: Deleting project {project_id} with {time_entries_row['count']} time entries")
            
            # Delete the project (CASCADE will handle project_companies and time_entries)
            delete_query = "DELETE FROM projects WHERE id = $1"
            result = await conn.execute(delete_query, project_id)
            
            # Check if deletion was successful
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Project not found")
            
            return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()
