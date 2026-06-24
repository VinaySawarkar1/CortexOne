import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Quotation, Customer, Lead } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Search, Check, Settings, FileText, User, MapPin, Package, DollarSign, Save, CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TermsSelector from "./terms-selector";

const quotationSchema = z.object({
  quotationNumber: z.string().min(1, "Quotation number is required"),
  customerId: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val);
      return isNaN(parsed) ? undefined : parsed;
    }
    return val;
  }).optional(),
  leadId: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val);
      return isNaN(parsed) ? undefined : parsed;
    }
    return val;
  }).optional(),
  validUntil: z.string().min(1, "Valid until date is required"),
  quotationDate: z.string().min(1, "Quotation date is required"),
  reference: z.string().optional(),
  contactPersonTitle: z.string().optional(),
  customerCompany: z.string().optional(),
  contactPerson: z.string().min(1, "Contact person is required"),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  pincode: z.string().min(1, "Pincode is required"),
  // Shipping address fields
  shippingAddressLine1: z.string().optional(),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingCountry: z.string().optional(),
  shippingPincode: z.string().optional(),
  salesCredit: z.string().optional(),
  sameAsBilling: z.boolean().default(true),
  items: z.array(z.object({
    id: z.number().optional(),
    description: z.string().min(1, "Description is required"),
    hsnSac: z.string().optional(),
    quantity: z.union([z.string(), z.number()]).transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val);
        return isNaN(parsed) ? 1 : parsed;
      }
      return val;
    }).pipe(z.number().min(1, "Quantity must be at least 1")),
    unit: z.string().min(1, "Unit is required"),
    rate: z.string().min(1, "Rate is required"),
    discount: z.string().optional(),
    discountType: z.enum(["percentage", "amount"]).optional().default("amount"),
    taxable: z.string().optional(),
    cgst: z.string().optional(),
    sgst: z.string().optional(),
    igst: z.string().optional(),
    amount: z.string().optional(),
    leadTime: z.string().optional(),
  })).min(1, "At least one item is required"),
  terms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  bankDetails: z.object({
    bankName: z.string().optional(),
    branch: z.string().optional(),
    accountNo: z.string().optional(),
    ifsc: z.string().optional(),
  }).optional(),
  extraCharges: z.array(z.object({
    description: z.string(),
    amount: z.string(),
  })).optional(),
  discounts: z.array(z.object({
    description: z.string(),
    amount: z.string(),
  })).optional(),
  discount: z.string().optional(),
  discountType: z.enum(["percentage", "amount"]).optional(),
  totalAmount: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
  subtotal: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
  cgstTotal: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
  sgstTotal: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
  igstTotal: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
  taxableTotal: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

// Type for the data we send to the server (with proper types)
type ServerQuotationData = Omit<QuotationFormData, 'totalAmount' | 'subtotal' | 'cgstTotal' | 'sgstTotal' | 'igstTotal' | 'taxableTotal' | 'terms'> & {
  totalAmount: string; // Decimal fields expect strings
  subtotal: string; // Decimal fields expect strings
  cgstTotal: string; // Decimal fields expect strings
  sgstTotal: string; // Decimal fields expect strings
  igstTotal: string; // Decimal fields expect strings
  taxableTotal: string; // Decimal fields expect strings
  customerId?: number;
  leadId?: number;
  createdBy?: number;
  customerCompany?: string; // Customer company name for PDF generation
  terms: string; // Terms as string for server
};

// Countries and States data
const countries = [
  { name: "India", code: "IN" },
  { name: "United States", code: "US" },
  { name: "United Kingdom", code: "GB" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Japan", code: "JP" },
  { name: "China", code: "CN" },
  { name: "Singapore", code: "SG" },
];

const titles = [
  "Mr.", "Mrs.", "Ms."
];

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Lakshadweep", "Puducherry", "Andaman and Nicobar Islands"
];

interface QuotationFormProps {
  onSubmit: (data: QuotationFormData) => void;
  isSubmitting: boolean;
  mode: "create" | "edit";
  defaultValues?: Quotation;
  submitLabel?: string;
  documentType?: "quotation" | "proforma" | "invoice"; // Add document type prop
}

