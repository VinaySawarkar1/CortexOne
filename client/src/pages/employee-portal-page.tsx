import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User, Clock, Calendar, FileText, MapPin, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, Loader2, Download, ChevronLeft, ChevronRight,
  LogIn, LogOut, Timer, Briefcase, Phone, Mail, Building2, Hash,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const INR = (v: number) => `₹${(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function fmt(ts: string) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtHours(h: number | string) {
  const n = parseFloat(String(h)) || 0;
  const hh = Math.floor(n), mm = Math.round((n - hh) * 60);
  return `${hh}h ${String(mm).padStart(2,"0")}m`;
}

function KCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "1a" }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-extrabold text-slate-800 leading-tight">{value}</div>
        <div className="text-[11px] text-slate-500 font-medium">{label}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview",    label: "Overview",    icon: TrendingUp },
  { id: "attendance",  label: "Attendance",  icon: Clock },
  { id: "leaves",      label: "My Leaves",   icon: Calendar },
  { id: "payslips",    label: "Payslips",    icon: FileText },
  { id: "profile",     label: "My Profile",  icon: User },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_META: Record<string, { color: string; bg: string }> = {
  pending:  { color: "#f59e0b", bg: "#fffbeb" },
  approved: { color: "#059669", bg: "#ecfdf5" },
  rejected: { color: "#dc2626", bg: "#fef2f2" },
  draft:    { color: "#64748b", bg: "#f1f5f9" },
  confirmed:{ color: "#2563eb", bg: "#eff6ff" },
  paid:     { color: "#7c3aed", bg: "#f5f3ff" },
};

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: todayPunch } = useQuery<any>({
    queryKey: ["/api/my/today-punch"],
    queryFn: async () => (await fetch("/api/my/today-punch", { credentials: "include" })).json(),
    refetchInterval: 30000,
  });

  const { data: attendance = [], isLoading: attLoading } = useQuery<any[]>({
    queryKey: ["/api/my/attendance"],
    queryFn: async () => (await fetch("/api/my/attendance", { credentials: "include" })).json(),
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery<any>({
    queryKey: ["/api/my/leaves"],
    queryFn: async () => (await fetch("/api/my/leaves", { credentials: "include" })).json(),
  });

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery<any[]>({
    queryKey: ["/api/my/payslips"],
    queryFn: async () => (await fetch("/api/my/payslips", { credentials: "include" })).json(),
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/my/profile"],
    queryFn: async () => (await fetch("/api/my/profile", { credentials: "include" })).json(),
  });

  const { data: calData = [] } = useQuery<any[]>({
    queryKey: ["/api/my/punch-calendar", calMonth, calYear],
    queryFn: async () => (await fetch(`/api/my/punch-calendar?month=${calMonth + 1}&year=${calYear}`, { credentials: "include" })).json(),
  });

  // ── Apply Leave ────────────────────────────────────────────────────────────
  const applyLeaveM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/my/leaves", data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/my/leaves"] });
      setLeaveOpen(false);
      setLeaveForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      toast({ title: "Leave application submitted", description: "Pending HR approval." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submitLeave = () => {
    if (!leaveForm.leaveTypeId || !leaveForm.startDate || !leaveForm.endDate) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    const start = new Date(leaveForm.startDate), end = new Date(leaveForm.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    applyLeaveM.mutate({ ...leaveForm, totalDays });
  };

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const calByDate = Object.fromEntries(calData.map((d: any) => [d.date, d]));
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  const today = new Date().toISOString().slice(0, 10);
  const missedPunches = attendance.filter((d: any) => d.missedOut);
  const thisMonthAtt = attendance.filter((d: any) => d.date.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, "0")}`));
  const totalHours = attendance.reduce((s: number, d: any) => s + parseFloat(d.workHours || 0), 0);
  const avgHours = attendance.length ? totalHours / attendance.length : 0;

  // ── TABS ───────────────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {

      // ── OVERVIEW ──────────────────────────────────────────────────────────
      case "overview": return (
        <div className="space-y-5">
          {/* Today's status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Today's Status</h3>
              <span className="text-xs text-slate-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className={`flex flex-col items-center p-4 rounded-2xl ${todayPunch?.clockedIn ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200"}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${todayPunch?.clockedIn ? "bg-green-100" : "bg-slate-100"}`}>
                  <Timer className={`h-6 w-6 ${todayPunch?.clockedIn ? "text-green-600 animate-pulse" : "text-slate-400"}`} />
                </div>
                <span className={`text-sm font-bold ${todayPunch?.clockedIn ? "text-green-700" : "text-slate-500"}`}>
                  {todayPunch?.clockedIn ? "Working" : "Not Clocked In"}
                </span>
                {todayPunch?.clockedIn && (
                  <span className="text-xs font-mono text-green-600 mt-0.5">
                    Since {fmt(todayPunch?.lastPunch?.timestamp)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 flex-1">
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <div className="text-lg font-extrabold text-slate-800">{fmtHours(todayPunch?.workSeconds ? todayPunch.workSeconds / 3600 : 0)}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Today's Hours</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <div className="text-lg font-extrabold text-slate-800">{thisMonthAtt.length}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Days This Month</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <div className="text-lg font-extrabold text-slate-800">{fmtHours(avgHours)}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Daily Avg</div>
                </div>
              </div>
            </div>
          </div>

          {/* Missed punches alert */}
          {missedPunches.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Missed Clock-Out — {missedPunches.length} day{missedPunches.length > 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {missedPunches.slice(0, 5).map((d: any) => (
                    <span key={d.date} className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{fmtDate(d.date)}</span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-600 mt-1.5">Please contact HR to regularize these entries.</p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KCard label="Total Days Present" value={attendance.length} icon={CheckCircle2} color="#059669" />
            <KCard label="Total Work Hours" value={fmtHours(totalHours)} icon={Timer} color="#6366f1" />
            <KCard label="Pending Leaves" value={(leavesData?.requests || []).filter((r: any) => r.status === "pending").length} icon={Calendar} color="#f59e0b" />
            <KCard label="Payslips Issued" value={payslips.length} icon={FileText} color="#7c3aed" sub={payslips[0] ? `Latest: ${MONTH_NAMES[(payslips[0].periodMonth || 1) - 1]} ${payslips[0].periodYear}` : undefined} />
          </div>

          {/* Recent attendance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Recent Attendance</h3>
              <button onClick={() => setActiveTab("attendance")} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="pro-table">
                <thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {attendance.slice(0, 7).map((d: any) => (
                    <tr key={d.date}>
                      <td className="font-semibold text-xs text-slate-700">{fmtDate(d.date)}</td>
                      <td className="text-xs">{fmt(d.clockIn)}</td>
                      <td className="text-xs">{d.missedOut ? <span className="text-amber-500 font-semibold">Missed</span> : fmt(d.clockOut)}</td>
                      <td className="text-xs font-mono">{fmtHours(d.workHours)}</td>
                      <td>{d.missedOut ? <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-full">Incomplete</span> : <span className="px-2 py-0.5 text-[10px] font-bold bg-green-50 text-green-700 rounded-full">Present</span>}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 text-xs py-6">No attendance records yet. Use the Clock In button at the top.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

      // ── ATTENDANCE ────────────────────────────────────────────────────────
      case "attendance": return (
        <div className="space-y-5">
          {/* Calendar header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft className="h-4 w-4 text-slate-500" /></button>
              <h3 className="text-sm font-extrabold text-slate-800">{MONTH_NAMES[calMonth]} {calYear}</h3>
              <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight className="h-4 w-4 text-slate-500" /></button>
            </div>

            {/* Calendar grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                  <div key={d} className="text-[10px] font-bold text-slate-400 text-center py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const dayData = calByDate[dateStr];
                  const isToday = dateStr === today;
                  const isFuture = dateStr > today;
                  const hasPunch = !!dayData;
                  const missedOut = dayData?.outs?.length < dayData?.ins?.length;
                  const weekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

                  let bg = "bg-slate-50", textColor = "text-slate-400", border = "border-transparent";
                  if (isToday) { bg = "bg-indigo-600"; textColor = "text-white"; border = "border-indigo-600"; }
                  else if (isFuture || weekend) { bg = "bg-slate-50"; textColor = "text-slate-300"; }
                  else if (missedOut && hasPunch) { bg = "bg-amber-50"; textColor = "text-amber-700"; border = "border-amber-200"; }
                  else if (hasPunch) { bg = "bg-green-50"; textColor = "text-green-700"; border = "border-green-200"; }
                  else if (!weekend && !isFuture) { bg = "bg-red-50"; textColor = "text-red-400"; border = "border-red-100"; }

                  return (
                    <div key={day} title={dayData ? `In: ${fmt(dayData.ins[0]?.timestamp)} Out: ${dayData.outs[0] ? fmt(dayData.outs[0].timestamp) : "Missed"}` : ""}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl border text-xs font-bold cursor-default transition-all ${bg} ${textColor} ${border}`}>
                      <span>{day}</span>
                      {hasPunch && !isToday && <div className={`w-1 h-1 rounded-full mt-0.5 ${missedOut ? "bg-amber-500" : "bg-green-500"}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                {[
                  { color: "bg-green-500", label: "Present" },
                  { color: "bg-amber-500", label: "Missed Clock-Out" },
                  { color: "bg-red-300", label: "Absent" },
                  { color: "bg-indigo-600", label: "Today" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    <span className="text-[10px] text-slate-500 font-semibold">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Attendance Log</h3>
              {missedPunches.length > 0 && (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />{missedPunches.length} missed punch{missedPunches.length > 1 ? "es" : ""}
                </span>
              )}
            </div>
            {attLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div> : (
              <table className="pro-table">
                <thead><tr><th>Date</th><th>Day</th><th>Clock In</th><th>Location In</th><th>Clock Out</th><th>Location Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {attendance.map((d: any) => (
                    <tr key={d.date}>
                      <td className="font-semibold text-xs">{fmtDate(d.date)}</td>
                      <td className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}</td>
                      <td className="text-xs font-mono text-green-700">{fmt(d.clockIn)}</td>
                      <td>
                        {d.inLocation?.lat ? (
                          <a href={`https://maps.google.com/?q=${d.inLocation.lat},${d.inLocation.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800">
                            <MapPin className="h-3 w-3" />{d.inLocation.address || `${d.inLocation.lat?.toFixed(4)},${d.inLocation.lng?.toFixed(4)}`}
                          </a>
                        ) : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="text-xs font-mono">{d.missedOut ? <span className="text-amber-500 font-bold">Missed</span> : fmt(d.clockOut)}</td>
                      <td>
                        {d.outLocation?.lat && !d.missedOut ? (
                          <a href={`https://maps.google.com/?q=${d.outLocation.lat},${d.outLocation.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800">
                            <MapPin className="h-3 w-3" />{d.outLocation.address || `${d.outLocation.lat?.toFixed(4)},${d.outLocation.lng?.toFixed(4)}`}
                          </a>
                        ) : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="font-mono text-xs font-bold text-slate-700">{fmtHours(d.workHours)}</td>
                      <td>
                        {d.missedOut
                          ? <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-full">Incomplete</span>
                          : <span className="px-2 py-0.5 text-[10px] font-bold bg-green-50 text-green-700 rounded-full">Present</span>}
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-slate-400 text-xs py-8">No attendance records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );

      // ── LEAVES ────────────────────────────────────────────────────────────
      case "leaves": return (
        <div className="space-y-5">
          {/* Leave balance cards */}
          <div className="grid grid-cols-4 gap-4">
            {(leavesData?.balances || []).map((b: any) => (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700">{b.name}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{b.code || b.isPaid ? "Paid" : "Unpaid"}</span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-extrabold text-indigo-700">{Math.max(0, b.remaining)}</span>
                  <span className="text-xs text-slate-400 mb-1">/ {b.daysAllowed} days</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, ((b.daysAllowed - Math.max(0, b.remaining)) / (b.daysAllowed || 1)) * 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">{b.used} used</span>
                  <span className="text-[10px] text-slate-400">{Math.max(0, b.remaining)} left</span>
                </div>
              </div>
            ))}
            {(!leavesData?.balances?.length) && (
              <div className="col-span-4 bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">No leave types configured. Ask HR to set up leave policies.</div>
            )}
          </div>

          {/* Apply leave button */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-700">My Leave Applications</h3>
            <Button onClick={() => setLeaveOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5" />Apply for Leave
            </Button>
          </div>

          {/* Leave requests */}
          {leavesLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div> : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="pro-table">
                <thead><tr><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied On</th><th>Status</th></tr></thead>
                <tbody>
                  {(leavesData?.requests || []).map((r: any) => {
                    const m = STATUS_META[r.status] || STATUS_META.pending;
                    return (
                      <tr key={r.id}>
                        <td className="font-semibold text-xs">{r.leaveType || "—"}</td>
                        <td className="text-xs">{fmtDate(r.startDate)}</td>
                        <td className="text-xs">{fmtDate(r.endDate)}</td>
                        <td className="text-xs font-bold text-center">{r.totalDays}</td>
                        <td className="text-xs text-slate-500 max-w-[200px] truncate">{r.reason || "—"}</td>
                        <td className="text-xs text-slate-400">{r.createdAt ? fmtDate(r.createdAt) : "—"}</td>
                        <td>
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full" style={{ color: m.color, background: m.bg }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!(leavesData?.requests?.length) && (
                    <tr><td colSpan={7} className="text-center text-slate-400 text-xs py-8">No leave applications yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );

      // ── PAYSLIPS ──────────────────────────────────────────────────────────
      case "payslips": return (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <KCard label="Total Payslips" value={payslips.length} icon={FileText} color="#6366f1" />
            <KCard label="Latest Net Pay" value={payslips[0] ? INR(payslips[0].netSalary || payslips[0].netPay || 0) : "—"} icon={TrendingUp} color="#059669"
              sub={payslips[0] ? `${MONTH_NAMES[(payslips[0].periodMonth || 1) - 1]} ${payslips[0].periodYear}` : undefined} />
            <KCard label="YTD Earnings" value={INR(payslips.filter((p: any) => p.periodYear === new Date().getFullYear()).reduce((s: number, p: any) => s + (p.grossSalary || p.grossPay || 0), 0))} icon={Briefcase} color="#7c3aed" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Salary Slips</h3>
            </div>
            {payslipsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div> : (
              <table className="pro-table">
                <thead><tr><th>Period</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {payslips.map((p: any) => {
                    const m = STATUS_META[p.status] || STATUS_META.draft;
                    const gross = p.grossSalary || p.grossPay || p.basicSalary || 0;
                    const net = p.netSalary || p.netPay || 0;
                    const ded = p.totalDeductions || (gross - net);
                    return (
                      <tr key={p.id}>
                        <td className="font-semibold text-xs">{MONTH_NAMES[(p.periodMonth || 1) - 1]} {p.periodYear}</td>
                        <td className="text-xs font-bold text-slate-700">{INR(gross)}</td>
                        <td className="text-xs text-red-600">{INR(ded)}</td>
                        <td className="text-xs font-extrabold text-indigo-700">{INR(net)}</td>
                        <td><span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full" style={{ color: m.color, background: m.bg }}>{p.status}</span></td>
                        <td>
                          <button onClick={() => window.open(`/api/payslips/${p.id}/download`, "_blank")} className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold">
                            <Download className="h-3 w-3" />Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {payslips.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-400 text-xs py-8">No payslips found. Contact HR if you expect payslips here.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );

      // ── PROFILE ───────────────────────────────────────────────────────────
      case "profile": return (
        <div className="space-y-5">
          {/* Profile header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {((profile?.user?.name || profile?.user?.username || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-slate-800">{profile?.employee?.name || profile?.user?.name || profile?.user?.username}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{profile?.employee?.designation || profile?.user?.role}</p>
                <div className="flex items-center gap-4 mt-3">
                  {profile?.employee?.department && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600"><Building2 className="h-3.5 w-3.5 text-slate-400" />{profile.employee.department}</div>
                  )}
                  {profile?.employee?.employeeCode && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600"><Hash className="h-3.5 w-3.5 text-slate-400" />{profile.employee.employeeCode}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                {profile?.user?.role && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full capitalize border border-indigo-100">{profile.user.role}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Contact details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Contact Information</h3>
              <div className="space-y-3">
                {[
                  { icon: Mail, label: "Email", value: profile?.employee?.email || profile?.user?.email || profile?.user?.username },
                  { icon: Phone, label: "Phone", value: profile?.employee?.phone || "—" },
                  { icon: Building2, label: "Department", value: profile?.employee?.department || "—" },
                  { icon: Briefcase, label: "Designation", value: profile?.employee?.designation || "—" },
                  { icon: Calendar, label: "Join Date", value: profile?.employee?.joinDate ? fmtDate(profile.employee.joinDate) : "—" },
                  { icon: MapPin, label: "Address", value: profile?.employee?.address || "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{row.label}</div>
                      <div className="text-sm text-slate-700 mt-0.5">{row.value || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employment details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Employment Details</h3>
              <div className="space-y-3">
                {[
                  { label: "Employee Code", value: profile?.employee?.employeeCode || "—" },
                  { label: "Employment Type", value: profile?.employee?.employmentType || "—" },
                  { label: "Work Location", value: profile?.employee?.workLocation || "Office" },
                  { label: "Basic Salary", value: profile?.employee?.basicSalary ? INR(profile.employee.basicSalary) : "—" },
                  { label: "Bank Account", value: profile?.employee?.bankAccount || "—" },
                  { label: "PAN Number", value: profile?.employee?.panNumber || "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className="text-xs font-semibold text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>

              {!profile?.employee && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-700 font-semibold">Employee record not linked</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Ask HR to link your user account to your employee profile to see full details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <Layout>
      <PageHeader title="My Portal" subtitle="Your attendance, leaves, payslips and profile" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>

        {renderTab()}
      </div>

      {/* Apply Leave Dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Leave Type *</Label>
              <Select value={leaveForm.leaveTypeId} onValueChange={v => setLeaveForm(f => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  {(leavesData?.balances || []).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name} ({Math.max(0, b.remaining)} days left)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date *</Label>
                <Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date *</Label>
                <Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} className="h-9 text-sm" min={leaveForm.startDate} />
              </div>
            </div>
            {leaveForm.startDate && leaveForm.endDate && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs text-indigo-700 font-semibold">
                  {Math.max(1, Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / 86400000) + 1)} day(s) requested
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason</Label>
              <Textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} rows={3} className="text-sm resize-none" placeholder="Reason for leave…" />
            </div>
            <Button onClick={submitLeave} disabled={applyLeaveM.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {applyLeaveM.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Submit Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
