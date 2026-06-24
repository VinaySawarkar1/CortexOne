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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { StockLocation } from "@/components/inventory/location-manager";
import { Plus, Loader2, Trash2, CheckCircle2 } from "lucide-react";

const TYPES = [
  { v: "receipt", l: "Receipt (in)" },
  { v: "delivery", l: "Delivery (out)" },
  { v: "internal", l: "Internal" },
];
const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  ready: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
const today = () => new Date().toISOString().slice(0, 10);

export default function TransfersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [type, setType] = useState("internal");
  const [fromLoc, setFromLoc] = useState("none");
  const [toLoc, setToLoc] = useState("none");
  const [scheduledDate, setScheduledDate] = useState(today());
  const [lines, setLines] = useState<{ itemId: string; quantity: string }[]>([{ itemId: "", quantity: "" }]);

  const { data: transfers = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/stock-transfers"] });
  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: locations = [] } = useQuery<StockLocation[]>({ queryKey: ["/api/stock-locations"] });

  const locName = (id: any) => (id == null ? "—" : locations.find((l) => l.id === id)?.name ?? `#${id}`);

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/stock-transfers", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/stock-transfers"] }); setCreateOpen(false); resetForm(); toast({ title: "Transfer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const validateM = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/stock-transfers/${id}/validate`)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["/api/stock-quants"] });
      qc.invalidateQueries({ queryKey: ["/api/stock-moves"] });
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Transfer validated", description: "Stock has been updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/stock-transfers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/stock-transfers"] }),
  });

  const resetForm = () => { setReference(""); setType("internal"); setFromLoc("none"); setToLoc("none"); setScheduledDate(today()); setLines([{ itemId: "", quantity: "" }]); };
  const setLine = (i: number, k: string, v: string) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines((ls) => [...ls, { itemId: "", quantity: "" }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!reference.trim()) { toast({ title: "Reference required", variant: "destructive" }); return; }
    const cleanLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) }));
    if (cleanLines.length === 0) { toast({ title: "Add at least one line", variant: "destructive" }); return; }
    createM.mutate({
      reference: reference.trim(), type,
      fromLocationId: fromLoc === "none" ? undefined : Number(fromLoc),
      toLocationId: toLoc === "none" ? undefined : Number(toLoc),
      scheduledDate, status: "draft", items: cleanLines,
    });
  };

  return (
    <Layout>
      <div className="page-body">
        <PageHeader title="Transfers" subtitle="Receipts, deliveries and internal stock movements" />

        <div className="flex justify-end mb-6">
          <Button className="bg-[#6366f1] hover:bg-[#4338ca]" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Transfer</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" /></div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-gray-50"><p className="text-gray-500">No transfers yet.</p></div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead><TableHead>Type</TableHead><TableHead>From → To</TableHead>
                  <TableHead>Lines</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.reference}</TableCell>
                    <TableCell className="capitalize">{t.type}</TableCell>
                    <TableCell className="text-sm">{locName(t.fromLocationId)} → {locName(t.toLocationId)}</TableCell>
                    <TableCell>{Array.isArray(t.items) ? t.items.length : 0}</TableCell>
                    <TableCell className="text-xs">{t.scheduledDate || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusColor[t.status] || ""}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {t.status !== "done" && t.status !== "cancelled" && (
                        <Button size="sm" variant="outline" className="mr-1" disabled={validateM.isPending} onClick={() => validateM.mutate(t.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Validate
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => deleteM.mutate(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[760px] max-h-[95vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Transfer</DialogTitle><DialogDescription>Validating the transfer will move stock between locations.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Reference *</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TR/0001" /></div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From Location</Label>
                  <Select value={fromLoc} onValueChange={setFromLoc}>
                    <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.type})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">To Location</Label>
                  <Select value={toLoc} onValueChange={setToLoc}>
                    <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.type})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Scheduled Date</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Line Items</Label>
                  <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add line</Button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={line.itemId} onValueChange={(v) => setLine(i, "itemId", v)}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>{items.map((it) => <SelectItem key={it.id} value={String(it.id)}>{it.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="w-28" type="number" placeholder="Qty" value={line.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} />
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-[#6366f1] hover:bg-[#4338ca]" onClick={submit} disabled={createM.isPending}>
                  {createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Transfer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
