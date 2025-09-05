import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserGuardContext } from 'app/auth';
import brain from 'brain';
import { auth } from 'app/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/extensions/shadcn/components/calendar';
import { Badge } from '@/extensions/shadcn/components/badge';
import { toast } from 'sonner';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Trash2, LayoutGrid, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  TimeEntryCreateRequest,
  TimeEntryResponse,
  CompanyResponse,
  ProjectResponse,
  ProjectCompanyAvailableHours,
  ServiceResponse,
  EmployeeResponse,
} from 'types';

/** ─────────── Helpers ─────────── */
const toISODate = (d: Date) => {
     const y = d.getFullYear();
     const m = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${y}-${m}-${day}`;
};
const startOfWeek = (date: Date, weekStartsOn: 0 | 1 = 1) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const timeToMinutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const minutesToHHMM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const minutesToHours = (mins: number) => Math.round((mins / 60) * 100) / 100;

const formatHoursToHM = (hours: number) => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}m`;
  }
};

// Helper functions for the new header design
const getMonthYearLabel = (date: Date) => {
  return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
};

const getWeekLabelFormatted = (date: Date) => {
  const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `Week ${weekNumber}`;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

/** ─────────── Visual constants ─────────── */
const PX_PER_HOUR = 96;                 // zoom van de tijdlijn (doubled from 48)
const START_HOUR = 6;                    // 06:00
const END_HOUR = 22;                     // 22:00
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAY_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR;

// Time zone definitions for background colors
const TIME_ZONES = [
  { start: 6, end: 8.5, color: 'bg-gray-100' },    // 6:00-8:30 light grey
  { start: 8.5, end: 17, color: 'bg-white' },      // 8:30-17:00 white
  { start: 17, end: 22, color: 'bg-gray-100' },    // 17:00-22:00 light grey
];

/** ─────────── Types ─────────── */
interface CalendarDay {
  date: Date;
  timeEntries: TimeEntryResponse[];
  totalHours: number;
}

const TimeTracking: React.FC = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();

  /** Weekend visibility state */
  const [showWeekends, setShowWeekends] = useState(false);

  /** Employee selection state */
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    // Load from localStorage on component mount
    return localStorage.getItem('selectedEmployeeId') || 'own';
  });

  /** Available hours search state */
  const [availableHoursSearch, setAvailableHoursSearch] = useState<string>('');

  /** Calendar visibility state */
  const [showCalendar, setShowCalendar] = useState(false);

  /** Information density state */
  const [infoDensity, setInfoDensity] = useState<'minimal' | 'standard' | 'detailed'>('standard');

  /** Week state */
  const [anchorDate, setAnchorDate] = useState(new Date());
  const weekStart = useMemo(() => startOfWeek(anchorDate, 1), [anchorDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  
  // Helper function to go to current week
  const goToCurrentWeek = () => {
    setAnchorDate(new Date());
  };

  // Helper function to handle date selection from calendar
  const handleDateSelect = (date: Date) => {
    // Set the anchor date to the start of the week containing the selected date
    const weekStart = startOfWeek(date, 1);
    setAnchorDate(weekStart);
  };

  // Helper function to cycle through information density modes
  const cycleInfoDensity = () => {
    setInfoDensity(current => {
      switch (current) {
        case 'minimal': return 'standard';
        case 'standard': return 'detailed';
        case 'detailed': return 'minimal';
        default: return 'standard';
      }
    });
  };
  const allDaysOfWeek = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const daysOfWeek = useMemo(() => {
    if (showWeekends) {
      return allDaysOfWeek;
    }
    // Filter out weekends (Saturday = 6, Sunday = 0)
    return allDaysOfWeek.filter(day => day.getDay() !== 0 && day.getDay() !== 6);
  }, [allDaysOfWeek, showWeekends]);
  
  // Dynamic grid columns based on weekend visibility
  const GRID_COLS = useMemo(() => {
    const dayCount = daysOfWeek.length;
    return `80px repeat(${dayCount}, 1fr)`;
  }, [daysOfWeek.length]);

  /** Data state */
  const [timeEntries, setTimeEntries] = useState<TimeEntryResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [availableHours, setAvailableHours] = useState<ProjectCompanyAvailableHours[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  /** Budget calculation state */
  const [budgetCalculations, setBudgetCalculations] = useState<{
    [key: string]: { workedHours: number; plannedHours: number; isLoading: boolean }
  }>({});

  /** Create form state */
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const computedHours = useMemo(() => {
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    if (s == null || e == null || e <= s) return 0;
    return minutesToHours(e - s);
  }, [startTime, endTime]);

  /** Edit form state */
  const [editingEntry, setEditingEntry] = useState<TimeEntryResponse | null>(null);
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editServiceId, setEditServiceId] = useState<string>('');
  const [editServices, setEditServices] = useState<ServiceResponse[]>([]);
  const [editComment, setEditComment] = useState<string>('');
  const editHours = useMemo(() => {
    const s = timeToMinutes(editStart);
    const e = timeToMinutes(editEnd);
    if (s == null || e == null || e <= s) return 0;
    return minutesToHours(e - s);
  }, [editStart, editEnd]);

  /** Now-indicator */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  /** Dialogs */
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);

  /** Context menu state */
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    entry: TimeEntryResponse | null;
  }>({
    show: false,
    x: 0,
    y: 0,
    entry: null,
  });

  /** Load week data */
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [timeEntriesResponse, companiesResponse, projectsResponse, availableHoursResponse, employeesResponse] = await Promise.all([
          brain.list_time_entries({ 
            start_date: toISODate(weekStart), 
            end_date: toISODate(weekEnd),
            employee_id_filter: selectedEmployeeId !== 'own' ? parseInt(selectedEmployeeId) : undefined
          }),
          brain.list_companies(),
          brain.list_projects(),
          brain.get_available_hours(),
          brain.get_employees(),
        ]);

        const timeEntriesData = await timeEntriesResponse.json();
        const companiesData = await companiesResponse.json();
        const projectsData = await projectsResponse.json();
        const availableHoursData = await availableHoursResponse.json();
        const employeesData = await employeesResponse.json();

        setTimeEntries(timeEntriesData.time_entries || []);
        setCompanies(companiesData.companies || []);
        setProjects(projectsData.projects || []);
        setAvailableHours(availableHoursData.project_companies || []);
        // Filter out the current user from the employees list
        const currentUserEmail = user?.primaryEmail;
        const currentUserId = user?.id;
        
        const filteredEmployees = (employeesData.employees || []).filter(employee => {
          // Don't show the current user in the dropdown
          // Check both email and user ID (since emails might be in different formats)
          const emailMatch = employee.email === currentUserEmail;
          const idMatch = employee.email === `${currentUserId}@timeflow.local`;
          const shouldInclude = !emailMatch && !idMatch;
          
          return shouldInclude;
        });
        setEmployees(filteredEmployees);

        const days: CalendarDay[] = daysOfWeek.map((d) => {
          const iso = toISODate(d);
          const entries = (timeEntriesData.time_entries || [])
            .filter((e: TimeEntryResponse) => e.date === iso)
            .sort((a: TimeEntryResponse, b: TimeEntryResponse) =>
              (a.start_time || '99:99:99').localeCompare(b.start_time || '99:99:99'),
            );
          const total = entries.reduce((s: number, e: TimeEntryResponse) => s + (e.hours_worked || 0), 0);
          return { date: d, timeEntries: entries, totalHours: total };
        });
        setCalendarDays(days);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load week');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [weekStart, weekEnd, daysOfWeek, selectedEmployeeId]);

  /** Load services for all projects */
  useEffect(() => {
    const loadServices = async () => {
      if (projects.length === 0) return;
      
      try {
        // Load services for all projects to enable earnings calculation
        const allServicesPromises = projects.map(project => 
          brain.get_project_services_summary({ projectId: project.id })
        );
        const allServicesResponses = await Promise.all(allServicesPromises);
        const allServicesData = await Promise.all(allServicesResponses.map(response => response.json()));
        const allServices = allServicesData.flatMap(data => data.services || []);
        setServices(allServices);
      } catch (e) {
        console.error('Failed to load services:', e);
      }
    };
    
    loadServices();
  }, [projects]);

  /** Calculate planned hours for a specific service - includes ALL entries, not just current week */
  const calculatePlannedHours = useCallback(async (serviceId: number) => {
    console.log(`Calculating planned hours for service ${serviceId}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    try {
      // Use a more reasonable date range - 2 years back and 2 years forward
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2);
      
      console.log(`Fetching time entries from ${toISODate(startDate)} to ${toISODate(endDate)}`);
      const response = await brain.list_time_entries({ 
        start_date: toISODate(startDate),
        end_date: toISODate(endDate)
      });
      const data = await response.json();
      const allEntries = data.time_entries || [];
      console.log(`Found ${allEntries.length} total entries`);
      
      // Filter for this specific service and future dates
      const relevantEntries = allEntries.filter((entry: TimeEntryResponse) => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        
        return entry.service_id === serviceId &&
               entryDate > today; // Future dates only
      });
      
      console.log(`Found ${relevantEntries.length} relevant planned entries for service ${serviceId}`);
      const total = relevantEntries.reduce((total: number, entry: TimeEntryResponse) => total + (entry.hours_worked || 0), 0);
      console.log(`Total planned hours: ${total}`);
      return total;
    } catch (error) {
      console.error('Error calculating planned hours:', error);
      return 0;
    }
  }, []);

  /** Calculate worked hours for a specific service - includes ALL entries, not just current week */
  const calculateWorkedHours = useCallback(async (serviceId: number) => {
    console.log(`Calculating worked hours for service ${serviceId}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    try {
      // Use a more reasonable date range - 2 years back and 2 years forward
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2);
      
      console.log(`Fetching time entries from ${toISODate(startDate)} to ${toISODate(endDate)}`);
      const response = await brain.list_time_entries({ 
        start_date: toISODate(startDate),
        end_date: toISODate(endDate)
      });
      const data = await response.json();
      const allEntries = data.time_entries || [];
      console.log(`Found ${allEntries.length} total entries`);
      
      // Filter for this specific service and past/today dates
      const relevantEntries = allEntries.filter((entry: TimeEntryResponse) => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        
        return entry.service_id === serviceId && 
               entryDate <= today; // Today and past dates only
      });
      
      console.log(`Found ${relevantEntries.length} relevant worked entries for service ${serviceId}`);
      const total = relevantEntries.reduce((total: number, entry: TimeEntryResponse) => total + (entry.hours_worked || 0), 0);
      console.log(`Total worked hours: ${total}`);
      return total;
    } catch (error) {
      console.error('Error calculating worked hours:', error);
      return 0;
    }
  }, []);

  /** Load budget calculations for a specific service */
  const loadBudgetCalculations = useCallback(async (serviceId: number) => {
    const key = `service-${serviceId}`;
    console.log(`Loading budget calculations for service ${serviceId}`);
    
    // Check if already loading to prevent multiple simultaneous calls
    const currentState = budgetCalculations[key];
    if (currentState?.isLoading) {
      console.log(`Already loading calculations for service ${serviceId}, skipping`);
      return;
    }
    
    // Set loading state
    setBudgetCalculations(prev => ({
      ...prev,
      [key]: { workedHours: 0, plannedHours: 0, isLoading: true }
    }));

    try {
      console.log(`Starting calculations for service ${serviceId}`);
      const [workedHours, plannedHours] = await Promise.all([
        calculateWorkedHours(serviceId),
        calculatePlannedHours(serviceId)
      ]);

      console.log(`Calculations completed for service ${serviceId}:`, { workedHours, plannedHours });

      setBudgetCalculations(prev => ({
        ...prev,
        [key]: { workedHours, plannedHours, isLoading: false }
      }));
    } catch (error) {
      console.error('Error loading budget calculations:', error);
      setBudgetCalculations(prev => ({
        ...prev,
        [key]: { workedHours: 0, plannedHours: 0, isLoading: false }
      }));
    }
  }, [calculateWorkedHours, calculatePlannedHours]);

  /** Load budget calculations when service changes */
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== 'none') {
      const serviceId = parseInt(selectedServiceId);
      // Add a small delay to debounce rapid changes
      const timeoutId = setTimeout(() => {
        loadBudgetCalculations(serviceId);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedServiceId, loadBudgetCalculations]);

  /** Load budget calculations when edit service changes */
  useEffect(() => {
    console.log('Edit service useEffect triggered, editServiceId:', editServiceId);
    if (editServiceId && editServiceId !== 'none') {
      const serviceId = parseInt(editServiceId);
      console.log('Loading budget calculations for edit service:', serviceId);
      // Add a small delay to debounce rapid changes
      const timeoutId = setTimeout(() => {
        loadBudgetCalculations(serviceId);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [editServiceId, loadBudgetCalculations]);

  /** Calculate total hours for selected employee and week */
  const calculateTotalHours = useMemo(() => {
    if (selectedEmployeeId === 'own') {
      // For "own" hours, sum all time entries for the current week
      return timeEntries.reduce((total, entry) => total + (entry.hours_worked || 0), 0);
    } else {
      // For specific employee, sum their time entries for the current week
      const employeeId = parseInt(selectedEmployeeId);
      return timeEntries
        .filter(entry => entry.employee_id === employeeId)
        .reduce((total, entry) => total + (entry.hours_worked || 0), 0);
    }
  }, [timeEntries, selectedEmployeeId]);

  /** Calculate total earnings for selected employee and week */
  const calculateTotalEarnings = useMemo(() => {
    const relevantEntries = selectedEmployeeId === 'own' 
      ? timeEntries 
      : timeEntries.filter(entry => entry.employee_id === parseInt(selectedEmployeeId));

    return relevantEntries.reduce((total, entry) => {
      // Find the service to get pricing info
      const service = services.find(s => s.id === entry.service_id);

      if (!service) return total;

      const hoursWorked = entry.hours_worked || 0;

      if (service.hourly_rate && service.hourly_rate > 0) {
        // Hourly rate calculation
        const earnings = hoursWorked * service.hourly_rate;
        return total + earnings;
      } else if (service.fixed_price && service.fixed_price > 0) {
        // Fixed price calculation (percentage-based)
        const budgetHours = service.budget_hours || 1; // Avoid division by zero
        const percentageComplete = Math.min(hoursWorked / budgetHours, 1); // Cap at 100%
        const earnings = percentageComplete * service.fixed_price;
        return total + earnings;
      }

      return total;
    }, 0);
  }, [timeEntries, selectedEmployeeId, services]);



  /** Format hours to HH:MM format */
  const formatHoursToDisplay = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  /** Format money to Euro display */
  const formatMoneyToDisplay = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  /** Filter available hours based on search */
  const filteredAvailableHours = useMemo(() => {
    if (!availableHoursSearch.trim()) {
      return availableHours;
    }
    const searchTerm = availableHoursSearch.toLowerCase();
    return availableHours.filter(ah => 
      ah.company_name.toLowerCase().includes(searchTerm) ||
      ah.project_name.toLowerCase().includes(searchTerm)
    );
  }, [availableHours, availableHoursSearch]);

  /** Calculate daily totals for bottom bar */
  const dailyTotals = useMemo(() => {
    return daysOfWeek.map(day => {
      const dayEntries = timeEntries.filter(entry => entry.date === toISODate(day));
      const totalHours = dayEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
      return {
        date: day,
        totalHours,
        formattedHours: formatHoursToHM(totalHours)
      };
    });
  }, [timeEntries, daysOfWeek]);

  /** Select helpers */
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedProjectId('');
    setSelectedServiceId('none');
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedServiceId('none');
    
    if (projectId) {
      try {
        const response = await brain.get_project_services_summary({ projectId: parseInt(projectId) });
        const data = await response.json();
        setServices(data.services || []);
      } catch (error) {
        console.error('Error loading services:', error);
        setServices([]);
      }
    } else {
      setServices([]);
    }
  };

  const getProjectsForCompany = (companyId: string) =>
    !companyId
      ? []
      : availableHours
          .filter((ah) => ah.company_id.toString() === companyId)
          .map((ah) => ({ 
            id: ah.project_id, 
            project_name: ah.project_name, 
            remaining_hours: ah.remaining_hours,
            unlimited_hours: ah.unlimited_hours 
          }));
  const getRemainingHours = (companyId: string, projectId: string) => {
    const found = availableHours.find(
      (ah) => ah.company_id.toString() === companyId && ah.project_id.toString() === projectId,
    );
    return found ? found.remaining_hours : 0;
  };

  /** Open dialogs */
  const openEntryDialog = (date: Date, defaultStart?: string, defaultEnd?: string) => {
    setSelectedDate(date);
    setSelectedCompanyId('');
    setSelectedProjectId('');
    setSelectedServiceId('none');
    setStartTime(defaultStart || '');
    setEndTime(defaultEnd || '');
    setComment(''); // Reset comment field
    setIsEntryDialogOpen(true);
  };
  const openEditDialog = async (entry: TimeEntryResponse) => {
    setEditingEntry(entry);
    setEditStart(entry.start_time ? entry.start_time.slice(0, 5) : '');
    setEditEnd(entry.end_time ? entry.end_time.slice(0, 5) : '');
    setEditServiceId(entry.service_id ? entry.service_id.toString() : 'none');
    setEditComment(entry.comment || ''); // Set comment field
    
    // Load services for this project
    try {
      const response = await brain.get_project_services_summary({ projectId: entry.project_id });
      const data = await response.json();
      setEditServices(data.services || []);
    } catch (error) {
      console.error('Error loading services for edit:', error);
      setEditServices([]);
    }
    
    setIsEditDialogOpen(true);
  };

  /** Create */
  const handleSubmitEntry = async () => {
    if (!selectedDate || !selectedCompanyId || !selectedProjectId) return toast.error('Please fill in all fields');
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    if (s == null || e == null || e <= s) return toast.error('Select a valid start and end time');
    const hours = minutesToHours(e - s);
    const project = availableHours.find(ah => 
      ah.company_id.toString() === selectedCompanyId && 
      ah.project_id.toString() === selectedProjectId
    );
    
    // Skip validation for unlimited hour projects
    if (!project?.unlimited_hours) {
      const remaining = getRemainingHours(selectedCompanyId, selectedProjectId);
      if (hours > remaining) return toast.error(`Cannot log ${hours} hours. Only ${remaining}h remaining.`);
    }
    try {
      setIsLoading(true);
      const payload: TimeEntryCreateRequest & { start_time?: string; end_time?: string } = {
        company_id: parseInt(selectedCompanyId),
        project_id: parseInt(selectedProjectId),
        service_id: selectedServiceId === 'none' ? null : parseInt(selectedServiceId),
        date: toISODate(selectedDate) as any,
        hours_worked: hours as any,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        comment: comment || null,
      } as any;
      await brain.create_time_entry(payload);
      toast.success('Time entry created');
      setIsEntryDialogOpen(false);
      const res = await brain.list_time_entries({ start_date: toISODate(weekStart), end_date: toISODate(weekEnd) });
      const data = await res.json();
      setTimeEntries(data.time_entries || []);
      const days: CalendarDay[] = daysOfWeek.map((d) => {
        const iso = toISODate(d);
        const entries = (data.time_entries || [])
          .filter((e: TimeEntryResponse) => e.date === iso)
          .sort((a: TimeEntryResponse, b: TimeEntryResponse) =>
            (a.start_time || '99:99:99').localeCompare(b.start_time || '99:99:99'),
          );
        const total = entries.reduce((s: number, e: TimeEntryResponse) => s + (e.hours_worked || 0), 0);
        return { date: d, timeEntries: entries, totalHours: total };
      });
      setCalendarDays(days);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.detail || 'Failed to create time entry');
    } finally {
      setIsLoading(false);
    }
  };

  /** Update/Delete */
  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    const s = timeToMinutes(editStart);
    const e = timeToMinutes(editEnd);
    if (s == null || e == null || e <= s) return toast.error('Select a valid start and end time');
    const hours = minutesToHours(e - s);
    try {
      setIsLoading(true);
      const updatePayload = { 
        hours_worked: hours, 
        start_time: `${editStart}:00`, 
        end_time: `${editEnd}:00`,
        service_id: editServiceId === 'none' ? null : parseInt(editServiceId),
        comment: editComment || null, // Include comment in update
      };
      await brain.update_time_entry(
        { entryId: editingEntry.id }, 
        updatePayload
      );
      toast.success('Time entry updated');
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      const res = await brain.list_time_entries({ start_date: toISODate(weekStart), end_date: toISODate(weekEnd) });
      const data = await res.json();
      setTimeEntries(data.time_entries || []);
      const days: CalendarDay[] = daysOfWeek.map((d) => {
        const iso = toISODate(d);
        const entries = (data.time_entries || [])
          .filter((e: TimeEntryResponse) => e.date === iso)
          .sort((a: TimeEntryResponse, b: TimeEntryResponse) =>
            (a.start_time || '99:99:99').localeCompare(b.start_time || '99:99:99'),
          );
        const total = entries.reduce((s: number, e: TimeEntryResponse) => s + (e.hours_worked || 0), 0);
        return { date: d, timeEntries: entries, totalHours: total };
      });
      setCalendarDays(days);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.detail || 'Failed to update time entry');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteEntry = async () => {
    if (!editingEntry) return;
    try {
      setIsLoading(true);
      await brain.delete_time_entry({ entryId: editingEntry.id });
      toast.success('Time entry deleted');
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      const res = await brain.list_time_entries({ start_date: toISODate(weekStart), end_date: toISODate(weekEnd) });
      const data = await res.json();
      setTimeEntries(data.time_entries || []);
      const days: CalendarDay[] = daysOfWeek.map((d) => {
        const iso = toISODate(d);
        const entries = (data.time_entries || [])
          .filter((e: TimeEntryResponse) => e.date === iso)
          .sort((a: TimeEntryResponse, b: TimeEntryResponse) =>
            (a.start_time || '99:99:99').localeCompare(b.start_time || '99:99:99'),
          );
        const total = entries.reduce((s: number, e: TimeEntryResponse) => s + (e.hours_worked || 0), 0);
        return { date: d, timeEntries: entries, totalHours: total };
      });
      setCalendarDays(days);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.detail || 'Failed to delete time entry');
    } finally {
      setIsLoading(false);
    }
  };

  /** Double-click: snel toevoegen op aangeklikte tijd */
  const handleDayDoubleClick = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top; // px in kolom
    const minutesWithinWindow = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round((y / PX_PER_HOUR) * 60)));
    const startMins = START_HOUR * 60 + Math.floor(minutesWithinWindow / 15) * 15;
    const endMins = Math.min(24 * 60, startMins + 60);
    openEntryDialog(date, minutesToHHMM(startMins), minutesToHHMM(endMins));
  };

  /** Right-click context menu */
  const handleTimeEntryRightClick = (e: React.MouseEvent, entry: TimeEntryResponse) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      entry: entry,
    });
  };

  const handleContextMenuDelete = async () => {
    if (!contextMenu.entry) return;
    
    try {
      setIsLoading(true);
      await brain.delete_time_entry({ entryId: contextMenu.entry.id });
      toast.success('Time entry deleted');
      
      // Refresh the data
      const res = await brain.list_time_entries({ start_date: toISODate(weekStart), end_date: toISODate(weekEnd) });
      const data = await res.json();
      setTimeEntries(data.time_entries || []);
      const days: CalendarDay[] = daysOfWeek.map((d) => {
        const iso = toISODate(d);
        const entries = (data.time_entries || [])
          .filter((e: TimeEntryResponse) => e.date === iso)
          .sort((a: TimeEntryResponse, b: TimeEntryResponse) =>
            (a.start_time || '99:99:99').localeCompare(b.start_time || '99:99:99'),
          );
        const total = entries.reduce((s: number, e: TimeEntryResponse) => s + (e.hours_worked || 0), 0);
        return { date: d, timeEntries: entries, totalHours: total };
      });
      setCalendarDays(days);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.detail || 'Failed to delete time entry');
    } finally {
      setIsLoading(false);
      setContextMenu({ show: false, x: 0, y: 0, entry: null });
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, entry: null });
  };

  /** Drag functionality for creating time entries */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: Date; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; y: number } | null>(null);
  
  /** Resize functionality for time entries */
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEntry, setResizeEntry] = useState<TimeEntryResponse | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'top' | 'bottom' | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartTime, setResizeStartTime] = useState<{ start: string; end: string } | null>(null);
  const [isResizeEnding, setIsResizeEnding] = useState(false);

  const handleMouseDown = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left mouse button
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragStart({ date, y });
    setIsDragging(true);
  };

  const handleMouseMove = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragEnd({ date, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Calculate time range from drag
    const startY = Math.min(dragStart.y, dragEnd.y);
    const endY = Math.max(dragStart.y, dragEnd.y);
    
    const startMinutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round((startY / PX_PER_HOUR) * 60)));
    const endMinutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round((endY / PX_PER_HOUR) * 60)));
    
    const startMins = START_HOUR * 60 + Math.floor(startMinutes / 15) * 15;
    const endMins = START_HOUR * 60 + Math.ceil(endMinutes / 15) * 15;
    
    // Ensure minimum 15-minute duration
    const duration = endMins - startMins;
    if (duration >= 15) {
      openEntryDialog(dragStart.date, minutesToHHMM(startMins), minutesToHHMM(endMins));
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  /** Resize handlers for time entries */
  const handleResizeStart = (entry: TimeEntryResponse, handle: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only left mouse button
    
    // Find the day container (parent of the time entry)
    const dayContainer = e.currentTarget.closest('[class*="border-r"]') as HTMLElement;
    if (!dayContainer) return;
    
    const dayRect = dayContainer.getBoundingClientRect();
    const y = e.clientY - dayRect.top;
    
    setIsResizing(true);
    setResizeEntry(entry);
    setResizeHandle(handle);
    setResizeStartY(y);
    setResizeStartTime({
      start: entry.start_time || '00:00',
      end: entry.end_time || '00:00'
    });
    
    // Add global mouse event listeners for tracking anywhere on screen
    document.addEventListener('mousemove', handleGlobalResizeMove);
    document.addEventListener('mouseup', handleGlobalResizeUp);
    

  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizeEntry || !resizeHandle || !resizeStartTime) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Find the day container (parent of the time entry)
    const dayContainer = e.currentTarget.closest('[class*="border-r"]') as HTMLElement;
    if (!dayContainer) return;
    
    const dayRect = dayContainer.getBoundingClientRect();
    const currentY = e.clientY - dayRect.top;
    const deltaY = currentY - resizeStartY;
    

    
    // Calculate time change based on pixel movement - no snapping during drag
    const timeChangeMinutes = Math.round((deltaY / PX_PER_HOUR) * 60);
    
    // Use raw time change for smooth dragging
    const finalTimeChange = timeChangeMinutes;
    
    // Calculate new start and end times
    const startMinutes = timeToMinutes(resizeStartTime.start) || 0;
    const endMinutes = timeToMinutes(resizeStartTime.end) || 0;
    
    let newStartMinutes = startMinutes;
    let newEndMinutes = endMinutes;
    
    if (resizeHandle === 'top') {
      newStartMinutes = Math.max(START_HOUR * 60, startMinutes + finalTimeChange);
      // Ensure minimum 15-minute duration
      if (newStartMinutes >= endMinutes - 15) {
        newStartMinutes = endMinutes - 15;
      }
    } else {
      // For bottom handle, allow extending the end time
      newEndMinutes = Math.min(END_HOUR * 60, endMinutes + finalTimeChange);
      // Ensure minimum 15-minute duration
      if (newEndMinutes <= startMinutes + 15) {
        newEndMinutes = startMinutes + 15;
      }
    }
    
    // Only update if there's actually a change
    if (newStartMinutes !== startMinutes || newEndMinutes !== endMinutes) {
      // Update the entry in real-time
      const updatedEntry = {
        ...resizeEntry,
        start_time: minutesToHHMM(newStartMinutes),
        end_time: minutesToHHMM(newEndMinutes),
        hours_worked: (newEndMinutes - newStartMinutes) / 60
      };
      

      
      // Update the time entries array
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === resizeEntry.id ? updatedEntry : entry
        )
      );
      
      // Update calendar days
      setCalendarDays(prev => 
        prev.map(day => ({
          ...day,
          timeEntries: day.timeEntries.map(entry => 
            entry.id === resizeEntry.id ? updatedEntry : entry
          )
        }))
      );
    }
  };





  const handleResizeEnd = async () => {
    console.log('handleResizeEnd called:', { isResizing, resizeEntry: !!resizeEntry, isResizeEnding });
    
    // Prevent multiple calls
    if (isResizeEnding) {
      console.log('Already ending resize - ignoring call');
      return;
    }
    
    if (!isResizing || !resizeEntry) {
      console.log('Early return - not resizing or no entry');
      setIsResizing(false);
      setResizeEntry(null);
      setResizeHandle(null);
      setResizeStartY(0);
      setResizeStartTime(null);
      setIsResizeEnding(false);
      return;
    }
    
    setIsResizeEnding(true);
    
    try {
      // Find the updated entry
      const updatedEntry = timeEntries.find(entry => entry.id === resizeEntry.id);
      if (!updatedEntry) return;
      
      // Snap to nearest 15-minute interval
      const startMinutes = timeToMinutes(updatedEntry.start_time || '00:00') || 0;
      const endMinutes = timeToMinutes(updatedEntry.end_time || '00:00') || 0;
      
      // Snap start time to nearest 15-minute interval
      const snappedStartMinutes = Math.round(startMinutes / 15) * 15;
      // Snap end time to nearest 15-minute interval
      const snappedEndMinutes = Math.round(endMinutes / 15) * 15;
      
      // Ensure minimum 15-minute duration
      const finalStartMinutes = Math.max(START_HOUR * 60, snappedStartMinutes);
      const finalEndMinutes = Math.max(finalStartMinutes + 15, Math.min(END_HOUR * 60, snappedEndMinutes));
      
      const snappedEntry = {
        ...updatedEntry,
        start_time: minutesToHHMM(finalStartMinutes),
        end_time: minutesToHHMM(finalEndMinutes),
        hours_worked: (finalEndMinutes - finalStartMinutes) / 60
      };
      
      console.log('Resize end - snapping:', {
        original: { start: updatedEntry.start_time, end: updatedEntry.end_time },
        snapped: { start: snappedEntry.start_time, end: snappedEntry.end_time },
        finalStartMinutes,
        finalEndMinutes
      });
      

      
      // Update the time entries array with snapped values
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === resizeEntry.id ? snappedEntry : entry
        )
      );
      
      // Update calendar days with snapped values
      setCalendarDays(prev => 
        prev.map(day => ({
          ...day,
          timeEntries: day.timeEntries.map(entry => 
            entry.id === resizeEntry.id ? snappedEntry : entry
          )
        }))
      );
      
      // Update on server with snapped values
      await brain.update_time_entry(
        { entryId: resizeEntry.id },
        {
          start_time: snappedEntry.start_time,
          end_time: snappedEntry.end_time,
          hours_worked: snappedEntry.hours_worked
        }
      );
      
      toast.success('Time entry updated');
    } catch (error) {
      console.error('Failed to update time entry:', error);
      toast.error('Failed to update time entry');
      
      // Revert changes on error
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === resizeEntry.id ? resizeEntry : entry
        )
      );
      
      setCalendarDays(prev => 
        prev.map(day => ({
          ...day,
          timeEntries: day.timeEntries.map(entry => 
            entry.id === resizeEntry.id ? resizeEntry : entry
          )
        }))
      );
    } finally {
      setIsResizing(false);
      setResizeEntry(null);
      setResizeHandle(null);
      setResizeStartY(0);
      setResizeStartTime(null);
      setIsResizeEnding(false);
    }
  };

  /** Global mouse handlers for resize operations */
  const handleGlobalResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeEntry || !resizeHandle || !resizeStartTime) return;
    
    e.preventDefault();
    
    // Find the day container for the resize entry
    const dayContainer = document.querySelector(`[data-date="${resizeEntry.date}"]`) as HTMLElement;
    if (!dayContainer) return;
    
    const dayRect = dayContainer.getBoundingClientRect();
    const currentY = e.clientY - dayRect.top;
    const deltaY = currentY - resizeStartY;
    
    // Calculate time change based on pixel movement - no snapping during drag
    const timeChangeMinutes = Math.round((deltaY / PX_PER_HOUR) * 60);
    
    // Use raw time change for smooth dragging
    const finalTimeChange = timeChangeMinutes;
    
    // Calculate new start and end times
    const startMinutes = timeToMinutes(resizeStartTime.start) || 0;
    const endMinutes = timeToMinutes(resizeStartTime.end) || 0;
    
    let newStartMinutes = startMinutes;
    let newEndMinutes = endMinutes;
    
    if (resizeHandle === 'top') {
      newStartMinutes = Math.max(START_HOUR * 60, startMinutes + finalTimeChange);
      // Ensure minimum 15-minute duration
      if (newStartMinutes >= endMinutes - 15) {
        newStartMinutes = endMinutes - 15;
      }
    } else {
      // For bottom handle, allow extending the end time
      newEndMinutes = Math.min(END_HOUR * 60, endMinutes + finalTimeChange);
      // Ensure minimum 15-minute duration
      if (newEndMinutes <= startMinutes + 15) {
        newEndMinutes = startMinutes + 15;
      }
    }
    
    // Only update if there's actually a change
    if (newStartMinutes !== startMinutes || newEndMinutes !== endMinutes) {
      // Update the entry in real-time
      const updatedEntry = {
        ...resizeEntry,
        start_time: minutesToHHMM(newStartMinutes),
        end_time: minutesToHHMM(newEndMinutes),
        hours_worked: (newEndMinutes - newStartMinutes) / 60
      };
      
      // Update the time entries array
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === resizeEntry.id ? updatedEntry : entry
        )
      );
      
      // Update calendar days
      setCalendarDays(prev => 
        prev.map(day => ({
          ...day,
          timeEntries: day.timeEntries.map(entry => 
            entry.id === resizeEntry.id ? updatedEntry : entry
          )
        }))
      );
    }
  };

  const handleGlobalResizeUp = async () => {
    // Remove global event listeners
    document.removeEventListener('mousemove', handleGlobalResizeMove);
    document.removeEventListener('mouseup', handleGlobalResizeUp);
    
    // Check if we're actually resizing
    if (!isResizing || !resizeEntry || isResizeEnding) return;
    
    setIsResizeEnding(true);
    
    try {
      // Find the updated entry
      const updatedEntry = timeEntries.find(entry => entry.id === resizeEntry.id);
      if (!updatedEntry) return;
      
      // Snap to nearest 15-minute interval
      const startMinutes = timeToMinutes(updatedEntry.start_time || '00:00') || 0;
      const endMinutes = timeToMinutes(updatedEntry.end_time || '00:00') || 0;
      
      // Snap start time to nearest 15-minute interval
      const snappedStartMinutes = Math.round(startMinutes / 15) * 15;
      // Snap end time to nearest 15-minute interval
      const snappedEndMinutes = Math.round(endMinutes / 15) * 15;
      
      // Ensure minimum 15-minute duration
      const finalStartMinutes = Math.max(START_HOUR * 60, snappedStartMinutes);
      const finalEndMinutes = Math.max(finalStartMinutes + 15, Math.min(END_HOUR * 60, snappedEndMinutes));
      
      const snappedEntry = {
        ...updatedEntry,
        start_time: minutesToHHMM(finalStartMinutes),
        end_time: minutesToHHMM(finalEndMinutes),
        hours_worked: (finalEndMinutes - finalStartMinutes) / 60
      };
      
      // Update the time entries array with snapped values
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === resizeEntry.id ? snappedEntry : entry
        )
      );
      
      // Update calendar days with snapped values
      setCalendarDays(prev => 
        prev.map(day => ({
          ...day,
          timeEntries: day.timeEntries.map(entry => 
            entry.id === resizeEntry.id ? snappedEntry : entry
          )
        }))
      );
      
      // Update on server with snapped values
      await brain.update_time_entry(
        { entryId: resizeEntry.id },
        {
          start_time: snappedEntry.start_time,
          end_time: snappedEntry.end_time,
          hours_worked: snappedEntry.hours_worked
        }
      );
      
      toast.success('Time entry updated');
    } catch (error) {
      console.error('Failed to update time entry:', error);
      toast.error('Failed to update time entry');
      
      // Revert changes on error
      setTimeEntries(prev => 
        prev.map(entry => 
          entry.id === resizeEntry.id ? resizeEntry : entry
        )
      );
      
      setCalendarDays(prev => 
        prev.map(day => ({
          ...day,
          timeEntries: day.timeEntries.map(entry => 
            entry.id === resizeEntry.id ? resizeEntry : entry
          )
        }))
      );
    } finally {
      setIsResizing(false);
      setResizeEntry(null);
      setResizeHandle(null);
      setResizeStartY(0);
      setResizeStartTime(null);
      setIsResizeEnding(false);
    }
  };

  /** Blokpositie + clamping voor venster 07–19 */
  const calcBlock = (e: TimeEntryResponse) => {
    const rangeStart = START_HOUR * 60;
    const rangeEnd = END_HOUR * 60;

    const sMin = timeToMinutes(e.start_time || '00:00') ?? 0;
    const endMin = e.end_time ? timeToMinutes(e.end_time)! : sMin + Math.round((e.hours_worked || 1) * 60);

    const visibleStart = Math.max(rangeStart, sMin);
    const visibleEnd = Math.min(rangeEnd, endMin);
    const visibleDur = Math.max(0, visibleEnd - visibleStart);

    // Add vertical padding between time entries (2px top and bottom)
    const VERTICAL_PADDING = 2;
    const top = ((visibleStart - rangeStart) / 60) * PX_PER_HOUR + VERTICAL_PADDING;
    const height = Math.max(22, (visibleDur / 60) * PX_PER_HOUR - (VERTICAL_PADDING * 2));
    const topCut = sMin < rangeStart;
    const bottomCut = endMin > rangeEnd;
    return { top, height, topCut, bottomCut };
  };

  /** Labels */
  const weekLabel = `${weekStart.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  if (isLoading && calendarDays.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
          <p className="mt-4 text-gray-600">Week laden…</p>
        </div>
      </div>
    );
  }

  /** Now-indicator helpers */
  const nowIso = toISODate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * PX_PER_HOUR;

  return (
    <div className="container mx-auto max-w-[100vw] px-4">

      {/* Mobile Layout: Stacked vertically on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side: Time tracking grid - Full width on mobile, 80% on desktop */}
        <div className="flex-1 lg:w-4/5">
          {/* Title above calendar */}
          <div className="mb-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Urenregistratie</h1>
            <p className="text-sm lg:text-base text-gray-600 mt-1">Weekoverzicht (7 dagen) – venster 07:00–19:00</p>
          </div>
          
          {/* Week grid with hour gutter */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Day headers */}
              <div className="grid" style={{ gridTemplateColumns: GRID_COLS }}>
                <div className="border-b bg-gray-50" />
                {daysOfWeek.map((d) => {
                  const iso = toISODate(d);
                  const calDay = calendarDays.find((x) => toISODate(x.date) === iso);
                  const total = calDay?.totalHours || 0;
                  const isToday = iso === toISODate(new Date());
                  return (
                    <div key={iso} className={`p-2 border-b border-r bg-gray-50 text-center flex items-center justify-center ${isToday ? 'bg-orange-50' : ''}`}>
                      <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${
                        isToday 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        <span className="text-xs mr-1">{d.toLocaleDateString('nl-NL', { weekday: 'short' })}</span>
                        <span className="text-sm font-semibold">{d.getDate()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time rows (06–22) - Scrollable container */}
              <div className="overflow-auto" style={{ height: '60vh', maxHeight: '600px' }}>
                <div className="relative" style={{ height: DAY_HEIGHT, minWidth: '100%' }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: GRID_COLS }}>
                    {/* Hour gutter (06–22) */}
                    <div className="border-r bg-white select-none sticky left-0 z-10">
                      {HOURS.map((h) => (
                        <div key={h} className="relative" style={{ height: PX_PER_HOUR }}>
                          <div className="absolute inset-x-0 top-0 border-b border-gray-200" />
                          <div className="absolute right-2 top-[-8px] text-xs text-gray-500">{`${String(h).padStart(2, '0')}:00`}</div>
                          {/* 15-minute line */}
                          <div className="absolute inset-x-0" style={{ top: PX_PER_HOUR / 4 }}>
                            <div className="border-b border-dashed border-gray-300" />
                          </div>
                          {/* 30-minute line */}
                          <div className="absolute inset-x-0" style={{ top: PX_PER_HOUR / 2 }}>
                            <div className="border-b border-dashed border-gray-300" />
                            <div className="absolute right-2 top-[-8px] text-xs text-gray-500">{`${String(h).padStart(2, '0')}:30`}</div>
                          </div>
                          {/* 45-minute line */}
                          <div className="absolute inset-x-0" style={{ top: (PX_PER_HOUR * 3) / 4 }}>
                            <div className="border-b border-dashed border-gray-300" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 7 day columns with background zones */}
                    {calendarDays.map((day) => {
                      const iso = toISODate(day.date);
                      const showNow = iso === nowIso && nowTop >= 0 && nowTop <= DAY_HEIGHT;
                      return (
                        <div
                          key={iso}
                          data-date={iso}
                          className={`border-r relative hover:bg-gray-50/50 cursor-crosshair ${
                            isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
                          }`}
                          onDoubleClick={(e) => handleDayDoubleClick(day.date, e)}
                          onMouseDown={(e) => handleMouseDown(day.date, e)}
                          onMouseMove={(e) => handleMouseMove(day.date, e)}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                          title="Double-click om snel uren toe te voegen of sleep om tijd te selecteren"
                        >
                          {/* Background time zones */}
                          {TIME_ZONES.map((zone, zoneIndex) => {
                            const zoneStart = (zone.start - START_HOUR) * PX_PER_HOUR;
                            const zoneEnd = (zone.end - START_HOUR) * PX_PER_HOUR;
                            const zoneHeight = zoneEnd - zoneStart;
                            
                            return (
                              <div
                                key={zoneIndex}
                                className={`absolute left-0 right-0 ${zone.color}`}
                                style={{
                                  top: zoneStart,
                                  height: zoneHeight,
                                  zIndex: 0
                                }}
                              />
                            );
                          })}

                          {/* Drag selection area */}
                          {isDragging && dragStart && dragEnd && dragStart.date.getTime() === day.date.getTime() && (
                            <>
                              <div
                                className="absolute left-0 right-0 bg-blue-200 bg-opacity-50 border border-blue-400 pointer-events-none"
                                style={{
                                  top: Math.min(dragStart.y, dragEnd.y),
                                  height: Math.abs(dragEnd.y - dragStart.y),
                                  zIndex: 15
                                }}
                              />
                              {/* Time range indicator */}
                              <div
                                className="absolute left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded pointer-events-none z-20"
                                style={{
                                  top: Math.min(dragStart.y, dragEnd.y) - 20,
                                }}
                              >
                                {(() => {
                                  const startY = Math.min(dragStart.y, dragEnd.y);
                                  const endY = Math.max(dragStart.y, dragEnd.y);
                                  const startMinutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round((startY / PX_PER_HOUR) * 60)));
                                  const endMinutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, Math.round((endY / PX_PER_HOUR) * 60)));
                                  const startMins = START_HOUR * 60 + Math.floor(startMinutes / 15) * 15;
                                  const endMins = START_HOUR * 60 + Math.ceil(endMinutes / 15) * 15;
                                  return `${minutesToHHMM(startMins)} - ${minutesToHHMM(endMins)}`;
                                })()}
                              </div>
                            </>
                          )}

                          {/* hour grid lines */}
                          {HOURS.map((h) => (
                            <div key={h} className="relative" style={{ height: PX_PER_HOUR }}>
                              <div className="absolute inset-x-0 top-0 border-b border-gray-200" />
                              {/* 15-minute line */}
                              <div className="absolute inset-x-0" style={{ top: PX_PER_HOUR / 4 }}>
                                <div className="border-b border-dashed border-gray-300" />
                              </div>
                              {/* 30-minute line */}
                              <div className="absolute inset-x-0" style={{ top: PX_PER_HOUR / 2 }}>
                                <div className="border-b border-dashed border-gray-300" />
                              </div>
                              {/* 45-minute line */}
                              <div className="absolute inset-x-0" style={{ top: (PX_PER_HOUR * 3) / 4 }}>
                                <div className="border-b border-dashed border-gray-300" />
                              </div>
                            </div>
                          ))}

                          {/* NOW indicator */}
                          {showNow && (
                            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
                              <div className="relative">
                                <div className="h-0.5 bg-red-500" />
                                <div className="absolute -left-1 -top-1 w-3 h-3 rounded-full bg-red-500" />
                              </div>
                            </div>
                          )}

                          {/* entries as positioned blocks (clamped) */}
                          {day.timeEntries.map((e) => {
                            const { top, height, topCut, bottomCut } = calcBlock(e);
                            // Als het blok volledig buiten het venster valt, sla render over
                            if (height <= 22 && (top < -1 || top > DAY_HEIGHT + 1)) return null;
                            return (
                              <div
                                key={e.id}
                                className="absolute left-1 right-1 rounded-md shadow-sm border p-1.5 hover:opacity-80 z-10"
                                style={{ 
                                  top, 
                                  height,
                                  backgroundColor: e.service_color ? `${e.service_color}40` : '#fef3c7',
                                  borderColor: e.service_color || '#f59e0b',
                                  color: e.service_color ? '#1f2937' : '#92400e'
                                }}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  // Don't open edit dialog if we're resizing
                                  if (!isResizing) {
                                    openEditDialog(e);
                                  }
                                }}
                                                                onContextMenu={(ev) => handleTimeEntryRightClick(ev, e)}

                              >
                                {/* Resize handles */}
                                <div 
                                  className="absolute inset-x-0 top-0 h-2 cursor-ns-resize hover:bg-black hover:bg-opacity-10 rounded-t-md"
                                  onMouseDown={(ev) => handleResizeStart(e, 'top', ev)}
                                  title="Drag to resize start time"
                                />
                                <div 
                                  className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize hover:bg-black hover:bg-opacity-10 rounded-b-md"
                                  onMouseDown={(ev) => handleResizeStart(e, 'bottom', ev)}
                                  title="Drag to resize end time"
                                />
                                {/* clamp markers */}
                                {topCut && <div className="absolute inset-x-0 -top-0.5 h-0.5 bg-orange-300" />}
                                {bottomCut && <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-orange-300" />}

                                {infoDensity === 'minimal' && (
                                  <div className="text-[11px] font-medium truncate">
                                    {e.project_name} ({formatHoursToHM(e.hours_worked || 0)})
                                  </div>
                                )}
                                
                                {infoDensity === 'standard' && (
                                  <>
                                    <div className="flex items-center justify-between text-[11px] font-medium">
                                      <span className="truncate mr-2">{e.company_name}</span>
                                      <span>{formatHoursToHM(e.hours_worked || 0)}</span>
                                    </div>
                                    <div className="text-[11px] truncate">{e.project_name}</div>
                                    {e.service_name && (
                                      <div className="text-[10px] text-gray-600 truncate">{e.service_name}</div>
                                    )}
                                    <div className="text-[10px] text-gray-700 mt-0.5">
                                      {e.start_time ? e.start_time.slice(0, 5) : ''}{e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}
                                    </div>
                                  </>
                                )}
                                
                                {infoDensity === 'detailed' && (
                                  <>
                                    <div className="flex items-center justify-between text-[11px] font-medium">
                                      <span className="truncate mr-2">{e.company_name}</span>
                                      <span>{formatHoursToHM(e.hours_worked || 0)}</span>
                                    </div>
                                    <div className="text-[11px] truncate">{e.project_name}</div>
                                    {e.service_name && (
                                      <div className="text-[10px] text-gray-600 truncate">{e.service_name}</div>
                                    )}
                                    {e.comment && (
                                      <div className="text-[10px] text-blue-600 truncate italic">"{e.comment}"</div>
                                    )}
                                    <div className="text-[10px] text-gray-700 mt-0.5">
                                      {e.start_time ? e.start_time.slice(0, 5) : ''}{e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Daily totals bar */}
              <div className="grid" style={{ gridTemplateColumns: GRID_COLS }}>
                <div className="border-t bg-gray-50" />
                {dailyTotals.map((dayTotal) => (
                  <div key={toISODate(dayTotal.date)} className="border-t border-r bg-gray-50 p-2 text-center">
                    <div className="text-sm font-medium text-red-600">
                      {dayTotal.formattedHours}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Controls and info - Full width on mobile, 20% on desktop */}
        <div className="w-full lg:w-1/5 flex-shrink-0 flex flex-col">
          {/* Mobile: Calendar at top */}
          <div className="lg:hidden mb-4">
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Kalender</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowCalendar(!showCalendar)}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {showCalendar ? 'Verberg' : 'Toon'}
                  </Button>
                </div>
                {showCalendar && (
                  <Calendar
                    mode="single"
                    selected={weekStart}
                    onSelect={(date) => date && handleDateSelect(date)}
                    className="rounded-md border-0"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2 hover:bg-gray-100 rounded-md transition-colors",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-transparent",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Week Selector */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 lg:gap-4">
              <Button variant="outline" onClick={() => setAnchorDate(addDays(anchorDate, -7))} className="p-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-base lg:text-lg font-semibold">{getMonthYearLabel(anchorDate)}</h2>
                <Badge variant="secondary" className="mt-1">
                  {getWeekLabelFormatted(anchorDate)}
                </Badge>
              </div>
              <Button variant="outline" onClick={() => setAnchorDate(addDays(anchorDate, 7))} className="p-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="p-2" onClick={cycleInfoDensity} title={`Info: ${infoDensity}`}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek} className="text-xs lg:text-sm">
                Huidige week
              </Button>
              <Button variant="outline" size="sm" className="p-2 lg:hidden" onClick={() => setShowCalendar(!showCalendar)}>
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Calendar Card - Hidden on mobile */}
          {showCalendar && (
            <Card className="mb-4 flex-shrink-0 hidden lg:block">
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={weekStart}
                  onSelect={(date) => date && handleDateSelect(date)}
                  className="rounded-md border-0"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2 hover:bg-gray-100 rounded-md transition-colors",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-transparent",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Weekend visibility toggle */}
          <Card className="mb-4 flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Weekend weergeven</h3>
                  <p className="text-xs text-gray-500">Voeg zaterdag en zondag toe aan het weekoverzicht</p>
                </div>
                <Switch
                  checked={showWeekends}
                  onCheckedChange={setShowWeekends}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employee Card with Dropdown */}
          <Card className="mb-4 flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {selectedEmployeeId === 'own' 
                      ? getInitials(user?.displayName || 'Mijn')
                      : getInitials(employees.find(e => e.id.toString() === selectedEmployeeId)?.name || '')
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {selectedEmployeeId === 'own' 
                        ? 'Mijn eigen uren'
                        : employees.find(e => e.id.toString() === selectedEmployeeId)?.name || ''
                      }
                    </h3>
                    <p className="text-xs text-gray-600">{formatHoursToDisplay(calculateTotalHours)} / 40u {formatMoneyToDisplay(calculateTotalEarnings)}</p>
                  </div>
                </div>
                <Select value={selectedEmployeeId} onValueChange={(value) => {
                  setSelectedEmployeeId(value);
                  localStorage.setItem('selectedEmployeeId', value);
                }}>
                  <SelectTrigger className="w-auto border-0 p-1 h-auto">
                    
                  </SelectTrigger>
                  
                  <SelectContent>
                    <SelectItem value="own">Mijn eigen uren</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min((calculateTotalHours / 40) * 100, 100)}%` }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Hours - Mobile: Collapsible at bottom, Desktop: Fixed height */}
          {availableHours.length > 0 && (
            <Card className="flex-1 flex flex-col lg:max-h-[517px]">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-base lg:text-lg">Beschikbare uren per project</CardTitle>
                <div className="mt-3">
                  <Input
                    type="text"
                    placeholder="Zoek op bedrijf of project..."
                    value={availableHoursSearch}
                    onChange={(e) => setAvailableHoursSearch(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto space-y-2 lg:space-y-3 pr-2">
                  {filteredAvailableHours.map((ah) => (
                    <div key={`${ah.company_id}-${ah.project_id}`} className="p-2 lg:p-3 border rounded-lg">
                      <h4 className="font-medium text-xs lg:text-sm">{ah.company_name}</h4>
                      <p className="text-xs lg:text-sm text-gray-600">{ah.project_name}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={ah.remaining_hours > 0 || ah.unlimited_hours ? 'default' : 'destructive'} className="text-xs">
                          {ah.unlimited_hours ? '∞' : formatHoursToHM(ah.remaining_hours)} over
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ({formatHoursToHM(ah.used_hours)} / {ah.unlimited_hours ? '∞' : formatHoursToHM(ah.available_hours)} gebruikt)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              Uren toevoegen
            </DialogTitle>
            {selectedDate && (
              <p className="text-sm text-gray-600">
                {selectedDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Company</Label>
              <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectChange} disabled={!selectedCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {getProjectsForCompany(selectedCompanyId).map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{p.project_name}</span>
                        <Badge variant="outline" className="ml-2">
                          {p.unlimited_hours ? '∞' : formatHoursToHM(p.remaining_hours)} over
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId} disabled={!selectedProjectId}>
                <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No service</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>Einde</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Comment</Label>
              <Textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment about this time entry..."
                rows={3}
              />
            </div>

            <p className="text-sm text-gray-600">Uren: <span className="font-medium">{computedHours}</span></p>
            
            {/* Budget Summary Section */}
            {selectedServiceId && selectedServiceId !== 'none' && (() => {
              const service = services.find(s => s.id.toString() === selectedServiceId);
              
              if (!service) return null;
              
              const key = `service-${service.id}`;
              const calculations = budgetCalculations[key] || { workedHours: 0, plannedHours: 0, isLoading: false };
              
              const budget = formatHoursToHM(service.budget_hours);
              const spent = formatHoursToHM(calculations.workedHours);
              const planned = formatHoursToHM(calculations.plannedHours);
              const totalUsed = calculations.workedHours + calculations.plannedHours;
              const remaining = formatHoursToHM(service.budget_hours - totalUsed);
              const isOverBudget = (service.budget_hours - totalUsed) < 0;
              
              return (
                <div className="bg-gray-50 rounded-lg p-4">
                  {calculations.isLoading ? (
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                      <span className="ml-2 text-sm text-gray-600">Budget laden...</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <div className="text-center">
                        <div className="text-gray-600 text-xs">Budget</div>
                        <div className="font-medium">{budget}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600 text-xs">Besteed</div>
                        <div className="font-medium">{spent}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600 text-xs">Gepland</div>
                        <div className="font-medium">{planned}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600 text-xs">Resterend</div>
                        <div className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                          {isOverBudget ? `-${formatHoursToHM(Math.abs(service.budget_hours - totalUsed))}` : remaining}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEntryDialogOpen(false)} className="flex-1">Annuleren</Button>
              <Button onClick={handleSubmitEntry} disabled={!selectedCompanyId || !selectedProjectId || !startTime || !endTime} className="flex-1 bg-orange-500 hover:bg-orange-600">
                Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Uren bewerken
            </DialogTitle>
            {editingEntry && (
              <p className="text-sm text-gray-600">
                {new Date(editingEntry.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </DialogHeader>

          {editingEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company</Label>
                  <Input value={editingEntry.company_name} disabled />
                </div>
                <div>
                  <Label>Project</Label>
                  <Input value={editingEntry.project_name} disabled />
                </div>
              </div>

              <div>
                <Label>Service</Label>
                <Select value={editServiceId} onValueChange={(value) => {
                  console.log('Edit service changed to:', value);
                  setEditServiceId(value);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a service (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No service</SelectItem>
                    {editServices.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Comment</Label>
                <Textarea 
                  value={editComment} 
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Add a comment about this time entry..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div>
                  <Label>Einde</Label>
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
              </div>
              <p className="text-sm text-gray-600">Uren: <span className="font-medium">{editHours}</span></p>

              {/* Budget Summary Section for Edit Dialog */}
              {editingEntry && editServiceId && editServiceId !== 'none' && (() => {
                const service = editServices.find(s => s.id.toString() === editServiceId);
                
                if (!service) return null;
                
                const key = `service-${service.id}`;
                const calculations = budgetCalculations[key] || { workedHours: 0, plannedHours: 0, isLoading: false };
                
                const budget = formatHoursToHM(service.budget_hours);
                const spent = formatHoursToHM(calculations.workedHours);
                const planned = formatHoursToHM(calculations.plannedHours);
                const totalUsed = calculations.workedHours + calculations.plannedHours;
                const remaining = formatHoursToHM(service.budget_hours - totalUsed);
                const isOverBudget = (service.budget_hours - totalUsed) < 0;
                
                return (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {calculations.isLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Budget laden...</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <div className="text-center">
                          <div className="text-gray-600 text-xs">Budget</div>
                          <div className="font-medium">{budget}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600 text-xs">Besteed</div>
                          <div className="font-medium">{spent}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600 text-xs">Gepland</div>
                          <div className="font-medium">{planned}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600 text-xs">Resterend</div>
                          <div className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                            {isOverBudget ? `-${formatHoursToHM(Math.abs(service.budget_hours - totalUsed))}` : remaining}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-4">
                <Button variant="destructive" onClick={handleDeleteEntry} className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" /> Verwijderen
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  Annuleren
                </Button>
                <Button onClick={handleUpdateEntry} disabled={!editStart || !editEnd} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  Opslaan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Context menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={handleContextMenuDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}


    </div>
  );
};

export default TimeTracking;
