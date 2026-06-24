import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import {
  TrendingUp, Users, Package, IndianRupee, Loader2, Download, RefreshCw,
  AlertTriangle, ShoppingCart, Headphones, FileText, Briefcase, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const INR = (v: number) => `₹${(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#84cc16","#f97316","#3b82f6"];

const PERIODS = [
  { v: "today", l: "Today" },
  { v: "last7days", l: "Last 7 days" },
  { v: "last30days", l: "Last 30 days" },
  { v: "thisMonth", l: "This month" },
  { v: "lastMonth", l: "Last month" },
  { v: "lastQuarter", l: "Last quarter" },
  { v: "lastYear", l: "Last 12 months" },
];

function exportCSV(rows: any[], filename: string) {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename + ".csv"; a.click();
}

function KPI({ label, value, sub, color }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-value" style={{ color: color || "#1e293b" }}>{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHead({ title, onExport, rows }: { title: string; onExport?: () => void; rows?: any[] }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-bold text-slate-700">{title}</span>
      {onExport && rows?.length ? (
        <button onClick={onExport} className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold">
          <Download className="h-3 w-3" />Export CSV
        </button>
      ) : null}
    </div>
  );
}

function DrillTable({ cols, rows, loading }: { cols: { key: string; label: string; fmt?: (v: any) => string }[]; rows: any[]; loading?: boolean }) {
  const [show, setShow] = useState(false);
  if (!rows?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button onClick={() => setShow(s => !s)} className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
        <span>Detailed Records ({rows.length})</span>
        {show ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {show && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="pro-table">
            <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin text-indigo-500 mx-auto" /></td></tr>
              ) : rows.slice(0, 100).map((r, i) => (
                <tr key={i}>{cols.map(c => <td key={c.key} className="text-xs text-slate-700">{c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? "—")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">{children}</div>;
}

function FItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</Label>{children}</div>;
}

// ── Chart panel ───────────────────────────────────────────────────────────────
function ChartPanel({ title, children, onExport, rows }: { title: string; children: React.ReactNode; onExport?: () => void; rows?: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <SectionHead title={title} onExport={onExport} rows={rows} />
      {children}
    </div>
  );
}

function Empty({ icon: Icon, msg }: { icon: any; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-100">
      <Icon className="h-10 w-10 text-slate-200 mb-3" />
      <p className="text-sm text-slate-400">{msg}</p>
    </div>
  );
}

// ── TAB: SALES ────────────────────────────────────────────────────────────────
function SalesTab() {
  const [f, setF] = useState({ period: "last30days", dateFrom: "", dateTo: "", status: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/sales", params], queryFn: async () => (await fetch(`/api/reports/sales?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Period"><Select value={f.period} onValueChange={v => upd("period", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="From"><Input type="date" className="h-8 text-xs w-36" value={f.dateFrom} onChange={e => upd("dateFrom", e.target.value)} /></FItem>
        <FItem label="To"><Input type="date" className="h-8 text-xs w-36" value={f.dateTo} onChange={e => upd("dateTo", e.target.value)} /></FItem>
        <FItem label="Status"><Select value={f.status} onValueChange={v => upd("status", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["draft","confirmed","delivered","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "sales-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={TrendingUp} msg="No sales data" /> : (
        <>
          <div className="grid grid-cols-5 gap-3">
            <KPI label="Total Revenue" value={INR(data.summary?.totalRevenue)} color="#6366f1" />
            <KPI label="Total Orders" value={data.summary?.totalOrders} color="#059669" />
            <KPI label="Total Invoiced" value={INR(data.summary?.totalInvoiced)} color="#7c3aed" />
            <KPI label="Avg Order Value" value={INR(data.summary?.avgOrderValue)} color="#0891b2" />
            <KPI label="Cancelled" value={data.summary?.cancelled} color="#dc2626" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ChartPanel title="Revenue Trend" onExport={() => exportCSV(data.trend, "sales-trend")} rows={data.trend} >
              <div className="col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.trend}>
                  <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any, n) => [n === "revenue" ? INR(v) : INR(v), n === "revenue" ? "Revenue" : "Invoiced"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revG)" name="revenue" />
                  <Area type="monotone" dataKey="invoiced" stroke="#8b5cf6" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="invoiced" />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </ChartPanel>
            <ChartPanel title="Order Volume" rows={data.trend}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4,4,0,0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Status" rows={data.byStatus}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byStatus||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Top Customers by Revenue" onExport={() => exportCSV(data.topCustomers, "top-customers")} rows={data.topCustomers}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topCustomers?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={100} />
                <Tooltip formatter={(v: any) => [INR(v), "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0,4,4,0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <DrillTable
            rows={data.rows || []}
            cols={[
              { key: "orderNumber", label: "Order #" },
              { key: "customerName", label: "Customer" },
              { key: "date", label: "Date", fmt: v => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
              { key: "status", label: "Status" },
              { key: "amount", label: "Amount", fmt: v => INR(v) },
            ]}
          />
        </>
      )}
    </div>
  );
}

// ── TAB: LEADS/CRM ────────────────────────────────────────────────────────────
function LeadsTab() {
  const [f, setF] = useState({ period: "lastYear", dateFrom: "", dateTo: "", status: "all", source: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/leads", params], queryFn: async () => (await fetch(`/api/reports/leads?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Period"><Select value={f.period} onValueChange={v => upd("period", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="From"><Input type="date" className="h-8 text-xs w-36" value={f.dateFrom} onChange={e => upd("dateFrom", e.target.value)} /></FItem>
        <FItem label="To"><Input type="date" className="h-8 text-xs w-36" value={f.dateTo} onChange={e => upd("dateTo", e.target.value)} /></FItem>
        <FItem label="Status"><Select value={f.status} onValueChange={v => upd("status", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["new","contacted","qualified","proposal","negotiation","won","lost"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Source"><Select value={f.source} onValueChange={v => upd("source", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["website","referral","social","email","cold_call","event","other"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "leads-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={Users} msg="No lead data" /> : (
        <>
          <div className="grid grid-cols-5 gap-3">
            <KPI label="Total Leads" value={data.summary?.total} color="#6366f1" />
            <KPI label="Won" value={data.summary?.won} color="#059669" sub={INR(data.summary?.wonValue)} />
            <KPI label="Lost" value={data.summary?.lost} color="#dc2626" />
            <KPI label="In Pipeline" value={data.summary?.pipeline} color="#f59e0b" />
            <KPI label="Conversion Rate" value={`${data.summary?.conversionRate}%`} color="#7c3aed" sub={`Pipeline: ${INR(data.summary?.totalValue)}`} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ChartPanel title="Conversion Funnel" rows={data.funnel}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.funnel} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: "#94a3b8" }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0,4,4,0]} name="Leads">
                    {(data.funnel||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Source" rows={data.bySource}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.bySource} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Status" rows={data.byStatus}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byStatus||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Monthly Lead Volume — Won vs Lost" rows={data.monthly}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" fill="#e0e7ff" radius={[4,4,0,0]} name="Total" />
                <Bar dataKey="won" fill="#059669" radius={[4,4,0,0]} name="Won" />
                <Bar dataKey="lost" fill="#dc2626" radius={[4,4,0,0]} name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Assigned To" rows={data.byAssigned}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.byAssigned?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={90} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[0,4,4,0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <DrillTable rows={data.rows || []} cols={[
            { key: "name", label: "Lead" },
            { key: "company", label: "Company" },
            { key: "status", label: "Status" },
            { key: "source", label: "Source" },
            { key: "assignedTo", label: "Assigned To" },
            { key: "value", label: "Value", fmt: v => INR(v) },
            { key: "date", label: "Date", fmt: v => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
          ]} />
        </>
      )}
    </div>
  );
}

// ── TAB: FINANCE ──────────────────────────────────────────────────────────────
function FinanceTab() {
  const [f, setF] = useState({ period: "lastYear", dateFrom: "", dateTo: "", status: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/finance", params], queryFn: async () => (await fetch(`/api/reports/finance?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Period"><Select value={f.period} onValueChange={v => upd("period", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="From"><Input type="date" className="h-8 text-xs w-36" value={f.dateFrom} onChange={e => upd("dateFrom", e.target.value)} /></FItem>
        <FItem label="To"><Input type="date" className="h-8 text-xs w-36" value={f.dateTo} onChange={e => upd("dateTo", e.target.value)} /></FItem>
        <FItem label="Status"><Select value={f.status} onValueChange={v => upd("status", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["draft","sent","paid","overdue","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "finance-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={IndianRupee} msg="No finance data" /> : (
        <>
          <div className="grid grid-cols-5 gap-3">
            <KPI label="Total Invoiced" value={INR(data.summary?.totalInvoiced)} color="#6366f1" />
            <KPI label="Collected" value={INR(data.summary?.totalPaid)} color="#059669" />
            <KPI label="Outstanding" value={INR(data.summary?.outstanding)} color="#dc2626" />
            <KPI label="Overdue Count" value={data.summary?.overdueCount} color="#f59e0b" />
            <KPI label="Total Invoices" value={data.summary?.invoiceCount} color="#7c3aed" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ChartPanel title="Monthly: Invoiced vs Collected" rows={data.monthly}>
              <div className="col-span-2" style={{}}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [INR(v)]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="invoiced" fill="#6366f1" radius={[4,4,0,0]} name="Invoiced" />
                  <Bar dataKey="collected" fill="#10b981" radius={[4,4,0,0]} name="Collected" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartPanel>
            <ChartPanel title="AR Aging" rows={data.aging}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.aging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [INR(v), "Outstanding"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="amount" radius={[4,4,0,0]} name="Amount">
                    {(data.aging||[]).map((_: any, i: number) => <Cell key={i} fill={["#10b981","#f59e0b","#f97316","#dc2626"][i]||"#6366f1"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Status" rows={data.byStatus}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byStatus||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip formatter={(v: any) => [INR(v)]} contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Top Debtors (Outstanding)" onExport={() => exportCSV(data.topDebtors, "top-debtors")} rows={data.topDebtors}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.topDebtors?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={100} />
                <Tooltip formatter={(v: any) => [INR(v), "Outstanding"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="outstanding" fill="#ef4444" radius={[0,4,4,0]} name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <DrillTable rows={data.rows || []} cols={[
            { key: "invoiceNumber", label: "Invoice #" },
            { key: "customerName", label: "Customer" },
            { key: "date", label: "Date", fmt: v => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
            { key: "dueDate", label: "Due", fmt: v => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
            { key: "status", label: "Status" },
            { key: "amount", label: "Amount", fmt: v => INR(v) },
            { key: "paid", label: "Paid", fmt: v => INR(v) },
          ]} />
        </>
      )}
    </div>
  );
}

// ── TAB: INVENTORY ────────────────────────────────────────────────────────────
function InventoryTab() {
  const { data: allItems = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const categories = Array.from(new Set((allItems as any[]).map(i => i.category).filter(Boolean)));
  const [f, setF] = useState({ category: "all", stockLevel: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/inventory", params], queryFn: async () => (await fetch(`/api/reports/inventory?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Category"><Select value={f.category} onValueChange={v => upd("category", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Stock Level"><Select value={f.stockLevel} onValueChange={v => upd("stockLevel", v)}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="ok">In Stock</SelectItem><SelectItem value="low">Low Stock</SelectItem><SelectItem value="out">Out of Stock</SelectItem></SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "inventory-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={Package} msg="No inventory data" /> : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <KPI label="Total SKUs" value={data.summary?.total} color="#6366f1" />
            <KPI label="Filtered Items" value={data.summary?.filtered} color="#0891b2" />
            <KPI label="Low Stock" value={data.summary?.lowStock} color="#f59e0b" />
            <KPI label="Out of Stock" value={data.summary?.outOfStock} color="#dc2626" />
          </div>
          <KPI label="Total Inventory Value" value={INR(data.summary?.totalValue)} color="#059669" />

          <div className="grid grid-cols-2 gap-4">
            <ChartPanel title="Value by Category" rows={data.byCategory}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byCategory?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={90} />
                  <Tooltip formatter={(v: any) => [INR(v), "Value"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} name="Value" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Items Count by Category" rows={data.byCategory}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byCategory} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byCategory||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Top 10 Items by Value" onExport={() => exportCSV(data.topByValue, "top-inventory")} rows={data.topByValue}>
            <div className="space-y-2">
              {(data.topByValue || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-5">#{i+1}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.sku} · {item.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-indigo-700">{INR(item.value)}</div>
                    <div className="text-[10px] text-slate-400">{item.quantity} units</div>
                  </div>
                </div>
              ))}
            </div>
          </ChartPanel>

          {data.lowStockItems?.length > 0 && (
            <ChartPanel title="⚠ Low Stock Items" onExport={() => exportCSV(data.lowStockItems, "low-stock")} rows={data.lowStockItems}>
              <div className="space-y-1.5">
                {data.lowStockItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                    <div><div className="text-xs font-semibold text-slate-800">{item.name}</div><div className="text-[10px] text-slate-400">{item.sku} · {item.category}</div></div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${item.quantity === 0 ? "text-red-600" : "text-amber-600"}`}>{item.quantity} units</div>
                      <div className="text-[10px] text-slate-400">Min: {item.threshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartPanel>
          )}

          <DrillTable rows={data.rows || []} cols={[
            { key: "name", label: "Item" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "Category" },
            { key: "quantity", label: "Stock" },
            { key: "threshold", label: "Min" },
            { key: "unitPrice", label: "Unit Price", fmt: v => INR(v) },
            { key: "value", label: "Total Value", fmt: v => INR(v) },
          ]} />
        </>
      )}
    </div>
  );
}

// ── TAB: HR ───────────────────────────────────────────────────────────────────
function HRTab() {
  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const now = new Date();
  const [f, setF] = useState({ departmentId: "all", empStatus: "all", month: "all", year: String(now.getFullYear()) });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/hr", params], queryFn: async () => (await fetch(`/api/reports/hr?${params}`, { credentials: "include" })).json() });
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Department"><Select value={f.departmentId} onValueChange={v => upd("departmentId", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{(depts as any[]).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Status"><Select value={f.empStatus} onValueChange={v => upd("empStatus", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["active","on_leave","resigned","terminated"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Month"><Select value={f.month} onValueChange={v => upd("month", v)}><SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Year"><Input type="number" className="h-8 text-xs w-24" value={f.year} onChange={e => upd("year", e.target.value)} /></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "hr-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={Users} msg="No HR data" /> : (
        <>
          <div className="grid grid-cols-6 gap-3">
            <KPI label="Total Employees" value={data.summary?.total} color="#6366f1" />
            <KPI label="Active" value={data.summary?.active} color="#059669" />
            <KPI label="On Leave" value={data.summary?.onLeave} color="#f59e0b" />
            <KPI label="Total Payroll" value={INR(data.summary?.totalPayroll)} color="#7c3aed" />
            <KPI label="Pending Leaves" value={data.summary?.pendingLeaves} color="#f97316" />
            <KPI label="Approved Leaves" value={data.summary?.approvedLeaves} color="#0891b2" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ChartPanel title="By Department" rows={data.byDepartment}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byDepartment} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Status" rows={data.byStatus}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byStatus||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Employment Type" rows={data.byType}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byType||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Monthly Payroll Trend" rows={data.payrollMonthly}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.payrollMonthly}>
                <defs><linearGradient id="prG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [INR(v), "Payroll"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} fill="url(#prG)" name="Payroll" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <DrillTable rows={data.rows || []} cols={[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "department", label: "Department" },
            { key: "status", label: "Status" },
            { key: "type", label: "Type" },
            { key: "salary", label: "Basic Salary", fmt: v => INR(v) },
          ]} />
        </>
      )}
    </div>
  );
}

// ── TAB: SUPPORT ──────────────────────────────────────────────────────────────
function SupportTab() {
  const [f, setF] = useState({ period: "last30days", dateFrom: "", dateTo: "", status: "all", priority: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/support", params], queryFn: async () => (await fetch(`/api/reports/support?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Period"><Select value={f.period} onValueChange={v => upd("period", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="From"><Input type="date" className="h-8 text-xs w-36" value={f.dateFrom} onChange={e => upd("dateFrom", e.target.value)} /></FItem>
        <FItem label="To"><Input type="date" className="h-8 text-xs w-36" value={f.dateTo} onChange={e => upd("dateTo", e.target.value)} /></FItem>
        <FItem label="Status"><Select value={f.status} onValueChange={v => upd("status", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["open","in_progress","resolved","closed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Priority"><Select value={f.priority} onValueChange={v => upd("priority", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["urgent","high","medium","low"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "support-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={Headphones} msg="No support data" /> : (
        <>
          <div className="grid grid-cols-5 gap-3">
            <KPI label="Total Tickets" value={data.summary?.total} color="#6366f1" />
            <KPI label="Open" value={data.summary?.open} color="#3b82f6" />
            <KPI label="Resolved" value={data.summary?.resolved} color="#059669" />
            <KPI label="SLA Breached" value={data.summary?.breached} color="#dc2626" />
            <KPI label="Avg Resolution" value={data.summary?.avgResolutionH != null ? `${data.summary.avgResolutionH}h` : "—"} color="#7c3aed" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ChartPanel title="Volume by Month" rows={data.monthly}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" fill="#e0e7ff" radius={[4,4,0,0]} name="Total" />
                  <Bar dataKey="resolved" fill="#059669" radius={[4,4,0,0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Priority" rows={data.byPriority}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byPriority||[]).map((_: any, i: number) => <Cell key={i} fill={["#dc2626","#f97316","#f59e0b","#10b981"][i]||COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Status" rows={data.byStatus}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byStatus||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="By Category" rows={data.byCategory}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.byCategory?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={90} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[0,4,4,0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <DrillTable rows={data.rows || []} cols={[
            { key: "ticketNumber", label: "Ticket #" },
            { key: "subject", label: "Subject" },
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "category", label: "Category" },
            { key: "assignedTo", label: "Assigned To" },
            { key: "date", label: "Date", fmt: v => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
          ]} />
        </>
      )}
    </div>
  );
}

// ── TAB: PURCHASES ────────────────────────────────────────────────────────────
function PurchasesTab() {
  const [f, setF] = useState({ period: "lastYear", dateFrom: "", dateTo: "", status: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/purchases", params], queryFn: async () => (await fetch(`/api/reports/purchases?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Period"><Select value={f.period} onValueChange={v => upd("period", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="From"><Input type="date" className="h-8 text-xs w-36" value={f.dateFrom} onChange={e => upd("dateFrom", e.target.value)} /></FItem>
        <FItem label="To"><Input type="date" className="h-8 text-xs w-36" value={f.dateTo} onChange={e => upd("dateTo", e.target.value)} /></FItem>
        <FItem label="Status"><Select value={f.status} onValueChange={v => upd("status", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["draft","sent","received","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "purchases-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={ShoppingCart} msg="No purchase data" /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="Total POs" value={data.summary?.totalPOs} color="#6366f1" />
            <KPI label="Total Spend" value={INR(data.summary?.totalSpend)} color="#dc2626" />
            <KPI label="Avg PO Value" value={INR(data.summary?.avgPOValue)} color="#7c3aed" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ChartPanel title="Monthly Spend" rows={data.monthly}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthly}>
                  <defs><linearGradient id="poG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [INR(v), "Spend"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} fill="url(#poG)" name="Spend" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By Status" rows={data.byStatus}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {(data.byStatus||[]).map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /></PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Top Suppliers by Spend" onExport={() => exportCSV(data.topSuppliers, "top-suppliers")} rows={data.topSuppliers}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.topSuppliers?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={100} />
                <Tooltip formatter={(v: any) => [INR(v), "Spend"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="amount" fill="#f97316" radius={[0,4,4,0]} name="Spend" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <DrillTable rows={data.rows || []} cols={[
            { key: "poNumber", label: "PO #" },
            { key: "supplierName", label: "Supplier" },
            { key: "date", label: "Date", fmt: v => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
            { key: "status", label: "Status" },
            { key: "amount", label: "Amount", fmt: v => INR(v) },
          ]} />
        </>
      )}
    </div>
  );
}

// ── TAB: PAYROLL ──────────────────────────────────────────────────────────────
function PayrollTab() {
  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const now = new Date();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [f, setF] = useState({ month: "all", year: String(now.getFullYear()), departmentId: "all", slipStatus: "all" });
  const upd = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all") as any).toString();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/reports/payroll", params], queryFn: async () => (await fetch(`/api/reports/payroll?${params}`, { credentials: "include" })).json() });

  return (
    <div className="space-y-4">
      <FilterBar>
        <FItem label="Month"><Select value={f.month} onValueChange={v => upd("month", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Year"><Input type="number" className="h-8 text-xs w-24" value={f.year} onChange={e => upd("year", e.target.value)} /></FItem>
        <FItem label="Department"><Select value={f.departmentId} onValueChange={v => upd("departmentId", v)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{(depts as any[]).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select></FItem>
        <FItem label="Status"><Select value={f.slipStatus} onValueChange={v => upd("slipStatus", v)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{["draft","confirmed","paid"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></FItem>
        <button onClick={() => refetch()} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 self-end"><RefreshCw className="h-3 w-3" />Apply</button>
        <button onClick={() => exportCSV(data?.rows || [], "payroll-report")} className="h-8 px-3 flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 self-end"><Download className="h-3 w-3" />Export</button>
      </FilterBar>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div> : !data ? <Empty icon={Briefcase} msg="No payroll data" /> : (
        <>
          <div className="grid grid-cols-5 gap-3">
            <KPI label="Total Slips" value={data.summary?.totalSlips} color="#6366f1" />
            <KPI label="Paid Slips" value={data.summary?.paid} color="#059669" />
            <KPI label="Gross Pay" value={INR(data.summary?.totalGross)} color="#7c3aed" />
            <KPI label="Net Pay" value={INR(data.summary?.totalNet)} color="#6366f1" />
            <KPI label="Total Deductions" value={INR(data.summary?.totalDeductions)} color="#dc2626" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ChartPanel title="Monthly Payroll Trend" rows={data.monthly}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [INR(v)]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="gross" fill="#e0e7ff" radius={[4,4,0,0]} name="Gross" />
                  <Bar dataKey="net" fill="#7c3aed" radius={[4,4,0,0]} name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Net Pay by Department" rows={data.byDepartment}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byDepartment?.slice(0,8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={80} />
                  <Tooltip formatter={(v: any) => [INR(v)]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="net" fill="#6366f1" radius={[0,4,4,0]} name="Net Pay" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <DrillTable rows={data.rows || []} cols={[
            { key: "employeeName", label: "Employee" },
            { key: "period", label: "Period" },
            { key: "gross", label: "Gross", fmt: v => INR(v) },
            { key: "net", label: "Net Pay", fmt: v => INR(v) },
            { key: "status", label: "Status" },
          ]} />
        </>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "sales",     label: "Sales",     icon: TrendingUp },
  { id: "leads",     label: "CRM/Leads", icon: Users },
  { id: "finance",   label: "Finance",   icon: IndianRupee },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "hr",        label: "HR",        icon: Users },
  { id: "support",   label: "Support",   icon: Headphones },
  { id: "purchases", label: "Purchases", icon: ShoppingCart },
  { id: "payroll",   label: "Payroll",   icon: Briefcase },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <Layout>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Real-time business intelligence across all modules"
      />

      <div className="p-6">
        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 overflow-x-auto flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>

        {activeTab === "sales"     && <SalesTab />}
        {activeTab === "leads"     && <LeadsTab />}
        {activeTab === "finance"   && <FinanceTab />}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "hr"        && <HRTab />}
        {activeTab === "support"   && <SupportTab />}
        {activeTab === "purchases" && <PurchasesTab />}
        {activeTab === "payroll"   && <PayrollTab />}
      </div>
    </Layout>
  );
}
