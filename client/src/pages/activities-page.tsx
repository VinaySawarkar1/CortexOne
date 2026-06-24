import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Phone, Mail, Users, CheckSquare, Calendar, CheckCircle2, X, Clock, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityForm from "@/components/crm/activity-form";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call: { label: "Call", icon: Phone, color: "bg-blue-100 text-blue-700" },
  meeting: { label: "Meeting", icon: Users, color: "bg-violet-100 text-violet-700" },
  email: { label: "Email", icon: Mail, color: "bg-amber-100 text-amber-700" },
  todo: { label: "To-Do", icon: CheckSquare, color: "bg-gray-100 text-gray-700" },
  deadline: { label: "Deadline", icon: Calendar, color: "bg-red-100 text-red-700" },
};

function ActivityBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.todo;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

export default function ActivitiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: activities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/crm-activities"],
  });

  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"] });
  const leadMap = Object.fromEntries((leads as any[]).map((l: any) => [l.id, l]));

  const doneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/crm-activities/${id}`, {
        status: "done", completedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-activities"] });
      toast({ title: "Activity marked done" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/crm-activities/${id}`, { status: "cancelled" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm-activities"] }),
  });

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const filtered = (activities as any[]).filter(ac => {
    if (typeFilter !== "all" && ac.activityType !== typeFilter) return false;
    if (statusFilter === "pending" && ac.status === "done") return false;
    if (statusFilter === "done" && ac.status !== "done") return false;
    if (statusFilter === "overdue") {
      if (ac.status === "done") return false;
      if (!ac.dueDate || new Date(ac.dueDate) >= now) return false;
    }
    if (statusFilter === "today") {
      if (!ac.dueDate) return false;
      if (new Date(ac.dueDate).toISOString().split("T")[0] !== today) return false;
      if (ac.status === "done") return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!ac.summary.toLowerCase().includes(q) && !(ac.notes || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a: any, b: any) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const overdue = (activities as any[]).filter(ac => ac.status !== "done" && ac.dueDate && new Date(ac.dueDate) < now).length;
  const todayCount = (activities as any[]).filter(ac => ac.status !== "done" && ac.dueDate && new Date(ac.dueDate).toISOString().split("T")[0] === today).length;

  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center justify-between">
          <PageHeader title="Activities" subtitle="Track all scheduled calls, meetings, emails and tasks" />
          <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Schedule Activity
          </Button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          {overdue > 0 && (
            <button onClick={() => setStatusFilter("overdue")}
              className={cn("flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors",
                statusFilter === "overdue" ? "bg-red-600 text-white border-red-600" : "border-red-300 text-red-600 hover:bg-red-50")}>
              <AlertCircle className="h-4 w-4" /> {overdue} Overdue
            </button>
          )}
          {todayCount > 0 && (
            <button onClick={() => setStatusFilter("today")}
              className={cn("flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors",
                statusFilter === "today" ? "bg-amber-600 text-white border-amber-600" : "border-amber-300 text-amber-600 hover:bg-amber-50")}>
              <Clock className="h-4 w-4" /> {todayCount} Due Today
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-gray-50">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">All clear!</p>
            <p className="text-sm text-gray-400">No activities match the current filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ac: any) => {
              const due = ac.dueDate ? new Date(ac.dueDate) : null;
              const isOverdue = due && due < now && ac.status !== "done";
              const isToday = due && due.toISOString().split("T")[0] === today;
              const lead = leadMap[ac.leadId];

              return (
                <Card key={ac.id} className={cn(
                  "transition-all",
                  isOverdue && "border-red-200 bg-red-50/30",
                  ac.status === "done" && "opacity-60",
                )}>
                  <CardContent className="py-3 px-4 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <ActivityBadge type={ac.activityType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{ac.summary}</p>
                      {ac.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{ac.notes}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {lead && (
                          <span className="text-xs text-blue-600 font-medium">{lead.name} · {lead.company}</span>
                        )}
                        {ac.assignedTo && (
                          <span className="text-xs text-gray-500">Assigned: {ac.assignedTo}</span>
                        )}
                        {due && (
                          <span className={cn("text-xs font-medium",
                            isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-gray-400"
                          )}>
                            {isOverdue ? "⚠ Overdue · " : isToday ? "Today · " : ""}
                            {due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ac.status === "done" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Done</Badge>
                      ) : ac.status === "cancelled" ? (
                        <Badge variant="outline" className="text-gray-400">Cancelled</Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => doneMutation.mutate(ac.id)}
                            disabled={doneMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-gray-400 hover:text-red-500"
                            onClick={() => cancelMutation.mutate(ac.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create activity dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Activity</DialogTitle>
              <DialogDescription>Create a new activity and link it to a lead.</DialogDescription>
            </DialogHeader>
            <ActivityForm
              leads={leads as any[]}
              onClose={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
