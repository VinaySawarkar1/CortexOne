import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type CrmLostReason = { id: number; name: string; isActive: boolean };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export default function LostReasonManager({ open, onOpenChange, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const { data: reasons = [] } = useQuery<CrmLostReason[]>({ queryKey: ["/api/crm-lost-reasons"] });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/crm-lost-reasons"] });
    onChanged?.();
  };

  const createMutation = useMutation({
    mutationFn: async (name: string) => (await apiRequest("POST", "/api/crm-lost-reasons", { name })).json(),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<CrmLostReason> }) =>
      (await apiRequest("PUT", `/api/crm-lost-reasons/${id}`, updates)).json(),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/crm-lost-reasons/${id}`)).json(),
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Lost Reasons</DialogTitle>
          <DialogDescription>Reasons offered when marking an opportunity as lost, used for win/loss analysis.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="New lost reason (e.g. Too expensive)" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            <Button onClick={handleAdd} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>

          <div className="space-y-2">
            {reasons.length === 0 ? (
              <p className="text-sm text-gray-500">No lost reasons defined.</p>
            ) : (
              reasons.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded p-2">
                  <span className={`font-medium ${r.isActive ? "" : "text-gray-400 line-through"}`}>{r.name}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={r.isActive ? "secondary" : "default"} onClick={() => updateMutation.mutate({ id: r.id, updates: { isActive: !r.isActive } })}>
                      {r.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(r.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
