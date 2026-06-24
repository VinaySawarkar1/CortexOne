import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Invoice } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import InvoiceTable from "@/components/invoices/invoice-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export default function InvoicesPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("invoices");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Get all invoices
  const {
    data: invoices,
    isLoading,
    error
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });


  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice Deleted",
        description: "Invoice has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate PDF mutation
  const generatePDF = useMutation({
    mutationFn: async (invoiceId: number) => {
      // Open PDF in new tab for download
      window.open(`/api/invoices/${invoiceId}/download-pdf`, '_blank');
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "Invoice PDF has been generated and opened in a new tab.",
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

  const handleEdit = (invoice: Invoice) => {
    setLocation(`/invoices/edit/${invoice.id}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoice.mutate(id);
    }
  };

  const handleGeneratePDF = (id: number) => {
    generatePDF.mutate(id);
  };

  const handlePrint = (id: number) => {
    // Open PDF in new tab for printing
    window.open(`/api/invoices/${id}/download-pdf`, '_blank');
  };

  const handleAddNew = () => {
    setLocation("/invoices/new");
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ((invoice as any).subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const paginatedInvoices = filteredInvoices.slice((page-1)*pageSize, page*pageSize);

  // Calculate statistics
  const totalInvoices = invoices?.length || 0;
  const totalAmount = invoices?.reduce((sum, i) => sum + parseFloat(i.totalAmount || "0"), 0) || 0;
  const preTaxAmount = invoices?.reduce((sum, i) => sum + parseFloat(i.subtotal || "0"), 0) || 0;
  const paidAmount = invoices?.reduce((sum, i) => sum + parseFloat(i.paidAmount || "0"), 0) || 0;

  if (error) {
    return (
      <Layout>
        <div className="text-center my-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Invoices</h2>
          <p className="text-gray-600">{(error as Error).message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="Invoices" subtitle="Manage sales invoices and proformas"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {["invoices","proforma"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {tab === "proforma" ? "Proforma" : "Invoices"}
                </button>
              ))}
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddNew} className="h-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1.5" />New Invoice
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Invoices", value: totalInvoices, color: "#1e293b" },
            { label: "Pre-Tax Total", value: `₹${preTaxAmount.toLocaleString("en-IN")}`, color: "#6366f1" },
            { label: "Total w/ Tax", value: `₹${totalAmount.toLocaleString("en-IN")}`, color: "#059669" },
            { label: "Amount Paid", value: `₹${paidAmount.toLocaleString("en-IN")}`, color: "#7c3aed" },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + filter row */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs">
            <Input placeholder="Search invoices..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="h-8 text-xs pl-3 w-60" />
          </div>
          <p className="text-xs text-gray-400 ml-auto">{filteredInvoices.length} result{filteredInvoices.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Invoice Table */}
        <InvoiceTable
          invoices={paginatedInvoices}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGeneratePDF={handleGeneratePDF}
          onPrint={handlePrint}
          onRecordPayment={(inv) => setLocation(`/payments?invoiceId=${inv.id}`)}
        />

        {filteredInvoices.length > pageSize && (
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-gray-400">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredInvoices.length)} of {filteredInvoices.length}</div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page * pageSize >= filteredInvoices.length} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 