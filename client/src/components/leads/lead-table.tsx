import { Lead } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, ShoppingCart, FileText, User, Eye, UserPlus, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface LeadTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  onConvertToOrder: (lead: Lead) => void;
  onCreateQuotation: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
  onConvertToCustomer?: (lead: Lead) => void;
  isLoading?: boolean;
}

export default function LeadTable({ leads, onEdit, onDelete, onConvertToOrder, onCreateQuotation, onViewDetails, onConvertToCustomer, isLoading = false }: LeadTableProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'new': { color: 'bg-green-100 text-green-800', label: 'New' },
      'contacted': { color: 'bg-blue-100 text-blue-800', label: 'Contacted' },
      'qualified': { color: 'bg-purple-100 text-purple-800', label: 'Qualified' },
      'proposal': { color: 'bg-indigo-100 text-indigo-800', label: 'Proposal' },
      'negotiation': { color: 'bg-yellow-100 text-yellow-800', label: 'Negotiation' },
      'closed': { color: 'bg-teal-100 text-teal-800', label: 'Closed' },
      'lost': { color: 'bg-red-100 text-red-800', label: 'Lost' }
    };
    
    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.new;
    return <Badge className={config.color}>{config.label}</Badge>;
  };
  
  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      'industry': { color: 'bg-blue-100 text-blue-800', label: 'Industry' },
      'calibration_labs': { color: 'bg-green-100 text-green-800', label: 'Calibration Labs' },
      'vision_measuring_machine': { color: 'bg-purple-100 text-purple-800', label: 'Vision Measuring' },
      'data_logger': { color: 'bg-indigo-100 text-indigo-800', label: 'Data Logger' },
      'calibration_software': { color: 'bg-teal-100 text-teal-800', label: 'Calibration Software' },
      'meatest': { color: 'bg-yellow-100 text-yellow-800', label: 'Meatest' },
      'finalization': { color: 'bg-orange-100 text-orange-800', label: 'Finalization' },
      'waiting_for_po': { color: 'bg-red-100 text-red-800', label: 'Waiting for PO' }
    };
    
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.industry;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
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
            <TableHead className="font-semibold text-gray-700">Lead</TableHead>
            <TableHead className="font-semibold text-gray-700">Company</TableHead>
            <TableHead className="font-semibold text-gray-700">Rating</TableHead>
            <TableHead className="font-semibold text-gray-700">Category</TableHead>
            <TableHead className="font-semibold text-gray-700">Source</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
            <TableHead className="font-semibold text-gray-700">Date Added</TableHead>
            <TableHead className="font-semibold text-gray-700 text-right">&nbsp;</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length > 0 ? (
            leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer" onClick={() => setActiveLead(lead)}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-900 font-medium">{lead.company}</div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`h-3.5 w-3.5 ${(lead as any).rating >= n ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {getCategoryBadge(lead.category)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-cyan-100 text-cyan-800">
                    {lead.source || 'Other'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(lead.status)}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">{formatDate(lead.createdAt)}</div>
                </TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <User className="h-8 w-8 text-gray-400" />
                  <p className="text-gray-500">No leads found</p>
                  <p className="text-sm text-gray-400">Get started by adding your first lead</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Dialog open={!!activeLead} onOpenChange={(o) => !o && setActiveLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Actions</DialogTitle>
          </DialogHeader>
          {activeLead && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="text-gray-900 hover:bg-gray-100 border-gray-300"
                onClick={() => { onViewDetails(activeLead); setActiveLead(null); }}
              >
                <Eye className="h-4 w-4 mr-2"/>View Details
              </Button>
              <Button 
                variant="outline" 
                className="text-gray-900 hover:bg-gray-100 border-gray-300"
                onClick={() => { onEdit(activeLead); setActiveLead(null); }}
              >
                <Edit className="h-4 w-4 mr-2"/>Edit Lead
              </Button>
              <Button 
                variant="outline" 
                className="text-gray-900 hover:bg-gray-100 border-gray-300"
                onClick={() => { onCreateQuotation(activeLead); setActiveLead(null); }}
              >
                <FileText className="h-4 w-4 mr-2"/>Create Quotation
              </Button>
              {onConvertToCustomer && (
                <Button 
                  variant="outline" 
                  className="text-gray-900 hover:bg-gray-100 border-gray-300"
                  onClick={() => { onConvertToCustomer(activeLead); setActiveLead(null); }}
                >
                  <UserPlus className="h-4 w-4 mr-2"/>Convert to Customer
                </Button>
              )}
              <Button 
                variant="outline" 
                className="text-gray-900 hover:bg-gray-100 border-gray-300"
                onClick={() => { onConvertToOrder(activeLead); setActiveLead(null); }}
              >
                <ShoppingCart className="h-4 w-4 mr-2"/>Convert to Order
              </Button>
              <Button variant="destructive" onClick={() => { onDelete(activeLead.id); setActiveLead(null); }}>
                <Trash className="h-4 w-4 mr-2"/>Delete Lead
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
