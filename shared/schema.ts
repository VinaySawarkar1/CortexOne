import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, date, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Company/Tenant schema
export const companies = pgTable("companies", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  status: text("status").notNull().default("pending"), // pending, active, suspended
  maxUsers: integer("max_users").notNull().default(20),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User schema
export const users = pgTable("users", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull().default("user"), // superuser, admin, user
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  department: text("department"),
  isActive: boolean("is_active").notNull().default(false),
  parentUserId: bigint("parent_user_id", { mode: "number" }).references(() => users.id),
  permissions: json("permissions"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  companyId: true,
  department: true,
  parentUserId: true,
  permissions: true,
  isActive: true,
});

// Customer schema
export const customers = pgTable("customers", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("0"),
  paymentTerms: text("payment_terms").default("30 days"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

// Supplier schema
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("0"),
  paymentTerms: text("payment_terms").default("30 days"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

// Lead schema (enhanced)
export const leads = pgTable("leads", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  position: text("position"),
  status: text("status").notNull().default("new"),
  category: text("category").notNull().default("industry"),
  source: text("source").default("website"),
  assignedTo: text("assigned_to"),
  priority: text("priority").default("medium"),
  rating: integer("rating").default(0), // 1-5 star score
  tags: text("tags"), // comma-separated tags
  expectedValue: decimal("expected_value", { precision: 10, scale: 2 }),
  // Opportunity fields
  probability: integer("probability"), // 0-100 probability percentage
  opportunityStage: text("opportunity_stage"), // prospecting, qualified, proposal, negotiation, won, lost
  stageId: integer("stage_id"), // FK to crm_stages for Kanban pipeline
  isOpportunity: boolean("is_opportunity").default(false), // promoted from lead to opportunity
  lostReasonId: integer("lost_reason_id"), // FK to crm_lost_reasons when lost
  closedAt: timestamp("closed_at"), // when won or lost
  nextFollowUp: timestamp("next_follow_up"),
  notes: text("notes"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Lead Discussion schema
export const leadDiscussions = pgTable("lead_discussions", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  discussion: text("discussion").notNull(),
  discussionType: text("discussion_type").notNull().default("general"), // general, call, email, meeting, follow_up
  outcome: text("outcome"), // positive, negative, neutral, pending
  nextAction: text("next_action"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertLeadDiscussionSchema = createInsertSchema(leadDiscussions).omit({
  id: true,
  createdAt: true,
});

// Lead Category schema
export const leadCategories = pgTable("lead_categories", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  key: text("key").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadCategorySchema = createInsertSchema(leadCategories).omit({
  id: true,
  createdAt: true,
});

// Lead Source schema
export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  key: text("key").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSourceSchema = createInsertSchema(leadSources).omit({
  id: true,
  createdAt: true,
});

// CRM Pipeline Stage schema (Kanban columns for opportunities)
export const crmStages = pgTable("crm_stages", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  sequence: integer("sequence").notNull().default(0), // order of the column
  probability: integer("probability").default(0), // default win probability for this stage
  isWon: boolean("is_won").notNull().default(false), // stage represents a won deal
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrmStageSchema = createInsertSchema(crmStages).omit({
  id: true,
  createdAt: true,
});

// CRM Lost Reason schema
export const crmLostReasons = pgTable("crm_lost_reasons", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrmLostReasonSchema = createInsertSchema(crmLostReasons).omit({
  id: true,
  createdAt: true,
});

// CRM Email Template schema
export const crmEmailTemplates = pgTable("crm_email_templates", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(), // HTML or plain text
  category: text("category").default("general"), // general, follow_up, proposal, introduction
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrmEmailTemplateSchema = createInsertSchema(crmEmailTemplates).omit({
  id: true,
  createdAt: true,
});

// CRM Activity schema (scheduled calls, meetings, emails, to-dos)
export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull().default("todo"), // call, meeting, email, todo
  summary: text("summary").notNull(),
  notes: text("notes"),
  dueDate: timestamp("due_date"),
  assignedTo: text("assigned_to"),
  status: text("status").notNull().default("planned"), // planned, done, cancelled
  completedAt: timestamp("completed_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrmActivitySchema = createInsertSchema(crmActivities).omit({
  id: true,
  createdAt: true,
});

// Quotation schema
export const quotations = pgTable("quotations", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  leadId: bigint("lead_id", { mode: "number" }).references(() => leads.id),
  quotationDate: date("quotation_date").notNull(),
  validUntil: date("valid_until").notNull(),
  reference: text("reference"),
  contactPersonTitle: text("contact_person_title"),
  contactPerson: text("contact_person").notNull(),
  customerCompany: text("customer_company"), // Customer company name for PDF generation
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("India"),
  pincode: text("pincode").notNull(),
  shippingAddressLine1: text("shipping_address_line1"),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingCountry: text("shipping_country"),
  shippingPincode: text("shipping_pincode"),
  salesCredit: text("sales_credit"),
  sameAsBilling: boolean("same_as_billing").default(true),
  items: json("items").notNull(),
  terms: text("terms"),
  notes: text("notes"),
  bankDetails: json("bank_details"),
  extraCharges: json("extra_charges"),
  discounts: json("discounts"),
  discount: text("discount"),
  discountType: text("discount_type"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  cgstTotal: decimal("cgst_total", { precision: 10, scale: 2 }).default("0"),
  sgstTotal: decimal("sgst_total", { precision: 10, scale: 2 }).default("0"),
  igstTotal: decimal("igst_total", { precision: 10, scale: 2 }).default("0"),
  taxableTotal: decimal("taxable_total", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
});

// Proforma Invoice schema (separate from quotations)
export const proformas = pgTable("proformas", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  proformaNumber: text("proforma_number").notNull().unique(),
  quotationId: integer("quotation_id").references(() => quotations.id),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  proformaDate: date("proforma_date").notNull(),
  validUntil: date("valid_until").notNull(),
  reference: text("reference"),
  contactPersonTitle: text("contact_person_title"),
  contactPerson: text("contact_person").notNull(),
  customerCompany: text("customer_company"),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("India"),
  pincode: text("pincode").notNull(),
  shippingAddressLine1: text("shipping_address_line1"),
  shippingAddressLine2: text("shipping_address_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingCountry: text("shipping_country"),
  shippingPincode: text("shipping_pincode"),
  salesCredit: text("sales_credit"),
  sameAsBilling: boolean("same_as_billing").default(true),
  items: json("items").notNull(),
  terms: text("terms"),
  notes: text("notes"),
  bankDetails: json("bank_details"),
  extraCharges: json("extra_charges"),
  discounts: json("discounts"),
  discount: text("discount"),
  discountType: text("discount_type"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  cgstTotal: decimal("cgst_total", { precision: 10, scale: 2 }).default("0"),
  sgstTotal: decimal("sgst_total", { precision: 10, scale: 2 }).default("0"),
  igstTotal: decimal("igst_total", { precision: 10, scale: 2 }).default("0"),
  taxableTotal: decimal("taxable_total", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProformaSchema = createInsertSchema(proformas).omit({
  id: true,
  createdAt: true,
});

// Order schema (enhanced)
export const orders = pgTable("orders", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  orderNumber: text("order_number").notNull().unique(),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  quotationId: bigint("quotation_id", { mode: "number" }).references(() => quotations.id),
  customerName: text("customer_name").notNull(),
  customerCompany: text("customer_company").notNull(),
  poNumber: text("po_number"),
  poDate: timestamp("po_date"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  calibrationCertificateInfo: text("calibration_certificate_info"),
  calibrationFrequency: text("calibration_frequency"),
  paymentTerms: text("payment_terms"),
  otherTerms: text("other_terms"),
  deliveryTime: text("delivery_time"),
  items: json("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("processing"),
  // Profit calculation fields
  listPrice: decimal("list_price", { precision: 10, scale: 2 }),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  poFile: text("po_file"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

// Invoice schema
export const invoices = pgTable("invoices", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date").notNull(),
  items: json("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

// Payment schema
export const payments = pgTable("payments", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  paymentNumber: text("payment_number").notNull().unique(),
  invoiceId: bigint("invoice_id", { mode: "number" }).references(() => invoices.id),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Purchase Order schema
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  poNumber: text("po_number").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierName: text("supplier_name").notNull(),
  supplierCompany: text("supplier_company"),
  supplierTitle: text("supplier_title"),
  supplierAddress: text("supplier_address"),
  supplierCity: text("supplier_city"),
  supplierState: text("supplier_state"),
  supplierCountry: text("supplier_country"),
  supplierPincode: text("supplier_pincode"),
  supplierGstin: text("supplier_gstin"),
  supplierPan: text("supplier_pan"),
  supplierPhone: text("supplier_phone"),
  supplierEmail: text("supplier_email"),
  orderDate: date("order_date").notNull(),
  expectedDelivery: date("expected_delivery"),
  items: json("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  terms: json("terms"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
});

// Inventory schema (enhanced)
export const inventory = pgTable("inventory", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  category: text("category"),
  unit: text("unit").default("pcs"),
  quantity: integer("quantity").notNull().default(0),
  threshold: integer("threshold").notNull().default(5),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("18"),
  supplierId: bigint("supplier_id", { mode: "number" }).references(() => suppliers.id),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
});

// ==================== Inventory / Warehouse Module ====================
// The `inventory` table above is the product/item master. These add multi-warehouse,
// per-location on-hand tracking, stock moves and transfers. Date fields are text (ISO).

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  code: text("code"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true });

export const stockLocations = pgTable("stock_locations", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  warehouseId: integer("warehouse_id"),
  name: text("name").notNull(),
  code: text("code"),
  type: text("type").notNull().default("internal"), // internal, supplier, customer, transit, scrap
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertStockLocationSchema = createInsertSchema(stockLocations).omit({ id: true, createdAt: true });

// On-hand quantity of an item at a location
export const stockQuants = pgTable("stock_quants", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  itemId: text("item_id").notNull(), // inventory item id (Mongo ObjectId string)
  locationId: integer("location_id").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertStockQuantSchema = createInsertSchema(stockQuants).omit({ id: true, updatedAt: true });

// A single stock movement (the ledger). Validated moves update quants + global item qty.
export const stockMoves = pgTable("stock_moves", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  transferId: integer("transfer_id"),
  itemId: text("item_id").notNull(), // inventory item id (Mongo ObjectId string)
  fromLocationId: integer("from_location_id"),
  toLocationId: integer("to_location_id"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull().default("internal"), // receipt, delivery, internal, adjustment
  reference: text("reference"),
  date: text("date"),
  status: text("status").notNull().default("done"), // draft, done
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertStockMoveSchema = createInsertSchema(stockMoves).omit({ id: true, createdAt: true });

// A transfer / picking groups move lines under one document
export const stockTransfers = pgTable("stock_transfers", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  reference: text("reference").notNull(),
  type: text("type").notNull().default("internal"), // receipt, delivery, internal
  partnerName: text("partner_name"),
  fromLocationId: integer("from_location_id"),
  toLocationId: integer("to_location_id"),
  scheduledDate: text("scheduled_date"),
  status: text("status").notNull().default("draft"), // draft, ready, done, cancelled
  items: json("items"), // [{ itemId, quantity }]
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertStockTransferSchema = createInsertSchema(stockTransfers).omit({ id: true, createdAt: true });

// Reorder rules per item/location
export const reorderRules = pgTable("reorder_rules", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  itemId: text("item_id").notNull(), // inventory item id (Mongo ObjectId string)
  locationId: integer("location_id"),
  minQty: decimal("min_qty", { precision: 12, scale: 2 }).notNull().default("0"),
  maxQty: decimal("max_qty", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertReorderRuleSchema = createInsertSchema(reorderRules).omit({ id: true, createdAt: true });

// Manufacturing Job schema
export const manufacturingJobs = pgTable("manufacturing_jobs", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  jobNumber: text("job_number").notNull().unique(),
  productName: text("product_name").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  startDate: date("start_date").notNull(),
  expectedCompletion: date("expected_completion").notNull(),
  actualCompletion: date("actual_completion"),
  quantity: integer("quantity").notNull(),
  completedQuantity: integer("completed_quantity").default(0),
  rejectedQuantity: integer("rejected_quantity").default(0),
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("medium"),
  materials: json("materials"),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }).default("0"),
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertManufacturingJobSchema = createInsertSchema(manufacturingJobs).omit({
  id: true,
  createdAt: true,
});

// Task schema (enhanced)
export const tasks = pgTable("tasks", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to").notNull(),
  assignedById: bigint("assigned_by_id", { mode: "number" }).references(() => users.id),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  category: text("category"),
  relatedTo: text("related_to"), // lead, order, customer, etc.
  relatedId: bigint("related_id", { mode: "number" }),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

// Employee Activities schema (enhanced)
export const employeeActivities = pgTable("employee_activities", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeId: integer("employee_id").references(() => users.id),
  employeeName: text("employee_name").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  activitiesPerformed: text("activities_performed").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  issues: text("issues"),
  notes: text("notes"),
  category: text("category"), // manufacturing, sales, admin, etc.
  relatedTo: text("related_to"), // job, order, customer, etc.
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeActivitySchema = createInsertSchema(employeeActivities).omit({
  id: true,
  createdAt: true,
});

// Sales Targets schema (enhanced)
export const salesTargets = pgTable("sales_targets", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  targetMonth: text("target_month").notNull(),
  targetYear: text("target_year").notNull(),
  targetValue: integer("target_value").notNull(),
  actualValue: integer("actual_value").default(0),
  assignedTo: integer("assigned_to").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSalesTargetSchema = createInsertSchema(salesTargets).omit({
  id: true,
  createdAt: true,
});

// Manufacturing Forecast schema (enhanced)
export const manufacturingForecasts = pgTable("manufacturing_forecasts", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  productName: text("product_name").notNull(),
  forecastMonth: text("forecast_month").notNull(),
  forecastYear: text("forecast_year").notNull(),
  forecastQuantity: integer("forecast_quantity").notNull(),
  actualQuantity: integer("actual_quantity").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertManufacturingForecastSchema = createInsertSchema(manufacturingForecasts).omit({
  id: true,
  createdAt: true,
});

// Support Tickets schema
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  ticketNumber: text("ticket_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  orderId: integer("order_id").references(() => orders.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  assignedTo: integer("assigned_to").references(() => users.id),
  openedBy: integer("opened_by").references(() => users.id),
  openedDate: timestamp("opened_date").defaultNow().notNull(),
  resolvedDate: timestamp("resolved_date"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
});

// Contracts/AMC schema
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  contractNumber: text("contract_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  contractType: text("contract_type").notNull(), // AMC, Service, etc.
  subject: text("subject").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"),
  terms: text("terms"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

// ==================== HRMS Module ====================
// Date fields use text (ISO yyyy-mm-dd) to keep client/server JSON simple.

// Departments
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  code: text("code"),
  managerId: integer("manager_id"), // employee id of department head
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });

// Designations / Job Positions
export const designations = pgTable("designations", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  title: text("title").notNull(),
  departmentId: integer("department_id"),
  level: text("level"), // junior, mid, senior, lead, manager
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDesignationSchema = createInsertSchema(designations).omit({ id: true, createdAt: true });

// Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeCode: text("employee_code").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  gender: text("gender"), // male, female, other
  dateOfBirth: text("date_of_birth"),
  dateOfJoining: text("date_of_joining"),
  departmentId: integer("department_id"),
  designationId: integer("designation_id"),
  managerId: integer("manager_id"), // reporting manager (employee id)
  employmentType: text("employment_type").notNull().default("full_time"), // full_time, part_time, contract, intern
  workLocation: text("work_location"),
  status: text("status").notNull().default("active"), // active, on_leave, resigned, terminated
  ctc: decimal("ctc", { precision: 12, scale: 2 }),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  panNumber: text("pan_number"),
  aadharNumber: text("aadhar_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  userId: integer("user_id"), // optional link to a login user
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });

// Attendance
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeId: integer("employee_id").notNull(),
  date: text("date").notNull(), // yyyy-mm-dd
  checkIn: text("check_in"), // HH:mm
  checkOut: text("check_out"), // HH:mm
  status: text("status").notNull().default("present"), // present, absent, half_day, leave, holiday, week_off
  workHours: decimal("work_hours", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });

// Leave Types
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  code: text("code"),
  daysAllowed: integer("days_allowed").default(0), // annual allocation
  isPaid: boolean("is_paid").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({ id: true, createdAt: true });

// Leave Requests
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  days: decimal("days", { precision: 5, scale: 1 }),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, cancelled
  approvedBy: text("approved_by"),
  approverComment: text("approver_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ id: true, createdAt: true });

// Payslips / Payroll
export const payslips = pgTable("payslips", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeId: integer("employee_id").notNull(),
  periodMonth: integer("period_month").notNull(), // 1-12
  periodYear: integer("period_year").notNull(),
  basic: decimal("basic", { precision: 12, scale: 2 }).default("0"),
  hra: decimal("hra", { precision: 12, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 12, scale: 2 }).default("0"),
  otherEarnings: decimal("other_earnings", { precision: 12, scale: 2 }).default("0"),
  pf: decimal("pf", { precision: 12, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 12, scale: 2 }).default("0"),
  grossPay: decimal("gross_pay", { precision: 12, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).default("0"),
  lopDays: decimal("lop_days", { precision: 5, scale: 1 }).default("0"), // loss of pay days
  status: text("status").notNull().default("draft"), // draft, confirmed, paid
  paidOn: text("paid_on"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayslipSchema = createInsertSchema(payslips).omit({ id: true, createdAt: true });

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertLeadDiscussion = z.infer<typeof insertLeadDiscussionSchema>;
export type LeadDiscussion = typeof leadDiscussions.$inferSelect;
export type LeadCategory = typeof leadCategories.$inferSelect;
export type InsertLeadCategory = z.infer<typeof insertLeadCategorySchema>;
export type LeadSource = typeof leadSources.$inferSelect;
export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;

export type CrmStage = typeof crmStages.$inferSelect;
export type InsertCrmStage = z.infer<typeof insertCrmStageSchema>;
export type CrmLostReason = typeof crmLostReasons.$inferSelect;
export type InsertCrmLostReason = z.infer<typeof insertCrmLostReasonSchema>;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type CrmEmailTemplate = typeof crmEmailTemplates.$inferSelect;
export type InsertCrmEmailTemplate = typeof insertCrmEmailTemplateSchema._type;
export type InsertCrmActivity = z.infer<typeof insertCrmActivitySchema>;

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertProforma = z.infer<typeof insertProformaSchema>;
export type Proforma = typeof proformas.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

export type InsertManufacturingJob = z.infer<typeof insertManufacturingJobSchema>;
export type ManufacturingJob = typeof manufacturingJobs.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertEmployeeActivity = z.infer<typeof insertEmployeeActivitySchema>;
export type EmployeeActivity = typeof employeeActivities.$inferSelect;

export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;
export type SalesTarget = typeof salesTargets.$inferSelect;

export type InsertManufacturingForecast = z.infer<typeof insertManufacturingForecastSchema>;
export type ManufacturingForecast = typeof manufacturingForecasts.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// HRMS types
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Designation = typeof designations.$inferSelect;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type Payslip = typeof payslips.$inferSelect;
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;

// Inventory / Warehouse types
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type StockLocation = typeof stockLocations.$inferSelect;
export type InsertStockLocation = z.infer<typeof insertStockLocationSchema>;
export type StockQuant = typeof stockQuants.$inferSelect;
export type InsertStockQuant = z.infer<typeof insertStockQuantSchema>;
export type StockMove = typeof stockMoves.$inferSelect;
export type InsertStockMove = z.infer<typeof insertStockMoveSchema>;
export type StockTransfer = typeof stockTransfers.$inferSelect;
export type InsertStockTransfer = z.infer<typeof insertStockTransferSchema>;
export type ReorderRule = typeof reorderRules.$inferSelect;
export type InsertReorderRule = z.infer<typeof insertReorderRuleSchema>;

// Company Settings schema
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  logo: text("logo"), // Base64 encoded logo or URL
  website: text("website"),
  bankDetails: json("bank_details").$type<{
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
    upi?: string;
    swift?: string;
  }>(),
  integrations: json("integrations").$type<{
    indiaMart?: {
      apiKey?: string;
      lastSyncedAt?: string;
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

// =====================================================================
// MANUFACTURING — Work Centres, BOM, Production Orders
// =====================================================================
export const workCentres = pgTable("work_centres", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  code: text("code"),
  capacity: decimal("capacity", { precision: 10, scale: 2 }).default("1"),
  costPerHour: decimal("cost_per_hour", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertWorkCentreSchema = createInsertSchema(workCentres).omit({ id: true, createdAt: true });

export const bomHeaders = pgTable("bom_headers", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  productId: bigint("product_id", { mode: "number" }).references(() => inventory.id),
  name: text("name").notNull(),
  code: text("code"),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull().default("1"),
  uom: text("uom").default("pcs"),
  version: text("version").default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertBomHeaderSchema = createInsertSchema(bomHeaders).omit({ id: true, createdAt: true });

export const bomLines = pgTable("bom_lines", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  bomId: integer("bom_id").notNull().references(() => bomHeaders.id, { onDelete: "cascade" }),
  componentId: bigint("component_id", { mode: "number" }).references(() => inventory.id),
  componentName: text("component_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  uom: text("uom").default("pcs"),
  scrapPercent: decimal("scrap_percent", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
});
export const insertBomLineSchema = createInsertSchema(bomLines).omit({ id: true });

export const productionOrders = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  bomId: integer("bom_id").references(() => bomHeaders.id),
  productId: bigint("product_id", { mode: "number" }).references(() => inventory.id),
  productName: text("product_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  uom: text("uom").default("pcs"),
  workCentreId: integer("work_centre_id").references(() => workCentres.id),
  status: text("status").notNull().default("draft"),
  scheduledDate: text("scheduled_date"),
  finishedDate: text("finished_date"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  lines: json("lines").$type<Array<{ componentId?: string; componentName: string; requiredQty: number; consumedQty: number; uom?: string }>>().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit({ id: true, createdAt: true });

// =====================================================================
// PURCHASING — RFQ, Goods Receipt Notes
// =====================================================================
export const rfqs = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  supplierId: bigint("supplier_id", { mode: "number" }).references(() => suppliers.id),
  supplierName: text("supplier_name").notNull(),
  status: text("status").notNull().default("draft"),
  currency: text("currency").default("INR"),
  expectedDelivery: text("expected_delivery"),
  notes: text("notes"),
  items: json("items").$type<Array<{ itemId?: string; itemName: string; quantity: number; uom?: string; unitPrice?: number }>>().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertRfqSchema = createInsertSchema(rfqs).omit({ id: true, createdAt: true });

export const goodsReceiptNotes = pgTable("goods_receipt_notes", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  purchaseOrderId: bigint("purchase_order_id", { mode: "number" }).references(() => purchaseOrders.id),
  supplierId: bigint("supplier_id", { mode: "number" }).references(() => suppliers.id),
  supplierName: text("supplier_name").notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  status: text("status").notNull().default("draft"),
  receiptDate: text("receipt_date"),
  notes: text("notes"),
  items: json("items").$type<Array<{ itemId?: string; itemName: string; orderedQty: number; receivedQty: number; uom?: string; unitPrice?: number }>>().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertGrnSchema = createInsertSchema(goodsReceiptNotes).omit({ id: true, createdAt: true });

// =====================================================================
// SALES — Delivery Orders, Price Lists
// =====================================================================
export const deliveryOrders = pgTable("delivery_orders", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  salesOrderId: bigint("sales_order_id", { mode: "number" }).references(() => orders.id),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  customerName: text("customer_name").notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  status: text("status").notNull().default("draft"),
  scheduledDate: text("scheduled_date"),
  deliveredDate: text("delivered_date"),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  shippingAddress: text("shipping_address"),
  notes: text("notes"),
  items: json("items").$type<Array<{ itemId?: string; itemName: string; demandQty: number; doneQty: number; uom?: string }>>().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders).omit({ id: true, createdAt: true });

export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  currency: text("currency").default("INR"),
  discountType: text("discount_type").default("percentage"),
  isActive: boolean("is_active").notNull().default(true),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  items: json("items").$type<Array<{ itemId: string; itemName: string; price?: number; discountPercent?: number }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertPriceListSchema = createInsertSchema(priceLists).omit({ id: true, createdAt: true });

// =====================================================================
// HR — Appraisals, Expense Claims, Recruitment
// =====================================================================
export const appraisals = pgTable("appraisals", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  employeeName: text("employee_name").notNull(),
  reviewerName: text("reviewer_name"),
  period: text("period").notNull(),
  status: text("status").notNull().default("draft"),
  overallRating: decimal("overall_rating", { precision: 3, scale: 1 }),
  goals: json("goals").$type<Array<{ title: string; score?: number; comments?: string }>>().default([]),
  strengths: text("strengths"),
  improvements: text("improvements"),
  managerComments: text("manager_comments"),
  employeeComments: text("employee_comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertAppraisalSchema = createInsertSchema(appraisals).omit({ id: true, createdAt: true });

export const expenseClaims = pgTable("expense_claims", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  employeeName: text("employee_name").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  submittedAt: text("submitted_at"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  paidAt: text("paid_at"),
  notes: text("notes"),
  lines: json("lines").$type<Array<{ date: string; category: string; description: string; amount: number }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertExpenseClaimSchema = createInsertSchema(expenseClaims).omit({ id: true, createdAt: true });

export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  title: text("title").notNull(),
  departmentName: text("department_name"),
  description: text("description"),
  requirements: text("requirements"),
  vacancies: integer("vacancies").default(1),
  status: text("status").notNull().default("open"),
  location: text("location"),
  salaryMin: decimal("salary_min", { precision: 10, scale: 2 }),
  salaryMax: decimal("salary_max", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertJobPositionSchema = createInsertSchema(jobPositions).omit({ id: true, createdAt: true });

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  jobPositionId: integer("job_position_id"),
  positionTitle: text("position_title").notNull(),
  applicantName: text("applicant_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  stage: text("stage").notNull().default("new"),
  rating: integer("rating").default(0),
  notes: text("notes"),
  source: text("source").default("direct"),
  appliedAt: text("applied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, createdAt: true });

// =====================================================================
// FINANCE — Chart of Accounts, Journal Entries
// =====================================================================
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  groupName: text("group_name"),
  isActive: boolean("is_active").notNull().default(true),
  openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).default("0"),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("INR"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts).omit({ id: true, createdAt: true });

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).references(() => companies.id),
  name: text("name").notNull(),
  date: text("date").notNull(),
  reference: text("reference"),
  type: text("type").default("manual"),
  status: text("status").notNull().default("draft"),
  totalDebit: decimal("total_debit", { precision: 12, scale: 2 }).default("0"),
  totalCredit: decimal("total_credit", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  lines: json("lines").$type<Array<{ accountId: number; accountName: string; accountCode: string; debit: number; credit: number; description?: string }>>().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });

// Type exports for all new entities
export type WorkCentre = typeof workCentres.$inferSelect;
export type InsertWorkCentre = z.infer<typeof insertWorkCentreSchema>;
export type BomHeader = typeof bomHeaders.$inferSelect;
export type InsertBomHeader = z.infer<typeof insertBomHeaderSchema>;
export type BomLine = typeof bomLines.$inferSelect;
export type InsertBomLine = z.infer<typeof insertBomLineSchema>;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = z.infer<typeof insertProductionOrderSchema>;
export type Rfq = typeof rfqs.$inferSelect;
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type GoodsReceiptNote = typeof goodsReceiptNotes.$inferSelect;
export type InsertGoodsReceiptNote = z.infer<typeof insertGrnSchema>;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = z.infer<typeof insertDeliveryOrderSchema>;
export type PriceList = typeof priceLists.$inferSelect;
export type InsertPriceList = z.infer<typeof insertPriceListSchema>;
export type Appraisal = typeof appraisals.$inferSelect;
export type InsertAppraisal = z.infer<typeof insertAppraisalSchema>;
export type ExpenseClaim = typeof expenseClaims.$inferSelect;
export type InsertExpenseClaim = z.infer<typeof insertExpenseClaimSchema>;
export type JobPosition = typeof jobPositions.$inferSelect;
export type InsertJobPosition = z.infer<typeof insertJobPositionSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
