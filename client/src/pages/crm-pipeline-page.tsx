import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StageManager, { CrmStage } from "@/components/crm/stage-manager";
import LostReasonManager, { CrmLostReason } from "@/components/crm/lost-reason-manager";
import { Loader2, Settings2, Trophy, X, Building2, User, Trophy as Win } from "lucide-react";

const inr = (v: any) => {
  const n = Number(v) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

const DEFAULT_STAGES = [
  { name: "New", sequence: 1, probability: 10, isWon: false },
  { name: "Qualified", sequence: 2, probability: 30, isWon: false },
  { name: "Proposition", sequence: 3, probability: 50, isWon: false },
  { name: "Negotiation", sequence: 4, probability: 75, isWon: false },
  { name: "Won", sequence: 5, probability: 100, isWon: true },
];

export default function CrmPipelinePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stageManagerOpen, setStageManagerOpen] = useState(false);
  const [lostManagerOpen, setLostManagerOpen] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [dragLeadId, setDragLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<number | null>(null);
  const [lostLead, setLostLead] = useState<Lead | null>(null);
  const [lostReasonId, setLostReasonId] = useState<string>("");

  const { data: stages = [], isLoading: stagesLoading } = useQuery<CrmStage[]>({ queryKey: ["/api/crm-stages"] });
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: lostReasons = [] } = useQuery<CrmLostReason[]>({ queryKey: ["/api/crm-lost-reasons"] });

  const activeStages = [...stages].filter((s) => s.isActive).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const updateLead = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      (await apiRequest("PUT", `/api/leads/${id}`, data)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/leads"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const seedStages = useMutation({
    mutationFn: async () => {
      for (const s of DEFAULT_STAGES) {
        await apiRequest("POST", "/api/crm-stages", { ...s, isActive: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-stages"] });
      toast({ title: "Pipeline ready", description: "Default stages created." });
    },
  });

  // Bucket leads into stage columns. Lost leads excluded unless showLost. Unassigned go to first column.
  const firstStageId = activeStages[0]?.id;
  const leadsForStage = (stageId: number) =>
    leads.filter((l: any) => {
      if (l.status === "lost" && !showLost) return false;
      const sid = l.stageId ?? null;
      if (sid === stageId) return true;
      // unassigned leads land in the first column
      if (sid == null && stageId === firstStageId) return true;
      return false;
    });

  const onDrop = (stage: CrmStage) => {
    setDragOverStage(null);
    if (dragLeadId == null) return;
    const lead = leads.find((l) => l.id === dragLeadId);
    setDragLeadId(null);
    if (!lead || (lead as any).stageId === stage.id) return;
    const data: any = { stageId: stage.id };
    if (stage.probability != null) data.probability = stage.probability;
    if (stage.isWon) data.status = "won";
    else if ((lead as any).status === "won" || (lead as any).status === "lost") data.status = "new";
    updateLead.mutate({ id: lead.id, data });
  };

  const markWon = (lead: Lead) => {
    const wonStage = activeStages.find((s) => s.isWon);
    updateLead.mutate({ id: lead.id, data: { status: "won", probability: 100, ...(wonStage ? { stageId: wonStage.id } : {}) } });
  };

  const confirmLost = () => {
    if (!lostLead) return;
    updateLead.mutate({
      id: lostLead.id,
      data: { status: "lost", probability: 0, lostReasonId: lostReasonId ? Number(lostReasonId) : undefined },
    });
    setLostLead(null);
    setLostReasonId("");
  };

  if (stagesLoading || leadsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Drag opportunities across stages to track your deals"
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLost}
                onChange={(e) => setShowLost(e.target.checked)}
                className="rounded"
              />
              Show lost
            </label>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setLostManagerOpen(true)}>
              Lost Reasons
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStageManagerOpen(true)}>
              <Settings2 className="h-3.5 w-3.5 mr-1" />Manage Stages
            </Button>
          </div>
        }
      />

      <div className="p-6">
        {activeStages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-600 mb-4">No pipeline stages yet. Create a standard sales pipeline to get started.</p>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold border-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              onClick={() => seedStages.mutate()}
              disabled={seedStages.isPending}
            >
              {seedStages.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create Default Pipeline
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {activeStages.map((stage) => {
              const stageLeads = leadsForStage(stage.id);
              const total = stageLeads.reduce((sum, l: any) => sum + (Number(l.expectedValue) || 0), 0);
              const weighted = stageLeads.reduce(
                (sum, l: any) => sum + (Number(l.expectedValue) || 0) * ((Number(l.probability ?? stage.probability) || 0) / 100), 0);
              const isOver = dragOverStage === stage.id;
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-72 rounded-xl p-3 transition-all"
                  style={{
                    background: isOver ? "#ede9fe" : "#f8fafc",
                    border: isOver ? "2px solid #8b5cf6" : "2px solid #e2e8f0",
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
                  onDrop={() => onDrop(stage)}
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {stage.isWon && <Trophy className="h-3.5 w-3.5 text-emerald-500" />}
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{stage.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        {stageLeads.length}
                      </span>
                    </div>
                  </div>
                  {/* Totals */}
                  <div className="text-[10px] text-slate-400 mb-3 space-y-0.5">
                    <div>Total: <span className="font-semibold text-slate-600">{inr(total)}</span></div>
                    <div>Weighted: <span className="font-semibold text-indigo-600">{inr(weighted)}</span></div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[100px]">
                    {stageLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDragLeadId(lead.id)}
                        onDragEnd={() => setDragLeadId(null)}
                        className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-xs text-slate-800 truncate leading-4">{lead.name}</div>
                          {lead.status === "won" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">Won</span>
                          )}
                          {lead.status === "lost" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">Lost</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <Building2 className="h-3 w-3 flex-shrink-0" />{lead.company}
                        </div>
                        {lead.expectedValue != null && (
                          <div className="text-xs font-bold text-indigo-600 mt-1.5">{inr(lead.expectedValue)}</div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {lead.probability != null && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">{lead.probability}%</span>
                            )}
                            {lead.assignedTo && (
                              <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{lead.assignedTo}</span>
                            )}
                          </div>
                          {lead.status !== "won" && lead.status !== "lost" && (
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-emerald-50" title="Mark won" onClick={() => markWon(lead)}>
                                <Win className="h-3.5 w-3.5 text-emerald-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-50" title="Mark lost" onClick={() => { setLostLead(lead); setLostReasonId(""); }}>
                                <X className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <StageManager open={stageManagerOpen} onOpenChange={setStageManagerOpen} />
        <LostReasonManager open={lostManagerOpen} onOpenChange={setLostManagerOpen} />

        {/* Mark Lost dialog */}
        <Dialog open={!!lostLead} onOpenChange={(o) => !o && setLostLead(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Mark as Lost</DialogTitle>
              <DialogDescription>
                Why was the opportunity with {lostLead?.name} lost?
              </DialogDescription>
            </DialogHeader>
            <Select value={lostReasonId} onValueChange={setLostReasonId}>
              <SelectTrigger><SelectValue placeholder="Select a lost reason (optional)" /></SelectTrigger>
              <SelectContent>
                {lostReasons.filter((r) => r.isActive).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLostLead(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmLost}>Mark Lost</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
