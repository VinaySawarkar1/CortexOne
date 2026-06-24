import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Upload, Save, Loader2, KeyRound, CalendarClock,
  Users, Package, IndianRupee, Headphones, ShoppingCart, Briefcase,
  TrendingUp, FileText, Settings, Palette, Clock, Globe, Hash,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import TermsConditionsManager from "./terms-conditions-manager";

// ── helpers ───────────────────────────────────────────────────────────────────
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>{children}</div>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function SaveBtn({ loading, onClick }: { loading: boolean; onClick?: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onClick} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs h-8 px-4">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Changes
      </Button>
    </div>
  );
}

// ── Document design templates ─────────────────────────────────────────────────
const DOC_DESIGNS = [
  {
    id: "classic",
    name: "Classic",
    desc: "Clean header, traditional layout",
    preview: (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill="#fff" />
        <rect x="8" y="8" width="104" height="12" rx="2" fill="#1e293b" />
        <rect x="8" y="24" width="50" height="4" rx="1" fill="#94a3b8" />
        <rect x="8" y="30" width="38" height="4" rx="1" fill="#94a3b8" />
        <rect x="8" y="42" width="104" height="1" fill="#e2e8f0" />
        <rect x="8" y="47" width="20" height="3" rx="1" fill="#cbd5e1" />
        <rect x="32" y="47" width="35" height="3" rx="1" fill="#cbd5e1" />
        <rect x="80" y="47" width="15" height="3" rx="1" fill="#cbd5e1" />
        <rect x="8" y="54" width="20" height="3" rx="1" fill="#e2e8f0" />
        <rect x="32" y="54" width="35" height="3" rx="1" fill="#e2e8f0" />
        <rect x="80" y="54" width="15" height="3" rx="1" fill="#e2e8f0" />
        <rect x="8" y="61" width="20" height="3" rx="1" fill="#e2e8f0" />
        <rect x="32" y="61" width="35" height="3" rx="1" fill="#e2e8f0" />
        <rect x="80" y="61" width="15" height="3" rx="1" fill="#e2e8f0" />
        <rect x="75" y="70" width="37" height="5" rx="1" fill="#1e293b" />
      </svg>
    ),
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Indigo accent, two-column header",
    preview: (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill="#fff" />
        <rect width="120" height="18" fill="#6366f1" />
        <rect x="8" y="4" width="30" height="10" rx="2" fill="#fff" fillOpacity="0.2" />
        <rect x="70" y="5" width="42" height="4" rx="1" fill="#fff" fillOpacity="0.6" />
        <rect x="70" y="11" width="30" height="3" rx="1" fill="#fff" fillOpacity="0.4" />
        <rect x="8" y="24" width="50" height="4" rx="1" fill="#94a3b8" />
        <rect x="8" y="30" width="38" height="3" rx="1" fill="#94a3b8" />
        <rect x="8" y="42" width="104" height="1" fill="#e0e7ff" />
        <rect x="8" y="47" width="20" height="3" rx="1" fill="#a5b4fc" />
        <rect x="32" y="47" width="35" height="3" rx="1" fill="#cbd5e1" />
        <rect x="80" y="47" width="15" height="3" rx="1" fill="#cbd5e1" />
        <rect x="8" y="54" width="20" height="3" rx="1" fill="#e2e8f0" />
        <rect x="32" y="54" width="35" height="3" rx="1" fill="#e2e8f0" />
        <rect x="80" y="54" width="15" height="3" rx="1" fill="#e2e8f0" />
        <rect x="8" y="61" width="20" height="3" rx="1" fill="#e2e8f0" />
        <rect x="32" y="61" width="35" height="3" rx="1" fill="#e2e8f0" />
        <rect x="80" y="61" width="15" height="3" rx="1" fill="#e2e8f0" />
        <rect x="75" y="70" width="37" height="5" rx="1" fill="#6366f1" />
      </svg>
    ),
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "White space, subtle typography",
    preview: (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill="#fafafa" />
        <rect x="8" y="8" width="25" height="8" rx="1" fill="#e2e8f0" />
        <rect x="60" y="8" width="52" height="3" rx="1" fill="#1e293b" />
        <rect x="60" y="13" width="38" height="2.5" rx="1" fill="#94a3b8" />
        <rect x="8" y="26" width="104" height="0.5" fill="#e2e8f0" />
        <rect x="8" y="30" width="40" height="3" rx="1" fill="#94a3b8" />
        <rect x="8" y="35" width="28" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="8" y="46" width="104" height="0.5" fill="#e2e8f0" />
        <rect x="8" y="50" width="20" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="32" y="50" width="35" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="80" y="50" width="15" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="8" y="55" width="20" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="32" y="55" width="35" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="80" y="55" width="15" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="8" y="60" width="20" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="32" y="60" width="35" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="80" y="60" width="15" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="80" y="70" width="32" height="4" rx="1" fill="#1e293b" />
      </svg>
    ),
  },
  {
    id: "corporate",
    name: "Corporate",
    desc: "Dark header strip, professional",
    preview: (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill="#fff" />
        <rect width="120" height="22" fill="#0f172a" />
        <rect x="8" y="5" width="28" height="12" rx="2" fill="#fff" fillOpacity="0.12" />
        <rect x="42" y="8" width="50" height="4" rx="1" fill="#fff" fillOpacity="0.7" />
        <rect x="42" y="14" width="35" height="2.5" rx="1" fill="#fff" fillOpacity="0.35" />
        <rect x="0" y="22" width="120" height="4" fill="#6366f1" />
        <rect x="8" y="32" width="50" height="3" rx="1" fill="#94a3b8" />
        <rect x="8" y="37" width="35" height="3" rx="1" fill="#cbd5e1" />
        <rect x="8" y="48" width="104" height="1" fill="#e2e8f0" />
        <rect x="8" y="52" width="20" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="32" y="52" width="35" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="80" y="52" width="15" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="8" y="57" width="20" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="32" y="57" width="35" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="80" y="57" width="15" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="0" y="74" width="120" height="6" fill="#0f172a" />
      </svg>
    ),
  },
  {
    id: "colorful",
    name: "Colorful",
    desc: "Gradient accents, vibrant style",
    preview: (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill="#fff" />
        <rect width="8" height="80" fill="#6366f1" />
        <rect x="8" y="8" width="104" height="14" rx="2" fill="#f0f0ff" />
        <rect x="14" y="11" width="50" height="4" rx="1" fill="#6366f1" />
        <rect x="14" y="17" width="35" height="3" rx="1" fill="#a5b4fc" />
        <rect x="14" y="28" width="50" height="3" rx="1" fill="#94a3b8" />
        <rect x="14" y="33" width="35" height="3" rx="1" fill="#cbd5e1" />
        <rect x="14" y="44" width="104" height="1" fill="#e0e7ff" />
        <rect x="14" y="48" width="20" height="2.5" rx="1" fill="#a5b4fc" />
        <rect x="38" y="48" width="35" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="82" y="48" width="15" height="2.5" rx="1" fill="#cbd5e1" />
        <rect x="14" y="53" width="20" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="38" y="53" width="35" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="82" y="53" width="15" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="14" y="58" width="20" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="38" y="58" width="35" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="82" y="58" width="15" height="2.5" rx="1" fill="#e2e8f0" />
        <rect x="14" y="68" width="37" height="5" rx="1" fill="#8b5cf6" />
      </svg>
    ),
  },
];

