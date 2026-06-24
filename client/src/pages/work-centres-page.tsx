import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

function WorkCentreForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", code: initial?.code ?? "", capacity: initial?.capacity ?? 1, costPerHour: initial?.costPerHour ?? 0, isActive: initial?.isActive ?? true, notes: initial?.notes ?? "" });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Code</Label><Input value={form.code} onChange={e => set("code", e.target.value)} /></div>
        <div><Label>Capacity (units/hr)</Label><Input type="number" value={form.capacity} onChange={e => set("capacity", Number(e.target.value))} /></div>
        <div><Label>Cost per Hour (₹)</Label><Input type="number" value={form.costPerHour} onChange={e => set("costPerHour", Number(e.target.value))} /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} /></div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function WorkCentresPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/work-centres"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/work-centres", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/work-centres"] }); setCreateOpen(false); toast({ title: "Work centre created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/work-centres/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/work-centres"] }); setEditItem(null); toast({ title: "Work centre updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/work-centres/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/work-centres"] }); setDeleteItem(null); toast({ title: "Work centre deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Work Centres" subtitle="Manage production work centres and capacity" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Work Centre</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Capacity (u/hr)</TableHead><TableHead>Cost/Hour</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.code || "—"}</TableCell>
                  <TableCell>{item.capacity}</TableCell>
                  <TableCell>₹{item.costPerHour}</TableCell>
                  <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No work centres found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Work Centre</DialogTitle></DialogHeader>
          <WorkCentreForm onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Work Centre</DialogTitle></DialogHeader>
          {editItem && <WorkCentreForm initial={editItem} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Work Centre?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
