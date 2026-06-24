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
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";

const ACCOUNT_TYPES = ["assets", "liabilities", "equity", "income", "expense"] as const;

function AccountForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ code: initial?.code ?? "", name: initial?.name ?? "", type: initial?.type ?? "assets", groupName: initial?.groupName ?? "", openingBalance: initial?.openingBalance ?? 0, isActive: initial?.isActive ?? true });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Code *</Label><Input value={form.code} onChange={e => set("code", e.target.value)} required placeholder="e.g. 1001" /></div>
        <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
        <div><Label>Type *</Label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Group</Label><Input value={form.groupName} onChange={e => set("groupName", e.target.value)} placeholder="e.g. Current Assets" /></div>
        <div><Label>Opening Balance</Label><Input type="number" value={form.openingBalance} onChange={e => set("openingBalance", Number(e.target.value))} /></div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function AccountsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/accounts"] });

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/accounts", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setCreateOpen(false); toast({ title: "Account created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/accounts/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setEditItem(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setDeleteItem(null); toast({ title: "Deleted" }); },
  });

  const toggleSection = (t: string) => setCollapsed(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <Layout>
      <PageHeader title="Chart of Accounts" subtitle="Manage your financial accounts structure" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Account</Button>} />
      <div className="p-6 space-y-4">
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          ACCOUNT_TYPES.map(type => {
            const typeAccounts = items.filter(a => a.type === type);
            if (typeAccounts.length === 0) return null;
            const isCollapsed = collapsed.has(type);
            return (
              <div key={type} className="border rounded-lg">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 cursor-pointer rounded-t-lg" onClick={() => toggleSection(type)}>
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <h3 className="font-semibold capitalize">{type}</h3>
                  <span className="text-muted-foreground text-sm">({typeAccounts.length})</span>
                  <span className="ml-auto text-sm font-medium">₹{typeAccounts.reduce((s, a) => s + (parseFloat(a.currentBalance) || 0), 0).toFixed(2)}</span>
                </div>
                {!isCollapsed && (
                  <Table>
                    <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Group</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {typeAccounts.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.code}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.groupName || "—"}</TableCell>
                          <TableCell className="text-right">₹{(parseFloat(item.currentBalance) || 0).toFixed(2)}</TableCell>
                          <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })
        )}
        {!isLoading && items.length === 0 && <div className="text-center text-muted-foreground py-16">No accounts yet. Add your chart of accounts to get started.</div>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
          <AccountForm onSubmit={createM.mutate} loading={createM.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          {editItem && <AccountForm initial={editItem} onSubmit={data => updateM.mutate({ id: editItem.id, data })} loading={updateM.isPending} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Account?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteM.mutate(deleteItem.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
