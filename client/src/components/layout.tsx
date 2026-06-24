import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import Sidebar from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell, Plus, Search, ChevronDown, LogOut, User,
  FileText, ShoppingCart, Loader2, Settings,
  LogIn, LogOut as LogOutIcon, MapPin, Clock, Timer,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ── Clock Widget ──────────────────────────────────────────────────────────────
function formatSeconds(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function ClockWidget() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [gettingLoc, setGettingLoc] = useState(false);

  const { data: punch } = useQuery<any>({
    queryKey: ["/api/my/today-punch"],
    queryFn: async () => (await fetch("/api/my/today-punch", { credentials: "include" })).json(),
    refetchInterval: 30000,
  });

  // Live timer
  useEffect(() => {
    if (!punch?.clockedIn) { setElapsed(punch?.workSeconds || 0); return; }
    setElapsed(punch?.workSeconds || 0);
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [punch?.clockedIn, punch?.workSeconds]);

  const getLocation = (): Promise<{ lat?: number; lng?: number; address?: string }> =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000 }
      );
    });

  const clockInM = useMutation({
    mutationFn: async () => {
      setGettingLoc(true);
      const loc = await getLocation();
      setGettingLoc(false);
      return (await apiRequest("POST", "/api/my/clock-in", loc)).json();
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/my/today-punch"] }); toast({ title: d.message || "Clocked in" }); },
    onError: (e: Error) => { setGettingLoc(false); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const clockOutM = useMutation({
    mutationFn: async () => {
      setGettingLoc(true);
      const loc = await getLocation();
      setGettingLoc(false);
      return (await apiRequest("POST", "/api/my/clock-out", loc)).json();
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/my/today-punch"] }); toast({ title: d.message || "Clocked out" }); },
    onError: (e: Error) => { setGettingLoc(false); toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const loading = clockInM.isPending || clockOutM.isPending || gettingLoc;

  return (
    <div className="flex items-center gap-2">
      {punch?.clockedIn ? (
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <Timer className="h-3 w-3 text-green-600" />
            <span className="text-xs font-bold text-green-700 font-mono tabular-nums">{formatSeconds(elapsed)}</span>
          </div>
          <Button size="sm" onClick={() => clockOutM.mutate()} disabled={loading}
            className="h-7 px-2.5 text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white border-0 gap-1 rounded-lg shadow-sm">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOutIcon className="h-3 w-3" />}Clock Out
          </Button>
        </>
      ) : (
        <>
          {elapsed > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <Clock className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] font-semibold text-slate-500 font-mono">{formatSeconds(elapsed)}</span>
            </div>
          )}
          <Button size="sm" onClick={() => clockInM.mutate()} disabled={loading}
            className="h-7 px-2.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-0 gap-1 rounded-lg shadow-sm">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}Clock In
          </Button>
        </>
      )}
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading, logoutMutation } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.name || user.username || "")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    /*
     * Layout:
     *   - Sidebar: fixed, left edge, full height
     *   - Right column: fixed too (ml-60), has two rows:
     *       1) Top header  — fixed height, never scrolls
     *       2) Scroll area — flex-1, overflow-y-auto
     *          └─ PageHeader inside pages uses sticky top-0
     *             (relative to THIS scroll container, not the viewport)
     */
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 shadow-xl flex-shrink-0">
        <Sidebar />
      </aside>

      {/* ── Right column ── */}
      <div className="fixed inset-y-0 right-0 flex flex-col" style={{ left: 240 }}>

        {/* Top bar — sits outside the scroll area, so it never scrolls */}
        <header
          className="flex-shrink-0 flex items-center gap-3 px-5 bg-white border-b border-slate-200 z-30"
          style={{ height: 56, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
        >
          {/* Global search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search anything…"
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Quick-create */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold rounded-lg shadow-sm border-0"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[11px] text-slate-400 font-medium pb-1">Quick Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/leads">
                  <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                    <User className="h-3.5 w-3.5 text-indigo-500" />Lead
                  </DropdownMenuItem>
                </Link>
                <Link href="/quotations/new">
                  <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />Quotation
                  </DropdownMenuItem>
                </Link>
                <Link href="/orders">
                  <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />Order
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clock In/Out Widget */}
            <ClockWidget />

            <div className="w-px h-5 bg-slate-200" />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <Bell className="h-4 w-4" />
            </Button>

            {/* Settings */}
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 px-2 rounded-lg hover:bg-slate-100 flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-indigo-100 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    {initials || "U"}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-xs font-semibold text-slate-800 leading-4 max-w-[96px] truncate">
                      {user.name || user.username}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize leading-3">{user.role}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs">
                  <div className="font-semibold text-slate-900">{user.name || user.username}</div>
                  <div className="text-slate-400 font-normal capitalize mt-0.5">{user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings">
                  <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                    <Settings className="h-3.5 w-3.5" />Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="h-3.5 w-3.5" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Scroll area — PageHeader inside pages is sticky top-0 here ── */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50 scrollbar-content">
          {children}
        </main>

      </div>
    </div>
  );
}
