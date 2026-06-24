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
import { Plus, Pencil, Trash2, Loader2, Truck, FileDown } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", ready: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

type DOItem = { itemName: string; demandQty: number; doneQty: number };

function DeliveryOrderForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", customerName: initial?.customerName ?? "", salesOrderId: initial?.salesOrderId ?? "",
    scheduledDate: initial?.scheduledDate ?? "", carrier: initial?.carrier ?? "", trackingNumber: initial?.trackingNumber ?? "",
    shippingAddress: initial?.shippingAddress ?? "", status: initial?.status ?? "draft", items: initial?.items ?? [] as DOItem[],
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => set("items", [...form.items, { itemName: "", demandQty: 0, doneQty: 0 }]);
  const setLine = (i: number, k: string, v: any) => { const items = [...form.items]; items[i] = { ...items[i], [k]: v }; set("items", items); };
  const removeLine = (i: number) => set("items", form.items.filter((_: any, idx: number) => idx !== i));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>DO Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Customer *</Label><Input value={form.customerName} onChange={e => set("customerName", e.target.value)} required /></div>
        <div><Label>Sales Order #</Label><Input value={form.salesOrderId} onChange={e => set("salesOrderId", e.target.value)} /></div>
        <div><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)} /></div>
        <div><Label>Carrier</Label><Input value={form.carrier} onChange={e => set("carrier", e.target.value)} /></div>
        <div><Label>Tracking Number</Label><Input value={form.trackingNumber} onChange={e => set("trackingNumber", e.target.value)} /></div>
        <div className="col-span-2"><Label>Shipping Address</Label><Input value={form.shippingAddress} onChange={e => set("shippingAddress", e.target.value)} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["draft","ready","done","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><Label>Items</Label><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Item</Button></div>
        {form.items.map((item: DOItem, i: number) => (
          <div key={i} className="flex gap-2 items-end mb-2">
            <div><Label className="text-xs">Item</Label><Input value={item.itemName} onChange={e => setLine(i, "itemName", e.target.value)} className="w-36" /></div>
            <div><Label className="text-xs">Demand Qty</Label><Input type="number" value={item.demandQty} onChange={e => setLine(i, "demandQty", Number(e.target.value))} className="w-20" /></div>
            <div><Label className="text-xs">Done Qty</Label><Input type="number" value={item.doneQty} onChange={e => setLine(i, "doneQty", Number(e.target.value))} className="w-20" /></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function DeliveryOrdersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/delivery-orders"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/delivery-orders", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery-orders"] }); setCreateOpen(false); toast({ title: "Delivery order created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/delivery-orders/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery-orders"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/delivery-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery-orders"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });
  const validateM = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/delivery-orders/${id}/validate`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/delivery-orders"] }); toast({ title: "Inventory updated", description: "Delivery validated successfully." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.customerName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Delivery Orders" subtitle="Pick, pack and ship to customers" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Delivery Order</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Customer</TableHead><TableHead>Sales Order</TableHead><TableHead>Scheduled Date</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell>{item.salesOrderId || "—"}</TableCell>
                  <TableCell>{item.scheduledDate || "—"}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.draft}`}>{item.status}</span></TableCell>
                  <TableCell><div className="flex gap-2">
                    {(item.status === 'draft' || item.status === 'ready') && <Button size="sm" variant="outline" onClick={() => validateM.mutate(item.id)} disabled={validateM.isPending}><Truck className="mr-1 h-3 w-3" />Validate Delivery</Button>}
                    <Button size="icon" variant="ghost" title="Download PDF" onClick={() => window.open(`/api/delivery-orders/${item.id}/download-pdf`, '_blank')}><FileDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No delivery orders found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Delivery Order</DialogTitle></DialogHeader>
          <DeliveryOrderForm onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Delivery Order</DialogTitle></DialogHeader>
          {editItem && <DeliveryOrderForm initial={editItem} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Delivery Order?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
