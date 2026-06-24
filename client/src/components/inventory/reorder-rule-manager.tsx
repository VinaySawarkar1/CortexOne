import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StockLocation } from "./location-manager";

export type ReorderRule = { id: number; itemId: number; locationId: number | null; minQty: string; maxQty: string; isActive: boolean };

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export default function ReorderRuleManager({ open, onOpenChange }: Props) {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("none");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");

  const { data: rules = [] } = useQuery<ReorderRule[]>({ queryKey: ["/api/reorder-rules"] });
  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: locations = [] } = useQuery<StockLocation[]>({ queryKey: ["/api/stock-locations"] });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/reorder-rules"] });
  const createM = useMutation({ mutationFn: async (p: any) => (await apiRequest("POST", "/api/reorder-rules", p)).json(), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/reorder-rules/${id}`)).json(), onSuccess: invalidate });

  const itemName = (id: number) => items.find((i) => i.id === id)?.name ?? `#${id}`;
  const locName = (id: number | null) => locations.find((l) => l.id === id)?.name ?? "Any";

  const add = () => {
    if (!itemId) return;
    createM.mutate({ itemId, locationId: locationId === "none" ? undefined : Number(locationId), minQty: minQty || "0", maxQty: maxQty || "0", isActive: true });
    setItemId(""); setMinQty(""); setMaxQty("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Reorder Rules</DialogTitle>
          <DialogDescription>Set min/max stock thresholds per item to flag replenishment needs.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Item" /></SelectTrigger>
              <SelectContent>{items.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any location</SelectItem>
                {locations.filter((l) => l.type === "internal").map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="w-24" type="number" placeholder="Min" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
            <Input className="w-24" type="number" placeholder="Max" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
            <Button onClick={add} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {rules.length === 0 ? <p className="text-sm text-gray-500">No reorder rules yet.</p> : rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded p-2 text-sm">
                <span><b>{itemName(r.itemId)}</b> @ {locName(r.locationId)} — min {r.minQty}, max {r.maxQty}</span>
                <Button size="sm" variant="destructive" onClick={() => deleteM.mutate(r.id)}>Delete</Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
