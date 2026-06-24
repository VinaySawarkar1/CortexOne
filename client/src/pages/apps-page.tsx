import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAccessibleModules, accessibleItems } from "@/lib/modules";
import { LogOut, ChevronDown, Loader2, Search, Bell, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getQueryFn } from "@/lib/queryClient";

export default function AppsPage() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/orders"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/invoices"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks"], queryFn: getQueryFn({ on401: "returnNull" }) });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/auth");
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <span className="text-white font-bold text-2xl">B</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  const modules = getAccessibleModules(user);
  const filtered = modules.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.tagline?.toLowerCase().includes(search.toLowerCase()));
  const initials = (user.name || user.username || "").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  const quickStats = [
    { label: "Active Leads", value: leads.length, color: "text-violet-400" },
    { label: "Orders", value: orders.length, color: "text-emerald-400" },
    { label: "Unpaid Invoices", value: invoices.filter((i: any) => i.status !== "paid").length, color: "text-amber-400" },
    { label: "Pending Tasks", value: tasks.filter((t: any) => t.status === "pending" || t.status === "todo").length, color: "text-rose-400" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#0f172a 100%)" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl" style={{ background: "rgba(15,23,42,0.8)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold shadow-lg shadow-indigo-500/30">B</div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">BizSuite</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search modules..."
                className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10">
              <Bell className="h-4 w-4" />
            </Button>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 rounded-lg hover:bg-white/10">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white flex items-center justify-center text-xs font-bold mr-2 shadow-lg">{initials || "U"}</div>
                  <div className="hidden sm:flex flex-col items-start mr-1">
                    <span className="text-sm leading-4 font-semibold text-white">{user.name || user.username}</span>
                    <span className="text-[10px] leading-3 text-white/50 capitalize">{user.role}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings"><DropdownMenuItem>Settings</DropdownMenuItem></Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Greeting */}
        <div className="mb-8">
          <p className="text-indigo-300 text-sm font-medium mb-1">{greeting},</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{user.name || user.username} 👋</h1>
          <p className="text-white/50 text-sm">Select a module to get started. Your workspace is ready.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {quickStats.map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-4 backdrop-blur-sm hover:border-white/20 transition-all duration-300" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-medium text-white/50 mb-1">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Module Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-white/50 font-medium">
              {search ? `No modules match "${search}"` : "No apps available yet."}
            </p>
            <p className="text-sm text-white/30 mt-1">
              {!search && "Ask your administrator to grant you access."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Your Applications</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((m, idx) => {
                const Icon = m.icon;
                const first = accessibleItems(user, m)[0];
                const isHovered = hoveredId === m.id;
                return (
                  <Link key={m.id} href={first?.href || "/apps"}>
                    <div
                      onMouseEnter={() => setHoveredId(m.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="group relative rounded-2xl border cursor-pointer overflow-hidden transition-all duration-300"
                      style={{
                        background: isHovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                        borderColor: isHovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                        transform: isHovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
                        boxShadow: isHovered ? "0 20px 40px rgba(0,0,0,0.4)" : "none",
                        animationDelay: `${idx * 0.04}s`,
                      }}>
                      {/* Glow */}
                      {isHovered && (
                        <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${m.color}`} />
                      )}
                      <div className="relative p-5 text-center">
                        <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-0.5">{m.name}</h3>
                        <p className="text-[10px] text-white/50 leading-tight">{m.tagline}</p>
                        {first && (
                          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                              Open →
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Recent Activity strip */}
        {orders.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Recent Orders</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {orders.slice(0, 6).map((o: any) => (
                <div key={o.id} onClick={() => setLocation("/orders")}
                  className="flex-shrink-0 rounded-xl border border-white/10 p-3 cursor-pointer hover:border-white/20 transition-all duration-200 min-w-[160px]"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <p className="text-xs font-bold text-white truncate">{o.orderNumber}</p>
                  <p className="text-[10px] text-white/40 truncate mb-2">{o.customerName}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">₹{parseFloat(o.totalAmount || "0").toLocaleString("en-IN")}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      o.status === "confirmed" ? "bg-green-500/20 text-green-400" :
                      o.status === "delivered" ? "bg-blue-500/20 text-blue-400" :
                      "bg-white/10 text-white/50"}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-[11px] text-white/20">
        © {new Date().getFullYear()} BizSuite — Powered by Cortex AI Technologies
      </footer>
    </div>
  );
}
