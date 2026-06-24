import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PurchaseOrder } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Download, Printer, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get all purchase orders
  const {
    data: purchaseOrders,
    isLoading,
    error
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  // Delete purchase order mutation
  const deletePurchaseOrder = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/purchase-orders/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Purchase Order Deleted",
        description: "Purchase order has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete purchase order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      deletePurchaseOrder.mutate(id);
    }
  };

  const handleAddNew = () => {
    setLocation("/purchase-orders/new");
  };

  const handleEdit = (purchaseOrder: PurchaseOrder) => {
    setLocation(`/purchase-orders/edit/${purchaseOrder.id}`);
  };

  const handleGeneratePDF = (id: number) => {
    // Open PDF in new tab for download
    window.open(`/api/purchase-orders/${id}/download-pdf`, '_blank');
    toast({
      title: "PDF Generated",
      description: "Purchase order PDF has been generated and opened in a new tab.",
    });
  };

  const handlePrint = (id: number) => {
    // Open PDF in new tab for printing
    window.open(`/api/purchase-orders/${id}/download-pdf`, '_blank');
  };

  // Filter purchase orders based on search and status
  const filteredPurchaseOrders = purchaseOrders?.filter(purchaseOrder => {
    const matchesSearch = purchaseOrder.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchaseOrder.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || purchaseOrder.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate statistics
  const totalPurchaseOrders = purchaseOrders?.length || 0;
  const totalAmount = purchaseOrders?.reduce((sum, po) => sum + parseFloat(po.totalAmount || "0"), 0) || 0;
  const pendingAmount = purchaseOrders?.filter(po => po.status === 'pending')
    .reduce((sum, po) => sum + parseFloat(po.totalAmount || "0"), 0) || 0;

  if (error) {
    return (
      <Layout>
        <div className="text-center my-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Purchase Orders</h2>
          <p className="text-gray-600 mb-4">{(error as Error).message}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            Retry
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-body">
        <PageHeader
          title="Purchase Orders"
          subtitle="Manage your purchase orders"
        />

        {/* Top Bar with Stats and Actions */}
        <div className="mb-6 bg-white p-4 rounded-lg border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Total Orders</div>
                <div className="text-2xl font-bold">{totalPurchaseOrders}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Total Amount</div>
                <div className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Pending</div>
                <div className="text-2xl font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Create Purchase Order
              </Button>
            </div>
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Purchase Orders Table */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading purchase orders...</p>
              </div>
            ) : filteredPurchaseOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No purchase orders found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PO Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPurchaseOrders.map((purchaseOrder) => (
                      <tr key={purchaseOrder.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {purchaseOrder.poNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchaseOrder.supplierName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{parseFloat(purchaseOrder.totalAmount || "0").toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            purchaseOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                            purchaseOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            purchaseOrder.status === 'received' ? 'bg-blue-100 text-blue-800' :
                            purchaseOrder.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {purchaseOrder.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(purchaseOrder.orderDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(purchaseOrder)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGeneratePDF(purchaseOrder.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrint(purchaseOrder.id)}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(purchaseOrder.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 