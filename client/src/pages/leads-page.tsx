import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import LeadTable from "@/components/leads/lead-table";
import LeadCategoriesManager from "@/components/leads/lead-categories-manager";
import LeadSourcesManager from "@/components/leads/lead-sources-manager";
import LeadForm from "@/components/leads/lead-form";
import LeadDetailsDialog from "@/components/leads/lead-details-dialog";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrderForm from "@/components/orders/order-form";
import { Plus, Loader2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import ExcelImportExport from "@/components/common/ExcelImportExport";

export default function LeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  
  // Dynamic categories from API with error handling
  const { data: allCategories = [], error: categoriesError } = useQuery<any[]>({ 
    queryKey: ["/api/lead-categories"],
    retry: 2,
    retryDelay: 1000,
  });
  const activeCategories = Array.isArray(allCategories) ? allCategories.filter(c => c && c.isActive) : [];
  const categoryLabels: Record<string, string> = activeCategories.length > 0 
    ? Object.fromEntries(activeCategories.map((c: any) => [c?.key || '', c?.name || '']).filter(([key]) => key))
    : {};

  // Dynamic sources from API with error handling
  const { data: allSources = [], error: sourcesError } = useQuery<any[]>({ 
    queryKey: ["/api/lead-sources"],
    retry: 2,
    retryDelay: 1000,
  });
  const activeSources = Array.isArray(allSources) ? allSources.filter(s => s && s.isActive) : [];
  const sourceLabels: Record<string, string> = activeSources.length > 0
    ? Object.fromEntries(activeSources.map((s: any) => [s?.key || '', s?.name || '']).filter(([key]) => key))
    : {};

  // Get all leads
  const {
    data: leads,
    isLoading,
    error,
  } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Get all inventory items for order creation
  const {
    data: inventoryItems,
    isLoading: isLoadingInventory
  } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  // Create lead mutation
  const createLead = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setCreateDialogOpen(false);
      toast({
        title: "Lead Created",
        description: "New lead has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create lead: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update lead mutation
  const updateLead = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditDialogOpen(false);
      toast({
        title: "Lead Updated",
        description: "Lead has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update lead: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete lead mutation
  const deleteLead = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setDeleteDialogOpen(false);
      toast({
        title: "Lead Deleted",
        description: "Lead has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete lead: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create order mutation (for lead conversion)
  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setConvertDialogOpen(false);
      
      // Update lead status to 'converted'
      if (currentLead) {
        updateLead.mutate({
          id: currentLead.id,
          data: { ...currentLead, status: "converted" }
        });
      }
      
      toast({
        title: "Lead Converted",
        description: "Lead has been converted to an order successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to convert lead: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Convert to customer mutation
  const convertToCustomer = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/leads/${id}/convert-to-customer`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Converted", description: "Lead converted to customer." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to convert: ${error.message}`, variant: "destructive" });
    },
  });

  const handleEdit = (lead: Lead) => {
    setCurrentLead(lead);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const lead = leads?.find(lead => lead.id === id);
    if (lead) {
      setCurrentLead(lead);
      setDeleteDialogOpen(true);
    }
  };

  const handleConvertToOrder = (lead: Lead) => {
    setCurrentLead(lead);
    setConvertDialogOpen(true);
  };

  const handleCreateQuotation = (lead: Lead) => {
    // Navigate to quotations page with lead data
    window.location.href = `/quotations/new?leadId=${lead.id}`;
  };

  const handleViewDetails = (lead: Lead) => {
    setCurrentLead(lead);
    setDetailsDialogOpen(true);
  };

  const handleConvertToCustomer = (lead: Lead) => {
    convertToCustomer.mutate(lead.id);
  };


  // Calculate category counts
  const getCategoryCounts = () => {
    const counts: Record<string, number> = { all: 0 };
    if (!leads) return counts;
    
    leads.forEach(lead => {
      counts.all++;
      if (!counts[lead.category]) {
        counts[lead.category] = 0;
      }
      counts[lead.category]++;
    });
    
    return counts;
  };

  // Calculate source counts
  const getSourceCounts = () => {
    const counts: Record<string, number> = { all: 0 };
    if (!leads) return counts;
    
    leads.forEach(lead => {
      counts.all++;
      const source = lead.source || 'other';
      if (!counts[source]) {
        counts[source] = 0;
      }
      counts[source]++;
    });
    
    return counts;
  };
  
  const categoryCounts = getCategoryCounts();
  const sourceCounts = getSourceCounts();
  
  // Filter leads based on search query, selected category and time window
  const withinTimeWindow = (createdAt: any) => {
    if (timeFilter === 'all') return true;
    const d = new Date(createdAt);
    const now = new Date();
    if (timeFilter === 'day') {
      return d.toDateString() === now.toDateString();
    }
    if (timeFilter === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return d >= start && d <= now;
    }
    if (timeFilter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (timeFilter === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), q * 3, 1);
      const qEnd = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
      return d >= qStart && d <= qEnd;
    }
    if (timeFilter === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredLeads = leads?.filter(lead => {
    // Category filter
    if (selectedCategory !== "all" && lead.category !== selectedCategory) {
      return false;
    }
    // Source filter
    if (selectedSource !== "all" && (lead.source || 'other') !== selectedSource) {
      return false;
    }
    if (!withinTimeWindow((lead as any).createdAt)) return false;
    
    // Search query filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.status.toLowerCase().includes(query)
    );
  });

  return (
    <Layout>
      {/* PageHeader MUST be the first child of Layout — never wrapped in a padding div */}
      <PageHeader
        title="Lead Management"
        subtitle="Manage and track potential client leads"
        badge={{ label: `${filteredLeads?.length ?? 0} leads` }}
        actions={
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-44 text-xs"
              placeholder="Search leads…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
            <select
              value={timeFilter}
              onChange={(e) => { setTimeFilter(e.target.value); setPage(1); }}
              className="h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white text-slate-700 focus:outline-none focus:border-indigo-400"
            >
              <option value="all">All time</option>
              <option value="day">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
            </select>
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSource} onValueChange={(v) => { setSelectedSource(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExcelImportExport entity="leads" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCategoryManagerOpen(true)}>Categories</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSourceManagerOpen(true)}>Sources</Button>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg shadow-sm border-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />Add Lead
            </Button>
          </div>
        }
      />

      {/* Page body */}
      <div className="p-6 space-y-4">
        {/* Leads Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading leads: {(error as Error).message}</p>
          </div>
        ) : filteredLeads && filteredLeads.length > 0 ? (
          <LeadTable
            leads={filteredLeads.slice((page-1)*pageSize, page*pageSize)}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onConvertToOrder={handleConvertToOrder}
            onCreateQuotation={handleCreateQuotation}
            onViewDetails={handleViewDetails}
            onConvertToCustomer={handleConvertToCustomer}
          />
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-6 w-6 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No leads found</p>
            <p className="text-xs text-slate-400 mb-4">Add your first lead to get started</p>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold border-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />Add Lead
            </Button>
          </div>
        )}

        {/* Pagination */}
        {filteredLeads && filteredLeads.length > pageSize && (
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-400">
              Showing {(page-1)*pageSize + 1}–{Math.min(page*pageSize, filteredLeads.length)} of {filteredLeads.length}
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page*pageSize >= filteredLeads.length} onClick={() => setPage(p => p+1)}>Next</Button>
            </div>
          </div>
        )}

        {/* Create Lead Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Enter the details for the new lead.
              </DialogDescription>
            </DialogHeader>
            <LeadForm
              onSubmit={(data) => createLead.mutate(data)}
              isSubmitting={createLead.isPending}
              mode="create"
            />
          </DialogContent>
        </Dialog>

        {/* Edit Lead Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>
              Update the lead information.
              </DialogDescription>
            </DialogHeader>
            {currentLead && (
              <LeadForm
                defaultValues={currentLead}
                onSubmit={(data) => updateLead.mutate({ id: currentLead.id, data })}
                isSubmitting={updateLead.isPending}
                mode="edit"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the lead for {currentLead?.name} from {currentLead?.company}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => currentLead && deleteLead.mutate(currentLead.id)}
              >
                {deleteLead.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Convert to Order Dialog */}
        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Convert Lead to Order</DialogTitle>
              <DialogDescription>
                Create a new order based on this lead.
              </DialogDescription>
            </DialogHeader>
            {currentLead && (
              <OrderForm
                onSubmit={(data) => createOrder.mutate(data)}
                isSubmitting={createOrder.isPending}
                mode="create"
                inventoryItems={inventoryItems || []}
                leadData={currentLead}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Lead Details Dialog */}
        <LeadDetailsDialog
          lead={currentLead}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
        <LeadCategoriesManager 
          open={categoryManagerOpen} 
          onOpenChange={setCategoryManagerOpen} 
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/lead-categories"] });
          }} 
        />
        <LeadSourcesManager 
          open={sourceManagerOpen} 
          onOpenChange={setSourceManagerOpen} 
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/lead-sources"] });
          }} 
        />
      </div>
    </Layout>
  );
}
