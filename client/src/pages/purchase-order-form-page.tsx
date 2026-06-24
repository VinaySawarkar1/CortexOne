import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PurchaseOrder } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import PurchaseOrderForm from "@/components/purchase-orders/purchase-order-form";
import { useToast } from "@/hooks/use-toast";

export default function PurchaseOrderFormPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const copyFrom = searchParams.get("copyFrom");
  const isEditMode = window.location.pathname.includes("/edit/");
  const purchaseOrderId = isEditMode ? window.location.pathname.split("/").pop() : null;

  // Get all customers to use as suppliers
  const { data: customers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Get all inventory items for selection
  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  // Get purchase order data if editing
  const { data: purchaseOrder } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", purchaseOrderId],
    queryFn: async () => {
      if (!purchaseOrderId) return null;
      const res = await apiRequest("GET", `/api/purchase-orders/${purchaseOrderId}`);
      return res.json();
    },
    enabled: !!purchaseOrderId,
  });

  // Get copy source data if copying
  const { data: copySource } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", copyFrom],
    queryFn: async () => {
      if (!copyFrom) return null;
      const res = await apiRequest("GET", `/api/purchase-orders/${copyFrom}`);
      return res.json();
    },
    enabled: !!copyFrom,
  });

  // Process copy source data
  const processedCopySource = copySource ? {
    ...copySource,
    id: 0, // Use 0 as placeholder for new items
    poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
  } : undefined;

  // Create purchase order mutation
  const createPurchaseOrder = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/purchase-orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Purchase Order Created",
        description: "New purchase order has been created successfully.",
      });
      setLocation("/purchase-orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create purchase order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update purchase order mutation
  const updatePurchaseOrder = useMutation({
    mutationFn: async (data: any) => {
      if (!purchaseOrderId) throw new Error("No purchase order ID");
      const res = await apiRequest("PUT", `/api/purchase-orders/${purchaseOrderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Purchase Order Updated",
        description: "Purchase order has been updated successfully.",
      });
      setLocation("/purchase-orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update purchase order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      if (isEditMode) {
        const updateData = { ...data, id: purchaseOrder?.id };
        await updatePurchaseOrder.mutateAsync(updateData);
        toast({
          title: "Success",
          description: "Purchase Order updated successfully!",
        });
      } else {
        await createPurchaseOrder.mutateAsync(data);
        toast({
          title: "Success",
          description: "Purchase Order created successfully!",
        });
      }
      
      setLocation("/purchase-orders");
    } catch (error) {
      console.error("Error submitting purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to save purchase order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set up global handler for form submission
  useEffect(() => {
    (window as any).handlePurchaseOrderSubmit = handleSubmit;
    return () => {
      delete (window as any).handlePurchaseOrderSubmit;
    };
  }, [isEditMode, purchaseOrderId]);

  const getDefaultValues = () => {
    if (isEditMode && purchaseOrder) {
      return purchaseOrder;
    }
    if (copyFrom && processedCopySource) {
      return processedCopySource;
    }
    return undefined;
  };

  const getSubmitLabel = () => {
    if (isEditMode) return "Update Purchase Order";
    if (copyFrom) return "Create Purchase Order (Copy)";
    return "Create Purchase Order";
  };

  return (
    <Layout>
      <div className="page-body">
        <PageHeader
          title={isEditMode ? "Edit Purchase Order" : "Create Purchase Order"}
          subtitle={isEditMode ? "Modify purchase order details" : "Create a new purchase order"}
        />
        
        <PurchaseOrderForm
          isSubmitting={isSubmitting}
          mode={isEditMode ? "edit" : "create"}
          defaultValues={processedCopySource || purchaseOrder}
          submitLabel={isEditMode ? "Update Purchase Order" : "Create Purchase Order"}
          suppliers={customers}
          inventory={inventory}
          onSubmit={handleSubmit}
        />
      </div>
    </Layout>
  );
}
