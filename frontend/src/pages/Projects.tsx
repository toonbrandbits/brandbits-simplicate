import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Edit, Trash2, Building, Search, X, XCircle, ChevronUp, ChevronDown, Calendar, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import brain from "brain";
import { 
  ProjectResponse, 
  ProjectsListResponse, 
  ProjectCreateRequest, 
  ProjectUpdateRequest,
  CompaniesListResponse,
  ProjectCompanyLink,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  ServiceResponse,
  ServiceRow
} from "types";
import { useUserGuardContext } from "app/auth";

/* ---------------- Service form component ---------------- */
interface ServiceFormProps {
  service?: ServiceResponse;
  projectId: number;
  companies: { id: number; company_name: string }[];
  projectCompanyLinks: ProjectResponse['company_links'];
  onSubmit: (data: ServiceCreateRequest | ServiceUpdateRequest) => Promise<void>;
  onCancel: () => void;
}

function ServiceForm({ service, projectId, companies, projectCompanyLinks, onSubmit, onCancel }: ServiceFormProps) {
  const [name, setName] = useState(service?.name || "");
  
  // Auto-set company based on project company links
  const autoCompanyId = useMemo(() => {
    if (service?.company_id) return service.company_id; // Keep existing for editing
    if (projectCompanyLinks.length === 1) return projectCompanyLinks[0].company_id; // Auto-select if only one company
    return null; // Allow selection if multiple companies
  }, [service?.company_id, projectCompanyLinks]);
  
  const [companyId, setCompanyId] = useState<number | null>(autoCompanyId);
  
  const [priceType, setPriceType] = useState<"FIXED" | "HOURLY">(service?.price_type as "FIXED" | "HOURLY" || "HOURLY");
  const [budgetHours, setBudgetHours] = useState(service?.budget_hours.toString() || "0");
  const [unlimitedBudgetHours, setUnlimitedBudgetHours] = useState(false);

  // Auto-enable unlimited budget hours if project has unlimited hours
  useEffect(() => {
    const hasUnlimitedProjectHours = projectCompanyLinks.some(link => link.unlimited_hours);
    if (hasUnlimitedProjectHours && !service) { // Only auto-enable for new services
      setUnlimitedBudgetHours(true);
    }
  }, [projectCompanyLinks, service]);
  const [fixedPrice, setFixedPrice] = useState(service?.fixed_price?.toString() || "");
  const [hourlyRate, setHourlyRate] = useState(service?.hourly_rate?.toString() || "");
  const [startDate, setStartDate] = useState(service?.start_date || "");
  const [endDate, setEndDate] = useState(service?.end_date || "");
  // Predefined color palette for services - carefully selected for good contrast and aesthetics
  const SERVICE_COLORS = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Yellow", value: "#eab308" },
    { name: "Emerald", value: "#059669" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Violet", value: "#7c3aed" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Lime", value: "#84cc16" },
    { name: "Amber", value: "#fbbf24" },
    { name: "Slate", value: "#64748b" }
  ];

  const [serviceColor, setServiceColor] = useState(service?.service_color || SERVICE_COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = "Service name is required";
    if (priceType === "FIXED" && !fixedPrice) newErrors.fixedPrice = "Fixed price is required for FIXED price type";
    if (priceType === "HOURLY" && !hourlyRate) newErrors.hourlyRate = "Hourly rate is required for HOURLY price type";
    
    const budgetHoursNum = parseFloat(budgetHours);
    if (!unlimitedBudgetHours && (isNaN(budgetHoursNum) || budgetHoursNum < 0)) {
      newErrors.budgetHours = "Budget hours must be 0 or greater";
    }

    // Validate against available hours from project_companies (only if not unlimited budget hours)
    if (!unlimitedBudgetHours && !isNaN(budgetHoursNum)) {
      // If a company is selected, use that company's available hours; otherwise use sum of all companies
      const selectedCompanyLink = companyId 
        ? projectCompanyLinks.find((l) => l.company_id === companyId)
        : null;
      
      if (selectedCompanyLink?.unlimited_hours) {
        // Unlimited hours - no validation needed
      } else {
        const available = companyId
          ? parseFloat((selectedCompanyLink?.available_hours as any) || 0)
          : projectCompanyLinks.reduce((sum, l) => {
              if (l.unlimited_hours) return sum + 999999; // Treat unlimited as very high number
              return sum + parseFloat((l.available_hours as any) || 0);
            }, 0);
        if (budgetHoursNum > available) {
          newErrors.budgetHours = `Budget hours (${budgetHoursNum}) cannot exceed available hours (${available}).`;
        }
      }
    }
    
    if (fixedPrice && (isNaN(parseFloat(fixedPrice)) || parseFloat(fixedPrice) < 0)) {
      newErrors.fixedPrice = "Fixed price must be 0 or greater";
    }
    
    if (hourlyRate && (isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) < 0)) {
      newErrors.hourlyRate = "Hourly rate must be 0 or greater";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const serviceData = {
        name: name.trim(),
        company_id: companyId,
        price_type: priceType,
        budget_hours: unlimitedBudgetHours ? 999999 : parseFloat(budgetHours),
        fixed_price: fixedPrice ? parseFloat(fixedPrice) : null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        service_color: serviceColor,
      };

      if (service) {
        await onSubmit(serviceData as ServiceUpdateRequest);
      } else {
        await onSubmit({ ...serviceData, project_id: projectId } as ServiceCreateRequest);
      }

      onCancel();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(service ? "Failed to update service" : "Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="serviceName">Service Name *</Label>
        <Input 
          id="serviceName" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Enter service name" 
          className={errors.name ? "border-red-500" : ""} 
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Only show company selection if multiple companies or editing existing service */}
      {(projectCompanyLinks.length > 1 || service) ? (
        <div>
          <Label htmlFor="company">Company (Optional)</Label>
          <Select value={companyId?.toString() || "none"} onValueChange={(value) => setCompanyId(value === "none" ? null : parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : projectCompanyLinks.length === 1 ? (
        <div>
          <Label>Company</Label>
          <div className="p-3 border rounded-md bg-gray-50">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{projectCompanyLinks[0].company_name}</span>
              <span className="text-sm text-muted-foreground">(auto-selected)</span>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor="priceType">Price Type *</Label>
        <Select value={priceType} onValueChange={(value: "FIXED" | "HOURLY") => setPriceType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HOURLY">Hourly Rate</SelectItem>
            <SelectItem value="FIXED">Fixed Price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="budgetHours">Budget Hours</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="unlimitedBudget"
              checked={unlimitedBudgetHours}
              onCheckedChange={setUnlimitedBudgetHours}
            />
            <Label htmlFor="unlimitedBudget" className="text-sm font-medium">
              Unlimited budget hours
            </Label>
          </div>
          <Input 
            id="budgetHours" 
            type="number" 
            min="0" 
            step="0.25" 
            value={budgetHours} 
            onChange={(e) => setBudgetHours(e.target.value)} 
            placeholder="0" 
            disabled={unlimitedBudgetHours}
            className={errors.budgetHours ? "border-red-500" : ""} 
          />
          {errors.budgetHours && <p className="text-red-500 text-sm mt-1">{errors.budgetHours}</p>}
        </div>
      </div>

      {priceType === "HOURLY" && (
        <div>
          <Label htmlFor="hourlyRate">Hourly Rate (€) *</Label>
          <Input 
            id="hourlyRate" 
            type="number" 
            min="0" 
            step="0.01" 
            value={hourlyRate} 
            onChange={(e) => setHourlyRate(e.target.value)} 
            placeholder="0.00" 
            className={errors.hourlyRate ? "border-red-500" : ""} 
          />
          {errors.hourlyRate && <p className="text-red-500 text-sm mt-1">{errors.hourlyRate}</p>}
        </div>
      )}

      {priceType === "FIXED" && (
        <div>
          <Label htmlFor="fixedPrice">Fixed Price (€) *</Label>
          <Input 
            id="fixedPrice" 
            type="number" 
            min="0" 
            step="0.01" 
            value={fixedPrice} 
            onChange={(e) => setFixedPrice(e.target.value)} 
            placeholder="0.00" 
            className={errors.fixedPrice ? "border-red-500" : ""} 
          />
          {errors.fixedPrice && <p className="text-red-500 text-sm mt-1">{errors.fixedPrice}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input 
            id="startDate" 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input 
            id="endDate" 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>
      </div>

      <div>
        <Label htmlFor="serviceColor">Service Color</Label>
        <div className="space-y-3">
          <Select value={serviceColor} onValueChange={setServiceColor}>
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300" 
                    style={{ backgroundColor: serviceColor }}
                  />
                  <span>{SERVICE_COLORS.find(c => c.value === serviceColor)?.name || 'Select color'}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SERVICE_COLORS.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300" 
                      style={{ backgroundColor: color.value }}
                    />
                    <span>{color.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600">Choose a color to identify this service in the time tracking calendar</p>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : service ? "Update Service" : "Create Service"}
        </Button>
      </div>
    </form>
  );
}

/* ---------------- Company selection component ---------------- */
interface CompanySelectionProps {
  companies: { id: number; company_name: string }[];
  selectedCompanies: { company_id: number; available_hours: string; unlimited_hours: boolean }[];
  onChange: (companies: { company_id: number; available_hours: string; unlimited_hours: boolean }[]) => void;
}

function CompanySelection({ companies, selectedCompanies, onChange }: CompanySelectionProps) {
  const handleCompanyToggle = (companyId: number) => {
    const isSelected = selectedCompanies.some((c) => c.company_id === companyId);

    if (isSelected) {
      onChange(selectedCompanies.filter((c) => c.company_id !== companyId));
    } else {
      onChange([...selectedCompanies, { company_id: companyId, available_hours: "0", unlimited_hours: false }]);
    }
  };

  const handleHoursChange = (companyId: number, hours: string) => {
    onChange(
      selectedCompanies.map((c) => (c.company_id === companyId ? { ...c, available_hours: hours } : c))
    );
  };

  const handleUnlimitedToggle = (companyId: number, unlimited: boolean) => {
    onChange(
      selectedCompanies.map((c) => 
        c.company_id === companyId 
          ? { ...c, unlimited_hours: unlimited, available_hours: unlimited ? "0" : c.available_hours }
          : c
      )
    );
  };

  return (
    <div className="space-y-4">
      <Label>Companies & Available Hours</Label>
      <div className="border rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
        {companies.map((company) => {
          const selected = selectedCompanies.find((c) => c.company_id === company.id);
          const isSelected = !!selected;

          return (
            <div key={company.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-3">
                <input type="checkbox" checked={isSelected} onChange={() => handleCompanyToggle(company.id)} className="rounded" />
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span>{company.company_name}</span>
                </div>
              </div>

              {isSelected && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selected?.unlimited_hours || false}
                      onChange={(e) => handleUnlimitedToggle(company.id, e.target.checked)}
                      className="rounded"
                    />
                    <Label className="text-sm">Unlimited</Label>
                  </div>
                  {!selected?.unlimited_hours && (
                    <>
                      <Label htmlFor={`hours-${company.id}`} className="text-sm">
                        Hours:
                      </Label>
                      <Input
                        id={`hours-${company.id}`}
                        type="number"
                        min="0"
                        step="0.25"
                        value={selected?.available_hours || "0"}
                        onChange={(e) => handleHoursChange(company.id, e.target.value)}
                        className="w-20"
                        placeholder="0"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedCompanies.length === 0 && (
        <p className="text-sm text-gray-500">Select one or more companies and specify available hours for each.</p>
      )}
    </div>
  );
}

/* ---------------- Project form ---------------- */
interface ProjectFormProps {
  project?: ProjectResponse;
  companies: { id: number; company_name: string }[];
  onSubmit: (data: ProjectCreateRequest | ProjectUpdateRequest) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({ project, companies, onSubmit, onCancel }: ProjectFormProps) {
  const [projectName, setProjectName] = useState(project?.project_name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [selectedCompanies, setSelectedCompanies] = useState<{ company_id: number; available_hours: string; unlimited_hours: boolean }[]>(
    project?.company_links.map((link) => ({ 
      company_id: link.company_id, 
      available_hours: link.available_hours?.toString() || "0",
      unlimited_hours: link.unlimited_hours || false
    })) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!projectName.trim()) newErrors.projectName = "Project name is required";

    selectedCompanies.forEach((company) => {
      if (!company.unlimited_hours) {
        const hours = parseFloat(company.available_hours);
        if (isNaN(hours) || hours < 0) newErrors[`hours_${company.company_id}`] = "Available hours must be 0 or greater";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const companyLinks: ProjectCompanyLink[] = selectedCompanies.map((company) => ({
        company_id: company.company_id,
        available_hours: company.unlimited_hours ? null : parseFloat(company.available_hours),
        unlimited_hours: company.unlimited_hours,
      }));

      if (project) {
        await onSubmit({ project_name: projectName, description: description || null, company_links: companyLinks });
      } else {
        await onSubmit({ project_name: projectName, description: description || null, company_links: companyLinks });
      }

      onCancel();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(project ? "Failed to update project" : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="projectName">Project Name *</Label>
        <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Enter project name" className={errors.projectName ? "border-red-500" : ""} />
        {errors.projectName && <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Project description (optional)" rows={3} />
      </div>

      <CompanySelection companies={companies} selectedCompanies={selectedCompanies} onChange={setSelectedCompanies} />

      {selectedCompanies.map((company) => {
        const error = errors[`hours_${company.company_id}`];
        if (!error) return null;
        const companyName = companies.find((c) => c.id === company.company_id)?.company_name;
        return (
          <p key={company.company_id} className="text-red-500 text-sm">
            {companyName}: {error}
          </p>
        );
      })}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : project ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

/* ---------------- Page ---------------- */
export default function Projects() {
  const navigate = useNavigate();
  const { user } = useUserGuardContext();

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [companies, setCompanies] = useState<{ id: number; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);

  const loadProjects = async () => {
    try {
      const response = await brain.list_projects();
      const data: ProjectsListResponse = await response.json();
      setProjects(data.projects);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    }
  };

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => {
      // Search in project name
      const projectNameMatch = p.project_name?.toLowerCase().includes(q);
      
      // Search in company names
      const companyNameMatch = p.company_links.some(link => 
        link.company_name?.toLowerCase().includes(q)
      );
      
      return projectNameMatch || companyNameMatch;
    });
  }, [projects, searchQuery]);

  // helpers
  const formatNLDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const getTotalHours = (p: ProjectResponse) => p.company_links.reduce((sum, l) => {
    if (l.unlimited_hours) return sum + 999999; // Treat unlimited as very high number
    return sum + parseFloat(l.available_hours?.toString() || '0');
  }, 0);

  const hasUnlimitedHours = (p: ProjectResponse) => p.company_links.some(l => l.unlimited_hours);

  // Add state to track remaining hours for each project
  const [projectRemainingHours, setProjectRemainingHours] = useState<Record<number, number>>({});

  // Function to load remaining hours for a project
  const loadProjectRemainingHours = async (projectId: number) => {
    try {
      const response = await brain.get_project_services_summary({ projectId });
      const data = await response.json();
      const totalBudget = data.totals?.hours_budget || 0;
      const totalAvailable = getTotalHours(projects.find(p => p.id === projectId) || { company_links: [] } as ProjectResponse);
      const remaining = totalAvailable - totalBudget;
      
      setProjectRemainingHours(prev => ({
        ...prev,
        [projectId]: remaining
      }));
    } catch (error) {
      console.error(`Error loading remaining hours for project ${projectId}:`, error);
      setProjectRemainingHours(prev => ({
        ...prev,
        [projectId]: 0
      }));
    }
  };

  // Load remaining hours for all projects
  const loadAllProjectRemainingHours = async () => {
    const promises = projects.map(project => loadProjectRemainingHours(project.id));
    await Promise.all(promises);
  };

  // Update useEffect to also load remaining hours
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadProjects(), loadCompanies()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Load remaining hours after projects are loaded
  useEffect(() => {
    if (projects.length > 0) {
      loadAllProjectRemainingHours();
    }
  }, [projects]);

  const [checkedIds, setCheckedIds] = useState<Record<number, boolean>>({});
  const allChecked = filteredProjects.length > 0 && filteredProjects.every((p) => checkedIds[p.id]);
  const toggleAll = (checked: boolean) => {
    const next: Record<number, boolean> = {};
    filteredProjects.forEach((p) => (next[p.id] = checked));
    setCheckedIds(next);
  };
  const toggleOne = (id: number, checked: boolean) => setCheckedIds((prev) => ({ ...prev, [id]: checked }));

  // load companies
  const loadCompanies = async () => {
    try {
      const response = await brain.list_companies();
      const data: CompaniesListResponse = await response.json();
      setCompanies(data.companies.map((c) => ({ id: c.id, company_name: c.company_name })));
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Failed to load companies");
    }
  };

  const handleCreateProject = async (data: ProjectCreateRequest) => {
    try {
      const response = await brain.create_project(data);
      if (response.status === 200) {
        toast.success("Project created successfully");
        await loadProjects();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  };

  const handleUpdateProject = async (projectId: number, data: ProjectUpdateRequest) => {
    try {
      const response = await brain.update_project({ projectId }, data);
      if (response.status === 200) {
        toast.success("Project updated successfully");
        await loadProjects();
      }
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) return;
    try {
      const response = await brain.delete_project({ projectId });
      if (response.status === 200) {
        toast.success("Project deleted successfully");
        await loadProjects();
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  /* ---------------- Service management ---------------- */
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceResponse | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);

  const handleCreateService = async (data: ServiceCreateRequest) => {
    try {
      const response = await brain.create_service(data);
      if (response.status === 200) {
        toast.success("Service created successfully");
        // Reload services for the current project
        if (currentProjectId) {
          await loadServicesForProject(currentProjectId);
        }
      }
    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
    }
  };

  const handleUpdateService = async (data: ServiceUpdateRequest) => {
    if (!editingService) return;
    try {
      const response = await brain.update_service({ serviceId: editingService.id }, data);
      if (response.status === 200) {
        toast.success("Service updated successfully");
        // Reload services for the current project
        if (currentProjectId) {
          await loadServicesForProject(currentProjectId);
        }
      }
    } catch (error) {
      console.error("Error updating service:", error);
      throw error;
    }
  };

  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete the service "${serviceName}"? This action cannot be undone.`)) return;
    try {
      const response = await brain.delete_service({ serviceId });
      if (response.status === 200) {
        toast.success("Service deleted successfully");
        // Reload services for the current project
        if (currentProjectId) {
          await loadServicesForProject(currentProjectId);
        }
      }
    } catch (error: any) {
      console.error("Error deleting service:", error);
      
      // Check if it's the specific error about time entries
      if (error?.detail?.includes("time entries")) {
        toast.error(
          "Cannot delete service with time entries. Please remove or reassign time entries first.",
          {
            duration: 5000,
            description: "This service has time entries associated with it. You need to delete or reassign those time entries before deleting the service."
          }
        );
      } else {
        toast.error("Failed to delete service");
      }
    }
  };

  const openServiceDialog = (projectId: number, service?: ServiceResponse) => {
    setCurrentProjectId(projectId);
    setEditingService(service || null);
    setIsServiceDialogOpen(true);
  };

  const openServiceEditDialog = async (projectId: number, serviceRow: ServiceRow) => {
    setCurrentProjectId(projectId);
    setServicesLoading(true);
    
    try {
      // Fetch the full service details for editing
      const response = await brain.get_service({ serviceId: serviceRow.id });
      const serviceData: ServiceResponse = await response.json();
      
      setEditingService(serviceData);
      setIsServiceDialogOpen(true);
    } catch (error) {
      console.error("Error fetching service details:", error);
      toast.error("Failed to load service details for editing");
    } finally {
      setServicesLoading(false);
    }
  };

  /* ---------------- Preview state + Services (DB) ---------------- */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState<ProjectResponse | null>(null);
  const [generalOpen, setGeneralOpen] = useState(true);

  type ServiceRow = {
    id: number;
    project_id: number;
    company_id: number | null;
    name: string;
    price_type: "FIXED" | "HOURLY";
    budget_hours: number;
    fixed_price: number | null;
    hourly_rate: number | null;
    start_date: string | null;
    end_date: string | null;
    spent_hours: number;
    budget_cost: number;
    spent_cost: number;
  };

  type ServicesTotals = {
    hours_budget: number;
    hours_spent: number;
    cost_budget: number;
    cost_spent: number;
  };

  const formatEUR = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
  const formatHours = (n: number) => n >= 999999 ? '∞' : `${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} uren`;

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [servicesTotals, setServicesTotals] = useState<ServicesTotals | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const loadServicesForProject = async (projectId: number) => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const res = await brain.get_project_services_summary({ projectId });
      const data = await res.json();
      setServices((data?.services || []) as ServiceRow[]);
      setServicesTotals((data?.totals || null) as ServicesTotals | null);
    } catch (e) {
      console.error("Failed to load project services:", e);
      setServices([]);
      setServicesTotals(null);
      setServicesError("Kon diensten niet laden");
    } finally {
      setServicesLoading(false);
    }
  };

  const openPreview = (p: ProjectResponse) => {
    setPreviewProject(p);
    setGeneralOpen(true);
    setPreviewOpen(true);
    loadServicesForProject(p.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center">
        <div className="text-emerald-600">Projecten laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-emerald-900">Projecten</h1>
            <p className="text-emerald-700 mt-1">Beheer je projecten en uren</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Project toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Maak nieuw project</DialogTitle>
              </DialogHeader>
              <ProjectForm companies={companies} onSubmit={handleCreateProject} onCancel={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-emerald-200 shadow-lg">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-emerald-800 flex items-center gap-2">
                <Building className="h-5 w-5" />
                Projecten beheren
                <span className="text-sm font-normal text-emerald-700">({filteredProjects.length}{searchQuery ? ` van ${projects.length}` : ""})</span>
              </CardTitle>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Zoek op projectnaam of bedrijf…" className="pl-9 pr-9" />
              {searchQuery && (
                <button type="button" aria-label="Zoekopdracht wissen" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-emerald-700 mb-2">No projects yet</h3>
                <p className="text-emerald-600 mb-4">Create your first project to get started with time tracking.</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Geen projecten gevonden voor “{searchQuery}”</div>
            ) : (
              <Table>
                <TableHeader className="bg-purple-100/60">
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" aria-label="Select all" checked={allChecked} onChange={(e) => toggleAll(e.currentTarget.checked)} />
                    </TableHead>
                    <TableHead className="min-w-[260px]">Projectnaam ({filteredProjects.length})</TableHead>
                    <TableHead className="min-w-[180px]">Bedrijf</TableHead>
                    <TableHead className="min-w-[200px]">Uren</TableHead>
                    <TableHead className="min-w-[140px]">Aangemaakt op</TableHead>
                    <TableHead className="w-12 text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredProjects.map((project) => {
                    const total = getTotalHours(project).toFixed(2);
                    const remaining = projectRemainingHours[project.id] || 0;
                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <input type="checkbox" checked={!!checkedIds[project.id]} onChange={(e) => toggleOne(project.id, e.currentTarget.checked)} aria-label={`Select ${project.project_name}`} />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{project.project_name}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); openPreview(project); }} className="text-[10px] px-2 py-0.5 rounded-md border text-muted-foreground hover:bg-muted">
                              Preview
                            </button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {project.company_links.length > 0 ? (
                              project.company_links.map((link, index) => (
                                <div key={link.company_id} className="flex items-center gap-2">
                                  <Building className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm">{link.company_name}</span>
                                  {index < project.company_links.length - 1 && <span className="text-xs text-muted-foreground">,</span>}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {hasUnlimitedHours(project) ? '∞' : `${total}h`}
                              </Badge>
                              <span className="text-xs text-muted-foreground">beschikbaar</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={remaining >= 0 || hasUnlimitedHours(project) ? "default" : "destructive"}>
                                {hasUnlimitedHours(project) ? '∞' : (remaining >= 0 ? remaining.toFixed(2) : `-${Math.abs(remaining).toFixed(2)}`)}{hasUnlimitedHours(project) ? '' : 'h'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">restant</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{formatNLDate(project.created_at)}</TableCell>

                        <TableCell className="text-right pr-6">
                          <button className="text-red-600 hover:text-red-700" onClick={() => handleDeleteProject(project.id, project.project_name)} aria-label="Delete" title="Verwijderen">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview popup */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-[80vw] w-full">
            {previewProject && (
              <Fragment>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    {previewProject.project_name}
                  </DialogTitle>
                  <DialogDescription>Overzicht van projectgegevens</DialogDescription>
                </DialogHeader>

                {/* Algemeen */}
                <div className="border rounded-xl">
                  <button type="button" className="w-full flex items-center justify-between px-4 py-3" onClick={() => setGeneralOpen((v) => !v)}>
                    <span className="text-sm font-medium text-purple-900">Algemeen</span>
                    {generalOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {generalOpen && (
                    <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      <div className="sm:col-span-2">
                        <div className="text-xs text-muted-foreground">Beschrijving</div>
                        <div className="mt-1 whitespace-pre-line">{previewProject.description || "—"}</div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-muted-foreground">Bedrijven & uren</div>
                        <div className="mt-1 space-y-1">
                          {previewProject.company_links.length ? (
                            previewProject.company_links.map((l) => (
                              <div key={l.company_id} className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <span>
                                  {l.company_name} — {l.unlimited_hours ? '∞' : `${Number(l.available_hours)}h`}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Totaal uren</div>
                        <div className="mt-1 font-medium">
                          {hasUnlimitedHours(previewProject) ? '∞' : `${getTotalHours(previewProject).toFixed(2)}h`}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Aangemaakt op</div>
                        <div className="mt-1 font-medium">{formatNLDate(previewProject.created_at)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Diensten (DB) */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-amber-900">Diensten</h3>
                    <Button 
                      onClick={() => openServiceDialog(previewProject.id)} 
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                      Dienst toevoegen
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-amber-600 font-semibold">Budget</div>
                      <div className="text-2xl font-bold text-amber-600">
                        {hasUnlimitedHours(previewProject) ? '∞' : (servicesTotals ? formatHours(servicesTotals.hours_budget) : "—")}
                      </div>
                      <div className="text-amber-600">{servicesTotals ? formatEUR(servicesTotals.cost_budget) : "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-amber-600 font-semibold">Besteed</div>
                      <div className="text-2xl font-bold text-amber-600">{servicesTotals ? formatHours(servicesTotals.hours_spent) : "—"}</div>
                      <div className="text-amber-600">{servicesTotals ? formatEUR(servicesTotals.cost_spent) : "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-amber-600 font-semibold">Correcties</div>
                      <div className="text-2xl font-bold text-amber-600">0,00 uren</div>
                      <div className="text-amber-600">{formatEUR(0)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-amber-600 font-semibold">Restant</div>
                      <div className={`text-2xl font-bold ${servicesTotals && servicesTotals.hours_budget - servicesTotals.hours_spent < 0 ? "text-red-600" : "text-amber-600"}`}>
                        {servicesTotals ? formatHours(servicesTotals.hours_budget - servicesTotals.hours_spent) : "—"}
                      </div>
                      <div className={`${servicesTotals && servicesTotals.cost_budget - servicesTotals.cost_spent < 0 ? "text-red-600" : "text-amber-600"}`}>
                        {servicesTotals ? formatEUR(servicesTotals.cost_budget - servicesTotals.cost_spent) : "—"}
                      </div>
                    </div>
                  </div>

                  {servicesLoading ? (
                    <div className="rounded-xl border p-6 text-sm text-muted-foreground">Diensten laden…</div>
                  ) : servicesError ? (
                    <div className="rounded-xl border p-6 text-sm text-red-600">{servicesError}</div>
                  ) : services.length === 0 ? (
                    <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                      <div className="text-center">
                        <p className="mb-4">Nog geen diensten voor dit project.</p>
                        <Button 
                          onClick={() => openServiceDialog(previewProject.id)} 
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                          Eerste dienst toevoegen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border overflow-hidden">
                      <div className="grid grid-cols-12 bg-amber-50 text-amber-900 px-4 py-2 text-sm font-medium">
                        <div className="col-span-5">Dienst</div>
                        <div className="col-span-3">Uren</div>
                        <div className="col-span-2">Kosten</div>
                        <div className="col-span-2">Tarief</div>
                      </div>

                      <div className="divide-y">
                        {services.map((s) => {
                          const ratio = Math.max(0, Math.min(1, s.budget_hours ? s.spent_hours / s.budget_hours : 0)) * 100;
                          const remainHours = s.budget_hours - s.spent_hours;
                          const remainCost = s.budget_cost - s.spent_cost;
                          const effectiveRate = s.price_type === "HOURLY" ? s.hourly_rate ?? 0 : s.budget_hours > 0 ? (s.fixed_price ?? 0) / s.budget_hours : 0;

                          return (
                            <div key={s.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-start">
                              <div className="col-span-5">
                                <div className="flex items-start gap-3">
                                  <input type="checkbox" className="mt-1.5 rounded" />
                                  <div className="flex-1">
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-muted-foreground">{formatEUR(s.budget_cost)}</div>

                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-[10px] px-2 py-0.5 rounded-md border text-muted-foreground">{s.price_type === "FIXED" ? "Vaste prijs" : "Uurtarief"}</span>
                                    </div>

                                    {(s.start_date || s.end_date) && (
                                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                          {s.start_date ? new Date(s.start_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "—"} – {s.end_date ? new Date(s.end_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openServiceEditDialog(previewProject.id, s as ServiceRow)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteService(s.id, s.name)}
                                      className={`h-8 w-8 p-0 ${s.spent_hours > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                                      disabled={s.spent_hours > 0}
                                      title={s.spent_hours > 0 ? `Cannot delete: ${s.spent_hours} hours logged` : "Delete service"}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="col-span-3">
                                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                                  <div className="h-3 bg-green-500" style={{ width: `${ratio}%` }} />
                                </div>
                                <div className="mt-2 grid grid-cols-3 text-sm">
                                  <div>
                                    <div className="text-muted-foreground">Budget</div>
                                    <div>{formatHours(s.budget_hours)}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Besteed</div>
                                    <div>{formatHours(s.spent_hours)}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Restant</div>
                                    <div className={remainHours < 0 ? "text-red-600" : ""}>{formatHours(remainHours)}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="col-span-2">
                                <div className="mt-1 grid grid-cols-1 gap-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">€ Budget</span>
                                    <span>{formatEUR(s.budget_cost)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">€ Besteed</span>
                                    <span>{formatEUR(s.spent_cost)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">€ Restant</span>
                                    <span className={remainCost < 0 ? "text-red-600" : ""}>{formatEUR(remainCost)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="col-span-2">
                                <div className="mt-1 grid grid-cols-1 gap-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type</span>
                                    <span>{s.price_type === "FIXED" ? "Vast" : "Uur"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tarief</span>
                                    <span>{formatEUR(effectiveRate)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                    Sluiten
                  </Button>
                  <Button
                    onClick={() => {
                      setPreviewOpen(false);
                      setEditingProject(previewProject);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Bewerken
                  </Button>
                </div>
              </Fragment>
            )}
          </DialogContent>
        </Dialog>

        {/* Global edit dialog */}
        <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            {editingProject && (
              <ProjectForm project={editingProject} companies={companies} onSubmit={(data) => handleUpdateProject(editingProject.id, data)} onCancel={() => setEditingProject(null)} />
            )}
          </DialogContent>
        </Dialog>

        {/* Service dialog */}
        <Dialog open={isServiceDialogOpen} onOpenChange={(open) => !open && setIsServiceDialogOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <DialogDescription>
                {editingService ? "Update service details" : "Create a new service for this project"}
              </DialogDescription>
            </DialogHeader>
            {currentProjectId && (
              <ServiceForm 
                service={editingService || undefined}
                projectId={currentProjectId}
                companies={companies}
                projectCompanyLinks={previewProject?.company_links || []}
                onSubmit={editingService ? handleUpdateService : handleCreateService}
                onCancel={() => {
                  setIsServiceDialogOpen(false);
                  setEditingService(null);
                  setCurrentProjectId(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
