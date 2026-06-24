import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import OrderTable from "@/components/orders/order-table";
import OrderForm from "@/components/orders/order-form";
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
import { Plus, Loader2, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrdersPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Get all orders
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Get all inventory items for order creation/editing
  const {
    data: inventoryItems,
    isLoading: isLoadingInventory
  } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      const items = Array.isArray(data.items) ? data.items : [];
      const subtotalNum = items.reduce((s: number, it: any) => {
        const price = typeof it.price === 'string' ? parseFloat(it.price.replace(/[^0-9.-]/g, '')) : Number(it.price || 0);
        const quantity = Number(it.quantity || 0);
        return s + (price * quantity);
      }, 0);
      const taxAmountNum = typeof data.taxAmount === 'number' ? data.taxAmount : parseFloat(String(data.taxAmount || 0));
      const totalAmountNum = subtotalNum + taxAmountNum;
      
      const payload = {
        orderNumber: data.orderNumber || `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: data.customerId ?? null,
        customerName: data.customerName || '',
        customerCompany: data.customerCompany || '',
        items: items.map((it: any) => ({
          sku: it.sku || '',
          name: it.name || '',
          quantity: Number(it.quantity || 1),
          price: typeof it.price === 'string' ? parseFloat(it.price.replace(/[^0-9.-]/g, '')) : Number(it.price || 0),
        })),
        subtotal: subtotalNum.toFixed(2),
        taxAmount: taxAmountNum.toFixed(2),
        totalAmount: totalAmountNum.toFixed(2),
        status: data.status || 'processing',
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || 'India',
        pincode: data.pincode || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
      };
      const res = await apiRequest("POST", "/api/orders", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setCreateDialogOpen(false);
      toast({
        title: "Order Created",
        description: "New order has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update order mutation
  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const items = Array.isArray(data.items) ? data.items : [];
      const subtotalNum = items.reduce((s: number, it: any) => {
        const price = typeof it.price === 'string' ? parseFloat(it.price.replace(/[^0-9.-]/g, '')) : Number(it.price || 0);
        const quantity = Number(it.quantity || 0);
        return s + (price * quantity);
      }, 0);
      const taxAmountNum = typeof data.taxAmount === 'number' ? data.taxAmount : parseFloat(String(data.taxAmount || 0));
      const totalAmountNum = subtotalNum + taxAmountNum;
      
      const payload = {
        customerName: data.customerName || '',
        customerCompany: data.customerCompany || '',
        items: items.map((it: any) => ({
          sku: it.sku || '',
          name: it.name || '',
          quantity: Number(it.quantity || 1),
          price: typeof it.price === 'string' ? parseFloat(it.price.replace(/[^0-9.-]/g, '')) : Number(it.price || 0),
        })),
        subtotal: subtotalNum.toFixed(2),
        taxAmount: taxAmountNum.toFixed(2),
        totalAmount: totalAmountNum.toFixed(2),
        status: data.status || 'processing',
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || 'India',
        pincode: data.pincode || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
      };
      const res = await apiRequest("PUT", `/api/orders/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setEditDialogOpen(false);
      toast({
        title: "Order Updated",
        description: "Order has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrder = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setDeleteDialogOpen(false);
      toast({
        title: "Order Deleted",
        description: "Order has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (order: Order) => {
    setCurrentOrder(order);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const order = orders?.find(order => order.id === id);
    if (order) {
      setCurrentOrder(order);
      setDeleteDialogOpen(true);
    }
  };

  const handleViewDetails = (order: Order) => {
    setCurrentOrder(order);
    setDetailsDialogOpen(true);
  };

  const handlePrintInternalOrder = (order: Order) => {
    // Open internal order PDF in new tab
    window.open(`/api/orders/${order.id}/print-internal`, '_blank');
  };

  const generateInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/orders/${id}/generate-invoice`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to generate invoice" }));
        throw new Error(error.message || "Failed to generate invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice generated from order successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to generate invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleGenerateInvoice = (order: Order) => {
    if (confirm("Generate invoice for this order?")) {
      generateInvoiceMutation.mutate(order.id);
    }
  };

  const handleGenerateDeliveryChallan = (order: Order) => {
    // Open delivery challan PDF in new tab
    window.open(`/api/orders/${order.id}/delivery-challan`, '_blank');
  };

  // Confirm order mutation — auto-creates a Delivery Order on the server
  const confirmOrderMutation = useMutation({
    mutationFn: async (order: Order) => {
      const res = await apiRequest("PUT", `/api/orders/${order.id}`, { status: 'confirmed' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-orders"] });
      toast({
        title: "Order Confirmed",
        description: "Order confirmed and delivery order created automatically.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to confirm order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleConfirmOrder = (order: Order) => {
    if (confirm(`Confirm order ${order.orderNumber}? This will auto-create a Delivery Order.`)) {
      confirmOrderMutation.mutate(order);
    }
  };

  // Filter orders based on search query
  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.customerCompany.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query)
    );
  });

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="page-body">
        <PageHeader
          title="Order Management"
          subtitle="Create and manage customer orders"
        />

        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="w-full sm:w-auto mb-4 sm:mb-0">
            <Input
              className="max-w-xs"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="bg-[#6366f1] hover:bg-[#4338ca]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Order
          </Button>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading orders: {(error as Error).message}</p>
          </div>
        ) : (
          <OrderTable
            orders={filteredOrders || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onPrintInternalOrder={handlePrintInternalOrder}
            onGenerateInvoice={handleGenerateInvoice}
            onGenerateDeliveryChallan={handleGenerateDeliveryChallan}
            onConfirm={handleConfirmOrder}
          />
        )}

        {/* Create Order Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new order.
              </DialogDescription>
            </DialogHeader>
            <OrderForm
              onSubmit={(data) => createOrder.mutate(data)}
              isSubmitting={createOrder.isPending}
              mode="create"
              inventoryItems={inventoryItems || []}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Update the order information.
              </DialogDescription>
            </DialogHeader>
            {currentOrder && (
              <OrderForm
                defaultValues={currentOrder}
                onSubmit={(data) => updateOrder.mutate({ id: currentOrder.id, data })}
                isSubmitting={updateOrder.isPending}
                mode="edit"
                inventoryItems={inventoryItems || []}
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
                This will permanently delete order {currentOrder?.orderNumber} for {currentOrder?.customerName}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => currentOrder && deleteOrder.mutate(currentOrder.id)}
              >
                {deleteOrder.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Order Details</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                View detailed information about this order
              </DialogDescription>
            </DialogHeader>
            
            {currentOrder && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Order Number:</span>
                      <span className="text-sm">{currentOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Date:</span>
                      <span className="text-sm">
                        {new Date(currentOrder.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge className={getStatusBadgeClass(currentOrder.status)}>
                        {currentOrder.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Amount:</span>
                      <span className="text-sm font-bold">{formatCurrency(currentOrder.totalAmount || currentOrder.amount || 0)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm">{currentOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Company:</span>
                      <span className="text-sm">{currentOrder.customerCompany}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Item
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Array.isArray(currentOrder.items) && currentOrder.items.length > 0 ? currentOrder.items.map((item: any, index: number) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">
                                <div>{item.name || 'Unnamed Item'}</div>
                                {item.sku && <div className="text-xs text-gray-500">{item.sku}</div>}
                              </td>
                              <td className="px-4 py-2 text-sm">{item.quantity || 0}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                {formatCurrency(item.price || 0)}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-right">
                                {formatCurrency((item.price || 0) * (item.quantity || 0))}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-sm text-center text-gray-500">
                                No items in this order
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">
                              Total:
                            </td>
                            <td className="px-4 py-2 text-sm font-bold text-right">
                              {formatCurrency(currentOrder.totalAmount || currentOrder.amount || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setDetailsDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    className="bg-[#6366f1] hover:bg-[#4338ca]"
                    onClick={() => {
                      setDetailsDialogOpen(false);
                      handleEdit(currentOrder);
                    }}
                  >
                    Edit Order
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
