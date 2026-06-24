import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Pencil, Trash2, MessageSquare, Clock, AlertTriangle, CheckCircle, Send, X } from "lucide-react";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  open:        { bg: "bg-blue-100",   text: "text-blue-700",   label: "Open" },
  in_progress: { bg: "bg-amber-100",  text: "text-amber-700",  label: "In Progress" },
  resolved:    { bg: "bg-green-100",  text: "text-green-700",  label: "Resolved" },
  closed:      { bg: "bg-slate-100",  text: "text-slate-500",  label: "Closed" },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  low:    { bg: "bg-slate-100",  text: "text-slate-500" },
  medium: { bg: "bg-blue-100",   text: "text-blue-700" },
  high:   { bg: "bg-orange-100", text: "text-orange-700" },
  urgent: { bg: "bg-red-100",    text: "text-red-700" },
};

// SLA hours by priority (Zoho Desk standard)
const SLA_HOURS: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 72 };

function getSlaStatus(ticket: any) {
  if (ticket.status === "resolved" || ticket.status === "closed") return null;
  const created = new Date(ticket.createdAt);
  const now = new Date();
  const elapsed = (now.getTime() - created.getTime()) / 3600000; // hours
  const sla = SLA_HOURS[ticket.priority] || 24;
  const pct = (elapsed / sla) * 100;
  if (pct >= 100) return { label: "SLA Breached", color: "text-red-600", bg: "bg-red-100" };
  if (pct >= 75) return { label: `SLA: ${Math.round(sla - elapsed)}h left`, color: "text-orange-600", bg: "bg-orange-100" };
  return { label: `SLA: ${Math.round(sla - elapsed)}h left`, color: "text-green-600", bg: "bg-green-100" };
}

