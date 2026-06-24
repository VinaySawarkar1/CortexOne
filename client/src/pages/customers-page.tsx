import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Customer } from "@shared/schema";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import CustomerTable from "@/components/customers/customer-table";
import CustomerForm from "@/components/customers/customer-form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, X, FileText, ShoppingCart, Headphones, Phone, Mail, Globe, MapPin } from "lucide-react";
import ExcelImportExport from "@/components/common/ExcelImportExport";

function Customer360({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/orders"] });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/invoices"] });
  const { data: tickets = [] } = useQuery<any[]>({ queryKey: ["/api/support-tickets"] });

  const custOrders = orders.filter((o: any) => o.customerId === customer.id || o.customerName?.toLowerCase() === customer.name?.toLowerCase());
  const custInvoices = invoices.filter((i: any) => i.customerId === customer.id);
  const custTickets = tickets.filter((t: any) => t.customerId === customer.id);

  const totalRevenue = custInvoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + parseFloat(i.totalAmount || "0"), 0);
  const openTickets = custTickets.filter((t: any) => t.status === "open" || t.status === "in_progress").length;

  const tabs = [
    { id: "orders", label: "Orders", count: custOrders.length, icon: ShoppingCart },
    { id: "invoices", label: "Invoices", count: custInvoices.length, icon: FileText },
    { id: "tickets", label: "Tickets", count: custTickets.length, icon: Headphones },
  ];
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-extrabold flex-shrink-0">
            {customer.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">{customer.name}</h3>
            <p className="text-xs text-slate-500">{customer.company}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block ${customer.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{customer.status}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="h-4 w-4" /></button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 py-4 border-b border-slate-100">
        <div className="text-center"><div className="text-lg font-extrabold text-indigo-700">{custOrders.length}</div><div className="text-[10px] text-slate-400">Orders</div></div>
        <div className="text-center"><div className="text-lg font-extrabold text-emerald-700">₹{totalRevenue.toLocaleString("en-IN")}</div><div className="text-[10px] text-slate-400">Paid Revenue</div></div>
        <div className="text-center"><div className="text-lg font-extrabold text-amber-600">{openTickets}</div><div className="text-[10px] text-slate-400">Open Tickets</div></div>
      </div>

      {/* Contact info */}
      <div className="py-3 border-b border-slate-100 grid grid-cols-2 gap-2">
        {customer.phone && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="h-3 w-3 text-slate-400" />{customer.phone}</div>}
        {customer.email && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail className="h-3 w-3 text-slate-400" />{customer.email}</div>}
        {(customer as any).website && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Globe className="h-3 w-3 text-slate-400" />{(customer as any).website}</div>}
        {customer.address && <div className="flex items-center gap-1.5 text-xs text-slate-500 col-span-2"><MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" /><span className="line-clamp-1">{customer.address}</span></div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-100 mt-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-700"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
            {t.count > 0 && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-1.5">
        {activeTab === "orders" && (
          custOrders.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No orders yet</p> :
          custOrders.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-800">{o.orderNumber}</div>
                <div className="text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">₹{parseFloat(o.totalAmount || "0").toLocaleString("en-IN")}</div>
                <span className={`text-[9px] font-bold px-1.5 rounded-full ${o.status === "confirmed" ? "bg-green-100 text-green-700" : o.status === "delivered" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{o.status}</span>
              </div>
            </div>
          ))
        )}
        {activeTab === "invoices" && (
          custInvoices.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No invoices yet</p> :
          custInvoices.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-800">{i.invoiceNumber}</div>
                <div className="text-[10px] text-slate-400">{new Date(i.createdAt).toLocaleDateString("en-IN")}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">₹{parseFloat(i.totalAmount || "0").toLocaleString("en-IN")}</div>
                <span className={`text-[9px] font-bold px-1.5 rounded-full ${i.status === "paid" ? "bg-green-100 text-green-700" : i.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{i.status}</span>
              </div>
            </div>
          ))
        )}
        {activeTab === "tickets" && (
          custTickets.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No tickets yet</p> :
          custTickets.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-800">{t.subject}</div>
                <div className="text-[10px] text-slate-400">{t.ticketNumber} · {new Date(t.createdAt).toLocaleDateString("en-IN")}</div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.status === "open" ? "bg-blue-100 text-blue-700" : t.status === "resolved" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{t.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: customers, isLoading, error } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createCustomer = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/customers", data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/customers"] }); setDialogOpen(false); toast({ title: "Customer Created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => (await apiRequest("PUT", `/api/customers/${id}`, data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/customers"] }); setDialogOpen(false); setEditingCustomer(null); toast({ title: "Customer Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/customers/${id}`)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/customers"] }); toast({ title: "Customer Deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (data: any) => {
    if (editingCustomer) updateCustomer.mutate({ id: editingCustomer.id, data });
    else createCustomer.mutate(data);
  };

  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setDialogOpen(true); };
  const handleDelete = (id: number) => { if (confirm("Delete this customer?")) deleteCustomer.mutate(id); };
  const handleAddNew = () => { setEditingCustomer(null); setDialogOpen(true); };

  const filteredCustomers = customers?.filter(customer => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || customer.name.toLowerCase().includes(q) || customer.company.toLowerCase().includes(q) ||
      customer.email.toLowerCase().includes(q) || customer.phone.includes(searchTerm);
    return matchSearch && (statusFilter === "all" || customer.status === statusFilter);
  }) || [];

  const paginatedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  if (error) {
    return <Layout><div className="text-center my-8 text-red-600">{(error as Error).message}</div></Layout>;
  }

  return (
    <Layout>
      <PageHeader title="Customers" subtitle="Manage your customer database"
        actions={
          <div className="flex items-center gap-2">
            <ExcelImportExport entity="customers" />
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddNew} className="h-8 text-xs font-semibold border-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add Customer
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-card-value">{customers?.length || 0}</div><div className="stat-card-label">Total Customers</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#059669" }}>{customers?.filter(c => c.status === "active").length || 0}</div><div className="stat-card-label">Active</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#6366f1" }}>{customers?.filter(c => { const d = new Date(c.createdAt); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length || 0}</div><div className="stat-card-label">Added This Month</div></div>
          <div className="stat-card"><div className="stat-card-value" style={{ color: "#7c3aed" }}>₹{(customers?.reduce((s, c) => s + parseFloat(c.creditLimit || "0"), 0) || 0).toLocaleString("en-IN")}</div><div className="stat-card-label">Total Credit Limit</div></div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search customers…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 h-8 text-xs" />
          </div>
          <p className="text-xs text-slate-400 ml-auto">{filteredCustomers.length} result{filteredCustomers.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        <CustomerTable
          customers={paginatedCustomers}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={(c: Customer) => setViewCustomer(c)}
        />

        {filteredCustomers.length > pageSize && (
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-400">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredCustomers.length)} of {filteredCustomers.length}</div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page * pageSize >= filteredCustomers.length} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
            <DialogDescription>{editingCustomer ? "Update customer information." : "Fill in customer details."}</DialogDescription>
          </DialogHeader>
          <CustomerForm onSubmit={handleSubmit} isSubmitting={createCustomer.isPending || updateCustomer.isPending}
            mode={editingCustomer ? "edit" : "create"} defaultValues={editingCustomer || undefined} />
        </DialogContent>
      </Dialog>

      {/* Customer 360 panel */}
      <Dialog open={!!viewCustomer} onOpenChange={v => !v && setViewCustomer(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          {viewCustomer && <Customer360 customer={viewCustomer} onClose={() => setViewCustomer(null)} />}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
