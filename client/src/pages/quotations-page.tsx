import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Quotation } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import QuotationTable from "@/components/quotations/quotation-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, FileText, Receipt, ShoppingCart, Settings, Check } from "lucide-react";
import ExcelImportExport from "@/components/common/ExcelImportExport";

export default function QuotationsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("quotations");
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Get all quotations
  const {
    data: quotations,
    isLoading: quotationsLoading,
    error: quotationsError
  } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  // Get all customers
  const {
    data: customers,
    isLoading: customersLoading,
    error: customersError
  } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Get all proformas
  const {
    data: proformas,
    isLoading: proformasLoading,
    error: proformasError
  } = useQuery<any[]>({
    queryKey: ["/api/proformas"],
  });

  // Merge quotation data with customer information
  const enrichedQuotations = quotations?.map(quotation => {
    const customer = customers?.find(c => c.id === quotation.customerId);
    return {
      ...quotation,
      quotationNumber: quotation.quotationNumber || '',
      customerName: customer?.name || 'Unknown Customer',
      customerCompany: customer?.company || quotation.customerCompany || 'Unknown Company',
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || ''
    };
  }) || [];

  // Merge proforma data with customer information
  const enrichedProformas = (proformas || []).map((p: any) => {
    const customer = customers?.find((c: any) => c.id === p.customerId);
    return {
      ...p,
      customerName: customer?.name || p.contactPerson || 'Unknown Customer',
      customerCompany: customer?.company || p.customerCompany || 'Unknown Company',
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || ''
    };
  });

  const isLoading = quotationsLoading || customersLoading || proformasLoading;
  const error = quotationsError || customersError || proformasError;

  // Delete quotation mutation
  const deleteQuotation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/quotations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Quotation Deleted",
        description: "Quotation has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete quotation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Convert to invoice mutation
  const convertToInvoice = useMutation({
    mutationFn: async (quotationId: number) => {
      const res = await apiRequest("POST", `/api/quotations/${quotationId}/convert-to-invoice`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice Created",
        description: "Quotation has been converted to invoice successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to convert to invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate PDF mutation
  const generatePDF = useMutation({
    mutationFn: async (quotationId: number) => {
      // Open PDF in new tab for download
      window.open(`/api/quotations/${quotationId}/download-pdf`, '_blank');
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "Quotation PDF has been generated and opened in a new tab.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to generate PDF: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update quotation status mutation
  const updateQuotationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/quotations/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Status Updated",
        description: "Quotation status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleChangeStatus = (id: number, status: string) => {
    updateQuotationStatus.mutate({ id, status });
  };

  const handleEdit = (quotation: any) => {
    // Navigate using a robust identifier to support records without numeric id
    const flexibleId = quotation?.id ?? quotation?._id ?? quotation?.quotationNumber ?? quotation?.quoteNumber;
    if (!flexibleId) {
      toast({ title: "Error", description: "Quotation identifier missing", variant: "destructive" });
      return;
    }
    setLocation(`/quotations/edit/${flexibleId}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this quotation?")) {
      deleteQuotation.mutate(id);
    }
  };

  const handleConvertToInvoice = (id: number) => {
    if (confirm("Convert this quotation to invoice?")) {
      convertToInvoice.mutate(id);
    }
  };

  const handleGeneratePDF = (id: number) => {
    generatePDF.mutate(id);
  };

  const handlePrint = (id: number) => {
    // Open PDF in new tab for printing
    window.open(`/api/quotations/${id}/download-pdf`, '_blank');
  };

  const handleGenerateProformaInvoice = (id: number) => {
    // Open proforma invoice PDF in new tab and persist a proforma record
    window.open(`/api/quotations/${id}/proforma-invoice`, '_blank');
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/proformas"] });
    }, 500);
  };

  const handleGenerateDeliveryChallan = (id: number) => {
    // Open delivery challan PDF in new tab
    window.open(`/api/quotations/${id}/delivery-challan`, '_blank');
  };

  const handleConvertToOrder = (id: number) => {
    if (confirm("Convert this quotation to order?")) {
      // Make API call to convert quotation to order
      fetch(`/api/quotations/${id}/convert-to-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast({
            title: "Success",
            description: "Quotation converted to order successfully.",
          });
          // Refresh quotations list
          queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
        } else {
          throw new Error(data.message || 'Failed to convert quotation to order');
        }
      })
      .catch(error => {
        toast({
          title: "Error",
          description: `Failed to convert quotation to order: ${error.message}`,
          variant: "destructive",
        });
      });
    }
  };

  const handleAddNew = () => {
    setLocation("/quotations/new");
  };

  const handleRevise = (id: number) => {
    setLocation(`/quotations/new?copyFrom=${id}`);
  };

  const handleCopy = (quotation: any) => {
    setLocation(`/quotations/new?copyFrom=${quotation.id}`);
  };

  const handleCopyProforma = (proforma: any) => {
    setLocation(`/proforma/new?copyFrom=${proforma.id}`);
  };

  const handleSaveAsTemplate = (q: any) => {
    apiRequest("POST", "/api/quotation-templates", q).then(() => {
      toast({ title: "Saved as template", description: "Quotation saved to templates." });
    }).catch((e) => {
      toast({ title: "Error", description: e.message || 'Failed to save template', variant: "destructive" });
    });
  };

  // Filters
  const withinTimeWindow = (createdAt: any) => {
    if (timeFilter === 'all') return true;
    if (!createdAt) return false;
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    if (timeFilter === 'day') return d.toDateString() === now.toDateString();
    if (timeFilter === 'week') { const start = new Date(now); start.setDate(now.getDate()-7); return d >= start && d <= now; }
    if (timeFilter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (timeFilter === 'quarter') { const q = Math.floor(now.getMonth()/3); const qs = new Date(now.getFullYear(), q*3, 1); const qe = new Date(now.getFullYear(), q*3+3, 0, 23,59,59,999); return d >= qs && d <= qe; }
    if (timeFilter === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const filteredQuotations = enrichedQuotations.filter(quotation => {
    const quoteNumber = String(quotation.quotationNumber || '').toLowerCase();
    const customerCompany = String(quotation.customerCompany || '').toLowerCase();
    const customerName = String(quotation.customerName || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = quoteNumber.includes(searchLower) ||
                         customerCompany.includes(searchLower) ||
                         customerName.includes(searchLower);
    const matchesStatus = statusFilter === "all" || quotation.status === statusFilter;
    return matchesSearch && matchesStatus && withinTimeWindow(quotation.createdAt);
  });

  const filteredProformas = (enrichedProformas || []).filter((p: any) => {
    const num = String(p.proformaNumber || p.quotationNumber || '').toLowerCase();
    const customerCompany = String(p.customerCompany || '').toLowerCase();
    const customerName = String(p.customerName || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = num.includes(searchLower) ||
      customerCompany.includes(searchLower) ||
      customerName.includes(searchLower);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus && withinTimeWindow(p.createdAt);
  });

  const totalQuotes = filteredQuotations.length;
  const totalProformas = filteredProformas.length;
  const maxPageQuotes = Math.max(1, Math.ceil(totalQuotes / pageSize));
  const maxPageProformas = Math.max(1, Math.ceil(totalProformas / pageSize));
  const maxPage = activeTab === 'proforma' ? maxPageProformas : maxPageQuotes;
  
  // Ensure page doesn't exceed maximum (use useEffect to avoid render issues)
  const currentPage = Math.min(Math.max(1, page), maxPage);
  
  // Reset page to 1 if filtered results change and current page is invalid
  useEffect(() => {
    if (page > maxPage && maxPage > 0) {
      setPage(maxPage);
    }
  }, [maxPage, page]);
  
  const paginatedQuotes = filteredQuotations.slice((currentPage-1)*pageSize, currentPage*pageSize);
  const paginatedProformas = filteredProformas.slice((currentPage-1)*pageSize, currentPage*pageSize);

  // Calculate statistics (for quotations for now)
  const totalQuotations = enrichedQuotations.length;
  const totalAmount = enrichedQuotations.reduce((sum, q) => sum + parseFloat(q.totalAmount || "0"), 0);
  const preTaxAmount = enrichedQuotations.reduce((sum, q) => sum + parseFloat(q.subtotal || "0"), 0);

  if (error) {
    return (
      <Layout>
        <div className="text-center my-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Quotations</h2>
          <p className="text-gray-600">{(error as Error).message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-body">
        <PageHeader
          title="Quotations"
          subtitle="Manage your sales quotations"
        />

        {/* Top Bar with Stats and Actions */}
        <div className="mb-6 bg-white p-4 rounded-lg border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Count</div>
                <div className="text-2xl font-bold">{totalQuotations}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Pre-Tax</div>
                <div className="text-2xl font-bold text-blue-600">₹{preTaxAmount.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Total</div>
                <div className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-64"
              />
              <ExcelImportExport entity="quotations" />
              <select
                value={timeFilter}
                onChange={(e) => { setTimeFilter(e.target.value); setPage(1); }}
                className="h-9 border rounded px-2 text-sm"
              >
                <option value="all">All time</option>
                <option value="day">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
                <option value="year">This year</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintSettings(true)}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Print Settings
              </Button>
              <Button onClick={handleAddNew} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Create Quotation
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("quotations")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "quotations"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Quotations
              </button>
              <button
                onClick={() => setActiveTab("proforma")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "proforma"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Proforma Invoices
              </button>
            </nav>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="2025-2026">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fin Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-2026">2025-2026</SelectItem>
              <SelectItem value="2024-2025">2024-2025</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="maharashtra">Maharashtra</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Executive" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Executives</SelectItem>
              <SelectItem value="vinay">Vinay Sawarkar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <QuotationTable
          quotations={activeTab === 'proforma' ? paginatedProformas : paginatedQuotes}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onConvertToInvoice={handleConvertToInvoice}
          onGeneratePDF={handleGeneratePDF}
          onPrint={handlePrint}
          onGenerateProformaInvoice={handleGenerateProformaInvoice}
          onGenerateDeliveryChallan={handleGenerateDeliveryChallan}
          onConvertToOrder={handleConvertToOrder}
          onChangeStatus={handleChangeStatus}
          onRevise={handleRevise}
          onSaveAsTemplate={handleSaveAsTemplate}
          onCopy={handleCopy}
          onCopyProforma={handleCopyProforma}
          mode={activeTab === "proforma" ? "proforma" : "quotation"}
        />

        {(activeTab === 'proforma' ? filteredProformas : filteredQuotations).length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {(() => {
                const total = activeTab === 'proforma' ? totalProformas : totalQuotes;
                const start = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
                const end = Math.min(currentPage * pageSize, total);
                return total > 0 ? `Showing ${start} - ${end} of ${total}` : 'No results';
              })()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
              <Button variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage(p => Math.min(maxPage, p+1))}>Next</Button>
            </div>
          </div>
        )}

        {/* Print Settings Modal */}
        {showPrintSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Print Configuration</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrintSettings(false)}
                >
                  ✕
                </Button>
              </div>

              <p className="text-sm text-gray-600 mb-4">Tick the items you want to include in print.</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Elements</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      Header
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      Footer
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      Digital Signature
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      Party Information
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      Bank Details
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      GSTIN
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button className="w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 