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
import { Loader2, Trash2 } from "lucide-react";

const STATUSES = ["present", "absent", "half_day", "leave", "holiday", "week_off"];
const statusColor: Record<string, string> = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  half_day: "bg-yellow-100 text-yellow-800",
  leave: "bg-blue-100 text-blue-800",
  holiday: "bg-purple-100 text-purple-800",
  week_off: "bg-gray-100 text-gray-700",
};
const today = () => new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState(today());
  const [employeeId, setEmployeeId] = useState<string>("");
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: records = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/attendance"] });

  const empName = (id: any) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName || ""}`.trim() : `#${id}`;
  };

  const computeHours = () => {
    if (!checkIn || !checkOut) return undefined;
    const [h1, m1] = checkIn.split(":").map(Number);
    const [h2, m2] = checkOut.split(":").map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    return mins > 0 ? (mins / 60).toFixed(2) : undefined;
  };

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/attendance", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/attendance"] }); toast({ title: "Attendance recorded" }); setCheckIn(""); setCheckOut(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/attendance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/attendance"] }),
  });

  const mark = () => {
    if (!employeeId) { toast({ title: "Select an employee", variant: "destructive" }); return; }
    createM.mutate({
      employeeId: Number(employeeId), date, status,
      checkIn: checkIn || undefined, checkOut: checkOut || undefined,
      workHours: computeHours(),
    });
  };

  const dayRecords = records.filter((r) => r.date === filterDate);

  return (
    <Layout>
      <div className="page-body">
        <PageHeader title="Attendance" subtitle="Record and review daily attendance" />

        {/* Mark form */}
        <div className="border rounded-lg p-4 bg-gray-50 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Check In</Label><Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Check Out</Label><Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
          </div>
          <div className="lg:col-span-6 flex justify-end">
            <Button className="bg-[#6366f1] hover:bg-[#4338ca]" onClick={mark} disabled={createM.isPending}>
              {createM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mark Attendance
            </Button>
          </div>
        </div>

        {/* Filter + table */}
        <div className="flex items-center gap-3 mb-3">
          <Label className="text-sm">Showing</Label>
          <Input type="date" className="w-44" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <Badge variant="outline">{dayRecords.length} records</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" /></div>
        ) : dayRecords.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-gray-50"><p className="text-gray-500">No attendance for this date.</p></div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{empName(r.employeeId)}</TableCell>
                    <TableCell><Badge className={statusColor[r.status] || ""} variant="secondary">{(r.status || "").replace("_", " ")}</Badge></TableCell>
                    <TableCell>{r.checkIn || "—"}</TableCell>
                    <TableCell>{r.checkOut || "—"}</TableCell>
                    <TableCell>{r.workHours ?? "—"}</TableCell>
                    <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => deleteM.mutate(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
