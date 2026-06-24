import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", in_progress: "bg-yellow-100 text-yellow-700", done: "bg-green-100 text-green-700",
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} ${onChange ? "cursor-pointer" : ""}`}
          onClick={() => onChange?.(i)} />
      ))}
    </div>
  );
}

function AppraisalForm({ initial, employees, onSubmit, loading }: { initial?: any; employees: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    employeeId: initial?.employeeId ?? "", period: initial?.period ?? "", reviewerName: initial?.reviewerName ?? "",
    status: initial?.status ?? "draft", overallRating: initial?.overallRating ?? 0,
    strengths: initial?.strengths ?? "", improvements: initial?.improvements ?? "", managerComments: initial?.managerComments ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Employee *</Label>
          <Select value={String(form.employeeId)} onValueChange={v => set("employeeId", Number(v))}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Period *</Label><Input value={form.period} onChange={e => set("period", e.target.value)} placeholder="e.g. Q1 2026" required /></div>
        <div><Label>Reviewer Name</Label><Input value={form.reviewerName} onChange={e => set("reviewerName", e.target.value)} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["draft","in_progress","done"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Overall Rating</Label><StarRating value={form.overallRating} onChange={v => set("overallRating", v)} /></div>
      <div><Label>Strengths</Label><Textarea value={form.strengths} onChange={e => set("strengths", e.target.value)} rows={2} /></div>
      <div><Label>Areas for Improvement</Label><Textarea value={form.improvements} onChange={e => set("improvements", e.target.value)} rows={2} /></div>
      <div><Label>Manager Comments</Label><Textarea value={form.managerComments} onChange={e => set("managerComments", e.target.value)} rows={2} /></div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function AppraisalsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/appraisals"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/appraisals", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/appraisals"] }); setCreateOpen(false); toast({ title: "Appraisal created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/appraisals/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/appraisals"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/appraisals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/appraisals"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });

  const empName = (id: any) => employees.find(e => e.id === id)?.name ?? "—";
  const filtered = items.filter(i => empName(i.employeeId).toLowerCase().includes(search.toLowerCase()) || i.period?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Performance Appraisals" subtitle="Track employee performance reviews" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Appraisal</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Reviewer</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{empName(item.employeeId)}</TableCell>
                  <TableCell>{item.period}</TableCell>
                  <TableCell>{item.reviewerName || "—"}</TableCell>
                  <TableCell><StarRating value={item.overallRating || 0} /></TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.draft}`}>{item.status}</span></TableCell>
                  <TableCell><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No appraisals found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Appraisal</DialogTitle></DialogHeader>
          <AppraisalForm employees={employees} onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Appraisal</DialogTitle></DialogHeader>
          {editItem && <AppraisalForm initial={editItem} employees={employees} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Appraisal?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
