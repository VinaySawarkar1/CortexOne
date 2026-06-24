import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmployeeForm from "@/components/hrms/employee-form";
import DepartmentManager, { Department } from "@/components/hrms/department-manager";
import DesignationManager, { Designation } from "@/components/hrms/designation-manager";
import { Plus, Loader2, Pencil, Trash2, Search, Building2, Briefcase } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  active:     "bg-green-100 text-green-700",
  on_leave:   "bg-amber-100 text-amber-700",
  resigned:   "bg-slate-100 text-slate-500",
  terminated: "bg-red-100 text-red-700",
};

export default function EmployeesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [desigOpen, setDesigOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [current, setCurrent] = useState<any>(null);

  const { data: employees = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: designations = [] } = useQuery<Designation[]>({ queryKey: ["/api/designations"] });

  const deptName = (id: any) => departments.find(d => d.id === id)?.name ?? "—";
  const desigName = (id: any) => designations.find(d => d.id === id)?.title ?? "—";

  const createM = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/employees", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employees"] }); setCreateOpen(false); toast({ title: "Employee created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PUT", `/api/employees/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employees"] }); setEditOpen(false); toast({ title: "Employee updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/employees/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employees"] }); setDeleteOpen(false); toast({ title: "Employee deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = employees.filter(e => {
    if (deptFilter !== "all" && String(e.departmentId) !== deptFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.firstName, e.lastName, e.employeeCode, e.email, e.phone].filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
  });

  // KPIs
  const active = employees.filter(e => e.status === "active").length;
  const onLeave = employees.filter(e => e.status === "on_leave").length;
  const newThisMonth = employees.filter(e => {
    const d = new Date(e.createdAt || e.joiningDate);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  return (
    <Layout>
      <PageHeader
        title="Employees"
        subtitle="Manage your organization's workforce"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input className="h-8 w-40 text-xs pl-8" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDeptOpen(true)}>
              <Building2 className="h-3.5 w-3.5 mr-1" />Departments
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDesigOpen(true)}>
              <Briefcase className="h-3.5 w-3.5 mr-1" />Designations
            </Button>
            <Button size="sm" className="h-8 text-xs font-semibold border-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Employee
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-card-value">{employees.length}</div><div className="stat-card-label">Total Employees</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#059669" }}>{active}</div><div className="stat-card-label">Active</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#f59e0b" }}>{onLeave}</div><div className="stat-card-label">On Leave</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#6366f1" }}>{newThisMonth}</div><div className="stat-card-label">Joined This Month</div></div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No employees found</td></tr>
                ) : filtered.map((e: any) => (
                  <tr key={e.id}>
                    <td><span className="font-mono text-xs text-slate-500">{e.employeeCode}</span></td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                          {(e.firstName || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{e.firstName} {e.lastName}</div>
                          <div className="text-[10px] text-slate-400">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-slate-600">{deptName(e.departmentId)}</td>
                    <td className="text-xs text-slate-600">{desigName(e.designationId)}</td>
                    <td className="text-xs text-slate-500 capitalize">{(e.employmentType || "").replace("_", " ")}</td>
                    <td>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[e.status] || "bg-slate-100 text-slate-500"}`}>
                        {(e.status || "").replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setCurrent(e); setEditOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setCurrent(e); setDeleteOpen(true); }} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle><DialogDescription>Enter employee details.</DialogDescription></DialogHeader>
          <EmployeeForm mode="create" isSubmitting={createM.isPending} onSubmit={(data) => createM.mutate(data)} />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle><DialogDescription>Update employee details.</DialogDescription></DialogHeader>
          {current && <EmployeeForm mode="edit" defaultValues={current} isSubmitting={updateM.isPending} onSubmit={(data) => updateM.mutate({ id: current.id, data })} />}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>Permanently remove {current?.firstName} {current?.lastName}. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => current && deleteM.mutate(current.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DepartmentManager open={deptOpen} onOpenChange={setDeptOpen} />
      <DesignationManager open={desigOpen} onOpenChange={setDesigOpen} />
    </Layout>
  );
}