export default function QuotationForm({
  onSubmit,
  isSubmitting,
  mode,
  defaultValues,
  submitLabel,
  documentType = "quotation",
}: QuotationFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [autoSaved, setAutoSaved] = useState(false);
  const [copySource, setCopySource] = useState<string>('none');
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [customerQuoteList, setCustomerQuoteList] = useState<any[]>([]);
  const [isCopyLoading, setIsCopyLoading] = useState<boolean>(false);
  async function handleCopyFrom(source: string) {
    try {
      if (source === 'none') return;
      if (source === 'templates') {
        setIsCopyLoading(true);
        const url = `/api/quotation-templates?t=${Date.now()}`;
        const res = await fetch(url, { credentials: 'include', cache: 'no-store' as RequestCache });
        const templates = res.ok ? await res.json() : [];
        setTemplateList(Array.isArray(templates) ? templates : []);
        setIsCopyLoading(false);
        if (!templates || templates.length === 0) {
          toast({ title: 'No templates', description: 'No saved templates found.' });
        }
      } else if (source === 'last_customer') {
        const customerId = watch('customerId');
        if (!customerId) {
          toast({ title: 'Select customer', description: 'Pick a customer first.' });
          return;
        }
        setIsCopyLoading(true);
        const res = await fetch(`/api/quotations?t=${Date.now()}`, { credentials: 'include', cache: 'no-store' as RequestCache });
        const list = res.ok ? await res.json() : [];
        const numericCustomerId = Number(customerId);
        const forCustomer = (Array.isArray(list) ? list : [])
          .filter((q: any) => Number(q.customerId) === numericCustomerId)
          .sort((a: any, b: any) => new Date(b.createdAt || b.quotationDate || 0).getTime() - new Date(a.createdAt || a.quotationDate || 0).getTime());
        setCustomerQuoteList(forCustomer);
        setIsCopyLoading(false);
        if (forCustomer.length === 0) {
          toast({ title: 'No quotations', description: 'No previous quotations found for this customer.' });
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to copy', variant: 'destructive' });
    }
  }

  function applyCopyValues(src: any) {
    const basicFields = [
      'reference','contactPersonTitle','customerCompany','contactPerson',
      'addressLine1','addressLine2','city','state','country','pincode',
      'shippingAddressLine1','shippingAddressLine2','shippingCity','shippingState','shippingCountry','shippingPincode',
      'quotationDate','validUntil','terms','notes','discount','discountType','subtotal','cgstTotal','sgstTotal','igstTotal','taxableTotal','totalAmount'
    ];
    basicFields.forEach(f => setValue(f as any, src?.[f] ?? ''));

    // Normalize and apply items
    const incomingItems = Array.isArray(src?.items) ? src.items : [];
    const normalizedItems = incomingItems.map((item: any) => ({
      ...item,
      quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : (item.quantity ?? 1),
      rate: typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : (item.rate ?? 0),
      discountType: item.discountType || 'amount'
    }));
    setItems(normalizedItems);
    setValue('items', normalizedItems as any, { shouldValidate: true });

    // Apply terms field to UI state as well
    if (Array.isArray(src?.terms)) {
      setTerms(src.terms);
    } else if (typeof src?.terms === 'string') {
      const arr = src.terms.split('\n').filter((t: string) => t.trim());
      if (arr.length) setTerms(arr);
    }

    // Apply discounts/extras if present
    if (Array.isArray(src?.extraCharges)) {
      setExtraCharges(src.extraCharges);
      setValue('extraCharges', src.extraCharges as any);
    }
    if (Array.isArray(src?.discounts)) {
      setDiscounts(src.discounts);
      setValue('discounts', src.discounts as any);
    }
    if (src?.discount !== undefined) {
      setDiscount(String(src.discount));
      setValue('discount', String(src.discount) as any);
    }
    if (src?.discountType) {
      setDiscountType(src.discountType);
      setValue('discountType', src.discountType as any);
    }

    toast({ title: 'Applied', description: 'Copied details into the form.' });
  }
  const [items, setItems] = useState<any[]>(Array.isArray(defaultValues?.items) ? defaultValues.items.map(item => ({
    ...item,
    quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity,
    discountType: item.discountType || 'amount'
  })) : []);
  const [terms, setTerms] = useState<string[]>(() => {
    if (defaultValues?.terms) {
      if (Array.isArray(defaultValues.terms)) {
        return defaultValues.terms;
      } else if (typeof defaultValues.terms === 'string') {
        const termsArray = defaultValues.terms.split('\n').filter(t => t.trim());
        return termsArray.length > 0 ? termsArray : [
    "Installation & Commissioning: Extra",
    "Payment Terms: 50% Advance Along with PO, Balance 50% and Taxes before delivery"
        ];
      }
    }
    return [
      "Installation & Commissioning: Extra",
      "Payment Terms: 50% Advance Along with PO, Balance 50% and Taxes before delivery"
    ];
  });
  const [extraCharges, setExtraCharges] = useState<any[]>(() => {
    if (defaultValues?.extraCharges && Array.isArray(defaultValues.extraCharges)) {
      return defaultValues.extraCharges;
    }
    return [];
  });
  const [discounts, setDiscounts] = useState<any[]>(() => {
    if (defaultValues?.discounts && Array.isArray(defaultValues.discounts)) {
      return defaultValues.discounts;
    }
    return [];
  });
  const [discount, setDiscount] = useState<string>(() => {
    if (defaultValues?.discount) {
      return defaultValues.discount;
    }
    return "0";
  });
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(() => {
    if (defaultValues?.discountType) {
      return defaultValues.discountType;
    }
    return "amount";
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);


  const [showNotes, setShowNotes] = useState(false);
  const [showNextActions, setShowNextActions] = useState(false);
  const [showSelectItemModal, setShowSelectItemModal] = useState(false);
  const [showAddBillingItemModal, setShowAddBillingItemModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<any>(null);
  const [editItemIndex, setEditItemIndex] = useState<number>(-1);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);

  // Load customers, leads, and inventory
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersRes, leadsRes, inventoryRes] = await Promise.all([
          apiRequest("GET", "/api/customers"),
          apiRequest("GET", "/api/leads"),
          apiRequest("GET", "/api/inventory")
        ]);
        const customersData = await customersRes.json();
        const leadsData = await leadsRes.json();
        const inventoryData = await inventoryRes.json();
                 setCustomers(customersData);
         setLeads(leadsData);
         setInventory(inventoryData);
         setFilteredCustomers(customersData);
         setFilteredInventory(inventoryData);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, []);

  // Populate form when defaultValues change (for editing mode) - will be moved after useForm

  // Click outside handler for customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    mode: "onChange", // Change from "onSubmit" to "onChange" for better validation
    defaultValues: defaultValues ? {
      quotationNumber: defaultValues.quotationNumber || '',
      customerId: defaultValues.customerId || undefined,
      leadId: defaultValues.leadId || undefined,
      validUntil: defaultValues.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quotationDate: defaultValues.quotationDate || new Date().toISOString().split('T')[0],
      reference: defaultValues.reference || "",
      contactPersonTitle: defaultValues.contactPersonTitle || "Mr.",
      contactPerson: defaultValues.contactPerson || "",
      customerCompany: defaultValues.customerCompany || "",
      addressLine1: defaultValues.addressLine1 || "",
      addressLine2: defaultValues.addressLine2 || "",
      city: defaultValues.city || "",
      state: defaultValues.state || "Maharashtra",
      country: defaultValues.country || "India",
      pincode: defaultValues.pincode || "",
      shippingAddressLine1: defaultValues.shippingAddressLine1 || defaultValues.addressLine1 || "",
      shippingAddressLine2: defaultValues.shippingAddressLine2 || defaultValues.addressLine2 || "",
      shippingCity: defaultValues.shippingCity || defaultValues.city || "",
      shippingState: defaultValues.shippingState || defaultValues.state || "Maharashtra",
      shippingCountry: defaultValues.shippingCountry || defaultValues.country || "India",
      shippingPincode: defaultValues.shippingPincode || defaultValues.pincode || "",
      salesCredit: defaultValues.salesCredit || "",
      sameAsBilling: true,
      items: Array.isArray(defaultValues.items) ? defaultValues.items.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity,
        discountType: item.discountType || 'amount'
      })) : [],
      terms: Array.isArray(defaultValues.terms) ? defaultValues.terms : (typeof defaultValues.terms === 'string' ? defaultValues.terms.split('\n').filter(t => t.trim()) : []),
      notes: defaultValues.notes || "",
      bankDetails: {
        bankName: "IDFC FIRST BANK LTD",
        branch: "BHOSARI PUNE",
        accountNo: "10120052061",
        ifsc: "IDFB0041434",
      },
      extraCharges: defaultValues.extraCharges || [],
      discounts: defaultValues.discounts || [],
      discount: defaultValues.discount || "",
      discountType: defaultValues.discountType || "amount",
      totalAmount: defaultValues.totalAmount || 0,
      subtotal: defaultValues.subtotal || 0,
      cgstTotal: defaultValues.cgstTotal || 0,
      sgstTotal: defaultValues.sgstTotal || 0,
      igstTotal: defaultValues.igstTotal || 0,
      taxableTotal: defaultValues.taxableTotal || 0,
    } : {
      quotationNumber: '',
      customerId: undefined,
      leadId: undefined,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quotationDate: new Date().toISOString().split('T')[0],
      reference: "",
      contactPersonTitle: "Mr.",
      contactPerson: "",
      customerCompany: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "Maharashtra",
      country: "India",
      pincode: "",
      shippingAddressLine1: "",
      shippingAddressLine2: "",
      shippingCity: "",
      shippingState: "Maharashtra",
      shippingCountry: "India",
      shippingPincode: "",
      salesCredit: "",
      sameAsBilling: true,
      items: [],
      terms: [
        "Installation & Commissioning: Extra",
        "Payment Terms: 50% Advance Along with PO, Balance 50% and Taxes before delivery"
      ],
      notes: "",
      bankDetails: {
        bankName: "IDFC FIRST BANK LTD",
        branch: "BHOSARI PUNE",
        accountNo: "10120052061",
        ifsc: "IDFB0041434",
      },
      extraCharges: [],
      discounts: [],
    },
  });
  
  // Populate form when defaultValues change (for editing mode)
  useEffect(() => {
    if (defaultValues && mode === "edit") {
      console.log(`🔄 Quotation form updating with new defaultValues:`, defaultValues);
      
      // Set customer if exists
      if (defaultValues.customerId) {
        const customer = customers.find(c => c.id === defaultValues.customerId);
        if (customer) {
          console.log(`📍 Setting customer:`, customer);
          setSelectedCustomer(customer);
        }
      } else {
        setSelectedCustomer(null);
      }
      
      // Set lead if exists
      if (defaultValues.leadId) {
        const lead = leads.find(l => l.id === defaultValues.leadId);
        if (lead) {
          console.log(`📍 Setting lead:`, lead);
          setSelectedLead(lead);
        }
      } else {
        setSelectedLead(null);
      }

      // Update form fields with default values
      setValue("quotationNumber", defaultValues.quotationNumber || "");
      setValue("customerId", defaultValues.customerId || undefined);
      setValue("leadId", defaultValues.leadId || undefined);
      setValue("validUntil", defaultValues.validUntil || "");
      setValue("quotationDate", defaultValues.quotationDate || "");
      setValue("reference", defaultValues.reference || "");
      setValue("contactPersonTitle", defaultValues.contactPersonTitle || "Mr.");
      setValue("customerCompany", defaultValues.customerCompany || "");
      setValue("contactPerson", defaultValues.contactPerson || "");
      setValue("addressLine1", defaultValues.addressLine1 || "");
      setValue("addressLine2", defaultValues.addressLine2 || "");
      setValue("city", defaultValues.city || "");
      setValue("state", defaultValues.state || "Maharashtra");
      setValue("country", defaultValues.country || "India");
      setValue("pincode", defaultValues.pincode || "");
      setValue("shippingAddressLine1", defaultValues.shippingAddressLine1 || defaultValues.addressLine1 || "");
      setValue("shippingAddressLine2", defaultValues.shippingAddressLine2 || defaultValues.addressLine2 || "");
      setValue("shippingCity", defaultValues.shippingCity || defaultValues.city || "");
      setValue("shippingState", defaultValues.shippingState || defaultValues.state || "Maharashtra");
      setValue("shippingCountry", defaultValues.shippingCountry || defaultValues.country || "India");
      setValue("shippingPincode", defaultValues.shippingPincode || defaultValues.pincode || "");
      setValue("salesCredit", defaultValues.salesCredit || "");
      setValue("sameAsBilling", true);
      setValue("items", Array.isArray(defaultValues.items) ? defaultValues.items.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity,
        discountType: item.discountType || 'amount'
      })) : []);
      setValue("terms", Array.isArray(defaultValues.terms) ? defaultValues.terms : (typeof defaultValues.terms === 'string' ? defaultValues.terms.split('\n').filter(t => t.trim()) : []));
      setValue("notes", defaultValues.notes || "");
      setValue("extraCharges", defaultValues.extraCharges || []);
      setValue("discounts", defaultValues.discounts || []);
      setValue("discount", defaultValues.discount || "");
      setValue("discountType", defaultValues.discountType || "amount");
      setValue("totalAmount", defaultValues.totalAmount || 0);
      setValue("subtotal", defaultValues.subtotal || 0);
      setValue("cgstTotal", defaultValues.cgstTotal || 0);
      setValue("sgstTotal", defaultValues.sgstTotal || 0);
      setValue("igstTotal", defaultValues.igstTotal || 0);
      setValue("taxableTotal", defaultValues.taxableTotal || 0);

      // Update items state
      if (Array.isArray(defaultValues.items)) {
        setItems(defaultValues.items.map(item => ({
          ...item,
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity,
          discountType: item.discountType || 'amount'
        })));
      }

      // Update terms state
      if (defaultValues.terms) {
        if (Array.isArray(defaultValues.terms)) {
          setTerms(defaultValues.terms);
        } else if (typeof defaultValues.terms === 'string') {
          const termsArray = defaultValues.terms.split('\n').filter(t => t.trim());
          setTerms(termsArray.length > 0 ? termsArray : [
            "Installation & Commissioning: Extra",
            "Payment Terms: 50% Advance Along with PO, Balance 50% and Taxes before delivery"
          ]);
        }
      }

      // Update extraCharges state
      if (Array.isArray(defaultValues.extraCharges)) {
        setExtraCharges(defaultValues.extraCharges);
      }

      // Update discounts state
      if (Array.isArray(defaultValues.discounts)) {
        setDiscounts(defaultValues.discounts);
      }

      // Update discount and discountType state
      if (defaultValues.discount) {
        setDiscount(defaultValues.discount);
      }
      if (defaultValues.discountType) {
        setDiscountType(defaultValues.discountType);
      }

      // Update bank details
      if (defaultValues.bankDetails) {
        setValue("bankDetails.bankName", defaultValues.bankDetails.bankName || "IDFC FIRST BANK LTD");
        setValue("bankDetails.branch", defaultValues.bankDetails.branch || "BHOSARI PUNE");
        setValue("bankDetails.accountNo", defaultValues.bankDetails.accountNo || "10120052061");
        setValue("bankDetails.ifsc", defaultValues.bankDetails.ifsc || "IDFB0041434");
      }
      
      console.log(`✅ Quotation form fully populated with defaultValues ID: ${defaultValues.id}`);
    }
  }, [defaultValues, mode, customers, leads, setValue]);

  // Auto-generate quotation number for new quotations
  useEffect(() => {
    if (mode === "create" && !defaultValues?.quotationNumber) {
      const generateQuotationNumber = async () => {
        try {
          const response = await fetch('/api/quotations/generate-number', {
            method: 'POST',
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            console.log('🔢 Generated new quotation number:', data.quotationNumber);
            setValue("quotationNumber", data.quotationNumber);
          }
        } catch (error) {
          console.error('Failed to generate quotation number:', error);
          // Fallback: use timestamp-based ID
          const fallbackId = `RX-Q${Date.now()}`;
          setValue("quotationNumber", fallbackId);
        }
      };
      generateQuotationNumber();
    }
  }, [mode, defaultValues, setValue]);

  // Populate form when defaultValues change (for create mode, e.g., coming from a Lead)
  useEffect(() => {
    if (!defaultValues || mode === "edit") return;
    // Set preselected customer/lead if available
    if (defaultValues.customerId) {
      const customer = customers.find(c => c.id === defaultValues.customerId);
      if (customer) setSelectedCustomer(customer);
    }
    if (defaultValues.leadId) {
      const lead = leads.find(l => l.id === defaultValues.leadId);
      if (lead) setSelectedLead(lead);
    }
    // Fill fields
    setValue("quotationNumber", defaultValues.quotationNumber || "");
    setValue("customerId", defaultValues.customerId || undefined);
    setValue("leadId", defaultValues.leadId || undefined);
    setValue("validUntil", defaultValues.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setValue("quotationDate", defaultValues.quotationDate || new Date().toISOString().split('T')[0]);
    setValue("reference", defaultValues.reference || "");
    setValue("contactPersonTitle", defaultValues.contactPersonTitle || "Mr.");
    setValue("customerCompany", defaultValues.customerCompany || "");
    setValue("contactPerson", defaultValues.contactPerson || "");
    setValue("addressLine1", defaultValues.addressLine1 || "");
    setValue("addressLine2", defaultValues.addressLine2 || "");
    setValue("city", defaultValues.city || "");
    setValue("state", defaultValues.state || "Maharashtra");
    setValue("country", defaultValues.country || "India");
    setValue("pincode", defaultValues.pincode || "");
    setValue("shippingAddressLine1", defaultValues.shippingAddressLine1 || defaultValues.addressLine1 || "");
    setValue("shippingAddressLine2", defaultValues.shippingAddressLine2 || defaultValues.addressLine2 || "");
    setValue("shippingCity", defaultValues.shippingCity || defaultValues.city || "");
    setValue("shippingState", defaultValues.shippingState || defaultValues.state || "Maharashtra");
    setValue("shippingCountry", defaultValues.shippingCountry || defaultValues.country || "India");
    setValue("shippingPincode", defaultValues.shippingPincode || defaultValues.pincode || "");
    setValue("salesCredit", defaultValues.salesCredit || "");
    setValue("sameAsBilling", true);
    const mappedItems = Array.isArray(defaultValues.items) ? defaultValues.items.map(item => ({
      ...item,
      quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity,
      discountType: item.discountType || 'amount'
    })) : [];
    setValue("items", mappedItems);
    setItems(mappedItems);
    setValue("terms", Array.isArray(defaultValues.terms) ? defaultValues.terms : (typeof defaultValues.terms === 'string' ? defaultValues.terms.split('\n').filter(t => t.trim()) : []));
    setValue("notes", defaultValues.notes || "");
    setValue("extraCharges", defaultValues.extraCharges || []);
    setValue("discounts", defaultValues.discounts || []);
    setValue("discount", defaultValues.discount || "");
    setValue("discountType", defaultValues.discountType || "amount");
    setValue("totalAmount", defaultValues.totalAmount || 0);
    setValue("subtotal", defaultValues.subtotal || 0);
    setValue("cgstTotal", defaultValues.cgstTotal || 0);
    setValue("sgstTotal", defaultValues.sgstTotal || 0);
    setValue("igstTotal", defaultValues.igstTotal || 0);
    setValue("taxableTotal", defaultValues.taxableTotal || 0);
  }, [defaultValues, mode, customers, leads, setValue]);

  // Sync items with form validation - but don't validate on initial load
  useEffect(() => {
    if (items.length > 0) {
      // Ensure all quantities are numbers before syncing with form
      const processedItems = items.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : Number(item.quantity) || 1
      }));
      setValue('items', processedItems, { shouldValidate: !isInitialLoad && hasAttemptedSubmit });
    } else {
      // Clear items when empty to trigger validation, but only if not initial load
      setValue('items', [], { shouldValidate: !isInitialLoad && hasAttemptedSubmit });
    }
  }, [items, isInitialLoad, hasAttemptedSubmit]);

  // Delay validation start to prevent immediate errors
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only start validation after a short delay
      if (Object.keys(errors).length > 0) {
        trigger(); // Re-trigger validation to clear any initial errors
      }
      // Set initial load to false after delay
      setIsInitialLoad(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [errors, trigger]);

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      description: "",
      hsnSac: "",
      quantity: 1, // This should be a number as per schema
      unit: "no.s",
      rate: "0",
      discount: "0",
      discountType: "amount",
      taxable: "0",
      cgst: "0",
      sgst: "0",
      igst: "0",
      amount: "0",
      leadTime: "",
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    
    // Sync with form and validate
    setTimeout(() => {
      setValue('items', updatedItems, { shouldValidate: true });
    }, 0);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    
    // Sync with form and validate
    setTimeout(() => {
      setValue('items', updatedItems, { shouldValidate: true });
    }, 0);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    
    // Special handling for quantity to ensure it's always a number
    if (field === 'quantity') {
      const numValue = typeof value === 'string' ? parseInt(value) || 1 : Number(value) || 1;
      updatedItems[index] = { ...updatedItems[index], [field]: numValue };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }
    
    // Calculate amounts
    const item = updatedItems[index];
    const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discount = parseFloat(item.discount) || 0;
    const discountType = item.discountType || 'amount';
    
    // Calculate taxable amount with discount
    let taxable = quantity * rate;
    if (discount > 0) {
      if (discountType === 'percentage') {
        taxable = taxable - (taxable * discount / 100);
      } else {
        taxable = taxable - discount;
      }
    }
    
    // Get customer state and country from form
    const customerState = watch("state") || "";
    const customerCountry = watch("country") || "India";
    
    // Calculate GST based on state
    const { cgst, sgst, igst } = calculateGST(taxable, customerState, customerCountry);
    const amount = taxable + cgst + sgst + igst;
    
    updatedItems[index] = {
      ...item,
      quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : Number(item.quantity) || 1, // Ensure quantity stays as number
      taxable: taxable.toString(),
      cgst: cgst.toString(),
      sgst: sgst.toString(),
      igst: igst.toString(),
      amount: amount.toString(),
    };
    
    setItems(updatedItems);
    
    // Sync with form and validate
    setTimeout(() => {
      setValue('items', updatedItems, { shouldValidate: true });
    }, 0);
  };



  const addExtraCharge = () => {
    setExtraCharges([...extraCharges, { description: "", amount: "0" }]);
  };

  const removeExtraCharge = (index: number) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== index));
  };

  const updateExtraCharge = (index: number, field: string, value: string) => {
    const updatedCharges = [...extraCharges];
    updatedCharges[index] = { ...updatedCharges[index], [field]: value };
    setExtraCharges(updatedCharges);
  };

  const addDiscount = () => {
    setDiscounts([...discounts, { description: "", amount: "0" }]);
  };

  const removeDiscount = (index: number) => {
    setDiscounts(discounts.filter((_, i) => i !== index));
  };

  const updateDiscount = (index: number, field: string, value: string) => {
    const updatedDiscounts = [...discounts];
    updatedDiscounts[index] = { ...updatedDiscounts[index], [field]: value };
    setDiscounts(updatedDiscounts);
  };

  const handleSelectItem = (item: any) => {
    setSelectedItemForEdit({
      description: item.name,
      hsnSac: item.hsnSac || "",
      quantity: 1,
      unit: "no.s",
      rate: item.rate || "0",
      discount: "0",
      taxable: "0",
      cgst: "0",
      sgst: "0",
      amount: "0",
      leadTime: "",
    });
    setShowSelectItemModal(false);
    setShowAddBillingItemModal(true);
  };

  const handleSaveBillingItem = (itemData: any) => {
    // Ensure quantity is a number
    const quantity = typeof itemData.quantity === 'string' ? parseInt(itemData.quantity) || 1 : itemData.quantity;
    
    // Calculate taxable amount
    const taxable = parseFloat(itemData.rate || "0") * quantity - parseFloat(itemData.discount || "0");
    
    // Get customer state and country from form
    const customerState = watch("state") || "";
    const customerCountry = watch("country") || "India";
    
    // Calculate GST based on customer location
    const { cgst, sgst, igst } = calculateGST(taxable, customerState, customerCountry);
    const amount = taxable + cgst + sgst + igst;

    const updatedItemData = {
      ...itemData,
      quantity: quantity, // Ensure quantity is stored as a number
      taxable: taxable.toString(),
      cgst: cgst.toString(),
      sgst: sgst.toString(),
      igst: igst.toString(),
      amount: amount.toString(),
    };

    if (editItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editItemIndex] = updatedItemData;
      setItems(updatedItems);
      setEditItemIndex(-1);
      
      // Sync with form and validate
      setTimeout(() => {
        setValue('items', updatedItems, { shouldValidate: true });
      }, 0);
    } else {
      // Add new item
      const updatedItems = [...items, updatedItemData];
      setItems(updatedItems);
      
      // Sync with form and validate
      setTimeout(() => {
        setValue('items', updatedItems, { shouldValidate: true });
      }, 0);
    }
    setShowAddBillingItemModal(false);
    setSelectedItemForEdit(null);
  };

  const handleEditItem = (index: number) => {
    const item = items[index];
    setSelectedItemForEdit({
      ...item,
      quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity, // Ensure quantity is a number
    });
    setEditItemIndex(index);
    setShowAddBillingItemModal(true);
  };

  // Recalculate GST for the modal item when customer state/country changes
  useEffect(() => {
    if (showAddBillingItemModal && selectedItemForEdit) {
      const quantity = parseFloat(selectedItemForEdit.quantity || "0") || 0;
      const rate = parseFloat(selectedItemForEdit.rate || "0") || 0;
      const discount = parseFloat(selectedItemForEdit.discount || "0") || 0;
      const taxable = quantity * rate - discount;
      
      const customerState = watch("state") || "";
      const customerCountry = watch("country") || "India";
      const { cgst, sgst, igst } = calculateGST(taxable, customerState, customerCountry);
      
      setSelectedItemForEdit({
        ...selectedItemForEdit,
        quantity: typeof selectedItemForEdit.quantity === 'string' ? parseInt(selectedItemForEdit.quantity) || 1 : selectedItemForEdit.quantity, // Ensure quantity stays as number
        cgst: cgst.toString(),
        sgst: sgst.toString(),
        igst: igst.toString(),
      });
    }
  }, [watch("state"), watch("country"), showAddBillingItemModal]);

  // Customer search functionality
  const handleCustomerSearch = (searchTerm: string) => {
    setCustomerSearchTerm(searchTerm);
    if (searchTerm.trim() === "") {
      setFilteredCustomers(customers);
      setShowCustomerDropdown(false);
    } else {
      const searchLower = (searchTerm || '').toLowerCase();
      const filtered = customers.filter(customer =>
        String(customer.company || '').toLowerCase().includes(searchLower)
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(filtered.length > 0);
    }
  };

  // Auto-fill customer details when customer is selected
  // Helper function to split address into lines
  const splitAddress = (address: string | null | undefined): { line1: string; line2: string } => {
    if (!address) return { line1: "", line2: "" };
    const lines = address.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return { line1: "", line2: "" };
    if (lines.length === 1) return { line1: lines[0], line2: "" };
    // If multiple lines, put first in line1, rest joined in line2
    return { line1: lines[0], line2: lines.slice(1).join(", ") };
  };

  const handleCustomerSelect = (customer: any) => {
    // Clear lead selection when customer is selected
    setSelectedLead(null);
    setValue("leadId", undefined);
    
    setSelectedCustomer(customer);
    setValue("customerId", customer.id);
    setCustomerSearchTerm(customer.company);
    
    // Split address intelligently
    const { line1, line2 } = splitAddress(customer.address);
    
    // Auto-fill Party Details section
    setValue("contactPersonTitle", ""); // Default empty, user can select
    setValue("customerCompany", customer.company || "");
    setValue("contactPerson", customer.name || "");
    setValue("addressLine1", line1);
    setValue("addressLine2", line2);
    setValue("city", customer.city || "");
    setValue("state", customer.state || "");
    setValue("country", customer.country || "India");
    setValue("pincode", customer.pincode || "");
    
    // Auto-fill shipping address (same as billing initially)
    setValue("shippingAddressLine1", line1);
    setValue("shippingAddressLine2", line2);
    setValue("shippingCity", customer.city || "");
    setValue("shippingState", customer.state || "");
    setValue("shippingCountry", customer.country || "India");
    setValue("shippingPincode", customer.pincode || "");
    
    // Store GST and PAN in notes section if needed (or could be added to a separate field)
    // For now, we'll include them in notes if they exist
    const taxInfo = [];
    if (customer.gstNumber) taxInfo.push(`GST: ${customer.gstNumber}`);
    if (customer.panNumber) taxInfo.push(`PAN: ${customer.panNumber}`);
    
    // Recalculate GST for all items when customer state changes
    if (customer.state) {
      items.forEach((item, index) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const discount = parseFloat(item.discount) || 0;
        const taxable = quantity * rate - discount;
        const { cgst, sgst, igst } = calculateGST(taxable, customer.state, customer.country || "India");
        const amount = taxable + cgst + sgst + igst;
        
        const updatedItems = [...items];
        updatedItems[index] = {
          ...item,
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : item.quantity, // Ensure quantity stays as number
          cgst: cgst.toString(),
          sgst: sgst.toString(),
          igst: igst.toString(),
          amount: amount.toString(),
        };
        setItems(updatedItems);
      });
    }
    
    setShowCustomerModal(false);
    setShowCustomerDropdown(false);
  };

  // Handle lead selection (similar to customer selection)
  const handleLeadSelect = (lead: any) => {
    // Clear customer selection when lead is selected
    setSelectedCustomer(null);
    setValue("customerId", undefined);
    
    setSelectedLead(lead);
    setValue("leadId", lead.id);
    
    // Split address intelligently
    const { line1, line2 } = splitAddress(lead.address);
    
    // Auto-fill Party Details section
    setValue("contactPersonTitle", "");
    setValue("customerCompany", lead.company || "");
    setValue("contactPerson", lead.name || "");
    setValue("addressLine1", line1);
    setValue("addressLine2", line2);
    setValue("city", lead.city || "");
    setValue("state", lead.state || "");
    setValue("country", lead.country || "India");
    setValue("pincode", lead.pincode || "");
    
    // Auto-fill shipping address (same as billing initially)
    setValue("shippingAddressLine1", line1);
    setValue("shippingAddressLine2", line2);
    setValue("shippingCity", lead.city || "");
    setValue("shippingState", lead.state || "");
    setValue("shippingCountry", lead.country || "India");
    setValue("shippingPincode", lead.pincode || "");
    
    // If lead has assigned products, use them as items
    if (Array.isArray(lead.assignedProducts) && lead.assignedProducts.length > 0) {
      const mappedItems = lead.assignedProducts.map((item: any) => ({
        id: Date.now() + Math.random(),
        description: item.description || "",
        hsnSac: item.hsnSac || "",
        quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1,
        unit: item.unit || "no.s",
        rate: (item.rate || 0).toString(),
        discount: (item.discount || 0).toString(),
        discountType: item.discountType || "amount",
        taxable: "0",
        cgst: "0",
        sgst: "0",
        igst: "0",
        amount: "0",
        leadTime: item.leadTime || "",
      }));
      setItems(mappedItems);
      setValue("items", mappedItems);
      
      // Recalculate GST for items
      if (lead.state) {
        const updatedItems = mappedItems.map((item: any) => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const discount = parseFloat(item.discount) || 0;
          const taxable = quantity * rate - discount;
          const { cgst, sgst, igst } = calculateGST(taxable, lead.state, lead.country || "India");
          const amount = taxable + cgst + sgst + igst;
          
          return {
            ...item,
            taxable: taxable.toString(),
            cgst: cgst.toString(),
            sgst: sgst.toString(),
            igst: igst.toString(),
            amount: amount.toString(),
          };
        });
        setItems(updatedItems);
        setValue("items", updatedItems);
      }
    } else {
      // Recalculate GST for existing items when lead state changes
      if (lead.state && items.length > 0) {
        const updatedItems = items.map((item: any) => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const discount = parseFloat(item.discount) || 0;
          const taxable = quantity * rate - discount;
          const { cgst, sgst, igst } = calculateGST(taxable, lead.state, lead.country || "India");
          const amount = taxable + cgst + sgst + igst;
          
          return {
            ...item,
            quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : (typeof item.quantity === 'number' ? item.quantity : 1),
            taxable: taxable.toString(),
            cgst: cgst.toString(),
            sgst: sgst.toString(),
            igst: igst.toString(),
            amount: amount.toString(),
          };
        });
        setItems(updatedItems);
        setValue("items", updatedItems);
      }
    }
  };

  // Auto-populate form when selectedLead changes (when lead is set from outside, e.g., from URL params)
  useEffect(() => {
    if (selectedLead && mode === "create" && !selectedCustomer) {
      // Only auto-populate if no customer is selected to avoid conflicts
      handleLeadSelect(selectedLead);
    }
  }, [selectedLead?.id, mode]); // Only trigger when lead ID changes or mode changes

  // Add new customer
  const handleAddCustomer = async (customerData: any) => {
    try {
      const response = await apiRequest("POST", "/api/customers", customerData);
      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers([...customers, newCustomer]);
        handleCustomerSelect(newCustomer);
        setShowAddCustomerModal(false);
      }
    } catch (error) {
      console.error("Failed to add customer:", error);
    }
  };



  // GST calculation based on state
  const calculateGST = (taxableAmount: number, customerState: string, customerCountry: string) => {
    const companyState = "Maharashtra"; // Your company state
    const companyCountry = "India"; // Your company country
    
    // If different country, no GST
    if (customerCountry !== companyCountry) {
      return { cgst: 0, sgst: 0, igst: 0 };
    }
    
    // If same state, apply CGST + SGST
    if (customerState === companyState) {
      const cgst = (taxableAmount * 9) / 100; // 9% CGST
      const sgst = (taxableAmount * 9) / 100; // 9% SGST
      return { cgst, sgst, igst: 0 };
    }
    
    // If different state but same country, apply IGST
    const igst = (taxableAmount * 18) / 100; // 18% IGST
    return { cgst: 0, sgst: 0, igst };
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.taxable || "0"), 0);
    const totalTax = items.reduce((sum, item) => {
      const cgst = parseFloat(item.cgst || "0");
      const sgst = parseFloat(item.sgst || "0");
      const igst = parseFloat(item.igst || "0");
      return sum + cgst + sgst + igst;
    }, 0);
    const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || "0"), 0);
    const totalDiscounts = discounts.reduce((sum, discount) => sum + parseFloat(discount.amount || "0"), 0);
    const grandTotal = subtotal + totalTax + totalExtraCharges - totalDiscounts;
    
    return { subtotal, totalTax, totalExtraCharges, totalDiscounts, grandTotal };
  };

  // Additional calculation functions for form submission
  const calculateSubtotal = (items: any[]) => {
    // Use discounted taxable per item to match PDF totals and GST base
    return items.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const base = quantity * rate;
      const discountVal = parseFloat(item.discount || '0') || 0;
      const discountType = item.discountType || 'amount';
      const discounted = discountType === 'percentage' ? base - (base * discountVal / 100) : base - discountVal;
      return sum + Math.max(discounted, 0);
    }, 0);
  };

  const calculateCGSTTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.cgst || "0"), 0);
  };

  const calculateSGSTTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.sgst || "0"), 0);
  };

  const calculateIGSTTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.igst || "0"), 0);
  };

  const calculateTaxableTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.taxable || "0"), 0);
  };

  const calculateTotalAmount = (items: any[], extraCharges: any[], discount: string, discountType: string) => {
    const subtotal = calculateSubtotal(items);
    const cgstTotal = calculateCGSTTotal(items);
    const sgstTotal = calculateSGSTTotal(items);
    const igstTotal = calculateIGSTTotal(items);
    const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || "0"), 0);
    
    let total = subtotal + cgstTotal + sgstTotal + igstTotal + extraChargesTotal;
    
    // Apply discount
    if (discount && parseFloat(discount) > 0) {
      if (discountType === 'percentage') {
        total = total - (total * parseFloat(discount) / 100);
      } else {
        total = total - parseFloat(discount);
      }
    }
    
    return total;
  };

  const { subtotal, totalTax, totalExtraCharges, totalDiscounts, grandTotal } = calculateTotals();

  const handleFormSubmit = async (data: QuotationFormData) => {
    console.log('🎯 handleFormSubmit called with data:', data);
    console.log('🎯 Current items state:', items);
    console.log('🎯 Form errors:', errors);
    console.log('🎯 Form submission started at:', new Date().toISOString());
    console.log('🎯 Data type:', typeof data);
    console.log('🎯 Data keys:', Object.keys(data || {}));
    
    try {
      console.log('=== FORM SUBMISSION STARTED ===');
      console.log('Form submission - Raw data:', data);
      console.log('Form submission - Items state:', items);
      setHasAttemptedSubmit(true);

      // First, validate that we have items
      if (!items || items.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one item to the quotation",
          variant: "destructive",
        });
        return;
      }

      // Validate that all items have required fields
      const missingFields: string[] = [];
      items.forEach((item, index) => {
        if (!item.description) missingFields.push(`Item ${index + 1}: Description`);
        if (!item.unit) missingFields.push(`Item ${index + 1}: Unit`);
        if (!item.rate || parseFloat(item.rate) <= 0) missingFields.push(`Item ${index + 1}: Valid Rate`);
      });

      if (missingFields.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Process items to ensure quantities are numbers
      const processedItems = items.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : Number(item.quantity) || 1
      }));
      console.log('Form submission - Processed items:', processedItems);
      
      // Update state with processed items
      setItems(processedItems);

      // Check for invalid items using processed items
      const hasInvalidItems = processedItems.some(item => 
        !item.description || !item.quantity || item.quantity <= 0 || !item.rate || parseFloat(item.rate) <= 0
      );

      if (hasInvalidItems) {
        toast({
          title: "Error",
          description: "Please fill in all required fields for all items",
          variant: "destructive",
        });
        return;
      }

      // Check for invalid quantities using processed items
      const hasInvalidQuantity = processedItems.some(item => 
        typeof item.quantity !== 'number' || item.quantity <= 0 || isNaN(item.quantity)
      );

      if (hasInvalidQuantity) {
        toast({
          title: "Error",
          description: "Please enter valid quantities for all items",
          variant: "destructive",
        });
        return;
      }

      // Validate items with processed data
      const validatedItems = processedItems.map(item => {
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) || 1 : Number(item.quantity) || 1;
        const rate = typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : Number(item.rate) || 0;
        const amount = quantity * rate;
        const cgst = item.cgst ? parseFloat(item.cgst.toString()) || 0 : 0;
        const sgst = item.sgst ? parseFloat(item.sgst.toString()) || 0 : 0;
        const igst = item.igst ? parseFloat(item.igst.toString()) || 0 : 0;
        const taxable = amount - (cgst + sgst + igst);

        return {
          ...item,
          quantity,
          rate: rate.toString(),
          taxable: taxable.toString(),
          cgst: cgst.toString(),
          sgst: sgst.toString(),
          igst: igst.toString(),
          amount: amount.toString(),
        };
      });

      const formData: ServerQuotationData = {
        ...data,
        // Convert customerId to integer if it exists
        customerId: data.customerId ? parseInt(data.customerId) : undefined,
        // Convert leadId to integer if it exists
        leadId: data.leadId ? parseInt(data.leadId) : undefined,
        // Add customer company name for PDF generation
        customerCompany: data.customerCompany || selectedCustomer?.company || "",
        items: validatedItems,
        // Convert terms array to string - ensure it's always a string, not undefined
        terms: terms.length > 0 ? terms.join('\n') : "",
        // Ensure extraCharges and discounts are JSON arrays
        extraCharges: extraCharges.length > 0 ? extraCharges : [],
        discounts: discounts.length > 0 ? discounts : [],
        discount: discount,
        discountType: discountType,
        // Convert decimal fields to strings (server expects decimal which requires strings)
        totalAmount: calculateTotalAmount(validatedItems, extraCharges, discount, discountType).toString(),
        subtotal: calculateSubtotal(validatedItems).toString(),
        cgstTotal: calculateCGSTTotal(validatedItems).toString(),
        sgstTotal: calculateSGSTTotal(validatedItems).toString(),
        igstTotal: calculateIGSTTotal(validatedItems).toString(),
        taxableTotal: calculateTaxableTotal(validatedItems).toString(),
      };

      // Final processing to ensure all quantities are numbers
      const finalItems = formData.items.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 1
      }));

      const finalFormData = {
        ...formData,
        items: finalItems
      };

      console.log('Form submission - Final form data:', finalFormData);

      // If user opted to save as template, persist template before main submit
      if (saveAsTemplate) {
        try {
          await fetch('/api/quotation-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: `Template - ${finalFormData.customerCompany || finalFormData.quotationNumber}`,
              ...finalFormData,
            }),
          });
          toast({ title: 'Saved as template', description: 'You can reuse this from Copy from → Saved templates.' });
        } catch (e: any) {
          toast({ title: 'Template save failed', description: e.message || 'Could not save template', variant: 'destructive' });
        }
      }

      // Create a server validation schema (different from form schema)
      const serverValidationSchema = z.object({
        quotationNumber: z.string(),
        customerId: z.number().optional(),
        leadId: z.number().optional(),
        validUntil: z.string(),
        quotationDate: z.string(),
        reference: z.string().optional(),
        contactPersonTitle: z.string().optional(),
        contactPerson: z.string(),
        customerCompany: z.string().optional(), // Add customerCompany field
        addressLine1: z.string(),
        addressLine2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
        pincode: z.string(),
        shippingAddressLine1: z.string().optional(),
        shippingAddressLine2: z.string().optional(),
        shippingCity: z.string().optional(),
        shippingState: z.string().optional(),
        shippingCountry: z.string().optional(),
        shippingPincode: z.string().optional(),
        salesCredit: z.string().optional(),
        sameAsBilling: z.boolean(),
        items: z.array(z.any()),
        terms: z.string(), // Terms as string for server
        notes: z.string().optional(),
        bankDetails: z.object({
          bankName: z.string().optional(),
          branch: z.string().optional(),
          accountNo: z.string().optional(),
          ifsc: z.string().optional(),
        }).optional(),
        extraCharges: z.array(z.any()).optional(),
        discounts: z.array(z.any()).optional(),
        discount: z.string().optional(),
        discountType: z.enum(["percentage", "amount"]).optional(),
        totalAmount: z.string(),
        subtotal: z.string(),
        cgstTotal: z.string(),
        sgstTotal: z.string(),
        igstTotal: z.string(),
        taxableTotal: z.string(),
      });

      // Validate with server schema instead of form schema
      try {
        const validatedData = serverValidationSchema.parse(finalFormData);
        console.log('Server schema validation passed:', validatedData);
        
        // Call the onSubmit function with the validated data
        onSubmit(validatedData as any); // Type assertion needed due to schema differences
        
        // If we reach here, submission was successful
        console.log('Form submission completed successfully');
        
      } catch (validationError) {
        console.error('Schema validation failed:', validationError);
        if (validationError instanceof z.ZodError) {
          console.error('Validation errors:', validationError.errors);
          // Show specific validation errors to user
          const errorMessages = validationError.errors.map(error => {
            if (error.path.includes('items')) {
              if (error.path.includes('quantity')) {
                return `Item quantity validation error: ${error.message}`;
              }
              return `Item validation error: ${error.message}`;
            }
            return error.message;
          });
          
          toast({
            title: "Validation Error",
            description: errorMessages.join(', '),
            variant: "destructive",
          });
        } else {
          toast({
            title: "Validation Error",
            description: "Form validation failed. Please check all required fields.",
            variant: "destructive",
          });
        }
        // Don't throw the error, just return to prevent form submission
        return;
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "An error occurred while submitting the form. Please check the console for details.",
        variant: "destructive",
      });
      // Don't throw the error, just return to prevent form submission
      return;
    }
  };

  // Calculate progress using watched values
  const formValues = watch();
  const progress = React.useMemo(() => {
    const required = ['quotationNumber', 'quotationDate', 'validUntil', 'contactPerson', 'addressLine1', 'city', 'state', 'country', 'pincode'];
    const filled = required.filter(f => {
      const value = formValues?.[f];
      return value && value.toString().trim() !== '';
    });
    const itemsProgress = items.length > 0 ? 10 : 0;
    return Math.round(((filled.length / required.length) * 80) + itemsProgress);
  }, [formValues, items.length]);

  useEffect(() => {
    if (mode === "edit" && formValues?.quotationNumber) {
      const timer = setTimeout(() => {
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 3000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formValues, mode]);

  return (
    <div className="bg-gray-50 animate-fade-in-up">
      {/* Progress Header */}
      <Card className="border-0 shadow-lg glass-effect mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {mode === "edit" 
                    ? (documentType === "proforma" ? "Edit Proforma Invoice" : documentType === "invoice" ? "Edit Invoice" : "Edit Quotation")
                    : (documentType === "proforma" ? "Create New Proforma Invoice" : documentType === "invoice" ? "Create New Invoice" : "Create New Quotation")
                  }
                </h3>
                <p className="text-sm text-gray-500">
                  {progress}% Complete • Fill all required fields and add items
                </p>
              </div>
            </div>
            {autoSaved && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                <Save className="h-3 w-3" />
                Auto-saved
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <form 
        onSubmit={(e) => {
            // Calculate and set the calculated fields BEFORE calling handleSubmit
            const calculatedSubtotal = calculateSubtotal(items);
            const calculatedCGSTTotal = calculateCGSTTotal(items);
            const calculatedSGSTTotal = calculateSGSTTotal(items);
            const calculatedIGSTTotal = calculateIGSTTotal(items);
            const calculatedTaxableTotal = calculateTaxableTotal(items);
            const calculatedTotalAmount = calculateTotalAmount(items, extraCharges, discount, discountType);

            // Set these calculated values in the form state BEFORE validation
            setValue('subtotal', calculatedSubtotal);
            setValue('cgstTotal', calculatedCGSTTotal);
            setValue('sgstTotal', calculatedSGSTTotal);
            setValue('igstTotal', calculatedIGSTTotal);
            setValue('taxableTotal', calculatedTaxableTotal);
            setValue('totalAmount', calculatedTotalAmount);

            const result = handleSubmit(handleFormSubmit)(e);
        }} 
        className="space-y-6"
      >

        <div className="p-6 max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left: main content spans 9 cols on xl (increased from 8 to utilize space) */}
            <div className="xl:col-span-9 space-y-6">
            {/* Main Content */}
            
            {/* Required Fields Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <span className="text-red-500 font-medium">*</span> indicates required fields
              </p>
            </div>
            {/* Simple Error Display */}
            {Object.keys(errors).length > 0 && hasAttemptedSubmit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800 font-medium">Please fix the following errors:</p>
                <ul className="text-sm text-red-700 space-y-1 mt-2">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>• {error?.message || `${field} is required`}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <div className="relative customer-search-container">
                    <div className="flex gap-2">
                      <Input
                        id="customer"
                        placeholder="Search customer..."
                        className="flex-1"
                        value={customerSearchTerm}
                        onChange={(e) => handleCustomerSearch(e.target.value)}
                        onFocus={() => {
                          if (customerSearchTerm.trim() === "") {
                            setFilteredCustomers(customers);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        className="px-3"
                        onClick={() => setShowCustomerModal(true)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        className="px-3"
                        onClick={() => setShowAddCustomerModal(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Customer Suggestions Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                                                 {filteredCustomers.map((customer) => (
                           <div
                             key={customer.id}
                             className="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0"
                             onClick={() => handleCustomerSelect(customer)}
                           >
                             <div className="font-medium">{customer.company}</div>
                             <div className="text-sm text-gray-600">Contact: {customer.name}</div>
                             <div className="text-xs text-gray-500">{customer.city}, {customer.state}</div>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Select a customer to auto-fill party details, or add a new customer
                  </div>
                  
                  {!selectedCustomer && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border mt-2">
                      ⚠️ No customer selected. You'll need to manually fill in the party details below.
                    </div>
                  )}
                  
                  {/* Quick fill guidance */}
                  {!selectedCustomer && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mt-2">
                      💡 <strong>Quick Fill:</strong> You can manually enter party details or search for an existing customer above. Required fields: Contact Person, Address, City, State, Pincode.
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="copyFrom">Copy from</Label>
                  <Select onValueChange={(v) => { setCopySource(v); handleCopyFrom(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="last_customer">Last quotations for this customer</SelectItem>
                      <SelectItem value="templates">Saved templates</SelectItem>
                    </SelectContent>
                  </Select>
                  {copySource === 'templates' && (
                    <div className="mt-2 border rounded p-2 max-h-40 overflow-auto">
                      {isCopyLoading ? (
                        <div className="text-sm text-gray-500">Loading templates...</div>
                      ) : templateList.length === 0 ? (
                        <div className="text-sm text-gray-500">No templates found</div>
                      ) : (
                        templateList.map((t) => (
                          <div key={t.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => applyCopyValues(t)}>
                            <div className="text-sm font-medium">{t.name || t.quotationNumber || `Template ${t.id}`}</div>
                            <div className="text-xs text-gray-500">{new Date(t.createdAt || Date.now()).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {copySource === 'last_customer' && (
                    <div className="mt-2 border rounded p-2 max-h-40 overflow-auto">
                      {isCopyLoading ? (
                        <div className="text-sm text-gray-500">Loading quotations...</div>
                      ) : customerQuoteList.length === 0 ? (
                        <div className="text-sm text-gray-500">No previous quotations found</div>
                      ) : (
                        customerQuoteList.map((q) => (
                          <div key={q.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => applyCopyValues(q)}>
                            <div className="text-sm font-medium">{q.quotationNumber}</div>
                            <div className="text-xs text-gray-500">{new Date(q.createdAt).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value="BizSuite - Maharashtra (27ABGFR0875B1ZA)"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status moved to sidebar */}

            {/* Party Details - full width below grid on xl */}
            <Card className="xl:col-span-12">
              <CardHeader>
                <CardTitle>Party Details <span className="text-red-500">*</span></CardTitle>
                <p className="text-sm text-gray-600">Fill in the contact and address information</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="contactPersonTitle">Title</Label>
                    <Select value={watch("contactPersonTitle") || ""} onValueChange={(value) => setValue("contactPersonTitle", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Title" />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={watch("customerId") ? "md:col-span-3" : "md:col-span-2"}>
                    <Label htmlFor="contactPerson">Contact Person <span className="text-red-500">*</span></Label>
                    <Input
                      id="contactPerson"
                      {...register("contactPerson")}
                      placeholder="Enter contact person's full name"
                      className={errors.contactPerson ? "border-red-500" : ""}
                    />
                    {errors.contactPerson && hasAttemptedSubmit && (
                      <div className="text-xs text-red-500 mt-1">{errors.contactPerson.message}</div>
                    )}
                  </div>
                  {!watch("customerId") && (
                    <div className="md:col-span-1">
                      <Label htmlFor="customerCompany">Company Name</Label>
                      <Input
                        id="customerCompany"
                        {...register("customerCompany")}
                        placeholder="Company name"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salesCredit">Sales Credit</Label>
                    <Input
                      id="salesCredit"
                      {...register("salesCredit")}
                      placeholder="Enter sales credit information"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsBilling"
                    checked={watch("sameAsBilling")}
                    onCheckedChange={(checked) => {
                      setValue("sameAsBilling", checked as boolean);
                      // If checked, copy billing address to shipping address
                      if (checked) {
                        setValue("shippingAddressLine1", watch("addressLine1") || "");
                        setValue("shippingAddressLine2", watch("addressLine2") || "");
                        setValue("shippingCity", watch("city") || "");
                        setValue("shippingState", watch("state") || "");
                        setValue("shippingCountry", watch("country") || "India");
                        setValue("shippingPincode", watch("pincode") || "");
                      }
                    }}
                  />
                  <Label htmlFor="sameAsBilling">Shipping address same as billing address</Label>
                </div>

                {/* Address Section */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Billing Address</h4>
                    
                    <div>
                      <Label htmlFor="addressLine1">Address Line 1 <span className="text-red-500">*</span></Label>
                      <Input
                        id="addressLine1"
                        {...register("addressLine1", {
                          onChange: (e) => {
                            // If same as billing is checked, copy to shipping
                            if (watch("sameAsBilling")) {
                              setValue("shippingAddressLine1", e.target.value);
                            }
                          }
                        })}
                        placeholder="Enter complete street address, P.O. box, or company name"
                        className={errors.addressLine1 ? "border-red-500" : ""}
                      />
                      {errors.addressLine1 && hasAttemptedSubmit && (
                        <div className="text-xs text-red-500 mt-1">{errors.addressLine1.message}</div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        {...register("addressLine2", {
                          onChange: (e) => {
                            // If same as billing is checked, copy to shipping
                            if (watch("sameAsBilling")) {
                              setValue("shippingAddressLine2", e.target.value);
                            }
                          }
                        })}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                        <Input
                          id="city"
                          {...register("city", {
                            onChange: (e) => {
                              // If same as billing is checked, copy to shipping
                              if (watch("sameAsBilling")) {
                                setValue("shippingCity", e.target.value);
                              }
                            }
                          })}
                          placeholder="Enter city name"
                          className={errors.city ? "border-red-500" : ""}
                        />
                        {errors.city && hasAttemptedSubmit && (
                          <div className="text-xs text-red-500 mt-1">{errors.city.message}</div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="pincode">Pincode <span className="text-red-500">*</span></Label>
                        <Input
                          id="pincode"
                          {...register("pincode", {
                            onChange: (e) => {
                              // If same as billing is checked, copy to shipping
                              if (watch("sameAsBilling")) {
                                setValue("shippingPincode", e.target.value);
                              }
                            }
                          })}
                          placeholder="Enter 6-digit pincode"
                          className={errors.pincode ? "border-red-500" : ""}
                        />
                        {errors.pincode && hasAttemptedSubmit && (
                          <div className="text-xs text-red-500 mt-1">{errors.pincode.message}</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                        <Select value={watch("state") || ""} onValueChange={(value) => {
                          setValue("state", value);
                          // If same as billing is checked, copy to shipping
                          if (watch("sameAsBilling")) {
                            setValue("shippingState", value);
                          }
                          // Recalculate GST for all items when state changes
                          items.forEach((item, index) => {
                            const quantity = parseFloat(item.quantity) || 0;
                            const rate = parseFloat(item.rate) || 0;
                            const discount = parseFloat(item.discount) || 0;
                            const taxable = quantity * rate - discount;
                            const { cgst, sgst, igst } = calculateGST(taxable, value, watch("country") || "India");
                            const amount = taxable + cgst + sgst + igst;
                            
                            const updatedItems = [...items];
                            updatedItems[index] = {
                              ...item,
                              cgst: cgst.toString(),
                              sgst: sgst.toString(),
                              igst: igst.toString(),
                              amount: amount.toString(),
                            };
                            setItems(updatedItems);
                          });
                        }}>
                          <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select State" />
                          </SelectTrigger>
                          <SelectContent>
                            {indianStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.state && hasAttemptedSubmit && (
                          <div className="text-xs text-red-500 mt-1">{errors.state.message}</div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                        <Select value={watch("country") || ""} onValueChange={(value) => {
                          setValue("country", value);
                          // If same as billing is checked, copy to shipping
                          if (watch("sameAsBilling")) {
                            setValue("shippingCountry", value);
                          }
                          // Recalculate GST for all items when country changes
                          items.forEach((item, index) => {
                            const quantity = parseFloat(item.quantity) || 0;
                            const rate = parseFloat(item.rate) || 0;
                            const discount = parseFloat(item.discount) || 0;
                            const taxable = quantity * rate - discount;
                            const { cgst, sgst, igst } = calculateGST(taxable, watch("state") || "", value);
                            const amount = taxable + cgst + sgst + igst;
                            
                            const updatedItems = [...items];
                            updatedItems[index] = {
                              ...item,
                              cgst: cgst.toString(),
                              sgst: sgst.toString(),
                              igst: igst.toString(),
                              amount: amount.toString(),
                            };
                            setItems(updatedItems);
                          });
                        }}>
                          <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select Country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.name}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.country && hasAttemptedSubmit && (
                          <div className="text-xs text-red-500 mt-1">{errors.country.message}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Shipping Address</h4>
                      
                      <div>
                        <Label htmlFor="shippingAddressLine1">Address Line 1</Label>
                        <Input
                          id="shippingAddressLine1"
                          {...register("shippingAddressLine1")}
                          placeholder="Enter shipping street address, P.O. box, or company name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="shippingAddressLine2">Address Line 2</Label>
                        <Input
                          id="shippingAddressLine2"
                          {...register("shippingAddressLine2")}
                          placeholder="Apartment, suite, unit, building, floor, etc."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shippingCity">City</Label>
                          <Input
                            id="shippingCity"
                            {...register("shippingCity")}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shippingPincode">Pincode</Label>
                          <Input
                            id="shippingPincode"
                            {...register("shippingPincode")}
                            placeholder="Pincode"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shippingState">State</Label>
                          <Select value={watch("shippingState") || ""} onValueChange={(value) => setValue("shippingState", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {indianStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="shippingCountry">Country</Label>
                          <Select value={watch("shippingCountry") || ""} onValueChange={(value) => setValue("shippingCountry", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.name}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Item List - full width below grid on xl */}
            <Card className="xl:col-span-12">
              <CardHeader>
                <CardTitle>Item List <span className="text-red-500">*</span></CardTitle>
                <p className="text-sm text-gray-600">At least one item is required</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">No.</th>
                        <th className="text-left p-2">Image</th>
                        <th className="text-left p-2">Item & Description</th>
                        <th className="text-left p-2">HSN/SAC</th>
                        <th className="text-left p-2">Qty</th>
                        <th className="text-left p-2">Unit</th>
                        <th className="text-left p-2">Rate (₹)</th>
                        <th className="text-left p-2">Discount</th>
                        <th className="text-left p-2">Taxable (₹)</th>
                        <th className="text-left p-2">CGST (₹)</th>
                        <th className="text-left p-2">SGST (₹)</th>
                        <th className="text-left p-2">IGST (₹)</th>
                        <th className="text-left p-2">Amt (₹)</th>
                        <th className="text-left p-2">Lead Time</th>
                        <th className="text-left p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">
                            <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                              placeholder="Item description"
                              className={`w-48 ${!item.description ? 'border-red-300 focus:border-red-500' : ''}`}
                            />
                            {!item.description && hasAttemptedSubmit && (
                              <div className="text-xs text-red-500 mt-1">Description required</div>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.hsnSac}
                              onChange={(e) => updateItem(index, "hsnSac", e.target.value)}
                              placeholder="HSN/SAC"
                              className="w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                              className="w-16"
                              min="1"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(index, "unit", e.target.value)}
                              className={`w-16 ${!item.unit ? 'border-red-300 focus:border-red-500' : ''}`}
                            />
                            {!item.unit && hasAttemptedSubmit && (
                              <div className="text-xs text-red-500 mt-1">Unit required</div>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(index, "rate", e.target.value)}
                              className={`w-20 ${!item.rate || parseFloat(item.rate) <= 0 ? 'border-red-300 focus:border-red-500' : ''}`}
                              step="0.01"
                            />
                            {(!item.rate || parseFloat(item.rate) <= 0) && hasAttemptedSubmit && (
                              <div className="text-xs text-red-500 mt-1">Valid rate required</div>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                value={item.discount}
                                onChange={(e) => updateItem(index, "discount", e.target.value)}
                                className="w-16"
                                step="0.01"
                                placeholder="0"
                              />
                              <Select
                                value={item.discountType || "amount"}
                                onValueChange={(value) => updateItem(index, "discountType", value)}
                              >
                                <SelectTrigger className="w-16 h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="amount">₹</SelectItem>
                                  <SelectItem value="percentage">%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="p-2">
                            <Input
                              defaultValue={item.taxable}
                              readOnly
                              className="w-20 bg-gray-50"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.cgst}
                              onChange={(e) => updateItem(index, "cgst", e.target.value)}
                              className="w-16"
                              step="0.01"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.sgst}
                              onChange={(e) => updateItem(index, "sgst", e.target.value)}
                              className="w-16"
                              step="0.01"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.igst}
                              onChange={(e) => updateItem(index, "igst", e.target.value)}
                              className="w-16"
                              step="0.01"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              defaultValue={item.amount}
                              readOnly
                              className="w-20 bg-gray-50"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.leadTime}
                              onChange={(e) => updateItem(index, "leadTime", e.target.value)}
                              placeholder="Lead time"
                              className="w-24"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(index)}
                                className="text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {items.length === 0 && (
                  <div className="text-sm text-red-500 mb-4 p-2 bg-red-50 border border-red-200 rounded">
                    At least one item is required. Please add items to continue.
                  </div>
                )}
                
                {errors.items && (
                  <div className="text-sm text-red-500 mb-4 p-2 bg-red-50 border border-red-200 rounded">
                    {errors.items.message || "Please add at least one item with valid details"}
                  </div>
                )}
                
                <Button
                  type="button"
                  onClick={() => setShowSelectItemModal(true)}
                  className="mt-4 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <TermsSelector
                  selectedTerms={terms}
                  onTermsChange={setTerms}
                  placeholder="Select terms and conditions"
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register("notes")}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </CardContent>
            </Card>



            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                
                {/* GST Summary */}
                {(() => {
                  const customerState = watch("state") || "";
                  const customerCountry = watch("country") || "India";
                  const companyState = "Maharashtra";
                  
                  if (customerCountry !== "India") {
                    return (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>GST:</strong> Not applicable (International customer)
                      </div>
                    );
                  } else if (customerState === companyState) {
                    return (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>GST:</strong> CGST (9%) + SGST (9%) = 18% (Same state)
                      </div>
                    );
                  } else if (customerState) {
                    return (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>GST:</strong> IGST (18%) (Inter-state)
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>GST:</strong> Please select state to calculate GST
                      </div>
                    );
                  }
                })()}
                
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span>₹{totalTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-bold text-lg">₹{grandTotal.toLocaleString()}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={addExtraCharge}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Extra Charge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={addDiscount}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Discount
                  </Button>
                </div>

                {/* Extra Charges */}
                {extraCharges.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Extra Charges:</h4>
                    {extraCharges.map((charge, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Description"
                          value={charge.description}
                          onChange={(e) => updateExtraCharge(index, "description", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Amount"
                          value={charge.amount}
                          onChange={(e) => updateExtraCharge(index, "amount", e.target.value)}
                          className="w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtraCharge(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Discounts */}
                {discounts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Discounts:</h4>
                    {discounts.map((discount, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Description"
                          value={discount.description}
                          onChange={(e) => updateDiscount(index, "description", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Amount"
                          value={discount.amount}
                          onChange={(e) => updateDiscount(index, "amount", e.target.value)}
                          className="w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDiscount(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            </div>

            {/* Sidebar: right column */}
            <div className="xl:col-span-3 space-y-6 xl:sticky xl:top-4 self-start">
              {/* Document Details moved to sidebar */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="quotationNumber">
                      {documentType === "proforma" ? "Proforma No." : documentType === "invoice" ? "Invoice No." : "Quotation No."} 
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quotationNumber"
                      {...register("quotationNumber")}
                      placeholder="Auto-generated"
                      className={errors.quotationNumber ? "border-red-500" : ""}
                    />
                    {errors.quotationNumber && hasAttemptedSubmit && (
                      <div className="text-xs text-red-500 mt-1">{errors.quotationNumber.message}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">Prev.: RX-VQ25-25-07-143</div>
                  </div>

                  <div>
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      {...register("reference")}
                      placeholder="Reference (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="quotationDate">Quotation Date <span className="text-red-500">*</span></Label>
                      <Input
                        id="quotationDate"
                        type="date"
                        {...register("quotationDate")}
                        className={errors.quotationDate ? "border-red-500" : ""}
                      />
                      {errors.quotationDate && hasAttemptedSubmit && (
                        <div className="text-xs text-red-500 mt-1">{errors.quotationDate.message}</div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="validUntil">Valid till <span className="text-red-500">*</span></Label>
                      <Input
                        id="validUntil"
                        type="date"
                        {...register("validUntil")}
                        className={errors.validUntil ? "border-red-500" : ""}
                      />
                      {errors.validUntil && hasAttemptedSubmit && (
                        <div className="text-xs text-red-500 mt-1">{errors.validUntil.message}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quotation Status moved to sidebar */}
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Quotation Status</Label>
                      <Select defaultValue={String((defaultValues as any)?.status || 'draft')} onValueChange={(v) => setValue('status' as any, v as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>₹{totalTax.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Extra Charges</span><span>₹{totalExtraCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Discounts</span><span>-₹{totalDiscounts.toLocaleString()}</span></div>
                  <div className="h-px bg-gray-200 my-2" />
                  <div className="flex justify-between text-base"><span className="font-medium">Grand Total</span><span className="font-bold">₹{grandTotal.toLocaleString()}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="saveTemplate" checked={saveAsTemplate} onCheckedChange={(v: any) => setSaveAsTemplate(Boolean(v))} />
                    <Label htmlFor="saveTemplate">Save as Template</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="shareEmail" />
                    <Label htmlFor="shareEmail">Share by Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="shareWhatsapp" />
                    <Label htmlFor="shareWhatsapp">Share by Whatsapp</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="printAfterSave" />
                    <Label htmlFor="printAfterSave">Print Document after Saving</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="alertOnOpening" />
                    <Label htmlFor="alertOnOpening">Alert me on Opening</Label>
                  </div>
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting 
                        ? 'Saving...' 
                        : submitLabel || (mode === 'edit' 
                          ? (documentType === "proforma" ? 'Update Proforma' : 'Update Quotation')
                          : (documentType === "proforma" ? 'Create Proforma' : 'Save Quotation')
                        )
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bank Details - stays in main content, not sidebar */}
            <Card className="xl:col-span-9">
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Bank Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={watch("bankDetails.bankName")}
                      onChange={(e) => setValue("bankDetails.bankName", e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><strong>Branch:</strong> {watch("bankDetails.branch")}</div>
                  <div><strong>Account No.:</strong> {watch("bankDetails.accountNo")}</div>
                  <div><strong>IFSC:</strong> {watch("bankDetails.ifsc")}</div>
                </div>
              </CardContent>
            </Card>

            {/* Removed duplicate bottom submit button; primary submit is in the sidebar Next Actions card */}
          </div>
        </div>
      </form>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold">Select Customer</h3>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setShowCustomerModal(false)}
               >
                 ✕
               </Button>
             </div>
             
             <div className="space-y-2">
               {(customerSearchTerm ? filteredCustomers : customers).map((customer) => (
                 <div
                   key={customer.id}
                   className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                   onClick={() => handleCustomerSelect(customer)}
                 >
                   <div className="font-medium">{customer.company}</div>
                   <div className="text-sm text-gray-600">Contact: {customer.name}</div>
                   <div className="text-xs text-gray-500">{customer.city}, {customer.state}</div>
                 </div>
               ))}
             </div>
           </div>
         </div>
       )}

       {/* Add Customer Modal */}
       {showAddCustomerModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 w-96">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold">Add New Customer</h3>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setShowAddCustomerModal(false)}
               >
                 ✕
               </Button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <Label>Name</Label>
                 <Input
                   id="newCustomerName"
                   placeholder="Customer name"
                 />
               </div>
               <div>
                 <Label>Company</Label>
                 <Input
                   id="newCustomerCompany"
                   placeholder="Company name"
                 />
               </div>
               <div>
                 <Label>Email</Label>
                 <Input
                   id="newCustomerEmail"
                   type="email"
                   placeholder="Email address"
                 />
               </div>
               <div>
                 <Label>Phone</Label>
                 <Input
                   id="newCustomerPhone"
                   placeholder="Phone number"
                 />
               </div>
               
               <div className="flex gap-2">
                 <Button 
                   variant="outline" 
                   onClick={() => setShowAddCustomerModal(false)}
                   className="flex-1"
                 >
                   Cancel
                 </Button>
                 <Button 
                   onClick={() => {
                     const name = (document.getElementById('newCustomerName') as HTMLInputElement)?.value;
                     const company = (document.getElementById('newCustomerCompany') as HTMLInputElement)?.value;
                     const email = (document.getElementById('newCustomerEmail') as HTMLInputElement)?.value;
                     const phone = (document.getElementById('newCustomerPhone') as HTMLInputElement)?.value;
                     
                     if (name && company) {
                       handleAddCustomer({ name, company, email, phone });
                     }
                   }}
                   className="flex-1 bg-green-600 hover:bg-green-700"
                 >
                   Add Customer
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}



      {/* Select Item Modal */}
      {showSelectItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Item</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Change Layout
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSelectItemModal(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
                         <div className="mb-4">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input
                   placeholder="Search"
                   className="pl-10"
                   onChange={(e) => {
                     const searchTerm = (e.target.value || '').toLowerCase();
                     const filtered = inventory.filter(item =>
                       String(item.name || '').toLowerCase().includes(searchTerm) ||
                       String(item.description || '').toLowerCase().includes(searchTerm)
                     );
                     setFilteredInventory(filtered);
                   }}
                 />
               </div>
             </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredInventory.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSelectItem(item)}
                >
                  <Checkbox className="mr-3" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            
                         <div className="mt-6 flex gap-2">
               <Button
                 variant="outline"
                 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                 onClick={() => {
                   setShowSelectItemModal(false);
                   setSelectedItemForEdit({
                     description: "",
                     hsnSac: "",
                     quantity: 1,
                     unit: "no.s",
                     rate: "0",
                     discount: "0",
                     taxable: "0",
                     cgst: "0",
                     sgst: "0",
                     amount: "0",
                     leadTime: "",
                   });
                   setShowAddBillingItemModal(true);
                 }}
               >
                 <Plus className="h-4 w-4 mr-2" />
                 + Add Stock Item
               </Button>
               <Button
                 variant="outline"
                 className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
                 onClick={() => {
                   setShowSelectItemModal(false);
                   setSelectedItemForEdit({
                     description: "",
                     hsnSac: "",
                     quantity: 1,
                     unit: "no.s",
                     rate: "0",
                     discount: "0",
                     taxable: "0",
                     cgst: "0",
                     sgst: "0",
                     amount: "0",
                     leadTime: "",
                   });
                   setShowAddBillingItemModal(true);
                 }}
               >
                 <Plus className="h-4 w-4 mr-2" />
                 + Add Service / Non-Stock Item
               </Button>
             </div>
          </div>
        </div>
      )}

      {/* Add Billing Item Modal */}
      {showAddBillingItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[1000px] max-h-[700px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Billing Item</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleSaveBillingItem(selectedItemForEdit)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddBillingItemModal(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Item Section */}
              <div>
                <Label>Item</Label>
                <div className="flex gap-2">
                  <Input
                    value={selectedItemForEdit?.description || ""}
                    onChange={(e) => setSelectedItemForEdit({
                      ...selectedItemForEdit,
                      description: e.target.value
                    })}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-600">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Code: {selectedItemForEdit?.description || ""}
                </div>
              </div>

              {/* Description Section */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={selectedItemForEdit?.description || ""}
                  onChange={(e) => setSelectedItemForEdit({
                    ...selectedItemForEdit,
                    description: e.target.value
                  })}
                  rows={3}
                  placeholder="Make: Meatest&#10;Model: M133c"
                />
              </div>

              {/* Quantity, Unit, Rate Section */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    value={selectedItemForEdit?.quantity || 1}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value) || 1;
                      const rate = parseFloat(selectedItemForEdit?.rate || "0") || 0;
                      const discount = parseFloat(selectedItemForEdit?.discount || "0") || 0;
                      const taxable = newQuantity * rate - discount;
                      
                      const customerState = watch("state") || "";
                      const customerCountry = watch("country") || "India";
                      const { cgst, sgst, igst } = calculateGST(taxable, customerState, customerCountry);
                      
                      setSelectedItemForEdit({
                        ...selectedItemForEdit,
                        quantity: newQuantity,
                        cgst: cgst.toString(),
                        sgst: sgst.toString(),
                        igst: igst.toString(),
                      });
                    }}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={selectedItemForEdit?.unit || "no.s"}
                    onChange={(e) => setSelectedItemForEdit({
                      ...selectedItemForEdit,
                      unit: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Rate</Label>
                  <div className="flex items-center">
                    <span className="text-sm mr-1">@ ₹</span>
                    <Input
                      type="number"
                      value={selectedItemForEdit?.rate || "0"}
                      onChange={(e) => {
                        const newRate = e.target.value;
                        const quantity = parseFloat(selectedItemForEdit?.quantity || "0") || 0;
                        const discount = parseFloat(selectedItemForEdit?.discount || "0") || 0;
                        const taxable = quantity * parseFloat(newRate || "0") - discount;
                        
                        const customerState = watch("state") || "";
                        const customerCountry = watch("country") || "India";
                        const { cgst, sgst, igst } = calculateGST(taxable, customerState, customerCountry);
                        
                        setSelectedItemForEdit({
                          ...selectedItemForEdit,
                          rate: newRate,
                          cgst: cgst.toString(),
                          sgst: sgst.toString(),
                          igst: igst.toString(),
                        });
                      }}
                      step="0.01"
                    />
                    <span className="text-sm ml-1">/ {selectedItemForEdit?.unit || "no.s"}</span>
                  </div>
                </div>
              </div>

              {/* Discount and Lead Time Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={selectedItemForEdit?.discount || "0"}
                      onChange={(e) => {
                        const newDiscount = e.target.value;
                        const quantity = parseFloat(selectedItemForEdit?.quantity || "0") || 0;
                        const rate = parseFloat(selectedItemForEdit?.rate || "0") || 0;
                        const taxable = quantity * rate - parseFloat(newDiscount || "0");
                        
                        const customerState = watch("state") || "";
                        const customerCountry = watch("country") || "India";
                        const { cgst, sgst, igst } = calculateGST(taxable, customerState, customerCountry);
                        
                        setSelectedItemForEdit({
                          ...selectedItemForEdit,
                          discount: newDiscount,
                          cgst: cgst.toString(),
                          sgst: sgst.toString(),
                          igst: igst.toString(),
                        });
                      }}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      defaultValue="0"
                      className="w-20"
                    />
                    <span className="text-sm self-center">%</span>
                  </div>
                </div>
                <div>
                  <Label>Lead Time</Label>
                  <Input
                    value={selectedItemForEdit?.leadTime || ""}
                    onChange={(e) => setSelectedItemForEdit({
                      ...selectedItemForEdit,
                      leadTime: e.target.value
                    })}
                  />
                </div>
              </div>

              {/* HSN/SAC Section */}
              <div>
                <Label>HSN/SAC</Label>
                <Input
                  value={selectedItemForEdit?.hsnSac || ""}
                  onChange={(e) => setSelectedItemForEdit({
                    ...selectedItemForEdit,
                    hsnSac: e.target.value
                  })}
                />
              </div>

              {/* GST Section */}
              <div>
                <Label>GST Details</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">CGST (%)</Label>
                    <Input
                      type="number"
                      defaultValue={selectedItemForEdit?.cgst || "0"}
                      step="0.01"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">SGST (%)</Label>
                    <Input
                      type="number"
                      defaultValue={selectedItemForEdit?.sgst || "0"}
                      step="0.01"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">IGST (%)</Label>
                    <Input
                      type="number"
                      defaultValue={selectedItemForEdit?.igst || "0"}
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Totals */}
              <div className="bg-orange-100 p-4 rounded">
                {(() => {
                  const quantity = parseFloat(selectedItemForEdit?.quantity || "0") || 0;
                  const rate = parseFloat(selectedItemForEdit?.rate || "0") || 0;
                  const discount = parseFloat(selectedItemForEdit?.discount || "0") || 0;
                  const taxable = quantity * rate - discount;
                  
                  // Get customer state and country from form
                  const customerState = watch("state") || "";
                  const customerCountry = watch("country") || "India";
                  const companyState = "Maharashtra";
                  
                  // Calculate GST based on customer location
                  let cgstAmount = 0;
                  let sgstAmount = 0;
                  let igstAmount = 0;
                  let gstLabel = "";
                  
                  if (customerCountry !== "India") {
                    gstLabel = "GST: Not applicable (International customer)";
                  } else if (customerState === companyState) {
                    cgstAmount = taxable * 0.09;
                    sgstAmount = taxable * 0.09;
                    gstLabel = "GST: CGST (9%) + SGST (9%) = 18% (Same state)";
                  } else if (customerState) {
                    igstAmount = taxable * 0.18;
                    gstLabel = "GST: IGST (18%) (Inter-state)";
                  } else {
                    gstLabel = "GST: Please select state to calculate GST";
                  }
                  
                  const totalAmount = taxable + cgstAmount + sgstAmount + igstAmount;
                  
                  return (
                    <>
                      <div className="text-orange-800 font-medium mb-2">
                        Taxable: ₹ {taxable.toFixed(2)}
                      </div>
                      {customerCountry === "India" && customerState === companyState && (
                        <>
                          <div className="text-orange-800 font-medium">
                            CGST (9%): ₹ {cgstAmount.toFixed(2)}
                          </div>
                          <div className="text-orange-800 font-medium">
                            SGST (9%): ₹ {sgstAmount.toFixed(2)}
                          </div>
                        </>
                      )}
                      {customerCountry === "India" && customerState && customerState !== companyState && (
                        <div className="text-orange-800 font-medium">
                          IGST (18%): ₹ {igstAmount.toFixed(2)}
                        </div>
                      )}
                      <div className="text-orange-800 font-medium mt-2 border-t pt-2">
                        Total Amount: ₹ {totalAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-orange-700 mt-1">
                        {gstLabel}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleSaveBillingItem(selectedItemForEdit)}
              >
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleSaveBillingItem(selectedItemForEdit)}
              >
                <Check className="h-4 w-4 mr-2" />
                Save & Add Another
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 