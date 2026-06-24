import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Department } from "./department-manager";

export type Designation = { id: number; title: string; departmentId: number | null; level: string | null; isActive: boolean };

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onChanged?: () => void; }

const LEVELS = ["junior", "mid", "senior", "lead", "manager"];

export default function DesignationManager({ open, onOpenChange, onChanged }: Props) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("mid");
  const [departmentId, setDepartmentId] = useState<string>("none");
  const { data: items = [] } = useQuery<Designation[]>({ queryKey: ["/api/designations"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["/api/designations"] }); onChanged?.(); };
  const createM = useMutation({ mutationFn: async (p: any) => (await apiRequest("POST", "/api/designations", p)).json(), onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: async ({ id, u }: any) => (await apiRequest("PUT", `/api/designations/${id}`, u)).json(), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/designations/${id}`)).json(), onSuccess: invalidate });

  const deptName = (id: number | null) => departments.find((d) => d.id === id)?.name ?? "—";
  const add = () => {
    if (!title.trim()) return;
    createM.mutate({ title: title.trim(), level, departmentId: departmentId === "none" ? undefined : Number(departmentId), isActive: true });
    setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Manage Designations</DialogTitle>
          <DialogDescription>Job positions / titles, optionally tied to a department.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Designation title" className="flex-1 min-w-[160px]" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No department</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={add} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {items.length === 0 ? <p className="text-sm text-gray-500">No designations yet.</p> : items.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded p-2">
                <span className={`font-medium ${d.isActive ? "" : "text-gray-400 line-through"}`}>{d.title} <span className="text-xs text-gray-400">· {d.level || "—"} · {deptName(d.departmentId)}</span></span>
                <div className="flex gap-2">
                  <Button size="sm" variant={d.isActive ? "secondary" : "default"} onClick={() => updateM.mutate({ id: d.id, u: { isActive: !d.isActive } })}>{d.isActive ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteM.mutate(d.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
