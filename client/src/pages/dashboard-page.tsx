import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, FileText, ShoppingCart, Receipt,
  Package, AlertTriangle, ClipboardList, ArrowRight, Activity,
  DollarSign, Target, Zap, ChevronRight
} from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const step = value / 30;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{display.toLocaleString("en-IN")}{suffix}</span>;
}

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6"];

const LEAD_STATUS_COLORS: Record<string,string> = {
  new: "#6366f1", contacted: "#3b82f6", qualified: "#10b981",
  proposal: "#f59e0b", negotiation: "#f97316", won: "#22c55e", lost: "#ef4444"
};

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats } = useQuery<any>({ queryKey: ["/api/dashboard/stats"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery<any[]>({ queryKey: ["/api/leads"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<any[]>({ queryKey: ["/api/orders"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/invoices"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: inventory = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks"], queryFn: getQueryFn({ on401: "returnNull" }) });

  // Build chart data from real data
  const revenueData = MONTHS.slice(0, new Date().getMonth() + 1).map((month, i) => {
    const monthOrders = recentOrders.filter((o: any) => {
      const d = new Date(o.createdAt || 0);
      return d.getFullYear() === new Date().getFullYear() && d.getMonth() === i;
    });
    const revenue = monthOrders.reduce((s: number, o: any) => s + parseFloat(o.totalAmount || "0"), 0);
    return { month, revenue: Math.round(revenue), orders: monthOrders.length };
  });

  const leadStatusData = Object.entries(
    recentLeads.reduce((acc: any, l: any) => { acc[l.status || "new"] = (acc[l.status || "new"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const orderStatusData = ["draft","confirmed","delivered","cancelled"].map(status => ({
    status,
    count: recentOrders.filter((o: any) => o.status === status).length
  }));

  const lowStock = inventory.filter((i: any) => (i.quantity || 0) < 10);
  const pendingTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "todo");
  const unpaidInvoices = invoices.filter((inv: any) => inv.status !== "paid");
  const totalRevenue = recentOrders.filter((o: any) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + parseFloat(o.totalAmount || "0"), 0);

  // Period-over-period: compare this month vs last month
  const thisM = new Date().getMonth();
  const thisY = new Date().getFullYear();
  const lastM = thisM === 0 ? 11 : thisM - 1;
  const lastY = thisM === 0 ? thisY - 1 : thisY;
  const inMonth = (d: any, m: number, y: number) => { const dt = new Date(d || 0); return dt.getMonth() === m && dt.getFullYear() === y; };
  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? "+100%" : "0%";
    const v = Math.round(((cur - prev) / prev) * 100);
    return (v >= 0 ? "+" : "") + v + "%";
  };
  const leadsThisM = recentLeads.filter((l: any) => inMonth(l.createdAt, thisM, thisY)).length;
  const leadsLastM = recentLeads.filter((l: any) => inMonth(l.createdAt, lastM, lastY)).length;
  const ordersThisM = recentOrders.filter((o: any) => inMonth(o.createdAt, thisM, thisY)).length;
  const ordersLastM = recentOrders.filter((o: any) => inMonth(o.createdAt, lastM, lastY)).length;
  const revThisM = recentOrders.filter((o: any) => inMonth(o.createdAt, thisM, thisY) && o.status !== "cancelled").reduce((s: number, o: any) => s + parseFloat(o.totalAmount || "0"), 0);
  const revLastM = recentOrders.filter((o: any) => inMonth(o.createdAt, lastM, lastY) && o.status !== "cancelled").reduce((s: number, o: any) => s + parseFloat(o.totalAmount || "0"), 0);

  const kpis = [
    { title: "Total Leads", value: recentLeads.length, icon: Users, color: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-600", change: pctChange(leadsThisM, leadsLastM), up: leadsThisM >= leadsLastM, href: "/leads" },
    { title: "Quotations", value: stats?.quotationsSent || 0, icon: FileText, color: "from-blue-500 to-cyan-600", bg: "bg-blue-50", text: "text-blue-600", change: "—", up: true, href: "/quotations" },
    { title: "Orders", value: recentOrders.length, icon: ShoppingCart, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-600", change: pctChange(ordersThisM, ordersLastM), up: ordersThisM >= ordersLastM, href: "/orders" },
    { title: "Revenue", value: totalRevenue, icon: DollarSign, color: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-600", change: pctChange(revThisM, revLastM), up: revThisM >= revLastM, href: "/invoices", prefix: "₹" },
  ];

  const alerts = [
    ...lowStock.slice(0, 2).map((i: any) => ({ type: "warning", text: `Low stock: ${i.name}`, sub: `Only ${i.quantity} units left`, href: "/inventory" })),
    ...pendingTasks.slice(0, 2).map((t: any) => ({ type: "info", text: `Pending: ${t.title}`, sub: t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : "", href: "/tasks" })),
    ...unpaidInvoices.slice(0, 2).map((inv: any) => ({ type: "error", text: `Unpaid invoice: ${inv.invoiceNumber}`, sub: `₹${parseFloat(inv.totalAmount || "0").toLocaleString()}`, href: "/invoices" })),
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6 page-transition">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-135 p-0.5 shadow-xl"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)" }}>
          <div className="rounded-[14px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-7 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="text-white">
                <p className="text-sm font-medium text-indigo-200 mb-1 uppercase tracking-widest">Welcome back</p>
                <h1 className="text-3xl font-extrabold mb-1 animate-fade-in-up tracking-tight">Business Dashboard</h1>
                <p className="text-indigo-100 text-sm">Real-time overview of your business operations</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="glass-dark rounded-xl px-4 py-2 text-white text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="font-semibold">Live Data</span>
                </div>
                <div className="glass-dark rounded-xl px-4 py-2 text-white text-sm font-medium">
                  {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <div key={i} onClick={() => setLocation(kpi.href)}
              className="group cursor-pointer bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="absolute top-0 right-0 w-24 h-24 opacity-5 -mr-4 -mt-4">
                <kpi.icon className="w-full h-full" />
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${kpi.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mb-1">
                {kpi.prefix && <span className="text-base font-bold text-gray-500 mr-0.5">{kpi.prefix}</span>}
                <AnimatedNumber value={kpi.value} />
              </div>
              <p className="text-xs font-medium text-gray-500">{kpi.title}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Revenue Trend</h3>
                <p className="text-xs text-gray-400">Monthly revenue & order volume</p>
              </div>
              <Link href="/reports">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                  View Reports <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
                    fill="url(#colorRevenue)" dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No order data yet</div>
            )}
          </div>

          {/* Lead Status Pie */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Lead Pipeline</h3>
                <p className="text-xs text-gray-400">By status</p>
              </div>
              <Link href="/leads">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                  View <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {leadStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                      paddingAngle={3} dataKey="value">
                      {leadStatusData.map((entry, i) => (
                        <Cell key={i} fill={LEAD_STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {leadStatusData.slice(0, 4).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: LEAD_STATUS_COLORS[d.name] || COLORS[i % COLORS.length] }} />
                        <span className="capitalize text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{d.value as React.ReactNode}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No lead data yet</div>
            )}
          </div>
        </div>

        {/* Order Status + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Order Status Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Order Status</h3>
                <p className="text-xs text-gray-400">Distribution by status</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={orderStatusData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {orderStatusData.map((_, i) => (
                    <Cell key={i} fill={["#6366f1","#10b981","#3b82f6","#ef4444"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Recent Orders</h3>
              <Link href="/orders"><Button variant="ghost" size="sm" className="text-xs text-indigo-600"><ArrowRight className="h-3 w-3" /></Button></Link>
            </div>
            <div className="space-y-2">
              {ordersLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />) :
                recentOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{order.orderNumber}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{order.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">₹{parseFloat(order.totalAmount || "0").toLocaleString("en-IN")}</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        order.status === "confirmed" ? "bg-green-100 text-green-700" :
                        order.status === "delivered" ? "bg-blue-100 text-blue-700" :
                        order.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                    </div>
                  </div>
                ))
              }
              {!ordersLoading && recentOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No orders yet</p>}
            </div>
          </div>

          {/* Alerts + Quick Actions */}
          <div className="space-y-4">
            {/* Alerts */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Alerts
                {alerts.length > 0 && <span className="ml-auto text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{alerts.length}</span>}
              </h3>
              {alerts.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">All clear!</div>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 4).map((a, i) => (
                    <div key={i} onClick={() => setLocation(a.href)}
                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        a.type === "warning" ? "bg-amber-50 border border-amber-100" :
                        a.type === "error" ? "bg-red-50 border border-red-100" :
                        "bg-blue-50 border border-blue-100"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        a.type === "warning" ? "bg-amber-500" : a.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
                      <div>
                        <p className="text-[11px] font-semibold text-gray-800 leading-tight">{a.text}</p>
                        {a.sub && <p className="text-[10px] text-gray-500">{a.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-indigo-500" /> Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "New Lead", icon: Users, href: "/leads", color: "bg-violet-100 text-violet-700 hover:bg-violet-200" },
                  { label: "Quotation", icon: FileText, href: "/quotations/new", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
                  { label: "New Order", icon: ShoppingCart, href: "/orders", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
                  { label: "Inventory", icon: Package, href: "/inventory", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
                ].map((q, i) => (
                  <button key={i} onClick={() => setLocation(q.href)}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${q.color}`}>
                    <q.icon className="h-4 w-4" />
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Recent Leads</h3>
            <Link href="/leads"><Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">View All <ChevronRight className="h-3 w-3 ml-1" /></Button></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 text-left pl-2">Name</th>
                  <th className="pb-2 text-left">Company</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-left">Source</th>
                  <th className="pb-2 text-right pr-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={5}><Skeleton className="h-8 w-full my-1" /></td></tr>
                )) : recentLeads.slice(0, 6).map((lead: any) => (
                  <tr key={lead.id} className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors group cursor-pointer">
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {(lead.name || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{lead.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">{lead.company || "—"}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full`}
                        style={{ background: (LEAD_STATUS_COLORS[lead.status] || "#6366f1") + "20", color: LEAD_STATUS_COLORS[lead.status] || "#6366f1" }}>
                        {lead.status || "new"}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-400 capitalize">{lead.source || "—"}</td>
                    <td className="py-2.5 text-xs font-bold text-gray-800 text-right pr-2">
                      {lead.value ? `₹${parseFloat(lead.value).toLocaleString("en-IN")}` : "—"}
                    </td>
                  </tr>
                ))}
                {!leadsLoading && recentLeads.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">No leads yet. <Link href="/leads"><span className="text-indigo-600 underline cursor-pointer">Add your first lead</span></Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}
