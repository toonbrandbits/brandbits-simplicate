"""
Companies API - CRUD operations for company management in TimeFlow

Provides endpoints to create, read, update, and delete companies with proper validation.
All endpoints are auth-protected and use typed Pydantic models.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
import asyncpg
import databutton as db
from app.auth import AuthorizedUser
import json

router = APIRouter(prefix="/companies")

# Pydantic Models
class CompanyCreateRequest(BaseModel):
    """Request model for creating a new company."""
    company_name: str = Field(..., min_length=1, description="Company name (required, non-empty)")
    visit_address: Optional[str] = Field(None, description="Physical address for visits")
    contact_details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contact information (phone, email, contact person, etc.)")
    company_size: Optional[str] = Field(None, description="Company size category")
    branch: Optional[str] = Field(None, description="Business branch/sector")
    relatie_beheerder: Optional[str] = Field(None, description="Relation manager")
    
    @validator('company_name')
    def validate_company_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Company name cannot be empty')
        return v.strip()

class CompanyUpdateRequest(BaseModel):
    """Request model for updating an existing company."""
    company_name: Optional[str] = Field(None, min_length=1, description="Company name")
    visit_address: Optional[str] = Field(None, description="Physical address for visits")
    contact_details: Optional[Dict[str, Any]] = Field(None, description="Contact information")
    company_size: Optional[str] = Field(None, description="Company size category")
    branch: Optional[str] = Field(None, description="Business branch/sector")
    relatie_beheerder: Optional[str] = Field(None, description="Relation manager")
    
    @validator('company_name')
    def validate_company_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Company name cannot be empty')
        return v.strip() if v else v

class CompanyResponse(BaseModel):
    """Response model for company data."""
    id: int
    company_name: str
    visit_address: Optional[str]
    contact_details: Dict[str, Any]
    company_size: Optional[str]
    branch: Optional[str]
    relatie_beheerder: Optional[str]
    created_at: str  # ISO format datetime string

class CompaniesListResponse(BaseModel):
    """Response model for listing companies."""
    companies: List[CompanyResponse]
    total: int

# Database connection helper
from app.libs.database import get_db_connection

# API Endpoints
@router.post("/", response_model=CompanyResponse)
async def create_company(company: CompanyCreateRequest, user: AuthorizedUser):
    """Create a new company."""
    conn = await get_db_connection()
    try:
        # Insert company into database
        query = """
            INSERT INTO companies (company_name, visit_address, contact_details, company_size, branch, relatie_beheerder)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, company_name, visit_address, contact_details, company_size, branch, relatie_beheerder, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company.company_name,
            company.visit_address,
            json.dumps(company.contact_details) if company.contact_details else '{}',
            company.company_size,
            company.branch,
            company.relatie_beheerder,
        )
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create company")
        
        return CompanyResponse(
            id=row['id'],
            company_name=row['company_name'],
            visit_address=row['visit_address'],
            contact_details=json.loads(row['contact_details']) if row['contact_details'] else {},
            company_size=row['company_size'],
            branch=row['branch'],
            relatie_beheerder=row['relatie_beheerder'],
            created_at=row['created_at'].isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.get("/", response_model=CompaniesListResponse)
async def list_companies(user: AuthorizedUser):
    """List all companies."""
    conn = await get_db_connection()
    try:
        # Get all companies ordered by creation date
        query = """
            SELECT id, company_name, visit_address, contact_details, company_size, branch, relatie_beheerder, created_at
            FROM companies
            ORDER BY created_at DESC
        """
        
        rows = await conn.fetch(query)
        
        companies = [
            CompanyResponse(
                id=row['id'],
                company_name=row['company_name'],
                visit_address=row['visit_address'],
                contact_details=json.loads(row['contact_details']) if row['contact_details'] else {},
                company_size=row['company_size'],
                branch=row['branch'],
                relatie_beheerder=row['relatie_beheerder'],
                created_at=row['created_at'].isoformat()
            )
            for row in rows
        ]
        
        return CompaniesListResponse(
            companies=companies,
            total=len(companies)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, user: AuthorizedUser):
    """Get a specific company by ID."""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_name, visit_address, contact_details, company_size, branch, relatie_beheerder, created_at
            FROM companies
            WHERE id = $1
        """
        
        row = await conn.fetchrow(query, company_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return CompanyResponse(
            id=row['id'],
            company_name=row['company_name'],
            visit_address=row['visit_address'],
            contact_details=json.loads(row['contact_details']) if row['contact_details'] else {},
            company_size=row['company_size'],
            branch=row['branch'],
            relatie_beheerder=row['relatie_beheerder'],
            created_at=row['created_at'].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: int, company: CompanyUpdateRequest, user: AuthorizedUser):
    """Update an existing company."""
    conn = await get_db_connection()
    try:
        # First check if company exists
        check_query = "SELECT id FROM companies WHERE id = $1"
        existing = await conn.fetchrow(check_query, company_id)
        
        if not existing:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Build dynamic update query based on provided fields
        update_fields = []
        params = []
        param_count = 1
        
        if company.company_name is not None:
            update_fields.append(f"company_name = ${param_count}")
            params.append(company.company_name)
            param_count += 1
            
        if company.visit_address is not None:
            update_fields.append(f"visit_address = ${param_count}")
            params.append(company.visit_address)
            param_count += 1
            
        if company.contact_details is not None:
            update_fields.append(f"contact_details = ${param_count}")
            params.append(json.dumps(company.contact_details))
            param_count += 1
            
        if company.company_size is not None:
            update_fields.append(f"company_size = ${param_count}")
            params.append(company.company_size)
            param_count += 1
        
        if company.branch is not None:
            update_fields.append(f"branch = ${param_count}")
            params.append(company.branch)
            param_count += 1
        
        if company.relatie_beheerder is not None:
            update_fields.append(f"relatie_beheerder = ${param_count}")
            params.append(company.relatie_beheerder)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add company_id as the last parameter
        params.append(company_id)
        
        query = f"""
            UPDATE companies 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING id, company_name, visit_address, contact_details, company_size, branch, relatie_beheerder, created_at
        """
        
        row = await conn.fetchrow(query, *params)
        
        return CompanyResponse(
            id=row['id'],
            company_name=row['company_name'],
            visit_address=row['visit_address'],
            contact_details=json.loads(row['contact_details']) if row['contact_details'] else {},
            company_size=row['company_size'],
            branch=row['branch'],
            relatie_beheerder=row['relatie_beheerder'],
            created_at=row['created_at'].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()

@router.delete("/{company_id}")
async def delete_company(company_id: int, user: AuthorizedUser):
    """Delete a company."""
    conn = await get_db_connection()
    try:
        # Check if company exists and has any dependencies
        check_query = """
            SELECT 
                c.id,
                COUNT(pc.company_id) as project_count,
                COUNT(te.company_id) as time_entry_count
            FROM companies c
            LEFT JOIN project_companies pc ON c.id = pc.company_id
            LEFT JOIN time_entries te ON c.id = te.company_id
            WHERE c.id = $1
            GROUP BY c.id
        """
        
        row = await conn.fetchrow(check_query, company_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # For now, allow deletion even with dependencies (CASCADE will handle it)
        # In a production app, you might want to prevent deletion if there are dependencies
        if row['project_count'] > 0 or row['time_entry_count'] > 0:
            print(f"Warning: Deleting company {company_id} with {row['project_count']} projects and {row['time_entry_count']} time entries")
        
        # Delete the company
        delete_query = "DELETE FROM companies WHERE id = $1"
        result = await conn.execute(delete_query, company_id)
        
        # Check if deletion was successful
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Company not found")
        
        return {"message": "Company deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        await conn.close()
