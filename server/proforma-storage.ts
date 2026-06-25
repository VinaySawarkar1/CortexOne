import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

export type ProformaRecord = {
  id: number;
  quotationId?: number | null;
  quotationNumber: string; // we reuse this key for table compatibility
  proformaNumber?: string; // optional explicit field
  customerId?: number | null;
  leadId?: number | null;
  companyId?: number | null;
  contactPersonTitle?: string | null;
  contactPerson: string;
  customerCompany?: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  shippingAddressLine1?: string | null;
  shippingAddressLine2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingCountry?: string | null;
  shippingPincode?: string | null;
  items: any[];
  terms?: string | null;
  notes?: string | null;
  bankDetails?: any;
  extraCharges?: any[] | null;
  discounts?: any[] | null;
  discount?: string | null;
  discountType?: string | null;
  subtotal: string; // keep as string for compatibility with UI
  cgstTotal?: string | null;
  sgstTotal?: string | null;
  igstTotal?: string | null;
  taxableTotal?: string | null;
  totalAmount: string;
  status: string;
  createdAt: string | Date;
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PROFORMA_FILE);
  } catch {
    await fs.writeFile(PROFORMA_FILE, '[]', 'utf-8');
  }
}

async function readAll(): Promise<ProformaRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(PROFORMA_FILE, 'utf-8');
  try { return JSON.parse(raw); } catch { return []; }
}

async function writeAll(list: ProformaRecord[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(PROFORMA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

export const ProformaStore = {
  async getAll(): Promise<ProformaRecord[]> {
    return readAll();
  },

  async getById(id: number): Promise<ProformaRecord | undefined> {
    const list = await readAll();
    return list.find(p => p.id === id);
  },

  async createFromQuotation(quotation: any): Promise<ProformaRecord> {
    const list = await readAll();
    const nextId = (list.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
    const proformaNumber = `PF-${quotation.quotationNumber || quotation.id}`;
    const now = new Date().toISOString();
    const record: ProformaRecord = {
      id: nextId,
      quotationId: quotation.id ?? null,
      quotationNumber: proformaNumber, // reuse field for table display
      proformaNumber,
      customerId: quotation.customerId ?? null,
      leadId: quotation.leadId ?? null,
      contactPersonTitle: quotation.contactPersonTitle ?? null,
      contactPerson: quotation.contactPerson || quotation.customerName || '',
      customerCompany: quotation.customerCompany || '',
      addressLine1: quotation.addressLine1 || '',
      addressLine2: quotation.addressLine2 || null,
      city: quotation.city || '',
      state: quotation.state || '',
      country: quotation.country || 'India',
      pincode: quotation.pincode || '',
      shippingAddressLine1: quotation.shippingAddressLine1 || null,
      shippingAddressLine2: quotation.shippingAddressLine2 || null,
      shippingCity: quotation.shippingCity || null,
      shippingState: quotation.shippingState || null,
      shippingCountry: quotation.shippingCountry || null,
      shippingPincode: quotation.shippingPincode || null,
      items: Array.isArray(quotation.items) ? quotation.items : (typeof quotation.items === 'string' ? JSON.parse(quotation.items) : []),
      terms: quotation.terms || null,
      notes: quotation.notes || null,
      bankDetails: quotation.bankDetails || null,
      extraCharges: quotation.extraCharges || null,
      discounts: quotation.discounts || null,
      discount: quotation.discount || null,
      discountType: quotation.discountType || null,
      subtotal: String(quotation.subtotal ?? '0'),
      cgstTotal: String(quotation.cgstTotal ?? '0'),
      sgstTotal: String(quotation.sgstTotal ?? '0'),
      igstTotal: String(quotation.igstTotal ?? '0'),
      taxableTotal: String(quotation.taxableTotal ?? '0'),
      totalAmount: String(quotation.totalAmount ?? '0'),
      status: 'draft',
      createdAt: now,
    };
    list.push(record);
    await writeAll(list);
    return record;
  },

  async update(id: number, update: Partial<ProformaRecord>): Promise<ProformaRecord | undefined> {
    const list = await readAll();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...update } as ProformaRecord;
    await writeAll(list);
    return list[idx];
  },

  async remove(id: number): Promise<boolean> {
    const list = await readAll();
    const next = list.filter(p => p.id !== id);
    const changed = next.length !== list.length;
    if (changed) await writeAll(next);
    return changed;
  }
};


