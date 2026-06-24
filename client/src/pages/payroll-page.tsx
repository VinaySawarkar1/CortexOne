import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Trash2, Eye, FileDown, Users, Plus, CheckSquare, Square } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const inr = (v: any) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v) || 0);

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  paid:      "bg-green-100 text-green-700",
};

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-50 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{inr(value)}</span>
    </div>
  );
}

export default function PayrollPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [lopDays, setLopDays] = useState("0");
  const [viewSlip, setViewSlip] = useState<any>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(String(now.getMonth() + 1));
  const [bulkYear, setBulkYear] = useState(String(now.getFullYear()));
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: payslips = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/payslips"] });

  const empName = (id: any) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName || ""}`.trim() : `#${id}`;
  };

  const generateM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/payroll/generate", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payslips"] }); toast({ title: "Payslip generated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/payroll/generate-bulk", data)).json(),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["/api/payslips"] });
      setBulkOpen(false);
      toast({ title: `Bulk payroll done — ${res.generated || 0} payslips created` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/payslips/${id}`, data)).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/payslips"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/payslips/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/payslips"] }),
  });

  const generate = () => {
    if (!employeeId) { toast({ title: "Select an employee", variant: "destructive" }); return; }
    generateM.mutate({ employeeId: Number(employeeId), periodMonth: Number(month), periodYear: Number(year), lopDays: Number(lopDays) || 0 });
  };

  const toggleEmp = (id: number) => {
    setSelectedEmpIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selectedEmpIds.size === employees.length) setSelectedEmpIds(new Set());
    else setSelectedEmpIds(new Set(employees.map((e: any) => e.id)));
  };

  const runBulk = () => {
    const ids = selectedEmpIds.size > 0 ? Array.from(selectedEmpIds) : undefined;
    bulkM.mutate({ periodMonth: Number(bulkMonth), periodYear: Number(bulkYear), employeeIds: ids });
  };

  const filtered = payslips.filter(p => statusFilter === "all" || p.status === statusFilter);

  // KPIs
  const paidSlips = payslips.filter(p => p.status === "paid");
  const totalPayroll = paidSlips.reduce((s: number, p: any) => s + (Number(p.netPay) || 0), 0);
  const thisMonth = payslips.filter(p => p.periodMonth === now.getMonth() + 1 && p.periodYear === now.getFullYear());

  return (
    <Layout>
      <PageHeader
        title="Payroll"
        subtitle="Generate and manage employee payslips"
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setSelectedEmpIds(new Set()); setBulkOpen(true); }}>
              <Users className="h-3.5 w-3.5 mr-1" />Bulk Payroll
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-card-value">{employees.length}</div><div className="stat-card-label">Total Employees</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#6366f1" }}>{thisMonth.length}</div><div className="stat-card-label">This Month Payslips</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#059669" }}>{inr(totalPayroll)}</div><div className="stat-card-label">Total Paid (YTD)</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#f59e0b" }}>{payslips.filter(p => p.status === "draft").length}</div><div className="stat-card-label">Pending Approval</div></div>
        </div>

        {/* Single payslip generator */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />Generate Single Payslip
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Year</Label>
              <Input type="number" className="h-8 text-xs mt-1" value={year} onChange={e => setYear(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">LOP Days</Label>
              <Input type="number" className="h-8 text-xs mt-1" value={lopDays} onChange={e => setLopDays(e.target.value)} min="0" />
            </div>
            <div>
              <Button className="h-8 text-xs w-full mt-5" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={generate} disabled={generateM.isPending}>
                {generateM.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Payslips table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No payslips yet</td></tr>
                ) : filtered.map((p: any) => {
                  const ded = (Number(p.pf) || 0) + (Number(p.tax) || 0) + (Number(p.otherDeductions) || 0);
                  const ss = STATUS_STYLE[p.status] || STATUS_STYLE.draft;
                  return (
                    <tr key={p.id}>
                      <td className="font-medium text-slate-800 text-xs">{empName(p.employeeId)}</td>
                      <td className="text-xs text-slate-600">{MONTHS[(p.periodMonth || 1) - 1]} {p.periodYear}</td>
                      <td className="text-xs text-slate-700">{inr(p.grossPay)}</td>
                      <td className="text-xs text-red-600">{inr(ded)}</td>
                      <td className="text-xs font-bold text-indigo-700">{inr(p.netPay)}</td>
                      <td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ss}`}>{p.status}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewSlip(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Eye className="h-3.5 w-3.5" /></button>
                          {p.status === "draft" && (
                            <button onClick={() => updateM.mutate({ id: p.id, data: { status: "confirmed" } })} className="text-[10px] font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Confirm</button>
                          )}
                          {p.status === "confirmed" && (
                            <button onClick={() => updateM.mutate({ id: p.id, data: { status: "paid", paidOn: new Date().toISOString().slice(0, 10) } })} className="text-[10px] font-semibold px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">Mark Paid</button>
                          )}
                          <button onClick={() => window.open(`/api/payroll/${p.id}/download-pdf`, "_blank")} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600"><FileDown className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteM.mutate(p.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip detail dialog */}
      <Dialog open={!!viewSlip} onOpenChange={o => !o && setViewSlip(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip — {viewSlip && empName(viewSlip.employeeId)}</DialogTitle>
            <DialogDescription>{viewSlip && `${MONTHS[(viewSlip.periodMonth || 1) - 1]} ${viewSlip.periodYear}`}</DialogDescription>
          </DialogHeader>
          {viewSlip && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Earnings</p>
                <Row label="Basic" value={viewSlip.basic} />
                <Row label="HRA" value={viewSlip.hra} />
                <Row label="Allowances" value={viewSlip.allowances} />
                <Row label="Other Earnings" value={viewSlip.otherEarnings} />
                <div className="flex justify-between py-1.5 text-xs font-bold text-slate-800 border-t border-slate-100"><span>Gross Pay</span><span>{inr(viewSlip.grossPay)}</span></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Deductions</p>
                <Row label="Provident Fund (PF)" value={viewSlip.pf} />
                <Row label="Tax / PT" value={viewSlip.tax} />
                <Row label="Other" value={viewSlip.otherDeductions} />
              </div>
              {Number(viewSlip.lopDays) > 0 && <p className="text-xs text-slate-500">Loss of pay: {viewSlip.lopDays} day(s)</p>}
              <div className="flex justify-between py-2.5 border-t-2 border-indigo-100 text-sm font-extrabold text-indigo-700">
                <span>Net Pay</span><span>{inr(viewSlip.netPay)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Payroll Modal */}
      <Dialog open={bulkOpen} onOpenChange={v => !v && setBulkOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Payroll Generation</DialogTitle>
            <DialogDescription>Generate payslips for all or selected employees for a given month.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Month</Label>
                <Select value={bulkMonth} onValueChange={setBulkMonth}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Year</Label>
                <Input type="number" className="h-8 text-xs mt-1" value={bulkYear} onChange={e => setBulkYear(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-slate-600 font-semibold">Select Employees</Label>
                <button onClick={toggleAll} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  {selectedEmpIds.size === employees.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {selectedEmpIds.size === employees.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No active employees</p>
                ) : employees.map((e: any) => (
                  <div key={e.id} onClick={() => toggleEmp(e.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-indigo-50/50 transition-colors ${selectedEmpIds.has(e.id) ? "bg-indigo-50" : ""}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedEmpIds.has(e.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                      {selectedEmpIds.has(e.id) && <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{e.firstName} {e.lastName}</div>
                      <div className="text-[10px] text-slate-400">{e.employeeCode} · {e.email}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {selectedEmpIds.size === 0 ? "No selection = generate for all active employees" : `${selectedEmpIds.size} employee(s) selected`}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={runBulk} disabled={bulkM.isPending}>
                {bulkM.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Generate {selectedEmpIds.size > 0 ? `${selectedEmpIds.size}` : "All"} Payslips
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
