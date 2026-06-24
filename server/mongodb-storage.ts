import { Collection, ObjectId } from 'mongodb';
import { connectToMongoDB, getDatabase } from './mongodb';
import {
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  suppliers, type Supplier, type InsertSupplier,
  leads, type Lead, type InsertLead,
  leadDiscussions, type LeadDiscussion, type InsertLeadDiscussion,
  leadCategories, type LeadCategory, type InsertLeadCategory,
  leadSources, type LeadSource, type InsertLeadSource,
  crmStages, type CrmStage, type InsertCrmStage,
  crmLostReasons, type CrmLostReason, type InsertCrmLostReason,
  crmActivities, type CrmActivity, type InsertCrmActivity,
  type CrmEmailTemplate, type InsertCrmEmailTemplate,
  type Department, type InsertDepartment,
  type Designation, type InsertDesignation,
  type Employee, type InsertEmployee,
  type Attendance, type InsertAttendance,
  type LeaveType, type InsertLeaveType,
  type LeaveRequest, type InsertLeaveRequest,
  type Payslip, type InsertPayslip,
  type Warehouse, type InsertWarehouse,
  type StockLocation, type InsertStockLocation,
  type StockQuant, type InsertStockQuant,
  type StockMove, type InsertStockMove,
  type StockTransfer, type InsertStockTransfer,
  type ReorderRule, type InsertReorderRule,
  quotations, type Quotation, type InsertQuotation,
  orders, type Order, type InsertOrder,
  invoices, type Invoice, type InsertInvoice,
  payments, type Payment, type InsertPayment,
  purchaseOrders, type PurchaseOrder, type InsertPurchaseOrder,
  inventory, type Inventory, type InsertInventory,
  manufacturingJobs, type ManufacturingJob, type InsertManufacturingJob,
  tasks, type Task, type InsertTask,
  employeeActivities, type EmployeeActivity, type InsertEmployeeActivity,
  salesTargets, type SalesTarget, type InsertSalesTarget,
  manufacturingForecasts, type ManufacturingForecast, type InsertManufacturingForecast,
  supportTickets, type SupportTicket, type InsertSupportTicket,
  contracts, type Contract, type InsertContract
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { Store as SessionStore } from "express-session";
import bcrypt from 'bcrypt';

const MemoryStore = createMemoryStore(session);

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  deleteCustomer(id: number): Promise<boolean>;

  // Supplier operations
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  getAllSuppliers(): Promise<Supplier[]>;
  deleteSupplier(id: number): Promise<boolean>;

  // Lead operations
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  getAllLeads(): Promise<Lead[]>;
  deleteLead(id: number): Promise<boolean>;
  
  // Lead Discussion operations
  getLeadDiscussions(leadId: number): Promise<LeadDiscussion[]>;
  createLeadDiscussion(discussion: InsertLeadDiscussion): Promise<LeadDiscussion>;
  updateLeadDiscussion(id: number, discussion: Partial<InsertLeadDiscussion>): Promise<LeadDiscussion | undefined>;
  deleteLeadDiscussion(id: number): Promise<boolean>;

  // Lead Category operations
  getAllLeadCategories(): Promise<LeadCategory[]>;
  createLeadCategory(c: InsertLeadCategory): Promise<LeadCategory>;
  updateLeadCategory(id: number, c: Partial<InsertLeadCategory>): Promise<LeadCategory | undefined>;
  deleteLeadCategory(id: number): Promise<boolean>;
  getAllLeadSources(): Promise<LeadSource[]>;
  createLeadSource(c: InsertLeadSource): Promise<LeadSource>;
  updateLeadSource(id: number, c: Partial<InsertLeadSource>): Promise<LeadSource | undefined>;
  deleteLeadSource(id: number): Promise<boolean>;

  // Quotation operations
  getQuotation(id: number): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  getAllQuotations(): Promise<Quotation[]>;
  deleteQuotation(id: number): Promise<boolean>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  deleteOrder(id: number): Promise<boolean>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  deleteInvoice(id: number): Promise<boolean>;

  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  deletePayment(id: number): Promise<boolean>;

  // Purchase Order operations
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, purchaseOrder: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  deletePurchaseOrder(id: number): Promise<boolean>;

  // Inventory operations
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  getAllInventoryItems(): Promise<Inventory[]>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getLowStockItems(): Promise<Inventory[]>;
  getInventoryItemBySku(sku: string): Promise<Inventory | undefined>;

  // Manufacturing Job operations
  getManufacturingJob(id: number): Promise<ManufacturingJob | undefined>;
  createManufacturingJob(job: InsertManufacturingJob): Promise<ManufacturingJob>;
  updateManufacturingJob(id: number, job: Partial<InsertManufacturingJob>): Promise<ManufacturingJob | undefined>;
  getAllManufacturingJobs(): Promise<ManufacturingJob[]>;
  deleteManufacturingJob(id: number): Promise<boolean>;

  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  deleteTask(id: number): Promise<boolean>;

  // Employee Activity operations
  getEmployeeActivity(id: number): Promise<EmployeeActivity | undefined>;
  createEmployeeActivity(activity: InsertEmployeeActivity): Promise<EmployeeActivity>;
  updateEmployeeActivity(id: number, activity: Partial<InsertEmployeeActivity>): Promise<EmployeeActivity | undefined>;
  getAllEmployeeActivities(): Promise<EmployeeActivity[]>;
  deleteEmployeeActivity(id: number): Promise<boolean>;

  // Sales Target operations
  getSalesTarget(id: number): Promise<SalesTarget | undefined>;
  createSalesTarget(target: InsertSalesTarget): Promise<SalesTarget>;
  updateSalesTarget(id: number, target: Partial<InsertSalesTarget>): Promise<SalesTarget | undefined>;
  getAllSalesTargets(): Promise<SalesTarget[]>;
  deleteSalesTarget(id: number): Promise<boolean>;
  getSalesTargetsByPeriod(month: string, year: string): Promise<SalesTarget[]>;

  // Manufacturing Forecast operations
  getManufacturingForecast(id: number): Promise<ManufacturingForecast | undefined>;
  createManufacturingForecast(forecast: InsertManufacturingForecast): Promise<ManufacturingForecast>;
  updateManufacturingForecast(id: number, forecast: Partial<InsertManufacturingForecast>): Promise<ManufacturingForecast | undefined>;
  getAllManufacturingForecasts(): Promise<ManufacturingForecast[]>;
  deleteManufacturingForecast(id: number): Promise<boolean>;
  getManufacturingForecastsByPeriod(month: string, year: string): Promise<ManufacturingForecast[]>;

  // Support Ticket operations
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: number, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  deleteSupportTicket(id: number): Promise<boolean>;

  // Contract operations
  getContract(id: number): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  getAllContracts(): Promise<Contract[]>;
  deleteContract(id: number): Promise<boolean>;

  // Products operations
  getAllProducts(): Promise<any[]>;

  // Raw Materials operations
  getAllRawMaterials(): Promise<any[]>;

  // Quotation Templates operations
  getAllQuotationTemplates(): Promise<any[]>;

  // Captured Leads operations
  getAllCapturedLeads(): Promise<any[]>;

  // Company operations (for pending approvals)
  createCompany(company: any): Promise<any>;
  getAllCompanies(): Promise<any[]>;
  getCompany(id: number | string): Promise<any | undefined>;
  updateCompany(id: number | string, updates: any): Promise<any | undefined>;
  getUsersByCompanyId(companyId: number): Promise<any[]>;

  // Company Settings operations
  getCompanySettings(): Promise<any | undefined>;
  updateCompanySettings(settings: any): Promise<any>;

  // Session store
  sessionStore: SessionStore;
}

