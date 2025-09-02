import {
  CheckHealthData,
  CompanyCreateRequest,
  CompanyUpdateRequest,
  CreateCompanyData,
  CreateProjectData,
  CreateTimeEntryData,
  DeleteCompanyData,
  DeleteProjectData,
  DeleteTimeEntryData,
  GetAvailableHoursData,
  GetCompanyData,
  GetProjectData,
  ListCompaniesData,
  ListProjectsData,
  ListTimeEntriesData,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  TimeEntryCreateRequest,
  UpdateCompanyData,
  UpdateProjectData,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description List all companies.
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name list_companies
   * @summary List Companies
   * @request GET:/routes/companies/
   */
  export namespace list_companies {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCompaniesData;
  }

  /**
   * @description Create a new company.
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name create_company
   * @summary Create Company
   * @request POST:/routes/companies/
   */
  export namespace create_company {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CompanyCreateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateCompanyData;
  }

  /**
   * @description Get a specific company by ID.
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name get_company
   * @summary Get Company
   * @request GET:/routes/companies/{company_id}
   */
  export namespace get_company {
    export type RequestParams = {
      /** Company Id */
      companyId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCompanyData;
  }

  /**
   * @description Update an existing company.
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name update_company
   * @summary Update Company
   * @request PUT:/routes/companies/{company_id}
   */
  export namespace update_company {
    export type RequestParams = {
      /** Company Id */
      companyId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = CompanyUpdateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateCompanyData;
  }

  /**
   * @description Delete a company.
   * @tags dbtn/module:companies, dbtn/hasAuth
   * @name delete_company
   * @summary Delete Company
   * @request DELETE:/routes/companies/{company_id}
   */
  export namespace delete_company {
    export type RequestParams = {
      /** Company Id */
      companyId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteCompanyData;
  }

  /**
   * @description List all projects with their company links.
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name list_projects
   * @summary List Projects
   * @request GET:/routes/projects/
   */
  export namespace list_projects {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListProjectsData;
  }

  /**
   * @description Create a new project with company links.
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name create_project
   * @summary Create Project
   * @request POST:/routes/projects/
   */
  export namespace create_project {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ProjectCreateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateProjectData;
  }

  /**
   * @description Get a specific project by ID with its company links.
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name get_project
   * @summary Get Project
   * @request GET:/routes/projects/{project_id}
   */
  export namespace get_project {
    export type RequestParams = {
      /** Project Id */
      projectId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetProjectData;
  }

  /**
   * @description Update an existing project and its company links.
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name update_project
   * @summary Update Project
   * @request PUT:/routes/projects/{project_id}
   */
  export namespace update_project {
    export type RequestParams = {
      /** Project Id */
      projectId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = ProjectUpdateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateProjectData;
  }

  /**
   * @description Delete a project and its company links.
   * @tags dbtn/module:projects, dbtn/hasAuth
   * @name delete_project
   * @summary Delete Project
   * @request DELETE:/routes/projects/{project_id}
   */
  export namespace delete_project {
    export type RequestParams = {
      /** Project Id */
      projectId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteProjectData;
  }

  /**
   * No description
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name create_time_entry
   * @summary Create Time Entry
   * @request POST:/routes/time-entries/
   */
  export namespace create_time_entry {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TimeEntryCreateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateTimeEntryData;
  }

  /**
   * No description
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name list_time_entries
   * @summary List Time Entries
   * @request GET:/routes/time-entries/
   */
  export namespace list_time_entries {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Start Date */
      start_date?: string | null;
      /** End Date */
      end_date?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListTimeEntriesData;
  }

  /**
   * No description
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name get_available_hours
   * @summary Get Available Hours
   * @request GET:/routes/time-entries/available-hours
   */
  export namespace get_available_hours {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAvailableHoursData;
  }

  /**
   * No description
   * @tags dbtn/module:time_entries, dbtn/hasAuth
   * @name delete_time_entry
   * @summary Delete Time Entry
   * @request DELETE:/routes/time-entries/{entry_id}
   */
  export namespace delete_time_entry {
    export type RequestParams = {
      /** Entry Id */
      entryId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTimeEntryData;
  }
}
