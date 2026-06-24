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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type PriceItem = { itemName: string; price: number; discountPercent: number };

function PriceListForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", currency: initial?.currency ?? "INR", type: initial?.type ?? "sale",
    validFrom: initial?.validFrom ?? "", validTo: initial?.validTo ?? "", isActive: initial?.isActive ?? true,
    items: initial?.items ?? [] as PriceItem[],
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => set("items", [...form.items, { itemName: "", price: 0, discountPercent: 0 }]);
  const setLine = (i: number, k: string, v: any) => { const items = [...form.items]; items[i] = { ...items[i], [k]: v }; set("items", items); };
  const removeLine = (i: number) => set("items", form.items.filter((_: any, idx: number) => idx !== i));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Currency</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} /></div>
        <div><Label>Type</Label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="sale">Sale</SelectItem><SelectItem value="purchase">Purchase</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
          <Label htmlFor="isActive">Active</Label>
        </div>
        <div><Label>Valid From</Label><Input type="date" value={form.validFrom} onChange={e => set("validFrom", e.target.value)} /></div>
        <div><Label>Valid To</Label><Input type="date" value={form.validTo} onChange={e => set("validTo", e.target.value)} /></div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><Label>Price Items</Label><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Item</Button></div>
        {form.items.map((item: PriceItem, i: number) => (
          <div key={i} className="flex gap-2 items-end mb-2">
            <div><Label className="text-xs">Item Name</Label><Input value={item.itemName} onChange={e => setLine(i, "itemName", e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">Price</Label><Input type="number" value={item.price} onChange={e => setLine(i, "price", Number(e.target.value))} className="w-24" /></div>
            <div><Label className="text-xs">Discount %</Label><Input type="number" value={item.discountPercent} onChange={e => setLine(i, "discountPercent", Number(e.target.value))} className="w-20" /></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function PriceListsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/price-lists"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/price-lists", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-lists"] }); setCreateOpen(false); toast({ title: "Price list created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/price-lists/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-lists"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/price-lists/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-lists"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Price Lists" subtitle="Customer-specific pricing and discount rules" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Price List</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Currency</TableHead><TableHead>Type</TableHead><TableHead>Valid From</TableHead><TableHead>Valid To</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.currency}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.validFrom || "—"}</TableCell>
                  <TableCell>{item.validTo || "—"}</TableCell>
                  <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No price lists found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Price List</DialogTitle></DialogHeader>
          <PriceListForm onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Price List</DialogTitle></DialogHeader>
          {editItem && <PriceListForm initial={editItem} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Price List?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
