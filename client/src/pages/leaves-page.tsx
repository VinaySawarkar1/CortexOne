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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LeaveTypeManager, { LeaveType } from "@/components/hrms/leave-type-manager";
import { Loader2, Check, X, Plus } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => {
  if (!a || !b) return 0;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return d >= 0 ? d + 1 : 0;
};

export default function LeavesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typeMgrOpen, setTypeMgrOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [reason, setReason] = useState("");

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({ queryKey: ["/api/leave-types"] });
  const { data: requests = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/leave-requests"] });

  const empName = (id: any) => { const e = employees.find((x) => x.id === id); return e ? `${e.firstName} ${e.lastName || ""}`.trim() : `#${id}`; };
  const typeName = (id: any) => leaveTypes.find((t) => t.id === id)?.name ?? `#${id}`;

  const applyM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/leave-requests", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leave-requests"] }); toast({ title: "Leave applied" }); setReason(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const decideM = useMutation({
    mutationFn: async ({ id, decision }: any) => (await apiRequest("POST", `/api/leave-requests/${id}/decision`, { decision })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leave-requests"] }); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const apply = () => {
    if (!employeeId || !leaveTypeId) { toast({ title: "Select employee and leave type", variant: "destructive" }); return; }
    applyM.mutate({
      employeeId: Number(employeeId), leaveTypeId: Number(leaveTypeId),
      fromDate, toDate, days: String(daysBetween(fromDate, toDate)), reason: reason || undefined,
    });
  };

  return (
    <Layout>
      <div className="page-body">
        <PageHeader title="Leave Management" subtitle="Apply for and approve employee leaves" />

        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={() => setTypeMgrOpen(true)}>Leave Types</Button>
        </div>

        {/* Apply form */}
        <div className="border rounded-lg p-4 bg-gray-50 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Leave Type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{leaveTypes.filter((t) => t.isActive).map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          <div className="text-sm text-gray-600">{daysBetween(fromDate, toDate)} day(s)</div>
          <div className="lg:col-span-4"><Label className="text-xs">Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" /></div>
          <div className="flex justify-end">
            <Button className="bg-[#6366f1] hover:bg-[#4338ca]" onClick={apply} disabled={applyM.isPending}>
              {applyM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Apply
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-gray-50"><p className="text-gray-500">No leave requests yet.</p></div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{empName(r.employeeId)}</TableCell>
                    <TableCell>{typeName(r.leaveTypeId)}</TableCell>
                    <TableCell>{r.fromDate}</TableCell>
                    <TableCell>{r.toDate}</TableCell>
                    <TableCell>{r.days ?? "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={r.reason}>{r.reason || "—"}</TableCell>
                    <TableCell><Badge className={statusColor[r.status] || ""} variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" ? (
                        <>
                          <Button size="icon" variant="ghost" title="Approve" onClick={() => decideM.mutate({ id: r.id, decision: "approved" })}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" title="Reject" onClick={() => decideM.mutate({ id: r.id, decision: "rejected" })}><X className="h-4 w-4 text-red-500" /></Button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">{r.approvedBy ? `by ${r.approvedBy}` : "—"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <LeaveTypeManager open={typeMgrOpen} onOpenChange={setTypeMgrOpen} />
      </div>
    </Layout>
  );
}
