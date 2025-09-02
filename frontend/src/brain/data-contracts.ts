/** AvailableHoursResponse */
export interface AvailableHoursResponse {
  /** Project Companies */
  project_companies: ProjectCompanyAvailableHours[];
}

/** EmployeeResponse */
export interface EmployeeResponse {
  /** Id */
  id: number;
  /** Name */
  name: string;
  /** Email */
  email: string;
}

/** EmployeesResponse */
export interface EmployeesResponse {
  /** Employees */
  employees: EmployeeResponse[];
}

/**
 * CompaniesListResponse
 * Response model for listing companies.
 */
export interface CompaniesListResponse {
  /** Companies */
  companies: CompanyResponse[];
  /** Total */
  total: number;
}

/**
 * CompanyCreateRequest
 * Request model for creating a new company.
 */
export interface CompanyCreateRequest {
  /**
   * Company Name
   * Company name (required, non-empty)
   * @minLength 1
   */
  company_name: string;
  /**
   * Visit Address
   * Physical address for visits
   */
  visit_address?: string | null;
  /**
   * Contact Details
   * Contact information (phone, email, contact person, etc.)
   */
  contact_details?: Record<string, any> | null;
  /**
   * Company Size
   * Company size category
   */
  company_size?: string | null;
  /** Branch */
  branch?: string | null;
  /** Relation Manager */
  relatie_beheerder?: string | null;
}

/**
 * CompanyResponse
 * Response model for company data.
 */
export interface CompanyResponse {
  /** Id */
  id: number;
  /** Company Name */
  company_name: string;
  /** Visit Address */
  visit_address: string | null;
  /** Contact Details */
  contact_details: Record<string, any>;
  /** Company Size */
  company_size: string | null;
  /** Branch */
  branch: string | null;
  /** Relation Manager */
  relatie_beheerder: string | null;
  /** Created At */
  created_at: string;
}

/**
 * CompanyUpdateRequest
 * Request model for updating an existing company.
 */
