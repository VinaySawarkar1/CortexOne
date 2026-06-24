import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, Trophy } from "lucide-react";

export type CrmStage = {
  id: number;
  name: string;
  sequence: number;
  probability: number | null;
  isWon: boolean;
  isActive: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export default function StageManager({ open, onOpenChange, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [newWon, setNewWon] = useState(false);
  const { data: stages = [] } = useQuery<CrmStage[]>({ queryKey: ["/api/crm-stages"] });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/crm-stages"] });
    onChanged?.();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await apiRequest("POST", "/api/crm-stages", payload)).json(),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<CrmStage> }) =>
      (await apiRequest("PUT", `/api/crm-stages/${id}`, updates)).json(),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/crm-stages/${id}`)).json(),
    onSuccess: invalidate,
  });

  const sorted = [...stages].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const maxSeq = sorted.length ? Math.max(...sorted.map((s) => s.sequence ?? 0)) : 0;
    createMutation.mutate({ name, sequence: maxSeq + 1, isWon: newWon, isActive: true });
    setNewName("");
    setNewWon(false);
  };

  const move = (stage: CrmStage, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    updateMutation.mutate({ id: stage.id, updates: { sequence: swapWith.sequence } });
    updateMutation.mutate({ id: swapWith.id, updates: { sequence: stage.sequence } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Manage Pipeline Stages</DialogTitle>
          <DialogDescription>
            Stages are the columns of your sales pipeline. Reorder them, mark the final "won" stage, and disable stages you no longer use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="flex-1 min-w-[200px]"
              placeholder="New stage name (e.g. Qualified)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={newWon} onCheckedChange={(v) => setNewWon(!!v)} />
              Won stage
            </label>
            <Button onClick={handleAdd} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>

          <div className="space-y-2">
            {sorted.length === 0 ? (
              <p className="text-sm text-gray-500">No stages yet. Add your first stage above.</p>
            ) : (
              sorted.map((stage, idx) => (
                <div key={stage.id} className="flex items-center justify-between border rounded p-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline">{idx + 1}</Badge>
                    <span className={`font-medium truncate ${stage.isActive ? "" : "text-gray-400 line-through"}`}>{stage.name}</span>
                    {stage.isWon && <Trophy className="h-4 w-4 text-green-600" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(stage, -1)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={idx === sorted.length - 1} onClick={() => move(stage, 1)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="sm" variant={stage.isWon ? "secondary" : "outline"} onClick={() => updateMutation.mutate({ id: stage.id, updates: { isWon: !stage.isWon } })}>
                      {stage.isWon ? "Unset Won" : "Set Won"}
                    </Button>
                    <Button size="sm" variant={stage.isActive ? "secondary" : "default"} onClick={() => updateMutation.mutate({ id: stage.id, updates: { isActive: !stage.isActive } })}>
                      {stage.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(stage.id)}>Delete</Button>
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
