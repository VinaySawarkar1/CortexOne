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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, FileDown } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function ProductionOrderForm({ initial, boms, workCentres, onSubmit, loading }: { initial?: any; boms: any[]; workCentres: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", productName: initial?.productName ?? "", quantity: initial?.quantity ?? 1,
    uom: initial?.uom ?? "pcs", bomId: initial?.bomId ?? "", workCentreId: initial?.workCentreId ?? "",
    scheduledDate: initial?.scheduledDate ?? "", assignedTo: initial?.assignedTo ?? "", notes: initial?.notes ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Product Name *</Label><Input value={form.productName} onChange={e => set("productName", e.target.value)} required /></div>
        <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} /></div>
        <div><Label>UOM</Label><Input value={form.uom} onChange={e => set("uom", e.target.value)} /></div>
        <div><Label>Bill of Materials</Label>
          <Select value={String(form.bomId)} onValueChange={v => set("bomId", Number(v))}>
            <SelectTrigger><SelectValue placeholder="Select BOM" /></SelectTrigger>
            <SelectContent>{boms.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Work Centre</Label>
          <Select value={String(form.workCentreId)} onValueChange={v => set("workCentreId", Number(v))}>
            <SelectTrigger><SelectValue placeholder="Select Work Centre" /></SelectTrigger>
            <SelectContent>{workCentres.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)} /></div>
        <div><Label>Assigned To</Label><Input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function ProductionOrdersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/production-orders"] });
  const { data: boms = [] } = useQuery<any[]>({ queryKey: ["/api/boms"] });
  const { data: workCentres = [] } = useQuery<any[]>({ queryKey: ["/api/work-centres"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/production-orders", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); setCreateOpen(false); toast({ title: "Production order created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/production-orders/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/production-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });
  const confirmM = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/production-orders/${id}/confirm`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); toast({ title: "Order confirmed", description: "Components have been reserved." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.productName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Production Orders" subtitle="Plan and track manufacturing production" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Order</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Scheduled Date</TableHead><TableHead>Assigned To</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.quantity} {item.uom}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.draft}`}>{item.status}</span></TableCell>
                  <TableCell>{item.scheduledDate || "—"}</TableCell>
                  <TableCell>{item.assignedTo || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {item.status === 'draft' && <Button size="sm" variant="outline" onClick={() => confirmM.mutate(item.id)} disabled={confirmM.isPending}><CheckCircle2 className="mr-1 h-3 w-3" />Confirm</Button>}
                      <Button size="icon" variant="ghost" title="Download PDF" onClick={() => window.open(`/api/production-orders/${item.id}/download-pdf`, '_blank')}><FileDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No production orders found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <ProductionOrderForm boms={boms} workCentres={workCentres} onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Production Order</DialogTitle></DialogHeader>
          {editItem && <ProductionOrderForm initial={editItem} boms={boms} workCentres={workCentres} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Production Order?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
