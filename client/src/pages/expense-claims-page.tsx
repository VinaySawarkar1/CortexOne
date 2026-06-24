import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Loader2, CheckCircle2, XCircle, Banknote, FileDown, Paperclip,
  Scissors, Send, ArrowLeft, MoreHorizontal, ChevronRight, Upload,
  Receipt, Clock, Users, TrendingUp, IndianRupee, Eye, Pencil,
  AlertTriangle, FileText, Filter,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const INR = (v: number) => `₹${(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const CATEGORIES = [
  "Travel", "Accommodation", "Meals & Entertainment", "Communication",
  "Office Supplies", "Training & Education", "Marketing", "Utilities",
  "Vehicle", "Medical", "Client Gifts", "Software & Subscriptions", "Other",
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; step: number }> = {
  draft:    { label: "Draft",    color: "#64748b", bg: "#f1f5f9", step: 0 },
  submitted:{ label: "Submitted",color: "#2563eb", bg: "#eff6ff", step: 1 },
  approved: { label: "Approved", color: "#059669", bg: "#ecfdf5", step: 2 },
  posted:   { label: "Posted",   color: "#7c3aed", bg: "#f5f3ff", step: 3 },
  paid:     { label: "Paid",     color: "#0891b2", bg: "#ecfeff", step: 4 },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", step: -1 },
};

const STEPS = ["Draft", "Approved", "Posted", "Paid"];

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ color: m.color, background: m.bg }}>{m.label}</span>;
}

function StatusStepper({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  if (status === "rejected") return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
      <XCircle className="h-4 w-4 text-red-500" /><span className="text-xs font-bold text-red-600">Rejected</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const active = m.step === i;
        const done = m.step > i;
        return (
          <div key={s} className="flex items-center gap-1">
            <div className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              active ? "bg-indigo-600 text-white shadow-sm" :
              done ? "bg-indigo-100 text-indigo-700" :
              "bg-slate-100 text-slate-400"
            }`}>{s}</div>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "1a" }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <div className="text-lg font-extrabold text-slate-800">{value}</div>
        <div className="text-[11px] text-slate-500 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ── Expense Form (create/edit) ────────────────────────────────────────────────
