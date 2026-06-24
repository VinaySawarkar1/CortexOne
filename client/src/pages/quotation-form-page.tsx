import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Quotation } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import QuotationForm from "@/components/quotations/quotation-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Save, ArrowLeft } from "lucide-react";

export default function QuotationFormPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const leadIdFromQuery = searchParams.get('leadId');
  const copyFromId = searchParams.get('copyFrom');
  const leadId = leadIdFromQuery ? parseInt(leadIdFromQuery) : undefined;
  const { data: leads, isLoading: leadsLoading } = useQuery<any[]>({ queryKey: ["/api/leads"] });
  const { data: customers, isLoading: customersLoading } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const linkedLead = leads?.find(l => l.id === leadId);
  const matchedCustomer = customers?.find((c: any) =>
    (linkedLead?.email && c.email === linkedLead.email) ||
    (linkedLead?.company && c.company === linkedLead.company)
  );
  // Helper function to split address into lines
  const splitAddress = (address: string | null | undefined): { line1: string; line2: string } => {
    if (!address) return { line1: "", line2: "" };
    const lines = address.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return { line1: "", line2: "" };
    if (lines.length === 1) return { line1: lines[0], line2: "" };
    // If multiple lines, put first in line1, rest joined in line2
    return { line1: lines[0], line2: lines.slice(1).join(", ") };
  };

  const prefillFromLead = linkedLead ? (() => {
    const address = matchedCustomer?.address || linkedLead.address || "";
    const { line1, line2 } = splitAddress(address);

    return {
    quotationNumber: `RX-VQ25-25-07-${Date.now()}`,
    leadId: linkedLead.id,
    customerId: matchedCustomer?.id,
    contactPerson: linkedLead.name,
      contactPersonTitle: "Mr.",
    customerCompany: matchedCustomer?.company || linkedLead.company,
      addressLine1: line1,
      addressLine2: line2,
    city: matchedCustomer?.city || linkedLead.city || "",
    state: matchedCustomer?.state || linkedLead.state || "",
    country: matchedCustomer?.country || linkedLead.country || "India",
    pincode: matchedCustomer?.pincode || linkedLead.pincode || "",
      shippingAddressLine1: line1,
      shippingAddressLine2: line2,
      shippingCity: matchedCustomer?.city || linkedLead.city || "",
      shippingState: matchedCustomer?.state || linkedLead.state || "",
      shippingCountry: matchedCustomer?.country || linkedLead.country || "India",
      shippingPincode: matchedCustomer?.pincode || linkedLead.pincode || "",
    items: Array.isArray((linkedLead as any).assignedProducts) ? (linkedLead as any).assignedProducts : [],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quotationDate: new Date().toISOString().split('T')[0],
    sameAsBilling: true,
    terms: "",
    subtotal: "0",
    totalAmount: "0",
    cgstTotal: "0",
    sgstTotal: "0",
    igstTotal: "0",
    taxableTotal: "0",
    } as any;
  })() : undefined;

  const { data: copySource, isLoading: copyLoading } = useQuery<Quotation | null>({
    queryKey: ["/api/quotations", copyFromId],
    queryFn: async () => {
      if (!copyFromId) return null;
      const res = await fetch(`/api/quotations/${copyFromId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quotation to copy");
      return res.json();
    },
    enabled: !!copyFromId,
  });

  // Process copySource to generate new quotation number and dates
  const processedCopySource = copySource ? {
    ...copySource,
    id: undefined, // Remove ID to create new quotation
    quotationNumber: `RX-VQ25-25-07-${Date.now()}`, // Generate new quotation number
    quotationDate: new Date().toISOString().split('T')[0], // Set to current date
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Set new validity date
    createdAt: undefined, // Remove creation date
    updatedAt: undefined, // Remove update date
    status: 'draft' // Reset status to draft
  } : null;

  // Check if we're in edit mode by checking route params or URL
  const isEditMode = !!params?.id || window.location.pathname.includes('/edit/');
  const quotationId = params?.id ? parseInt(params.id) : (isEditMode ? parseInt(window.location.pathname.split('/edit/')[1]) : null);
  
  // Fetch quotation data if in edit mode
  const { data: quotation, isLoading: isLoadingQuotation, refetch: refetchQuotation } = useQuery<Quotation>({
    queryKey: ["/api/quotations", quotationId],
    queryFn: async () => {
      if (!quotationId) return null;
      console.log(`📥 Fetching quotation ID: ${quotationId}`);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch quotation");
      const data = await res.json();
      console.log(`✅ Received quotation data for ID ${quotationId}:`, data);
      return data;
    },
    enabled: !!quotationId,
    staleTime: 0,  // Data is immediately stale - always refetch on mount
    gcTime: 0,     // Don't keep data in garbage collection - remove immediately when unused
  });

  // Force refetch and invalidate cache when quotation ID changes
  useEffect(() => {
    if (quotationId && isEditMode) {
      console.log(`🔄 Quotation ID changed to ${quotationId}, invalidating cache and refetching...`);
      // Invalidate old cache entries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      // Then refetch this specific quotation
      refetchQuotation();
    }
  }, [quotationId, isEditMode, refetchQuotation]);

  // Create quotation mutation
  const createQuotation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🔥 Mutation function called with data:', data);
      console.log('🔥 Making POST request to /api/quotations...');
      
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      console.log('🔥 Response received:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        console.log('🔥 Error response data:', errorData);
        throw new Error(JSON.stringify(errorData));
      }
      
      const responseData = await res.json();
      console.log('🔥 Success response data:', responseData);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Quotation Created",
        description: "New quotation has been created successfully.",
      });
      setLocation("/quotations");
    },
    onError: (error: Error) => {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // Show detailed validation errors
          const errorMessages = errorData.errors.map((err: any) => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorData.message || "Failed to create quotation",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Error",
          description: error.message || "Failed to create quotation",
          variant: "destructive",
        });
      }
    },
  });

  // Update quotation mutation
  const updateQuotation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/quotations/${id}`, data);

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Quotation Updated",
        description: "Quotation has been updated successfully.",
      });
      setLocation("/quotations");
    },
    onError: (error: Error) => {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // Show detailed validation errors
          const errorMessages = errorData.errors.map((err: any) => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorData.message || "Failed to update quotation",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Error",
          description: error.message || "Failed to update quotation",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (data: any) => {
    console.log('🚀 Parent handleSubmit called with data:', data);
    console.log('🚀 User ID:', user?.id);
    
    // Add the createdBy field from the authenticated user
    const formDataWithUser = {
      ...data,
      createdBy: user?.id ? parseInt(String(user.id)) : undefined
    };
    
    console.log('🚀 Form data with user:', formDataWithUser);
    
    if (isEditMode && quotationId) {
      // Update existing quotation
      console.log('🚀 Calling updateQuotation.mutate...');
      updateQuotation.mutate({ id: quotationId, data: formDataWithUser });
      console.log('🚀 updateQuotation.mutate called');
    } else {
      // Create new quotation
      console.log('🚀 Calling createQuotation.mutate...');
      createQuotation.mutate(formDataWithUser);
      console.log('🚀 createQuotation.mutate called');
    }
  };



  return (
    <Layout>
      <div className="page-body">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            {isEditMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/quotations")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Quotations
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "Edit Quotation" : "Create New Quotation"}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode 
                  ? "Update the quotation details below" 
                  : "Fill in the details below to create a new quotation"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isEditMode && isLoadingQuotation && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quotation...</p>
          </div>
        )}

        {/* Quotation Form */}
        {(!isEditMode || (!isLoadingQuotation && quotation)) && (
          <div className="bg-white rounded-lg border">
            <QuotationForm
              // Use stable key that doesn't change on every render
              key={leadId ? `lead-${leadId}` : (isEditMode ? `edit-${quotationId}` : `new-${Date.now()}`)}
              onSubmit={handleSubmit}
              isSubmitting={createQuotation.isPending || updateQuotation.isPending}
              mode={isEditMode ? "edit" : "create"}
              // Pass appropriate default values based on mode
              defaultValues={
                isEditMode && quotation ? quotation :
                copySource ? processedCopySource :
                prefillFromLead || {}
              }
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
