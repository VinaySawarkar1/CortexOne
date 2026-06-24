import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Department = { id: number; name: string; code: string | null; description: string | null; isActive: boolean };

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onChanged?: () => void; }

export default function DepartmentManager({ open, onOpenChange, onChanged }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { data: items = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["/api/departments"] }); onChanged?.(); };
  const createM = useMutation({ mutationFn: async (p: any) => (await apiRequest("POST", "/api/departments", p)).json(), onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: async ({ id, u }: any) => (await apiRequest("PUT", `/api/departments/${id}`, u)).json(), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/departments/${id}`)).json(), onSuccess: invalidate });

  const add = () => { if (!name.trim()) return; createM.mutate({ name: name.trim(), code: code.trim() || undefined, isActive: true }); setName(""); setCode(""); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Departments</DialogTitle>
          <DialogDescription>Organizational departments employees can be assigned to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Code" className="w-28" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button onClick={add} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {items.length === 0 ? <p className="text-sm text-gray-500">No departments yet.</p> : items.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded p-2">
                <span className={`font-medium ${d.isActive ? "" : "text-gray-400 line-through"}`}>{d.name}{d.code ? ` (${d.code})` : ""}</span>
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