export class MongoDBStorage implements IStorage {
  private collections!: {
    users: Collection;
    customers: Collection;
    suppliers: Collection;
    leads: Collection;
    leadDiscussions: Collection;
    leadCategories: Collection;
    leadSources: Collection;
    crmStages: Collection;
    crmLostReasons: Collection;
    crmActivities: Collection;
    crmEmailTemplates: Collection;
    departments: Collection;
    designations: Collection;
    employees: Collection;
    attendance: Collection;
    leaveTypes: Collection;
    leaveRequests: Collection;
    payslips: Collection;
    warehouses: Collection;
    stockLocations: Collection;
    stockQuants: Collection;
    stockMoves: Collection;
    stockTransfers: Collection;
    reorderRules: Collection;
    quotations: Collection;
    orders: Collection;
    invoices: Collection;
    payments: Collection;
    purchaseOrders: Collection;
    inventory: Collection;
    manufacturingJobs: Collection;
    tasks: Collection;
    employeeActivities: Collection;
    salesTargets: Collection;
    manufacturingForecasts: Collection;
    supportTickets: Collection;
    contracts: Collection;
    companySettings: Collection;
  };

  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async initialize(): Promise<void> {
    const db = await connectToMongoDB();
    
    this.collections = {
      users: db.collection('users'),
      customers: db.collection('customers'),
      suppliers: db.collection('suppliers'),
      leads: db.collection('leads'),
      leadDiscussions: db.collection('leadDiscussions'),
      leadCategories: db.collection('leadCategories'),
      leadSources: db.collection('leadSources'),
      crmStages: db.collection('crmStages'),
      crmLostReasons: db.collection('crmLostReasons'),
      crmActivities: db.collection('crmActivities'),
      crmEmailTemplates: db.collection('crmEmailTemplates'),
      departments: db.collection('departments'),
      designations: db.collection('designations'),
      employees: db.collection('employees'),
      attendance: db.collection('attendance'),
      leaveTypes: db.collection('leaveTypes'),
      leaveRequests: db.collection('leaveRequests'),
      payslips: db.collection('payslips'),
      warehouses: db.collection('warehouses'),
      stockLocations: db.collection('stockLocations'),
      stockQuants: db.collection('stockQuants'),
      stockMoves: db.collection('stockMoves'),
      stockTransfers: db.collection('stockTransfers'),
      reorderRules: db.collection('reorderRules'),
      quotations: db.collection('quotations'),
      orders: db.collection('orders'),
      invoices: db.collection('invoices'),
      payments: db.collection('payments'),
      purchaseOrders: db.collection('purchaseOrders'),
      inventory: db.collection('inventory'),
      manufacturingJobs: db.collection('manufacturingJobs'),
      tasks: db.collection('tasks'),
      employeeActivities: db.collection('employeeActivities'),
      salesTargets: db.collection('salesTargets'),
      manufacturingForecasts: db.collection('manufacturingForecasts'),
      supportTickets: db.collection('supportTickets'),
      contracts: db.collection('contracts'),
      companySettings: db.collection('company_settings'),
      channels: db.collection('reckonix_channels'),
      channelMessages: db.collection('reckonix_channel_messages'),
      clockPunches: db.collection('reckonix_clock_punches'),
    };

    // Create indexes for better performance
    await this.createIndexes();
    
    // Create default admin user if it doesn't exist
    await this.createDefaultAdminUser();
  }

  private async createIndexes(): Promise<void> {
    // Create indexes for frequently queried fields
    await this.collections.users.createIndex({ username: 1 }, { unique: true });
    await this.collections.customers.createIndex({ email: 1 });
    await this.collections.leads.createIndex({ email: 1 });
    await this.collections.orders.createIndex({ orderNumber: 1 }, { unique: true });
    await this.collections.inventory.createIndex({ sku: 1 }, { unique: true });
    await this.collections.leadDiscussions.createIndex({ leadId: 1 });
  }

  private async createDefaultAdminUser(): Promise<void> {
    const existingAdmin = await this.getUserByUsername('admin');
    if (!existingAdmin) {
      const hashPassword = async (password: string) => {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
      };

      const hashedPassword = await hashPassword('admin123');
      
      const adminUser: InsertUser = {
        username: 'admin',
        password: hashedPassword,
        name: 'System Administrator',
        email: 'admin@businessai.com',
        role: 'admin',
        isActive: true,
        lastLogin: null,
      };

      await this.createUser(adminUser);
      console.log('✅ Default admin user created');
    }
  }

