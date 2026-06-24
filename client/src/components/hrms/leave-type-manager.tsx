import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export type LeaveType = { id: number; name: string; code: string | null; daysAllowed: number | null; isPaid: boolean; isActive: boolean };

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onChanged?: () => void; }

export default function LeaveTypeManager({ open, onOpenChange, onChanged }: Props) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [paid, setPaid] = useState(true);
  const { data: items = [] } = useQuery<LeaveType[]>({ queryKey: ["/api/leave-types"] });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] }); onChanged?.(); };
  const createM = useMutation({ mutationFn: async (p: any) => (await apiRequest("POST", "/api/leave-types", p)).json(), onSuccess: invalidate });
  const updateM = useMutation({ mutationFn: async ({ id, u }: any) => (await apiRequest("PUT", `/api/leave-types/${id}`, u)).json(), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/leave-types/${id}`)).json(), onSuccess: invalidate });

  const add = () => {
    if (!name.trim()) return;
    createM.mutate({ name: name.trim(), daysAllowed: days ? Number(days) : 0, isPaid: paid, isActive: true });
    setName(""); setDays(""); setPaid(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Manage Leave Types</DialogTitle>
          <DialogDescription>Define leave categories, their annual allocation and whether they are paid.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Leave type (e.g. Casual)" className="flex-1 min-w-[160px]" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Days/yr" type="number" className="w-24" value={days} onChange={(e) => setDays(e.target.value)} />
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={paid} onCheckedChange={(v) => setPaid(!!v)} /> Paid</label>
            <Button onClick={add} className="bg-[#800000] hover:bg-[#4B0000]">Add</Button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {items.length === 0 ? <p className="text-sm text-gray-500">No leave types yet.</p> : items.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded p-2">
                <span className={`font-medium ${t.isActive ? "" : "text-gray-400 line-through"}`}>
                  {t.name} <span className="text-xs text-gray-400">· {t.daysAllowed ?? 0} days/yr</span>
                  <Badge variant="outline" className="ml-2 text-xs">{t.isPaid ? "Paid" : "Unpaid"}</Badge>
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant={t.isActive ? "secondary" : "default"} onClick={() => updateM.mutate({ id: t.id, u: { isActive: !t.isActive } })}>{t.isActive ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteM.mutate(t.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
