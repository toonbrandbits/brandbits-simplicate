"use client";

import { Search, X } from "lucide-react";
import { useMemo } from "react";
import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useUserGuardContext } from "app/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Edit, Trash2, Building2, Users, MapPin, Phone, Globe, Mail, ArrowLeft, Tag,
  MessageSquareText, XCircle, ChevronUp, ChevronDown, Link as LinkIcon, UserCircle2
} from "lucide-react";
import brain from "brain";
import { CompanyResponse, CompanyCreateRequest, CompanyUpdateRequest } from "types";

const BRANCH_OPTIONS = [
  "(Particulier) onderwijs","Agrosector","Bouwnijverheid","Detailhandel, groothandel en ambachten",
  "Horeca, recreatie en catering","Industrie","Kunst, cultuur en media","Non-profit",
  "Zakelijke en persoonlijke dienstverlening","Zorg",
];

const RELATION_MANAGERS = ["Rik Mulder", "Stijn Cornel"];

const formatNLDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  } catch { return ""; }
};

const initials = (name?: string) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

const Companies = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // table selection + detail
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCompany, setDetailCompany] = useState<CompanyResponse | null>(null);
  const [generalOpen, setGeneralOpen] = useState(true); // “Algemeen” accordion

  // add/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyResponse | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // extended form data
  const [formData, setFormData] = useState({
    company_name: "",
    visit_address: "",
    // vrij veld (notities)
    contact_details_text: "",
    // gestructureerde velden
    phone: "",
    email: "",
    website: "",
    linkedin: "",
    team: "", // vrije tekst (bijv. namen of aantal)
    company_size: "",
    branch: "",
    relatie_beheerder: "",
  });

  //search 
  const [searchQuery, setSearchQuery] = useState("");
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter((c) => c.company_name?.toLowerCase().includes(q));
  }, [companies, searchQuery]);


  useEffect(() => { loadCompanies(); }, []);
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await brain.list_companies();
      const data = await response.json();
      setCompanies(data.companies);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load companies");
    } finally { setLoading(false); }
  };

  const openAddDialog = () => {
    setEditingCompany(null);
    setFormErrors({});
    setFormData({
      company_name: "",
      visit_address: "",
      contact_details_text: "",
      phone: "",
      email: "",
      website: "",
      linkedin: "",
      team: "",
      company_size: "",
      branch: "",
      relatie_beheerder: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (c: CompanyResponse) => {
    const cd: any = c.contact_details || {};
    setEditingCompany(c);
    setFormErrors({});
    setFormData({
      company_name: c.company_name,
      visit_address: c.visit_address || "",
      contact_details_text: typeof cd.text === "string" ? cd.text : "",
      phone: cd.phone || "",
      email: cd.email || "",
      website: cd.website || "",
      linkedin: cd.linkedin || "",
      team: (c as any).team || "",
      company_size: c.company_size || "",
      branch: c.branch || "",
      relatie_beheerder: (c as any).relatie_beheerder || "",
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.company_name.trim()) errors.company_name = "Bedrijfsnaam is verplicht";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = "Ongeldig e-mailadres";
    if (formData.website && !/^https?:\/\//i.test(formData.website)) errors.website = "Voeg http(s) toe";
    if (formData.linkedin && !/^https?:\/\//i.test(formData.linkedin)) errors.linkedin = "Voeg http(s) toe";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildContactDetailsJson = () => {
    const { contact_details_text, phone, email, website, linkedin } = formData;
    const obj: Record<string, any> = {};
    if (contact_details_text.trim()) obj.text = contact_details_text.trim();
    if (phone.trim()) obj.phone = phone.trim();
    if (email.trim()) obj.email = email.trim();
    if (website.trim()) obj.website = website.trim();
    if (linkedin.trim()) obj.linkedin = linkedin.trim();
    return obj;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const contactDetails = buildContactDetailsJson();
      if (editingCompany) {
        const updateData: CompanyUpdateRequest = {
          company_name: formData.company_name,
          visit_address: formData.visit_address || null,
          contact_details: contactDetails,
          company_size: formData.company_size || null,
          branch: formData.branch || null,
          // extra velden doorgeven
          // @ts-expect-error: backend accepteert extra velden
          relatie_beheerder: formData.relatie_beheerder || null,
          // @ts-expect-error
          team: formData.team || null,
        } as any;
        const response = await brain.update_company({ companyId: editingCompany.id }, updateData);
        const updated = await response.json();
        setCompanies((prev) => prev.map((x) => (x.id === editingCompany.id ? updated : x)));
        toast.success("Company updated successfully");
      } else {
        const createData: CompanyCreateRequest = {
          company_name: formData.company_name,
          visit_address: formData.visit_address || undefined,
          contact_details: contactDetails,
          company_size: formData.company_size || undefined,
          branch: formData.branch || undefined,
          // @ts-expect-error
          relatie_beheerder: formData.relatie_beheerder || undefined,
          // @ts-expect-error
          team: formData.team || undefined,
        } as any;
        const response = await brain.create_company(createData);
        const created = await response.json();
        setCompanies((prev) => [created, ...prev]);
        toast.success("Company created successfully");
      }
      setDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.response) {
        try {
          const data = await err.response.json();
          toast.error(typeof data?.detail === "string" ? data.detail : "Failed to save company");
        } catch { toast.error("Failed to save company"); }
      } else toast.error("Failed to save company");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (company: CompanyResponse) => {
    if (!confirm(`Weet je zeker dat je "${company.company_name}" wilt verwijderen?`)) return;
    try {
      await brain.delete_company({ companyId: company.id });
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      toast.success("Company deleted successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete company");
    }
  };

  const formatContactDetailsCompact = (cd: any) => {
    if (!cd) return "—";
    const parts = [cd.phone, cd.email, cd.website].filter(Boolean);
    if (cd.text) parts.unshift(cd.text);
    return parts.length ? parts.join(" · ") : "—";
  };

  const onRowClick = (c: CompanyResponse) => {
    setDetailCompany(c);
    setGeneralOpen(true);
    setDetailOpen(true);
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    companies.forEach((c) => (next[c.id] = checked));
    setCheckedIds(next);
  };

  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => ({ ...prev, [id]: checked }));

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Bedrijven
          </h1>
          <p className="text-black mt-1">Bewerk bedrijfsgegevens</p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      {/* Table (blijft zoals eerder) */}
      <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Companies ({filteredCompanies.length}{searchQuery ? ` van ${companies.length}` : ""})
          </CardTitle>
          <CardDescription>Companies you work with on various projects</CardDescription>
        </div>

        {/* Search box */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op bedrijfsnaam…"
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Zoekopdracht wissen"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">Bedrijven aan het laden...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Geen bedrijven gevonden voor "{searchQuery}"</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-purple-100/60">
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" aria-label="Select all" onChange={(e) => toggleAll(e.currentTarget.checked)} />
                    </TableHead>
                    <TableHead className="min-w-[260px]">Naam bedrijf</TableHead>
                    <TableHead className="min-w-[220px]">Bezoekadres</TableHead>
                    <TableHead className="min-w-[260px]">Contactgegevens</TableHead>
                    <TableHead className="min-w-[140px]">Aangemaakt op</TableHead>
                    <TableHead className="w-12 text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onRowClick(c)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!checkedIds[c.id]}
                          onChange={(e) => toggleOne(c.id, e.currentTarget.checked)}
                          aria-label={`Select ${c.company_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{c.company_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md border text-muted-foreground">Preview</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.visit_address ? (
                          <div className="flex items-start gap-1 text-sm"><MapPin className="w-3 h-3 mt-0.5 text-muted-foreground" />{c.visit_address}</div>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><div className="text-sm text-muted-foreground line-clamp-2">{formatContactDetailsCompact((c as any).contact_details)}</div></TableCell>
                      <TableCell><span className="text-sm">{formatNLDate(c.created_at)}</span></TableCell>
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <button className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c)} aria-label="Delete">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DETAIL POPUP */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl w-full">
          {detailCompany && (
            <Fragment>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {detailCompany.company_name}
                </DialogTitle>
                <DialogDescription>Overzicht van bedrijfsgegevens</DialogDescription>
              </DialogHeader>

              {/* ALGEMEEN */}
              <div className="border rounded-xl">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3"
                  onClick={() => setGeneralOpen((v) => !v)}
                >
                  <span className="text-sm font-medium text-black">Algemeen</span>
                  {generalOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {generalOpen && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {/* Relatiebeheerder */}
                    <div>
                      <div className="text-muted-foreground text-xs">Relatiebeheerder</div>
                      <div className="mt-1 flex items-center gap-2">
                        {/* <div className="w-6 h-6 rounded-full bg-blue-600 text-white grid place-items-center text-xs">
                          {initials((detailCompany as any).relatie_beheerder)}
                        </div> */}
                        <span>{(detailCompany as any).relatie_beheerder || "—"}</span>
                      </div>
                    </div>

                    {/* Team */}
                    <div>
                      <div className="text-muted-foreground text-xs">Team</div>
                      <div className="mt-1">{(detailCompany as any).team || "—"}</div>
                    </div>

                    {/* Branche */}
                    <div>
                      <div className="text-muted-foreground text-xs">Branche</div>
                      <div className="mt-1">{detailCompany.branch || "—"}</div>
                    </div>

                    {/* Bedrijfsgrootte */}
                    <div>
                      <div className="text-muted-foreground text-xs">Bedrijfsgrootte</div>
                      <div className="mt-1">{detailCompany.company_size || "—"}</div>
                    </div>

                    {/* Website */}
                    <div>
                      <div className="text-muted-foreground text-xs">Website</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        {detailCompany.contact_details?.website ? (
                          <a className="underline underline-offset-4" href={detailCompany.contact_details.website} target="_blank" rel="noopener noreferrer">
                            {detailCompany.contact_details.website}
                          </a>
                        ) : "—"}
                      </div>
                    </div>

                    {/* E-mailadres */}
                    <div>
                      <div className="text-muted-foreground text-xs">E-mailadres</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {detailCompany.contact_details?.email || "—"}
                      </div>
                    </div>

                    {/* Telefoonnummer */}
                    <div>
                      <div className="text-muted-foreground text-xs">Telefoonnummer</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {detailCompany.contact_details?.phone || "—"}
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div>
                      <div className="text-muted-foreground text-xs">LinkedIn</div>
                      <div className="mt-1 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        {detailCompany.contact_details?.linkedin ? (
                          <a className="underline underline-offset-4" href={detailCompany.contact_details.linkedin} target="_blank" rel="noopener noreferrer">
                            {detailCompany.contact_details.linkedin}
                          </a>
                        ) : "—"}
                      </div>
                    </div>

                    {/* Aangemaakt op */}
                    <div>
                      <div className="text-muted-foreground text-xs">Aangemaakt op</div>
                      <div className="mt-1 font-medium">{formatNLDate(detailCompany.created_at)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vrije notities / “text” */}
              {/* {detailCompany.contact_details?.text && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-1">Notities</div>
                  <div className="text-sm whitespace-pre-line">{detailCompany.contact_details.text}</div>
                </div>
              )} */}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Sluiten</Button>
                <Button
                  onClick={() => { setDetailOpen(false); openEditDialog(detailCompany); }}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Bewerken
                </Button>
              </div>
            </Fragment>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT DIALOG – met nieuwe velden */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
            <DialogDescription>{editingCompany ? "Update the company information below" : "Enter the details for the new company"}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" value={formData.company_name}
                onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))}
                className={formErrors.company_name ? "border-red-500" : ""} />
              {formErrors.company_name && <p className="text-sm text-red-600">{formErrors.company_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit_address">Visit Address</Label>
              <Textarea id="visit_address" rows={2} value={formData.visit_address}
                onChange={(e) => setFormData((p) => ({ ...p, visit_address: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Size</Label>
                <Select value={formData.company_size || undefined} onValueChange={(v) => setFormData((p) => ({ ...p, company_size: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="500+">500+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={formData.branch || undefined} onValueChange={(v) => setFormData((p) => ({ ...p, branch: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>{BRANCH_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relatiebeheerder</Label>
                <Select value={formData.relatie_beheerder || undefined} onValueChange={(v) => setFormData((p) => ({ ...p, relatie_beheerder: v }))}>
                  <SelectTrigger><SelectValue placeholder="Kies relatiebeheerder" /></SelectTrigger>
                  <SelectContent>{RELATION_MANAGERS.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Input id="team" placeholder="Bijv. 3 FTE / namen" value={formData.team}
                  onChange={(e) => setFormData((p) => ({ ...p, team: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://…" value={formData.website}
                  onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))} className={formErrors.website ? "border-red-500" : ""} />
                {formErrors.website && <p className="text-sm text-red-600">{formErrors.website}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input id="email" type="email" placeholder="info@bedrijf.nl" value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className={formErrors.email ? "border-red-500" : ""} />
                {formErrors.email && <p className="text-sm text-red-600">{formErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefoonnummer</Label>
                <Input id="phone" placeholder="06-12345678" value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input id="linkedin" placeholder="https://www.linkedin.com/company/…" value={formData.linkedin}
                  onChange={(e) => setFormData((p) => ({ ...p, linkedin: e.target.value }))} className={formErrors.linkedin ? "border-red-500" : ""} />
                {formErrors.linkedin && <p className="text-sm text-red-600">{formErrors.linkedin}</p>}
              </div>
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="contact_details_text">Notities (vrije tekst)</Label>
              <Textarea id="contact_details_text" rows={4} placeholder={`Bijv.\n- Bel eerst receptie\n- Extra info…`}
                value={formData.contact_details_text}
                onChange={(e) => setFormData((p) => ({ ...p, contact_details_text: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Wordt opgeslagen onder <code>contact_details.text</code>.</p>
            </div> */}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Saving..." : editingCompany ? "Update Company" : "Create Company"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Companies;
