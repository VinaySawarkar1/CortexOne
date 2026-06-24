import { useState } from "react";
import { Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Building, Mail, Phone, ChevronUp, ChevronDown, Users, Eye } from "lucide-react";
import { format } from "date-fns";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  onView?: (customer: Customer) => void;
}

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  inactive: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
};

export default function CustomerTable({ customers, isLoading, onEdit, onDelete, onView }: CustomerTableProps) {
  const [sortField, setSortField] = useState<keyof Customer>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: keyof Customer) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const sorted = [...customers].sort((a, b) => {
    const av = a[sortField], bv = b[sortField];
    if (av == null) return 1; if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    if (typeof av === "number" && typeof bv === "number")
      return sortDir === "asc" ? av - bv : bv - av;
    return 0;
  });

  const SortIcon = ({ field }: { field: keyof Customer }) =>
    sortField === field ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-30" />;

  if (isLoading) return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {[...Array(6)].map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 flex-1" /></div>)}
    </div>
  );

  if (customers.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Users className="h-8 w-8 text-indigo-500" />
      </div>
      <h3 className="text-sm font-bold text-gray-700 mb-1">No customers yet</h3>
      <p className="text-xs text-gray-400">Create your first customer to get started.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/80">
            {[
              { label: "Customer", field: "name" as keyof Customer },
              { label: "Company", field: "company" as keyof Customer },
              { label: "Contact" },
              { label: "Status", field: "status" as keyof Customer },
              { label: "Credit Limit", field: "creditLimit" as keyof Customer },
              { label: "Joined", field: "createdAt" as keyof Customer },
              { label: "" },
            ].map((col, i) => (
              <th key={i}
                className={`px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left border-b border-gray-100 ${col.field ? "cursor-pointer select-none hover:text-gray-600 transition-colors" : ""}`}
                onClick={() => col.field && toggleSort(col.field)}>
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.field && <SortIcon field={col.field} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr key={c.id} className="group border-b border-gray-50 hover:bg-indigo-50/30 transition-colors duration-150"
              style={{ animationDelay: `${i * 0.03}s` }}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    {(c.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{c.name}</div>
                    {c.gstNumber && <div className="text-[10px] text-gray-400">GST: {c.gstNumber}</div>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Building className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{c.company || "—"}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Mail className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{c.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Phone className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    {c.phone || "—"}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusStyle[c.status] || statusStyle.inactive}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs font-semibold text-gray-800">₹{parseFloat(c.creditLimit || "0").toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-gray-400">{c.paymentTerms || "—"}</div>
              </td>
              <td className="px-4 py-3 text-[11px] text-gray-500">
                {c.createdAt ? format(new Date(c.createdAt), "dd MMM yyyy") : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onView && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-purple-100 hover:text-purple-700" title="View 360" onClick={() => onView(c)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-indigo-100 hover:text-indigo-700" onClick={() => onEdit(c)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-600" onClick={() => onDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 font-medium">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
