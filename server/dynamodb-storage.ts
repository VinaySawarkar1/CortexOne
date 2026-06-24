/**
 * DynamoDB Storage Adapter for Reckonix ERP
 *
 * All tables are prefixed with "reckonix_" to avoid colliding with any
 * pre-existing tables in the AWS account.
 *
 * Table design:
 *   PK  = "id"  (Number) — auto-incremented via a reckonix_counters table
 *   GSI = "companyId-index" on companyId (Number) where applicable
 *
 * The counters table stores one item per entity type:
 *   { entity: "leads", seq: 42 }
 * We do an atomic UpdateItem with ADD seq 1 and return the new value.
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config";
import { IStorage } from "./storage";
import type {
  User, InsertUser,
  Company, InsertCompany,
  Customer, InsertCustomer,
  Supplier, InsertSupplier,
  Lead, InsertLead,
  LeadDiscussion, InsertLeadDiscussion,
  LeadCategory, InsertLeadCategory,
  LeadSource, InsertLeadSource,
  CrmStage, InsertCrmStage,
  CrmLostReason, InsertCrmLostReason,
  CrmActivity, InsertCrmActivity,
  CrmEmailTemplate, InsertCrmEmailTemplate,
  Quotation, InsertQuotation,
  Order, InsertOrder,
  Invoice, InsertInvoice,
  Payment, InsertPayment,
  PurchaseOrder, InsertPurchaseOrder,
  Inventory, InsertInventory,
  ManufacturingJob, InsertManufacturingJob,
  Task, InsertTask,
  EmployeeActivity, InsertEmployeeActivity,
  SalesTarget, InsertSalesTarget,
  SupportTicket, InsertSupportTicket,
  Contract, InsertContract,
  CompanySettings, InsertCompanySettings,
  Proforma, InsertProforma,
  Department, InsertDepartment,
  Designation, InsertDesignation,
  Employee, InsertEmployee,
  Attendance, InsertAttendance,
  LeaveType, InsertLeaveType,
  LeaveRequest, InsertLeaveRequest,
  Payslip, InsertPayslip,
  Warehouse, InsertWarehouse,
  StockLocation, InsertStockLocation,
  StockQuant, InsertStockQuant,
  StockMove, InsertStockMove,
  StockTransfer, InsertStockTransfer,
  ReorderRule, InsertReorderRule,
  ManufacturingForecast, InsertManufacturingForecast,
} from "@shared/schema";

const PREFIX = config.DYNAMO_TABLE_PREFIX; // "reckonix_"

// ── Table definitions ────────────────────────────────────────────────────────
// Each entry: [tableName, pkName, pkType, gsiOnCompanyId?]
const TABLE_DEFS: [string, string, "N" | "S", boolean][] = [
  ["counters",          "entity",      "S", false],
  ["users",             "id",          "N", false],
  ["companies",         "id",          "N", false],
  ["company_settings",  "id",          "N", false],
  ["customers",         "id",          "N", true],
  ["suppliers",         "id",          "N", true],
  ["leads",             "id",          "N", true],
  ["lead_discussions",  "id",          "N", false],
  ["lead_categories",   "id",          "N", true],
  ["lead_sources",      "id",          "N", true],
  ["crm_stages",        "id",          "N", true],
  ["crm_lost_reasons",  "id",          "N", true],
  ["crm_activities",    "id",          "N", true],
  ["crm_email_templates","id",         "N", true],
  ["quotations",        "id",          "N", true],
  ["orders",            "id",          "N", true],
  ["invoices",          "id",          "N", true],
  ["payments",          "id",          "N", true],
  ["purchase_orders",   "id",          "N", true],
  ["proformas",         "id",          "N", true],
  ["inventory",         "id",          "N", true],
  ["manufacturing_jobs","id",          "N", true],
  ["tasks",             "id",          "N", true],
  ["employee_activities","id",         "N", true],
  ["sales_targets",     "id",          "N", true],
  ["support_tickets",   "id",          "N", true],
  ["contracts",         "id",          "N", true],
  ["departments",       "id",          "N", true],
  ["designations",      "id",          "N", true],
  ["employees",         "id",          "N", true],
  ["attendance",        "id",          "N", true],
  ["leave_types",       "id",          "N", true],
  ["leave_requests",    "id",          "N", true],
  ["payslips",          "id",          "N", true],
  ["warehouses",        "id",          "N", true],
  ["stock_locations",   "id",          "N", true],
  ["stock_quants",      "id",          "N", true],
  ["stock_moves",       "id",          "N", true],
  ["stock_transfers",   "id",          "N", true],
  ["reorder_rules",     "id",          "N", true],
  ["mfg_forecasts",     "id",          "N", true],
  ["work_centres",       "id",          "N", true],
  ["bom_headers",        "id",          "N", true],
  ["bom_lines",          "id",          "N", false],
  ["production_orders",  "id",          "N", true],
  ["rfqs",               "id",          "N", true],
  ["grns",               "id",          "N", true],
  ["delivery_orders",    "id",          "N", true],
  ["price_lists",        "id",          "N", true],
  ["appraisals",         "id",          "N", true],
  ["expense_claims",     "id",          "N", true],
  ["job_positions",      "id",          "N", true],
  ["job_applications",   "id",          "N", true],
  ["chart_of_accounts",  "id",          "N", true],
  ["journal_entries",    "id",          "N", true],
];

function tbl(name: string) { return PREFIX + name; }

// ── Helper: clean undefined values from objects before writing to DynamoDB ──
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as T;
}

// ── Helper: serialise / deserialise dates ────────────────────────────────────
function ser(val: any): any {
  if (val instanceof Date) return val.toISOString();
  return val;
}

function serObj(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, ser(v)]));
}

export class DynamoDBStorage implements IStorage {
  private client: DynamoDBClient;
  private doc: DynamoDBDocumentClient;

  constructor() {
    this.client = new DynamoDBClient({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID!,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.doc = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  // ── Table bootstrap ────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    for (const [name, pk, pkType, gsi] of TABLE_DEFS) {
      await this.ensureTable(name, pk, pkType, gsi);
    }
    console.log(`✅ DynamoDB tables ready (prefix: ${PREFIX})`);
  }

  private async ensureTable(name: string, pk: string, pkType: "N" | "S", gsi: boolean) {
    const tableName = tbl(name);
    try {
      await this.client.send(new DescribeTableCommand({ TableName: tableName }));
    } catch (e: any) {
      if (e.name !== "ResourceNotFoundException") throw e;
      // Create the table
      const attrDefs: any[] = [{ AttributeName: pk, AttributeType: pkType }];
      const keySchema: any[] = [{ AttributeName: pk, KeyType: "HASH" }];
      const gsiDefs: any[] = [];

      if (gsi) {
        attrDefs.push({ AttributeName: "companyId", AttributeType: "N" });
        gsiDefs.push({
          IndexName: "companyId-index",
          KeySchema: [{ AttributeName: "companyId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        });
      }

      await this.client.send(new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: attrDefs,
        KeySchema: keySchema,
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        GlobalSecondaryIndexes: gsiDefs.length ? gsiDefs : undefined,
      }));

      // Wait until table is active (simple poll)
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const desc = await this.client.send(new DescribeTableCommand({ TableName: tableName }));
        if (desc.Table?.TableStatus === "ACTIVE") break;
      }
      console.log(`  ✔ Created table ${tableName}`);
    }
  }

  // ── Sequence / auto-increment ─────────────────────────────────────────────
  private async nextId(entity: string): Promise<number> {
    const result = await this.doc.send(new UpdateCommand({
      TableName: tbl("counters"),
      Key: { entity },
      UpdateExpression: "ADD #seq :inc",
      ExpressionAttributeNames: { "#seq": "seq" },
      ExpressionAttributeValues: { ":inc": 1 },
      ReturnValues: "UPDATED_NEW",
    }));
    return result.Attributes!.seq as number;
  }

  // ── Generic scan helpers ──────────────────────────────────────────────────
  private async scanAll(tableName: string): Promise<any[]> {
    const items: any[] = [];
    let last: any;
    do {
      const res = await this.doc.send(new ScanCommand({
        TableName: tbl(tableName),
        ExclusiveStartKey: last,
      }));
      items.push(...(res.Items || []));
      last = res.LastEvaluatedKey;
    } while (last);
    return items;
  }

  private async scanByCompany(tableName: string, companyId?: number): Promise<any[]> {
    if (!companyId) return this.scanAll(tableName);
    const items: any[] = [];
    let last: any;
    do {
      const res = await this.doc.send(new ScanCommand({
        TableName: tbl(tableName),
        FilterExpression: "companyId = :cid",
        ExpressionAttributeValues: { ":cid": companyId },
        ExclusiveStartKey: last,
      }));
      items.push(...(res.Items || []));
      last = res.LastEvaluatedKey;
    } while (last);
    return items;
  }

  private async getById(tableName: string, id: number | string): Promise<any | undefined> {
    const res = await this.doc.send(new GetCommand({
      TableName: tbl(tableName),
      Key: { id },
    }));
    return res.Item;
  }

  private async putItem(tableName: string, item: any): Promise<void> {
    await this.doc.send(new PutCommand({
      TableName: tbl(tableName),
      Item: clean(serObj(item)),
    }));
  }

  private async updateItem(tableName: string, id: number | string, updates: Record<string, any>): Promise<any | undefined> {
    const existing = await this.getById(tableName, id);
    if (!existing) return undefined;
    const merged = clean(serObj({ ...existing, ...updates }));
    await this.putItem(tableName, merged);
    return merged;
  }

  private async deleteItem(tableName: string, id: number | string): Promise<boolean> {
    const existing = await this.getById(tableName, id);
    if (!existing) return false;
    await this.doc.send(new DeleteCommand({ TableName: tbl(tableName), Key: { id } }));
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SESSION STORE  (kept simple — not used by DynamoDB storage directly)
  // ─────────────────────────────────────────────────────────────────────────
  sessionStore: any = null; // will use MemoryStore from the main server

  // ── COMPANIES ─────────────────────────────────────────────────────────────
  async getCompany(id: number) { return this.getById("companies", id); }
  async getCompanyByName(name: string) {
    const all = await this.scanAll("companies");
    return all.find(c => c.name === name);
  }
  async createCompany(c: InsertCompany): Promise<Company> {
    const id = await this.nextId("companies");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("companies", item); return item as Company;
  }
  async updateCompany(id: number, updates: Partial<InsertCompany>) { return this.updateItem("companies", id, updates); }
  async getAllCompanies() { return this.scanAll("companies"); }

  // ── COMPANY SETTINGS ───────────────────────────────────────────────────────
  async getCompanySettings(companyId: number) {
    const all = await this.scanByCompany("company_settings", companyId);
    return all[0];
  }
  async createCompanySettings(s: InsertCompanySettings): Promise<CompanySettings> {
    const id = await this.nextId("company_settings");
    const item = { ...s, id, updatedAt: new Date().toISOString() };
    await this.putItem("company_settings", item); return item as CompanySettings;
  }
  async updateCompanySettings(companyId: number, updates: any) {
    const existing = await this.getCompanySettings(companyId);
    if (!existing) return undefined;
    return this.updateItem("company_settings", existing.id, updates);
  }

  // ── USERS ─────────────────────────────────────────────────────────────────
  async getUser(id: number) { return this.getById("users", id); }
  async getUserByUsername(username: string) {
    const all = await this.scanAll("users");
    return all.find(u => u.username === username);
  }
  async createUser(u: InsertUser): Promise<User> {
    const id = await this.nextId("users");
    const item = { ...u, id, createdAt: new Date().toISOString() };
    await this.putItem("users", item); return item as User;
  }
  async getAllUsers() { return this.scanAll("users"); }
  async updateUser(id: number, updates: Partial<User>) { return this.updateItem("users", id, updates); }
  async deleteUser(id: number) { return this.deleteItem("users", id); }

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  async getCustomer(id: number) { return this.getById("customers", id); }
  async createCustomer(c: InsertCustomer): Promise<Customer> {
    const id = await this.nextId("customers");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("customers", item); return item as Customer;
  }
  async updateCustomer(id: number, c: Partial<InsertCustomer>) { return this.updateItem("customers", id, c); }
  async getAllCustomers() { return this.scanAll("customers"); }
  async deleteCustomer(id: number) { return this.deleteItem("customers", id); }

  // ── SUPPLIERS ────────────────────────────────────────────────────────────
  async getSupplier(id: number) { return this.getById("suppliers", id); }
  async createSupplier(s: InsertSupplier): Promise<Supplier> {
    const id = await this.nextId("suppliers");
    const item = { ...s, id, createdAt: new Date().toISOString() };
    await this.putItem("suppliers", item); return item as Supplier;
  }
  async updateSupplier(id: number, s: Partial<InsertSupplier>) { return this.updateItem("suppliers", id, s); }
  async getAllSuppliers(companyId?: number) { return this.scanByCompany("suppliers", companyId); }
  async deleteSupplier(id: number) { return this.deleteItem("suppliers", id); }

  // ── LEADS ─────────────────────────────────────────────────────────────────
  async getLead(id: number) { return this.getById("leads", id); }
  async createLead(l: InsertLead): Promise<Lead> {
    const id = await this.nextId("leads");
    const item = { ...l, id, createdAt: new Date().toISOString() };
    await this.putItem("leads", item); return item as Lead;
  }
  async updateLead(id: number, l: Partial<InsertLead>) { return this.updateItem("leads", id, l); }
  async getAllLeads() { return this.scanAll("leads"); }
  async getLeads(companyId?: number) { return this.scanByCompany("leads", companyId); }
  async deleteLead(id: number) { return this.deleteItem("leads", id); }

  // ── LEAD DISCUSSIONS ──────────────────────────────────────────────────────
  async getLeadDiscussions(leadId: number) {
    const all = await this.scanAll("lead_discussions");
    return all.filter(d => d.leadId === leadId);
  }
  async createLeadDiscussion(d: InsertLeadDiscussion): Promise<LeadDiscussion> {
    const id = await this.nextId("lead_discussions");
    const item = { ...d, id, createdAt: new Date().toISOString() };
    await this.putItem("lead_discussions", item); return item as LeadDiscussion;
  }
  async updateLeadDiscussion(id: number, d: Partial<InsertLeadDiscussion>) { return this.updateItem("lead_discussions", id, d); }
  async deleteLeadDiscussion(id: number) { return this.deleteItem("lead_discussions", id); }

  // ── LEAD CATEGORIES ───────────────────────────────────────────────────────
  async getAllLeadCategories(companyId?: number) { return this.scanByCompany("lead_categories", companyId); }
  async createLeadCategory(c: InsertLeadCategory): Promise<LeadCategory> {
    const id = await this.nextId("lead_categories");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("lead_categories", item); return item as LeadCategory;
  }
  async updateLeadCategory(id: number, c: Partial<InsertLeadCategory>) { return this.updateItem("lead_categories", id, c); }
  async deleteLeadCategory(id: number) { return this.deleteItem("lead_categories", id); }

  // ── LEAD SOURCES ──────────────────────────────────────────────────────────
  async getAllLeadSources(companyId?: number) { return this.scanByCompany("lead_sources", companyId); }
  async createLeadSource(c: InsertLeadSource): Promise<LeadSource> {
    const id = await this.nextId("lead_sources");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("lead_sources", item); return item as LeadSource;
  }
  async updateLeadSource(id: number, c: Partial<InsertLeadSource>) { return this.updateItem("lead_sources", id, c); }
  async deleteLeadSource(id: number) { return this.deleteItem("lead_sources", id); }

  // ── CRM STAGES ────────────────────────────────────────────────────────────
  async getAllCrmStages(companyId?: number) {
    const items = await this.scanByCompany("crm_stages", companyId);
    return items.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }
  async createCrmStage(c: InsertCrmStage): Promise<CrmStage> {
    const id = await this.nextId("crm_stages");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("crm_stages", item); return item as CrmStage;
  }
  async updateCrmStage(id: number, c: Partial<InsertCrmStage>) { return this.updateItem("crm_stages", id, c); }
  async deleteCrmStage(id: number) { return this.deleteItem("crm_stages", id); }

  // ── CRM LOST REASONS ─────────────────────────────────────────────────────
  async getAllCrmLostReasons(companyId?: number) { return this.scanByCompany("crm_lost_reasons", companyId); }
  async createCrmLostReason(c: InsertCrmLostReason): Promise<CrmLostReason> {
    const id = await this.nextId("crm_lost_reasons");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("crm_lost_reasons", item); return item as CrmLostReason;
  }
  async updateCrmLostReason(id: number, c: Partial<InsertCrmLostReason>) { return this.updateItem("crm_lost_reasons", id, c); }
  async deleteCrmLostReason(id: number) { return this.deleteItem("crm_lost_reasons", id); }

  // ── CRM ACTIVITIES ────────────────────────────────────────────────────────
  async getCrmActivities(leadId: number) {
    const all = await this.scanAll("crm_activities");
    return all.filter(a => a.leadId === leadId);
  }
  async getAllCrmActivities(companyId?: number) { return this.scanByCompany("crm_activities", companyId); }
  async createCrmActivity(a: InsertCrmActivity): Promise<CrmActivity> {
    const id = await this.nextId("crm_activities");
    const item = { ...a, id, createdAt: new Date().toISOString() };
    await this.putItem("crm_activities", item); return item as CrmActivity;
  }
  async updateCrmActivity(id: number, a: Partial<InsertCrmActivity>) { return this.updateItem("crm_activities", id, a); }
  async deleteCrmActivity(id: number) { return this.deleteItem("crm_activities", id); }

  // ── CRM EMAIL TEMPLATES ───────────────────────────────────────────────────
  async getCrmEmailTemplates(companyId?: number) { return this.scanByCompany("crm_email_templates", companyId); }
  async createCrmEmailTemplate(t: InsertCrmEmailTemplate): Promise<CrmEmailTemplate> {
    const id = await this.nextId("crm_email_templates");
    const item = { ...t, id, createdAt: new Date().toISOString() };
    await this.putItem("crm_email_templates", item); return item as CrmEmailTemplate;
  }
  async updateCrmEmailTemplate(id: number, t: Partial<InsertCrmEmailTemplate>) { return this.updateItem("crm_email_templates", id, t); }
  async deleteCrmEmailTemplate(id: number) { return this.deleteItem("crm_email_templates", id); }

  // ── QUOTATIONS ────────────────────────────────────────────────────────────
  async getQuotation(id: number) { return this.getById("quotations", id); }
  async createQuotation(q: InsertQuotation): Promise<Quotation> {
    const id = await this.nextId("quotations");
    const item = { ...q, id, createdAt: new Date().toISOString() };
    await this.putItem("quotations", item); return item as Quotation;
  }
  async updateQuotation(id: number, q: Partial<InsertQuotation>) { return this.updateItem("quotations", id, q); }
  async getAllQuotations(companyId?: number) { return this.scanByCompany("quotations", companyId); }
  async deleteQuotation(id: number) { return this.deleteItem("quotations", id); }

  // ── ORDERS ────────────────────────────────────────────────────────────────
  async getOrder(id: number) { return this.getById("orders", id); }
  async createOrder(o: InsertOrder): Promise<Order> {
    const id = await this.nextId("orders");
    const item = { ...o, id, createdAt: new Date().toISOString() };
    await this.putItem("orders", item); return item as Order;
  }
  async updateOrder(id: number, o: Partial<InsertOrder>) { return this.updateItem("orders", id, o); }
  async getAllOrders(companyId?: number) { return this.scanByCompany("orders", companyId); }
  async deleteOrder(id: number) { return this.deleteItem("orders", id); }

  // ── INVOICES ──────────────────────────────────────────────────────────────
  async getInvoice(id: number) { return this.getById("invoices", id); }
  async createInvoice(i: InsertInvoice): Promise<Invoice> {
    const id = await this.nextId("invoices");
    const item = { ...i, id, createdAt: new Date().toISOString() };
    await this.putItem("invoices", item); return item as Invoice;
  }
  async updateInvoice(id: number, i: Partial<InsertInvoice>) { return this.updateItem("invoices", id, i); }
  async getAllInvoices(companyId?: number) { return this.scanByCompany("invoices", companyId); }
  async deleteInvoice(id: number) { return this.deleteItem("invoices", id); }

  // ── PAYMENTS ──────────────────────────────────────────────────────────────
  async getPayment(id: number) { return this.getById("payments", id); }
  async createPayment(p: InsertPayment): Promise<Payment> {
    const id = await this.nextId("payments");
    const item = { ...p, id, createdAt: new Date().toISOString() };
    await this.putItem("payments", item); return item as Payment;
  }
  async updatePayment(id: number, p: Partial<InsertPayment>) { return this.updateItem("payments", id, p); }
  async getAllPayments(companyId?: number) { return this.scanByCompany("payments", companyId); }
  async deletePayment(id: number) { return this.deleteItem("payments", id); }

  // ── PURCHASE ORDERS ───────────────────────────────────────────────────────
  async getPurchaseOrder(id: number) { return this.getById("purchase_orders", id); }
  async createPurchaseOrder(p: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const id = await this.nextId("purchase_orders");
    const item = { ...p, id, createdAt: new Date().toISOString() };
    await this.putItem("purchase_orders", item); return item as PurchaseOrder;
  }
  async updatePurchaseOrder(id: number, p: Partial<InsertPurchaseOrder>) { return this.updateItem("purchase_orders", id, p); }
  async getAllPurchaseOrders(companyId?: number) { return this.scanByCompany("purchase_orders", companyId); }
  async deletePurchaseOrder(id: number) { return this.deleteItem("purchase_orders", id); }

  // ── PROFORMAS ─────────────────────────────────────────────────────────────
  async getProforma(id: number) { return this.getById("proformas", id); }
  async createProforma(p: InsertProforma): Promise<Proforma> {
    const id = await this.nextId("proformas");
    const item = { ...p, id, createdAt: new Date().toISOString() };
    await this.putItem("proformas", item); return item as Proforma;
  }
  async updateProforma(id: number, p: Partial<InsertProforma>) { return this.updateItem("proformas", id, p); }
  async getAllProformas(companyId?: number) { return this.scanByCompany("proformas", companyId); }
  async deleteProforma(id: number) { return this.deleteItem("proformas", id); }

  // ── INVENTORY ────────────────────────────────────────────────────────────
  async getInventoryItem(id: number) { return this.getById("inventory", id); }
  async createInventoryItem(i: InsertInventory): Promise<Inventory> {
    const id = await this.nextId("inventory");
    const item = { ...i, id, createdAt: new Date().toISOString() };
    await this.putItem("inventory", item); return item as Inventory;
  }
  async updateInventoryItem(id: number, i: Partial<InsertInventory>) { return this.updateItem("inventory", id, i); }
  async getAllInventoryItems(companyId?: number) { return this.scanByCompany("inventory", companyId); }
  async deleteInventoryItem(id: number) { return this.deleteItem("inventory", id); }

  // ── MANUFACTURING JOBS ────────────────────────────────────────────────────
  async getManufacturingJob(id: number) { return this.getById("manufacturing_jobs", id); }
  async createManufacturingJob(j: InsertManufacturingJob): Promise<ManufacturingJob> {
    const id = await this.nextId("manufacturing_jobs");
    const item = { ...j, id, createdAt: new Date().toISOString() };
    await this.putItem("manufacturing_jobs", item); return item as ManufacturingJob;
  }
  async updateManufacturingJob(id: number, j: Partial<InsertManufacturingJob>) { return this.updateItem("manufacturing_jobs", id, j); }
  async getAllManufacturingJobs(companyId?: number) { return this.scanByCompany("manufacturing_jobs", companyId); }
  async deleteManufacturingJob(id: number) { return this.deleteItem("manufacturing_jobs", id); }

  // ── TASKS ─────────────────────────────────────────────────────────────────
  async getTask(id: number) { return this.getById("tasks", id); }
  async createTask(t: InsertTask): Promise<Task> {
    const id = await this.nextId("tasks");
    const item = { ...t, id, createdAt: new Date().toISOString() };
    await this.putItem("tasks", item); return item as Task;
  }
  async updateTask(id: number, t: Partial<InsertTask>) { return this.updateItem("tasks", id, t); }
  async getAllTasks(companyId?: number) { return this.scanByCompany("tasks", companyId); }
  async deleteTask(id: number) { return this.deleteItem("tasks", id); }

  // ── EMPLOYEE ACTIVITIES ───────────────────────────────────────────────────
  async getEmployeeActivity(id: number) { return this.getById("employee_activities", id); }
  async createEmployeeActivity(a: InsertEmployeeActivity): Promise<EmployeeActivity> {
    const id = await this.nextId("employee_activities");
    const item = { ...a, id, createdAt: new Date().toISOString() };
    await this.putItem("employee_activities", item); return item as EmployeeActivity;
  }
  async updateEmployeeActivity(id: number, a: Partial<InsertEmployeeActivity>) { return this.updateItem("employee_activities", id, a); }
  async getAllEmployeeActivities() { return this.scanAll("employee_activities"); }
  async deleteEmployeeActivity(id: number) { return this.deleteItem("employee_activities", id); }

  // ── SALES TARGETS ─────────────────────────────────────────────────────────
  async getSalesTarget(id: number) { return this.getById("sales_targets", id); }
  async createSalesTarget(t: InsertSalesTarget): Promise<SalesTarget> {
    const id = await this.nextId("sales_targets");
    const item = { ...t, id, createdAt: new Date().toISOString() };
    await this.putItem("sales_targets", item); return item as SalesTarget;
  }
  async updateSalesTarget(id: number, t: Partial<InsertSalesTarget>) { return this.updateItem("sales_targets", id, t); }
  async getAllSalesTargets(companyId?: number) { return this.scanByCompany("sales_targets", companyId); }
  async deleteSalesTarget(id: number) { return this.deleteItem("sales_targets", id); }

  // ── SUPPORT TICKETS ───────────────────────────────────────────────────────
  async getSupportTicket(id: number) { return this.getById("support_tickets", id); }
  async createSupportTicket(t: InsertSupportTicket): Promise<SupportTicket> {
    const id = await this.nextId("support_tickets");
    const item = { ...t, id, createdAt: new Date().toISOString() };
    await this.putItem("support_tickets", item); return item as SupportTicket;
  }
  async updateSupportTicket(id: number, t: Partial<InsertSupportTicket>) { return this.updateItem("support_tickets", id, t); }
  async getAllSupportTickets(companyId?: number) { return this.scanByCompany("support_tickets", companyId); }
  async deleteSupportTicket(id: number) { return this.deleteItem("support_tickets", id); }

  // ── CONTRACTS ─────────────────────────────────────────────────────────────
  async getContract(id: number) { return this.getById("contracts", id); }
  async createContract(c: InsertContract): Promise<Contract> {
    const id = await this.nextId("contracts");
    const item = { ...c, id, createdAt: new Date().toISOString() };
    await this.putItem("contracts", item); return item as Contract;
  }
  async updateContract(id: number, c: Partial<InsertContract>) { return this.updateItem("contracts", id, c); }
  async getAllContracts(companyId?: number) { return this.scanByCompany("contracts", companyId); }
  async deleteContract(id: number) { return this.deleteItem("contracts", id); }

  // ── HRMS: DEPARTMENTS ─────────────────────────────────────────────────────
  async getAllDepartments(companyId?: number) { return this.scanByCompany("departments", companyId); }
  async getDepartment(id: number) { return this.getById("departments", id); }
  async createDepartment(d: InsertDepartment): Promise<Department> {
    const id = await this.nextId("departments");
    const item = { ...d, id, isActive: d.isActive ?? true, createdAt: new Date().toISOString() };
    await this.putItem("departments", item); return item as Department;
  }
  async updateDepartment(id: number, d: Partial<InsertDepartment>) { return this.updateItem("departments", id, d); }
  async deleteDepartment(id: number) { return this.deleteItem("departments", id); }

  // ── HRMS: DESIGNATIONS ────────────────────────────────────────────────────
  async getAllDesignations(companyId?: number) { return this.scanByCompany("designations", companyId); }
  async getDesignation(id: number) { return this.getById("designations", id); }
  async createDesignation(d: InsertDesignation): Promise<Designation> {
    const id = await this.nextId("designations");
    const item = { ...d, id, isActive: d.isActive ?? true, createdAt: new Date().toISOString() };
    await this.putItem("designations", item); return item as Designation;
  }
  async updateDesignation(id: number, d: Partial<InsertDesignation>) { return this.updateItem("designations", id, d); }
  async deleteDesignation(id: number) { return this.deleteItem("designations", id); }

  // ── HRMS: EMPLOYEES ───────────────────────────────────────────────────────
  async getAllEmployees(companyId?: number) { return this.scanByCompany("employees", companyId); }
  async getEmployee(id: number) { return this.getById("employees", id); }
  async createEmployee(e: InsertEmployee): Promise<Employee> {
    const id = await this.nextId("employees");
    const item = { ...e, id, isActive: (e as any).isActive ?? true, createdAt: new Date().toISOString() };
    await this.putItem("employees", item); return item as Employee;
  }
  async updateEmployee(id: number, e: Partial<InsertEmployee>) { return this.updateItem("employees", id, e); }
  async deleteEmployee(id: number) { return this.deleteItem("employees", id); }

  // ── HRMS: ATTENDANCE ──────────────────────────────────────────────────────
  async getAllAttendance(companyId?: number) { return this.scanByCompany("attendance", companyId); }
  async getAttendanceByEmployee(employeeId: number) {
    const all = await this.scanAll("attendance");
    return all.filter(a => a.employeeId === employeeId);
  }
  async createAttendance(a: InsertAttendance): Promise<Attendance> {
    const id = await this.nextId("attendance");
    const item = { ...a, id, createdAt: new Date().toISOString() };
    await this.putItem("attendance", item); return item as Attendance;
  }
  async updateAttendance(id: number, a: Partial<InsertAttendance>) { return this.updateItem("attendance", id, a); }
  async deleteAttendance(id: number) { return this.deleteItem("attendance", id); }

  // ── HRMS: LEAVE TYPES ─────────────────────────────────────────────────────
  async getAllLeaveTypes(companyId?: number) { return this.scanByCompany("leave_types", companyId); }
  async createLeaveType(t: InsertLeaveType): Promise<LeaveType> {
    const id = await this.nextId("leave_types");
    const item = { ...t, id, createdAt: new Date().toISOString() };
    await this.putItem("leave_types", item); return item as LeaveType;
  }
  async updateLeaveType(id: number, t: Partial<InsertLeaveType>) { return this.updateItem("leave_types", id, t); }
  async deleteLeaveType(id: number) { return this.deleteItem("leave_types", id); }

  // ── HRMS: LEAVE REQUESTS ──────────────────────────────────────────────────
  async getAllLeaveRequests(companyId?: number) { return this.scanByCompany("leave_requests", companyId); }
  async getLeaveRequest(id: number) { return this.getById("leave_requests", id); }
  async createLeaveRequest(r: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = await this.nextId("leave_requests");
    const item = { ...r, id, createdAt: new Date().toISOString() };
    await this.putItem("leave_requests", item); return item as LeaveRequest;
  }
  async updateLeaveRequest(id: number, r: Partial<InsertLeaveRequest>) { return this.updateItem("leave_requests", id, r); }
  async deleteLeaveRequest(id: number) { return this.deleteItem("leave_requests", id); }

  // ── HRMS: PAYSLIPS ────────────────────────────────────────────────────────
  async getAllPayslips(companyId?: number) { return this.scanByCompany("payslips", companyId); }
  async getPayslip(id: number) { return this.getById("payslips", id); }
  async createPayslip(p: InsertPayslip): Promise<Payslip> {
    const id = await this.nextId("payslips");
    const item = { ...p, id, createdAt: new Date().toISOString() };
    await this.putItem("payslips", item); return item as Payslip;
  }
  async updatePayslip(id: number, p: Partial<InsertPayslip>) { return this.updateItem("payslips", id, p); }
  async deletePayslip(id: number) { return this.deleteItem("payslips", id); }

  // ── INVENTORY: WAREHOUSES ─────────────────────────────────────────────────
  async getAllWarehouses(companyId?: number) { return this.scanByCompany("warehouses", companyId); }
  async getWarehouse(id: number) { return this.getById("warehouses", id); }
  async createWarehouse(w: InsertWarehouse): Promise<Warehouse> {
    const id = await this.nextId("warehouses");
    const item = { ...w, id, isActive: (w as any).isActive ?? true, createdAt: new Date().toISOString() };
    await this.putItem("warehouses", item); return item as Warehouse;
  }
  async updateWarehouse(id: number, w: Partial<InsertWarehouse>) { return this.updateItem("warehouses", id, w); }
  async deleteWarehouse(id: number) { return this.deleteItem("warehouses", id); }

  // ── INVENTORY: STOCK LOCATIONS ────────────────────────────────────────────
  async getAllStockLocations(companyId?: number) { return this.scanByCompany("stock_locations", companyId); }
  async getStockLocation(id: number) { return this.getById("stock_locations", id); }
  async createStockLocation(l: InsertStockLocation): Promise<StockLocation> {
    const id = await this.nextId("stock_locations");
    const item = { ...l, id, isActive: (l as any).isActive ?? true, createdAt: new Date().toISOString() };
    await this.putItem("stock_locations", item); return item as StockLocation;
  }
  async updateStockLocation(id: number, l: Partial<InsertStockLocation>) { return this.updateItem("stock_locations", id, l); }
  async deleteStockLocation(id: number) { return this.deleteItem("stock_locations", id); }

  // ── INVENTORY: STOCK QUANTS ───────────────────────────────────────────────
  async getAllStockQuants(companyId?: number) { return this.scanByCompany("stock_quants", companyId); }
  async getStockQuantsByItem(itemId: string) {
    const all = await this.scanAll("stock_quants");
    return all.filter(q => q.itemId === itemId);
  }
  async createStockQuant(q: InsertStockQuant): Promise<StockQuant> {
    const id = await this.nextId("stock_quants");
    const item = { ...q, id, updatedAt: new Date().toISOString() };
    await this.putItem("stock_quants", item); return item as StockQuant;
  }
  async updateStockQuant(id: number, q: Partial<InsertStockQuant>) { return this.updateItem("stock_quants", id, q); }
  async deleteStockQuant(id: number) { return this.deleteItem("stock_quants", id); }

  // ── INVENTORY: STOCK MOVES ────────────────────────────────────────────────
  async getAllStockMoves(companyId?: number) { return this.scanByCompany("stock_moves", companyId); }
  async createStockMove(m: InsertStockMove): Promise<StockMove> {
    const id = await this.nextId("stock_moves");
    const item = { ...m, id, createdAt: new Date().toISOString() };
    await this.putItem("stock_moves", item);
    await this.applyStockMove(item as StockMove);
    return item as StockMove;
  }
  async deleteStockMove(id: number) { return this.deleteItem("stock_moves", id); }

  private async applyStockMove(move: StockMove) {
    const fromLoc = await this.getById("stock_locations", move.fromLocationId);
    const toLoc = await this.getById("stock_locations", move.toLocationId);
    const isInternal = (l: any) => l && l.locationType === "internal";
    const qty = move.quantity;
    const sign = isInternal(toLoc) ? 1 : isInternal(fromLoc) ? -1 : 0;
    if (sign === 0) return;
    const invItem = await this.getById("inventory", Number(move.itemId));
    if (invItem) {
      await this.updateItem("inventory", invItem.id, { quantity: (invItem.quantity || 0) + sign * qty });
    }
  }

  // ── INVENTORY: STOCK TRANSFERS ────────────────────────────────────────────
  async getAllStockTransfers(companyId?: number) { return this.scanByCompany("stock_transfers", companyId); }
  async getStockTransfer(id: number) { return this.getById("stock_transfers", id); }
  async createStockTransfer(t: InsertStockTransfer): Promise<StockTransfer> {
    const id = await this.nextId("stock_transfers");
    const item = { ...t, id, createdAt: new Date().toISOString() };
    await this.putItem("stock_transfers", item); return item as StockTransfer;
  }
  async updateStockTransfer(id: number, t: Partial<InsertStockTransfer>) { return this.updateItem("stock_transfers", id, t); }
  async deleteStockTransfer(id: number) { return this.deleteItem("stock_transfers", id); }
  async validateStockTransfer(id: number): Promise<StockTransfer | undefined> {
    const transfer = await this.getById("stock_transfers", id);
    if (!transfer) return undefined;
    const items = Array.isArray(transfer.items) ? transfer.items : [];
    for (const line of items) {
      await this.createStockMove({
        companyId: transfer.companyId,
        itemId: String(line.itemId),
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        quantity: line.quantity,
        reference: transfer.name,
        moveType: transfer.transferType || "internal",
        status: "done",
        createdBy: transfer.createdBy || "system",
      } as any);
    }
    return this.updateItem("stock_transfers", id, { status: "done", doneAt: new Date().toISOString() });
  }

  // ── INVENTORY: REORDER RULES ──────────────────────────────────────────────
  async getAllReorderRules(companyId?: number) { return this.scanByCompany("reorder_rules", companyId); }
  async createReorderRule(r: InsertReorderRule): Promise<ReorderRule> {
    const id = await this.nextId("reorder_rules");
    const item = { ...r, id, isActive: (r as any).isActive ?? true, createdAt: new Date().toISOString() };
    await this.putItem("reorder_rules", item); return item as ReorderRule;
  }
  async updateReorderRule(id: number, r: Partial<InsertReorderRule>) { return this.updateItem("reorder_rules", id, r); }
  async deleteReorderRule(id: number) { return this.deleteItem("reorder_rules", id); }

  // ── MANUFACTURING FORECASTS ───────────────────────────────────────────────
  async getAllManufacturingForecasts(companyId?: number) { return this.scanByCompany("mfg_forecasts", companyId); }
  async createManufacturingForecast(f: InsertManufacturingForecast): Promise<ManufacturingForecast> {
    const id = await this.nextId("mfg_forecasts");
    const item = { ...f, id, createdAt: new Date().toISOString() };
    await this.putItem("mfg_forecasts", item); return item as ManufacturingForecast;
  }
  async updateManufacturingForecast(id: number, f: Partial<InsertManufacturingForecast>) { return this.updateItem("mfg_forecasts", id, f); }
  async deleteManufacturingForecast(id: number) { return this.deleteItem("mfg_forecasts", id); }

  // ── MANUFACTURING (new) ───────────────────────────────────────────────────
  async getAllWorkCentres(companyId?: number) { return companyId ? this.scanByCompany("work_centres", companyId) : this.scanAll("work_centres"); }
  async createWorkCentre(w: any) { const id = await this.nextId("work_centres"); const item = { id, createdAt: new Date().toISOString(), ...w }; await this.putItem("work_centres", item); return item; }
  async updateWorkCentre(id: number, w: any) { return this.updateItem("work_centres", id, w); }
  async deleteWorkCentre(id: number) { return this.deleteItem("work_centres", id); }
  async getAllBoms(companyId?: number) { return companyId ? this.scanByCompany("bom_headers", companyId) : this.scanAll("bom_headers"); }
  async getBom(id: number) { return this.getById("bom_headers", id); }
  async createBom(b: any) { const id = await this.nextId("bom_headers"); const item = { id, createdAt: new Date().toISOString(), ...b }; await this.putItem("bom_headers", item); return item; }
  async updateBom(id: number, b: any) { return this.updateItem("bom_headers", id, b); }
  async deleteBom(id: number) { return this.deleteItem("bom_headers", id); }
  async getAllBomLines(bomId: number) { const all = await this.scanAll("bom_lines"); return all.filter((l: any) => l.bomId === bomId); }
  async createBomLine(l: any) { const id = await this.nextId("bom_lines"); const item = { id, createdAt: new Date().toISOString(), ...l }; await this.putItem("bom_lines", item); return item; }
  async updateBomLine(id: number, l: any) { return this.updateItem("bom_lines", id, l); }
  async deleteBomLine(id: number) { return this.deleteItem("bom_lines", id); }
  async getAllProductionOrders(companyId?: number) { return companyId ? this.scanByCompany("production_orders", companyId) : this.scanAll("production_orders"); }
  async getProductionOrder(id: number) { return this.getById("production_orders", id); }
  async createProductionOrder(o: any) { const id = await this.nextId("production_orders"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...o }; await this.putItem("production_orders", item); return item; }
  async updateProductionOrder(id: number, o: any) { return this.updateItem("production_orders", id, o); }
  async deleteProductionOrder(id: number) { return this.deleteItem("production_orders", id); }
  async confirmProductionOrder(id: number) {
    const order = await this.getProductionOrder(id);
    if (!order) return undefined;
    const lines: any[] = order.lines || [];
    for (const line of lines) {
      if (line.inventoryId) {
        const inv = await this.getInventoryItem(line.inventoryId);
        if (inv) await this.updateInventoryItem(line.inventoryId, { quantity: Math.max(0, (inv.quantity || 0) - (line.quantity || 0)) });
      }
    }
    return this.updateItem("production_orders", id, { status: 'confirmed' });
  }

  // ── PURCHASING (new) ─────────────────────────────────────────────────────
  async getAllRfqs(companyId?: number) { return companyId ? this.scanByCompany("rfqs", companyId) : this.scanAll("rfqs"); }
  async getRfq(id: number) { return this.getById("rfqs", id); }
  async createRfq(r: any) { const id = await this.nextId("rfqs"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...r }; await this.putItem("rfqs", item); return item; }
  async updateRfq(id: number, r: any) { return this.updateItem("rfqs", id, r); }
  async deleteRfq(id: number) { return this.deleteItem("rfqs", id); }
  async getAllGrns(companyId?: number) { return companyId ? this.scanByCompany("grns", companyId) : this.scanAll("grns"); }
  async getGrn(id: number) { return this.getById("grns", id); }
  async createGrn(g: any) { const id = await this.nextId("grns"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...g }; await this.putItem("grns", item); return item; }
  async updateGrn(id: number, g: any) { return this.updateItem("grns", id, g); }
  async deleteGrn(id: number) { return this.deleteItem("grns", id); }
  async validateGrn(id: number) {
    const grn = await this.getGrn(id);
    if (!grn) return undefined;
    const items: any[] = grn.items || [];
    for (const item of items) {
      if (item.inventoryId) {
        const inv = await this.getInventoryItem(item.inventoryId);
        if (inv) await this.updateInventoryItem(item.inventoryId, { quantity: (inv.quantity || 0) + (item.receivedQty || 0) });
      }
    }
    return this.updateItem("grns", id, { status: 'validated' });
  }

  // ── SALES (new) ──────────────────────────────────────────────────────────
  async getAllDeliveryOrders(companyId?: number) { return companyId ? this.scanByCompany("delivery_orders", companyId) : this.scanAll("delivery_orders"); }
  async getDeliveryOrder(id: number) { return this.getById("delivery_orders", id); }
  async createDeliveryOrder(d: any) { const id = await this.nextId("delivery_orders"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...d }; await this.putItem("delivery_orders", item); return item; }
  async updateDeliveryOrder(id: number, d: any) { return this.updateItem("delivery_orders", id, d); }
  async deleteDeliveryOrder(id: number) { return this.deleteItem("delivery_orders", id); }
  async validateDeliveryOrder(id: number) {
    const order = await this.getDeliveryOrder(id);
    if (!order) return undefined;
    const items: any[] = order.items || [];
    for (const item of items) {
      if (item.inventoryId) {
        const inv = await this.getInventoryItem(item.inventoryId);
        if (inv) await this.updateInventoryItem(item.inventoryId, { quantity: Math.max(0, (inv.quantity || 0) - (item.doneQty || 0)) });
      }
    }
    return this.updateItem("delivery_orders", id, { status: 'done' });
  }
  async getAllPriceLists(companyId?: number) { return companyId ? this.scanByCompany("price_lists", companyId) : this.scanAll("price_lists"); }
  async createPriceList(p: any) { const id = await this.nextId("price_lists"); const item = { id, createdAt: new Date().toISOString(), ...p }; await this.putItem("price_lists", item); return item; }
  async updatePriceList(id: number, p: any) { return this.updateItem("price_lists", id, p); }
  async deletePriceList(id: number) { return this.deleteItem("price_lists", id); }

  // ── HR (new) ─────────────────────────────────────────────────────────────
  async getAllAppraisals(companyId?: number) { return companyId ? this.scanByCompany("appraisals", companyId) : this.scanAll("appraisals"); }
  async getAppraisal(id: number) { return this.getById("appraisals", id); }
  async createAppraisal(a: any) { const id = await this.nextId("appraisals"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...a }; await this.putItem("appraisals", item); return item; }
  async updateAppraisal(id: number, a: any) { return this.updateItem("appraisals", id, a); }
  async deleteAppraisal(id: number) { return this.deleteItem("appraisals", id); }
  async getAllExpenseClaims(companyId?: number) { return companyId ? this.scanByCompany("expense_claims", companyId) : this.scanAll("expense_claims"); }
  async getExpenseClaim(id: number) { return this.getById("expense_claims", id); }
  async createExpenseClaim(e: any) { const id = await this.nextId("expense_claims"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...e }; await this.putItem("expense_claims", item); return item; }
  async updateExpenseClaim(id: number, e: any) { return this.updateItem("expense_claims", id, e); }
  async deleteExpenseClaim(id: number) { return this.deleteItem("expense_claims", id); }
  async getAllJobPositions(companyId?: number) { return companyId ? this.scanByCompany("job_positions", companyId) : this.scanAll("job_positions"); }
  async createJobPosition(p: any) { const id = await this.nextId("job_positions"); const item = { id, createdAt: new Date().toISOString(), ...p }; await this.putItem("job_positions", item); return item; }
  async updateJobPosition(id: number, p: any) { return this.updateItem("job_positions", id, p); }
  async deleteJobPosition(id: number) { return this.deleteItem("job_positions", id); }
  async getAllJobApplications(companyId?: number) { return companyId ? this.scanByCompany("job_applications", companyId) : this.scanAll("job_applications"); }
  async getJobApplication(id: number) { return this.getById("job_applications", id); }
  async createJobApplication(a: any) { const id = await this.nextId("job_applications"); const item = { id, createdAt: new Date().toISOString(), stage: 'new', ...a }; await this.putItem("job_applications", item); return item; }
  async updateJobApplication(id: number, a: any) { return this.updateItem("job_applications", id, a); }
  async deleteJobApplication(id: number) { return this.deleteItem("job_applications", id); }

  // ── FINANCE (new) ────────────────────────────────────────────────────────
  async getAllAccounts(companyId?: number) { return companyId ? this.scanByCompany("chart_of_accounts", companyId) : this.scanAll("chart_of_accounts"); }
  async createAccount(a: any) { const id = await this.nextId("chart_of_accounts"); const item = { id, createdAt: new Date().toISOString(), currentBalance: a.openingBalance ?? 0, isActive: true, ...a }; await this.putItem("chart_of_accounts", item); return item; }
  async updateAccount(id: number, a: any) { return this.updateItem("chart_of_accounts", id, a); }
  async deleteAccount(id: number) { return this.deleteItem("chart_of_accounts", id); }
  async getAllJournalEntries(companyId?: number) { return companyId ? this.scanByCompany("journal_entries", companyId) : this.scanAll("journal_entries"); }
  async getJournalEntry(id: number) { return this.getById("journal_entries", id); }
  async createJournalEntry(e: any) { const id = await this.nextId("journal_entries"); const item = { id, createdAt: new Date().toISOString(), status: 'draft', ...e }; await this.putItem("journal_entries", item); return item; }
  async updateJournalEntry(id: number, e: any) { return this.updateItem("journal_entries", id, e); }
  async deleteJournalEntry(id: number) { return this.deleteItem("journal_entries", id); }
  async postJournalEntry(id: number) {
    const entry = await this.getJournalEntry(id);
    if (!entry) return undefined;
    const lines: any[] = entry.lines || [];
    for (const line of lines) {
      if (line.accountId) {
        const acc = await this.getById("chart_of_accounts", line.accountId);
        if (acc) {
          const type: string = acc.type || '';
          const isDebitNormal = ['assets', 'expense'].includes(type);
          const delta = isDebitNormal
            ? (parseFloat(line.debit) || 0) - (parseFloat(line.credit) || 0)
            : (parseFloat(line.credit) || 0) - (parseFloat(line.debit) || 0);
          await this.updateItem("chart_of_accounts", line.accountId, { currentBalance: (parseFloat(acc.currentBalance) || 0) + delta });
        }
      }
    }
    return this.updateItem("journal_entries", id, { status: 'posted' });
  }
  async getFinancialSummary(companyId?: number) {
    const accs = await this.getAllAccounts(companyId);
    const sum = (type: string) => accs.filter((a: any) => a.type === type).reduce((s: number, a: any) => s + (parseFloat(a.currentBalance) || 0), 0);
    return { assets: sum('assets'), liabilities: sum('liabilities'), equity: sum('equity'), income: sum('income'), expense: sum('expense') };
  }

  // ── CONVERT LEAD TO CUSTOMER ───────────────────────────────────────────────
  async convertLeadToCustomer(leadId: number): Promise<Customer | undefined> {
    const lead = await this.getLead(leadId);
    if (!lead) return undefined;
    const existing = await this.scanAll("customers").then(all => all.find(c => c.email === lead.email));
    if (existing) {
      await this.updateLead(leadId, { status: "converted" } as any);
      return existing;
    }
    const customer = await this.createCustomer({
      companyId: lead.companyId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      country: lead.country || "India",
      gstNumber: lead.gstNumber || "",
      panNumber: lead.panNumber || "",
    } as any);
    await this.updateLead(leadId, { status: "converted" } as any);
    return customer;
  }
}
