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
import { Plus, Pencil, Trash2, Loader2, PackageCheck, FileDown } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", validated: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

type GrnItem = { itemName: string; orderedQty: number; receivedQty: number; unitPrice: number };

function GrnForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", supplier: initial?.supplier ?? "", purchaseOrderId: initial?.purchaseOrderId ?? "",
    receiptDate: initial?.receiptDate ?? "", items: initial?.items ?? [] as GrnItem[],
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => set("items", [...form.items, { itemName: "", orderedQty: 0, receivedQty: 0, unitPrice: 0 }]);
  const setLine = (i: number, k: string, v: any) => { const items = [...form.items]; items[i] = { ...items[i], [k]: v }; set("items", items); };
  const removeLine = (i: number) => set("items", form.items.filter((_: any, idx: number) => idx !== i));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>GRN Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Supplier *</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} required /></div>
        <div><Label>Purchase Order #</Label><Input value={form.purchaseOrderId} onChange={e => set("purchaseOrderId", e.target.value)} /></div>
        <div><Label>Receipt Date</Label><Input type="date" value={form.receiptDate} onChange={e => set("receiptDate", e.target.value)} /></div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><Label>Items Received</Label><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Item</Button></div>
        {form.items.map((item: GrnItem, i: number) => (
          <div key={i} className="flex gap-2 items-end mb-2 flex-wrap">
            <div><Label className="text-xs">Item Name</Label><Input value={item.itemName} onChange={e => setLine(i, "itemName", e.target.value)} className="w-36" /></div>
            <div><Label className="text-xs">Ordered Qty</Label><Input type="number" value={item.orderedQty} onChange={e => setLine(i, "orderedQty", Number(e.target.value))} className="w-20" /></div>
            <div><Label className="text-xs">Received Qty</Label><Input type="number" value={item.receivedQty} onChange={e => setLine(i, "receivedQty", Number(e.target.value))} className="w-20" /></div>
            <div><Label className="text-xs">Unit Price</Label><Input type="number" value={item.unitPrice} onChange={e => setLine(i, "unitPrice", Number(e.target.value))} className="w-24" /></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function GrnPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/grns"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/grns", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/grns"] }); setCreateOpen(false); toast({ title: "GRN created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/grns/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/grns"] }); setEditItem(null); toast({ title: "GRN updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/grns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/grns"] }); setDeleteItem(null); toast({ title: "GRN deleted" }); },
  });
  const validateM = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/grns/${id}/validate`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/grns"] }); toast({ title: "Stock updated in inventory", description: "GRN validated successfully." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.supplier?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Goods Receipt Notes" subtitle="Record goods received from suppliers" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New GRN</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Supplier</TableHead><TableHead>PO #</TableHead><TableHead>Receipt Date</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.purchaseOrderId || "—"}</TableCell>
                  <TableCell>{item.receiptDate || "—"}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.draft}`}>{item.status}</span></TableCell>
                  <TableCell><div className="flex gap-2">
                    {item.status === 'draft' && <Button size="sm" variant="outline" onClick={() => validateM.mutate(item.id)} disabled={validateM.isPending}><PackageCheck className="mr-1 h-3 w-3" />Validate & Receive Stock</Button>}
                    <Button size="icon" variant="ghost" title="Download PDF" onClick={() => window.open(`/api/grns/${item.id}/download-pdf`, '_blank')}><FileDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No GRNs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Goods Receipt Note</DialogTitle></DialogHeader>
          <GrnForm onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit GRN</DialogTitle></DialogHeader>
          {editItem && <GrnForm initial={editItem} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete GRN?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