function ExpenseForm({ initial, employees, onSave, onCancel, loading }: {
  initial?: any; employees: any[]; onSave: (v: any) => void; onCancel: () => void; loading: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: initial?.description || initial?.name || "",
    category: initial?.category || "",
    expenseDate: initial?.expenseDate || today,
    totalAmount: initial?.totalAmount || 0,
    taxAmount: initial?.taxAmount || 0,
    currency: initial?.currency || "INR",
    employeeName: initial?.employeeName || "",
    paidBy: initial?.paidBy || "employee",
    notes: initial?.notes || "",
    receiptData: initial?.receiptData || "",
    splitWith: initial?.splitWith || "",
    status: initial?.status || "draft",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const fileRef = useRef<HTMLInputElement>(null);
  const [isSplit, setIsSplit] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => set("receiptData", ev.target?.result as string); r.readAsDataURL(f);
  };

  const submit = () => {
    if (!form.description.trim()) return;
    onSave({ ...form, name: form.description, totalAmount: Number(form.totalAmount), taxAmount: Number(form.taxAmount) });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mr-2">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <Button size="sm" onClick={submit} disabled={loading} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save
        </Button>
        {initial?.status === "draft" && (
          <Button size="sm" variant="outline" onClick={() => { set("status", "submitted"); setTimeout(submit, 50); }} disabled={loading} className="h-7 text-xs gap-1">
            <Send className="h-3 w-3" />Submit
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => { fileRef.current?.click(); }} className="h-7 text-xs gap-1">
          <Paperclip className="h-3 w-3" />Attach Receipt
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsSplit(s => !s)} className="h-7 text-xs gap-1">
          <Scissors className="h-3 w-3" />Split Expense
        </Button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
        <div className="ml-auto">
          <StatusStepper status={form.status} />
        </div>
      </div>

      {/* Form body */}
      <div className="p-6 space-y-6">
        {/* Description - big placeholder like Odoo */}
        <div>
          <input
            value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="e.g. Lunch with Customer"
            className="w-full text-2xl font-semibold text-slate-800 placeholder-slate-300 border-0 border-b-2 border-slate-100 focus:border-indigo-400 outline-none pb-2 bg-transparent transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-x-16 gap-y-4">
          {/* Left column */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0 pt-1.5">Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="h-8 text-sm border-0 border-b border-slate-200 rounded-none px-0 focus:border-indigo-400 bg-transparent">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0">Total</Label>
              <div className="flex items-center gap-2 flex-1">
                <Input type="number" value={form.totalAmount} onChange={e => set("totalAmount", e.target.value)}
                  className="h-8 text-sm border-0 border-b border-slate-200 rounded-none px-0 focus:border-indigo-400 bg-transparent w-32" />
                <Select value={form.currency} onValueChange={v => set("currency", v)}>
                  <SelectTrigger className="h-8 text-xs border-0 rounded-none px-2 bg-transparent text-orange-600 font-bold w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["INR","USD","EUR","GBP","AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0">Included taxes</Label>
              <div className="flex items-center gap-1 text-slate-600">
                <IndianRupee className="h-3.5 w-3.5" />
                <Input type="number" value={form.taxAmount} onChange={e => set("taxAmount", e.target.value)}
                  className="h-8 text-sm border-0 border-b border-slate-200 rounded-none px-0 focus:border-indigo-400 bg-transparent w-24" />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0 pt-1.5">Employee</Label>
              {employees.length > 0 ? (
                <Select value={form.employeeName} onValueChange={v => set("employeeName", v)}>
                  <SelectTrigger className="h-8 text-sm border-0 border-b border-slate-200 rounded-none px-0 focus:border-indigo-400 bg-transparent">
                    <SelectValue placeholder="Select employee…" />
                  </SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.employeeName} onChange={e => set("employeeName", e.target.value)}
                  className="h-8 text-sm border-0 border-b border-slate-200 rounded-none px-0 focus:border-indigo-400 bg-transparent" />
              )}
            </div>

            {/* Paid By */}
            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0 pt-1">Paid By</Label>
              <div className="space-y-1.5">
                {[{ v: "employee", l: "Employee (to reimburse)" }, { v: "company", l: "Company" }].map(opt => (
                  <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${form.paidBy === opt.v ? "border-indigo-600" : "border-slate-300"}`}>
                      {form.paidBy === opt.v && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                    </div>
                    <span className="text-sm text-slate-700" onClick={() => set("paidBy", opt.v)}>{opt.l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0">Expense Date</Label>
              <Input type="date" value={form.expenseDate} onChange={e => set("expenseDate", e.target.value)}
                className="h-8 text-sm border-0 border-b border-slate-200 rounded-none px-0 focus:border-indigo-400 bg-transparent" />
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-500 w-28 flex-shrink-0 pt-1">Manager</Label>
              <span className="text-sm text-slate-400 italic pt-1">Auto-validation</span>
            </div>

            {/* Receipt attachment preview */}
            {form.receiptData && (
              <div className="mt-2">
                <Label className="text-xs text-slate-500 mb-1.5 block">Receipt Attached</Label>
                {form.receiptData.startsWith("data:image") ? (
                  <img src={form.receiptData} alt="Receipt" className="max-h-40 rounded-lg border border-slate-200 object-contain" />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <FileText className="h-4 w-4 text-indigo-500" />PDF Receipt attached
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Split Expense panel */}
        {isSplit && (
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
            <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5" />Split Expense</div>
            <div className="flex items-center gap-3">
              <Label className="text-xs text-slate-600 w-28">Split with</Label>
              <Input value={form.splitWith} onChange={e => set("splitWith", e.target.value)} placeholder="Employee names comma-separated" className="h-8 text-xs" />
            </div>
            <p className="text-[11px] text-indigo-600">The expense will be divided equally among all participants.</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
            placeholder="Notes…" className="text-sm resize-none border-0 border-b border-slate-100 rounded-none px-0 focus:border-indigo-300 bg-transparent" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpenseClaimsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterView, setFilterView] = useState("my"); // "my" | "all"
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/expense-claims"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/expense-claims", data)).json(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/expense-claims"] }); setSelected(d); setView("detail"); toast({ title: "Expense saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/expense-claims/${id}`, data)).json(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/expense-claims"] }); setSelected(d); setView("detail"); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/expense-claims/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expense-claims"] }); setView("list"); setSelected(null); toast({ title: "Deleted" }); },
  });

  const changeStatus = (id: number, status: string) =>
    updateM.mutate({ id, data: { status } });

  const filtered = items.filter(i => {
    const matchSearch = (i.name || i.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.employeeName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // KPIs
  const total = items.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const pending = items.filter(i => i.status === "submitted").length;
  const toReimburse = items.filter(i => i.status === "approved" && i.paidBy === "employee").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const paidThisMonth = items.filter(i => {
    if (i.status !== "paid") return false;
    const d = new Date(i.expenseDate || i.createdAt);
    const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, i) => s + (i.totalAmount || 0), 0);

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  if (view === "form") return (
    <Layout>
      <PageHeader title={selected ? "Edit Expense" : "New Expense"} subtitle="Expenses · My Expenses · New" />
      <div className="p-6">
        <ExpenseForm
          initial={selected}
          employees={employees}
          loading={createM.isPending || updateM.isPending}
          onCancel={() => { setView(selected ? "detail" : "list"); }}
          onSave={data => {
            if (selected?.id) updateM.mutate({ id: selected.id, data });
            else createM.mutate(data);
          }}
        />
      </div>
    </Layout>
  );

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const s = selected;
    const meta = STATUS_META[s.status] || STATUS_META.draft;
    return (
      <Layout>
        <PageHeader title={s.description || s.name || "Expense"} subtitle={`Expenses · ${s.employeeName || "—"}`} />
        <div className="p-6 space-y-4">
          {/* Action bar */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-5 py-3 shadow-sm">
            <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mr-2">
              <ArrowLeft className="h-3.5 w-3.5" />Back
            </button>
            <div className="h-4 w-px bg-slate-200" />
            {s.status === "draft" && <>
              <Button size="sm" onClick={() => { setView("form"); }} className="h-7 text-xs gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"><Pencil className="h-3 w-3" />Edit</Button>
              <Button size="sm" onClick={() => changeStatus(s.id, "submitted")} className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"><Send className="h-3 w-3" />Submit</Button>
            </>}
            {s.status === "submitted" && <>
              <Button size="sm" onClick={() => changeStatus(s.id, "approved")} className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="h-3 w-3" />Approve</Button>
              <Button size="sm" onClick={() => changeStatus(s.id, "rejected")} variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"><XCircle className="h-3 w-3" />Refuse</Button>
            </>}
            {s.status === "approved" && <>
              <Button size="sm" onClick={() => changeStatus(s.id, "posted")} className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"><FileText className="h-3 w-3" />Post Journal Entry</Button>
            </>}
            {s.status === "posted" && <>
              <Button size="sm" onClick={() => changeStatus(s.id, "paid")} className="h-7 text-xs gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"><Banknote className="h-3 w-3" />Register Payment</Button>
            </>}
            <Button size="sm" variant="ghost" onClick={() => window.open(`/api/expense-claims/${s.id}/download-pdf`, "_blank")} className="h-7 text-xs gap-1 ml-auto"><FileDown className="h-3 w-3" />Download PDF</Button>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this expense?")) deleteM.mutate(s.id); }} className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">Delete</Button>
            <div className="ml-2"><StatusStepper status={s.status} /></div>
          </div>

          {/* Detail card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">{s.description || s.name}</h2>
            <div className="grid grid-cols-2 gap-x-16 gap-y-4">
              <div className="space-y-3">
                {[
                  { l: "Category", v: s.category || "—" },
                  { l: "Total", v: <span className="font-bold text-slate-800">{INR(s.totalAmount)} <span className="text-orange-500 font-bold ml-1">{s.currency || "INR"}</span></span> },
                  { l: "Included Taxes", v: INR(s.taxAmount || 0) },
                  { l: "Employee", v: s.employeeName || "—" },
                  { l: "Paid By", v: s.paidBy === "employee" ? "Employee (to reimburse)" : "Company" },
                ].map(row => (
                  <div key={row.l} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-32">{row.l}</span>
                    <span className="text-sm text-slate-700">{row.v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { l: "Expense Date", v: s.expenseDate ? new Date(s.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" },
                  { l: "Status", v: <StatusBadge status={s.status} /> },
                ].map(row => (
                  <div key={row.l} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-32">{row.l}</span>
                    <span className="text-sm text-slate-700">{row.v}</span>
                  </div>
                ))}
                {s.receiptData && (
                  <div className="mt-3">
                    <span className="text-sm text-slate-500">Receipt</span>
                    <div className="mt-2">
                      {s.receiptData.startsWith("data:image") ? (
                        <img src={s.receiptData} alt="Receipt" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                          <FileText className="h-4 w-4 text-indigo-500" />PDF Receipt attached
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {s.notes && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</span>
                <p className="mt-1.5 text-sm text-slate-700">{s.notes}</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <Layout>
      <PageHeader title="Expenses" subtitle="Employee expense management & reimbursements"
        actions={
          <Button onClick={() => { setSelected(null); setView("form"); }} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />New Expense
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          <KCard label="Total Expenses" value={INR(total)} icon={Receipt} color="#6366f1" />
          <KCard label="Pending Approval" value={pending} icon={Clock} color="#f59e0b" />
          <KCard label="To Reimburse" value={INR(toReimburse)} icon={AlertTriangle} color="#dc2626" />
          <KCard label="Paid This Month" value={INR(paidThisMonth)} icon={Banknote} color="#059669" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2.5">
          {/* My / All toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {[{ v: "my", l: "My Expenses" }, { v: "all", l: "All Expenses" }].map(t => (
              <button key={t.v} onClick={() => setFilterView(t.v)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${filterView === t.v ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t.l}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {["all", "draft", "submitted", "approved", "posted", "paid", "rejected"].map(s => {
              const m = STATUS_META[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all ${filterStatus === s ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  {s === "all" ? "All" : (m?.label || s)}
                </button>
              );
            })}
          </div>

          <div className="ml-auto">
            <Input placeholder="Search expenses…" value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs w-48" />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
            <Receipt className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">No expenses found</p>
            <Button onClick={() => { setSelected(null); setView("form"); }} size="sm" className="mt-4 bg-indigo-600 text-white text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />Create your first expense
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Paid By</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setView("detail"); }}>
                    <td>
                      <div className="font-semibold text-slate-800 text-xs">{item.description || item.name || "—"}</div>
                      {item.notes && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{item.notes}</div>}
                    </td>
                    <td className="text-xs">{item.employeeName || "—"}</td>
                    <td className="text-xs">{item.category || "—"}</td>
                    <td className="text-xs text-slate-500">{item.expenseDate ? new Date(item.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                    <td>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.paidBy === "employee" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                        {item.paidBy === "employee" ? "Employee" : "Company"}
                      </span>
                    </td>
                    <td><span className="font-bold text-slate-800 text-xs">{INR(item.totalAmount)}</span></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {item.status === "draft" && (
                          <button onClick={() => changeStatus(item.id, "submitted")} className="h-6 px-2 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">Submit</button>
                        )}
                        {item.status === "submitted" && (
                          <button onClick={() => changeStatus(item.id, "approved")} className="h-6 px-2 text-[10px] font-semibold bg-green-50 text-green-700 rounded hover:bg-green-100">Approve</button>
                        )}
                        {item.status === "approved" && (
                          <button onClick={() => changeStatus(item.id, "posted")} className="h-6 px-2 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded hover:bg-purple-100">Post</button>
                        )}
                        {item.status === "posted" && (
                          <button onClick={() => changeStatus(item.id, "paid")} className="h-6 px-2 text-[10px] font-semibold bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100">Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
