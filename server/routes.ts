import { Express } from "express";
import { Server } from "http";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { getStorage } from "./storage-init";
import {
  insertCustomerSchema,
  insertSupplierSchema,
  insertLeadSchema,
  insertInventorySchema,
  insertTaskSchema,
  insertQuotationSchema,
  insertOrderSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertSalesTargetSchema,
  insertLeadDiscussionSchema,
  insertLeadCategorySchema,
  insertLeadSourceSchema,
  insertCrmStageSchema,
  insertCrmLostReasonSchema,
  insertCrmActivitySchema,
  insertCrmEmailTemplateSchema,
  insertDepartmentSchema,
  insertDesignationSchema,
  insertEmployeeSchema,
  insertAttendanceSchema,
  insertLeaveTypeSchema,
  insertLeaveRequestSchema,
  insertPayslipSchema,
  insertWarehouseSchema,
  insertStockLocationSchema,
  insertStockMoveSchema,
  insertStockTransferSchema,
  insertReorderRuleSchema,
  insertSupportTicketSchema,
  insertContractSchema
} from "@shared/schema";
import { pdfGenerator } from "./pdf-generator";
import type { Request, Response } from "express";
import { ProformaStore } from "./proforma-storage";


export async function registerRoutes(app: Express): Promise<Server> {
  // Simple permission helper (feature:action). Superuser and Admin bypasses.
  const hasPermission = (req: any, key: string, featureFallback?: string) => {
    if (!req.isAuthenticated?.()) return false;
    const user: any = req.user || {};
    if (!user) return false;
    if (user.role === "superuser" || user.role === "admin") return true;
    const list: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    if (list.includes(key)) return true;
    if (featureFallback && list.includes(featureFallback)) return true;
    const f = key.split(":")[0];
    if (list.includes(`${f}:*`)) return true;
    return false;
  };
  // Helper to resolve a quotation id param to a numeric id or return undefined
  async function resolveQuotationIdParam(idParam: string) {
    const storage = getStorage();
    console.log(`[resolveQuotationIdParam] incoming idParam=${idParam}`);

    // Try numeric first
    const asNumber = parseInt(idParam);
    if (!isNaN(asNumber)) {
      try {
        const q = await storage.getQuotation(asNumber);
        console.log(`[resolveQuotationIdParam] numeric lookup for ${asNumber} -> ${q ? 'found' : 'not found'}`);
        if (q) return asNumber;
      } catch (err) {
        console.warn('[resolveQuotationIdParam] numeric lookup error', err);
      }
    } else {
      console.log('[resolveQuotationIdParam] incoming idParam is not numeric');
    }

    // Try MongoDB ObjectId lookup if storage supports it
    const sAny: any = storage as any;
    if (typeof sAny.getQuotationByObjectId === 'function') {
      try {
        const q = await sAny.getQuotationByObjectId(idParam);
        if (q) {
          console.log(`[resolveQuotationIdParam] objectId lookup for ${idParam} -> found`);
          // Return the numeric id if available, otherwise return the objectId
          return q.id || idParam;
        }
      } catch (err) {
        console.warn('[resolveQuotationIdParam] objectId lookup error', err);
      }
    }

    // Fallback: search all quotations by string match on id, _id, or quotationNumber
    try {
      const all = await storage.getAllQuotations();
      const found = all.find((x: any) => 
        String(x.id) === idParam || 
        String(x._id) === idParam || 
        String(x.quotationNumber) === idParam || 
        String(x.quoteNumber) === idParam
      );
      if (found && found.id !== undefined && found.id !== null) {
        console.log(`[resolveQuotationIdParam] fallback search for ${idParam} -> found id=${found.id}`);
        return found.id;
      }
      console.log(`[resolveQuotationIdParam] fallback search for ${idParam} -> not found`);
    } catch (err) {
      console.warn('[resolveQuotationIdParam] fallback lookup error', err);
    }

    console.log(`[resolveQuotationIdParam] could not resolve idParam=${idParam}`);
    return undefined;
  }

  // Helper to return the quotation object by any supported param (number, objectId, quotationNumber)
  async function findQuotationObjectByParam(idParam: string) {
    const storage = getStorage();
    // Try numeric
    const asNumber = parseInt(idParam);
    if (!isNaN(asNumber)) {
      try {
        const q = await storage.getQuotation(asNumber);
        if (q) return q;
      } catch (err) {
        console.warn('[findQuotationObjectByParam] numeric lookup error', err);
      }
    }

    // Try objectId helper if available
    const sAny: any = storage as any;
    if (typeof sAny.getQuotationByObjectId === 'function') {
      try {
        const q = await sAny.getQuotationByObjectId(idParam);
        if (q) return q;
      } catch (err) {
        // ignore BSON errors for non-24-char ids
      }
    }

    // Fallback: search all quotations for matching quotationNumber or id-like values
    try {
      const all = await storage.getAllQuotations();
      const found = all.find((x: any) => String(x.id) === idParam || String(x.quotationNumber) === idParam || String(x.quoteNumber) === idParam || String(x._id || '') === idParam);
      if (found) return found as any;
    } catch (err) {
      console.warn('[findQuotationObjectByParam] fallback lookup error', err);
    }

    return undefined;
  }
  // Customer Management Routes
  app.get("/api/customers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'customers:view', 'customers')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const customers = await storage.getAllCustomers();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? customers : customers.filter(c => c.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  // Admin/Superuser: list all pending companies/users for approval
  app.get("/api/pending-approvals", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const me = await getStorage().getUser((req.user as any).id);
      if (!me || (me.role !== 'superuser' && me.role !== 'admin')) return res.status(403).json({ message: "Forbidden" });
      const allCompanies = await getStorage().getAllCompanies();
      const pendingCompanies = allCompanies.filter(c => String(c.status || '').toLowerCase() === 'pending');
      const allUsers = await getStorage().getAllUsers();
      const pendingUsers = allUsers.filter(u => u.isActive === false && u.companyId != null);
      console.log('Pending approvals debug:', {
        userRole: me.role,
        allCompaniesCount: allCompanies.length,
        allUsersCount: allUsers.length,
        allCompanies: allCompanies.map(c => ({ id: c.id, name: c.name, status: c.status })),
        allUsers: allUsers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId, isActive: u.isActive, role: u.role })),
        pendingCompaniesCount: pendingCompanies.length,
        pendingUsersCount: pendingUsers.length,
        pendingCompanies: pendingCompanies.map(c => ({ id: c.id, name: c.name, status: c.status })),
        pendingUsers: pendingUsers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId, isActive: u.isActive, role: u.role }))
      });
      res.set('Cache-Control', 'no-cache');
      res.json({ companies: pendingCompanies, users: pendingUsers.map(u => ({ ...u, password: undefined })) });
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      next(err);
    }
  });

  // Superuser: get all companies
  app.get("/api/companies", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const me = await getStorage().getUser((req.user as any).id);
      if (!me || me.role !== 'superuser') return res.status(403).json({ message: "Forbidden" });
      const companies = await getStorage().getAllCompanies();
      res.json(companies);
    } catch (err) { next(err); }
  });

  // Superuser: update company status
  app.put("/api/companies/:companyId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const me = await getStorage().getUser((req.user as any).id);
      if (!me || me.role !== 'superuser') return res.status(403).json({ message: "Forbidden" });
      const companyId = parseInt(req.params.companyId);
      const updates = req.body as { status?: string };
      const updated = await getStorage().updateCompany(companyId, updates);
      if (!updated) return res.status(404).json({ message: "Company not found" });
      res.json(updated);
    } catch (err) { next(err); }
  });

  // Superuser: reject/delete pending company
  app.delete("/api/companies/:companyId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const me = await getStorage().getUser((req.user as any).id);
      if (!me || me.role !== 'superuser') return res.status(403).json({ message: "Forbidden" });
      const companyId = parseInt(req.params.companyId);
      const company = await getStorage().getCompany(companyId);
      if (!company) return res.status(404).json({ message: "Company not found" });
      // Mark company as rejected and deactivate its users
      await getStorage().updateCompany(companyId, { status: 'rejected' });
      const allUsers = await getStorage().getAllUsers();
      const companyUsers = allUsers.filter((u: any) => String(u.companyId) === String(companyId));
      for (const u of companyUsers) {
        await getStorage().updateUser(u.id, { isActive: false });
      }
      res.json({ message: "Company rejected" });
    } catch (err) { next(err); }
  });

  // Superuser: approve company and activate admin user
  app.post("/api/approve-company/:companyId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const me = await getStorage().getUser((req.user as any).id);
      if (!me || me.role !== 'superuser') return res.status(403).json({ message: "Forbidden" });
      const companyId = req.params.companyId; // Keep as string for ObjectId
      const company = await getStorage().getCompany(companyId);
      if (!company) return res.status(404).json({ message: "Company not found" });
      await getStorage().updateCompany(companyId, { status: 'active' });
      // Activate the company admin user
      const users = await getStorage().getAllUsers();
      const adminUser = users.find(u => u.companyId === company.id && u.role === 'admin'); // Use company.id (numeric)
      console.log('Approving company:', companyId, 'company.id:', company.id, 'adminUser:', adminUser?.id, 'role:', adminUser?.role, 'isActive:', adminUser?.isActive);
      if (adminUser) {
        await getStorage().updateUser(adminUser.id, { isActive: true });
        console.log('User activated:', adminUser.id);
      } else {
        console.log('No admin user found for company:', company.id);
      }
      res.json({ success: true, message: "Company approved" });
    } catch (err) {
      console.error('Company approval error:', err);
      next(err);
    }
  });

  // Admin or Parent: list users (filtered by company)
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const me = await getStorage().getUser((req.user as any).id);
      if (!me) return res.status(401).json({ message: "Unauthorized" });
      const allUsers = await getStorage().getAllUsers();
      let filtered;
      if (me.role === 'superuser') {
        filtered = allUsers; // Superuser sees all
      } else if (me.role === 'admin' && me.companyId) {
        // Company admin sees users in their company
        filtered = allUsers.filter(u => u.companyId === me.companyId);
      } else {
        // Regular users see only themselves and their sub-users
        filtered = allUsers.filter(u => u.id === me.id || (u as any).parentUserId === me.id);
      }
      res.json(filtered.map(u => ({ ...u, password: undefined })));
    } catch (err) { next(err); }
  });

  // Admin: approve user and set permissions, or parent user managing sub-users
  app.put("/api/users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const updates = req.body as any; // { isActive?, role?, parentUserId?, permissions? }
      const storage = getStorage();
      const me = await storage.getUser((req.user as any).id);
      if (!me) return res.status(401).json({ message: "Unauthorized" });
      const existing = await storage.getUser(id);
      if (!existing) return res.status(404).json({ message: "User not found" });
      
      // Superuser can update anyone
      if (me.role === 'superuser') {
        const user = await storage.updateUser(id, updates as any);
        return res.json({ ...user!, password: undefined });
      }
      
      // Company admin can update users in their company
      if (me.role === 'admin' && me.companyId) {
        if (existing.companyId !== me.companyId) {
          return res.status(403).json({ message: 'Forbidden: Cannot modify users from other companies' });
        }
        // Company admin cannot create superuser or change role to admin (only one admin per company)
        if (updates.role === 'superuser' || (updates.role === 'admin' && existing.id !== me.id)) {
          return res.status(403).json({ message: 'Forbidden role change' });
        }
        const user = await storage.updateUser(id, updates as any);
        return res.json({ ...user!, password: undefined });
      }
      
      // Regular users can only update their sub-users (or self)
      if (!(existing.parentUserId === me.id || existing.id === me.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Non-admins cannot escalate role
      if (updates.role === 'admin' || updates.role === 'superuser') {
        return res.status(403).json({ message: 'Forbidden role change' });
      }
      const user = await storage.updateUser(id, updates as any);
      res.json({ ...user!, password: undefined });
    } catch (err) { next(err); }
  });

  // Create sub-user under current user or admin creates any user (max 20 per company)
  app.post("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const me = await storage.getUser((req.user as any).id);
      if (!me) return res.status(401).json({ message: "Unauthorized" });
      
      // Superuser can create any user
      if (me.role === 'superuser') {
        const payload = req.body as any;
        const scryptAsync = promisify(scrypt);
        const salt = randomBytes(16).toString('hex');
        const buf = (await scryptAsync(payload.password, salt, 64)) as Buffer;
        const hashed = `${buf.toString('hex')}.${salt}`;
        const created = await storage.createUser({
          username: payload.username,
          password: hashed,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          role: payload.role || 'user',
          companyId: payload.companyId,
          department: payload.department,
          isActive: Boolean(payload.isActive),
          parentUserId: payload.parentUserId || null,
          permissions: payload.permissions || null,
        } as any);
        return res.status(201).json({ ...created, password: undefined });
      }
      
      // Company admin can create sub-users (max 20 per company)
      if (me.role === 'admin' && me.companyId) {
        const companyUsers = await storage.getUsersByCompanyId(me.companyId);
        if (companyUsers.length >= 20) {
          return res.status(400).json({ message: "Maximum 20 users per company reached" });
        }
        const payload = req.body as any;
        const scryptAsync = promisify(scrypt);
        const salt = randomBytes(16).toString('hex');
        const buf = (await scryptAsync(payload.password, salt, 64)) as Buffer;
        const hashed = `${buf.toString('hex')}.${salt}`;
        const created = await storage.createUser({
          username: payload.username,
          password: hashed,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          role: 'user', // Company admin can only create regular users
          companyId: me.companyId,
          department: payload.department,
          isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true, // Default to active
          parentUserId: me.id,
          permissions: payload.permissions || null,
        } as any);
        return res.status(201).json({ ...created, password: undefined });
      }
      
      // Regular users cannot create sub-users (removed for multi-tenant)
      return res.status(403).json({ message: "Only company admins can create users" });
    } catch (err) { next(err); }
  });

  // Superuser: delete user
  app.delete("/api/users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const me = await storage.getUser((req.user as any).id);
      if (!me) return res.status(401).json({ message: "Unauthorized" });
      
      // Only superuser can delete users
      if (me.role !== 'superuser') {
        return res.status(403).json({ message: "Forbidden: Only superuser can delete users" });
      }
      
      const existing = await storage.getUser(id);
      if (!existing) return res.status(404).json({ message: "User not found" });
      
      // Prevent superuser from deleting themselves
      if (id === me.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await storage.deleteUser(id);
      if (deleted) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (err) { next(err); }
  });

  app.post("/api/customers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'customers:create', 'customers')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const customerData = insertCustomerSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/customers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'customers:view', 'customers')) return res.status(403).json({ message: 'Forbidden' });
      
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/customers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'customers:update', 'customers')) return res.status(403).json({ message: 'Forbidden' });
      
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      
      const storage = getStorage();
      const updatedCustomer = await storage.updateCustomer(id, customerData);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(updatedCustomer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/customers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'customers:delete', 'customers')) return res.status(403).json({ message: 'Forbidden' });
      
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const deleted = await storage.deleteCustomer(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Supplier Management Routes
  app.get("/api/suppliers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'suppliers:view', 'suppliers')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const suppliers = await storage.getAllSuppliers();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? suppliers : suppliers.filter(s => s.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/suppliers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'suppliers:create', 'suppliers')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const supplierData = insertSupplierSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/suppliers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'suppliers:view', 'suppliers')) return res.status(403).json({ message: 'Forbidden' });

      const id = parseInt(req.params.id);
      const storage = getStorage();
      const supplier = await storage.getSupplier(id);

      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json(supplier);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/suppliers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'suppliers:update', 'suppliers')) return res.status(403).json({ message: 'Forbidden' });

      const id = parseInt(req.params.id);
      const supplierData = insertSupplierSchema.partial().parse(req.body);

      const storage = getStorage();
      const updatedSupplier = await storage.updateSupplier(id, supplierData);

      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json(updatedSupplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/suppliers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'suppliers:delete', 'suppliers')) return res.status(403).json({ message: 'Forbidden' });

      const id = parseInt(req.params.id);
      const storage = getStorage();
      const deleted = await storage.deleteSupplier(id);

      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Lead Management Routes
  app.get("/api/leads", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'leads:view', 'leads')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const leads = await storage.getAllLeads();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? leads : leads.filter(l => l.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/leads", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'leads:create', 'leads')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const leadData = insertLeadSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const lead = await storage.createLead(leadData);
      // Auto task for follow-up in 2 days
      try {
        const due = new Date();
        due.setDate(due.getDate() + 2);
        await storage.createTask({
          title: `Follow up: ${lead.name}`,
          description: `Follow up with ${lead.name} (${lead.company})`,
          assignedTo: (req.user as any)?.username || 'sales',
          priority: 'medium',
          status: 'pending',
          dueDate: due as any,
          category: 'sales',
          relatedTo: 'lead',
          relatedId: lead.id as any,
        } as any);
      } catch {}
      res.status(201).json(lead);
    } catch (error) {
      console.error('Lead creation error:', error);
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/leads/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      const storage = getStorage();
      const lead = await storage.getLead(id);

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if lead belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && lead.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
      }

      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/leads/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      const leadData = insertLeadSchema.partial().parse(req.body) as any;

      // Stamp close date server-side when an opportunity is won or lost
      if ((leadData.status === 'won' || leadData.status === 'lost') && !leadData.closedAt) {
        leadData.closedAt = new Date();
      }

      const storage = getStorage();
      const user = req.user as any;

      // Check if lead belongs to user's company (for non-superusers)
      if (user.role !== 'superuser') {
        const existingLead = await storage.getLead(id);
        if (!existingLead) {
          return res.status(404).json({ message: "Lead not found" });
        }
        if (existingLead.companyId !== user.companyId) {
          return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
        }
      }

      const updatedLead = await storage.updateLead(id, leadData);

      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.json(updatedLead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/leads/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      const storage = getStorage();
      const user = req.user as any;

      // Check if lead belongs to user's company (for non-superusers)
      if (user.role !== 'superuser') {
        const existingLead = await storage.getLead(id);
        if (!existingLead) {
          return res.status(404).json({ message: "Lead not found" });
        }
        if (existingLead.companyId !== user.companyId) {
          return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
        }
      }

      const deleted = await storage.deleteLead(id);

      if (!deleted) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Convert Lead -> Customer
  app.post("/api/leads/:id/convert-to-customer", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid lead ID" });
      const storage = getStorage();
      const user = req.user as any;
      const lead = await storage.getLead(id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // Check if lead belongs to user's company (for non-superusers)
      if (user.role !== 'superuser' && lead.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
      }

      // Create customer using lead data
      const customer = await storage.createCustomer({
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "India",
        pincode: lead.pincode || "",
        gstNumber: lead.gstNumber || "",
        panNumber: lead.panNumber || "",
        creditLimit: "0",
        paymentTerms: "30 days",
        status: "active",
        notes: lead.notes || "",
        companyId: user.companyId,
      } as any);
      await storage.updateLead(id, { status: "converted" });
      res.json({ success: true, customer });
    } catch (err) {
      next(err);
    }
  });

  // Lead Discussion Routes
  app.get("/api/leads/:leadId/discussions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const leadId = parseInt(req.params.leadId);
      const storage = getStorage();
      const user = req.user as any;

      // First check if the lead belongs to the user's company
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      if (user.role !== 'superuser' && lead.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
      }

      const discussions = await storage.getLeadDiscussions(leadId);
      // Filter discussions by companyId (since leadDiscussions now has companyId)
      const filtered = user.role === 'superuser' ? discussions : discussions.filter(d => d.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  // Lead Categories Routes
  app.get("/api/lead-categories", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const list = await storage.getAllLeadCategories(user.role === 'superuser' ? undefined : user.companyId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/lead-categories", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const payload = insertLeadCategorySchema.partial().parse(req.body);
      const key = payload.key || (payload.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!payload.name || !key) return res.status(400).json({ message: "name is required" });
      const created = await getStorage().createLeadCategory({
        key,
        name: payload.name,
        isActive: payload.isActive ?? true,
        companyId: user.companyId
      });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.put("/api/lead-categories/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });
      const updates = insertLeadCategorySchema.partial().parse(req.body);
      const updated = await getStorage().updateLeadCategory(id, updates);
      if (!updated) return res.status(404).json({ message: "Lead category not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.delete("/api/lead-categories/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });
      const deleted = await getStorage().deleteLeadCategory(id);
      if (!deleted) return res.status(404).json({ message: "Lead category not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // Lead Sources Routes
  app.get("/api/lead-sources", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const list = await storage.getAllLeadSources(user.role === 'superuser' ? undefined : user.companyId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/lead-sources", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const payload = insertLeadSourceSchema.partial().parse(req.body);
      const key = payload.key || (payload.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!payload.name || !key) return res.status(400).json({ message: "name is required" });
      const created = await getStorage().createLeadSource({
        key,
        name: payload.name,
        isActive: payload.isActive ?? true,
        companyId: user.companyId
      });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.put("/api/lead-sources/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid source ID" });
      const updates = insertLeadSourceSchema.partial().parse(req.body);
      const updated = await getStorage().updateLeadSource(id, updates);
      if (!updated) return res.status(404).json({ message: "Lead source not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.delete("/api/lead-sources/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid source ID" });
      const deleted = await getStorage().deleteLeadSource(id);
      if (!deleted) return res.status(404).json({ message: "Lead source not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== CRM Pipeline Stages ====================
  app.get("/api/crm-stages", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const list = await getStorage().getAllCrmStages(user.role === 'superuser' ? undefined : user.companyId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/crm-stages", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const payload = insertCrmStageSchema.partial().parse(req.body);
      if (!payload.name) return res.status(400).json({ message: "name is required" });
      const created = await getStorage().createCrmStage({
        name: payload.name,
        sequence: payload.sequence ?? 0,
        probability: payload.probability ?? 0,
        isWon: payload.isWon ?? false,
        isActive: payload.isActive ?? true,
        companyId: user.companyId,
      });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.put("/api/crm-stages/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid stage ID" });
      const updates = insertCrmStageSchema.partial().parse(req.body);
      const updated = await getStorage().updateCrmStage(id, updates);
      if (!updated) return res.status(404).json({ message: "Stage not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.delete("/api/crm-stages/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid stage ID" });
      const deleted = await getStorage().deleteCrmStage(id);
      if (!deleted) return res.status(404).json({ message: "Stage not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== CRM Lost Reasons ====================
  app.get("/api/crm-lost-reasons", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const list = await getStorage().getAllCrmLostReasons(user.role === 'superuser' ? undefined : user.companyId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/crm-lost-reasons", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const payload = insertCrmLostReasonSchema.partial().parse(req.body);
      if (!payload.name) return res.status(400).json({ message: "name is required" });
      const created = await getStorage().createCrmLostReason({
        name: payload.name,
        isActive: payload.isActive ?? true,
        companyId: user.companyId,
      });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.put("/api/crm-lost-reasons/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid reason ID" });
      const updates = insertCrmLostReasonSchema.partial().parse(req.body);
      const updated = await getStorage().updateCrmLostReason(id, updates);
      if (!updated) return res.status(404).json({ message: "Lost reason not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.delete("/api/crm-lost-reasons/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid reason ID" });
      const deleted = await getStorage().deleteCrmLostReason(id);
      if (!deleted) return res.status(404).json({ message: "Lost reason not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== CRM Activities ====================
  app.get("/api/crm-activities", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const list = await getStorage().getAllCrmActivities(user.role === 'superuser' ? undefined : user.companyId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/crm-activities", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const { dueDate: rawDueDate, completedAt: _ca, ...rest } = req.body || {};
      const payload = insertCrmActivitySchema.partial().parse(rest);
      if (!payload.summary) return res.status(400).json({ message: "summary is required" });
      if (!payload.leadId) return res.status(400).json({ message: "leadId is required" });
      const created = await getStorage().createCrmActivity({
        ...payload,
        companyId: user.companyId,
        summary: payload.summary!,
        leadId: payload.leadId!,
        dueDate: rawDueDate ? new Date(rawDueDate) : undefined,
        createdBy: payload.createdBy || user.username,
      } as any);
      res.status(201).json(created);
    } catch (error) { next(error); }
  });

  app.get("/api/leads/:leadId/activities", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const leadId = parseInt(req.params.leadId);
      if (isNaN(leadId)) return res.status(400).json({ message: "Invalid lead ID" });
      const list = await getStorage().getCrmActivities(leadId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/leads/:leadId/activities", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const leadId = parseInt(req.params.leadId);
      if (isNaN(leadId)) return res.status(400).json({ message: "Invalid lead ID" });
      const lead = await getStorage().getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (user.role !== 'superuser' && lead.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
      }
      // Strip date fields before zod parse (drizzle-zod expects Date instances, client sends strings)
      const { dueDate: rawDueDate, completedAt: _ca, ...rest } = req.body || {};
      const payload = insertCrmActivitySchema.partial().parse(rest);
      if (!payload.summary) return res.status(400).json({ message: "summary is required" });
      const created = await getStorage().createCrmActivity({
        leadId,
        companyId: lead.companyId,
        activityType: payload.activityType ?? 'todo',
        summary: payload.summary,
        notes: payload.notes ?? null,
        dueDate: rawDueDate ? new Date(rawDueDate) : null,
        assignedTo: payload.assignedTo ?? user.username ?? String(user.id),
        status: payload.status ?? 'planned',
        createdBy: user.username ?? String(user.id),
      } as any);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.put("/api/crm-activities/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid activity ID" });
      // Strip date fields before zod parse (drizzle-zod expects Date instances, client sends strings)
      const { dueDate: rawDueDate, completedAt: rawCompletedAt, ...rest } = req.body || {};
      const updates = insertCrmActivitySchema.partial().parse(rest) as any;
      if (rawDueDate !== undefined) updates.dueDate = rawDueDate ? new Date(rawDueDate) : null;
      if (rawCompletedAt !== undefined) updates.completedAt = rawCompletedAt ? new Date(rawCompletedAt) : null;
      // Mark-done convenience: if status set to done and no completedAt, stamp it
      if (updates.status === 'done' && !updates.completedAt) updates.completedAt = new Date();
      const updated = await getStorage().updateCrmActivity(id, updates);
      if (!updated) return res.status(404).json({ message: "Activity not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      next(error);
    }
  });

  app.delete("/api/crm-activities/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid activity ID" });
      const deleted = await getStorage().deleteCrmActivity(id);
      if (!deleted) return res.status(404).json({ message: "Activity not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== CRM EMAIL TEMPLATES ====================
  app.get("/api/crm-email-templates", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const list = await getStorage().getCrmEmailTemplates(user.role === 'superuser' ? undefined : user.companyId);
      res.json(list);
    } catch (error) { next(error); }
  });

  app.post("/api/crm-email-templates", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const payload = insertCrmEmailTemplateSchema.parse({ ...req.body, companyId: user.companyId, createdBy: user.username });
      const created = await getStorage().createCrmEmailTemplate(payload);
      res.status(201).json(created);
    } catch (error) { next(error); }
  });

  app.put("/api/crm-email-templates/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updates = insertCrmEmailTemplateSchema.partial().parse(req.body);
      const updated = await getStorage().updateCrmEmailTemplate(id, updates);
      if (!updated) return res.status(404).json({ message: "Template not found" });
      res.json(updated);
    } catch (error) { next(error); }
  });

  app.delete("/api/crm-email-templates/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const deleted = await getStorage().deleteCrmEmailTemplate(id);
      if (!deleted) return res.status(404).json({ message: "Template not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // CRM Analytics endpoint
  app.get("/api/crm-analytics", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const companyId = user.role === 'superuser' ? undefined : user.companyId;
      const [leads, activities, stages] = await Promise.all([
        getStorage().getLeads(companyId),
        getStorage().getCrmActivities(companyId),
        getStorage().getCrmStages(companyId),
      ]);

      const total = leads.length;
      const opportunities = leads.filter((l: any) => l.isOpportunity).length;
      const won = leads.filter((l: any) => l.opportunityStage === 'won').length;
      const lost = leads.filter((l: any) => l.opportunityStage === 'lost').length;
      const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

      const pipelineValue = leads
        .filter((l: any) => l.isOpportunity && l.opportunityStage !== 'won' && l.opportunityStage !== 'lost')
        .reduce((sum: number, l: any) => sum + (parseFloat(l.expectedValue) || 0), 0);

      const weightedValue = leads
        .filter((l: any) => l.isOpportunity && l.opportunityStage !== 'won' && l.opportunityStage !== 'lost')
        .reduce((sum: number, l: any) => {
          const prob = (l.probability || 0) / 100;
          return sum + (parseFloat(l.expectedValue) || 0) * prob;
        }, 0);

      const today = new Date().toISOString().split('T')[0];
      const overdueActivities = activities.filter((a: any) => {
        if (a.status === 'done') return false;
        if (!a.dueDate) return false;
        return new Date(a.dueDate) < new Date();
      }).length;

      const todayActivities = activities.filter((a: any) => {
        if (a.status === 'done') return false;
        if (!a.dueDate) return false;
        return new Date(a.dueDate).toISOString().split('T')[0] === today;
      }).length;

      // Source breakdown
      const bySource: Record<string, number> = {};
      leads.forEach((l: any) => {
        const s = l.source || 'other';
        bySource[s] = (bySource[s] || 0) + 1;
      });

      // Stage breakdown with value
      const byStage = stages.map((s: any) => ({
        id: s.id,
        name: s.name,
        count: leads.filter((l: any) => l.stageId === s.id).length,
        value: leads.filter((l: any) => l.stageId === s.id)
          .reduce((sum: number, l: any) => sum + (parseFloat(l.expectedValue) || 0), 0),
      }));

      // Monthly trend (last 6 months)
      const monthlyTrend: Record<string, { leads: number; won: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyTrend[key] = { leads: 0, won: 0 };
      }
      leads.forEach((l: any) => {
        const d = new Date(l.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyTrend[key]) {
          monthlyTrend[key].leads++;
          if (l.opportunityStage === 'won') monthlyTrend[key].won++;
        }
      });

      res.json({
        total, opportunities, won, lost, winRate,
        pipelineValue, weightedValue,
        overdueActivities, todayActivities,
        bySource, byStage,
        monthlyTrend: Object.entries(monthlyTrend).map(([month, data]) => ({ month, ...data })),
        recentLeads: leads.slice(-5).reverse(),
        topOpportunities: leads
          .filter((l: any) => l.isOpportunity && l.opportunityStage !== 'won' && l.opportunityStage !== 'lost')
          .sort((a: any, b: any) => (parseFloat(b.expectedValue) || 0) - (parseFloat(a.expectedValue) || 0))
          .slice(0, 5),
      });
    } catch (error) { next(error); }
  });

  // ==================== MANUFACTURING ====================
  app.get("/api/work-centres", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllWorkCentres(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.post("/api/work-centres", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createWorkCentre({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/work-centres/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateWorkCentre(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/work-centres/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteWorkCentre(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.get("/api/boms", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllBoms(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.post("/api/boms", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createBom({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/boms/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateBom(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/boms/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteBom(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });
  app.get("/api/boms/:id/lines", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      res.json(await getStorage().getAllBomLines(parseInt(req.params.id)));
    } catch (e) { next(e); }
  });
  app.post("/api/bom-lines", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      res.status(201).json(await getStorage().createBomLine(req.body));
    } catch (e) { next(e); }
  });
  app.put("/api/bom-lines/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateBomLine(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/bom-lines/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteBomLine(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.get("/api/production-orders", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllProductionOrders(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/production-orders/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getProductionOrder(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/production-orders", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createProductionOrder({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/production-orders/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateProductionOrder(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/production-orders/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteProductionOrder(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });
  app.post("/api/production-orders/:id/confirm", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().confirmProductionOrder(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });

  // ==================== PURCHASING ====================
  app.get("/api/rfqs", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllRfqs(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/rfqs/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getRfq(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/rfqs", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createRfq({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/rfqs/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateRfq(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/rfqs/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteRfq(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.get("/api/grns", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllGrns(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/grns/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getGrn(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/grns", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createGrn({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/grns/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateGrn(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/grns/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteGrn(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });
  app.post("/api/grns/:id/validate", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().validateGrn(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });

  // ==================== SALES (new) ====================
  app.get("/api/delivery-orders", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllDeliveryOrders(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/delivery-orders/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getDeliveryOrder(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/delivery-orders", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createDeliveryOrder({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/delivery-orders/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateDeliveryOrder(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/delivery-orders/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteDeliveryOrder(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });
  app.post("/api/delivery-orders/:id/validate", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().validateDeliveryOrder(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });

  app.get("/api/price-lists", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllPriceLists(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.post("/api/price-lists", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createPriceList({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/price-lists/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updatePriceList(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/price-lists/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deletePriceList(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // ==================== HR (new) ====================
  app.get("/api/appraisals", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllAppraisals(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/appraisals/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getAppraisal(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/appraisals", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createAppraisal({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/appraisals/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateAppraisal(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/appraisals/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteAppraisal(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.get("/api/expense-claims", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllExpenseClaims(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/expense-claims/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getExpenseClaim(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/expense-claims", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createExpenseClaim({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/expense-claims/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateExpenseClaim(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/expense-claims/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteExpenseClaim(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // ── Discuss: Channels ──────────────────────────────────────────────────────
  app.get("/api/channels", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.channels) return res.json([]);
      const channels = await storage.collections.channels.find({
        $or: [{ companyId: user.companyId }, { type: "public" }]
      }).sort({ createdAt: 1 }).toArray();
      res.json(channels.map((c: any) => ({ ...c, id: c.id || c._id?.toString() })));
    } catch (e) { next(e); }
  });

  app.post("/api/channels", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.channels) return res.status(503).json({ message: "Not available" });
      const { name, description, type = "public" } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name required" });
      const existing = await storage.collections.channels.findOne({ name: name.trim(), companyId: user.companyId });
      if (existing) return res.status(400).json({ message: "Channel already exists" });
      const doc = { name: name.trim(), description: description || "", type, companyId: user.companyId, createdBy: user.id, createdByName: user.name || user.username, createdAt: new Date(), memberIds: [user.id] };
      const result = await storage.collections.channels.insertOne(doc);
      res.status(201).json({ ...doc, id: result.insertedId.toString() });
    } catch (e) { next(e); }
  });

  app.delete("/api/channels/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage() as any;
      if (!storage.collections?.channels) return res.json({ success: true });
      const { ObjectId } = require("mongodb");
      await storage.collections.channels.deleteOne({ _id: new ObjectId(req.params.id) });
      await storage.collections.channelMessages.deleteMany({ channelId: req.params.id });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.post("/api/channels/:id/join", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.channels) return res.json({ success: true });
      const { ObjectId } = require("mongodb");
      await storage.collections.channels.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { memberIds: user.id } }
      );
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // ── Discuss: Messages ─────────────────────────────────────────────────────
  app.get("/api/channels/:id/messages", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage() as any;
      if (!storage.collections?.channelMessages) return res.json([]);
      const msgs = await storage.collections.channelMessages.find({ channelId: req.params.id }).sort({ createdAt: 1 }).limit(200).toArray();
      res.json(msgs.map((m: any) => ({ ...m, id: m.id || m._id?.toString() })));
    } catch (e) { next(e); }
  });

  app.post("/api/channels/:id/messages", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.channelMessages) return res.status(503).json({ message: "Not available" });
      const { body, type = "message" } = req.body;
      if (!body?.trim()) return res.status(400).json({ message: "Message body required" });
      const doc = { channelId: req.params.id, body: body.trim(), type, senderId: user.id, senderName: user.name || user.username, senderInitials: (user.name || user.username || "?").slice(0, 2).toUpperCase(), companyId: user.companyId, createdAt: new Date() };
      const result = await storage.collections.channelMessages.insertOne(doc);
      res.status(201).json({ ...doc, id: result.insertedId.toString() });
    } catch (e) { next(e); }
  });

  app.delete("/api/channels/:channelId/messages/:msgId", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.channelMessages) return res.json({ success: true });
      const { ObjectId } = require("mongodb");
      await storage.collections.channelMessages.deleteOne({ _id: new ObjectId(req.params.msgId), senderId: user.id });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // ── Seed default channels for new company if none exist ───────────────────
  app.post("/api/channels/seed-defaults", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.channels) return res.json({ seeded: false });
      const existing = await storage.collections.channels.countDocuments({ companyId: user.companyId });
      if (existing > 0) return res.json({ seeded: false });
      const defaults = [
        { name: "general", description: "General announcements for all employees.", type: "public" },
        { name: "random", description: "Non-work banter and fun stuff.", type: "public" },
        { name: "announcements", description: "Important company announcements.", type: "public" },
      ];
      for (const ch of defaults) {
        await storage.collections.channels.insertOne({ ...ch, companyId: user.companyId, createdBy: user.id, createdByName: user.name || user.username, createdAt: new Date(), memberIds: [user.id] });
      }
      res.json({ seeded: true });
    } catch (e) { next(e); }
  });

  // ── Employee Self-Service: My Portal ──────────────────────────────────────
  // Helper: find employee linked to current user (by userId field, or name match)
  async function findMyEmployee(user: any, storage: any) {
    const employees = await storage.getAllEmployees(user.role === 'superuser' ? undefined : user.companyId);
    return employees.find((e: any) => e.userId === user.id || e.userId === String(user.id))
      || employees.find((e: any) => (e.name || '').toLowerCase() === ((user.name || user.username) || '').toLowerCase())
      || null;
  }

  // GET today's punch status for current user
  app.get("/api/my/today-punch", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.clockPunches) return res.json({ clockedIn: false });
      const today = new Date().toISOString().slice(0, 10);
      const punches = await storage.collections.clockPunches.find({ userId: user.id, date: today }).sort({ timestamp: 1 }).toArray();
      const lastPunch = punches[punches.length - 1];
      const clockedIn = lastPunch?.type === 'in';
      let workSeconds = 0;
      // Calculate total work seconds from punch pairs
      for (let i = 0; i < punches.length - 1; i += 2) {
        const inP = punches[i], outP = punches[i + 1];
        if (inP?.type === 'in' && outP?.type === 'out') {
          workSeconds += (new Date(outP.timestamp).getTime() - new Date(inP.timestamp).getTime()) / 1000;
        }
      }
      if (clockedIn && lastPunch) workSeconds += (Date.now() - new Date(lastPunch.timestamp).getTime()) / 1000;
      res.json({ clockedIn, lastPunch, punches, workSeconds: Math.floor(workSeconds), date: today });
    } catch (e) { next(e); }
  });

  // POST clock-in
  app.post("/api/my/clock-in", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.clockPunches) return res.status(503).json({ message: "Not available" });
      const today = new Date().toISOString().slice(0, 10);
      // Prevent double clock-in
      const lastToday = await storage.collections.clockPunches.findOne({ userId: user.id, date: today }, { sort: { timestamp: -1 } });
      if (lastToday?.type === 'in') return res.status(400).json({ message: "Already clocked in" });
      const { lat, lng, address } = req.body;
      const now = new Date();
      const punch = { userId: user.id, employeeName: user.name || user.username, companyId: user.companyId, type: 'in', timestamp: now, date: today, location: { lat, lng, address: address || '' } };
      await storage.collections.clockPunches.insertOne(punch);
      // Update/create attendance record
      const employee = await findMyEmployee(user, storage);
      if (employee) {
        const existing = await storage.collections.attendance.findOne({ employeeId: employee.id, date: today });
        const timeStr = now.toTimeString().slice(0, 5);
        if (existing) { await storage.collections.attendance.updateOne({ employeeId: employee.id, date: today }, { $set: { checkIn: timeStr, status: 'present', location: { lat, lng, address } } }); }
        else { await storage.createAttendance({ employeeId: employee.id, companyId: user.companyId, date: today, checkIn: timeStr, status: 'present', notes: address || '' } as any); }
      }
      res.status(201).json({ ...punch, message: `Clocked in at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` });
    } catch (e) { next(e); }
  });

  // POST clock-out
  app.post("/api/my/clock-out", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.clockPunches) return res.status(503).json({ message: "Not available" });
      const today = new Date().toISOString().slice(0, 10);
      const lastToday = await storage.collections.clockPunches.findOne({ userId: user.id, date: today }, { sort: { timestamp: -1 } });
      if (!lastToday || lastToday.type !== 'in') return res.status(400).json({ message: "Not clocked in" });
      const { lat, lng, address } = req.body;
      const now = new Date();
      const workSeconds = Math.floor((now.getTime() - new Date(lastToday.timestamp).getTime()) / 1000);
      const workHours = (workSeconds / 3600).toFixed(2);
      const punch = { userId: user.id, employeeName: user.name || user.username, companyId: user.companyId, type: 'out', timestamp: now, date: today, location: { lat, lng, address: address || '' }, workHours: parseFloat(workHours) };
      await storage.collections.clockPunches.insertOne(punch);
      // Update attendance with checkout time + work hours
      const employee = await findMyEmployee(user, storage);
      if (employee) {
        const timeStr = now.toTimeString().slice(0, 5);
        await storage.collections.attendance.updateOne({ employeeId: employee.id, date: today }, { $set: { checkOut: timeStr, workHours } });
      }
      res.status(201).json({ ...punch, workHours, message: `Clocked out at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Work hours: ${workHours}h` });
    } catch (e) { next(e); }
  });

  // GET my attendance history
  app.get("/api/my/attendance", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.clockPunches) return res.json([]);
      const { from, to } = req.query as any;
      const query: any = { userId: user.id };
      if (from) query.date = { $gte: from };
      if (to) query.date = { ...(query.date || {}), $lte: to };
      // Get daily summary grouped by date
      const punches = await storage.collections.clockPunches.find(query).sort({ timestamp: 1 }).toArray();
      const byDate: Record<string, any[]> = {};
      for (const p of punches) { (byDate[p.date] = byDate[p.date] || []).push(p); }
      const days = Object.entries(byDate).map(([date, ps]: [string, any[]]) => {
        const inPs = ps.filter((p: any) => p.type === 'in');
        const outPs = ps.filter((p: any) => p.type === 'out');
        let totalWork = 0;
        for (let i = 0; i < Math.min(inPs.length, outPs.length); i++) {
          totalWork += (new Date(outPs[i].timestamp).getTime() - new Date(inPs[i].timestamp).getTime()) / 3600000;
        }
        const missedOut = inPs.length > outPs.length;
        return { date, clockIn: inPs[0]?.timestamp, clockOut: outPs[outPs.length - 1]?.timestamp, workHours: totalWork.toFixed(2), missedOut, inLocation: inPs[0]?.location, outLocation: outPs[outPs.length - 1]?.location, punches: ps.length };
      });
      res.json(days.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) { next(e); }
  });

  // GET my leave balances + requests
  app.get("/api/my/leaves", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage();
      const employee = await findMyEmployee(user, storage as any);
      const leaveTypes = await storage.getAllLeaveTypes(user.companyId);
      const allRequests = await storage.getAllLeaveRequests(user.companyId);
      const myRequests = allRequests.filter((r: any) => r.employeeId === employee?.id || (r.employeeName || '').toLowerCase() === ((user.name || user.username) || '').toLowerCase());
      // Calculate used days per type
      const usedByType: Record<string, number> = {};
      for (const r of myRequests.filter((r: any) => r.status === 'approved')) {
        usedByType[r.leaveTypeId || r.leaveType] = (usedByType[r.leaveTypeId || r.leaveType] || 0) + (r.totalDays || 1);
      }
      const balances = leaveTypes.map((t: any) => ({ ...t, used: usedByType[t.id] || 0, remaining: (t.daysAllowed || 0) - (usedByType[t.id] || 0) }));
      res.json({ balances, requests: myRequests, employee });
    } catch (e) { next(e); }
  });

  // POST apply for leave
  app.post("/api/my/leaves", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage();
      const employee = await findMyEmployee(user, storage as any);
      if (!employee) return res.status(404).json({ message: "Employee record not found. Ask HR to link your account." });
      const { leaveTypeId, startDate, endDate, reason, totalDays } = req.body;
      const leaveType = await storage.getLeaveType?.(parseInt(leaveTypeId));
      const req2 = await storage.createLeaveRequest({
        employeeId: employee.id, employeeName: employee.name, companyId: user.companyId,
        leaveTypeId: parseInt(leaveTypeId), leaveType: leaveType?.name || '', startDate, endDate,
        totalDays: totalDays || 1, reason: reason || '', status: 'pending',
      } as any);
      res.status(201).json(req2);
    } catch (e) { next(e); }
  });

  // GET my payslips
  app.get("/api/my/payslips", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage();
      const employee = await findMyEmployee(user, storage as any);
      if (!employee) return res.json([]);
      const all = await storage.getAllPayslips(user.companyId);
      const mine = all.filter((p: any) => p.employeeId === employee.id);
      res.json(mine.sort((a: any, b: any) => `${b.periodYear}-${String(b.periodMonth).padStart(2,'0')}`.localeCompare(`${a.periodYear}-${String(a.periodMonth).padStart(2,'0')}`)));
    } catch (e) { next(e); }
  });

  // GET my profile
  app.get("/api/my/profile", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage();
      const employee = await findMyEmployee(user, storage as any);
      res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role }, employee: employee || null });
    } catch (e) { next(e); }
  });

  // GET my punch history for a specific date range (for calendar)
  app.get("/api/my/punch-calendar", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const storage = getStorage() as any;
      if (!storage.collections?.clockPunches) return res.json([]);
      const { month, year } = req.query as any;
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || new Date().getMonth() + 1;
      const from = `${y}-${String(m).padStart(2,'0')}-01`;
      const to = `${y}-${String(m).padStart(2,'0')}-31`;
      const punches = await storage.collections.clockPunches.find({ userId: user.id, date: { $gte: from, $lte: to } }).sort({ timestamp: 1 }).toArray();
      // Group by date
      const byDate: Record<string, any> = {};
      for (const p of punches) {
        if (!byDate[p.date]) byDate[p.date] = { date: p.date, ins: [], outs: [] };
        if (p.type === 'in') byDate[p.date].ins.push(p);
        else byDate[p.date].outs.push(p);
      }
      res.json(Object.values(byDate));
    } catch (e) { next(e); }
  });

  app.get("/api/job-positions", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllJobPositions(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.post("/api/job-positions", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createJobPosition({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/job-positions/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateJobPosition(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/job-positions/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteJobPosition(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.get("/api/job-applications", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllJobApplications(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/job-applications/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getJobApplication(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/job-applications", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createJobApplication({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/job-applications/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateJobApplication(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/job-applications/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteJobApplication(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // ==================== FINANCE ====================
  app.get("/api/accounts", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllAccounts(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.post("/api/accounts", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createAccount({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/accounts/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateAccount(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/accounts/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteAccount(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.get("/api/journal-entries", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllJournalEntries(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/journal-entries/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().getJournalEntry(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.post("/api/journal-entries", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createJournalEntry({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/journal-entries/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateJournalEntry(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/journal-entries/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteJournalEntry(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });
  app.post("/api/journal-entries/:id/post", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().postJournalEntry(parseInt(req.params.id));
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.get("/api/finance/summary", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getFinancialSummary(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });

  // ==================== HRMS ====================
  // Generic company-scoped CRUD registrar (HRMS date fields are text, so plain schema.parse is safe)
  const registerHrmsCrud = (
    path: string,
    schema: any,
    methods: { getAll: string; create: string; update: string; del: string },
    requireFields: string[] = []
  ) => {
    app.get(`/api/${path}`, async (req: any, res: any, next: any) => {
      try {
        if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
        const user = req.user as any;
        const list = await (getStorage() as any)[methods.getAll](user.role === 'superuser' ? undefined : user.companyId);
        res.json(list);
      } catch (e) { next(e); }
    });
    app.post(`/api/${path}`, async (req: any, res: any, next: any) => {
      try {
        if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
        const user = req.user as any;
        const payload = schema.partial().parse(req.body);
        for (const f of requireFields) {
          if (payload[f] === undefined || payload[f] === null || payload[f] === "") {
            return res.status(400).json({ message: `${f} is required` });
          }
        }
        const created = await (getStorage() as any)[methods.create]({ ...payload, companyId: user.companyId });
        res.status(201).json(created);
      } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
        next(e);
      }
    });
    app.put(`/api/${path}/:id`, async (req: any, res: any, next: any) => {
      try {
        if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const updates = schema.partial().parse(req.body);
        const updated = await (getStorage() as any)[methods.update](id, updates);
        if (!updated) return res.status(404).json({ message: "Not found" });
        res.json(updated);
      } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
        next(e);
      }
    });
    app.delete(`/api/${path}/:id`, async (req: any, res: any, next: any) => {
      try {
        if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const deleted = await (getStorage() as any)[methods.del](id);
        if (!deleted) return res.status(404).json({ message: "Not found" });
        res.json({ success: true });
      } catch (e) { next(e); }
    });
  };

  registerHrmsCrud("departments", insertDepartmentSchema, { getAll: "getAllDepartments", create: "createDepartment", update: "updateDepartment", del: "deleteDepartment" }, ["name"]);
  registerHrmsCrud("designations", insertDesignationSchema, { getAll: "getAllDesignations", create: "createDesignation", update: "updateDesignation", del: "deleteDesignation" }, ["title"]);
  registerHrmsCrud("employees", insertEmployeeSchema, { getAll: "getAllEmployees", create: "createEmployee", update: "updateEmployee", del: "deleteEmployee" }, ["employeeCode", "firstName"]);
  registerHrmsCrud("attendance", insertAttendanceSchema, { getAll: "getAllAttendance", create: "createAttendance", update: "updateAttendance", del: "deleteAttendance" }, ["employeeId", "date"]);
  registerHrmsCrud("leave-types", insertLeaveTypeSchema, { getAll: "getAllLeaveTypes", create: "createLeaveType", update: "updateLeaveType", del: "deleteLeaveType" }, ["name"]);
  registerHrmsCrud("leave-requests", insertLeaveRequestSchema, { getAll: "getAllLeaveRequests", create: "createLeaveRequest", update: "updateLeaveRequest", del: "deleteLeaveRequest" }, ["employeeId", "leaveTypeId", "fromDate", "toDate"]);
  registerHrmsCrud("payslips", insertPayslipSchema, { getAll: "getAllPayslips", create: "createPayslip", update: "updatePayslip", del: "deletePayslip" }, ["employeeId", "periodMonth", "periodYear"]);

  // Employee by id
  app.get("/api/employees/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const emp = await getStorage().getEmployee(id);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      res.json(emp);
    } catch (e) { next(e); }
  });

  // Attendance for a specific employee
  app.get("/api/employees/:id/attendance", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      res.json(await getStorage().getAttendanceByEmployee(id));
    } catch (e) { next(e); }
  });

  // Approve / reject a leave request
  app.post("/api/leave-requests/:id/decision", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { decision, comment } = req.body || {};
      if (!["approved", "rejected", "cancelled"].includes(decision)) {
        return res.status(400).json({ message: "decision must be approved, rejected or cancelled" });
      }
      const updated = await getStorage().updateLeaveRequest(id, {
        status: decision,
        approvedBy: user.username ?? String(user.id),
        approverComment: comment ?? null,
      } as any);
      if (!updated) return res.status(404).json({ message: "Leave request not found" });
      res.json(updated);
    } catch (e) { next(e); }
  });

  // Generate a payslip for an employee from their salary structure
  app.post("/api/payroll/generate", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const { employeeId, periodMonth, periodYear, lopDays } = req.body || {};
      if (!employeeId || !periodMonth || !periodYear) {
        return res.status(400).json({ message: "employeeId, periodMonth and periodYear are required" });
      }
      const emp = await getStorage().getEmployee(Number(employeeId));
      if (!emp) return res.status(404).json({ message: "Employee not found" });

      const ctc = Number((emp as any).ctc) || 0;
      const monthlyGross = ctc > 0 ? ctc / 12 : 0;
      const basicRaw = Number((emp as any).basicSalary) || monthlyGross * 0.5;
      const basic = +basicRaw.toFixed(2);
      const hra = +(basic * 0.4).toFixed(2);
      const allowances = +Math.max(0, monthlyGross - basic - hra).toFixed(2);
      const grossBeforeLop = basic + hra + allowances;

      // Loss-of-pay proration (assume 30-day month)
      const lop = Number(lopDays) || 0;
      const perDay = grossBeforeLop / 30;
      const lopAmount = +(perDay * lop).toFixed(2);
      const grossPay = +Math.max(0, grossBeforeLop - lopAmount).toFixed(2);

      // Statutory deductions (simplified): PF 12% of basic (capped), professional tax 200
      const pf = +Math.min(basic * 0.12, 1800).toFixed(2);
      const tax = 200;
      const otherDeductions = 0;
      const netPay = +(grossPay - pf - tax - otherDeductions).toFixed(2);

      const created = await getStorage().createPayslip({
        companyId: emp.companyId,
        employeeId: Number(employeeId),
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        basic: String(basic),
        hra: String(hra),
        allowances: String(allowances),
        otherEarnings: "0",
        pf: String(pf),
        tax: String(tax),
        otherDeductions: String(otherDeductions),
        grossPay: String(grossPay),
        netPay: String(netPay),
        lopDays: String(lop),
        status: "draft",
      } as any);
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  // ==================== Inventory / Warehouse ====================
  // Reuse the generic company-scoped CRUD registrar for simple entities
  registerHrmsCrud("warehouses", insertWarehouseSchema, { getAll: "getAllWarehouses", create: "createWarehouse", update: "updateWarehouse", del: "deleteWarehouse" }, ["name"]);
  registerHrmsCrud("stock-locations", insertStockLocationSchema, { getAll: "getAllStockLocations", create: "createStockLocation", update: "updateStockLocation", del: "deleteStockLocation" }, ["name"]);
  registerHrmsCrud("reorder-rules", insertReorderRuleSchema, { getAll: "getAllReorderRules", create: "createReorderRule", update: "updateReorderRule", del: "deleteReorderRule" }, ["itemId"]);
  registerHrmsCrud("stock-transfers", insertStockTransferSchema, { getAll: "getAllStockTransfers", create: "createStockTransfer", update: "updateStockTransfer", del: "deleteStockTransfer" }, ["reference"]);

  // Stock quants (read-only on-hand by location)
  app.get("/api/stock-quants", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllStockQuants(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });

  // Stock moves (GET / POST / DELETE — a posted 'done' move updates quants + global qty)
  app.get("/api/stock-moves", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.json(await getStorage().getAllStockMoves(user.role === 'superuser' ? undefined : user.companyId));
    } catch (e) { next(e); }
  });
  app.post("/api/stock-moves", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const payload = insertStockMoveSchema.partial().parse(req.body);
      if (payload.itemId === undefined || payload.itemId === null) return res.status(400).json({ message: "itemId is required" });
      if (payload.quantity === undefined || payload.quantity === null) return res.status(400).json({ message: "quantity is required" });
      const created = await getStorage().createStockMove({
        ...payload,
        companyId: user.companyId,
        date: (payload.date as any) || new Date().toISOString().slice(0, 10),
        status: payload.status ?? "done",
      } as any);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
      next(e);
    }
  });
  app.delete("/api/stock-moves/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const deleted = await getStorage().deleteStockMove(id);
      if (!deleted) return res.status(404).json({ message: "Move not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Validate a transfer -> generates done moves and updates stock
  app.post("/api/stock-transfers/:id/validate", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const validated = await getStorage().validateStockTransfer(id);
      if (!validated) return res.status(404).json({ message: "Transfer not found" });
      res.json(validated);
    } catch (e) { next(e); }
  });

  app.post("/api/leads/:leadId/discussions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const leadId = parseInt(req.params.leadId);
      const user = req.user as any;

      // Check if the lead belongs to the user's company
      const storage = getStorage();
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      if (user.role !== 'superuser' && lead.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Lead belongs to different company" });
      }

      // Get user details to set createdBy
      const userDetails = await storage.getUser(user.id);
      const createdBy = userDetails?.name || userDetails?.username || `User ${user.id}`;

      const discussionData = insertLeadDiscussionSchema.parse({
        ...req.body,
        leadId: leadId,
        createdBy: createdBy,
        companyId: user.companyId
      });

      const discussion = await storage.createLeadDiscussion(discussionData);
      res.status(201).json(discussion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  // Inventory Management Routes
  app.get("/api/inventory", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const storage = getStorage();
      const inventory = await storage.getAllInventoryItems();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? inventory : inventory.filter(i => i.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/inventory", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const user = req.user as any;
      const inventoryData = insertInventorySchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const item = await storage.createInventoryItem(inventoryData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  // Task Management Routes
  app.get("/api/tasks", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const storage = getStorage();
      const tasks = await storage.getAllTasks();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? tasks : tasks.filter(t => t.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tasks", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const user = req.user as any;
      const taskData = insertTaskSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  // ==================== SUPPORT TICKETS ====================
  app.get("/api/support-tickets", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      const tickets = await getStorage().getAllSupportTickets();
      res.json(user.role === 'superuser' ? tickets : tickets.filter((t: any) => t.companyId === user.companyId));
    } catch (e) { next(e); }
  });
  app.get("/api/support-tickets/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const ticket = await getStorage().getSupportTicket(parseInt(req.params.id));
      if (!ticket) return res.status(404).json({ message: "Not found" });
      res.json(ticket);
    } catch (e) { next(e); }
  });
  app.post("/api/support-tickets", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const user = req.user as any;
      res.status(201).json(await getStorage().createSupportTicket({ ...req.body, companyId: user.companyId }));
    } catch (e) { next(e); }
  });
  app.put("/api/support-tickets/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const result = await getStorage().updateSupportTicket(parseInt(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (e) { next(e); }
  });
  app.delete("/api/support-tickets/:id", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const deleted = await getStorage().deleteSupportTicket(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Quotation Management Routes
  app.get("/api/quotations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'quotations:view', 'quotations')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const quotations = await storage.getAllQuotations();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? quotations : quotations.filter(q => q.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/quotations/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      if (!resolvedId) return res.status(404).json({ message: "Quotation not found" });
      const quotation = await storage.getQuotation(resolvedId);

      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Check if quotation belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && quotation.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Quotation belongs to different company" });
      }

      res.json(quotation);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      next(error);
    }
  });

  app.post("/api/quotations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'quotations:create', 'quotations')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const storage = getStorage();
      
      // Check for duplicate quotation number if provided
      if (req.body?.quotationNumber) {
        const allQuotations = await storage.getAllQuotations();
        const duplicate = allQuotations.find(q => q.quotationNumber === req.body.quotationNumber);
        if (duplicate) {
          return res.status(400).json({ message: "Quotation number must be unique" });
        }
      }
      
      // Auto generate quotation number if missing
      if (!req.body?.quotationNumber) {
        // Get all existing quotations to generate next sequence
        const allQuotations = await storage.getAllQuotations();
        
        // Filter quotations created today and count them
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const quotationsToday = allQuotations.filter(q => {
          const qDate = typeof q.quotationDate === 'string' ? q.quotationDate : (q.quotationDate as any)?.toISOString?.()?.split('T')[0];
          return qDate === today;
        });
        
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const datePrefix = `RX-VQ${String(d.getFullYear()).slice(-2)}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const sequenceNum = String(quotationsToday.length + 500).padStart(4, '0');
        
        req.body.quotationNumber = `${datePrefix}-${sequenceNum}`;
      }
      
      const quotationData = insertQuotationSchema.parse({ ...req.body, companyId: user.companyId });
      const quotation = await storage.createQuotation(quotationData);
      res.status(201).json(quotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/quotations/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'quotations:update', 'quotations')) return res.status(403).json({ message: 'Forbidden' });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      if (!resolvedId) return res.status(404).json({ message: "Quotation not found" });

      // Check if quotation belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser') {
        const existingQuotation = await storage.getQuotation(resolvedId);
        if (!existingQuotation) {
          return res.status(404).json({ message: "Quotation not found" });
        }
        if (existingQuotation.companyId !== user.companyId) {
          return res.status(403).json({ message: "Forbidden: Quotation belongs to different company" });
        }
      }

      const quotationData = insertQuotationSchema.partial().parse(req.body);
      
      // Handle both numeric IDs and ObjectId strings
      let updatedQuotation;
      if (typeof resolvedId === 'string' && resolvedId.length === 24) {
        // It's a MongoDB ObjectId string, use the ObjectId update method
        const sAny: any = storage as any;
        if (typeof sAny.updateQuotationByObjectId === 'function') {
          updatedQuotation = await sAny.updateQuotationByObjectId(resolvedId, quotationData);
        } else {
          return res.status(400).json({ message: "Storage does not support ObjectId updates" });
        }
      } else {
        // It's a numeric ID, use the regular update method
        updatedQuotation = await storage.updateQuotation(resolvedId, quotationData);
      }

      if (!updatedQuotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      res.json(updatedQuotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/quotations/:id/download-pdf", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      let quotation;
      if (resolvedId) {
        quotation = await storage.getQuotation(resolvedId);
      } else {
        // Try to get the quotation object directly (supports quotationNumber or _id)
        quotation = await findQuotationObjectByParam(req.params.id);
      }

      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      console.log('Generating Quotation PDF for quotation:', quotation.id ?? req.params.id);
      const pdfBuffer = await pdfGenerator.generateQuotationPDF(quotation as any);
      console.log('Quotation PDF generated, buffer size:', pdfBuffer.length);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quotationNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Quotation PDF generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Quotation PDF generation failed: ${errorMessage}` });
    }
  });

  // Debug route: return generated HTML for a quotation (no PDF conversion)
  app.get("/api/quotations/:id/preview-html", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      let quotation;
      if (resolvedId) {
        quotation = await storage.getQuotation(resolvedId);
      } else {
        quotation = await findQuotationObjectByParam(req.params.id);
      }

      if (!quotation) return res.status(404).json({ message: "Quotation not found" });

      // Use pdfGenerator to build HTML
      const html = await pdfGenerator.generateQuotationHTML(quotation as any);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Quotation HTML preview failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Quotation HTML preview failed: ${message}` });
    }
  });

  // Debug helper: open preview HTML in default browser (development only)
  app.get("/api/quotations/:id/preview-open", async (req, res, next) => {
    try {
      if (app.get('env') !== 'development') return res.status(403).json({ message: 'Not allowed in production' });
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const port = Number(process.env.PORT || (app.get('env') === 'development' ? 3001 : 10000));
      const host = process.env.HOST || '127.0.0.1';
      const url = `http://${host}:${port}/api/quotations/${encodeURIComponent(req.params.id)}/preview-html`;

      // Launch default browser (Windows-friendly command)
      const { exec } = require('child_process');
      let cmd: string;
      if (process.platform === 'win32') {
        cmd = `start "" "${url}"`;
      } else if (process.platform === 'darwin') {
        cmd = `open "${url}"`;
      } else {
        cmd = `xdg-open "${url}"`;
      }

      exec(cmd, (err: any) => {
        if (err) console.warn('Failed to open browser:', err);
      });

      res.json({ message: 'Opening preview in default browser', url });
    } catch (error) {
      console.error('Preview open failed:', error);
      res.status(500).json({ message: 'Preview open failed' });
    }
  });

  // Generate Proforma Invoice from Quotation
  app.get("/api/quotations/:id/proforma-invoice", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      let quotation;
      if (resolvedId) {
        quotation = await storage.getQuotation(resolvedId);
      } else {
        quotation = await findQuotationObjectByParam(req.params.id);
      }

      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      console.log('Generating Proforma Invoice for quotation:', quotation.id ?? req.params.id);
      // Create or find a proforma record
      let proforma = (await ProformaStore.getAll()).find(p => p.quotationId === (quotation.id || undefined));
      if (!proforma) {
        proforma = await ProformaStore.createFromQuotation(quotation as any);
      }
      const pdfBuffer = await pdfGenerator.generateProformaInvoicePDF(quotation as any);
      console.log('Proforma Invoice generated, buffer size:', pdfBuffer.length);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="proforma-invoice-${quotation.quotationNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Proforma Invoice generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Proforma Invoice generation failed: ${errorMessage}` });
    }
  });

  // Proforma Management Routes
  app.get("/api/proformas", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const list = await ProformaStore.getAll();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? list : list.filter(p => p.companyId === user.companyId);
      res.json(filtered);
    } catch (error) { next(error); }
  });
      
  app.get("/api/proformas/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const record = await ProformaStore.getById(id);
      if (!record) return res.status(404).json({ message: "Proforma not found" });
      res.json(record);
    } catch (error) { next(error); }
  });

  app.post("/api/proformas", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const quotationIdParam = req.body?.quotationId;
      if (!quotationIdParam) return res.status(400).json({ message: "quotationId is required" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(String(quotationIdParam));
      if (!resolvedId) return res.status(404).json({ message: "Quotation not found" });
      const quotation = await storage.getQuotation(resolvedId);
      if (!quotation) return res.status(404).json({ message: "Quotation not found" });
      const created = await ProformaStore.createFromQuotation(quotation);
      res.status(201).json(created);
    } catch (error) { next(error); }
  });

  app.put("/api/proformas/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const updated = await ProformaStore.update(id, req.body);
      if (!updated) return res.status(404).json({ message: "Proforma not found" });
      res.json(updated);
    } catch (error) { next(error); }
  });

  app.delete("/api/proformas/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const deleted = await ProformaStore.remove(id);
      if (!deleted) return res.status(404).json({ message: "Proforma not found" });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // Download/Print Proforma PDF by proforma id
  app.get("/api/proformas/:id/download-pdf", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const proforma = await ProformaStore.getById(id);
      if (!proforma) return res.status(404).json({ message: "Proforma not found" });
      const pdfBuffer = await pdfGenerator.generateProformaInvoicePDF(proforma as any);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="proforma-invoice-${proforma.quotationNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Proforma Invoice generation failed: ${msg}` });
    }
  });

  // Generate Delivery Challan from Quotation
  app.get("/api/quotations/:id/delivery-challan", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      if (!resolvedId) return res.status(400).json({ message: "Invalid quotation ID" });
      const quotation = await storage.getQuotation(resolvedId);
      if (!quotation) return res.status(404).json({ message: "Quotation not found" });
      const pdfBuffer = await pdfGenerator.generateDeliveryChallanPDF(quotation as any);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=\"delivery-challan-${quotation.quotationNumber}.pdf\"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Delivery Challan generation failed: ${message}` });
    }
  });

  // Convert Quotation to Invoice
  app.post("/api/quotations/:id/convert-to-invoice", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      if (!resolvedId) return res.status(400).json({ message: "Invalid quotation ID" });
      const quotation = await storage.getQuotation(resolvedId);
      
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Create invoice from quotation data
      const taxAmount = (Number(quotation.cgstTotal || 0) + Number(quotation.sgstTotal || 0) + Number(quotation.igstTotal || 0)).toString();
      const invoiceData = {
        invoiceNumber: `INV-${Date.now()}`,
        orderId: null,
        customerId: quotation.customerId ?? null,
        items: quotation.items,
        subtotal: quotation.subtotal,
        taxAmount,
        totalAmount: quotation.totalAmount,
        invoiceDate: new Date().toISOString().slice(0,10),
        dueDate: new Date().toISOString().slice(0,10),
        status: 'pending'
      } as any;
      const invoice = await storage.createInvoice(invoiceData);
      
      res.status(201).json({ 
        success: true, 
        message: "Quotation converted to invoice successfully",
        invoice: invoice
      });
    } catch (error) {
      console.error('Convert to invoice failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to convert quotation to invoice: ${errorMessage}` });
    }
  });

  // Convert Quotation to Order
  app.post("/api/quotations/:id/convert-to-order", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const resolvedId = await resolveQuotationIdParam(req.params.id);
      if (!resolvedId) return res.status(400).json({ message: "Invalid quotation ID" });
      const quotation = await storage.getQuotation(resolvedId);
      
      if (!quotation) {
        return res.status(401).json({ message: "Quotation not found" });
      }
      
      // Create order from quotation data
      const orderData = {
        orderNumber: `ORD-${Date.now()}`,
        customerId: quotation.customerId ?? null,
        customerName: quotation.contactPerson || quotation.contactPersonTitle || 'Customer',
        customerCompany: quotation.customerCompany || 'Unknown',
        items: quotation.items,
        subtotal: quotation.subtotal,
        taxAmount: (Number(quotation.cgstTotal || 0) + Number(quotation.sgstTotal || 0) + Number(quotation.igstTotal || 0)).toString(),
        totalAmount: quotation.totalAmount,
        status: 'processing'
      } as any;
      const order = await storage.createOrder(orderData);
      
      res.status(201).json({ 
        success: true, 
        message: "Quotation converted to order successfully",
        order: order
      });
    } catch (error: any) {
      console.error('Convert to order failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to convert quotation to order: ${errorMessage}` });
    }
  });

  app.delete("/api/quotations/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'quotations:delete', 'quotations')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const sAny: any = storage as any;
      let deleted = false;
      let quotationToDelete = null;

      const resolvedId = await resolveQuotationIdParam(req.params.id);
      if (!resolvedId) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      quotationToDelete = await storage.getQuotation(resolvedId);
      if (!quotationToDelete) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      deleted = await storage.deleteQuotation(resolvedId);

      // Check if quotation belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && quotationToDelete.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Quotation belongs to different company" });
      }

      if (!deleted) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      res.json({ message: "Quotation deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Quotation templates
  app.get("/api/quotation-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const templates = await storage.getAllQuotationTemplates();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? templates : templates.filter(t => t.companyId === user.companyId);
      res.json(filtered);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch quotation templates" });
    }
  });

  app.post("/api/quotation-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const templateData = { ...req.body, companyId: user.companyId };
      // Use the storage method if available, otherwise handle manually
      const created = await (storage as any).createQuotationTemplate(templateData);
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ message: "Failed to create quotation template" });
    }
  });

  // Order Management Routes
  app.get("/api/orders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'orders:view', 'orders')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const orders = await storage.getAllOrders();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? orders : orders.filter(o => o.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/orders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'orders:create', 'orders')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const orderData = insertOrderSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/orders/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'orders:update', 'orders')) return res.status(403).json({ message: 'Forbidden' });

      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });

      // Validate update data (partial schema)
      const orderData = insertOrderSchema.partial().parse(req.body);
      const storage = getStorage();

      // Fetch the existing order to detect status transition
      const existingOrder = await storage.getOrder(id);
      const updated = await storage.updateOrder(id, orderData);
      if (!updated) return res.status(404).json({ message: "Order not found" });

      // Cross-module link: when order is confirmed, auto-create a Delivery Order
      if (
        orderData.status === 'confirmed' &&
        existingOrder &&
        existingOrder.status !== 'confirmed'
      ) {
        try {
          const user = req.user as any;
          const items = Array.isArray((updated as any).items)
            ? (updated as any).items.map((it: any) => ({
                itemName: it.name || it.sku || 'Item',
                quantity: Number(it.quantity || 1),
                unitPrice: Number(it.price || 0),
              }))
            : [];
          await storage.createDeliveryOrder({
            name: `DO-${(updated as any).orderNumber || id}`,
            orderId: id,
            customerName: (updated as any).customerName || '',
            customerCompany: (updated as any).customerCompany || '',
            status: 'draft',
            items,
            companyId: user.companyId,
          } as any);
        } catch (doErr) {
          // Log but do not fail the order update
          console.error('[auto delivery order] failed to create delivery order:', doErr);
        }
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/orders/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
      const storage = getStorage();
      const deleted = await storage.deleteOrder(id);
      if (!deleted) return res.status(404).json({ message: "Order not found" });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Internal Order print PDF
  app.get("/api/orders/:id/print-internal", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
      const storage = getStorage();
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      const pdfBuffer = await pdfGenerator.generateInternalOrderPDF(order as any);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="internal-order-${order.orderNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  });

  // Delivery challan from order
  app.get("/api/orders/:id/delivery-challan", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
      const storage = getStorage();
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      const pdfBuffer = await pdfGenerator.generateDeliveryChallanPDF(order as any);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="delivery-challan-${order.orderNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  });

  // Generate Invoice from order
  app.post("/api/orders/:id/generate-invoice", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
      const storage = getStorage();
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      const invoiceData = {
        invoiceNumber: `INV-${Date.now()}`,
        orderId: order.id,
        customerId: order.customerId,
        items: order.items,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        invoiceDate: new Date().toISOString().slice(0,10),
        dueDate: new Date().toISOString().slice(0,10),
        status: 'pending'
      } as any;
      const invoice = await storage.createInvoice(invoiceData);
      res.json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  });

  // Dashboard Routes
  app.get("/api/dashboard/stats", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const storage = getStorage();
      const user = req.user as any;

      // Filter data by company for non-superusers
      const allCustomers = await storage.getAllCustomers();
      const customers = user.role === 'superuser' ? allCustomers : allCustomers.filter(c => c.companyId === user.companyId);

      const allLeads = await storage.getAllLeads();
      const leads = user.role === 'superuser' ? allLeads : allLeads.filter(l => l.companyId === user.companyId);

      const allOrders = await storage.getAllOrders();
      const orders = user.role === 'superuser' ? allOrders : allOrders.filter(o => o.companyId === user.companyId);

      const allQuotations = await storage.getAllQuotations();
      const quotations = user.role === 'superuser' ? allQuotations : allQuotations.filter(q => q.companyId === user.companyId);

          const now = new Date();
      const isSameDay = (d: any) => {
        const dt = new Date(d);
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
      };

      const ordersThisMonth = orders.filter((order) => {
        const dt = new Date(order.createdAt);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      }).length;

      const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat((order as any).totalAmount as any) || 0), 0);
      const newLeadsToday = leads.filter((lead) => isSameDay((lead as any).createdAt)).length;
      const quotationsSent = quotations.length;

      res.json({ newLeadsToday, quotationsSent, ordersThisMonth, totalRevenue });
    } catch (error) {
      next(error);
    }
  });

  // ── Reports API (with full filter support) ───────────────────────────────
  const reportDateFilter = (dateStr: any, from?: string, to?: string, period?: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    if (!from && !to && period) {
      const now = new Date();
      const days = (now.getTime() - d.getTime()) / 86400000;
      if (period === "today") return days < 1;
      if (period === "last7days") return days <= 7;
      if (period === "last30days") return days <= 30;
      if (period === "lastQuarter") return days <= 90;
      if (period === "lastYear") return days <= 365;
      if (period === "thisMonth") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "lastMonth") { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const lme = new Date(now.getFullYear(), now.getMonth(), 0); return d >= lm && d <= lme; }
    }
    return true;
  };

  // SALES report
  app.get("/api/reports/sales", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { period = "last30days", dateFrom, dateTo, customerId, status, groupBy = "day" } = req.query as any;

      const allOrders = await storage.getAllOrders();
      let orders = (user.role === "superuser" ? allOrders : allOrders.filter((o: any) => o.companyId === user.companyId)) as any[];
      orders = orders.filter(o => reportDateFilter(o.createdAt, dateFrom, dateTo, period));
      if (customerId) orders = orders.filter(o => String(o.customerId) === customerId);
      if (status && status !== "all") orders = orders.filter(o => o.status === status);

      const allInvoices = await (storage as any).getAllInvoices?.() || [];
      let invoices = (user.role === "superuser" ? allInvoices : (allInvoices as any[]).filter((i: any) => i.companyId === user.companyId)) as any[];
      invoices = invoices.filter(i => reportDateFilter(i.createdAt, dateFrom, dateTo, period));
      if (customerId) invoices = invoices.filter(i => String(i.customerId) === customerId);

      const getKey = (d: Date) => {
        if (groupBy === "month" || period === "lastYear") return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (groupBy === "week") { const wk = Math.ceil(d.getDate() / 7); return `W${wk} ${d.toLocaleDateString("en-IN", { month: "short" })}`; }
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      };

      const buckets: Record<string, { date: string; revenue: number; orders: number; invoiced: number; cancelled: number }> = {};
      for (const o of orders) {
        const k = getKey(new Date(o.createdAt));
        if (!buckets[k]) buckets[k] = { date: k, revenue: 0, orders: 0, invoiced: 0, cancelled: 0 };
        if (o.status !== "cancelled") buckets[k].revenue += parseFloat(o.totalAmount || "0");
        if (o.status === "cancelled") buckets[k].cancelled += 1;
        buckets[k].orders += 1;
      }
      for (const inv of invoices) {
        const k = getKey(new Date(inv.createdAt));
        if (!buckets[k]) buckets[k] = { date: k, revenue: 0, orders: 0, invoiced: 0, cancelled: 0 };
        buckets[k].invoiced += parseFloat(inv.totalAmount || "0");
      }

      // Top customers
      const custMap: Record<string, { name: string; revenue: number; orders: number }> = {};
      for (const o of orders.filter(o => o.status !== "cancelled")) {
        const k = String(o.customerId || o.customerName || "Unknown");
        if (!custMap[k]) custMap[k] = { name: o.customerName || k, revenue: 0, orders: 0 };
        custMap[k].revenue += parseFloat(o.totalAmount || "0");
        custMap[k].orders += 1;
      }
      const topCustomers = Object.values(custMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      // Status breakdown
      const byStatus: Record<string, number> = {};
      for (const o of orders) byStatus[o.status || "draft"] = (byStatus[o.status || "draft"] || 0) + 1;

      const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + parseFloat(o.totalAmount || "0"), 0);
      const totalOrders = orders.length;
      const cancelled = orders.filter(o => o.status === "cancelled").length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / Math.max(1, totalOrders - cancelled) : 0;

      res.json({
        trend: Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date)),
        summary: { totalRevenue, totalOrders, cancelled, avgOrderValue, totalInvoiced: invoices.reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0) },
        topCustomers,
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        rows: orders.slice(0, 100).map(o => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, date: o.createdAt, status: o.status, amount: parseFloat(o.totalAmount || "0") })),
      });
    } catch (e) { next(e); }
  });

  // CRM / LEADS report
  app.get("/api/reports/leads", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { period = "lastYear", dateFrom, dateTo, status, source, assignedTo } = req.query as any;

      const allLeads = await storage.getAllLeads();
      let leads = (user.role === "superuser" ? allLeads : allLeads.filter((l: any) => l.companyId === user.companyId)) as any[];
      leads = leads.filter(l => reportDateFilter(l.createdAt, dateFrom, dateTo, period));
      if (status && status !== "all") leads = leads.filter(l => l.status === status);
      if (source && source !== "all") leads = leads.filter(l => l.source === source);
      if (assignedTo && assignedTo !== "all") leads = leads.filter(l => l.assignedTo === assignedTo);

      const byStatus: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byAssigned: Record<string, number> = {};
      const monthly: Record<string, { month: string; total: number; won: number; lost: number }> = {};

      for (const l of leads) {
        byStatus[l.status || "new"] = (byStatus[l.status || "new"] || 0) + 1;
        bySource[l.source || "other"] = (bySource[l.source || "other"] || 0) + 1;
        byCategory[l.category || "general"] = (byCategory[l.category || "general"] || 0) + 1;
        byAssigned[l.assignedTo || "Unassigned"] = (byAssigned[l.assignedTo || "Unassigned"] || 0) + 1;
        const mk = new Date(l.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (!monthly[mk]) monthly[mk] = { month: mk, total: 0, won: 0, lost: 0 };
        monthly[mk].total += 1;
        if (l.status === "won") monthly[mk].won += 1;
        if (l.status === "lost") monthly[mk].lost += 1;
      }

      const total = leads.length;
      const won = leads.filter(l => l.status === "won").length;
      const lost = leads.filter(l => l.status === "lost").length;
      const pipeline = leads.filter(l => l.status !== "won" && l.status !== "lost").length;
      const totalValue = leads.reduce((s, l) => s + parseFloat(l.expectedValue || l.value || "0"), 0);
      const wonValue = leads.filter(l => l.status === "won").reduce((s, l) => s + parseFloat(l.expectedValue || l.value || "0"), 0);

      // Conversion funnel
      const statuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
      const funnel = statuses.map(s => ({ stage: s, count: leads.filter(l => l.status === s).length }));

      res.json({
        summary: { total, won, lost, pipeline, conversionRate: total > 0 ? Math.round((won / total) * 100) : 0, totalValue, wonValue },
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        bySource: Object.entries(bySource).map(([name, value]) => ({ name, value })),
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        byAssigned: Object.entries(byAssigned).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        monthly: Object.values(monthly),
        funnel,
        rows: leads.slice(0, 100).map(l => ({ id: l.id, name: l.name, company: l.company, status: l.status, source: l.source, assignedTo: l.assignedTo, value: parseFloat(l.expectedValue || l.value || "0"), date: l.createdAt })),
      });
    } catch (e) { next(e); }
  });

  // FINANCE / INVOICE report
  app.get("/api/reports/finance", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { period = "lastYear", dateFrom, dateTo, status, customerId } = req.query as any;

      const allInvoices = await (storage as any).getAllInvoices?.() || [];
      let invoices = (user.role === "superuser" ? allInvoices : allInvoices.filter((i: any) => i.companyId === user.companyId)) as any[];
      invoices = invoices.filter(i => reportDateFilter(i.createdAt, dateFrom, dateTo, period));
      if (status && status !== "all") invoices = invoices.filter(i => i.status === status);
      if (customerId) invoices = invoices.filter(i => String(i.customerId) === customerId);

      const allPayments = await (storage as any).getAllPayments?.() || [];
      let payments = (user.role === "superuser" ? allPayments : (allPayments as any[]).filter((p: any) => p.companyId === user.companyId)) as any[];
      payments = payments.filter(p => reportDateFilter(p.createdAt || p.paymentDate, dateFrom, dateTo, period));

      // Monthly collections trend
      const monthly: Record<string, { month: string; invoiced: number; collected: number }> = {};
      for (const inv of invoices) {
        const mk = new Date(inv.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (!monthly[mk]) monthly[mk] = { month: mk, invoiced: 0, collected: 0 };
        monthly[mk].invoiced += parseFloat(inv.totalAmount || "0");
        if (inv.status === "paid") monthly[mk].collected += parseFloat(inv.totalAmount || "0");
      }

      // AR Aging
      const now = new Date();
      const aging = { current: 0, d30: 0, d60: 0, d90plus: 0 };
      for (const inv of invoices) {
        if (inv.status === "paid") continue;
        const due = new Date(inv.dueDate || inv.createdAt);
        const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
        const amt = parseFloat(inv.totalAmount || "0") - parseFloat(inv.paidAmount || "0");
        if (days <= 0) aging.current += amt;
        else if (days <= 30) aging.d30 += amt;
        else if (days <= 60) aging.d60 += amt;
        else aging.d90plus += amt;
      }

      // Top debtors (outstanding)
      const debtorMap: Record<string, { name: string; outstanding: number; invoices: number }> = {};
      for (const inv of invoices.filter(i => i.status !== "paid")) {
        const k = String(inv.customerId || inv.customerName || "Unknown");
        if (!debtorMap[k]) debtorMap[k] = { name: inv.customerName || k, outstanding: 0, invoices: 0 };
        debtorMap[k].outstanding += parseFloat(inv.totalAmount || "0") - parseFloat(inv.paidAmount || "0");
        debtorMap[k].invoices += 1;
      }

      const byStatus: Record<string, number> = {};
      for (const inv of invoices) byStatus[inv.status || "draft"] = (byStatus[inv.status || "draft"] || 0) + parseFloat(inv.totalAmount || "0");

      const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0);
      const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
      const outstanding = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + parseFloat(i.totalAmount || "0") - parseFloat(i.paidAmount || "0"), 0);

      res.json({
        summary: { totalInvoiced, totalPaid, outstanding, invoiceCount: invoices.length, overdueCount: invoices.filter(i => i.status === "overdue").length },
        aging: [
          { label: "Current", amount: aging.current },
          { label: "1–30 days", amount: aging.d30 },
          { label: "31–60 days", amount: aging.d60 },
          { label: "90+ days", amount: aging.d90plus },
        ],
        monthly: Object.values(monthly),
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        topDebtors: Object.values(debtorMap).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10),
        rows: invoices.slice(0, 100).map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber, customerName: i.customerName, date: i.createdAt, dueDate: i.dueDate, status: i.status, amount: parseFloat(i.totalAmount || "0"), paid: parseFloat(i.paidAmount || "0") })),
      });
    } catch (e) { next(e); }
  });

  // INVENTORY report
  app.get("/api/reports/inventory", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { category, stockLevel } = req.query as any;

      const allItems = await (storage as any).getAllInventory?.() || await (storage as any).getInventoryItems?.() || [];
      let items = (user.role === "superuser" ? allItems : (allItems as any[]).filter((i: any) => i.companyId === user.companyId)) as any[];
      if (category && category !== "all") items = items.filter(i => i.category === category);
      if (stockLevel === "low") items = items.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) < (i.threshold || 10));
      if (stockLevel === "out") items = items.filter(i => (i.quantity || 0) === 0);
      if (stockLevel === "ok") items = items.filter(i => (i.quantity || 0) >= (i.threshold || 10));

      const allItemsForStats = (user.role === "superuser" ? allItems : (allItems as any[]).filter((i: any) => i.companyId === user.companyId)) as any[];
      const lowStock = allItemsForStats.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) < (i.threshold || 10));
      const outOfStock = allItemsForStats.filter(i => (i.quantity || 0) === 0);

      const byCat: Record<string, { name: string; count: number; value: number }> = {};
      let totalValue = 0;
      for (const item of items) {
        const cat = item.category || "Uncategorized";
        if (!byCat[cat]) byCat[cat] = { name: cat, count: 0, value: 0 };
        byCat[cat].count += 1;
        const val = parseFloat(item.costPrice || item.unitPrice || "0") * (item.quantity || 0);
        byCat[cat].value += val;
        totalValue += val;
      }

      // Top items by value
      const topByValue = [...items].sort((a, b) => {
        const av = parseFloat(a.costPrice || a.unitPrice || "0") * (a.quantity || 0);
        const bv = parseFloat(b.costPrice || b.unitPrice || "0") * (b.quantity || 0);
        return bv - av;
      }).slice(0, 10).map(i => ({ name: i.name, sku: i.sku, quantity: i.quantity, category: i.category, value: parseFloat(i.costPrice || i.unitPrice || "0") * (i.quantity || 0) }));

      res.json({
        summary: { total: allItemsForStats.length, filtered: items.length, lowStock: lowStock.length, outOfStock: outOfStock.length, totalValue },
        byCategory: Object.values(byCat).sort((a, b) => b.value - a.value),
        lowStockItems: lowStock.slice(0, 20).map((i: any) => ({ name: i.name, sku: i.sku, quantity: i.quantity, threshold: i.threshold || 10, category: i.category })),
        topByValue,
        rows: items.map(i => ({ id: i.id, name: i.name, sku: i.sku, category: i.category, quantity: i.quantity, threshold: i.threshold || 10, unitPrice: parseFloat(i.costPrice || i.unitPrice || "0"), value: parseFloat(i.costPrice || i.unitPrice || "0") * (i.quantity || 0) })),
      });
    } catch (e) { next(e); }
  });

  // HR report
  app.get("/api/reports/hr", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { departmentId, empStatus, month, year } = req.query as any;

      const allEmps = await (storage as any).getAllEmployees?.() || [];
      let emps = (user.role === "superuser" ? allEmps : (allEmps as any[]).filter((e: any) => e.companyId === user.companyId)) as any[];
      if (departmentId && departmentId !== "all") emps = emps.filter(e => String(e.departmentId) === departmentId);
      if (empStatus && empStatus !== "all") emps = emps.filter(e => e.status === empStatus);

      const allDepts = await (storage as any).getAllDepartments?.() || [];
      const deptName = (id: any) => (allDepts as any[]).find(d => d.id === id)?.name || "General";

      const byDept: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      for (const e of emps) {
        const dn = deptName(e.departmentId);
        byDept[dn] = (byDept[dn] || 0) + 1;
        byStatus[e.status || "active"] = (byStatus[e.status || "active"] || 0) + 1;
        byType[e.employmentType || "full_time"] = (byType[e.employmentType || "full_time"] || 0) + 1;
      }

      const allPayslips = await (storage as any).getAllPayslips?.() || [];
      let payslips = (user.role === "superuser" ? allPayslips : (allPayslips as any[]).filter((p: any) => p.companyId === user.companyId)) as any[];
      if (month) payslips = payslips.filter(p => String(p.periodMonth) === month);
      if (year) payslips = payslips.filter(p => String(p.periodYear) === year);
      const paidSlips = payslips.filter(p => p.status === "paid");
      const totalPayroll = paidSlips.reduce((s, p) => s + parseFloat(p.netPay || "0"), 0);
      const totalGross = paidSlips.reduce((s, p) => s + parseFloat(p.grossPay || "0"), 0);

      // Monthly payroll trend
      const payrollMonthly: Record<string, { month: string; total: number; count: number }> = {};
      for (const p of allPayslips.filter((p: any) => p.status === "paid")) {
        const mk = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(p.periodMonth || 1) - 1]} ${String(p.periodYear).slice(-2)}`;
        if (!payrollMonthly[mk]) payrollMonthly[mk] = { month: mk, total: 0, count: 0 };
        payrollMonthly[mk].total += parseFloat(p.netPay || "0");
        payrollMonthly[mk].count += 1;
      }

      // Leave summary
      const allLeaves = await (storage as any).getAllLeaveRequests?.() || [];
      const pending = (allLeaves as any[]).filter(l => l.status === "pending").length;
      const approved = (allLeaves as any[]).filter(l => l.status === "approved").length;

      res.json({
        summary: { total: emps.length, active: byStatus["active"] || 0, onLeave: byStatus["on_leave"] || 0, totalPayroll, totalGross, pendingLeaves: pending, approvedLeaves: approved },
        byDepartment: Object.entries(byDept).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        payrollMonthly: Object.values(payrollMonthly),
        rows: emps.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName || ""}`.trim(), code: e.employeeCode, department: deptName(e.departmentId), status: e.status, type: e.employmentType, salary: parseFloat(e.basicSalary || "0") })),
      });
    } catch (e) { next(e); }
  });

  // SUPPORT TICKETS report
  app.get("/api/reports/support", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { period = "last30days", dateFrom, dateTo, status, priority, assignedTo } = req.query as any;

      const allTickets = await (storage as any).getAllSupportTickets?.() || [];
      let tickets = (user.role === "superuser" ? allTickets : (allTickets as any[]).filter((t: any) => t.companyId === user.companyId)) as any[];
      tickets = tickets.filter(t => reportDateFilter(t.createdAt, dateFrom, dateTo, period));
      if (status && status !== "all") tickets = tickets.filter(t => t.status === status);
      if (priority && priority !== "all") tickets = tickets.filter(t => t.priority === priority);
      if (assignedTo && assignedTo !== "all") tickets = tickets.filter(t => t.assignedTo === assignedTo);

      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const monthly: Record<string, { month: string; total: number; resolved: number }> = {};
      const SLA_H: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 72 };
      let breached = 0, resolved = 0, totalResolutionH = 0, resolvedCount = 0;

      for (const t of tickets) {
        byStatus[t.status || "open"] = (byStatus[t.status || "open"] || 0) + 1;
        byPriority[t.priority || "medium"] = (byPriority[t.priority || "medium"] || 0) + 1;
        byCategory[t.category || "General"] = (byCategory[t.category || "General"] || 0) + 1;
        const mk = new Date(t.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (!monthly[mk]) monthly[mk] = { month: mk, total: 0, resolved: 0 };
        monthly[mk].total += 1;
        if (t.status === "resolved" || t.status === "closed") { monthly[mk].resolved += 1; resolved += 1; }
        // SLA breach check
        if (t.status !== "resolved" && t.status !== "closed") {
          const elapsed = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
          if (elapsed > (SLA_H[t.priority] || 24)) breached += 1;
        }
        // Avg resolution time
        if ((t.status === "resolved" || t.status === "closed") && t.resolvedAt) {
          const h = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
          totalResolutionH += h; resolvedCount += 1;
        }
      }

      res.json({
        summary: { total: tickets.length, open: byStatus["open"] || 0, resolved, breached, avgResolutionH: resolvedCount > 0 ? Math.round(totalResolutionH / resolvedCount) : null },
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        monthly: Object.values(monthly),
        rows: tickets.slice(0, 100).map(t => ({ id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, status: t.status, priority: t.priority, assignedTo: t.assignedTo, category: t.category, date: t.createdAt })),
      });
    } catch (e) { next(e); }
  });

  // PURCHASES report
  app.get("/api/reports/purchases", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { period = "lastYear", dateFrom, dateTo, status, supplierId } = req.query as any;

      const allPOs = await (storage as any).getAllPurchaseOrders?.() || [];
      let pos = (user.role === "superuser" ? allPOs : (allPOs as any[]).filter((p: any) => p.companyId === user.companyId)) as any[];
      pos = pos.filter(p => reportDateFilter(p.createdAt, dateFrom, dateTo, period));
      if (status && status !== "all") pos = pos.filter(p => p.status === status);
      if (supplierId) pos = pos.filter(p => String(p.supplierId) === supplierId);

      const byStatus: Record<string, number> = {};
      const bySupplier: Record<string, { name: string; amount: number; orders: number }> = {};
      const monthly: Record<string, { month: string; amount: number; orders: number }> = {};
      for (const p of pos) {
        byStatus[p.status || "draft"] = (byStatus[p.status || "draft"] || 0) + 1;
        const sk = String(p.supplierId || p.supplierName || "Unknown");
        if (!bySupplier[sk]) bySupplier[sk] = { name: p.supplierName || sk, amount: 0, orders: 0 };
        bySupplier[sk].amount += parseFloat(p.totalAmount || "0");
        bySupplier[sk].orders += 1;
        const mk = new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (!monthly[mk]) monthly[mk] = { month: mk, amount: 0, orders: 0 };
        monthly[mk].amount += parseFloat(p.totalAmount || "0");
        monthly[mk].orders += 1;
      }
      const totalSpend = pos.reduce((s, p) => s + parseFloat(p.totalAmount || "0"), 0);

      res.json({
        summary: { totalPOs: pos.length, totalSpend, avgPOValue: pos.length > 0 ? totalSpend / pos.length : 0 },
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        topSuppliers: Object.values(bySupplier).sort((a, b) => b.amount - a.amount).slice(0, 10),
        monthly: Object.values(monthly),
        rows: pos.slice(0, 100).map(p => ({ id: p.id, poNumber: p.poNumber, supplierName: p.supplierName, date: p.createdAt, status: p.status, amount: parseFloat(p.totalAmount || "0") })),
      });
    } catch (e) { next(e); }
  });

  // PAYROLL report
  app.get("/api/reports/payroll", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { month, year, departmentId, slipStatus } = req.query as any;

      const allPayslips = await (storage as any).getAllPayslips?.() || [];
      let slips = (user.role === "superuser" ? allPayslips : (allPayslips as any[]).filter((p: any) => p.companyId === user.companyId)) as any[];
      if (month && month !== "all") slips = slips.filter(p => String(p.periodMonth) === month);
      if (year) slips = slips.filter(p => String(p.periodYear) === year);
      if (slipStatus && slipStatus !== "all") slips = slips.filter(p => p.status === slipStatus);

      const allEmps = await (storage as any).getAllEmployees?.() || [];
      const allDepts = await (storage as any).getAllDepartments?.() || [];
      const deptName = (id: any) => (allDepts as any[]).find(d => d.id === id)?.name || "General";
      const empMap = Object.fromEntries((allEmps as any[]).map(e => [e.id, e]));

      // Filter by department via employee
      let filteredSlips = slips;
      if (departmentId && departmentId !== "all") {
        const deptEmpIds = new Set((allEmps as any[]).filter(e => String(e.departmentId) === departmentId).map(e => e.id));
        filteredSlips = slips.filter(p => deptEmpIds.has(p.employeeId));
      }

      const byStatus: Record<string, number> = {};
      const byDept: Record<string, { name: string; gross: number; net: number; count: number }> = {};
      const monthly: Record<string, { month: string; gross: number; net: number; count: number }> = {};

      for (const p of filteredSlips) {
        byStatus[p.status || "draft"] = (byStatus[p.status || "draft"] || 0) + 1;
        const emp = empMap[p.employeeId];
        const dn = emp ? deptName(emp.departmentId) : "General";
        if (!byDept[dn]) byDept[dn] = { name: dn, gross: 0, net: 0, count: 0 };
        byDept[dn].gross += parseFloat(p.grossPay || "0");
        byDept[dn].net += parseFloat(p.netPay || "0");
        byDept[dn].count += 1;
        const mk = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(p.periodMonth || 1) - 1]} ${String(p.periodYear).slice(-2)}`;
        if (!monthly[mk]) monthly[mk] = { month: mk, gross: 0, net: 0, count: 0 };
        monthly[mk].gross += parseFloat(p.grossPay || "0");
        monthly[mk].net += parseFloat(p.netPay || "0");
        monthly[mk].count += 1;
      }

      const totalGross = filteredSlips.reduce((s, p) => s + parseFloat(p.grossPay || "0"), 0);
      const totalNet = filteredSlips.reduce((s, p) => s + parseFloat(p.netPay || "0"), 0);
      const totalDed = filteredSlips.reduce((s, p) => s + parseFloat(p.pf || "0") + parseFloat(p.tax || "0") + parseFloat(p.otherDeductions || "0"), 0);

      res.json({
        summary: { totalSlips: filteredSlips.length, totalGross, totalNet, totalDeductions: totalDed, paid: byStatus["paid"] || 0 },
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        byDepartment: Object.values(byDept).sort((a, b) => b.net - a.net),
        monthly: Object.values(monthly),
        rows: filteredSlips.slice(0, 100).map(p => {
          const emp = empMap[p.employeeId];
          return { id: p.id, employeeName: emp ? `${emp.firstName} ${emp.lastName || ""}`.trim() : `#${p.employeeId}`, period: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(p.periodMonth||1)-1]} ${p.periodYear}`, gross: parseFloat(p.grossPay || "0"), net: parseFloat(p.netPay || "0"), status: p.status };
        }),
      });
    } catch (e) { next(e); }
  });

  // Ticket Comments (conversation thread)
  app.get("/api/support-tickets/:id/comments", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const ticketId = parseInt(req.params.id);
      const allMoves = await (storage as any).getAllStockMoves?.() || [];
      // We piggyback on lead discussions for comments since no separate collection
      // Use a simple in-memory store on the ticket's notes field for now
      const ticket = await (storage as any).getSupportTicket?.(ticketId);
      if (!ticket) return res.status(404).json({ message: "Not found" });
      const comments = ticket.comments ? JSON.parse(ticket.comments) : [];
      res.json(comments);
    } catch (e) { next(e); }
  });

  app.post("/api/support-tickets/:id/comments", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const ticketId = parseInt(req.params.id);
      const { text } = req.body;
      const user = req.user as any;
      const ticket = await (storage as any).getSupportTicket?.(ticketId);
      if (!ticket) return res.status(404).json({ message: "Not found" });
      const comments = ticket.comments ? JSON.parse(ticket.comments) : [];
      const newComment = { id: Date.now(), author: user.name || user.username, role: user.role, text, createdAt: new Date().toISOString() };
      comments.push(newComment);
      await storage.updateSupportTicket(ticketId, { ...ticket, comments: JSON.stringify(comments) });
      res.json(newComment);
    } catch (e) { next(e); }
  });

  // Bulk payroll
  app.post("/api/payroll/generate-bulk", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const user = req.user as any;
      const { month, year, employeeIds } = req.body;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const allEmps = await storage.getAllEmployees ? await storage.getAllEmployees() : [];
      const emps = (user.role === "superuser" ? allEmps : (allEmps as any[]).filter((e: any) => e.companyId === user.companyId))
        .filter((e: any) => !employeeIds || employeeIds.includes(e.id));

      const results = [];
      for (const emp of emps as any[]) {
        try {
          const basic = parseFloat(emp.basicSalary || "0");
          const hra = basic * 0.4;
          const allowances = basic * 0.2;
          const pf = basic * 0.12;
          const net = basic + hra + allowances - pf;
          const payslipNumber = `PAY-${year}-${String(month).padStart(2, "0")}-${emp.id}`;
          const data = {
            payslipNumber, employeeId: emp.id, employeeName: emp.name, employeeCode: emp.employeeCode,
            month, year, basic: String(basic), hra: String(hra), allowances: String(allowances),
            pf: String(pf), tax: "0", otherDeductions: "0", otherEarnings: "0", lopDays: 0,
            grossPay: String(basic + hra + allowances), netPay: String(net), status: "draft",
            companyId: emp.companyId || user.companyId,
          };
          const payslip = await storage.createPayslip(data as any);
          results.push({ employeeId: emp.id, name: emp.name, payslipId: payslip.id, status: "created" });
        } catch (err: any) {
          results.push({ employeeId: emp.id, name: emp.name, status: "error", error: err.message });
        }
      }
      res.json({ generated: results.filter(r => r.status === "created").length, errors: results.filter(r => r.status === "error").length, results });
    } catch (e) { next(e); }
  });

  // Inventory stock adjustment
  app.post("/api/inventory/:id/adjust", async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const id = parseInt(req.params.id);
      const { adjustment, reason } = req.body;
      const item = await (storage as any).getInventoryItem?.(id) || await (storage as any).getById?.("inventory", id);
      if (!item) return res.status(404).json({ message: "Not found" });
      const newQty = Math.max(0, (item.quantity || 0) + parseInt(adjustment));
      await storage.updateInventoryItem(id, { quantity: newQty });
      res.json({ id, oldQuantity: item.quantity, newQuantity: newQty, adjustment, reason });
    } catch (e) { next(e); }
  });

  // Excel Import/Export/Templates
  app.get("/api/import/template/:entity", async (req, res, next) => {
    try {
      const { entity } = req.params as { entity: string };
      const XLSX = (await import("xlsx")).default;

      const headerByEntity: Record<string, { required: string[]; optional: string[] }> = {
        leads: {
          required: ["name", "company", "email", "phone"],
          optional: ["status", "category", "source", "assignedTo", "priority", "expectedValue", "nextFollowUp", "notes", "address", "city", "state", "country", "pincode", "gstNumber", "panNumber"],
        },
        customers: {
          required: ["name", "company", "email", "phone"],
          optional: ["address", "city", "state", "country", "pincode", "gstNumber", "panNumber", "creditLimit", "paymentTerms", "status", "notes"],
        },
        inventory: {
          required: ["name", "sku", "costPrice", "sellingPrice"],
          optional: ["description", "category", "unit", "quantity", "threshold", "taxRate", "location"],
        },
        quotations: {
          required: ["quotationNumber", "quotationDate", "validUntil", "contactPerson", "customerCompany", "addressLine1", "city", "state", "country", "pincode", "items"],
          optional: ["leadId", "customerId", "reference", "contactPersonTitle", "shippingAddressLine1", "shippingAddressLine2", "shippingCity", "shippingState", "shippingCountry", "shippingPincode", "salesCredit", "sameAsBilling", "terms", "notes", "discount", "discountType"],
        },
      };

      const defn = headerByEntity[entity];
      if (!defn) return res.status(400).json({ message: "Unknown entity" });

      const header = [...defn.required, ...defn.optional];
      const ws = XLSX.utils.aoa_to_sheet([header]);
      // add a sample row beneath with hints
      const sample: any[] = header.map((h) => {
        if (h === 'items') return '[{"name":"Item 1","quantity":1,"unit":"nos","rate":100}]';
        if (h.toLowerCase().includes('date')) return new Date().toISOString().slice(0,10);
        return '';
      });
      XLSX.utils.sheet_add_aoa(ws, [sample], { origin: -1 });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as unknown as Buffer;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${entity}_template.xlsx`);
      res.send(buf);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/export/:entity", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const { entity } = req.params as { entity: string };
      const storage = getStorage();
      const XLSX = (await import("xlsx")).default;
      const user = req.user as any;
      let rows: any[] = [];
      if (entity === "leads") {
        const allLeads = await storage.getAllLeads();
        rows = user.role === 'superuser' ? allLeads : allLeads.filter(l => l.companyId === user.companyId);
      } else if (entity === "customers") {
        const allCustomers = await storage.getAllCustomers();
        rows = user.role === 'superuser' ? allCustomers : allCustomers.filter(c => c.companyId === user.companyId);
      } else if (entity === "inventory") {
        const allInventory = await storage.getAllInventoryItems();
        rows = user.role === 'superuser' ? allInventory : allInventory.filter(i => i.companyId === user.companyId);
      } else if (entity === "quotations") {
        const allQuotations = await storage.getAllQuotations();
        rows = user.role === 'superuser' ? allQuotations : allQuotations.filter(q => q.companyId === user.companyId);
      } else return res.status(400).json({ message: "Unknown entity" });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, entity);
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${entity}.xlsx`);
      res.send(buf);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/import/:entity", async (req: Request, res: Response, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const { entity } = req.params as { entity: string };
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const storage = getStorage();
      let created = 0;

      if (entity === "leads") {
        for (const r of rows) {
          const payload: any = {
            name: r.name || r.Name,
            company: r.company || r.Company,
            email: r.email || r.Email || "",
            phone: r.phone || r.Phone || "",
            status: r.status || "new",
            category: r.category || "industry",
            source: r.source || "import",
            assignedTo: r.assignedTo || undefined,
            priority: r.priority || "medium",
            expectedValue: r.expectedValue?.toString(),
            nextFollowUp: r.nextFollowUp ? new Date(r.nextFollowUp) : undefined,
            notes: r.notes || "",
            address: r.address || "",
            city: r.city || "",
            state: r.state || "",
            country: r.country || "India",
            pincode: r.pincode || "",
            gstNumber: r.gstNumber || "",
            panNumber: r.panNumber || "",
          };
          if (payload.name && payload.company) {
            await storage.createLead(payload);
            created++;
          }
        }
      } else if (entity === "customers") {
        for (const r of rows) {
          const payload: any = {
            name: r.name || r.Name,
            company: r.company || r.Company,
            email: r.email || r.Email || "",
            phone: r.phone || r.Phone || "",
            address: r.address || "",
            city: r.city || "",
            state: r.state || "",
            country: r.country || "India",
            pincode: r.pincode || "",
            gstNumber: r.gstNumber || "",
            panNumber: r.panNumber || "",
            creditLimit: r.creditLimit?.toString() || "0",
            paymentTerms: r.paymentTerms || "30 days",
            status: r.status || "active",
            notes: r.notes || "",
          };
          if (payload.name && payload.company && payload.email && payload.phone) {
            await storage.createCustomer(payload);
            created++;
          }
        }
      } else if (entity === "inventory") {
        for (const r of rows) {
          const payload: any = {
            name: r.name || r.Name,
            sku: r.sku || r.SKU,
            description: r.description || "",
            category: r.category || "",
            unit: r.unit || "pcs",
            quantity: Number(r.quantity ?? 0),
            threshold: Number(r.threshold ?? 5),
            costPrice: (r.costPrice ?? r.cost_price ?? "0").toString(),
            sellingPrice: (r.sellingPrice ?? r.selling_price ?? "0").toString(),
            taxRate: (r.taxRate ?? r.tax_rate ?? "18").toString(),
            supplierId: undefined,
            location: r.location || "",
            isActive: true,
          };
          if (payload.name && payload.sku) {
            await storage.createInventoryItem(payload);
            created++;
          }
        }
      } else if (entity === "quotations") {
        for (const r of rows) {
          // items column expected as JSON string
          const items = (() => {
            try { return JSON.parse(r.items || r.Items || "[]"); } catch { return []; }
          })();
          const payload: any = {
            quotationNumber: r.quotationNumber || r.QuotationNumber,
            customerId: r.customerId ? Number(r.customerId) : undefined,
            leadId: r.leadId ? Number(r.leadId) : undefined,
            quotationDate: r.quotationDate || new Date().toISOString().slice(0,10),
            validUntil: r.validUntil || new Date().toISOString().slice(0,10),
            reference: r.reference || "",
            contactPersonTitle: r.contactPersonTitle || "",
            contactPerson: r.contactPerson || r.ContactPerson || "",
            customerCompany: r.customerCompany || r.CustomerCompany || "",
            addressLine1: r.addressLine1 || r.AddressLine1 || "",
            addressLine2: r.addressLine2 || r.AddressLine2 || "",
            city: r.city || "",
            state: r.state || "",
            country: r.country || "India",
            pincode: r.pincode || "",
            shippingAddressLine1: r.shippingAddressLine1 || "",
            shippingAddressLine2: r.shippingAddressLine2 || "",
            shippingCity: r.shippingCity || "",
            shippingState: r.shippingState || "",
            shippingCountry: r.shippingCountry || "",
            shippingPincode: r.shippingPincode || "",
            salesCredit: r.salesCredit || "",
            sameAsBilling: (String(r.sameAsBilling || "true").toLowerCase() !== "false"),
            items,
            terms: r.terms ? String(r.terms) : "",
            notes: r.notes || "",
            bankDetails: undefined,
            extraCharges: [],
            discounts: [],
            discount: r.discount?.toString(),
            discountType: r.discountType || "amount",
            subtotal: (r.subtotal ?? "0").toString(),
            cgstTotal: (r.cgstTotal ?? "0").toString(),
            sgstTotal: (r.sgstTotal ?? "0").toString(),
            igstTotal: (r.igstTotal ?? "0").toString(),
            taxableTotal: (r.taxableTotal ?? "0").toString(),
            totalAmount: (r.totalAmount ?? "0").toString(),
            status: r.status || "draft",
          };
          if (payload.quotationNumber && payload.contactPerson && payload.addressLine1 && items.length >= 0) {
            await storage.createQuotation(payload);
            created++;
          }
        }
      } else {
        return res.status(400).json({ message: "Unknown entity" });
      }

      res.json({ message: "Imported successfully", created });
    } catch (err) {
      next(err);
    }
  });

  // IndiaMART Pull API integration
  app.post("/api/integrations/indiamart/sync", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const { apiKey: bodyKey, startTime, endTime } = req.body as { apiKey?: string; startTime?: string; endTime?: string };
      const storageA = getStorage();
      const settings = await storageA.getCompanySettings();
      const effectiveKey = bodyKey || settings?.integrations?.indiaMart?.apiKey;
      if (!effectiveKey) return res.status(400).json({ message: "Missing apiKey" });

      const fetchIndiaMart = async (key: string, s?: string, e?: string) => {
        const params = new URLSearchParams();
        params.set("glusr_crm_key", key);
        if (s) params.set("start_time", s);
        if (e) params.set("end_time", e);
        const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?${params.toString()}`;
        const r = await fetch(url, { headers: { "accept": "application/json" } });
        const text = await r.text();
        let payload: any;
        try { payload = JSON.parse(text); } catch { return { error: `Invalid response from IndiaMART`, raw: text }; }
        return payload;
      };

      let payload: any = await fetchIndiaMart(effectiveKey, startTime, endTime);
      if (payload?.STATUS === 'FAILURE') {
        return res.status(502).json({ message: payload.MESSAGE || 'IndiaMART error', code: payload.CODE, details: payload });
      }
      let rows: any[] = Array.isArray(payload?.RESPONSE) ? payload.RESPONSE : [];

      // Fallback: if no rows and no date range provided, pull last 7 days
      if ((!startTime && !endTime) && rows.length === 0) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
        payload = await fetchIndiaMart(effectiveKey, fmt(weekAgo), fmt(now));
        if (payload?.STATUS === 'FAILURE') {
          return res.status(502).json({ message: payload.MESSAGE || 'IndiaMART error', code: payload.CODE, details: payload });
        }
        rows = Array.isArray(payload?.RESPONSE) ? payload.RESPONSE : [];
      }
      const storage = getStorage();
      let created = 0;
      for (const r of rows) {
        const name = (r.SENDER_NAME && r.SENDER_NAME !== 'IndiaMART Buyer') ? r.SENDER_NAME : (r.SENDER_EMAIL || r.SENDER_MOBILE || 'Unknown');
        const phone = r.SENDER_MOBILE || r.MOBILE || '';
        const email = r.SENDER_EMAIL || r.EMAIL || '';
        const company = r.SENDER_COMPANY || r.COMPANY || r.SUBJECT || 'IndiaMART Lead';
        const notes = r.QUERY_MESSAGE || r.SUBJECT || '';
        await storage.createLead({
          name,
          company,
          email,
          phone,
          status: 'new',
          category: 'industry',
          source: 'IndiaMART',
          notes,
          address: '', city: '', state: '', country: 'India', pincode: ''
        });
        created++;
      }
      // persist settings last synced
      await storage.updateCompanySettings({ integrations: { ...(settings?.integrations||{}), indiaMart: { ...(settings?.integrations?.indiaMart||{}), lastSyncedAt: new Date().toISOString() } } });
      res.json({ success: true, created, importedAt: new Date().toISOString(), totalReceived: rows.length });
    } catch (err) {
      next(err);
    }
  });

  // User Routes
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Company Settings Routes
  app.get("/api/company-settings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const storage = getStorage();
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/company-settings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const settingsData = req.body;
      const storage = getStorage();
      const settings = await storage.updateCompanySettings(settingsData);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  // Data Import Routes
  app.post("/api/import-data", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      console.log('Starting data import from web interface...');
      
      // Use child process to run the import script
      const { exec } = require('child_process');
      const path = require('path');
      
      const scriptPath = path.join(process.cwd(), 'import-excel.cjs');
      
      exec(`node "${scriptPath}"`, (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error('Data import failed:', error);
          return res.status(500).json({ 
            success: false, 
            message: "Data import failed", 
            error: error.message 
          });
        }
        
        if (stderr) {
          console.error('Data import stderr:', stderr);
        }
        
        console.log('Data import output:', stdout);
        
        res.json({ 
          success: true, 
          message: "Data import completed successfully",
          output: stdout
        });
      });
      
    } catch (error) {
      console.error('Data import failed:', error);
      res.status(500).json({ 
        success: false, 
        message: "Data import failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Invoice Management Routes
  app.get("/api/invoices", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'invoices:view', 'invoices')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const invoices = await storage.getAllInvoices();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? invoices : invoices.filter(i => i.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/invoices/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const storage = getStorage();
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check if invoice belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && invoice.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Invoice belongs to different company" });
      }

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/invoices", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'invoices:create', 'invoices')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/invoices/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      
      const storage = getStorage();
      const updated = await storage.updateInvoice(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/invoices/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'invoices:delete', 'invoices')) return res.status(403).json({ message: 'Forbidden' });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      
      const storage = getStorage();
      const deleted = await storage.deleteInvoice(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Generate Invoice PDF
  app.get("/api/invoices/:id/download-pdf", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      
      const storage = getStorage();
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      console.log('Generating Invoice PDF for invoice:', id);
      const pdfBuffer = await pdfGenerator.generateInvoicePDF(invoice);
      console.log('Invoice PDF generated, buffer size:', pdfBuffer.length);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Invoice PDF generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Invoice PDF generation failed: ${errorMessage}` });
    }
  });

  // Payment Management Routes
  app.get("/api/payments", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'payments:view', 'payments')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const payments = await storage.getAllPayments();
      const user = req.user as any;
      const filteredPayments = user.role === 'superuser' ? payments : payments.filter(p => p.companyId === user.companyId);
      // Transform payments to include customerName
      const paymentsWithCustomer = await Promise.all(filteredPayments.map(async (payment: any) => {
        if (payment.customerId) {
          const customer = await storage.getCustomer(payment.customerId);
          return {
            ...payment,
            customerName: customer?.name || 'Unknown Customer',
            receivedAmount: payment.amount || "0"
          };
        }
        return {
          ...payment,
          customerName: 'Unknown Customer',
          receivedAmount: payment.amount || "0"
        };
      }));
      res.json(paymentsWithCustomer);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payments/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }

      const storage = getStorage();
      const payment = await storage.getPayment(id);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      // Check if payment belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && payment.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Payment belongs to different company" });
      }

      res.json(payment);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/payments", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'payments:create', 'payments')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      const paymentData = insertPaymentSchema.parse({ ...req.body, companyId: user.companyId });
      const storage = getStorage();
      const payment = await storage.createPayment(paymentData);

      // Cross-module link: mark linked invoice as paid
      const invoiceId = (paymentData as any).invoiceId;
      if (invoiceId) {
        try {
          const invoice = await storage.getInvoice(Number(invoiceId));
          if (invoice && invoice.status !== 'paid') {
            await storage.updateInvoice(Number(invoiceId), { status: 'paid' } as any);
          }
        } catch (invErr) {
          console.error('[payment] failed to mark invoice as paid:', invErr);
        }
      }

      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/payments/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const storage = getStorage();
      const updated = await storage.updatePayment(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/payments/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'payments:delete', 'payments')) return res.status(403).json({ message: 'Forbidden' });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const storage = getStorage();
      const deleted = await storage.deletePayment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Sales Targets Management Routes
  app.get("/api/sales-targets", async (req, res, next) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'sales-targets:view', 'sales-targets')) return res.status(403).json({ message: 'Forbidden' });

      const storage = getStorage();
      const targets = await storage.getAllSalesTargets();
      const user = req.user as any;
      const filteredTargets = user.role === 'superuser' ? targets : targets.filter(t => t.companyId === user.companyId);
      // Transform targets to match frontend expectations
      const transformedTargets = await Promise.all(filteredTargets.map(async (target: any) => {
        let assignedToName = 'Unassigned';
        if (target.assignedTo) {
          const user = await storage.getUser(target.assignedTo);
          assignedToName = user?.name || `User ${target.assignedTo}`;
        }
        return {
          ...target,
          targetName: target.productName || target.targetName,
          assignedTo: assignedToName,
          targetValue: target.targetValue?.toString() || "0",
          actualValue: target.actualValue?.toString() || "0"
        };
      }));
      res.json(transformedTargets);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sales-targets/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid sales target ID" });
      }

      const storage = getStorage();
      const target = await storage.getSalesTarget(id);

      if (!target) {
        return res.status(404).json({ message: "Sales target not found" });
      }

      // Check if sales target belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && target.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Sales target belongs to different company" });
      }

      res.json(target);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sales-targets", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'sales-targets:create', 'sales-targets')) return res.status(403).json({ message: 'Forbidden' });

      const user = req.user as any;
      // Transform frontend data (targetName -> productName, assignedTo string -> id)
      const body = req.body;
      const targetData: any = {
        productName: body.targetName || body.productName || '',
        targetMonth: body.targetMonth || '',
        targetYear: body.targetYear || '',
        targetValue: typeof body.targetValue === 'string' ? parseInt(body.targetValue) || 0 : (body.targetValue || 0),
        actualValue: typeof body.actualValue === 'string' ? parseInt(body.actualValue) || 0 : (body.actualValue || 0),
        assignedTo: body.assignedToId || (typeof body.assignedTo === 'number' ? body.assignedTo : undefined),
        companyId: user.companyId,
        notes: body.notes || ''
      };

      const storage = getStorage();
      const target = await storage.createSalesTarget(targetData);
      // Return transformed response
      const assignedUser = target.assignedTo ? await storage.getUser(target.assignedTo) : null;
      res.status(201).json({
        ...target,
        targetName: target.productName,
        assignedTo: assignedUser?.name || 'Unassigned',
        targetValue: target.targetValue?.toString() || "0",
        actualValue: target.actualValue?.toString() || "0"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/sales-targets/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid sales target ID" });
      }
      
      // Transform frontend data
      const body = req.body;
      const updateData: any = {};
      if (body.targetName !== undefined) updateData.productName = body.targetName;
      if (body.targetMonth !== undefined) updateData.targetMonth = body.targetMonth;
      if (body.targetYear !== undefined) updateData.targetYear = body.targetYear;
      if (body.targetValue !== undefined) updateData.targetValue = typeof body.targetValue === 'string' ? parseInt(body.targetValue) || 0 : body.targetValue;
      if (body.actualValue !== undefined) updateData.actualValue = typeof body.actualValue === 'string' ? parseInt(body.actualValue) || 0 : body.actualValue;
      if (body.assignedToId !== undefined) updateData.assignedTo = body.assignedToId;
      if (body.notes !== undefined) updateData.notes = body.notes;
      
      const storage = getStorage();
      const updated = await storage.updateSalesTarget(id, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Sales target not found" });
      }
      
      // Return transformed response
      const user = updated.assignedTo ? await storage.getUser(updated.assignedTo) : null;
      res.json({
        ...updated,
        targetName: updated.productName,
        assignedTo: user?.name || 'Unassigned',
        targetValue: updated.targetValue?.toString() || "0",
        actualValue: updated.actualValue?.toString() || "0"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/sales-targets/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      if (!hasPermission(req, 'sales-targets:delete', 'sales-targets')) return res.status(403).json({ message: 'Forbidden' });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid sales target ID" });
      }
      
      const storage = getStorage();
      const deleted = await storage.deleteSalesTarget(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Sales target not found" });
      }
      
      res.json({ message: "Sales target deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Purchase Orders API
  // Debug endpoints (temporary) to help verify storage
  app.post("/api/debug/test-purchase-order", async (req, res, next) => {
    try {
      const storage = getStorage();
      const sample = {
        poNumber: `PO-${new Date().getFullYear()}-TEST-${Date.now()}`,
        supplierName: "Debug Supplier",
        orderDate: new Date().toISOString().split('T')[0],
        items: [{ name: "Debug Item", quantity: 1, unit: "pcs", unitPrice: 1, amount: 1 }],
        subtotal: 1,
        taxAmount: 0,
        totalAmount: 1,
        status: 'draft',
        createdAt: new Date()
      };

      const created = await storage.createPurchaseOrder(sample as any);
      res.status(201).json({ success: true, created });
    } catch (err) {
      console.error('Debug create purchase order failed:', err);
      res.status(500).json({ success: false, message: (err as any)?.message || 'Error' });
    }
  });

  app.get("/api/debug/purchase-orders", async (req, res, next) => {
    try {
      const storage = getStorage();
      const list = await storage.getAllPurchaseOrders();
      res.json(list);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/purchase-orders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const storage = getStorage();
      const purchaseOrders = await storage.getAllPurchaseOrders();
      const user = req.user as any;
      const filtered = user.role === 'superuser' ? purchaseOrders : purchaseOrders.filter(po => po.companyId === user.companyId);
      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) return res.status(404).json({ message: "Purchase order not found" });

      // Check if purchase order belongs to user's company (for non-superusers)
      const user = req.user as any;
      if (user.role !== 'superuser' && purchaseOrder.companyId !== user.companyId) {
        return res.status(403).json({ message: "Forbidden: Purchase order belongs to different company" });
      }

      res.json(purchaseOrder);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/purchase-orders", async (req, res, next) => {
    try {
      const user = req.user as any;
      const storage = getStorage();

      // Validate required fields
      if (!req.body.poNumber) {
        return res.status(400).json({ message: "PO Number is required" });
      }
      if (!req.body.supplierName) {
        return res.status(400).json({ message: "Supplier name is required" });
      }
      if (!req.body.orderDate) {
        return res.status(400).json({ message: "Order date is required" });
      }
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }

      // Calculate totals from items
      let subtotal = 0;
      const items = req.body.items.map((item: any) => {
        const quantity = parseFloat(item.quantity || 1);
        const rate = parseFloat(item.unitPrice || item.rate || 0);
        const amount = quantity * rate;
        subtotal += amount;
        return {
          ...item,
          quantity,
          unitPrice: rate,
          amount
        };
      });

      // Calculate tax (assuming 18% GST if not specified)
      const taxRate = parseFloat(req.body.taxRate || 18);
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      const purchaseOrderData = {
        ...req.body,
        items,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        companyId: user.companyId,
        createdAt: new Date()
      };

      console.log('Creating purchase order with calculated data:', JSON.stringify(purchaseOrderData, null, 2));

      const purchaseOrder = await storage.createPurchaseOrder(purchaseOrderData);
      res.status(201).json(purchaseOrder);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMessage });
    }
  });

  app.put("/api/purchase-orders/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) return res.status(404).json({ message: "Purchase order not found" });
      
      const updated = await storage.updatePurchaseOrder(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/purchase-orders/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) return res.status(404).json({ message: "Purchase order not found" });
      
      await storage.deletePurchaseOrder(id);
      res.json({ message: "Purchase order deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/purchase-orders/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) return res.status(404).json({ message: "Purchase order not found" });
      
      const supplier = purchaseOrder.supplierId ? await storage.getSupplier(purchaseOrder.supplierId) : null;
      const pdfBuffer = await pdfGenerator.generatePurchaseOrderPDF(purchaseOrder, supplier);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${purchaseOrder.poNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  });

  // PDF download routes for new modules
  app.get("/api/grns/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const grn = await storage.getGrn(id);
      if (!grn) return res.status(404).json({ message: "GRN not found" });
      const pdfBuffer = await pdfGenerator.generateGrnPDF(grn);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="GRN-${grn.grnNumber || id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) { next(error); }
  });

  app.get("/api/delivery-orders/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const order = await storage.getDeliveryOrder(id);
      if (!order) return res.status(404).json({ message: "Delivery order not found" });
      const pdfBuffer = await pdfGenerator.generateDeliveryOrderPDF(order);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="DO-${order.deliveryNumber || id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) { next(error); }
  });

  app.get("/api/production-orders/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const order = await storage.getProductionOrder(id);
      if (!order) return res.status(404).json({ message: "Production order not found" });
      const pdfBuffer = await pdfGenerator.generateProductionOrderPDF(order);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PRO-${order.orderNumber || id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) { next(error); }
  });

  app.get("/api/payroll/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const payslip = await storage.getPayslip(id);
      if (!payslip) return res.status(404).json({ message: "Payslip not found" });
      const pdfBuffer = await pdfGenerator.generatePayslipPDF(payslip);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Payslip-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) { next(error); }
  });

  app.get("/api/expense-claims/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const claim = await storage.getExpenseClaim(id);
      if (!claim) return res.status(404).json({ message: "Expense claim not found" });
      const pdfBuffer = await pdfGenerator.generateExpenseClaimPDF(claim);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Expense-${claim.claimNumber || id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) { next(error); }
  });

  app.get("/api/journal-entries/:id/download-pdf", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const storage = getStorage();
      const entry = await storage.getJournalEntry(id);
      if (!entry) return res.status(404).json({ message: "Journal entry not found" });
      const pdfBuffer = await pdfGenerator.generateJournalEntryPDF(entry);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="JE-${entry.entryNumber || id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) { next(error); }
  });

  // Server is started in index.ts, so we don't need to start it here
  return app as any;
}