function TicketForm({ initial, customers, onSubmit, loading }: any) {
  const [form, setForm] = useState({
    ticketNumber: initial?.ticketNumber ?? `TKT-${Date.now()}`,
    subject: initial?.subject ?? "",
    description: initial?.description ?? "",
    priority: initial?.priority ?? "medium",
    status: initial?.status ?? "open",
    customerId: initial?.customerId ? String(initial.customerId) : "",
    assignedTo: initial?.assignedTo ?? "",
    category: initial?.category ?? "",
    resolution: initial?.resolution ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, customerId: form.customerId ? Number(form.customerId) : undefined }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs">Ticket #</Label><Input className="h-8 text-xs mt-1" value={form.ticketNumber} onChange={e => set("ticketNumber", e.target.value)} required /></div>
        <div><Label className="text-xs">Subject *</Label><Input className="h-8 text-xs mt-1" value={form.subject} onChange={e => set("subject", e.target.value)} required /></div>
        <div>
          <Label className="text-xs">Customer</Label>
          <Select value={form.customerId} onValueChange={v => set("customerId", v)}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {customers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Assigned To</Label><Input className="h-8 text-xs mt-1" value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} /></div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={form.priority} onValueChange={v => set("priority", v)}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label className="text-xs">Category / Product</Label><Input className="h-8 text-xs mt-1" placeholder="e.g. Billing, Technical, Delivery" value={form.category} onChange={e => set("category", e.target.value)} /></div>
      </div>
      <div><Label className="text-xs">Description *</Label><Textarea className="text-xs mt-1" value={form.description} onChange={e => set("description", e.target.value)} rows={3} required /></div>
      {(form.status === "resolved" || form.status === "closed") && (
        <div><Label className="text-xs">Resolution Notes</Label><Textarea className="text-xs mt-1" value={form.resolution} onChange={e => set("resolution", e.target.value)} rows={2} /></div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={loading}>
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save Ticket
        </Button>
      </div>
    </form>
  );
}

function ConversationThread({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");

  const { data: comments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/support-tickets/${ticket.id}/comments`],
    queryFn: async () => {
      const r = await fetch(`/api/support-tickets/${ticket.id}/comments`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const r = await fetch(`/api/support-tickets/${ticket.id}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/support-tickets/${ticket.id}/comments`] });
      setText("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sla = getSlaStatus(ticket);
  const statusStyle = STATUS_STYLE[ticket.status] || STATUS_STYLE.open;
  const priorityStyle = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.medium;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityStyle.bg} ${priorityStyle.text} capitalize`}>{ticket.priority}</span>
            {sla && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sla.bg} ${sla.color}`}>{sla.label}</span>}
          </div>
          <h3 className="font-bold text-slate-900 text-sm">{ticket.subject}</h3>
          {ticket.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ticket.description}</p>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="h-4 w-4" /></button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {/* Original ticket as first entry */}
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-600">
            {ticket.assignedTo?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-800">Customer</span>
              <span className="text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleString("en-IN")}</span>
            </div>
            <div className="bg-slate-50 rounded-xl rounded-tl-none px-3 py-2 text-xs text-slate-700 border border-slate-100">
              {ticket.description}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-indigo-500" /></div>
        ) : comments.map((c: any) => {
          const isMe = c.author === (user?.name || user?.username);
          return (
            <div key={c.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${isMe ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {c.author?.[0]?.toUpperCase() || "U"}
              </div>
              <div className={`flex-1 ${isMe ? "items-end" : ""} flex flex-col`}>
                <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs font-semibold text-slate-800">{c.author}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString("en-IN")}</span>
                  {c.role && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded capitalize">{c.role}</span>}
                </div>
                <div className={`px-3 py-2 rounded-xl text-xs text-slate-700 border max-w-[85%] ${isMe ? "bg-indigo-50 border-indigo-100 rounded-tr-none" : "bg-white border-slate-100 rounded-tl-none"}`}>
                  {c.text}
                </div>
              </div>
            </div>
          );
        })}

        {ticket.resolution && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-green-700 mb-1">Resolution</div>
              <div className="bg-green-50 border border-green-100 rounded-xl rounded-tl-none px-3 py-2 text-xs text-green-800">{ticket.resolution}</div>
            </div>
          </div>
        )}
      </div>

      {/* Reply input */}
      {ticket.status !== "closed" && (
        <div className="pt-3 border-t border-slate-100 flex gap-2">
          <Textarea
            className="text-xs flex-1 resize-none"
            rows={2}
            placeholder="Type a reply…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) addComment.mutate(text.trim()); } }}
          />
          <Button
            size="icon"
            className="h-10 w-10 flex-shrink-0 self-end"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            disabled={!text.trim() || addComment.isPending}
            onClick={() => text.trim() && addComment.mutate(text.trim())}
          >
            {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SupportTicketsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [viewTicket, setViewTicket] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/support-tickets"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });

  const createM = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/support-tickets", d).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/support-tickets"] }); setCreateOpen(false); toast({ title: "Ticket created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/support-tickets/${id}`, data).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/support-tickets"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/support-tickets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/support-tickets"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });

  const filtered = items.filter(t => {
    const q = search.toLowerCase();
    if (q && !t.subject?.toLowerCase().includes(q) && !t.ticketNumber?.toLowerCase().includes(q)) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <Layout>
      <PageHeader
        title="Support Tickets"
        subtitle="Track and resolve customer support requests"
        badge={{ label: `${items.filter(t => t.status === "open").length} open` }}
        actions={
          <div className="flex items-center gap-2">
            <Input placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-40 text-xs" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs font-semibold border-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />New Ticket
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPI */}
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-card-value">{items.length}</div><div className="stat-card-label">Total Tickets</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#3b82f6" }}>{items.filter(t => t.status === "open").length}</div><div className="stat-card-label">Open</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#dc2626" }}>{items.filter(t => t.priority === "urgent" && t.status !== "closed").length}</div><div className="stat-card-label">Urgent Active</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#059669" }}>{items.filter(t => t.status === "resolved" || t.status === "closed").length}</div><div className="stat-card-label">Resolved</div></div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Customer</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-sm text-slate-400">No tickets found</td></tr>
                ) : filtered.map(t => {
                  const cust = customers.find((c: any) => c.id === t.customerId);
                  const sla = getSlaStatus(t);
                  const ss = STATUS_STYLE[t.status] || STATUS_STYLE.open;
                  const ps = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium;
                  const commentCount = t.comments ? JSON.parse(t.comments).length : 0;
                  return (
                    <tr key={t.id} className="cursor-pointer" onClick={() => setViewTicket(t)}>
                      <td><span className="font-mono text-xs text-slate-500">{t.ticketNumber}</span></td>
                      <td>
                        <div className="font-medium text-slate-800 text-xs">{t.subject}</div>
                        {t.category && <div className="text-[10px] text-slate-400">{t.category}</div>}
                      </td>
                      <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ps.bg} ${ps.text}`}>{t.priority}</span></td>
                      <td>
                        <select
                          value={t.status}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); updateM.mutate({ id: t.id, data: { ...t, status: e.target.value } }); }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${ss.bg} ${ss.text}`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                      </td>
                      <td>
                        {sla ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sla.bg} ${sla.color}`}>{sla.label}</span>
                        ) : <span className="text-[10px] text-slate-400">—</span>}
                      </td>
                      <td className="text-xs text-slate-600">{cust?.name || "—"}</td>
                      <td className="text-xs text-slate-600">{t.assignedTo || <span className="text-slate-300">Unassigned</span>}</td>
                      <td className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewTicket(t)} className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 relative">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {commentCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] rounded-full flex items-center justify-center font-bold">{commentCount}</span>}
                          </button>
                          <button onClick={() => setEditItem(t)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteItem(t)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
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

      {/* Create / Edit dialogs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <TicketForm customers={customers} onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Ticket</DialogTitle></DialogHeader>
          {editItem && <TicketForm initial={editItem} customers={customers} onSubmit={(d: any) => updateM.mutate({ id: editItem.id, data: d })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      {/* Conversation thread */}
      <Dialog open={!!viewTicket} onOpenChange={v => !v && setViewTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {viewTicket && <ConversationThread ticket={viewTicket} onClose={() => setViewTicket(null)} />}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete ticket "{deleteItem?.ticketNumber}". Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteM.mutate(deleteItem.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
