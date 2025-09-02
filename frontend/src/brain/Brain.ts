import {
  CheckHealthData,
  CompanyCreateRequest,
  CompanyUpdateRequest,
  CreateCompanyData,
  CreateCompanyError,
  CreateProjectData,
  CreateProjectError,
  CreateServiceData,
  CreateServiceError,
  CreateTimeEntryData,
  CreateTimeEntryError,
  DeleteCompanyData,
  DeleteCompanyError,
  DeleteCompanyParams,
  DeleteProjectData,
  DeleteProjectError,
  DeleteProjectParams,
  DeleteServiceData,
  DeleteServiceError,
  DeleteServiceParams,
  DeleteTimeEntryData,
  DeleteTimeEntryError,
  DeleteTimeEntryParams,
  EmployeesResponse,
  GetAvailableHoursData,
  GetCompanyData,
  GetCompanyError,
  GetCompanyParams,
  GetProjectData,
  GetProjectError,
  GetProjectParams,
  GetProjectServicesSummaryData,
  GetProjectServicesSummaryError,
  GetProjectServicesSummaryParams,
  GetServiceData,
  GetServiceError,
  GetServiceParams,
  ListCompaniesData,
  ListProjectsData,
  ListTimeEntriesData,
  ListTimeEntriesError,
  ListTimeEntriesParams,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  TimeEntryCreateRequest,
  UpdateCompanyData,
  UpdateCompanyError,
  UpdateCompanyParams,
  UpdateProjectData,
  UpdateProjectError,
  UpdateProjectParams,
  UpdateServiceData,
  UpdateServiceError,
  UpdateServiceParams,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description List all companies.
   *
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name list_companies
   * @summary List Companies
   * @request GET:/routes/companies/
   */
  list_companies = (params: RequestParams = {}) =>
    this.request<ListCompaniesData, any>({
      path: `/routes/companies/`,
      method: "GET",
      ...params,
    });

  /**
   * @description Create a new company.
   *
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name create_company
   * @summary Create Company
   * @request POST:/routes/companies/
   */
  create_company = (data: CompanyCreateRequest, params: RequestParams = {}) =>
    this.request<CreateCompanyData, CreateCompanyError>({
      path: `/routes/companies/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get a specific company by ID.
   *
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name get_company
   * @summary Get Company
   * @request GET:/routes/companies/{company_id}
   */
  get_company = ({ companyId, ...query }: GetCompanyParams, params: RequestParams = {}) =>
    this.request<GetCompanyData, GetCompanyError>({
      path: `/routes/companies/${companyId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update an existing company.
   *
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name update_company
   * @summary Update Company
   * @request PUT:/routes/companies/{company_id}
   */
  update_company = (
    { companyId, ...query }: UpdateCompanyParams,
    data: CompanyUpdateRequest,
    params: RequestParams = {},
  ) =>
    this.request<UpdateCompanyData, UpdateCompanyError>({
      path: `/routes/companies/${companyId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Delete a company.
   *
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name delete_company
   * @summary Delete Company
   * @request DELETE:/routes/companies/{company_id}
   */
  delete_company = ({ companyId, ...query }: DeleteCompanyParams, params: RequestParams = {}) =>
    this.request<DeleteCompanyData, DeleteCompanyError>({
      path: `/routes/companies/${companyId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description List all projects with their company links.
   *
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name list_projects
   * @summary List Projects
   * @request GET:/routes/projects/
   */
  list_projects = (params: RequestParams = {}) =>
    this.request<ListProjectsData, any>({
      path: `/routes/projects/`,
      method: "GET",
      ...params,
    });

  /**
   * @description Create a new project with company links.
   *
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name create_project
   * @summary Create Project
   * @request POST:/routes/projects/
   */
  create_project = (data: ProjectCreateRequest, params: RequestParams = {}) =>
    this.request<CreateProjectData, CreateProjectError>({
      path: `/routes/projects/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get a specific project by ID with its company links.
   *
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name get_project
   * @summary Get Project
   * @request GET:/routes/projects/{project_id}
   */
  get_project = ({ projectId, ...query }: GetProjectParams, params: RequestParams = {}) =>
    this.request<GetProjectData, GetProjectError>({
      path: `/routes/projects/${projectId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update an existing project and its company links.
   *
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name update_project
   * @summary Update Project
   * @request PUT:/routes/projects/{project_id}
   */
  update_project = (
    { projectId, ...query }: UpdateProjectParams,
    data: ProjectUpdateRequest,
    params: RequestParams = {},
  ) =>
    this.request<UpdateProjectData, UpdateProjectError>({
      path: `/routes/projects/${projectId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Delete a project and its company links.
   *
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name delete_project
   * @summary Delete Project
   * @request DELETE:/routes/projects/{project_id}
   */
  delete_project = ({ projectId, ...query }: DeleteProjectParams, params: RequestParams = {}) =>
    this.request<DeleteProjectData, DeleteProjectError>({
      path: `/routes/projects/${projectId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name create_time_entry
   * @summary Create Time Entry
   * @request POST:/routes/time-entries/
   */
  create_time_entry = (data: TimeEntryCreateRequest, params: RequestParams = {}) =>
    this.request<CreateTimeEntryData, CreateTimeEntryError>({
      path: `/routes/time-entries/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  update_time_entry = (
    { entryId, ...query }: { entryId: number },
    data: any,
    params: RequestParams = {},
  ) =>
    this.request<any, any>({
      path: `/routes/time-entries/${entryId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name list_time_entries
   * @summary List Time Entries
   * @request GET:/routes/time-entries/
   */
  list_time_entries = (query: ListTimeEntriesParams, params: RequestParams = {}) =>
    this.request<ListTimeEntriesData, ListTimeEntriesError>({
      path: `/routes/time-entries/`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name get_employees
   * @summary Get Employees
   * @request GET:/routes/time-entries/employees
   */
  get_employees = (params: RequestParams = {}) =>
    this.request<EmployeesResponse, any>({
      path: `/routes/time-entries/employees`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name get_available_hours
   * @summary Get Available Hours
   * @request GET:/routes/time-entries/available-hours
   */
  get_available_hours = (params: RequestParams = {}) =>
    this.request<GetAvailableHoursData, any>({
      path: `/routes/time-entries/available-hours`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name delete_time_entry
   * @summary Delete Time Entry
   * @request DELETE:/routes/time-entries/{entry_id}
   */
  delete_time_entry = ({ entryId, ...query }: DeleteTimeEntryParams, params: RequestParams = {}) =>
    this.request<DeleteTimeEntryData, DeleteTimeEntryError>({
      path: `/routes/time-entries/${entryId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:services, dbtn/hasAuth
   * @name get_project_services_summary
   * @summary Get Project Services Summary
   * @request GET:/routes/services/project/{project_id}/summary
   */
  get_project_services_summary = ({ projectId, ...query }: GetProjectServicesSummaryParams, params: RequestParams = {}) =>
    this.request<GetProjectServicesSummaryData, GetProjectServicesSummaryError>({
      path: `/routes/services/project/${projectId}/summary`,
      method: "GET",
      ...params,
    });

  /**
   * @description Create a new service.
   *
   * @tags dbtn/module:services, dbtn/hasAuth
   * @name create_service
   * @summary Create Service
   * @request POST:/routes/services/
   */
  create_service = (data: ServiceCreateRequest, params: RequestParams = {}) =>
    this.request<CreateServiceData, CreateServiceError>({
      path: `/routes/services/`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get a specific service by ID.
   *
   * @tags dbtn/module:services, dbtn/hasAuth
   * @name get_service
   * @summary Get Service
   * @request GET:/routes/services/{service_id}
   */
  get_service = ({ serviceId, ...query }: GetServiceParams, params: RequestParams = {}) =>
    this.request<GetServiceData, GetServiceError>({
      path: `/routes/services/${serviceId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Update an existing service.
   *
   * @tags dbtn/module:services, dbtn/hasAuth
   * @name update_service
   * @summary Update Service
   * @request PUT:/routes/services/{service_id}
   */
  update_service = ({ serviceId, ...query }: UpdateServiceParams, data: ServiceUpdateRequest, params: RequestParams = {}) =>
    this.request<UpdateServiceData, UpdateServiceError>({
      path: `/routes/services/${serviceId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Delete a service.
   *
   * @tags dbtn/module:services, dbtn/hasAuth
   * @name delete_service
   * @summary Delete Service
   * @request DELETE:/routes/services/{service_id}
   */
  delete_service = ({ serviceId, ...query }: DeleteServiceParams, params: RequestParams = {}) =>
    this.request<DeleteServiceData, DeleteServiceError>({
      path: `/routes/services/${serviceId}`,
      method: "DELETE",
      ...params,
    });
}