// ── TABS CONFIG ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "general",    label: "General",    icon: Building2 },
  { id: "documents",  label: "Documents",  icon: FileText },
  { id: "crm",        label: "CRM/Leads",  icon: TrendingUp },
  { id: "sales",      label: "Sales",      icon: Hash },
  { id: "finance",    label: "Finance",    icon: IndianRupee },
  { id: "inventory",  label: "Inventory",  icon: Package },
  { id: "hr",         label: "HR",         icon: Users },
  { id: "support",    label: "Support",    icon: Headphones },
  { id: "purchases",  label: "Purchases",  icon: ShoppingCart },
  { id: "payroll",    label: "Payroll",    icon: Briefcase },
  { id: "terms",      label: "Terms",      icon: FileText },
  { id: "integrations", label: "Integrations", icon: KeyRound },
];

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: cs, isLoading } = useQuery<any>({ queryKey: ["/api/company-settings"] });

  const save = useMutation({
    mutationFn: async (data: any) => (await apiRequest("PUT", "/api/company-settings", data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/company-settings"] });
      toast({ title: "Saved", description: "Settings updated successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const ms = (key: string) => cs?.moduleSettings?.[key] || {};
  const saveModule = (module: string, data: any) => save.mutate({ moduleSettings: { ...(cs?.moduleSettings || {}), [module]: { ...(ms(module)), ...data } } });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => setLogoPreview(ev.target?.result as string); r.readAsDataURL(f);
  };

  if (isLoading) return <Layout><div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div></Layout>;

  return (
    <Layout>
      <PageHeader title="Settings" subtitle="Configure your company profile, documents, and module preferences" />
      <div className="p-6 flex gap-5">
        {/* Sidebar nav */}
        <aside className="w-44 flex-shrink-0">
          <nav className="space-y-0.5 sticky top-4">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === t.id ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "text-slate-600 hover:bg-slate-50"}`}>
                <t.icon className="h-3.5 w-3.5 flex-shrink-0" />{t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── GENERAL ─────────────────────────────────────────── */}
          {activeTab === "general" && <GeneralTab cs={cs} save={save} logoPreview={logoPreview} onLogoChange={handleLogoChange} fileRef={fileRef} />}

          {/* ── DOCUMENTS ────────────────────────────────────────── */}
          {activeTab === "documents" && <DocumentsTab cs={cs} save={save} />}

          {/* ── CRM ─────────────────────────────────────────────── */}
          {activeTab === "crm" && <CRMTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── SALES ───────────────────────────────────────────── */}
          {activeTab === "sales" && <SalesTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── FINANCE ─────────────────────────────────────────── */}
          {activeTab === "finance" && <FinanceTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── INVENTORY ───────────────────────────────────────── */}
          {activeTab === "inventory" && <InventoryTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── HR ──────────────────────────────────────────────── */}
          {activeTab === "hr" && <HRTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── SUPPORT ─────────────────────────────────────────── */}
          {activeTab === "support" && <SupportTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── PURCHASES ────────────────────────────────────────── */}
          {activeTab === "purchases" && <PurchasesTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── PAYROLL ─────────────────────────────────────────── */}
          {activeTab === "payroll" && <PayrollTab ms={ms} saveModule={saveModule} saving={save.isPending} />}

          {/* ── TERMS ────────────────────────────────────────────── */}
          {activeTab === "terms" && <TermsConditionsManager />}

          {/* ── INTEGRATIONS ─────────────────────────────────────── */}
          {activeTab === "integrations" && <IntegrationsTab cs={cs} save={save} />}
        </div>
      </div>
    </Layout>
  );
}

// ── GENERAL TAB ───────────────────────────────────────────────────────────────
function GeneralTab({ cs, save, logoPreview, onLogoChange, fileRef }: any) {
  const [form, setForm] = useState<any>({
    name: cs?.name || "",
    address: cs?.address || "",
    phone: cs?.phone || "",
    email: cs?.email || "",
    gstNumber: cs?.gstNumber || "",
    panNumber: cs?.panNumber || "",
    website: cs?.website || "",
    currency: cs?.currency || "INR",
    timezone: cs?.timezone || "Asia/Kolkata",
    dateFormat: cs?.dateFormat || "DD/MM/YYYY",
    bankDetails: {
      bankName: cs?.bankDetails?.bankName || "",
      accountNo: cs?.bankDetails?.accountNo || "",
      ifsc: cs?.bankDetails?.ifsc || "",
      branch: cs?.bankDetails?.branch || "",
      upi: cs?.bankDetails?.upi || "",
      swift: cs?.bankDetails?.swift || "",
    },
  });
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const updBank = (k: string, v: string) => setForm((f: any) => ({ ...f, bankDetails: { ...f.bankDetails, [k]: v } }));

  const submit = () => {
    const data: any = { ...form };
    if (logoPreview) data.logo = logoPreview;
    else if (cs?.logo) data.logo = cs.logo;
    save.mutate(data);
  };

  return (
    <div className="space-y-5">
      {/* Logo */}
      <Section title="Company Logo" desc="Appears on all PDF documents, invoices, and reports">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden">
            {(logoPreview || cs?.logo) ? (
              <img src={logoPreview || cs?.logo} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <Upload className="h-7 w-7" />
                <span className="text-[10px]">No logo</span>
              </div>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs gap-2 mb-2">
              <Upload className="h-3.5 w-3.5" />Upload Logo
            </Button>
            <p className="text-[11px] text-slate-400">PNG or JPG · Max 2MB · Recommended 200×200px</p>
            {(logoPreview || cs?.logo) && (
              <button onClick={() => { setForm((f: any) => f); save.mutate({ logo: "" }); }} className="text-[11px] text-red-400 hover:text-red-600 mt-1">Remove logo</button>
            )}
          </div>
        </div>
      </Section>

      {/* Company Info */}
      <Section title="Company Details" desc="This information appears on all your documents and communications">
        <div className="space-y-4">
          <FieldRow cols={2}>
            <Field label="Company Name *">
              <Input value={form.name} onChange={e => upd("name", e.target.value)} className="h-8 text-sm" />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={e => upd("website", e.target.value)} placeholder="https://example.com" className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <Field label="Registered Address">
            <Textarea value={form.address} onChange={e => upd("address", e.target.value)} rows={3} className="text-sm resize-none" placeholder="Full company address" />
          </Field>
          <FieldRow cols={2}>
            <Field label="Phone Number">
              <Input value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+91 98765 43210" className="h-8 text-sm" />
            </Field>
            <Field label="Email Address">
              <Input value={form.email} onChange={e => upd("email", e.target.value)} type="email" placeholder="info@company.com" className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="GST Number" hint="e.g. 27AABCU9603R1ZX">
              <Input value={form.gstNumber} onChange={e => upd("gstNumber", e.target.value)} placeholder="27XXXXXXXXXXXXXX" className="h-8 text-sm" />
            </Field>
            <Field label="PAN Number">
              <Input value={form.panNumber} onChange={e => upd("panNumber", e.target.value)} placeholder="XXXXXXXXXX" className="h-8 text-sm" />
            </Field>
          </FieldRow>
        </div>
      </Section>

      {/* Regional */}
      <Section title="Regional & Format" desc="Currency, timezone, and date format for documents">
        <FieldRow cols={3}>
          <Field label="Currency">
            <Select value={form.currency} onValueChange={v => upd("currency", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                <SelectItem value="AED">AED — UAE Dirham</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timezone">
            <Select value={form.timezone} onValueChange={v => upd("timezone", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date Format">
            <Select value={form.dateFormat} onValueChange={v => upd("dateFormat", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldRow>
      </Section>

      {/* Bank Details */}
      <Section title="Bank Details" desc="Banking information printed at the bottom of invoices">
        <div className="space-y-4">
          <FieldRow cols={2}>
            <Field label="Bank Name">
              <Input value={form.bankDetails.bankName} onChange={e => updBank("bankName", e.target.value)} className="h-8 text-sm" />
            </Field>
            <Field label="Branch">
              <Input value={form.bankDetails.branch} onChange={e => updBank("branch", e.target.value)} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="Account Number">
              <Input value={form.bankDetails.accountNo} onChange={e => updBank("accountNo", e.target.value)} className="h-8 text-sm" />
            </Field>
            <Field label="IFSC Code">
              <Input value={form.bankDetails.ifsc} onChange={e => updBank("ifsc", e.target.value)} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="UPI ID">
              <Input value={form.bankDetails.upi} onChange={e => updBank("upi", e.target.value)} placeholder="company@upi" className="h-8 text-sm" />
            </Field>
            <Field label="SWIFT Code" hint="For international transfers">
              <Input value={form.bankDetails.swift} onChange={e => updBank("swift", e.target.value)} className="h-8 text-sm" />
            </Field>
          </FieldRow>
        </div>
      </Section>

      <SaveBtn loading={save.isPending} onClick={submit} />
    </div>
  );
}

// ── DOCUMENTS TAB ─────────────────────────────────────────────────────────────
function DocumentsTab({ cs, save }: any) {
  const [selected, setSelected] = useState(cs?.documentDesign || "modern");
  const [prefixes, setPrefixes] = useState({
    invoicePrefix: cs?.documentPrefixes?.invoicePrefix || "INV",
    orderPrefix: cs?.documentPrefixes?.orderPrefix || "SO",
    poPrefix: cs?.documentPrefixes?.poPrefix || "PO",
    ticketPrefix: cs?.documentPrefixes?.ticketPrefix || "TKT",
    quotationPrefix: cs?.documentPrefixes?.quotationPrefix || "QT",
  });
  const [footer, setFooter] = useState(cs?.documentFooter || "");

  const submit = () => save.mutate({ documentDesign: selected, documentPrefixes: prefixes, documentFooter: footer });

  return (
    <div className="space-y-5">
      <Section title="Document Template" desc="Choose how your invoices, orders, and quotes look when printed or emailed">
        <div className="grid grid-cols-5 gap-3">
          {DOC_DESIGNS.map(d => (
            <button key={d.id} onClick={() => setSelected(d.id)}
              className={`relative rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${selected === d.id ? "border-indigo-500 shadow-md" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="aspect-[3/2] bg-white p-1">
                {d.preview}
              </div>
              <div className={`px-2 py-1.5 text-center ${selected === d.id ? "bg-indigo-50" : "bg-white"}`}>
                <div className={`text-[11px] font-bold ${selected === d.id ? "text-indigo-700" : "text-slate-700"}`}>{d.name}</div>
                <div className="text-[9px] text-slate-400 leading-tight">{d.desc}</div>
              </div>
              {selected === d.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Document Number Prefixes" desc="Auto-numbering prefix used when creating new documents">
        <div className="grid grid-cols-5 gap-4">
          {[
            { key: "invoicePrefix", label: "Invoice", example: "INV-0001" },
            { key: "orderPrefix", label: "Sales Order", example: "SO-0001" },
            { key: "poPrefix", label: "Purchase Order", example: "PO-0001" },
            { key: "ticketPrefix", label: "Support Ticket", example: "TKT-0001" },
            { key: "quotationPrefix", label: "Quotation", example: "QT-0001" },
          ].map(f => (
            <Field key={f.key} label={f.label} hint={`e.g. ${f.example}`}>
              <Input
                value={(prefixes as any)[f.key]}
                onChange={e => setPrefixes(p => ({ ...p, [f.key]: e.target.value }))}
                className="h-8 text-sm font-mono"
                maxLength={8}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Document Footer Text" desc="Custom text printed at the bottom of every document (terms summary, tagline, etc.)">
        <Textarea
          value={footer}
          onChange={e => setFooter(e.target.value)}
          rows={3}
          className="text-sm resize-none"
          placeholder="e.g. Thank you for your business. Subject to local jurisdiction."
        />
      </Section>

      <SaveBtn loading={save.isPending} onClick={submit} />
    </div>
  );
}

// ── CRM TAB ───────────────────────────────────────────────────────────────────
function CRMTab({ ms, saveModule, saving }: any) {
  const m = ms("crm");
  const [form, setForm] = useState({
    leadExpiryDays: m.leadExpiryDays || 30,
    defaultSource: m.defaultSource || "website",
    autoAssign: m.autoAssign ?? false,
    pipelineStages: (m.pipelineStages || "New,Contacted,Qualified,Proposal,Negotiation,Won,Lost").split(",").join(", "),
    leadSources: (m.leadSources || "Website,Referral,Social,Email,Cold Call,Event,IndiaMART,Trade Show").split(",").join(", "),
    winNotification: m.winNotification ?? true,
    followUpDays: m.followUpDays || 3,
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => saveModule("crm", {
    ...form,
    pipelineStages: form.pipelineStages.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
    leadSources: form.leadSources.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
  });

  return (
    <div className="space-y-5">
      <Section title="Pipeline & Stages" desc="Customize lead pipeline stages displayed in CRM">
        <Field label="Pipeline Stages" hint="Comma-separated list. Order matters — left to right is the pipeline flow.">
          <Input value={form.pipelineStages} onChange={e => upd("pipelineStages", e.target.value)} className="h-8 text-sm" />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {form.pipelineStages.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-100">{s}</span>
          ))}
        </div>
      </Section>

      <Section title="Lead Sources" desc="Sources available when creating a new lead">
        <Field label="Lead Sources" hint="Comma-separated list">
          <Input value={form.leadSources} onChange={e => upd("leadSources", e.target.value)} className="h-8 text-sm" />
        </Field>
      </Section>

      <Section title="Automation & Defaults">
        <div className="space-y-4">
          <FieldRow cols={2}>
            <Field label="Lead Expiry (days)" hint="Lead marked stale after N days without activity">
              <Input type="number" value={form.leadExpiryDays} onChange={e => upd("leadExpiryDays", Number(e.target.value))} className="h-8 text-sm" min={1} />
            </Field>
            <Field label="Default Lead Source">
              <Input value={form.defaultSource} onChange={e => upd("defaultSource", e.target.value)} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="Follow-up Reminder (days)" hint="Notify salesperson after N days if no follow-up">
              <Input type="number" value={form.followUpDays} onChange={e => upd("followUpDays", Number(e.target.value))} className="h-8 text-sm" min={1} />
            </Field>
          </FieldRow>
          <div className="flex items-center gap-3">
            <Switch checked={form.autoAssign} onCheckedChange={v => upd("autoAssign", v)} />
            <div>
              <div className="text-xs font-semibold text-slate-700">Auto-assign new leads</div>
              <div className="text-[11px] text-slate-400">Round-robin assignment among active sales users</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.winNotification} onCheckedChange={v => upd("winNotification", v)} />
            <div>
              <div className="text-xs font-semibold text-slate-700">Win notifications</div>
              <div className="text-[11px] text-slate-400">Notify team when a lead is marked as Won</div>
            </div>
          </div>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={submit} />
    </div>
  );
}

// ── SALES TAB ─────────────────────────────────────────────────────────────────
function SalesTab({ ms, saveModule, saving }: any) {
  const m = ms("sales");
  const [form, setForm] = useState({
    taxRate: m.taxRate ?? 18,
    taxLabel: m.taxLabel || "GST",
    defaultPaymentTerms: m.defaultPaymentTerms || "30",
    defaultDeliveryTerms: m.defaultDeliveryTerms || "Ex-Works",
    autoConfirmOrders: m.autoConfirmOrders ?? false,
    showTaxInclusive: m.showTaxInclusive ?? false,
    allowDiscount: m.allowDiscount ?? true,
    maxDiscountPct: m.maxDiscountPct ?? 20,
    orderApprovalThreshold: m.orderApprovalThreshold ?? 100000,
    requirePO: m.requirePO ?? false,
    defaultWarranty: m.defaultWarranty || "1 Year",
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Section title="Tax Settings" desc="Default tax configuration for sales orders and invoices">
        <FieldRow cols={3}>
          <Field label="Tax Rate (%)" hint="Applied by default on line items">
            <Input type="number" value={form.taxRate} onChange={e => upd("taxRate", Number(e.target.value))} className="h-8 text-sm" min={0} max={100} />
          </Field>
          <Field label="Tax Label" hint="Shown on documents (GST, VAT, TAX…)">
            <Input value={form.taxLabel} onChange={e => upd("taxLabel", e.target.value)} className="h-8 text-sm" />
          </Field>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={form.showTaxInclusive} onCheckedChange={v => upd("showTaxInclusive", v)} />
            <span className="text-xs text-slate-700 font-semibold">Prices are tax-inclusive</span>
          </div>
        </FieldRow>
      </Section>

      <Section title="Order Defaults" desc="Pre-fill values when creating new sales orders">
        <div className="space-y-4">
          <FieldRow cols={2}>
            <Field label="Default Payment Terms" hint="e.g. 30, Net 30, Immediate">
              <Input value={form.defaultPaymentTerms} onChange={e => upd("defaultPaymentTerms", e.target.value)} className="h-8 text-sm" />
            </Field>
            <Field label="Default Delivery Terms" hint="e.g. Ex-Works, CIF, FOB">
              <Input value={form.defaultDeliveryTerms} onChange={e => upd("defaultDeliveryTerms", e.target.value)} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="Default Warranty">
              <Input value={form.defaultWarranty} onChange={e => upd("defaultWarranty", e.target.value)} className="h-8 text-sm" />
            </Field>
            <Field label="Approval Threshold (₹)" hint="Orders above this need manager approval">
              <Input type="number" value={form.orderApprovalThreshold} onChange={e => upd("orderApprovalThreshold", Number(e.target.value))} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="Max Discount %" hint="Maximum discount a salesperson can apply">
              <Input type="number" value={form.maxDiscountPct} onChange={e => upd("maxDiscountPct", Number(e.target.value))} className="h-8 text-sm" min={0} max={100} />
            </Field>
          </FieldRow>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={form.autoConfirmOrders} onCheckedChange={v => upd("autoConfirmOrders", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Auto-confirm orders</div><div className="text-[11px] text-slate-400">Skip the draft state — orders go directly to confirmed</div></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.allowDiscount} onCheckedChange={v => upd("allowDiscount", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Allow line-item discounts</div><div className="text-[11px] text-slate-400">Show discount % field on each order line</div></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.requirePO} onCheckedChange={v => upd("requirePO", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Require customer PO number</div><div className="text-[11px] text-slate-400">Order cannot be confirmed without a customer PO reference</div></div>
            </div>
          </div>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("sales", form)} />
    </div>
  );
}

// ── FINANCE TAB ───────────────────────────────────────────────────────────────
function FinanceTab({ ms, saveModule, saving }: any) {
  const m = ms("finance");
  const [form, setForm] = useState({
    paymentDueDays: m.paymentDueDays ?? 30,
    lateFeePercent: m.lateFeePercent ?? 2,
    lateFeeAfterDays: m.lateFeeAfterDays ?? 7,
    tdsRate: m.tdsRate ?? 0,
    defaultTaxRate: m.defaultTaxRate ?? 18,
    roundOff: m.roundOff ?? true,
    fiscalYearStart: m.fiscalYearStart || "04",
    autoSendInvoice: m.autoSendInvoice ?? false,
    overdueReminder: m.overdueReminder ?? true,
    reminderDays: m.reminderDays || "3,7,15",
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div className="space-y-5">
      <Section title="Invoice & Payment" desc="Default terms and behaviour for customer invoices">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Payment Due (days)" hint="Days from invoice date">
              <Input type="number" value={form.paymentDueDays} onChange={e => upd("paymentDueDays", Number(e.target.value))} className="h-8 text-sm" min={0} />
            </Field>
            <Field label="Fiscal Year Start">
              <Select value={form.fiscalYearStart} onValueChange={v => upd("fiscalYearStart", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1).padStart(2,"0")}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.roundOff} onCheckedChange={v => upd("roundOff", v)} />
              <span className="text-xs font-semibold text-slate-700">Round-off totals</span>
            </div>
          </FieldRow>
        </div>
      </Section>

      <Section title="Tax & TDS" desc="Tax rates applied on finance documents">
        <FieldRow cols={3}>
          <Field label="Default Tax Rate (%)">
            <Input type="number" value={form.defaultTaxRate} onChange={e => upd("defaultTaxRate", Number(e.target.value))} className="h-8 text-sm" min={0} />
          </Field>
          <Field label="TDS Rate (%)" hint="0 to disable">
            <Input type="number" value={form.tdsRate} onChange={e => upd("tdsRate", Number(e.target.value))} className="h-8 text-sm" min={0} />
          </Field>
        </FieldRow>
      </Section>

      <Section title="Late Fees & Reminders">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Late Fee (%)" hint="Monthly interest on overdue amount">
              <Input type="number" value={form.lateFeePercent} onChange={e => upd("lateFeePercent", Number(e.target.value))} className="h-8 text-sm" min={0} step={0.5} />
            </Field>
            <Field label="Grace Period (days)" hint="Late fee applies after N days overdue">
              <Input type="number" value={form.lateFeeAfterDays} onChange={e => upd("lateFeeAfterDays", Number(e.target.value))} className="h-8 text-sm" min={0} />
            </Field>
          </FieldRow>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={form.autoSendInvoice} onCheckedChange={v => upd("autoSendInvoice", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Auto-send invoice on confirm</div><div className="text-[11px] text-slate-400">Email invoice PDF to customer when status changes to Sent</div></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.overdueReminder} onCheckedChange={v => upd("overdueReminder", v)} />
              <div>
                <div className="text-xs font-semibold text-slate-700">Overdue payment reminders</div>
                <div className="text-[11px] text-slate-400">
                  Remind at days:&nbsp;
                  <Input value={form.reminderDays} onChange={e => upd("reminderDays", e.target.value)} className="inline-flex h-6 w-28 text-xs px-2 ml-1" />
                  &nbsp;(comma-separated)
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("finance", form)} />
    </div>
  );
}

// ── INVENTORY TAB ─────────────────────────────────────────────────────────────
function InventoryTab({ ms, saveModule, saving }: any) {
  const m = ms("inventory");
  const [form, setForm] = useState({
    lowStockThreshold: m.lowStockThreshold ?? 10,
    lowStockThresholdType: m.lowStockThresholdType || "quantity",
    negativeStock: m.negativeStock ?? false,
    autoReorder: m.autoReorder ?? false,
    valuationMethod: m.valuationMethod || "average",
    defaultUOM: m.defaultUOM || "Nos",
    trackSerialNumbers: m.trackSerialNumbers ?? false,
    trackBatchNumbers: m.trackBatchNumbers ?? false,
    stockAlertEmail: m.stockAlertEmail || "",
    categories: (m.categories || "Electronics,Mechanical,Consumables,Raw Material,Finished Goods,Packaging").split(",").join(", "),
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Section title="Stock Levels & Alerts" desc="Configure when items are flagged as low stock">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Low Stock Threshold">
              <Input type="number" value={form.lowStockThreshold} onChange={e => upd("lowStockThreshold", Number(e.target.value))} className="h-8 text-sm" min={0} />
            </Field>
            <Field label="Threshold Type">
              <Select value={form.lowStockThresholdType} onValueChange={v => upd("lowStockThresholdType", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity">Fixed Quantity</SelectItem>
                  <SelectItem value="percent">% of Reorder Point</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Alert Email" hint="Send low-stock alerts here">
              <Input value={form.stockAlertEmail} onChange={e => upd("stockAlertEmail", e.target.value)} type="email" className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={form.negativeStock} onCheckedChange={v => upd("negativeStock", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Allow negative stock</div><div className="text-[11px] text-slate-400">Permit delivery even when on-hand quantity is zero</div></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.autoReorder} onCheckedChange={v => upd("autoReorder", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Auto-create purchase orders on low stock</div><div className="text-[11px] text-slate-400">Draft PO generated automatically when threshold is hit</div></div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Valuation & Tracking">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Valuation Method">
              <Select value={form.valuationMethod} onValueChange={v => upd("valuationMethod", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="average">Moving Average Cost</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                  <SelectItem value="standard">Standard Price</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Unit of Measure">
              <Input value={form.defaultUOM} onChange={e => upd("defaultUOM", e.target.value)} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={form.trackSerialNumbers} onCheckedChange={v => upd("trackSerialNumbers", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Track serial numbers</div><div className="text-[11px] text-slate-400">Assign unique serial numbers to individual items</div></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.trackBatchNumbers} onCheckedChange={v => upd("trackBatchNumbers", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Track batch/lot numbers</div><div className="text-[11px] text-slate-400">Group items by production batch for traceability</div></div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Item Categories" desc="Default categories available when creating inventory items">
        <Field label="Categories" hint="Comma-separated list">
          <Input value={form.categories} onChange={e => upd("categories", e.target.value)} className="h-8 text-sm" />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {form.categories.split(",").map((s: string) => s.trim()).filter(Boolean).map((s: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-full">{s}</span>
          ))}
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("inventory", {
        ...form,
        categories: form.categories.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
      })} />
    </div>
  );
}

// ── HR TAB ────────────────────────────────────────────────────────────────────
function HRTab({ ms, saveModule, saving }: any) {
  const m = ms("hr");
  const [form, setForm] = useState({
    casualLeaveDays: m.casualLeaveDays ?? 12,
    sickLeaveDays: m.sickLeaveDays ?? 7,
    earnedLeaveDays: m.earnedLeaveDays ?? 15,
    maternityLeaveDays: m.maternityLeaveDays ?? 180,
    paternityLeaveDays: m.paternityLeaveDays ?? 7,
    workHoursPerDay: m.workHoursPerDay ?? 8,
    workDaysPerWeek: m.workDaysPerWeek ?? 6,
    probationDays: m.probationDays ?? 90,
    noticePeriodDays: m.noticePeriodDays ?? 30,
    payrollCutoff: m.payrollCutoff ?? 25,
    attendanceTracking: m.attendanceTracking ?? true,
    overtimeEnabled: m.overtimeEnabled ?? false,
    departments: (m.departments || "Engineering,Sales,Operations,HR,Finance,Marketing,Support").split(",").join(", "),
    employmentTypes: (m.employmentTypes || "Full Time,Part Time,Contract,Intern").split(",").join(", "),
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Section title="Leave Policy" desc="Annual leave entitlements per employee">
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "casualLeaveDays", label: "Casual Leave (days)" },
            { key: "sickLeaveDays", label: "Sick Leave (days)" },
            { key: "earnedLeaveDays", label: "Earned/Annual Leave (days)" },
            { key: "maternityLeaveDays", label: "Maternity Leave (days)" },
            { key: "paternityLeaveDays", label: "Paternity Leave (days)" },
          ].map(f => (
            <Field key={f.key} label={f.label}>
              <Input type="number" value={(form as any)[f.key]} onChange={e => upd(f.key, Number(e.target.value))} className="h-8 text-sm" min={0} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Work Schedule">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Working Hours/Day">
              <Input type="number" value={form.workHoursPerDay} onChange={e => upd("workHoursPerDay", Number(e.target.value))} className="h-8 text-sm" min={1} max={24} />
            </Field>
            <Field label="Working Days/Week">
              <Select value={String(form.workDaysPerWeek)} onValueChange={v => upd("workDaysPerWeek", Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 days (Mon-Fri)</SelectItem>
                  <SelectItem value="6">6 days (Mon-Sat)</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payroll Cutoff Day" hint="Day of month payroll period ends">
              <Input type="number" value={form.payrollCutoff} onChange={e => upd("payrollCutoff", Number(e.target.value))} className="h-8 text-sm" min={1} max={31} />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="Probation Period (days)">
              <Input type="number" value={form.probationDays} onChange={e => upd("probationDays", Number(e.target.value))} className="h-8 text-sm" />
            </Field>
            <Field label="Notice Period (days)">
              <Input type="number" value={form.noticePeriodDays} onChange={e => upd("noticePeriodDays", Number(e.target.value))} className="h-8 text-sm" />
            </Field>
          </FieldRow>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={form.attendanceTracking} onCheckedChange={v => upd("attendanceTracking", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Attendance tracking</div><div className="text-[11px] text-slate-400">Record daily attendance and link to payroll</div></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.overtimeEnabled} onCheckedChange={v => upd("overtimeEnabled", v)} />
              <div><div className="text-xs font-semibold text-slate-700">Overtime pay</div><div className="text-[11px] text-slate-400">Calculate and include overtime in payslips</div></div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Departments & Employment Types">
        <div className="space-y-4">
          <Field label="Departments" hint="Comma-separated">
            <Input value={form.departments} onChange={e => upd("departments", e.target.value)} className="h-8 text-sm" />
          </Field>
          <Field label="Employment Types" hint="Comma-separated">
            <Input value={form.employmentTypes} onChange={e => upd("employmentTypes", e.target.value)} className="h-8 text-sm" />
          </Field>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("hr", {
        ...form,
        departments: form.departments.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
        employmentTypes: form.employmentTypes.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
      })} />
    </div>
  );
}

// ── SUPPORT TAB ───────────────────────────────────────────────────────────────
function SupportTab({ ms, saveModule, saving }: any) {
  const m = ms("support");
  const [form, setForm] = useState({
    urgentSlaHours: m.urgentSlaHours ?? 4,
    highSlaHours: m.highSlaHours ?? 8,
    mediumSlaHours: m.mediumSlaHours ?? 24,
    lowSlaHours: m.lowSlaHours ?? 72,
    autoAssign: m.autoAssign ?? false,
    autoClose: m.autoClose ?? true,
    autoCloseDays: m.autoCloseDays ?? 7,
    categories: (m.categories || "Billing,Technical,Shipping,General,Product Defect,Installation").split(",").join(", "),
    escalateAfterBreachHours: m.escalateAfterBreachHours ?? 2,
    customerPortal: m.customerPortal ?? false,
    satisfactionSurvey: m.satisfactionSurvey ?? false,
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Section title="SLA Timers" desc="Hours within which tickets must be resolved based on priority">
        <div className="grid grid-cols-4 gap-4">
          {[
            { key: "urgentSlaHours", label: "Urgent (hours)", color: "bg-red-50 border-red-200" },
            { key: "highSlaHours", label: "High (hours)", color: "bg-orange-50 border-orange-200" },
            { key: "mediumSlaHours", label: "Medium (hours)", color: "bg-yellow-50 border-yellow-200" },
            { key: "lowSlaHours", label: "Low (hours)", color: "bg-green-50 border-green-200" },
          ].map(f => (
            <div key={f.key} className={`p-3 rounded-xl border ${f.color}`}>
              <Label className="text-[11px] font-bold text-slate-600">{f.label}</Label>
              <Input type="number" value={(form as any)[f.key]} onChange={e => upd(f.key, Number(e.target.value))} className="h-8 text-sm mt-1.5 bg-white" min={1} />
            </div>
          ))}
        </div>
        <Field label="Escalate after SLA breach (hours)" hint="Notify manager N hours after breach">
          <Input type="number" value={form.escalateAfterBreachHours} onChange={e => upd("escalateAfterBreachHours", Number(e.target.value))} className="h-8 text-sm w-36" min={1} />
        </Field>
      </Section>

      <Section title="Ticket Categories" desc="Categories available when creating support tickets">
        <Field label="Categories" hint="Comma-separated">
          <Input value={form.categories} onChange={e => upd("categories", e.target.value)} className="h-8 text-sm" />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {form.categories.split(",").map((s: string) => s.trim()).filter(Boolean).map((s: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full border border-blue-100">{s}</span>
          ))}
        </div>
      </Section>

      <Section title="Automation">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={form.autoAssign} onCheckedChange={v => upd("autoAssign", v)} />
            <div><div className="text-xs font-semibold text-slate-700">Auto-assign tickets</div><div className="text-[11px] text-slate-400">Distribute new tickets to available support agents</div></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.autoClose} onCheckedChange={v => upd("autoClose", v)} />
            <div>
              <div className="text-xs font-semibold text-slate-700">Auto-close resolved tickets</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                After&nbsp;
                <Input type="number" value={form.autoCloseDays} onChange={e => upd("autoCloseDays", Number(e.target.value))} className="inline-flex h-6 w-14 text-xs px-2" />
                &nbsp;days with no customer reply
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.satisfactionSurvey} onCheckedChange={v => upd("satisfactionSurvey", v)} />
            <div><div className="text-xs font-semibold text-slate-700">Customer satisfaction survey</div><div className="text-[11px] text-slate-400">Send 1-5 star rating email when ticket is closed</div></div>
          </div>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("support", {
        ...form,
        categories: form.categories.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
      })} />
    </div>
  );
}

// ── PURCHASES TAB ─────────────────────────────────────────────────────────────
function PurchasesTab({ ms, saveModule, saving }: any) {
  const m = ms("purchases");
  const [form, setForm] = useState({
    defaultPaymentTerms: m.defaultPaymentTerms || "30",
    defaultTaxRate: m.defaultTaxRate ?? 18,
    approvalThreshold: m.approvalThreshold ?? 50000,
    requireQuotation: m.requireQuotation ?? false,
    threeWayMatch: m.threeWayMatch ?? false,
    autoReceive: m.autoReceive ?? false,
    vendorEvaluation: m.vendorEvaluation ?? true,
    paymentModes: (m.paymentModes || "NEFT,RTGS,Cheque,UPI,Cash").split(",").join(", "),
    minOrderQty: m.minOrderQty ?? 1,
    defaultLeadTimeDays: m.defaultLeadTimeDays ?? 7,
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Section title="Purchase Order Defaults">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Default Payment Terms" hint="e.g. 30, Net 45, Advance">
              <Input value={form.defaultPaymentTerms} onChange={e => upd("defaultPaymentTerms", e.target.value)} className="h-8 text-sm" />
            </Field>
            <Field label="Default Tax Rate (%)">
              <Input type="number" value={form.defaultTaxRate} onChange={e => upd("defaultTaxRate", Number(e.target.value))} className="h-8 text-sm" min={0} />
            </Field>
            <Field label="Default Lead Time (days)">
              <Input type="number" value={form.defaultLeadTimeDays} onChange={e => upd("defaultLeadTimeDays", Number(e.target.value))} className="h-8 text-sm" min={1} />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label="Approval Threshold (₹)" hint="POs above this need manager approval">
              <Input type="number" value={form.approvalThreshold} onChange={e => upd("approvalThreshold", Number(e.target.value))} className="h-8 text-sm" />
            </Field>
            <Field label="Minimum Order Quantity">
              <Input type="number" value={form.minOrderQty} onChange={e => upd("minOrderQty", Number(e.target.value))} className="h-8 text-sm" min={1} />
            </Field>
          </FieldRow>
          <Field label="Accepted Payment Modes" hint="Comma-separated">
            <Input value={form.paymentModes} onChange={e => upd("paymentModes", e.target.value)} className="h-8 text-sm" />
          </Field>
        </div>
      </Section>

      <Section title="Controls & Automation">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={form.requireQuotation} onCheckedChange={v => upd("requireQuotation", v)} />
            <div><div className="text-xs font-semibold text-slate-700">Require vendor quotation</div><div className="text-[11px] text-slate-400">Purchase request must be converted from a quotation</div></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.threeWayMatch} onCheckedChange={v => upd("threeWayMatch", v)} />
            <div><div className="text-xs font-semibold text-slate-700">3-way matching</div><div className="text-[11px] text-slate-400">PO, Receipt, and Vendor Invoice must all match before payment</div></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.autoReceive} onCheckedChange={v => upd("autoReceive", v)} />
            <div><div className="text-xs font-semibold text-slate-700">Auto-receive on delivery</div><div className="text-[11px] text-slate-400">Stock updated automatically when PO status changes to Received</div></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.vendorEvaluation} onCheckedChange={v => upd("vendorEvaluation", v)} />
            <div><div className="text-xs font-semibold text-slate-700">Vendor performance tracking</div><div className="text-[11px] text-slate-400">Track on-time delivery rate and quality scores</div></div>
          </div>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("purchases", {
        ...form,
        paymentModes: form.paymentModes.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
      })} />
    </div>
  );
}

// ── PAYROLL TAB ───────────────────────────────────────────────────────────────
function PayrollTab({ ms, saveModule, saving }: any) {
  const m = ms("payroll");
  const [form, setForm] = useState({
    pfRate: m.pfRate ?? 12,
    pfEmployerRate: m.pfEmployerRate ?? 12,
    esiRate: m.esiRate ?? 0.75,
    esiEmployerRate: m.esiEmployerRate ?? 3.25,
    esiThreshold: m.esiThreshold ?? 21000,
    professionalTax: m.professionalTax ?? 200,
    ptFrequency: m.ptFrequency || "monthly",
    hraPercent: m.hraPercent ?? 40,
    taAmount: m.taAmount ?? 1600,
    medicalAllowance: m.medicalAllowance ?? 1250,
    bonusMonths: m.bonusMonths ?? 1,
    payrollCycle: m.payrollCycle || "monthly",
    salaryDayOfMonth: m.salaryDayOfMonth ?? 1,
    autoGeneratePayslips: m.autoGeneratePayslips ?? false,
    salaryComponents: (m.salaryComponents || "Basic,HRA,Transport Allowance,Medical Allowance,Special Allowance").split(",").join(", "),
    deductionComponents: (m.deductionComponents || "PF,ESI,Professional Tax,TDS,Advance Recovery").split(",").join(", "),
  });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Section title="Statutory Deductions" desc="Government-mandated contributions (PF, ESI, PT)">
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-3">Provident Fund (PF)</h4>
            <FieldRow cols={2}>
              <Field label="Employee PF (%)" hint="Typically 12% of Basic">
                <Input type="number" value={form.pfRate} onChange={e => upd("pfRate", Number(e.target.value))} className="h-8 text-sm" min={0} step={0.5} />
              </Field>
              <Field label="Employer PF (%)" hint="Typically 12% of Basic">
                <Input type="number" value={form.pfEmployerRate} onChange={e => upd("pfEmployerRate", Number(e.target.value))} className="h-8 text-sm" min={0} step={0.5} />
              </Field>
            </FieldRow>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-3">ESI (Employee State Insurance)</h4>
            <FieldRow cols={3}>
              <Field label="Employee ESI (%)" hint="Typically 0.75%">
                <Input type="number" value={form.esiRate} onChange={e => upd("esiRate", Number(e.target.value))} className="h-8 text-sm" min={0} step={0.05} />
              </Field>
              <Field label="Employer ESI (%)" hint="Typically 3.25%">
                <Input type="number" value={form.esiEmployerRate} onChange={e => upd("esiEmployerRate", Number(e.target.value))} className="h-8 text-sm" min={0} step={0.05} />
              </Field>
              <Field label="ESI Wage Ceiling (₹)" hint="ESI not applicable above this gross">
                <Input type="number" value={form.esiThreshold} onChange={e => upd("esiThreshold", Number(e.target.value))} className="h-8 text-sm" />
              </Field>
            </FieldRow>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-3">Professional Tax (PT)</h4>
            <FieldRow cols={2}>
              <Field label="PT Amount (₹/month)">
                <Input type="number" value={form.professionalTax} onChange={e => upd("professionalTax", Number(e.target.value))} className="h-8 text-sm" />
              </Field>
              <Field label="PT Frequency">
                <Select value={form.ptFrequency} onValueChange={v => upd("ptFrequency", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biannual">Bi-annual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldRow>
          </div>
        </div>
      </Section>

      <Section title="Allowances" desc="Default allowance values used in salary structure">
        <FieldRow cols={3}>
          <Field label="HRA (%)" hint="% of Basic salary">
            <Input type="number" value={form.hraPercent} onChange={e => upd("hraPercent", Number(e.target.value))} className="h-8 text-sm" min={0} />
          </Field>
          <Field label="Transport Allowance (₹/month)">
            <Input type="number" value={form.taAmount} onChange={e => upd("taAmount", Number(e.target.value))} className="h-8 text-sm" />
          </Field>
          <Field label="Medical Allowance (₹/month)">
            <Input type="number" value={form.medicalAllowance} onChange={e => upd("medicalAllowance", Number(e.target.value))} className="h-8 text-sm" />
          </Field>
        </FieldRow>
        <div className="mt-4">
          <Field label="Annual Bonus (months of salary)" hint="Used in bonus payslip generation">
            <Input type="number" value={form.bonusMonths} onChange={e => upd("bonusMonths", Number(e.target.value))} className="h-8 text-sm w-28" min={0} step={0.5} />
          </Field>
        </div>
      </Section>

      <Section title="Payroll Cycle & Components">
        <div className="space-y-4">
          <FieldRow cols={3}>
            <Field label="Payroll Cycle">
              <Select value={form.payrollCycle} onValueChange={v => upd("payrollCycle", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Salary Credit Day" hint="Day of month salary is paid">
              <Input type="number" value={form.salaryDayOfMonth} onChange={e => upd("salaryDayOfMonth", Number(e.target.value))} className="h-8 text-sm" min={1} max={31} />
            </Field>
          </FieldRow>
          <Field label="Earning Components" hint="Comma-separated">
            <Input value={form.salaryComponents} onChange={e => upd("salaryComponents", e.target.value)} className="h-8 text-sm" />
          </Field>
          <Field label="Deduction Components" hint="Comma-separated">
            <Input value={form.deductionComponents} onChange={e => upd("deductionComponents", e.target.value)} className="h-8 text-sm" />
          </Field>
          <div className="flex items-center gap-3">
            <Switch checked={form.autoGeneratePayslips} onCheckedChange={v => upd("autoGeneratePayslips", v)} />
            <div><div className="text-xs font-semibold text-slate-700">Auto-generate payslips</div><div className="text-[11px] text-slate-400">Generate draft payslips for all employees at the start of each pay period</div></div>
          </div>
        </div>
      </Section>

      <SaveBtn loading={saving} onClick={() => saveModule("payroll", {
        ...form,
        salaryComponents: form.salaryComponents.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
        deductionComponents: form.deductionComponents.split(",").map((s: string) => s.trim()).filter(Boolean).join(","),
      })} />
    </div>
  );
}

// ── INTEGRATIONS TAB ──────────────────────────────────────────────────────────
function IntegrationsTab({ cs, save }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState(cs?.integrations?.indiaMart?.apiKey || "");
  const [schedule, setSchedule] = useState(cs?.integrations?.indiaMart?.schedule || "manual");
  const [syncing, setSyncing] = useState(false);

  const saveInt = () => save.mutate({
    integrations: { ...(cs?.integrations || {}), indiaMart: { apiKey, schedule, lastSyncedAt: cs?.integrations?.indiaMart?.lastSyncedAt } }
  });

  const syncNow = async () => {
    if (!apiKey) { toast({ title: "Missing API key", variant: "destructive" }); return; }
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/indiamart/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Sync failed");
      qc.invalidateQueries({ queryKey: ["/api/company-settings"] });
      qc.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "IndiaMART Sync Complete", description: `Imported ${json.created} lead(s)` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-5">
      <Section title="IndiaMART Integration" desc="Import leads directly from your IndiaMART account">
        <div className="space-y-4">
          <FieldRow cols={2}>
            <Field label="API Key (glusr_crm_key)">
              <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="mRy2F7pp4X/ETPet..." className="h-8 text-sm font-mono" />
            </Field>
            <Field label="Auto-Sync Schedule">
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual only</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldRow>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last synced: {cs?.integrations?.indiaMart?.lastSyncedAt ? new Date(cs.integrations.indiaMart.lastSyncedAt).toLocaleString() : "Never"}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveInt} disabled={save.isPending} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5">
              {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
            </Button>
            <Button onClick={syncNow} disabled={syncing} variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarClock className="h-3 w-3" />}Sync Now
            </Button>
          </div>
        </div>
      </Section>

      <Section title="More Integrations" desc="Coming soon">
        <div className="grid grid-cols-3 gap-3">
          {["JustDial", "Tally ERP", "Zoho Mail", "WhatsApp Business", "Razorpay", "Shiprocket"].map(name => (
            <div key={name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-xs font-semibold text-slate-600">{name}</span>
              <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">Soon</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
