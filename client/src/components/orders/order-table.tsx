import { Order } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  Receipt,
  Truck,
  Printer,
  Download,
  CheckCircle2
} from "lucide-react";

interface OrderTableProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
  onViewDetails: (order: Order) => void;
  onPrintInternalOrder: (order: Order) => void;
  onGenerateInvoice: (order: Order) => void;
  onGenerateDeliveryChallan: (order: Order) => void;
  onConfirm?: (order: Order) => void;
  isLoading?: boolean;
}

export default function OrderTable({
  orders,
  onEdit,
  onDelete,
  onViewDetails,
  onPrintInternalOrder,
  onGenerateInvoice,
  onGenerateDeliveryChallan,
  onConfirm,
  isLoading = false,
}: OrderTableProps) {
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'confirmed': { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      'in_progress': { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      'processing': { color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'shipped': { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
      'delivered': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    } as const;
    
    const key = (status || '').toLowerCase() as keyof typeof statusConfig;
    const config = statusConfig[key] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50">
            <TableHead className="font-semibold text-gray-700">Order</TableHead>
            <TableHead className="font-semibold text-gray-700">Customer</TableHead>
            <TableHead className="font-semibold text-gray-700">Amount</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
            <TableHead className="font-semibold text-gray-700">Date</TableHead>
            <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50 border-b border-gray-100">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {order.orderNumber || `ORD-${order.id}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.subject || 'Order'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-900 font-medium">{order.customerCompany || `Customer #${order.customerId}`}</div>
                  <div className="text-sm text-gray-500">{order.customerName || (order.leadId ? `Lead #${order.leadId}` : '')}</div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-900 font-semibold">
                    {formatCurrency(order.totalAmount || (order as any).amount || 0)}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(order.status)}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">{formatDate(order.createdAt)}</div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onViewDetails(order)} className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(order)} className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Order
                      </DropdownMenuItem>
                      {onConfirm && (order.status === 'processing' || order.status === 'pending') && (
                        <DropdownMenuItem onClick={() => onConfirm(order)} className="cursor-pointer text-blue-600">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Confirm Order
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onPrintInternalOrder(order)} className="cursor-pointer">
                        <Printer className="mr-2 h-4 w-4" />
                        Print Internal Order
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGenerateInvoice(order)} className="cursor-pointer">
                        <Receipt className="mr-2 h-4 w-4" />
                        Generate Invoice
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGenerateDeliveryChallan(order)} className="cursor-pointer">
                        <Truck className="mr-2 h-4 w-4" />
                        Generate Delivery Challan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => onDelete(order.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Receipt className="h-8 w-8 text-gray-400" />
                  <p className="text-gray-500">No orders found</p>
                  <p className="text-sm text-gray-400">Get started by creating your first order</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
