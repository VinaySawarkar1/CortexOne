import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Payment } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "UPI", "Credit Card", "Other"];

function PaymentForm({ initial, invoices, onSubmit, loading, onCancel }: {
  initial?: any; invoices: any[]; onSubmit: (d: any) => void; loading: boolean; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    paymentNumber: initial?.paymentNumber ?? `PAY-${Date.now()}`,
    customerName: initial?.customerName ?? "",
    amount: initial?.amount ?? "",
    receivedAmount: initial?.receivedAmount ?? "",
    paymentMethod: initial?.paymentMethod ?? "Bank Transfer",
    paymentDate: initial?.paymentDate ?? new Date().toISOString().split("T")[0],
    status: initial?.status ?? "pending",
    invoiceId: initial?.invoiceId ? String(initial.invoiceId) : "",
    referenceNumber: initial?.referenceNumber ?? "",
    notes: initial?.notes ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill customer name when invoice is selected
  useEffect(() => {
    if (form.invoiceId) {
      const inv = invoices.find(i => String(i.id) === form.invoiceId);
      if (inv) {
        setForm(f => ({
          ...f,
          customerName: inv.customerName || f.customerName,
          amount: f.amount || inv.totalAmount || "",
        }));
      }
    }
  }, [form.invoiceId]);

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, invoiceId: form.invoiceId ? Number(form.invoiceId) : undefined }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Payment Number *</Label><Input value={form.paymentNumber} onChange={e => set("paymentNumber", e.target.value)} required /></div>
        <div><Label>Customer Name *</Label><Input value={form.customerName} onChange={e => set("customerName", e.target.value)} required /></div>
        <div>
          <Label>Link to Invoice</Label>
          <Select value={form.invoiceId} onValueChange={v => set("invoiceId", v)}>
            <SelectTrigger><SelectValue placeholder="Select invoice (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {invoices.map(inv => (
                <SelectItem key={inv.id} value={String(inv.id)}>
                  {inv.invoiceNumber} — ₹{parseFloat(inv.totalAmount || "0").toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Payment Method</Label>
          <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} required /></div>
        <div><Label>Received Amount (₹)</Label><Input type="number" value={form.receivedAmount} onChange={e => set("receivedAmount", e.target.value)} /></div>
        <div><Label>Payment Date *</Label><Input type="date" value={form.paymentDate} onChange={e => set("paymentDate", e.target.value)} required /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Reference #</Label><Input value={form.referenceNumber} onChange={e => set("referenceNumber", e.target.value)} /></div>
      </div>
      <div><Label>Notes</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{initial ? "Update" : "Create"} Payment</Button>
      </div>
    </form>
  );
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [prefillInvoiceId, setPrefillInvoiceId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: payments = [], isLoading } = useQuery<Payment[]>({ queryKey: ["/api/payments"] });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/invoices"] });

  // Auto-open dialog when navigated from invoice "Record Payment" button
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get("invoiceId");
    if (invoiceId) { setPrefillInvoiceId(invoiceId); setDialogOpen(true); }
  }, []);

  const createPayment = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/payments", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDialogOpen(false);
      toast({ title: "Payment Created", description: "Invoice marked as paid if linked." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => (await apiRequest("PUT", `/api/payments/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setDialogOpen(false); setEditingPayment(null);
      toast({ title: "Payment Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/payments"] }); toast({ title: "Payment Deleted" }); },
  });

  const handleSubmit = (data: any) => {
    if (editingPayment) updatePayment.mutate({ id: editingPayment.id, data });
    else createPayment.mutate(data);
  };

  const filteredPayments = payments.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || p.paymentNumber?.toLowerCase().includes(q) || (p as any).customerName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = payments.reduce((s, p) => s + parseFloat((p as any).amount || "0"), 0);
  const receivedAmount = payments.reduce((s, p) => s + parseFloat((p as any).receivedAmount || "0"), 0);

  return (
    <Layout>
      <PageHeader title="Payments" subtitle="Manage payment transactions and receipts"
        actions={<Button onClick={() => { setEditingPayment(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Create Payment</Button>}
      />
      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Payments", value: payments.length, color: "text-foreground" },
            { label: "Total Amount", value: `₹${totalAmount.toLocaleString()}`, color: "text-blue-600" },
            { label: "Received", value: `₹${receivedAmount.toLocaleString()}`, color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <Input placeholder="Search payments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(p => {
                const inv = invoices.find(i => i.id === (p as any).invoiceId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.paymentNumber}</TableCell>
                    <TableCell>{(p as any).customerName}</TableCell>
                    <TableCell>{(p as any).paymentMethod}</TableCell>
                    <TableCell className="text-right">₹{parseFloat((p as any).amount || "0").toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'completed' ? 'bg-green-100 text-green-700' :
                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>{p.status}</span>
                    </TableCell>
                    <TableCell>{(p as any).paymentDate ? new Date((p as any).paymentDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv ? inv.invoiceNumber : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingPayment(p); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete payment?")) deletePayment.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPayments.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditingPayment(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingPayment ? "Edit Payment" : "Create Payment"}</DialogTitle></DialogHeader>
          <PaymentForm
            initial={editingPayment ?? (prefillInvoiceId ? { invoiceId: prefillInvoiceId } : undefined)}
            invoices={invoices}
            onSubmit={handleSubmit}
            loading={createPayment.isPending || updatePayment.isPending}
            onCancel={() => { setDialogOpen(false); setEditingPayment(null); }}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
