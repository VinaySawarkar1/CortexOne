import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, Users, CheckSquare, Check, Trash2, Clock } from "lucide-react";
import { format, isPast } from "date-fns";

export type CrmActivity = {
  id: number;
  leadId: number;
  activityType: string;
  summary: string;
  notes: string | null;
  dueDate: string | null;
  assignedTo: string | null;
  status: string;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
};

const TYPE_META: Record<string, { label: string; icon: any }> = {
  call: { label: "Call", icon: Phone },
  meeting: { label: "Meeting", icon: Users },
  email: { label: "Email", icon: Mail },
  todo: { label: "To-Do", icon: CheckSquare },
};

export default function ActivityPanel({ leadId }: { leadId: number }) {
  const [activityType, setActivityType] = useState("call");
  const [summary, setSummary] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const queryKey = [`/api/leads/${leadId}/activities`];
  const { data: activities = [], isLoading } = useQuery<CrmActivity[]>({ queryKey });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["/api/crm-activities"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await apiRequest("POST", `/api/leads/${leadId}/activities`, payload)).json(),
    onSuccess: () => {
      invalidate();
      setSummary("");
      setDueDate("");
      setNotes("");
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<CrmActivity> }) =>
      (await apiRequest("PUT", `/api/crm-activities/${id}`, updates)).json(),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/crm-activities/${id}`)).json(),
    onSuccess: invalidate,
  });

  const handleSchedule = () => {
    if (!summary.trim()) return;
    createMutation.mutate({
      activityType,
      summary: summary.trim(),
      notes: notes.trim() || undefined,
      dueDate: dueDate || undefined,
    });
  };

  const planned = activities.filter((a) => a.status === "planned");
  const done = activities.filter((a) => a.status !== "planned");

  const renderRow = (a: CrmActivity) => {
    const meta = TYPE_META[a.activityType] || TYPE_META.todo;
    const Icon = meta.icon;
    const overdue = a.status === "planned" && a.dueDate && isPast(new Date(a.dueDate));
    return (
      <div key={a.id} className="flex items-start justify-between border rounded p-2 gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className={`h-4 w-4 mt-0.5 ${a.status === "done" ? "text-green-600" : "text-[#800000]"}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${a.status === "done" ? "line-through text-gray-400" : ""}`}>{a.summary}</span>
              <Badge variant="outline" className="text-xs">{meta.label}</Badge>
              {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
            </div>
            {a.notes && <p className="text-xs text-gray-500 mt-0.5 break-words">{a.notes}</p>}
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {a.dueDate ? format(new Date(a.dueDate), "dd MMM yyyy, HH:mm") : "No due date"}
              {a.assignedTo ? ` · ${a.assignedTo}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {a.status === "planned" && (
            <Button size="icon" variant="ghost" title="Mark done" onClick={() => updateMutation.mutate({ id: a.id, updates: { status: "done" } })}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
          )}
          <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteMutation.mutate(a.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Schedule form */}
      <div className="border rounded p-3 space-y-2 bg-gray-50">
        <div className="flex gap-2">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="flex-1" placeholder="Summary (e.g. Call to discuss pricing)" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-56" />
          <Input className="flex-1" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={handleSchedule} disabled={createMutation.isPending} className="bg-[#800000] hover:bg-[#4B0000]">Schedule</Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading activities…</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Planned ({planned.length})</p>
            <div className="space-y-2">
              {planned.length ? planned.map(renderRow) : <p className="text-sm text-gray-400">No planned activities.</p>}
            </div>
          </div>
          {done.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Done ({done.length})</p>
              <div className="space-y-2">{done.map(renderRow)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
