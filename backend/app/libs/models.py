"""
TimeFlow Database Models

This module contains all the database models for the TimeFlow application.
Each model mirrors the corresponding PostgreSQL table structure.
"""

from typing import Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal


class Company:
    """
    Company model representing companies we work with for projects.
    
    Attributes:
        id: Primary key, auto-generated
        company_name: Name of the company (required)
        visit_address: Physical address for visits (optional)
        contact_details: JSON object with flexible contact info (phone, email, contact person, etc.)
        company_size: Size category like 'small', 'medium', 'large', '1-10', '11-50', etc.
        created_at: Timestamp when the record was created
    """
    
    def __init__(
        self,
        id: Optional[int] = None,
        company_name: str = "",
        visit_address: Optional[str] = None,
        contact_details: Optional[Dict[str, Any]] = None,
        company_size: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.company_name = company_name
        self.visit_address = visit_address
        self.contact_details = contact_details or {}
        self.company_size = company_size
        self.created_at = created_at


class Project:
    """
    Project model representing projects that can be assigned to multiple companies.
    
    Attributes:
        id: Primary key, auto-generated
        project_name: Name of the project (required)
        description: Detailed description of project scope and objectives
        created_at: Timestamp when the record was created
    """
    
    def __init__(
        self,
        id: Optional[int] = None,
        project_name: str = "",
        description: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.project_name = project_name
        self.description = description
        self.created_at = created_at


class Employee:
    """
    Employee model with minimal info for time tracking reference.
    Can be expanded later with additional employee details.
    
    Attributes:
        id: Primary key, auto-generated
        name: Full name of the employee (required)
        email: Unique email address (required)
        created_at: Timestamp when the record was created
    """
    
    def __init__(
        self,
        id: Optional[int] = None,
        name: str = "",
        email: str = "",
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.name = name
        self.email = email
        self.created_at = created_at


class ProjectCompany:
    """
    Junction model linking projects to companies with allocated hours.
    Supports many-to-many relationship between projects and companies.
    
    Attributes:
        project_id: Foreign key to projects table (required)
        company_id: Foreign key to companies table (required)
        available_hours: Total hours allocated for this project-company combination (>= 0)
        created_at: Timestamp when the record was created
        
    Constraints:
        - Composite primary key (project_id, company_id)
        - available_hours must be >= 0
        - Foreign key constraints with CASCADE delete
    """
    
    def __init__(
        self,
        project_id: int,
        company_id: int,
        available_hours: Decimal = Decimal('0.00'),
        created_at: Optional[datetime] = None
    ):
        self.project_id = project_id
        self.company_id = company_id
        self.available_hours = available_hours
        self.created_at = created_at


class TimeEntry:
    """
    Time entry model for daily time tracking by employees on projects for specific companies.
    
    Attributes:
        id: Primary key, auto-generated
        employee_id: Foreign key to employees table (required)
        company_id: Foreign key to companies table (required)
        project_id: Foreign key to projects table (required)
        date: Date when the work was performed (required)
        hours_worked: Hours worked on this date (0-24 hour validation)
        created_at: Timestamp when the record was created
        
    Constraints:
        - hours_worked must be >= 0 and <= 24 (reasonable daily maximum)
        - Must reference valid project-company relationship via project_companies table
        - Foreign key constraints with CASCADE delete
        - Indexes on (employee_id, date) and (company_id, project_id) for performance
    """
    
    def __init__(
        self,
        id: Optional[int] = None,
        employee_id: int = 0,
        company_id: int = 0,
        project_id: int = 0,
        date: Optional[date] = None,
        hours_worked: Decimal = Decimal('0.00'),
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.employee_id = employee_id
        self.company_id = company_id
        self.project_id = project_id
        self.date = date
        self.hours_worked = hours_worked
        self.created_at = created_at


# Model validation helpers
def validate_hours(hours: Decimal) -> bool:
    """Validate that hours are within reasonable bounds (0-24)."""
    return Decimal('0') <= hours <= Decimal('24')


def validate_available_hours(hours: Decimal) -> bool:
    """Validate that available hours are non-negative."""
    return hours >= Decimal('0')
