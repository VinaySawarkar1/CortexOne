import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutGrid, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getModuleForPath, accessibleItems, MODULES } from "@/lib/modules";
import { getQueryFn } from "@/lib/queryClient";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

function useBadgeCounts() {
  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"], queryFn: getQueryFn({ on401: "returnNull" }), staleTime: 30000 });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/orders"], queryFn: getQueryFn({ on401: "returnNull" }), staleTime: 30000 });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/invoices"], queryFn: getQueryFn({ on401: "returnNull" }), staleTime: 30000 });
  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks"], queryFn: getQueryFn({ on401: "returnNull" }), staleTime: 30000 });
  const { data: tickets = [] } = useQuery<any[]>({ queryKey: ["/api/support-tickets"], queryFn: getQueryFn({ on401: "returnNull" }), staleTime: 30000 });
  const { data: inventory = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"], queryFn: getQueryFn({ on401: "returnNull" }), staleTime: 30000 });
  return {
    "/leads": leads.filter((l: any) => l.status === "new").length || 0,
    "/orders": orders.filter((o: any) => o.status === "draft").length || 0,
    "/invoices": invoices.filter((i: any) => i.status !== "paid").length || 0,
    "/tasks": tasks.filter((t: any) => t.status === "pending" || t.status === "todo").length || 0,
    "/support-tickets": tickets.filter((t: any) => t.status === "open").length || 0,
    "/inventory": inventory.filter((i: any) => (i.quantity || 0) < 10).length || 0,
  };
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const badges = useBadgeCounts();

  const current = getModuleForPath(location) || MODULES.find((m) => accessibleItems(user, m).length > 0);
  const items = current ? accessibleItems(user, current) : [];
  const ModuleIcon = current?.icon;

  return (
    <div className={cn("h-screen flex flex-col", className)}
      style={{ background: "linear-gradient(180deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%)" }}>

      {/* Module Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        {current && ModuleIcon ? (
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg shadow-black/40 ring-1 ring-white/20", current.color)}>
              <ModuleIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-white truncate">{current.name}</h1>
              <p className="text-[10px] text-white/40 font-medium">{current.tagline}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20">
              <span className="text-white font-extrabold text-sm">B</span>
            </div>
            <h1 className="text-sm font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">BizSuite</h1>
          </div>
        )}
      </div>

      {/* Apps Launcher */}
      <div className="px-3 pt-3 flex-shrink-0">
        <Link href="/apps">
          <Button variant="ghost" size="sm"
            className="w-full justify-start h-9 gap-2 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">All Applications</span>
            <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
          </Button>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-sidebar min-h-0">
        {items.length > 0 && (
          <div className="px-3 mb-2">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2">{current?.name}</p>
          </div>
        )}
        <div className="space-y-0.5 px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || location.startsWith(item.href + "/");
            const badge = badges[item.href as keyof typeof badges] || 0;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group relative",
                  active
                    ? "bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-lg shadow-indigo-900/50 ring-1 ring-indigo-500/50"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}>
                  {/* Active indicator */}
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-400 rounded-r-full" />}
                  <Icon className={cn("h-4 w-4 flex-shrink-0 transition-transform duration-200", active ? "text-white" : "group-hover:scale-110")} />
                  <span className={cn("text-xs font-semibold flex-1 truncate", active ? "text-white" : "")}>{item.title}</span>
                  {badge > 0 && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                      active ? "bg-white/20 text-white" : "bg-indigo-500/30 text-indigo-300"
                    )}>{badge > 99 ? "99+" : badge}</span>
                  )}
                </div>
              </Link>
            );
          })}
          {items.length === 0 && (
            <p className="px-3 py-4 text-xs text-white/30 text-center">No accessible pages in this module.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <p className="text-[10px] text-white/20 text-center font-medium">
          © {new Date().getFullYear()} <span className="text-white/40">BizSuite</span>
        </p>
      </div>
    </div>
  );
}
