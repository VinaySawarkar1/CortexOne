import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Inventory } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import InventoryTable from "@/components/inventory/inventory-table";
import InventoryForm from "@/components/inventory/inventory-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, PackagePlus, TrendingUp, TrendingDown } from "lucide-react";
import ExcelImportExport from "@/components/common/ExcelImportExport";

export default function InventoryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Inventory | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "remove" | "set">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [currentItem, setCurrentItem] = useState<Inventory | null>(null);

  const { data: inventoryItems = [], isLoading, error } = useQuery<Inventory[]>({ queryKey: ["/api/inventory"] });

  const createInventoryItem = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/inventory", data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      setCreateDialogOpen(false);
      toast({ title: "Item Created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateInventoryItem = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => (await apiRequest("PUT", `/api/inventory/${id}`, data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      setEditDialogOpen(false);
      toast({ title: "Item Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteInventoryItem = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDeleteDialogOpen(false);
      toast({ title: "Item Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustM = useMutation({
    mutationFn: async ({ id, adjustment, note }: any) =>
      (await apiRequest("POST", `/api/inventory/${id}/adjust`, { adjustment, note })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      setAdjustItem(null);
      setAdjustQty("");
      setAdjustNote("");
      toast({ title: "Stock adjusted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEdit = (item: Inventory) => { setCurrentItem(item); setEditDialogOpen(true); };
  const handleDelete = (id: number) => {
    const item = inventoryItems.find(i => i.id === id);
    if (item) { setCurrentItem(item); setDeleteDialogOpen(true); }
  };
  const handleAdjust = (item: Inventory) => {
    setAdjustItem(item);
    setAdjustQty("");
    setAdjustNote("");
    setAdjustType("add");
  };

  const runAdjust = () => {
    if (!adjustItem || !adjustQty) return;
    const qty = Number(adjustQty);
    let adjustment: number;
    if (adjustType === "add") adjustment = qty;
    else if (adjustType === "remove") adjustment = -qty;
    else adjustment = qty - (adjustItem.quantity || 0); // set to exact value
    adjustM.mutate({ id: adjustItem.id, adjustment, note: adjustNote });
  };

  // Unique categories for filter
  const categories = Array.from(new Set(inventoryItems.map(i => i.category).filter(Boolean)));

  const filteredItems = inventoryItems.filter(item => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));
  });

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  // KPIs
  const totalValue = inventoryItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const lowStock = inventoryItems.filter(i => (Number(i.quantity) || 0) < 10 && (Number(i.quantity) || 0) > 0);
  const outOfStock = inventoryItems.filter(i => (Number(i.quantity) || 0) === 0);

  if (error) {
    return <Layout><div className="text-center my-8 text-red-500">{(error as Error).message}</div></Layout>;
  }

  return (
    <Layout>
      <PageHeader
        title="Inventory"
        subtitle="Track stock levels and manage items"
        actions={
          <div className="flex items-center gap-2">
            <Input placeholder="Search inventory…" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className="h-8 w-40 text-xs" />
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <ExcelImportExport entity="inventory" />
            <Button size="sm" className="h-8 text-xs font-semibold border-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Item
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-card-value">{inventoryItems.length}</div><div className="stat-card-label">Total SKUs</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#6366f1" }}>₹{totalValue.toLocaleString("en-IN")}</div><div className="stat-card-label">Total Stock Value</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#f59e0b" }}>{lowStock.length}</div><div className="stat-card-label">Low Stock (&lt;10 units)</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#dc2626" }}>{outOfStock.length}</div><div className="stat-card-label">Out of Stock</div></div>
        </div>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-amber-700">Low Stock:</span>
            {lowStock.slice(0, 6).map(i => (
              <span key={i.id} className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{i.name} ({i.quantity})</span>
            ))}
            {lowStock.length > 6 && <span className="text-[10px] text-amber-600">+{lowStock.length - 6} more</span>}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : (
          <>
            <InventoryTable
              items={paginatedItems}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdjust={handleAdjust}
            />
            {filteredItems.length > pageSize && (
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-slate-400">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}</div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page * pageSize >= filteredItems.length} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Add New Item</DialogTitle><DialogDescription>Fill in the inventory item details.</DialogDescription></DialogHeader>
          <InventoryForm onSubmit={(data) => createInventoryItem.mutate(data)} isSubmitting={createInventoryItem.isPending} mode="create" />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Edit Item</DialogTitle><DialogDescription>Update inventory item details.</DialogDescription></DialogHeader>
          {currentItem && <InventoryForm defaultValues={currentItem} onSubmit={(data) => updateInventoryItem.mutate({ id: currentItem.id, data })} isSubmitting={updateInventoryItem.isPending} mode="edit" />}
        </DialogContent>
      </Dialog>

      {/* Stock Adjust dialog */}
      <Dialog open={!!adjustItem} onOpenChange={v => !v && setAdjustItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackagePlus className="h-4 w-4 text-indigo-600" />Stock Adjustment</DialogTitle>
            <DialogDescription>{adjustItem?.name} — Current: {adjustItem?.quantity} units</DialogDescription>
          </DialogHeader>
          {adjustItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500">Adjustment Type</Label>
                <div className="flex gap-2 mt-1.5">
                  {(["add", "remove", "set"] as const).map(t => (
                    <button key={t} onClick={() => setAdjustType(t)}
                      className={`flex-1 h-8 text-xs font-semibold rounded-lg border transition-colors capitalize flex items-center justify-center gap-1 ${adjustType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                      {t === "add" ? <TrendingUp className="h-3.5 w-3.5" /> : t === "remove" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">
                  {adjustType === "set" ? "Set stock to" : adjustType === "add" ? "Add quantity" : "Remove quantity"}
                </Label>
                <Input type="number" min="0" className="h-8 text-xs mt-1" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Enter quantity" />
                {adjustType !== "set" && adjustQty && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    New stock: {adjustType === "add"
                      ? (adjustItem.quantity || 0) + Number(adjustQty)
                      : Math.max(0, (adjustItem.quantity || 0) - Number(adjustQty))} units
                  </p>
                )}
                {adjustType === "set" && adjustQty && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Change: {Number(adjustQty) - (adjustItem.quantity || 0) >= 0 ? "+" : ""}{Number(adjustQty) - (adjustItem.quantity || 0)} units
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-slate-500">Reason / Notes</Label>
                <Textarea className="text-xs mt-1" rows={2} placeholder="e.g. Stock received, damaged goods, returned items…" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAdjustItem(null)}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={runAdjust} disabled={!adjustQty || adjustM.isPending}>
                  {adjustM.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Apply Adjustment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete "{currentItem?.name}" ({currentItem?.sku}). Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => currentItem && deleteInventoryItem.mutate(currentItem.id)}>
              {deleteInventoryItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
