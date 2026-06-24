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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";

const STAGES = ["new", "screening", "interview", "offer", "hired", "rejected"] as const;
const stageColors: Record<string, string> = {
  new: "bg-gray-100 text-gray-700", screening: "bg-blue-100 text-blue-700",
  interview: "bg-yellow-100 text-yellow-700", offer: "bg-purple-100 text-purple-700",
  hired: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
};

function JobPositionForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ title: initial?.title ?? "", department: initial?.department ?? "", vacancies: initial?.vacancies ?? 1, status: initial?.status ?? "open", salaryMin: initial?.salaryMin ?? 0, salaryMax: initial?.salaryMax ?? 0 });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} required /></div>
        <div><Label>Department</Label><Input value={form.department} onChange={e => set("department", e.target.value)} /></div>
        <div><Label>Vacancies</Label><Input type="number" value={form.vacancies} onChange={e => set("vacancies", Number(e.target.value))} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Min Salary (₹)</Label><Input type="number" value={form.salaryMin} onChange={e => set("salaryMin", Number(e.target.value))} /></div>
        <div><Label>Max Salary (₹)</Label><Input type="number" value={form.salaryMax} onChange={e => set("salaryMax", Number(e.target.value))} /></div>
      </div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

function ApplicationForm({ initial, positions, onSubmit, loading }: { initial?: any; positions: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ applicantName: initial?.applicantName ?? "", positionId: initial?.positionId ?? "", source: initial?.source ?? "", stage: initial?.stage ?? "new", rating: initial?.rating ?? 0, notes: initial?.notes ?? "" });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Applicant Name *</Label><Input value={form.applicantName} onChange={e => set("applicantName", e.target.value)} required /></div>
        <div><Label>Position *</Label>
          <Select value={String(form.positionId)} onValueChange={v => set("positionId", Number(v))}>
            <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
            <SelectContent>{positions.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Source</Label><Input value={form.source} onChange={e => set("source", e.target.value)} placeholder="LinkedIn, Referral, etc." /></div>
        <div><Label>Stage</Label>
          <Select value={form.stage} onValueChange={v => set("stage", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Rating (1-5)</Label><Input type="number" min={0} max={5} value={form.rating} onChange={e => set("rating", Number(e.target.value))} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} /></div>
      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
    </form>
  );
}

export default function RecruitmentPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"positions" | "applications">("positions");
  const [createPos, setCreatePos] = useState(false);
  const [editPos, setEditPos] = useState<any>(null);
  const [deletePos, setDeletePos] = useState<any>(null);
  const [createApp, setCreateApp] = useState(false);
  const [editApp, setEditApp] = useState<any>(null);
  const [deleteApp, setDeleteApp] = useState<any>(null);

  const { data: positions = [], isLoading: posLoading } = useQuery<any[]>({ queryKey: ["/api/job-positions"] });
  const { data: applications = [], isLoading: appLoading } = useQuery<any[]>({ queryKey: ["/api/job-applications"] });

  const createPos_M = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/job-positions", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/job-positions"] }); setCreatePos(false); toast({ title: "Position created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updatePos_M = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/job-positions/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/job-positions"] }); setEditPos(null); toast({ title: "Updated" }); },
  });
  const deletePos_M = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/job-positions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/job-positions"] }); setDeletePos(null); toast({ title: "Deleted" }); },
  });
  const createApp_M = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/job-applications", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/job-applications"] }); setCreateApp(false); toast({ title: "Application created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateApp_M = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/job-applications/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/job-applications"] }); setEditApp(null); toast({ title: "Updated" }); },
  });
  const deleteApp_M = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/job-applications/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/job-applications"] }); setDeleteApp(null); toast({ title: "Deleted" }); },
  });

  const posTitle = (id: any) => positions.find(p => p.id === id)?.title ?? "—";

  return (
    <Layout>
      <PageHeader title="Recruitment" subtitle="Manage job openings and track applicants" actions={
        <Button onClick={() => tab === "positions" ? setCreatePos(true) : setCreateApp(true)}><Plus className="mr-2 h-4 w-4" />{tab === "positions" ? "New Position" : "New Application"}</Button>
      } />
      <div className="p-6 space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <Button variant={tab === "positions" ? "default" : "ghost"} size="sm" onClick={() => setTab("positions")}>Job Positions</Button>
          <Button variant={tab === "applications" ? "default" : "ghost"} size="sm" onClick={() => setTab("applications")}>Applications</Button>
        </div>

        {tab === "positions" && (
          posLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Department</TableHead><TableHead>Vacancies</TableHead><TableHead>Status</TableHead><TableHead>Salary Range</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {positions.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.department || "—"}</TableCell>
                    <TableCell>{p.vacancies}</TableCell>
                    <TableCell><Badge variant={p.status === "open" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>{p.salaryMin ? `₹${p.salaryMin} – ₹${p.salaryMax}` : "—"}</TableCell>
                    <TableCell><div className="flex gap-2"><Button size="icon" variant="ghost" onClick={() => setEditPos(p)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeletePos(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
                {positions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No positions yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          )
        )}

        {tab === "applications" && (
          appLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <div className="grid grid-cols-3 gap-4 md:grid-cols-6 overflow-x-auto">
              {STAGES.map(stage => (
                <div key={stage} className="min-w-[160px]">
                  <div className={`text-xs font-semibold px-2 py-1 rounded mb-2 ${stageColors[stage]}`}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</div>
                  <div className="space-y-2">
                    {applications.filter(a => a.stage === stage).map(app => (
                      <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditApp(app)}>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm">{app.applicantName}</CardTitle></CardHeader>
                        <CardContent className="p-2 pt-1 space-y-1">
                          <div className="text-xs text-muted-foreground">{posTitle(app.positionId)}</div>
                          {app.source && <div className="text-xs text-muted-foreground">{app.source}</div>}
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= (app.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />)}
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); setDeleteApp(app); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <Dialog open={createPos} onOpenChange={setCreatePos}>
        <DialogContent><DialogHeader><DialogTitle>New Job Position</DialogTitle></DialogHeader>
          <JobPositionForm onSubmit={createPos_M.mutate} loading={createPos_M.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editPos} onOpenChange={v => !v && setEditPos(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Job Position</DialogTitle></DialogHeader>
          {editPos && <JobPositionForm initial={editPos} onSubmit={data => updatePos_M.mutate({ id: editPos.id, data })} loading={updatePos_M.isPending} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletePos} onOpenChange={v => !v && setDeletePos(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Position?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletePos_M.mutate(deletePos.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createApp} onOpenChange={setCreateApp}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New Application</DialogTitle></DialogHeader>
          <ApplicationForm positions={positions} onSubmit={createApp_M.mutate} loading={createApp_M.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editApp} onOpenChange={v => !v && setEditApp(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Application</DialogTitle></DialogHeader>
          {editApp && <ApplicationForm initial={editApp} positions={positions} onSubmit={data => updateApp_M.mutate({ id: editApp.id, data })} loading={updateApp_M.isPending} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteApp} onOpenChange={v => !v && setDeleteApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Application?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteApp_M.mutate(deleteApp.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
