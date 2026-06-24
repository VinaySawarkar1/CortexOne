import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ManufacturingJob } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import ManufacturingTable from "@/components/manufacturing/manufacturing-table";
import ManufacturingForm from "@/components/manufacturing/manufacturing-form";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Factory, Settings, Calendar, Users, Target } from "lucide-react";

export default function ManufacturingPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ManufacturingJob | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("jobs");

  // Get all manufacturing jobs
  const {
    data: manufacturingJobs,
    isLoading,
    error
  } = useQuery<ManufacturingJob[]>({
    queryKey: ["/api/manufacturing-jobs"],
  });

  // Create manufacturing job mutation
  const createJob = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/manufacturing-jobs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing-jobs"] });
      setDialogOpen(false);
      toast({
        title: "Manufacturing Job Created",
        description: "New manufacturing job has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create manufacturing job: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update manufacturing job mutation
  const updateJob = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/manufacturing-jobs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing-jobs"] });
      setDialogOpen(false);
      setEditingJob(null);
      toast({
        title: "Manufacturing Job Updated",
        description: "Manufacturing job has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update manufacturing job: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete manufacturing job mutation
  const deleteJob = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/manufacturing-jobs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing-jobs"] });
      toast({
        title: "Manufacturing Job Deleted",
        description: "Manufacturing job has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete manufacturing job: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Start production mutation
  const startProduction = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/manufacturing-jobs/${jobId}/start-production`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing-jobs"] });
      toast({
        title: "Production Started",
        description: "Manufacturing production has been started successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to start production: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Complete job mutation
  const completeJob = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/manufacturing-jobs/${jobId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing-jobs"] });
      toast({
        title: "Job Completed",
        description: "Manufacturing job has been completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to complete job: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    if (editingJob) {
      updateJob.mutate({ id: editingJob.id, data });
    } else {
      createJob.mutate(data);
    }
  };

  const handleEdit = (job: ManufacturingJob) => {
    setEditingJob(job);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this manufacturing job?")) {
      deleteJob.mutate(id);
    }
  };

  const handleStartProduction = (id: number) => {
    if (confirm("Start production for this job?")) {
      startProduction.mutate(id);
    }
  };

  const handleCompleteJob = (id: number) => {
    if (confirm("Mark this job as completed?")) {
      completeJob.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingJob(null);
    setDialogOpen(true);
  };

  // Filter jobs based on search and status
  const filteredJobs = manufacturingJobs?.filter(job => {
    const matchesSearch = job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate statistics
  const totalJobs = manufacturingJobs?.length || 0;
  const activeJobs = manufacturingJobs?.filter(job => job.status === "in_progress").length || 0;
  const completedJobs = manufacturingJobs?.filter(job => job.status === "completed").length || 0;
  const pendingJobs = manufacturingJobs?.filter(job => job.status === "pending").length || 0;

  if (error) {
    return (
      <Layout>
        <div className="text-center my-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Manufacturing Jobs</h2>
          <p className="text-gray-600">{(error as Error).message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-body">
        <PageHeader
          title="Manufacturing"
          subtitle="Manage manufacturing jobs and internal orders"
        />

        {/* Top Bar with Stats and Actions */}
        <div className="mb-6 bg-white p-4 rounded-lg border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Total Jobs</div>
                <div className="text-2xl font-bold">{totalJobs}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Active</div>
                <div className="text-2xl font-bold text-blue-600">{activeJobs}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Completed</div>
                <div className="text-2xl font-bold text-green-600">{completedJobs}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Pending</div>
                <div className="text-2xl font-bold text-orange-600">{pendingJobs}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search manufacturing jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleAddNew} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4" />
                Create Internal Order
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("jobs")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "jobs"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Manufacturing Jobs
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "orders"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Internal Orders
              </button>
              <button
                onClick={() => setActiveTab("planning")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "planning"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Production Planning
              </button>
            </nav>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="assembly">Assembly</SelectItem>
              <SelectItem value="quality">Quality Control</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Managers</SelectItem>
              <SelectItem value="production">Production Manager</SelectItem>
              <SelectItem value="quality">Quality Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Manufacturing Table */}
        <ManufacturingTable
          jobs={filteredJobs}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStartProduction={handleStartProduction}
          onCompleteJob={handleCompleteJob}
        />
      </div>

      {/* Manufacturing Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? "Edit Manufacturing Job" : "Create Internal Order"}
            </DialogTitle>
          </DialogHeader>
          <ManufacturingForm
            onSubmit={handleSubmit}
            isSubmitting={createJob.isPending || updateJob.isPending}
            mode={editingJob ? "edit" : "create"}
            defaultValues={editingJob || undefined}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
} 