  // Helper to get the next sequential ID for a collection
  private async getNextSequenceValue(sequenceName: string): Promise<number> {
    const db = getDatabase();
    const sequenceCollection = db.collection('counters');
    const sequenceDocument = await sequenceCollection.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { sequence_value: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    return sequenceDocument?.sequence_value ?? 1;
  }

  // Helper method to convert MongoDB ObjectId to number ID
  private convertToNumberId(id: any): number {
    if (typeof id === 'string') {
      // If it's a MongoDB ObjectId string, extract numeric part
      if (id.length === 24) {
        // Try to find a numeric ID field in the document
        return parseInt(id.substring(18, 24), 16) || parseInt(id.substring(0, 8), 16);
      }
      return parseInt(id);
    }
    return id;
  }

  // Helper method to convert number ID to MongoDB ObjectId
  private convertToObjectId(id: number): ObjectId {
    // For MongoDB, we need to find documents by their numeric ID field
    // Since MongoDB uses ObjectId but we need to find by numeric ID
    // We'll use a different approach - find by the 'id' field instead of '_id'
    throw new Error('Use findById instead of convertToObjectId');
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.collections.users.findOne({ id });
    return result ? { ...result, id: result.id } as User : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.collections.users.findOne({ username });
    return result ? { ...result, id: result.id } as User : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.collections.users.insertOne({
      ...user,
      id: user.id || Date.now(), // Use provided ID or generate one
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...user,
      id: user.id || Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
  }

  async getAllUsers(): Promise<User[]> {
    const results = await this.collections.users.find().toArray();
    return results.map(user => ({
      ...user,
      id: user.id,
    })) as User[];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.collections.users.findOneAndUpdate(
      { id },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result ? { ...result, id: result.id } as User : undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.collections.users.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await this.collections.customers.findOne({ id });
    return result ? { ...result, id: result.id } as Customer : undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await this.collections.customers.insertOne({
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...customer,
      id: this.convertToNumberId(result.insertedId),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Customer;
  }

  async updateCustomer(id: number, customerUpdate: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await this.collections.customers.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...customerUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: result.id } as Customer : undefined;
  }

  async getAllCustomers(): Promise<Customer[]> {
    const results = await this.collections.customers.find().toArray();
    return results.map(customer => ({
      ...customer,
      id: this.convertToNumberId(customer._id),
    })) as Customer[];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await this.collections.customers.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Lead operations
  async getLead(id: number): Promise<Lead | undefined> {
    const result = await this.collections.leads.findOne({ id });
    return result ? { ...result, id: result.id } as Lead : undefined;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await this.collections.leads.insertOne({
      ...lead,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...lead,
      id: this.convertToNumberId(result.insertedId),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Lead;
  }

  async updateLead(id: number, leadUpdate: Partial<InsertLead>): Promise<Lead | undefined> {
    const result = await this.collections.leads.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...leadUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: result.id } as Lead : undefined;
  }

  async getAllLeads(): Promise<Lead[]> {
    const results = await this.collections.leads.find().toArray();
    return results.map(lead => {
      const { _id, ...leadData } = lead;
      return {
        ...leadData,
        id: lead.id,
      } as Lead;
    });
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await this.collections.leads.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Lead Category operations
  async getAllLeadCategories(): Promise<LeadCategory[]> {
    const results = await this.collections.leadCategories.find().toArray();
    return results.map(category => {
      const { _id, ...categoryData } = category;
      return {
        ...categoryData,
        id: category.id,
      } as LeadCategory;
    });
  }

  async createLeadCategory(category: InsertLeadCategory): Promise<LeadCategory> {
    const result = await this.collections.leadCategories.insertOne({
      ...category,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...category,
      id: result.insertedId.toString(),
    } as LeadCategory;
  }

  async updateLeadCategory(id: number, categoryUpdate: Partial<InsertLeadCategory>): Promise<LeadCategory | undefined> {
    const result = await this.collections.leadCategories.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...categoryUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: result.id } as LeadCategory : undefined;
  }

  async deleteLeadCategory(id: number): Promise<boolean> {
    const result = await this.collections.leadCategories.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getAllLeadSources(): Promise<LeadSource[]> {
    const results = await this.collections.leadSources.find().toArray();
    return results.map(source => {
      const { _id, ...sourceData } = source;
      return {
        ...sourceData,
        id: this.convertToNumberId(source._id || source.id),
      } as LeadSource;
    });
  }

  async createLeadSource(source: InsertLeadSource): Promise<LeadSource> {
    // Get the next ID
    const allSources = await this.getAllLeadSources();
    const maxId = allSources.length > 0 ? Math.max(...allSources.map(s => typeof s.id === 'number' ? s.id : parseInt(String(s.id)) || 0)) : 0;
    const nextId = maxId + 1;
    
    const result = await this.collections.leadSources.insertOne({
      ...source,
      id: nextId,
      createdAt: new Date(),
    });
    
    return {
      ...source,
      id: nextId,
      createdAt: new Date(),
    } as LeadSource;
  }

  async updateLeadSource(id: number, sourceUpdate: Partial<InsertLeadSource>): Promise<LeadSource | undefined> {
    const result = await this.collections.leadSources.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...sourceUpdate,
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: result.id } as LeadSource : undefined;
  }

  async deleteLeadSource(id: number): Promise<boolean> {
    const result = await this.collections.leadSources.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // CRM Pipeline Stage operations
  async getAllCrmStages(companyId?: number): Promise<CrmStage[]> {
    const query = companyId ? { companyId } : {};
    const results = await this.collections.crmStages.find(query).sort({ sequence: 1 }).toArray();
    return results.map(({ _id, ...rest }) => ({ ...rest, id: rest.id })) as CrmStage[];
  }

  async createCrmStage(stage: InsertCrmStage): Promise<CrmStage> {
    const id = await this.getNextSequenceValue('crmStages');
    const doc = {
      ...stage,
      id,
      sequence: stage.sequence ?? id,
      probability: stage.probability ?? 0,
      isWon: stage.isWon ?? false,
      isActive: stage.isActive ?? true,
      createdAt: new Date(),
    };
    await this.collections.crmStages.insertOne(doc);
    return { ...doc } as CrmStage;
  }

  async updateCrmStage(id: number, update: Partial<InsertCrmStage>): Promise<CrmStage | undefined> {
    const result = await this.collections.crmStages.findOneAndUpdate(
      { id },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? ({ ...result, id: result.id } as CrmStage) : undefined;
  }

  async deleteCrmStage(id: number): Promise<boolean> {
    const result = await this.collections.crmStages.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // CRM Lost Reason operations
  async getAllCrmLostReasons(companyId?: number): Promise<CrmLostReason[]> {
    const query = companyId ? { companyId } : {};
    const results = await this.collections.crmLostReasons.find(query).toArray();
    return results.map(({ _id, ...rest }) => ({ ...rest, id: rest.id })) as CrmLostReason[];
  }

  async createCrmLostReason(reason: InsertCrmLostReason): Promise<CrmLostReason> {
    const id = await this.getNextSequenceValue('crmLostReasons');
    const doc = {
      ...reason,
      id,
      isActive: reason.isActive ?? true,
      createdAt: new Date(),
    };
    await this.collections.crmLostReasons.insertOne(doc);
    return { ...doc } as CrmLostReason;
  }

  async updateCrmLostReason(id: number, update: Partial<InsertCrmLostReason>): Promise<CrmLostReason | undefined> {
    const result = await this.collections.crmLostReasons.findOneAndUpdate(
      { id },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? ({ ...result, id: result.id } as CrmLostReason) : undefined;
  }

  async deleteCrmLostReason(id: number): Promise<boolean> {
    const result = await this.collections.crmLostReasons.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // CRM Activity operations
  async getCrmActivities(leadId: number): Promise<CrmActivity[]> {
    const results = await this.collections.crmActivities.find({ leadId }).sort({ createdAt: -1 }).toArray();
    return results.map(({ _id, ...rest }) => ({ ...rest, id: rest.id })) as CrmActivity[];
  }

  async getAllCrmActivities(companyId?: number): Promise<CrmActivity[]> {
    const query = companyId ? { companyId } : {};
    const results = await this.collections.crmActivities.find(query).sort({ createdAt: -1 }).toArray();
    return results.map(({ _id, ...rest }) => ({ ...rest, id: rest.id })) as CrmActivity[];
  }

  async createCrmActivity(activity: InsertCrmActivity): Promise<CrmActivity> {
    const id = await this.getNextSequenceValue('crmActivities');
    const doc = {
      ...activity,
      id,
      activityType: activity.activityType ?? 'todo',
      status: activity.status ?? 'planned',
      createdAt: new Date(),
    };
    await this.collections.crmActivities.insertOne(doc);
    return { ...doc } as CrmActivity;
  }

  async updateCrmActivity(id: number, update: Partial<InsertCrmActivity>): Promise<CrmActivity | undefined> {
    const result = await this.collections.crmActivities.findOneAndUpdate(
      { id },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? ({ ...result, id: result.id } as CrmActivity) : undefined;
  }

  async deleteCrmActivity(id: number): Promise<boolean> {
    const result = await this.collections.crmActivities.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // CRM Email Templates
  async getCrmEmailTemplates(companyId?: number): Promise<CrmEmailTemplate[]> {
    const docs = await this.collections.crmEmailTemplates.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<CrmEmailTemplate>(docs);
  }
  async createCrmEmailTemplate(insert: InsertCrmEmailTemplate): Promise<CrmEmailTemplate> {
    const id = await this.getNextSequenceValue('crmEmailTemplates');
    const doc = { ...insert, id, category: insert.category ?? 'general', isActive: insert.isActive ?? true, createdAt: new Date() };
    await this.collections.crmEmailTemplates.insertOne(doc);
    return doc as CrmEmailTemplate;
  }
  async updateCrmEmailTemplate(id: number, updates: Partial<InsertCrmEmailTemplate>): Promise<CrmEmailTemplate | undefined> {
    const result = await this.collections.crmEmailTemplates.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as CrmEmailTemplate) : undefined;
  }
  async deleteCrmEmailTemplate(id: number): Promise<boolean> {
    const result = await this.collections.crmEmailTemplates.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // ==================== HRMS ====================
  private mapDocs<T>(docs: any[]): T[] {
    return docs.map(({ _id, ...rest }) => ({ ...rest, id: rest.id })) as T[];
  }

  // Departments
  async getAllDepartments(companyId?: number): Promise<Department[]> {
    const docs = await this.collections.departments.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<Department>(docs);
  }
  async getDepartment(id: number): Promise<Department | undefined> {
    const doc = await this.collections.departments.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as Department) : undefined;
  }
  async createDepartment(d: InsertDepartment): Promise<Department> {
    const id = await this.getNextSequenceValue('departments');
    const doc = { ...d, id, isActive: d.isActive ?? true, createdAt: new Date() };
    await this.collections.departments.insertOne(doc);
    return doc as Department;
  }
  async updateDepartment(id: number, update: Partial<InsertDepartment>): Promise<Department | undefined> {
    const result = await this.collections.departments.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as Department) : undefined;
  }
  async deleteDepartment(id: number): Promise<boolean> {
    return (await this.collections.departments.deleteOne({ id })).deletedCount > 0;
  }

  // Designations
  async getAllDesignations(companyId?: number): Promise<Designation[]> {
    const docs = await this.collections.designations.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<Designation>(docs);
  }
  async getDesignation(id: number): Promise<Designation | undefined> {
    const doc = await this.collections.designations.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as Designation) : undefined;
  }
  async createDesignation(d: InsertDesignation): Promise<Designation> {
    const id = await this.getNextSequenceValue('designations');
    const doc = { ...d, id, isActive: d.isActive ?? true, createdAt: new Date() };
    await this.collections.designations.insertOne(doc);
    return doc as Designation;
  }
  async updateDesignation(id: number, update: Partial<InsertDesignation>): Promise<Designation | undefined> {
    const result = await this.collections.designations.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as Designation) : undefined;
  }
  async deleteDesignation(id: number): Promise<boolean> {
    return (await this.collections.designations.deleteOne({ id })).deletedCount > 0;
  }

  // Employees
  async getAllEmployees(companyId?: number): Promise<Employee[]> {
    const docs = await this.collections.employees.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<Employee>(docs);
  }
  async getEmployee(id: number): Promise<Employee | undefined> {
    const doc = await this.collections.employees.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as Employee) : undefined;
  }
  async createEmployee(e: InsertEmployee): Promise<Employee> {
    const id = await this.getNextSequenceValue('employees');
    const doc = { ...e, id, status: e.status ?? 'active', employmentType: e.employmentType ?? 'full_time', createdAt: new Date() };
    await this.collections.employees.insertOne(doc);
    return doc as Employee;
  }
  async updateEmployee(id: number, update: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await this.collections.employees.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as Employee) : undefined;
  }
  async deleteEmployee(id: number): Promise<boolean> {
    return (await this.collections.employees.deleteOne({ id })).deletedCount > 0;
  }

  // Attendance
  async getAllAttendance(companyId?: number): Promise<Attendance[]> {
    const docs = await this.collections.attendance.find(companyId ? { companyId } : {}).sort({ date: -1 }).toArray();
    return this.mapDocs<Attendance>(docs);
  }
  async getAttendanceByEmployee(employeeId: number): Promise<Attendance[]> {
    const docs = await this.collections.attendance.find({ employeeId }).sort({ date: -1 }).toArray();
    return this.mapDocs<Attendance>(docs);
  }
  async createAttendance(a: InsertAttendance): Promise<Attendance> {
    const id = await this.getNextSequenceValue('attendance');
    const doc = { ...a, id, status: a.status ?? 'present', createdAt: new Date() };
    await this.collections.attendance.insertOne(doc);
    return doc as Attendance;
  }
  async updateAttendance(id: number, update: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const result = await this.collections.attendance.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as Attendance) : undefined;
  }
  async deleteAttendance(id: number): Promise<boolean> {
    return (await this.collections.attendance.deleteOne({ id })).deletedCount > 0;
  }

  // Leave Types
  async getAllLeaveTypes(companyId?: number): Promise<LeaveType[]> {
    const docs = await this.collections.leaveTypes.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<LeaveType>(docs);
  }
  async createLeaveType(t: InsertLeaveType): Promise<LeaveType> {
    const id = await this.getNextSequenceValue('leaveTypes');
    const doc = { ...t, id, isActive: t.isActive ?? true, isPaid: t.isPaid ?? true, createdAt: new Date() };
    await this.collections.leaveTypes.insertOne(doc);
    return doc as LeaveType;
  }
  async updateLeaveType(id: number, update: Partial<InsertLeaveType>): Promise<LeaveType | undefined> {
    const result = await this.collections.leaveTypes.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as LeaveType) : undefined;
  }
  async deleteLeaveType(id: number): Promise<boolean> {
    return (await this.collections.leaveTypes.deleteOne({ id })).deletedCount > 0;
  }

  // Leave Requests
  async getAllLeaveRequests(companyId?: number): Promise<LeaveRequest[]> {
    const docs = await this.collections.leaveRequests.find(companyId ? { companyId } : {}).sort({ createdAt: -1 }).toArray();
    return this.mapDocs<LeaveRequest>(docs);
  }
  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const doc = await this.collections.leaveRequests.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as LeaveRequest) : undefined;
  }
  async createLeaveRequest(r: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = await this.getNextSequenceValue('leaveRequests');
    const doc = { ...r, id, status: r.status ?? 'pending', createdAt: new Date() };
    await this.collections.leaveRequests.insertOne(doc);
    return doc as LeaveRequest;
  }
  async updateLeaveRequest(id: number, update: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const result = await this.collections.leaveRequests.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as LeaveRequest) : undefined;
  }
  async deleteLeaveRequest(id: number): Promise<boolean> {
    return (await this.collections.leaveRequests.deleteOne({ id })).deletedCount > 0;
  }

  // Payslips
  async getAllPayslips(companyId?: number): Promise<Payslip[]> {
    const docs = await this.collections.payslips.find(companyId ? { companyId } : {}).sort({ periodYear: -1, periodMonth: -1 }).toArray();
    return this.mapDocs<Payslip>(docs);
  }
  async getPayslip(id: number): Promise<Payslip | undefined> {
    const doc = await this.collections.payslips.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as Payslip) : undefined;
  }
  async createPayslip(p: InsertPayslip): Promise<Payslip> {
    const id = await this.getNextSequenceValue('payslips');
    const doc = { ...p, id, status: p.status ?? 'draft', createdAt: new Date() };
    await this.collections.payslips.insertOne(doc);
    return doc as Payslip;
  }
  async updatePayslip(id: number, update: Partial<InsertPayslip>): Promise<Payslip | undefined> {
    const result = await this.collections.payslips.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as Payslip) : undefined;
  }
  async deletePayslip(id: number): Promise<boolean> {
    return (await this.collections.payslips.deleteOne({ id })).deletedCount > 0;
  }

  // ==================== Inventory / Warehouse ====================
  // Warehouses
  async getAllWarehouses(companyId?: number): Promise<Warehouse[]> {
    const docs = await this.collections.warehouses.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<Warehouse>(docs);
  }
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const doc = await this.collections.warehouses.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as Warehouse) : undefined;
  }
  async createWarehouse(w: InsertWarehouse): Promise<Warehouse> {
    const id = await this.getNextSequenceValue('warehouses');
    const doc = { ...w, id, isActive: w.isActive ?? true, createdAt: new Date() };
    await this.collections.warehouses.insertOne(doc);
    return doc as Warehouse;
  }
  async updateWarehouse(id: number, update: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const result = await this.collections.warehouses.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as Warehouse) : undefined;
  }
  async deleteWarehouse(id: number): Promise<boolean> {
    return (await this.collections.warehouses.deleteOne({ id })).deletedCount > 0;
  }

  // Stock Locations
  async getAllStockLocations(companyId?: number): Promise<StockLocation[]> {
    const docs = await this.collections.stockLocations.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<StockLocation>(docs);
  }
  async getStockLocation(id: number): Promise<StockLocation | undefined> {
    const doc = await this.collections.stockLocations.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as StockLocation) : undefined;
  }
  async createStockLocation(l: InsertStockLocation): Promise<StockLocation> {
    const id = await this.getNextSequenceValue('stockLocations');
    const doc = { ...l, id, isActive: l.isActive ?? true, type: l.type ?? 'internal', createdAt: new Date() };
    await this.collections.stockLocations.insertOne(doc);
    return doc as StockLocation;
  }
  async updateStockLocation(id: number, update: Partial<InsertStockLocation>): Promise<StockLocation | undefined> {
    const result = await this.collections.stockLocations.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as StockLocation) : undefined;
  }
  async deleteStockLocation(id: number): Promise<boolean> {
    return (await this.collections.stockLocations.deleteOne({ id })).deletedCount > 0;
  }

  // Stock Quants
  async getAllStockQuants(companyId?: number): Promise<StockQuant[]> {
    const docs = await this.collections.stockQuants.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<StockQuant>(docs);
  }
  async adjustStockQuant(companyId: number | null | undefined, itemId: string, locationId: number, delta: number): Promise<StockQuant> {
    const existing = await this.collections.stockQuants.findOne({ itemId, locationId });
    if (existing) {
      const newQty = (Number(existing.quantity) || 0) + delta;
      await this.collections.stockQuants.updateOne({ id: existing.id }, { $set: { quantity: String(newQty), updatedAt: new Date() } });
      return { ...existing, quantity: String(newQty), id: existing.id } as StockQuant;
    }
    const id = await this.getNextSequenceValue('stockQuants');
    const doc = { id, companyId: companyId ?? null, itemId, locationId, quantity: String(delta), updatedAt: new Date() };
    await this.collections.stockQuants.insertOne(doc);
    return doc as StockQuant;
  }

  private async applyStockMove(move: StockMove): Promise<void> {
    const qty = Number(move.quantity) || 0;
    if (qty <= 0) return;
    const fromLoc = move.fromLocationId ? await this.getStockLocation(move.fromLocationId) : undefined;
    const toLoc = move.toLocationId ? await this.getStockLocation(move.toLocationId) : undefined;
    const fromInternal = fromLoc?.type === 'internal';
    const toInternal = toLoc?.type === 'internal';
    if (fromInternal && move.fromLocationId) await this.adjustStockQuant(move.companyId, move.itemId, move.fromLocationId, -qty);
    if (toInternal && move.toLocationId) await this.adjustStockQuant(move.companyId, move.itemId, move.toLocationId, qty);
    const globalDelta = (toInternal ? qty : 0) - (fromInternal ? qty : 0);
    if (globalDelta !== 0) {
      // Update the inventory item's global quantity directly by ObjectId.
      // (getInventoryItem/updateInventoryItem rely on a stubbed convertToObjectId that throws.)
      try {
        const oid = new ObjectId(String(move.itemId));
        const item = await this.collections.inventory.findOne({ _id: oid });
        if (item) {
          await this.collections.inventory.updateOne({ _id: oid }, { $set: { quantity: (Number(item.quantity) || 0) + globalDelta, updatedAt: new Date() } });
        }
      } catch { /* itemId not a valid ObjectId or item missing — quant ledger is still authoritative */ }
    }
  }

  // Stock Moves
  async getAllStockMoves(companyId?: number): Promise<StockMove[]> {
    const docs = await this.collections.stockMoves.find(companyId ? { companyId } : {}).sort({ createdAt: -1 }).toArray();
    return this.mapDocs<StockMove>(docs);
  }
  async createStockMove(m: InsertStockMove): Promise<StockMove> {
    const id = await this.getNextSequenceValue('stockMoves');
    const doc = { ...m, id, status: m.status ?? 'done', type: m.type ?? 'internal', createdAt: new Date() } as any;
    await this.collections.stockMoves.insertOne(doc);
    if (doc.status === 'done') await this.applyStockMove(doc as StockMove);
    return doc as StockMove;
  }
  async deleteStockMove(id: number): Promise<boolean> {
    return (await this.collections.stockMoves.deleteOne({ id })).deletedCount > 0;
  }

  // Stock Transfers
  async getAllStockTransfers(companyId?: number): Promise<StockTransfer[]> {
    const docs = await this.collections.stockTransfers.find(companyId ? { companyId } : {}).sort({ createdAt: -1 }).toArray();
    return this.mapDocs<StockTransfer>(docs);
  }
  async getStockTransfer(id: number): Promise<StockTransfer | undefined> {
    const doc = await this.collections.stockTransfers.findOne({ id });
    return doc ? ({ ...doc, id: doc.id } as StockTransfer) : undefined;
  }
  async createStockTransfer(t: InsertStockTransfer): Promise<StockTransfer> {
    const id = await this.getNextSequenceValue('stockTransfers');
    const doc = { ...t, id, status: t.status ?? 'draft', type: t.type ?? 'internal', createdAt: new Date() };
    await this.collections.stockTransfers.insertOne(doc);
    return doc as StockTransfer;
  }
  async updateStockTransfer(id: number, update: Partial<InsertStockTransfer>): Promise<StockTransfer | undefined> {
    const result = await this.collections.stockTransfers.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as StockTransfer) : undefined;
  }
  async deleteStockTransfer(id: number): Promise<boolean> {
    return (await this.collections.stockTransfers.deleteOne({ id })).deletedCount > 0;
  }
  async validateStockTransfer(id: number): Promise<StockTransfer | undefined> {
    const transfer = await this.getStockTransfer(id);
    if (!transfer) return undefined;
    if (transfer.status === 'done') return transfer;
    const lines: any[] = Array.isArray(transfer.items) ? transfer.items as any[] : [];
    for (const line of lines) {
      const itemId = line.itemId != null ? String(line.itemId) : "";
      const quantity = Number(line.quantity) || 0;
      if (!itemId || quantity <= 0) continue;
      await this.createStockMove({
        companyId: transfer.companyId,
        transferId: id,
        itemId,
        fromLocationId: transfer.fromLocationId ?? null,
        toLocationId: transfer.toLocationId ?? null,
        quantity: String(quantity),
        type: transfer.type,
        reference: transfer.reference,
        date: transfer.scheduledDate ?? new Date().toISOString().slice(0, 10),
        status: 'done',
      } as any);
    }
    await this.collections.stockTransfers.updateOne({ id }, { $set: { status: 'done', updatedAt: new Date() } });
    return { ...transfer, status: 'done' } as StockTransfer;
  }

  // Reorder Rules
  async getAllReorderRules(companyId?: number): Promise<ReorderRule[]> {
    const docs = await this.collections.reorderRules.find(companyId ? { companyId } : {}).toArray();
    return this.mapDocs<ReorderRule>(docs);
  }
  async createReorderRule(r: InsertReorderRule): Promise<ReorderRule> {
    const id = await this.getNextSequenceValue('reorderRules');
    const doc = { ...r, id, isActive: r.isActive ?? true, createdAt: new Date() };
    await this.collections.reorderRules.insertOne(doc);
    return doc as ReorderRule;
  }
  async updateReorderRule(id: number, update: Partial<InsertReorderRule>): Promise<ReorderRule | undefined> {
    const result = await this.collections.reorderRules.findOneAndUpdate({ id }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' });
    return result ? ({ ...result, id: result.id } as ReorderRule) : undefined;
  }
  async deleteReorderRule(id: number): Promise<boolean> {
    return (await this.collections.reorderRules.deleteOne({ id })).deletedCount > 0;
  }

  // Lead Discussion operations
  async getLeadDiscussions(leadId: number): Promise<LeadDiscussion[]> {
    const results = await this.collections.leadDiscussions
      .find({ leadId })
      .sort({ createdAt: -1 })
      .toArray();
    
    return results.map(discussion => ({
      ...discussion,
      id: this.convertToNumberId(discussion._id),
    })) as LeadDiscussion[];
  }

  async createLeadDiscussion(discussion: InsertLeadDiscussion): Promise<LeadDiscussion> {
    const result = await this.collections.leadDiscussions.insertOne({
      ...discussion,
      createdAt: new Date(),
    });
    
    return {
      ...discussion,
      id: this.convertToNumberId(result.insertedId),
      createdAt: new Date(),
    } as LeadDiscussion;
  }

  async updateLeadDiscussion(id: number, discussionUpdate: Partial<InsertLeadDiscussion>): Promise<LeadDiscussion | undefined> {
    const result = await this.collections.leadDiscussions.findOneAndUpdate(
      { _id: this.convertToObjectId(id) },
      { $set: discussionUpdate },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: this.convertToNumberId(result._id) } as LeadDiscussion : undefined;
  }

  async deleteLeadDiscussion(id: number): Promise<boolean> {
    const result = await this.collections.leadDiscussions.deleteOne({ _id: this.convertToObjectId(id) });
    return result.deletedCount > 0;
  }

  // Quotation operations
  async getQuotation(id: number): Promise<Quotation | undefined> {
    const pipeline = [
      { $match: { id: id } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: 'id',
          as: 'customerDetails'
        }
      },
      {
        $unwind: {
          path: '$customerDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          customerName: '$customerDetails.name',
          customerCompany: '$customerDetails.company',
          customerEmail: '$customerDetails.email',
          customerPhone: '$customerDetails.phone'
        }
      },
      {
        $project: {
          customerDetails: 0 // Remove the joined customerDetails object
        }
      }
    ];

    const results = await this.collections.quotations.aggregate(pipeline).toArray();
    
    if (results.length === 0) {
      return undefined;
    }

    const result = results[0];
    return result ? { ...result, id: result.id } as Quotation : undefined;
  }

  async getQuotationByObjectId(objectId: string): Promise<Quotation | undefined> {
    const result = await this.collections.quotations.findOne({ _id: new ObjectId(objectId) });
    return result ? { ...result, id: result.id } as Quotation : undefined;
  }

  async updateQuotationByObjectId(objectId: string, quotationUpdate: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const result = await this.collections.quotations.findOneAndUpdate(
      { _id: new ObjectId(objectId) },
      { 
        $set: { 
          ...quotationUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: this.convertToNumberId(result._id) } as Quotation : undefined;
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const nextId = await this.getNextSequenceValue('quotationId');
    const quotationData = {
      ...quotation,
      id: nextId, // Add the numeric ID
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collections.quotations.insertOne(quotationData);
    
    return {
      ...quotationData,
      _id: result.insertedId,
    } as Quotation;
  }

  async updateQuotation(id: number, quotationUpdate: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const result = await this.collections.quotations.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...quotationUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: result.id } as Quotation : undefined;
  }

  async getAllQuotations(): Promise<Quotation[]> {
    const results = await this.collections.quotations.find().toArray();
    return results.map(quotation => {
      const { _id, ...quotationData } = quotation;
      return {
        ...quotationData,
        id: quotation.id, // Use the numeric ID field
      } as Quotation;
    });
  }

  async deleteQuotation(id: number): Promise<boolean> {
    const result = await this.collections.quotations.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Delete by MongoDB ObjectId
  async deleteQuotationByObjectId(objectId: string): Promise<boolean> {
    try {
      const result = await this.collections.quotations.deleteOne({ _id: new ObjectId(objectId) });
      return result.deletedCount > 0;
    } catch (err) {
      console.warn('deleteQuotationByObjectId error', err);
      return false;
    }
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const result = await this.collections.orders.findOne({ id });
    if (!result) return undefined;
    const { _id, ...orderData } = result;
    return {
      ...orderData,
      id: this.convertToNumberId(result.id || result._id),
    } as Order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    // Get the next ID
    const allOrders = await this.getAllOrders();
    const maxId = allOrders.length > 0 ? Math.max(...allOrders.map(o => typeof o.id === 'number' ? o.id : parseInt(String(o.id)) || 0)) : 0;
    const nextId = maxId + 1;
    
    const orderData = {
      ...order,
      id: nextId,
      orderNumber: order.orderNumber || `ORD-${new Date().getFullYear()}-${nextId}`,
      customerName: order.customerName || '',
      customerCompany: order.customerCompany || '',
      status: order.status || "processing",
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: order.subtotal || "0",
      taxAmount: order.taxAmount || "0",
      totalAmount: order.totalAmount || order.subtotal || "0",
      createdAt: new Date(),
    };
    
    const result = await this.collections.orders.insertOne(orderData);
    
    return {
      ...orderData,
      id: nextId,
      createdAt: new Date(),
    } as Order;
  }

  async updateOrder(id: number, orderUpdate: Partial<InsertOrder>): Promise<Order | undefined> {
    const result = await this.collections.orders.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...orderUpdate,
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result) return undefined;
    const { _id, ...orderData } = result;
    return {
      ...orderData,
      id: this.convertToNumberId(result.id || result._id),
    } as Order;
  }

  async getAllOrders(): Promise<Order[]> {
    const results = await this.collections.orders.find().toArray();
    return results.map(order => {
      const { _id, ...orderData } = order;
      return {
        ...orderData,
        id: this.convertToNumberId(order.id || order._id),
      };
    }) as Order[];
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await this.collections.orders.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const result = await this.collections.orders.findOne({ orderNumber });
    if (!result) return undefined;
    const { _id, ...orderData } = result;
    return {
      ...orderData,
      id: this.convertToNumberId(result.id || result._id),
    } as Order;
  }

  // Inventory operations
  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const result = await this.collections.inventory.findOne({ _id: this.convertToObjectId(id) });
    return result ? { ...result, id: this.convertToNumberId(result._id) } as Inventory : undefined;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const result = await this.collections.inventory.insertOne({
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...item,
      id: this.convertToNumberId(result.insertedId),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Inventory;
  }

  async updateInventoryItem(id: number, itemUpdate: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const result = await this.collections.inventory.findOneAndUpdate(
      { _id: this.convertToObjectId(id) },
      { 
        $set: { 
          ...itemUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: this.convertToNumberId(result._id) } as Inventory : undefined;
  }

  async getAllInventoryItems(): Promise<Inventory[]> {
    const results = await this.collections.inventory.find().toArray();
    return results.map(item => ({
      ...item,
      id: this.convertToNumberId(item._id),
    })) as Inventory[];
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await this.collections.inventory.deleteOne({ _id: this.convertToObjectId(id) });
    return result.deletedCount > 0;
  }

  async getLowStockItems(): Promise<Inventory[]> {
    const results = await this.collections.inventory
      .find({ 
        $expr: { 
          $lte: ["$quantity", "$reorderLevel"] 
        } 
      })
      .toArray();
    
    return results.map(item => ({
      ...item,
      id: this.convertToNumberId(item._id),
    })) as Inventory[];
  }

  async getInventoryItemBySku(sku: string): Promise<Inventory | undefined> {
    const result = await this.collections.inventory.findOne({ sku });
    return result ? { ...result, id: this.convertToNumberId(result._id) } as Inventory : undefined;
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    const result = await this.collections.tasks.findOne({ _id: this.convertToObjectId(id) });
    return result ? { ...result, id: this.convertToNumberId(result._id) } as Task : undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await this.collections.tasks.insertOne({
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...task,
      id: this.convertToNumberId(result.insertedId),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await this.collections.tasks.findOneAndUpdate(
      { _id: this.convertToObjectId(id) },
      { 
        $set: { 
          ...taskUpdate, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, id: this.convertToNumberId(result._id) } as Task : undefined;
  }

  async getAllTasks(): Promise<Task[]> {
    const results = await this.collections.tasks.find().toArray();
    return results.map(task => ({
      ...task,
      id: this.convertToNumberId(task._id),
    })) as Task[];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await this.collections.tasks.deleteOne({ _id: this.convertToObjectId(id) });
    return result.deletedCount > 0;
  }

  // Placeholder methods for other entities (implement as needed)
  async getSupplier(id: number): Promise<Supplier | undefined> { return undefined; }
  async createSupplier(supplier: InsertSupplier): Promise<Supplier> { throw new Error('Not implemented'); }
  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> { return undefined; }
  async getAllSuppliers(): Promise<Supplier[]> { return []; }
  async deleteSupplier(id: number): Promise<boolean> { return false; }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await this.collections.invoices.findOne({ id });
    return result ? { ...result, id: result.id } as Invoice : undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // Get the next ID
    const allInvoices = await this.getAllInvoices();
    const maxId = allInvoices.length > 0 ? Math.max(...allInvoices.map(i => typeof i.id === 'number' ? i.id : parseInt(String(i.id)) || 0)) : 0;
    const nextId = maxId + 1;

    const invoiceData = {
      ...invoice,
      id: nextId,
      invoiceNumber: invoice.invoiceNumber || `INV-${new Date().getFullYear()}-${nextId}`,
      status: invoice.status || "pending",
      paidAmount: invoice.paidAmount || "0",
      createdAt: new Date(),
    };

    const result = await this.collections.invoices.insertOne(invoiceData);

    return {
      ...invoice,
      id: nextId,
      invoiceNumber: invoice.invoiceNumber || `INV-${new Date().getFullYear()}-${nextId}`,
      status: invoice.status || "pending",
      paidAmount: invoice.paidAmount || "0",
      createdAt: new Date(),
    } as Invoice;
  }

  async updateInvoice(id: number, invoiceUpdate: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const result = await this.collections.invoices.findOneAndUpdate(
      { id },
      {
        $set: {
          ...invoiceUpdate,
        }
      },
      { returnDocument: 'after' }
    );

    return result ? { ...result, id: result.id } as Invoice : undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    const results = await this.collections.invoices.find().toArray();
    return results.map(invoice => {
      const { _id, ...invoiceData } = invoice;
      return {
        ...invoiceData,
        id: invoice.id,
      } as Invoice;
    });
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await this.collections.invoices.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getPayment(id: number): Promise<Payment | undefined> { return undefined; }
  async createPayment(payment: InsertPayment): Promise<Payment> { throw new Error('Not implemented'); }
  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> { return undefined; }
  async getAllPayments(): Promise<Payment[]> { return []; }
  async deletePayment(id: number): Promise<boolean> { return false; }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const purchaseOrder = await this.collections.purchaseOrders.findOne({ id });
    return purchaseOrder as PurchaseOrder | undefined;
  }
  
  async createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // Get the next ID
    const allPurchaseOrders = await this.getAllPurchaseOrders();
    const maxId = allPurchaseOrders.length > 0 ? Math.max(...allPurchaseOrders.map(po => typeof po.id === 'number' ? po.id : parseInt(String(po.id)) || 0)) : 0;
    const nextId = maxId + 1;
    
    const purchaseOrderData = {
      ...purchaseOrder,
      id: nextId,
      status: purchaseOrder.status || "pending",
      createdAt: new Date(),
    };
    
    const result = await this.collections.purchaseOrders.insertOne(purchaseOrderData);
    
    return {
      ...purchaseOrder,
      id: nextId,
      status: purchaseOrder.status || "pending",
      createdAt: new Date(),
    } as PurchaseOrder;
  }
  
  async updatePurchaseOrder(id: number, purchaseOrder: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const existing = await this.getPurchaseOrder(id);
    if (!existing) return undefined;
    
    const updated = {
      ...existing,
      ...purchaseOrder,
    };
    
    await this.collections.purchaseOrders.updateOne(
      { id },
      { $set: updated }
    );
    
    return updated as PurchaseOrder;
  }
  
  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    const purchaseOrders = await this.collections.purchaseOrders.find({}).toArray();
    return purchaseOrders as PurchaseOrder[];
  }
  
  async deletePurchaseOrder(id: number): Promise<boolean> {
    const result = await this.collections.purchaseOrders.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getManufacturingJob(id: number): Promise<ManufacturingJob | undefined> { return undefined; }
  async createManufacturingJob(job: InsertManufacturingJob): Promise<ManufacturingJob> { throw new Error('Not implemented'); }
  async updateManufacturingJob(id: number, job: Partial<InsertManufacturingJob>): Promise<ManufacturingJob | undefined> { return undefined; }
  async getAllManufacturingJobs(): Promise<ManufacturingJob[]> { return []; }
  async deleteManufacturingJob(id: number): Promise<boolean> { return false; }

  async getEmployeeActivity(id: number): Promise<EmployeeActivity | undefined> { return undefined; }
  async createEmployeeActivity(activity: InsertEmployeeActivity): Promise<EmployeeActivity> { throw new Error('Not implemented'); }
  async updateEmployeeActivity(id: number, activity: Partial<InsertEmployeeActivity>): Promise<EmployeeActivity | undefined> { return undefined; }
  async getAllEmployeeActivities(): Promise<EmployeeActivity[]> { return []; }
  async deleteEmployeeActivity(id: number): Promise<boolean> { return false; }

  async getSalesTarget(id: number): Promise<SalesTarget | undefined> { return undefined; }
  async createSalesTarget(target: InsertSalesTarget): Promise<SalesTarget> { throw new Error('Not implemented'); }
  async updateSalesTarget(id: number, target: Partial<InsertSalesTarget>): Promise<SalesTarget | undefined> { return undefined; }
  async getAllSalesTargets(): Promise<SalesTarget[]> { return []; }
  async deleteSalesTarget(id: number): Promise<boolean> { return false; }
  async getSalesTargetsByPeriod(month: string, year: string): Promise<SalesTarget[]> { return []; }

  async getManufacturingForecast(id: number): Promise<ManufacturingForecast | undefined> { return undefined; }
  async createManufacturingForecast(forecast: InsertManufacturingForecast): Promise<ManufacturingForecast> { throw new Error('Not implemented'); }
  async updateManufacturingForecast(id: number, forecast: Partial<InsertManufacturingForecast>): Promise<ManufacturingForecast | undefined> { return undefined; }
  async getAllManufacturingForecasts(): Promise<ManufacturingForecast[]> { return []; }
  async deleteManufacturingForecast(id: number): Promise<boolean> { return false; }
  async getManufacturingForecastsByPeriod(month: string, year: string): Promise<ManufacturingForecast[]> { return []; }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> { return undefined; }
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> { throw new Error('Not implemented'); }
  async updateSupportTicket(id: number, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> { return undefined; }
  async getAllSupportTickets(): Promise<SupportTicket[]> { return []; }
  async deleteSupportTicket(id: number): Promise<boolean> { return false; }

  async getContract(id: number): Promise<Contract | undefined> { return undefined; }
  async createContract(contract: InsertContract): Promise<Contract> { throw new Error('Not implemented'); }
  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined> { return undefined; }
  async getAllContracts(): Promise<Contract[]> { return []; }
  async deleteContract(id: number): Promise<boolean> { return false; }

  // Company operations (for pending approvals)
  async createCompany(company: any): Promise<any> {
    const result = await this.collections.companySettings.insertOne({
      ...company,
      id: Date.now(), // Generate numeric ID
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      ...company,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  async getAllCompanies(): Promise<any[]> {
    const results = await this.collections.companySettings.find().toArray();
    return results.map(company => ({
      ...company,
      id: this.convertToNumberId(company._id),
    })) as any[];
  }

  async getCompany(id: number | string): Promise<any | undefined> {
    // Handle both numeric IDs and MongoDB ObjectIds
    if (typeof id === 'string' && id.length === 24) {
      // It's likely a MongoDB ObjectId
      try {
        const objectId = new ObjectId(id);
        const result = await this.collections.companySettings.findOne({ _id: objectId });
        return result ? { ...result, id: this.convertToNumberId(result._id) } as any : undefined;
      } catch (err) {
        // Not a valid ObjectId, fall through to numeric search
      }
    }

    // Try numeric ID search
    const result = await this.collections.companySettings.findOne({ id: typeof id === 'string' ? parseInt(id) : id });
    return result ? { ...result, id: result.id } as any : undefined;
  }

  async updateCompany(id: number | string, updates: any): Promise<any | undefined> {
    let filter: any = {};

    // Handle both numeric IDs and MongoDB ObjectIds
    if (typeof id === 'string' && id.length === 24) {
      // It's likely a MongoDB ObjectId
      try {
        const objectId = new ObjectId(id);
        filter = { _id: objectId };
      } catch (err) {
        // Not a valid ObjectId, fall through to numeric search
        filter = { id: parseInt(id) };
      }
    } else {
      // Numeric ID
      filter = { id: typeof id === 'string' ? parseInt(id) : id };
    }

    const result = await this.collections.companySettings.findOneAndUpdate(
      filter,
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? { ...result, id: result.id || this.convertToNumberId(result._id) } as any : undefined;
  }

  async getUsersByCompanyId(companyId: number): Promise<any[]> {
    const results = await this.collections.users.find({ companyId }).toArray();
    return results.map(user => ({
      ...user,
      id: user.id,
    })) as any[];
  }

  async getAllProducts(): Promise<any[]> { return []; }
  async getAllRawMaterials(): Promise<any[]> { return []; }
  async getAllQuotationTemplates(): Promise<any[]> { return []; }
  async getAllCapturedLeads(): Promise<any[]> { return []; }

  // Company Settings operations
  async getCompanySettings(): Promise<any | undefined> {
    try {
      const result = await this.collections.companySettings.findOne({});
      return result;
    } catch (error) {
      console.error('Error getting company settings:', error);
      // Return default settings if none exist
      return {
        id: 1,
        name: "Business AI",
        address: "Unit F2, MIDC Plot no. BG/PAP3, Opp. The Fern Residency Hotel, MIDC, Bhosari, Pune-411026, Maharashtra",
        phone: "+91 8767431725 / 9175240313",
        email: "sales@businessai.in",
        gstNumber: "27ABGFR0875B1ZA",
        panNumber: "",
        logo: "",
        website: "",
        bankDetails: {
          bankName: "IDFC FIRST BANK LTD",
          accountNo: "10120052061",
          ifsc: "IDFB0041434",
          branch: "BHOSARI PUNE",
          upi: "",
          swift: ""
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  async updateCompanySettings(settings: any): Promise<any> {
    try {
      const existingSettings = await this.getCompanySettings();
      
      // Deep merge nested objects (bankDetails, integrations, etc.)
      const mergedSettings = {
        ...existingSettings,
        ...settings,
        // Merge bankDetails if both exist
        bankDetails: settings.bankDetails 
          ? { ...(existingSettings?.bankDetails || {}), ...settings.bankDetails }
          : existingSettings?.bankDetails,
        // Merge integrations if both exist (deep merge for nested objects like indiaMart)
        integrations: settings.integrations
          ? {
              ...(existingSettings?.integrations || {}),
              ...settings.integrations,
              // Deep merge indiaMart if both exist
              indiaMart: settings.integrations.indiaMart
                ? { ...(existingSettings?.integrations?.indiaMart || {}), ...settings.integrations.indiaMart }
                : existingSettings?.integrations?.indiaMart
            }
          : existingSettings?.integrations,
        // Merge moduleSettings per-module so saving one module doesn't clobber others
        moduleSettings: settings.moduleSettings
          ? {
              ...(existingSettings?.moduleSettings || {}),
              ...Object.fromEntries(
                Object.entries(settings.moduleSettings).map(([k, v]) => [
                  k,
                  { ...((existingSettings?.moduleSettings as any)?.[k] || {}), ...(v as any) }
                ])
              )
            }
          : existingSettings?.moduleSettings,
        updatedAt: new Date()
      };
      
      // Remove MongoDB _id from the update object
      const { _id, ...updateData } = mergedSettings;
      
      if (existingSettings && existingSettings._id) {
        // Update existing settings
        const result = await this.collections.companySettings.updateOne(
          { _id: existingSettings._id },
          { 
            $set: updateData
          }
        );
        
        if (result.modifiedCount > 0 || result.matchedCount > 0) {
          return await this.getCompanySettings();
        }
      } else {
        // Create new settings
        const result = await this.collections.companySettings.insertOne({
          ...updateData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        if (result.insertedId) {
          return await this.getCompanySettings();
        }
      }
      
      throw new Error('Failed to update company settings');
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  }

  // ── Manufacturing (new stubs) ───────────────────────────────────────────
  private _wc: Map<number, any> = new Map(); private _wcId = 1;
  private _boms: Map<number, any> = new Map(); private _bomId = 1;
  private _bomLines: Map<number, any> = new Map(); private _bomLineId = 1;
  private _po: Map<number, any> = new Map(); private _poId = 1;
  async getAllWorkCentres(cId?: number) { const a = Array.from(this._wc.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async createWorkCentre(w: any) { const id = this._wcId++; const r = { id, createdAt: new Date(), ...w }; this._wc.set(id, r); return r; }
  async updateWorkCentre(id: number, w: any) { const e = this._wc.get(id); if (!e) return undefined; const u = { ...e, ...w }; this._wc.set(id, u); return u; }
  async deleteWorkCentre(id: number) { return this._wc.delete(id); }
  async getAllBoms(cId?: number) { const a = Array.from(this._boms.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getBom(id: number) { return this._boms.get(id); }
  async createBom(b: any) { const id = this._bomId++; const r = { id, createdAt: new Date(), ...b }; this._boms.set(id, r); return r; }
  async updateBom(id: number, b: any) { const e = this._boms.get(id); if (!e) return undefined; const u = { ...e, ...b }; this._boms.set(id, u); return u; }
  async deleteBom(id: number) { return this._boms.delete(id); }
  async getAllBomLines(bomId: number) { return Array.from(this._bomLines.values()).filter((l: any) => l.bomId === bomId); }
  async createBomLine(l: any) { const id = this._bomLineId++; const r = { id, ...l }; this._bomLines.set(id, r); return r; }
  async updateBomLine(id: number, l: any) { const e = this._bomLines.get(id); if (!e) return undefined; const u = { ...e, ...l }; this._bomLines.set(id, u); return u; }
  async deleteBomLine(id: number) { return this._bomLines.delete(id); }
  async getAllProductionOrders(cId?: number) { const a = Array.from(this._po.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getProductionOrder(id: number) { return this._po.get(id); }
  async createProductionOrder(o: any) { const id = this._poId++; const r = { id, createdAt: new Date(), status: 'draft', ...o }; this._po.set(id, r); return r; }
  async updateProductionOrder(id: number, o: any) { const e = this._po.get(id); if (!e) return undefined; const u = { ...e, ...o }; this._po.set(id, u); return u; }
  async deleteProductionOrder(id: number) { return this._po.delete(id); }
  async confirmProductionOrder(id: number) { return this.updateProductionOrder(id, { status: 'confirmed' }); }

  // ── Purchasing (new stubs) ───────────────────────────────────────────────
  private _rfqs: Map<number, any> = new Map(); private _rfqId = 1;
  private _grns: Map<number, any> = new Map(); private _grnId = 1;
  async getAllRfqs(cId?: number) { const a = Array.from(this._rfqs.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getRfq(id: number) { return this._rfqs.get(id); }
  async createRfq(r: any) { const id = this._rfqId++; const rec = { id, createdAt: new Date(), status: 'draft', ...r }; this._rfqs.set(id, rec); return rec; }
  async updateRfq(id: number, r: any) { const e = this._rfqs.get(id); if (!e) return undefined; const u = { ...e, ...r }; this._rfqs.set(id, u); return u; }
  async deleteRfq(id: number) { return this._rfqs.delete(id); }
  async getAllGrns(cId?: number) { const a = Array.from(this._grns.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getGrn(id: number) { return this._grns.get(id); }
  async createGrn(g: any) { const id = this._grnId++; const rec = { id, createdAt: new Date(), status: 'draft', ...g }; this._grns.set(id, rec); return rec; }
  async updateGrn(id: number, g: any) { const e = this._grns.get(id); if (!e) return undefined; const u = { ...e, ...g }; this._grns.set(id, u); return u; }
  async deleteGrn(id: number) { return this._grns.delete(id); }
  async validateGrn(id: number) { return this.updateGrn(id, { status: 'validated' }); }

  // ── Sales (new stubs) ────────────────────────────────────────────────────
  private _dos: Map<number, any> = new Map(); private _doId = 1;
  private _pls: Map<number, any> = new Map(); private _plId = 1;
  async getAllDeliveryOrders(cId?: number) { const a = Array.from(this._dos.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getDeliveryOrder(id: number) { return this._dos.get(id); }
  async createDeliveryOrder(d: any) { const id = this._doId++; const r = { id, createdAt: new Date(), status: 'draft', ...d }; this._dos.set(id, r); return r; }
  async updateDeliveryOrder(id: number, d: any) { const e = this._dos.get(id); if (!e) return undefined; const u = { ...e, ...d }; this._dos.set(id, u); return u; }
  async deleteDeliveryOrder(id: number) { return this._dos.delete(id); }
  async validateDeliveryOrder(id: number) { return this.updateDeliveryOrder(id, { status: 'done' }); }
  async getAllPriceLists(cId?: number) { const a = Array.from(this._pls.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async createPriceList(p: any) { const id = this._plId++; const r = { id, createdAt: new Date(), ...p }; this._pls.set(id, r); return r; }
  async updatePriceList(id: number, p: any) { const e = this._pls.get(id); if (!e) return undefined; const u = { ...e, ...p }; this._pls.set(id, u); return u; }
  async deletePriceList(id: number) { return this._pls.delete(id); }

  // ── HR (new stubs) ───────────────────────────────────────────────────────
  private _appr: Map<number, any> = new Map(); private _apprId = 1;
  private _exp: Map<number, any> = new Map(); private _expId = 1;
  private _jp: Map<number, any> = new Map(); private _jpId = 1;
  private _ja: Map<number, any> = new Map(); private _jaId = 1;
  async getAllAppraisals(cId?: number) { const a = Array.from(this._appr.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getAppraisal(id: number) { return this._appr.get(id); }
  async createAppraisal(a: any) { const id = this._apprId++; const r = { id, createdAt: new Date(), status: 'draft', ...a }; this._appr.set(id, r); return r; }
  async updateAppraisal(id: number, a: any) { const e = this._appr.get(id); if (!e) return undefined; const u = { ...e, ...a }; this._appr.set(id, u); return u; }
  async deleteAppraisal(id: number) { return this._appr.delete(id); }
  async getAllExpenseClaims(cId?: number) { const a = Array.from(this._exp.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getExpenseClaim(id: number) { return this._exp.get(id); }
  async createExpenseClaim(e: any) { const id = this._expId++; const r = { id, createdAt: new Date(), status: 'draft', ...e }; this._exp.set(id, r); return r; }
  async updateExpenseClaim(id: number, e: any) { const ex = this._exp.get(id); if (!ex) return undefined; const u = { ...ex, ...e }; this._exp.set(id, u); return u; }
  async deleteExpenseClaim(id: number) { return this._exp.delete(id); }
  async getAllJobPositions(cId?: number) { const a = Array.from(this._jp.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async createJobPosition(p: any) { const id = this._jpId++; const r = { id, createdAt: new Date(), ...p }; this._jp.set(id, r); return r; }
  async updateJobPosition(id: number, p: any) { const e = this._jp.get(id); if (!e) return undefined; const u = { ...e, ...p }; this._jp.set(id, u); return u; }
  async deleteJobPosition(id: number) { return this._jp.delete(id); }
  async getAllJobApplications(cId?: number) { const a = Array.from(this._ja.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getJobApplication(id: number) { return this._ja.get(id); }
  async createJobApplication(a: any) { const id = this._jaId++; const r = { id, createdAt: new Date(), stage: 'new', ...a }; this._ja.set(id, r); return r; }
  async updateJobApplication(id: number, a: any) { const e = this._ja.get(id); if (!e) return undefined; const u = { ...e, ...a }; this._ja.set(id, u); return u; }
  async deleteJobApplication(id: number) { return this._ja.delete(id); }

  // ── Finance (new stubs) ──────────────────────────────────────────────────
  private _accs: Map<number, any> = new Map(); private _accId = 1;
  private _jes: Map<number, any> = new Map(); private _jeId = 1;
  async getAllAccounts(cId?: number) { const a = Array.from(this._accs.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async createAccount(a: any) { const id = this._accId++; const r = { id, createdAt: new Date(), currentBalance: a.openingBalance ?? 0, isActive: true, ...a }; this._accs.set(id, r); return r; }
  async updateAccount(id: number, a: any) { const e = this._accs.get(id); if (!e) return undefined; const u = { ...e, ...a }; this._accs.set(id, u); return u; }
  async deleteAccount(id: number) { return this._accs.delete(id); }
  async getAllJournalEntries(cId?: number) { const a = Array.from(this._jes.values()); return cId ? a.filter((x: any) => x.companyId === cId) : a; }
  async getJournalEntry(id: number) { return this._jes.get(id); }
  async createJournalEntry(e: any) { const id = this._jeId++; const r = { id, createdAt: new Date(), status: 'draft', ...e }; this._jes.set(id, r); return r; }
  async updateJournalEntry(id: number, e: any) { const ex = this._jes.get(id); if (!ex) return undefined; const u = { ...ex, ...e }; this._jes.set(id, u); return u; }
  async deleteJournalEntry(id: number) { return this._jes.delete(id); }
  async postJournalEntry(id: number) { return this.updateJournalEntry(id, { status: 'posted' }); }
  async getFinancialSummary(cId?: number) {
    const accs = await this.getAllAccounts(cId);
    const sum = (type: string) => accs.filter((a: any) => a.type === type).reduce((s: number, a: any) => s + (parseFloat(a.currentBalance) || 0), 0);
    return { assets: sum('assets'), liabilities: sum('liabilities'), equity: sum('equity'), income: sum('income'), expense: sum('expense') };
  }
}
