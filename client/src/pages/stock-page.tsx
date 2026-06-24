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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReorderRuleManager from "@/components/inventory/reorder-rule-manager";
import type { StockLocation } from "@/components/inventory/location-manager";
import { Loader2, ArrowRightLeft } from "lucide-react";

export default function StockPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reorderOpen, setReorderOpen] = useState(false);
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [operation, setOperation] = useState("add");
  const [quantity, setQuantity] = useState("");

  const { data: quants = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/stock-quants"] });
  const { data: moves = [] } = useQuery<any[]>({ queryKey: ["/api/stock-moves"] });
  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: locations = [] } = useQuery<StockLocation[]>({ queryKey: ["/api/stock-locations"] });

  const itemName = (id: any) => items.find((i) => i.id === id)?.name ?? `#${id}`;
  const locName = (id: any) => (id == null ? "—" : locations.find((l) => l.id === id)?.name ?? `#${id}`);

  const moveM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/stock-moves", data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stock-quants"] });
      qc.invalidateQueries({ queryKey: ["/api/stock-moves"] });
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Stock updated" });
      setQuantity("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjust = () => {
    if (!itemId || !locationId || !quantity) { toast({ title: "Item, location and quantity required", variant: "destructive" }); return; }
    const payload: any = { itemId, quantity: String(quantity), type: "adjustment", status: "done" };
    if (operation === "add") payload.toLocationId = Number(locationId);
    else payload.fromLocationId = Number(locationId);
    moveM.mutate(payload);
  };

  return (
    <Layout>
      <div className="page-body">
        <PageHeader title="Stock" subtitle="On-hand quantities by location and stock movements" />

        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={() => setReorderOpen(true)}>Reorder Rules</Button>
        </div>

        {/* Quick adjustment */}
        <div className="border rounded-lg p-4 bg-gray-50 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <Label className="text-xs">Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>{items.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Internal location" /></SelectTrigger>
              <SelectContent>{locations.filter((l) => l.type === "internal").map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Operation</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="add">Add (Receipt)</SelectItem><SelectItem value="remove">Remove (Issue)</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Qty</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          </div>
          <div className="lg:col-span-5 flex justify-end">
            <Button className="bg-[#6366f1] hover:bg-[#4338ca]" onClick={adjust} disabled={moveM.isPending}>
              {moveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply
            </Button>
          </div>
        </div>

        <Tabs defaultValue="onhand">
          <TabsList>
            <TabsTrigger value="onhand">On Hand</TabsTrigger>
            <TabsTrigger value="moves">Move History</TabsTrigger>
          </TabsList>

          <TabsContent value="onhand">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" /></div>
            ) : quants.length === 0 ? (
              <div className="text-center py-12 border rounded-md bg-gray-50"><p className="text-gray-500">No stock on hand yet. Use the form above to add stock.</p></div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Location</TableHead><TableHead className="text-right">On Hand</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {quants.filter((q) => Number(q.quantity) !== 0).map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{itemName(q.itemId)}</TableCell>
                        <TableCell>{locName(q.locationId)}</TableCell>
                        <TableCell className="text-right font-semibold">{q.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="moves">
            {moves.length === 0 ? (
              <div className="text-center py-12 border rounded-md bg-gray-50"><p className="text-gray-500">No stock moves recorded.</p></div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>From → To</TableHead><TableHead>Qty</TableHead><TableHead>Type</TableHead><TableHead>Ref</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {moves.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{m.date || "—"}</TableCell>
                        <TableCell className="font-medium">{itemName(m.itemId)}</TableCell>
                        <TableCell className="text-sm flex items-center gap-1">{locName(m.fromLocationId)} <ArrowRightLeft className="h-3 w-3 text-gray-400" /> {locName(m.toLocationId)}</TableCell>
                        <TableCell>{m.quantity}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{m.type}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-400">{m.reference || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ReorderRuleManager open={reorderOpen} onOpenChange={setReorderOpen} />
      </div>
    </Layout>
  );
}
