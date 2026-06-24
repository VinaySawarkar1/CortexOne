import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SalesTarget } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
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
import { Plus, Search, Target, TrendingUp } from "lucide-react";

export default function SalesTargetsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("2025");

  // Get all sales targets
  const {
    data: salesTargets,
    isLoading,
    error
  } = useQuery<SalesTarget[]>({
    queryKey: ["/api/sales-targets"],
  });

  // Create sales target mutation
  const createSalesTarget = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sales-targets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-targets"] });
      setDialogOpen(false);
      toast({
        title: "Sales Target Created",
        description: "New sales target has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create sales target: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update sales target mutation
  const updateSalesTarget = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/sales-targets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-targets"] });
      setDialogOpen(false);
      setEditingTarget(null);
      toast({
        title: "Sales Target Updated",
        description: "Sales target has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update sales target: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete sales target mutation
  const deleteSalesTarget = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sales-targets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-targets"] });
      toast({
        title: "Sales Target Deleted",
        description: "Sales target has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete sales target: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    if (editingTarget) {
      updateSalesTarget.mutate({ id: editingTarget.id, data });
    } else {
      createSalesTarget.mutate(data);
    }
  };

  const handleEdit = (target: SalesTarget) => {
    setEditingTarget(target);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this sales target?")) {
      deleteSalesTarget.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingTarget(null);
    setDialogOpen(true);
  };

  // Filter sales targets based on search and year
  const filteredTargets = salesTargets?.filter(target => {
    const matchesSearch = target.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         target.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = target.targetYear === yearFilter;
    
    return matchesSearch && matchesYear;
  }) || [];

  // Calculate statistics
  const totalTargets = salesTargets?.length || 0;
  const totalTargetValue = salesTargets?.reduce((sum, t) => sum + parseFloat(t.targetValue || "0"), 0) || 0;
  const totalActualValue = salesTargets?.reduce((sum, t) => sum + parseFloat(t.actualValue || "0"), 0) || 0;
  const achievementRate = totalTargetValue > 0 ? (totalActualValue / totalTargetValue) * 100 : 0;

  if (error) {
    return (
      <Layout>
        <div className="text-center my-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Sales Targets</h2>
          <p className="text-gray-600">{(error as Error).message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-body">
        <PageHeader
          title="Sales Targets"
          subtitle="Manage your sales targets and performance"
        />

        {/* Top Bar with Stats and Actions */}
        <div className="mb-6 bg-white p-4 rounded-lg border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Total Targets</div>
                <div className="text-2xl font-bold">{totalTargets}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Target Value</div>
                <div className="text-2xl font-bold text-blue-600">₹{totalTargetValue.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Actual Value</div>
                <div className="text-2xl font-bold text-green-600">₹{totalActualValue.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Achievement</div>
                <div className="text-2xl font-bold text-purple-600">{achievementRate.toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search targets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Create Target
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sales Targets Table */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading sales targets...</p>
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No sales targets found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Achievement
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTargets.map((target) => {
                      const achievement = parseFloat(target.targetValue || "0") > 0 
                        ? (parseFloat(target.actualValue || "0") / parseFloat(target.targetValue || "0")) * 100 
                        : 0;
                      
                      return (
                        <tr key={target.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {target.targetName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {target.assignedTo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {target.targetMonth} {target.targetYear}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{parseFloat(target.targetValue || "0").toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{parseFloat(target.actualValue || "0").toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              achievement >= 100 ? 'bg-green-100 text-green-800' :
                              achievement >= 80 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {achievement.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(target)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(target.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Target Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Sales Target" : "Create Sales Target"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Name
              </label>
              <Input placeholder="Monthly Sales Target" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <Input placeholder="Sales Person Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Month
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="January">January</SelectItem>
                    <SelectItem value="February">February</SelectItem>
                    <SelectItem value="March">March</SelectItem>
                    <SelectItem value="April">April</SelectItem>
                    <SelectItem value="May">May</SelectItem>
                    <SelectItem value="June">June</SelectItem>
                    <SelectItem value="July">July</SelectItem>
                    <SelectItem value="August">August</SelectItem>
                    <SelectItem value="September">September</SelectItem>
                    <SelectItem value="October">October</SelectItem>
                    <SelectItem value="November">November</SelectItem>
                    <SelectItem value="December">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Year
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Value
                </label>
                <Input placeholder="0.00" type="number" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Value
              </label>
              <Input placeholder="0.00" type="number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Input placeholder="Target notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSubmit({})}>
                {editingTarget ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
} 