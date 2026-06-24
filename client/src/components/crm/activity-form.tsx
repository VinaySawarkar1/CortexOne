import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  leads: any[];
  defaultLeadId?: number;
  onClose: () => void;
}

export default function ActivityForm({ leads, defaultLeadId, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    leadId: defaultLeadId ? String(defaultLeadId) : "",
    activityType: "call",
    summary: "",
    notes: "",
    dueDate: "",
    assignedTo: (user as any)?.username || "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/crm-activities", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-activities"] });
      toast({ title: "Activity scheduled" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leadId || !form.summary) return;
    createMutation.mutate({
      ...form,
      leadId: Number(form.leadId),
      dueDate: form.dueDate || undefined,
      createdBy: (user as any)?.username || "system",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Lead</Label>
        <Select value={form.leadId} onValueChange={v => setForm(f => ({ ...f, leadId: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a lead..." />
          </SelectTrigger>
          <SelectContent>
            {leads.map((l: any) => (
              <SelectItem key={l.id} value={String(l.id)}>{l.name} — {l.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Activity Type</Label>
          <Select value={form.activityType} onValueChange={v => setForm(f => ({ ...f, activityType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">📞 Call</SelectItem>
              <SelectItem value="meeting">🤝 Meeting</SelectItem>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="todo">✅ To-Do</SelectItem>
              <SelectItem value="deadline">⏰ Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label>Summary <span className="text-red-500">*</span></Label>
        <Input
          value={form.summary}
          onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
          placeholder="e.g. Follow-up call to discuss proposal"
          required
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Additional details..."
          rows={3}
        />
      </div>

      <div>
        <Label>Assigned To</Label>
        <Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending || !form.leadId || !form.summary}>
          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Schedule
        </Button>
      </div>
    </form>
  );
}
