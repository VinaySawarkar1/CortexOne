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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

type LineItem = { itemName: string; quantity: number; uom: string; unitPrice: number };

function RfqForm({ initial, suppliers, onSubmit, loading }: { initial?: any; suppliers: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", supplier: initial?.supplier ?? "", expectedDelivery: initial?.expectedDelivery ?? "",
    status: initial?.status ?? "draft", items: initial?.items ?? [] as LineItem[],
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => set("items", [...form.items, { itemName: "", quantity: 1, uom: "pcs", unitPrice: 0 }]);
  const setLine = (i: number, k: string, v: any) => { const items = [...form.items]; items[i] = { ...items[i], [k]: v }; set("items", items); };
  const removeLine = (i: number) => set("items", form.items.filter((_: any, idx: number) => idx !== i));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>RFQ Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Supplier *</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} required placeholder="Supplier name" /></div>
        <div><Label>Expected Delivery</Label><Input type="date" value={form.expectedDelivery} onChange={e => set("expectedDelivery", e.target.value)} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["draft","sent","received","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><Label>Line Items</Label><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Item</Button></div>
        {form.items.map((item: LineItem, i: number) => (
          <div key={i} className="flex gap-2 items-end mb-2 flex-wrap">
            <div><Label className="text-xs">Item</Label><Input value={item.itemName} onChange={e => setLine(i, "itemName", e.target.value)} className="w-36" /></div>
            <div><Label className="text-xs">Qty</Label><Input type="number" value={item.quantity} onChange={e => setLine(i, "quantity", Number(e.target.value))} className="w-16" /></div>
            <div><Label className="text-xs">UOM</Label><Input value={item.uom} onChange={e => setLine(i, "uom", e.target.value)} className="w-16" /></div>
            <div><Label className="text-xs">Unit Price</Label><Input type="number" value={item.unitPrice} onChange={e => setLine(i, "unitPrice", Number(e.target.value))} className="w-24" /></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function RfqPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/rfqs"] });
  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ["/api/suppliers"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/rfqs", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/rfqs"] }); setCreateOpen(false); toast({ title: "RFQ created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/rfqs/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/rfqs"] }); setEditItem(null); toast({ title: "RFQ updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/rfqs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/rfqs"] }); setDeleteItem(null); toast({ title: "RFQ deleted" }); },
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.supplier?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Requests for Quotation" subtitle="Source prices from suppliers before raising a PO" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New RFQ</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Supplier</TableHead><TableHead>Items</TableHead><TableHead>Expected Delivery</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{(item.items || []).length}</TableCell>
                  <TableCell>{item.expectedDelivery || "—"}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.draft}`}>{item.status}</span></TableCell>
                  <TableCell><div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No RFQs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New RFQ</DialogTitle></DialogHeader>
          <RfqForm suppliers={suppliers} onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit RFQ</DialogTitle></DialogHeader>
          {editItem && <RfqForm initial={editItem} suppliers={suppliers} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete RFQ?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
