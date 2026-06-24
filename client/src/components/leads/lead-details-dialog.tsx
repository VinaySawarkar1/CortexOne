import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lead, LeadDiscussion } from "@shared/schema";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActivityPanel from "@/components/crm/activity-panel";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  Plus,
  Loader2
} from "lucide-react";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadDetailsDialog({ lead, open, onOpenChange }: LeadDetailsDialogProps) {
  const { toast } = useToast();
  const [newDiscussion, setNewDiscussion] = useState("");
  const [discussionType, setDiscussionType] = useState("general");
  const [outcome, setOutcome] = useState("neutral");
  const [nextAction, setNextAction] = useState("");


  // Get discussions for this lead
  const { data: discussions, isLoading: isLoadingDiscussions } = useQuery<LeadDiscussion[]>({
    queryKey: lead?.id ? [`/api/leads/${lead.id}/discussions`] : [],
    enabled: !!lead?.id,
  });

  // Create discussion mutation
  const createDiscussion = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/leads/${lead?.id}/discussions`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${lead?.id}/discussions`] });
      setNewDiscussion("");
      setDiscussionType("general");
      setOutcome("neutral");
      setNextAction("");
      toast({
        title: "Discussion Added",
        description: "New discussion has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add discussion: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddDiscussion = () => {
    if (!newDiscussion.trim()) {
      toast({
        title: "Error",
        description: "Please enter a discussion message.",
        variant: "destructive",
      });
      return;
    }

    createDiscussion.mutate({
      discussion: newDiscussion,
      discussionType,
      outcome,
      nextAction: nextAction || null,
      nextFollowUpDate: null,
    });
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'new': { color: 'bg-green-100 text-green-800', label: 'New' },
      'contacted': { color: 'bg-blue-100 text-blue-800', label: 'Contacted' },
      'qualified': { color: 'bg-purple-100 text-purple-800', label: 'Qualified' },
      'proposal': { color: 'bg-indigo-100 text-indigo-800', label: 'Proposal' },
      'negotiation': { color: 'bg-yellow-100 text-yellow-800', label: 'Negotiation' },
      'closed': { color: 'bg-teal-100 text-teal-800', label: 'Closed' },
      'lost': { color: 'bg-red-100 text-red-800', label: 'Lost' }
    };
    
    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.new;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      'industry': { color: 'bg-blue-100 text-blue-800', label: 'Industry' },
      'calibration_labs': { color: 'bg-green-100 text-green-800', label: 'Calibration Labs' },
      'vision_measuring_machine': { color: 'bg-purple-100 text-purple-800', label: 'Vision Measuring' },
      'data_logger': { color: 'bg-indigo-100 text-indigo-800', label: 'Data Logger' },
      'calibration_software': { color: 'bg-teal-100 text-teal-800', label: 'Calibration Software' },
      'meatest': { color: 'bg-yellow-100 text-yellow-800', label: 'Meatest' },
      'finalization': { color: 'bg-orange-100 text-orange-800', label: 'Finalization' },
      'waiting_for_po': { color: 'bg-red-100 text-red-800', label: 'Waiting for PO' }
    };
    
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.industry;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const getDiscussionTypeBadge = (type: string) => {
    const typeConfig = {
      'general': { color: 'bg-gray-100 text-gray-800', label: 'General' },
      'call': { color: 'bg-blue-100 text-blue-800', label: 'Call' },
      'email': { color: 'bg-green-100 text-green-800', label: 'Email' },
      'meeting': { color: 'bg-purple-100 text-purple-800', label: 'Meeting' },
      'follow_up': { color: 'bg-orange-100 text-orange-800', label: 'Follow Up' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.general;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getOutcomeBadge = (outcome: string) => {
    const outcomeConfig = {
      'positive': { color: 'bg-green-100 text-green-800', label: 'Positive' },
      'negative': { color: 'bg-red-100 text-red-800', label: 'Negative' },
      'neutral': { color: 'bg-gray-100 text-gray-800', label: 'Neutral' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
    };
    
    const config = outcomeConfig[outcome as keyof typeof outcomeConfig] || outcomeConfig.neutral;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Lead Details</DialogTitle>
          <DialogDescription>
            View and manage lead information and discussions
          </DialogDescription>
        </DialogHeader>
        <div id="lead-details-description" className="sr-only">
          Detailed view of lead information including contact details, status, category, and discussion history.
        </div>

        <div className="space-y-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{lead.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {lead.company}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {lead.phone}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(lead.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <div className="mt-1">{getCategoryBadge(lead.category)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(lead.createdAt)}
                    </p>
                  </div>
                  {lead.address && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Address</label>
                      <p className="text-gray-900 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {lead.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {lead.notes && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-gray-900 mt-1">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Activities */}
          {lead?.id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityPanel leadId={lead.id} />
              </CardContent>
            </Card>
          )}

          {/* Discussions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Discussions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add New Discussion */}
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Add New Discussion</h4>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Enter discussion details..."
                    value={newDiscussion}
                    onChange={(e) => setNewDiscussion(e.target.value)}
                    rows={3}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <Select value={discussionType} onValueChange={setDiscussionType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Outcome</label>
                      <Select value={outcome} onValueChange={setOutcome}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Next Action</label>
                      <Textarea
                        placeholder="Next action..."
                        value={nextAction}
                        onChange={(e) => setNextAction(e.target.value)}
                        rows={1}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddDiscussion}
                    disabled={createDiscussion.isPending}
                    className="bg-[#800000] hover:bg-[#4B0000]"
                  >
                    {createDiscussion.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Discussion
                  </Button>
                </div>
              </div>

              {/* Discussions List */}
              <div className="space-y-4">
                {isLoadingDiscussions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
                  </div>
                ) : discussions && discussions.length > 0 ? (
                  discussions.map((discussion) => (
                    <div key={discussion.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getDiscussionTypeBadge(discussion.discussionType)}
                          {getOutcomeBadge(discussion.outcome || 'neutral')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(discussion.createdAt)}
                        </div>
                      </div>
                      <p className="text-gray-900 mb-2">{discussion.discussion}</p>
                      {discussion.nextAction && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Next Action:</span>
                          <span className="text-gray-900 ml-1">{discussion.nextAction}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Added by {discussion.createdBy}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No discussions yet</p>
                    <p className="text-sm">Add the first discussion above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
