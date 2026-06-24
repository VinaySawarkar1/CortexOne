import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import LocationManager, { StockLocation } from "@/components/inventory/location-manager";
import { Plus, Loader2, Trash2, Warehouse as WarehouseIcon } from "lucide-react";

export default function WarehousesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");

  const { data: warehouses = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/warehouses"] });
  const { data: locations = [] } = useQuery<StockLocation[]>({ queryKey: ["/api/stock-locations"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/warehouses", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/warehouses"] }); setCreateOpen(false); setName(""); setCode(""); setAddress(""); toast({ title: "Warehouse created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/warehouses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/warehouses"] }),
  });

  const locCount = (whId: number) => locations.filter((l) => l.warehouseId === whId).length;

  return (
    <Layout>
      <div className="page-body">
        <PageHeader title="Warehouses" subtitle="Physical sites and their stock locations" />

        <div className="flex justify-end gap-2 mb-6">
          <Button variant="outline" onClick={() => setLocOpen(true)}>Manage Locations</Button>
          <Button className="bg-[#6366f1] hover:bg-[#4338ca]" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Warehouse</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" /></div>
        ) : warehouses.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-gray-50"><p className="text-gray-500">No warehouses yet. Add your first one.</p></div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium flex items-center gap-2"><WarehouseIcon className="h-4 w-4 text-[#6366f1]" /> {w.name}</TableCell>
                    <TableCell className="font-mono text-xs">{w.code || "—"}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{w.address || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{locCount(w.id)}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className={w.isActive ? "bg-green-100 text-green-800" : ""}>{w.isActive ? "active" : "inactive"}</Badge></TableCell>
                    <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => deleteM.mutate(w.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>Add Warehouse</DialogTitle><DialogDescription>Create a physical storage site.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label className="text-xs">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH1" /></div>
              <div><Label className="text-xs">Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div className="flex justify-end">
                <Button className="bg-[#6366f1] hover:bg-[#4338ca]" disabled={!name.trim() || createM.isPending} onClick={() => createM.mutate({ name: name.trim(), code: code.trim() || undefined, address: address.trim() || undefined, isActive: true })}>
                  {createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <LocationManager open={locOpen} onOpenChange={setLocOpen} />
      </div>
    </Layout>
  );
}
