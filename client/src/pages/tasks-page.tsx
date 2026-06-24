import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import TaskForm from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2, LayoutGrid, List, Clock, AlertCircle, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-400", low: "bg-slate-400",
};

const KANBAN_COLUMNS = [
  { key: "pending",     label: "To Do",      icon: Circle,        color: "#94a3b8", bg: "#f8fafc" },
  { key: "in_progress", label: "In Progress", icon: Clock,         color: "#6366f1", bg: "#eef2ff" },
  { key: "in progress", label: "In Progress", icon: Clock,         color: "#6366f1", bg: "#eef2ff" },
  { key: "completed",   label: "Completed",   icon: CheckCircle2,  color: "#059669", bg: "#f0fdf4" },
  { key: "cancelled",   label: "Cancelled",   icon: AlertCircle,   color: "#dc2626", bg: "#fef2f2" },
];

// Deduplicate — "in_progress" and "in progress" both map to In Progress column
const UNIQUE_COLUMNS = [
  { key: "pending",     aliases: ["pending"],              label: "To Do",       icon: Circle,       color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" },
  { key: "in_progress", aliases: ["in_progress","in progress"], label: "In Progress", icon: Clock,        color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  { key: "completed",  aliases: ["completed","done"],      label: "Completed",   icon: CheckCircle2, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "cancelled",  aliases: ["cancelled","canceled"],  label: "Cancelled",   icon: AlertCircle,  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
];

function isOverdue(task: any) {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date() && task.status !== "completed" && task.status !== "cancelled";
}

function KanbanCard({ task, onEdit, onDelete, onMove }: { task: any; onEdit: (t: any) => void; onDelete: (t: any) => void; onMove: (id: number, status: string) => void }) {
  const overdue = isOverdue(task);
  return (
    <div className={`bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group ${overdue ? "border-red-200" : "border-slate-100"}`}>
      {/* Priority dot + title */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${PRIORITY_DOT[task.priority || "medium"]}`} />
          <span className="text-xs font-semibold text-slate-800 leading-4 line-clamp-2">{task.title}</span>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={() => onDelete(task)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 ml-3.5">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2.5 ml-3.5">
        <div className="flex items-center gap-1.5">
          {task.priority && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
              {task.priority}
            </span>
          )}
          {overdue && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">Overdue</span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 flex flex-col items-end">
          {task.assignedTo && <span className="truncate max-w-[70px]">{task.assignedTo}</span>}
          {task.dueDate && (
            <span className={overdue ? "text-red-500 font-semibold" : "text-slate-400"}>
              {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>

      {/* Quick status move buttons */}
      <div className="flex gap-1 mt-2 ml-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {UNIQUE_COLUMNS.filter(c => !c.aliases.includes(task.status)).slice(0, 2).map(col => (
          <button
            key={col.key}
            onClick={() => onMove(task.id, col.key)}
            className="text-[9px] px-1.5 py-0.5 rounded border font-medium transition-colors hover:bg-indigo-50"
            style={{ color: col.color, borderColor: col.border }}
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });

  const createTask = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); setCreateDialogOpen(false); toast({ title: "Task created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tasks/${id}`, data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); setEditDialogOpen(false); toast({ title: "Task updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); setDeleteDialogOpen(false); toast({ title: "Task deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = tasks.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
    }
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const overdueTasks = filtered.filter(t => isOverdue(t));
  const pendingCount = filtered.filter(t => t.status === "pending").length;
  const inProgressCount = filtered.filter(t => t.status === "in_progress" || t.status === "in progress").length;
  const completedCount = filtered.filter(t => t.status === "completed").length;

  return (
    <Layout>
      <PageHeader
        title="Tasks"
        subtitle="Manage team tasks with Kanban board"
        badge={{ label: `${filtered.length} tasks` }}
        actions={
          <div className="flex items-center gap-2">
            <Input placeholder="Search tasks…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 w-40 text-xs" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button onClick={() => setView("kanban")} className={`px-2.5 py-1.5 transition-colors ${view === "kanban" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setView("list")} className={`px-2.5 py-1.5 transition-colors ${view === "list" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button size="sm" className="h-8 text-xs font-semibold border-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />New Task
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-card-value">{filtered.length}</div><div className="stat-card-label">Total Tasks</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#6366f1" }}>{pendingCount}</div><div className="stat-card-label">To Do</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#f59e0b" }}>{inProgressCount}</div><div className="stat-card-label">In Progress</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: overdueTasks.length > 0 ? "#dc2626" : "#059669" }}>{overdueTasks.length}</div><div className="stat-card-label">Overdue</div></div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : view === "kanban" ? (
          /* ── KANBAN BOARD ── */
          <div className="flex gap-4 overflow-x-auto pb-2">
            {UNIQUE_COLUMNS.map(col => {
              const colTasks = filtered.filter(t => col.aliases.includes(t.status as string));
              return (
                <div key={col.key} className="flex-shrink-0 w-72 rounded-xl p-3" style={{ background: col.bg, border: `2px solid ${col.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <col.icon className="h-3.5 w-3.5" style={{ color: col.color }} />
                      <span className="text-xs font-bold text-slate-700">{col.label}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white border" style={{ color: col.color, borderColor: col.border }}>
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2 min-h-[80px]">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-slate-400">No tasks</div>
                    ) : colTasks.map(task => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onEdit={(t) => { setCurrentTask(t); setEditDialogOpen(true); }}
                        onDelete={(t) => { setCurrentTask(t); setDeleteDialogOpen(true); }}
                        onMove={(id, status) => updateTask.mutate({ id, data: { status } })}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCreateDialogOpen(true)}
                    className="w-full mt-2 py-1.5 text-[10px] text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-dashed border-slate-200 hover:border-indigo-300 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add task
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">No tasks found</td></tr>
                ) : filtered.map(task => {
                  const overdue = isOverdue(task);
                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="font-medium text-slate-800">{task.title}</div>
                        {task.description && <div className="text-[10px] text-slate-400 truncate max-w-[240px]">{task.description}</div>}
                      </td>
                      <td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_COLORS[task.priority || "medium"]}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          value={task.status}
                          onChange={e => updateTask.mutate({ id: task.id, data: { status: e.target.value } })}
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                        >
                          <option value="pending">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="text-xs text-slate-600">{task.assignedTo || "—"}</td>
                      <td className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                        {(task as any).dueDate ? new Date((task as any).dueDate).toLocaleDateString("en-IN") : "—"}
                        {overdue && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">Overdue</span>}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setCurrentTask(task); setEditDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-600" onClick={() => { setCurrentTask(task); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a task and assign it to a team member.</DialogDescription>
          </DialogHeader>
          <TaskForm
            onSubmit={(data) => createTask.mutate({ ...data, assignedTo: data.assignedTo || user?.name || "" })}
            isSubmitting={createTask.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {currentTask && (
            <TaskForm
              defaultValues={currentTask as any}
              onSubmit={(data) => updateTask.mutate({ id: currentTask.id, data })}
              isSubmitting={updateTask.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{currentTask?.title}". This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => currentTask && deleteTask.mutate(currentTask.id)}>
              {deleteTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
