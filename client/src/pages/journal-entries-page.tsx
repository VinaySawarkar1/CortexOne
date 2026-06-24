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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, BookOpen, FileDown } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", posted: "bg-green-100 text-green-700",
};

type JELine = { accountId: number; description: string; debit: number; credit: number };

function JournalEntryForm({ initial, accounts, onSubmit, loading }: { initial?: any; accounts: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", date: initial?.date ?? "", reference: initial?.reference ?? "",
    notes: initial?.notes ?? "", lines: initial?.lines ?? [] as JELine[],
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => set("lines", [...form.lines, { accountId: 0, description: "", debit: 0, credit: 0 }]);
  const setLine = (i: number, k: string, v: any) => { const lines = [...form.lines]; lines[i] = { ...lines[i], [k]: v }; set("lines", lines); };
  const removeLine = (i: number) => set("lines", form.lines.filter((_: any, idx: number) => idx !== i));
  const totalDebit = form.lines.reduce((s: number, l: JELine) => s + (l.debit || 0), 0);
  const totalCredit = form.lines.reduce((s: number, l: JELine) => s + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} required /></div>
        <div><Label>Reference</Label><Input value={form.reference} onChange={e => set("reference", e.target.value)} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
      <div>
        <div className="flex items-center justify-between mb-2"><Label>Journal Lines</Label><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Line</Button></div>
        <Table>
          <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Description</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {form.lines.map((line: JELine, i: number) => (
              <TableRow key={i}>
                <TableCell>
                  <Select value={String(line.accountId)} onValueChange={v => setLine(i, "accountId", Number(v))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Account" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input value={line.description} onChange={e => setLine(i, "description", e.target.value)} className="w-36" /></TableCell>
                <TableCell><Input type="number" value={line.debit} onChange={e => setLine(i, "debit", Number(e.target.value))} className="w-24" /></TableCell>
                <TableCell><Input type="number" value={line.credit} onChange={e => setLine(i, "credit", Number(e.target.value))} className="w-24" /></TableCell>
                <TableCell><Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell colSpan={2}>Totals</TableCell>
              <TableCell className={!balanced && form.lines.length > 0 ? "text-destructive" : ""}>₹{totalDebit.toFixed(2)}</TableCell>
              <TableCell className={!balanced && form.lines.length > 0 ? "text-destructive" : ""}>₹{totalCredit.toFixed(2)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {!balanced && form.lines.length > 0 && <p className="text-destructive text-sm">Debits and credits must balance before posting.</p>}
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function JournalEntriesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/journal-entries"] });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/accounts"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/journal-entries", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/journal-entries"] }); setCreateOpen(false); toast({ title: "Journal entry created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/journal-entries/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/journal-entries"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/journal-entries/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/journal-entries"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });
  const postM = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/journal-entries/${id}/post`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/journal-entries"] }); qc.invalidateQueries({ queryKey: ["/api/accounts"] }); toast({ title: "Journal entry posted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const getTotals = (entry: any) => {
    const lines = entry.lines || [];
    const debit = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);
    return { debit, credit };
  };

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.reference?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Journal Entries" subtitle="Manual accounting entries and ledger postings" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Entry</Button>} />
      <div className="p-6 space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => {
                const { debit, credit } = getTotals(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.reference || "—"}</TableCell>
                    <TableCell className="text-right">₹{debit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{credit.toFixed(2)}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.draft}`}>{item.status}</span></TableCell>
                    <TableCell><div className="flex gap-2">
                      {item.status === 'draft' && <Button size="sm" variant="outline" onClick={() => postM.mutate(item.id)} disabled={postM.isPending}><BookOpen className="mr-1 h-3 w-3" />Post</Button>}
                      {item.status === 'draft' && <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" title="Download PDF" onClick={() => window.open(`/api/journal-entries/${item.id}/download-pdf`, '_blank')}><FileDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No journal entries found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <JournalEntryForm accounts={accounts} onSubmit={createM.mutate} loading={createM.isPending} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Edit Journal Entry</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {editItem && <JournalEntryForm initial={editItem} accounts={accounts} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