export interface CompanyUpdateRequest {
  /**
   * Company Name
   * Company name
   */
  company_name?: string | null;
  /**
   * Visit Address
   * Physical address for visits
   */
  visit_address?: string | null;
  /**
   * Contact Details
   * Contact information
   */
  contact_details?: Record<string, any> | null;
  /**
   * Company Size
   * Company size category
   */
  company_size?: string | null;
  /** Branch */
  branch?: string | null;
  /** Relation Manager */
  relatie_beheerder?: string | null;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** ProjectCompanyAvailableHours */
export interface ProjectCompanyAvailableHours {
  /** Company Id */
  company_id: number;
  /** Company Name */
  company_name: string;
  /** Project Id */
  project_id: number;
  /** Project Name */
  project_name: string;
  /** Available Hours */
  available_hours: number;
  /** Used Hours */
  used_hours: number;
  /** Remaining Hours */
  remaining_hours: number;
  /** Unlimited Hours */
  unlimited_hours: boolean;
}

/**
 * ProjectCompanyLink
 * Model for project-company relationship with available hours.
 */
export interface ProjectCompanyLink {
  /**
   * Company Id
   * ID of the linked company
   */
  company_id: number;
  /**
   * Available Hours
   * Available hours for this project-company combination (None = unlimited)
   */
  available_hours?: number | string | null;
  /**
   * Unlimited Hours
   * Whether this project-company combination has unlimited hours
   */
  unlimited_hours?: boolean;
}

/**
 * ProjectCompanyResponse
 * Response model for project-company relationship with company details.
 */
export interface ProjectCompanyResponse {
  /** Company Id */
  company_id: number;
  /** Company Name */
  company_name: string;
  /** Available Hours */
  available_hours: string | null;
  /** Unlimited Hours */
  unlimited_hours: boolean;
}

/**
 * ProjectCreateRequest
 * Request model for creating a new project.
 */
export interface ProjectCreateRequest {
  /**
   * Project Name
   * Project name (required, non-empty)
   * @minLength 1
   */
  project_name: string;
  /**
   * Description
   * Project description
   */
  description?: string | null;
  /**
   * Company Links
   * List of companies linked to this project with available hours
   */
  company_links?: ProjectCompanyLink[];
}

/**
 * ProjectResponse
 * Response model for project data.
 */
export interface ProjectResponse {
  /** Id */
  id: number;
  /** Project Name */
  project_name: string;
  /** Description */
  description: string | null;
  /** Company Links */
  company_links: ProjectCompanyResponse[];
  /** Created At */
  created_at: string;
}

/**
 * ProjectUpdateRequest
 * Request model for updating an existing project.
 */
export interface ProjectUpdateRequest {
  /**
   * Project Name
   * Project name
   */
  project_name?: string | null;
  /**
   * Description
   * Project description
   */
  description?: string | null;
  /**
   * Company Links
   * List of companies linked to this project with available hours
   */
  company_links?: ProjectCompanyLink[] | null;
}

/**
 * ProjectsListResponse
 * Response model for listing projects.
 */
export interface ProjectsListResponse {
  /** Projects */
  projects: ProjectResponse[];
  /** Total */
  total: number;
}

/** TimeEntriesListResponse */
export interface TimeEntriesListResponse {
  /** Time Entries */
  time_entries: TimeEntryResponse[];
  /** Total */
  total: number;
}

/** TimeEntryCreateRequest */
export interface TimeEntryCreateRequest {
  /** Company Id */
  company_id: number;
  /** Project Id */
  project_id: number;
  /** Service Id */
  service_id?: number | null;
  /**
   * Date
   * @format date
   */
  date: string;
  /** Hours Worked */
  hours_worked: number;
  /** Start Time */
  start_time?: string | null;
  /** End Time */
  end_time?: string | null;
  /** Comment */
  comment?: string | null;
}

/** TimeEntryResponse */
export interface TimeEntryResponse {
  /** Id */
  id: number;
  /** Employee Id */
  employee_id: number;
  /** Company Id */
  company_id: number;
  /** Company Name */
  company_name: string;
  /** Project Id */
  project_id: number;
  /** Project Name */
  project_name: string;
  /** Service Id */
  service_id: number | null;
  /** Service Name */
  service_name: string | null;
  /** Service Color */
  service_color: string | null;
  /** Date */
  date: string;
  /** Hours Worked */
  hours_worked: number;
  /** Start Time */
  start_time?: string | null;
  /** End Time */
  end_time?: string | null;
  /** Comment */
  comment?: string | null;
  /** Created At */
  created_at: string;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** ServiceCreateRequest */
export interface ServiceCreateRequest {
  /** Project Id */
  project_id: number;
  /** Company Id */
  company_id?: number | null;
  /** Name */
  name: string;
  /** Price Type */
  price_type: string;
  /** Budget Hours */
  budget_hours: number;
  /** Fixed Price */
  fixed_price?: number | null;
  /** Hourly Rate */
  hourly_rate?: number | null;
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /** Service Color */
  service_color?: string | null;
}

/** ServiceUpdateRequest */
export interface ServiceUpdateRequest {
  /** Company Id */
  company_id?: number | null;
  /** Name */
  name?: string | null;
  /** Price Type */
  price_type?: string | null;
  /** Budget Hours */
  budget_hours?: number | null;
  /** Fixed Price */
  fixed_price?: number | null;
  /** Hourly Rate */
  hourly_rate?: number | null;
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /** Service Color */
  service_color?: string | null;
}

/** ServiceResponse */
export interface ServiceResponse {
  /** Id */
  id: number;
  /** Project Id */
  project_id: number;
  /** Company Id */
  company_id: number | null;
  /** Name */
  name: string;
  /** Price Type */
  price_type: string;
  /** Budget Hours */
  budget_hours: number;
  /** Fixed Price */
  fixed_price: number | null;
  /** Hourly Rate */
  hourly_rate: number | null;
  /** Start Date */
  start_date: string | null;
  /** End Date */
  end_date: string | null;
  /** Service Color */
  service_color: string | null;
  /** Created At */
  created_at: string;
}

/** ServiceRow */
export interface ServiceRow {
  /** Id */
  id: number;
  /** Project Id */
  project_id: number;
  /** Company Id */
  company_id: number | null;
  /** Name */
  name: string;
  /** Price Type */
  price_type: string;
  /** Budget Hours */
  budget_hours: number;
  /** Fixed Price */
  fixed_price: number | null;
  /** Hourly Rate */
  hourly_rate: number | null;
  /** Start Date */
  start_date: string | null;
  /** End Date */
  end_date: string | null;
  /** Spent Hours */
  spent_hours: number;
  /** Budget Cost */
  budget_cost: number;
  /** Spent Cost */
  spent_cost: number;
}

/** ServicesTotals */
export interface ServicesTotals {
  /** Hours Budget */
  hours_budget: number;
  /** Hours Spent */
  hours_spent: number;
  /** Cost Budget */
  cost_budget: number;
  /** Cost Spent */
  cost_spent: number;
}

/** ProjectServicesSummaryResponse */
export interface ProjectServicesSummaryResponse {
  /** Services */
  services: ServiceRow[];
  /** Totals */
  totals: ServicesTotals;
}

export type CheckHealthData = HealthResponse;

export type ListCompaniesData = CompaniesListResponse;

export type CreateCompanyData = CompanyResponse;

export type CreateCompanyError = HTTPValidationError;

export interface GetCompanyParams {
  /** Company Id */
  companyId: number;
}

export type GetCompanyData = CompanyResponse;

export type GetCompanyError = HTTPValidationError;

export interface UpdateCompanyParams {
  /** Company Id */
  companyId: number;
}

export type UpdateCompanyData = CompanyResponse;

export type UpdateCompanyError = HTTPValidationError;

export interface DeleteCompanyParams {
  /** Company Id */
  companyId: number;
}

export type DeleteCompanyData = any;

export type DeleteCompanyError = HTTPValidationError;

export type ListProjectsData = ProjectsListResponse;

export type CreateProjectData = ProjectResponse;

export type CreateProjectError = HTTPValidationError;

export interface GetProjectParams {
  /** Project Id */
  projectId: number;
}

export type GetProjectData = ProjectResponse;

export type GetProjectError = HTTPValidationError;

export interface UpdateProjectParams {
  /** Project Id */
  projectId: number;
}

export type UpdateProjectData = ProjectResponse;

export type UpdateProjectError = HTTPValidationError;

export interface DeleteProjectParams {
  /** Project Id */
  projectId: number;
}

export type DeleteProjectData = any;

export type DeleteProjectError = HTTPValidationError;

export type ListTimeEntriesData = TimeEntriesListResponse;

export interface ListTimeEntriesParams {
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /** Employee Id Filter */
  employee_id_filter?: number | null;
}

export type ListTimeEntriesError = HTTPValidationError;

export type CreateTimeEntryData = TimeEntryResponse;

export type CreateTimeEntryError = HTTPValidationError;

export interface GetTimeEntryParams {
  /** Entry Id */
  entryId: number;
}

export type GetTimeEntryData = TimeEntryResponse;

export type GetTimeEntryError = HTTPValidationError;

export interface UpdateTimeEntryParams {
  /** Entry Id */
  entryId: number;
}

export type UpdateTimeEntryData = TimeEntryResponse;

export type UpdateTimeEntryError = HTTPValidationError;

export interface DeleteTimeEntryParams {
  /** Entry Id */
  entryId: number;
}

export type DeleteTimeEntryData = any;

export type DeleteTimeEntryError = HTTPValidationError;

export type GetAvailableHoursData = AvailableHoursResponse;

export interface GetProjectServicesSummaryParams {
  /** Project Id */
  projectId: number;
}

export type GetProjectServicesSummaryData = ProjectServicesSummaryResponse;

export type GetProjectServicesSummaryError = HTTPValidationError;

// Service API types
export type CreateServiceData = ServiceResponse;

export type CreateServiceError = HTTPValidationError;

export interface GetServiceParams {
  /** Service Id */
  serviceId: number;
}

export type GetServiceData = ServiceResponse;

export type GetServiceError = HTTPValidationError;

export interface UpdateServiceParams {
  /** Service Id */
  serviceId: number;
}

export type UpdateServiceData = ServiceResponse;

export type UpdateServiceError = HTTPValidationError;

export interface DeleteServiceParams {
  /** Service Id */
  serviceId: number;
}

export type DeleteServiceData = any;

export type DeleteServiceError = HTTPValidationError;
