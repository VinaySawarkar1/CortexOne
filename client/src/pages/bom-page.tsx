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
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";

function BomForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: initial?.name ?? "", code: initial?.code ?? "", productName: initial?.productName ?? "", quantity: initial?.quantity ?? 1, uom: initial?.uom ?? "pcs", version: initial?.version ?? "1.0", isActive: initial?.isActive ?? true });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>BOM Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Code</Label><Input value={form.code} onChange={e => set("code", e.target.value)} /></div>
        <div><Label>Product Name *</Label><Input value={form.productName} onChange={e => set("productName", e.target.value)} required /></div>
        <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} /></div>
        <div><Label>UOM</Label><Input value={form.uom} onChange={e => set("uom", e.target.value)} /></div>
        <div><Label>Version</Label><Input value={form.version} onChange={e => set("version", e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

function BomLineForm({ bomId, initial, onSubmit, onCancel, loading }: { bomId: number; initial?: any; onSubmit: (v: any) => void; onCancel: () => void; loading: boolean }) {
  const [form, setForm] = useState({ bomId, componentName: initial?.componentName ?? "", quantity: initial?.quantity ?? 1, uom: initial?.uom ?? "pcs", scrapPercent: initial?.scrapPercent ?? 0 });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="flex gap-2 items-end flex-wrap">
      <div><Label>Component *</Label><Input value={form.componentName} onChange={e => set("componentName", e.target.value)} required className="w-40" /></div>
      <div><Label>Qty</Label><Input type="number" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} className="w-20" /></div>
      <div><Label>UOM</Label><Input value={form.uom} onChange={e => set("uom", e.target.value)} className="w-20" /></div>
      <div><Label>Scrap %</Label><Input type="number" value={form.scrapPercent} onChange={e => set("scrapPercent", Number(e.target.value))} className="w-20" /></div>
      <Button type="submit" size="sm" disabled={loading}>{loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Save</Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function BomLines({ bomId }: { bomId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const { data: lines = [], isLoading } = useQuery<any[]>({ queryKey: [`/api/boms/${bomId}/lines`] });
  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/bom-lines", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/boms/${bomId}/lines`] }); setAddOpen(false); toast({ title: "Component added" }); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/bom-lines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/boms/${bomId}/lines`] }),
  });
  if (isLoading) return <div className="py-2 text-sm text-muted-foreground">Loading components...</div>;
  return (
    <div className="ml-8 border-l pl-4 space-y-2">
      <Table>
        <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Qty</TableHead><TableHead>UOM</TableHead><TableHead>Scrap%</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {lines.map(l => (
            <TableRow key={l.id}>
              <TableCell>{l.componentName}</TableCell>
              <TableCell>{l.quantity}</TableCell>
              <TableCell>{l.uom}</TableCell>
              <TableCell>{l.scrapPercent}%</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => deleteM.mutate(l.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
          {lines.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">No components yet</TableCell></TableRow>}
        </TableBody>
      </Table>
      {addOpen ? (
        <BomLineForm bomId={bomId} onSubmit={createM.mutate} onCancel={() => setAddOpen(false)} loading={createM.isPending} />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-3 w-3" />Add Component</Button>
      )}
    </div>
  );
}

export default function BomPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/boms"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/boms", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/boms"] }); setCreateOpen(false); toast({ title: "BOM created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/boms/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/boms"] }); setEditItem(null); toast({ title: "BOM updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/boms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/boms"] }); setDeleteItem(null); toast({ title: "BOM deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.productName?.toLowerCase().includes(search.toLowerCase()));
  const toggleExpand = (id: number) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Layout>
      <PageHeader title="Bill of Materials" subtitle="Define product recipes and component requirements" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New BOM</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead></TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>UOM</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <>
                  <TableRow key={item.id}>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => toggleExpand(item.id)}>{expanded.has(item.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code || "—"}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>{item.version}</TableCell>
                    <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                  {expanded.has(item.id) && (
                    <TableRow key={`${item.id}-lines`}>
                      <TableCell colSpan={9}><BomLines bomId={item.id} /></TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No BOMs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Bill of Materials</DialogTitle></DialogHeader>
          <BomForm onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit BOM</DialogTitle></DialogHeader>
          {editItem && <BomForm initial={editItem} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete BOM?</AlertDialogTitle><AlertDialogDescription>This will also remove all components.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
