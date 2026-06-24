import { useState } from "react";
import { Invoice } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit,
  Trash2,
  Eye,
  FileText,
  Receipt,
  Download,
  Printer,
  Calendar,
  User,
  Building,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: number) => void;
  onGeneratePDF: (id: number) => void;
  onPrint: (id: number) => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export default function InvoiceTable({
  invoices,
  isLoading,
  onEdit,
  onDelete,
  onGeneratePDF,
  onPrint,
  onRecordPayment,
}: InvoiceTableProps) {
  const [sortField, setSortField] = useState<keyof Invoice>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === "asc" 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    return 0;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount (₹)</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Issued on</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <Receipt className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort("invoiceNumber")}
            >
              <div className="flex items-center gap-1">
                Invoice No.
                {sortField === "invoiceNumber" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort("totalAmount")}
            >
              <div className="flex items-center gap-1">
                Amount (₹)
                {sortField === "totalAmount" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort("dueDate")}
            >
              <div className="flex items-center gap-1">
                Due Date
                {sortField === "dueDate" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort("createdAt")}
            >
              <div className="flex items-center gap-1">
                Issued on
                {sortField === "createdAt" && (
                  <span className="text-xs">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => (
            <TableRow key={invoice.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="font-medium text-blue-600">
                  {invoice.invoiceNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {(invoice as any).subject || 'Invoice'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {invoice.customerId ? `Customer #${invoice.customerId}` : "N/A"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(invoice as any).quotationId ? `Quote #${(invoice as any).quotationId}` : ""}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  ₹{parseFloat(invoice.totalAmount || "0").toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Paid: ₹{parseFloat(invoice.paidAmount || "0").toLocaleString()}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <div className={`text-sm ${isOverdue(invoice.dueDate) ? 'text-red-600' : ''}`}>
                    {format(new Date(invoice.dueDate), "dd-MMM")}
                  </div>
                </div>
                {isOverdue(invoice.dueDate) && (
                  <div className="text-xs text-red-600">Overdue</div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(invoice.createdAt), "dd-MMM")}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(invoice.createdAt), "HH:mm")}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(invoice.status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(invoice)}
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onGeneratePDF(invoice.id)}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                    title="Generate PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPrint(invoice.id)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  {onRecordPayment && invoice.status !== 'paid' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRecordPayment(invoice)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      title="Record Payment"
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(invoice.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 