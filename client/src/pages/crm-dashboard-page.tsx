import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Target, Trophy, AlertCircle, CalendarClock, Star, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function KpiCard({ title, value, sub, icon: Icon, color, trend }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-sm text-gray-500 mt-0.5">{sub}</p>}
            {trend && <p className="text-xs text-green-600 font-medium mt-1">{trend}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-gray-600 w-24 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={cn("h-2 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

const STAGE_COLORS = [
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500",
  "bg-amber-500", "bg-orange-500", "bg-teal-500", "bg-green-500",
];

const SOURCE_COLOR_MAP: Record<string, string> = {
  website: "bg-blue-500", referral: "bg-green-500", social: "bg-violet-500",
  email: "bg-amber-500", phone: "bg-orange-500", other: "bg-slate-400",
};

function fmt(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1).toLocaleString("default", { month: "short" });
}

export default function CrmDashboardPage() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/crm-analytics"],
  });
  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["/api/crm-activities"],
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  const a = analytics || {};
  const trend = a.monthlyTrend || [];
  const maxTrend = Math.max(...trend.map((t: any) => t.leads), 1);

  const bySource = a.bySource || {};
  const maxSource = Math.max(...Object.values(bySource as Record<string, number>), 1);

  const byStage = a.byStage || [];
  const maxStage = Math.max(...byStage.map((s: any) => s.count), 1);

  const topOpps = a.topOpportunities || [];
  const recentLeads = a.recentLeads || [];

  // Today's + overdue activities from the activities query
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const upcoming = (activities as any[])
    .filter(ac => ac.status !== "done" && ac.dueDate)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);

  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <PageHeader title="CRM Dashboard" subtitle="Pipeline overview and activity summary" />

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Leads" value={a.total || 0} icon={Users} color="bg-blue-600" sub={`${a.opportunities || 0} opportunities`} />
          <KpiCard title="Pipeline Value" value={fmt(a.pipelineValue || 0)} icon={TrendingUp} color="bg-violet-600" sub={`Weighted: ${fmt(a.weightedValue || 0)}`} />
          <KpiCard title="Win Rate" value={`${a.winRate || 0}%`} icon={Trophy} color="bg-green-600" sub={`${a.won || 0} won · ${a.lost || 0} lost`} />
          <KpiCard title="Today's Activities" value={a.todayActivities || 0} icon={CalendarClock} color={a.overdueActivities > 0 ? "bg-red-500" : "bg-amber-500"} sub={a.overdueActivities > 0 ? `${a.overdueActivities} overdue` : "All on track"} />
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Lead Trend — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-28">
                {trend.map((t: any) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5 justify-end" style={{ height: "88px" }}>
                      <div
                        className="w-full rounded-t bg-blue-500/80 transition-all"
                        style={{ height: `${Math.max(4, (t.leads / maxTrend) * 80)}px` }}
                        title={`${t.leads} leads`}
                      />
                      {t.won > 0 && (
                        <div className="text-[10px] text-green-600 font-semibold">+{t.won}W</div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">{fmtMonth(t.month)}</span>
                    <span className="text-[10px] font-semibold text-gray-700">{t.leads}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lead sources */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(bySource).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
              ) : (
                Object.entries(bySource as Record<string, number>)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([source, count]) => (
                    <MiniBar
                      key={source}
                      label={source.charAt(0).toUpperCase() + source.slice(1)}
                      value={count as number}
                      max={maxSource}
                      color={SOURCE_COLOR_MAP[source] || "bg-slate-400"}
                    />
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Top opportunities */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Top Opportunities</CardTitle>
              <Link href="/pipeline"><Button variant="ghost" size="sm" className="text-xs h-7">Pipeline <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {topOpps.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No open opportunities</p>
              ) : topOpps.map((opp: any) => (
                <div key={opp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{opp.name}</p>
                    <p className="text-xs text-gray-500 truncate">{opp.company}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">{opp.opportunityStage || "—"}</Badge>
                    <span className="text-sm font-semibold text-green-700">{fmt(parseFloat(opp.expectedValue) || 0)}</span>
                    <span className="text-xs text-gray-500">{opp.probability || 0}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming activities */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Upcoming Activities</CardTitle>
              <Link href="/activities"><Button variant="ghost" size="sm" className="text-xs h-7">All <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No upcoming activities</p>
              ) : upcoming.map((ac: any) => {
                const due = new Date(ac.dueDate);
                const isOverdue = due < now;
                const isToday = due.toISOString().split("T")[0] === today;
                return (
                  <div key={ac.id} className={cn("flex items-start gap-2 py-1.5 border-b last:border-0", isOverdue && "opacity-90")}>
                    <span className={cn("mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
                      ac.activityType === "call" ? "bg-blue-100 text-blue-700" :
                      ac.activityType === "meeting" ? "bg-violet-100 text-violet-700" :
                      ac.activityType === "email" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {ac.activityType}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{ac.summary}</p>
                      <p className={cn("text-[10px]", isOverdue ? "text-red-600 font-semibold" : isToday ? "text-amber-600" : "text-gray-400")}>
                        {isOverdue ? "Overdue · " : isToday ? "Today · " : ""}
                        {due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline stages */}
        {byStage.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {byStage.map((s: any, i: number) => (
                  <div key={s.id} className="text-center p-3 bg-gray-50 rounded-xl border">
                    <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", STAGE_COLORS[i % STAGE_COLORS.length])} />
                    <p className="text-xs text-gray-500 truncate">{s.name}</p>
                    <p className="text-lg font-bold text-gray-900">{s.count}</p>
                    <p className="text-xs text-gray-500">{fmt(s.value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
