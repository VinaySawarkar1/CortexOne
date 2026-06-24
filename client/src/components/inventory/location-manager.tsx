import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Warehouse = { id: number; name: string; code: string | null; isActive: boolean };
export type StockLocation = { id: number; warehouseId: number | null; name: string; code: string | null; type: string; isActive: boolean };

const TYPES = ["internal", "supplier", "customer", "transit", "scrap"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onChanged?: () => void; }

export default function LocationManager({ open, onOpenChange, onChanged }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("internal");
  const [warehouseId, setWarehouseId] = useState("none");
  const { data: locations = [] } = useQuery<StockLocation[]>({ queryKey: ["/api/stock-locations"] });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ["/api/warehouses"] });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["/api/stock-locations"] }); onChanged?.(); };
  const createM = useMutation({ mutationFn: async (p: any) => (await apiRequest("POST", "/api/stock-locations", p)).json(), onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: async ({ id, u }: any) => (await apiRequest("PUT", `/api/stock-locations/${id}`, u)).json(), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/stock-locations/${id}`)).json(), onSuccess: invalidate });

  const whName = (id: number | null) => warehouses.find((w) => w.id === id)?.name ?? "—";
  const add = () => {
    if (!name.trim()) return;
    createM.mutate({ name: name.trim(), type, warehouseId: warehouseId === "none" ? undefined : Number(warehouseId), isActive: true });
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Manage Stock Locations</DialogTitle>
          <DialogDescription>Locations hold stock. Only <b>internal</b> locations count toward on-hand quantity; supplier/customer locations represent inbound/outbound endpoints.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input className="flex-1 min-w-[160px]" placeholder="Location name (e.g. WH1/Stock)" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No warehouse</SelectItem>
                {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={add} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {locations.length === 0 ? <p className="text-sm text-gray-500">No locations yet.</p> : locations.map((l) => (
              <div key={l.id} className="flex items-center justify-between border rounded p-2">
                <span className={`font-medium ${l.isActive ? "" : "text-gray-400 line-through"}`}>
                  {l.name} <Badge variant="outline" className="ml-1 text-xs capitalize">{l.type}</Badge>
                  <span className="text-xs text-gray-400 ml-2">{whName(l.warehouseId)}</span>
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant={l.isActive ? "secondary" : "default"} onClick={() => updateM.mutate({ id: l.id, u: { isActive: !l.isActive } })}>{l.isActive ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteM.mutate(l.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
