import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as htmlPdfNode from 'html-pdf-node';
import {
  quotationTemplate,
  proformaTemplate,
  invoiceTemplate,
  deliveryChallanTemplate,
  jobOrderTemplate,
  purchaseOrderTemplate,
  PrintConfig
} from './templates';
import { getStorage } from './storage-init';

class PDFGenerator {
  private browser: puppeteer.Browser | null = null;

  // Helper function to safely parse items from JSON
  private parseItems(items: any): any[] {
    if (Array.isArray(items)) {
      return items;
    }
    if (typeof items === 'string') {
      try {
        return JSON.parse(items);
      } catch {
        console.warn('Failed to parse items JSON:', items);
        return [];
      }
    }
    return [];
  }

  // Helper function to format date
  private formatDate(date: any): string {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toLocaleDateString('en-GB');
    return 'N/A';
  }

  // Helper function to format valid until date
  private formatValidUntil(date: any): string {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toLocaleDateString('en-GB');
    return 'N/A';
  }

  // Helper function to convert number to words
  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      if (num % 10 === 0) return tens[Math.floor(num / 10)];
      return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
    }
    if (num < 1000) {
      if (num % 100 === 0) return ones[Math.floor(num / 100)] + ' Hundred';
      return ones[Math.floor(num / 100)] + ' Hundred and ' + this.numberToWords(num % 100);
    }
    if (num < 100000) {
      if (num % 1000 === 0) return this.numberToWords(Math.floor(num / 1000)) + ' Thousand';
      return this.numberToWords(Math.floor(num / 1000)) + ' Thousand ' + this.numberToWords(num % 1000);
    }
    if (num < 10000000) {
      if (num % 100000 === 0) return this.numberToWords(Math.floor(num / 100000)) + ' Lakh';
      return this.numberToWords(Math.floor(num / 100000)) + ' Lakh ' + this.numberToWords(num % 100000);
    }
    if (num % 10000000 === 0) return this.numberToWords(Math.floor(num / 10000000)) + ' Crore';
    return this.numberToWords(Math.floor(num / 10000000)) + ' Crore ' + this.numberToWords(num % 10000000);
  }

  // Get Puppeteer launch options optimized for Render
  private getPuppeteerOptions(): puppeteer.LaunchOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Render-specific configuration with multiple fallback paths
      const possiblePaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/opt/google/chrome/chrome',
        '/opt/chromium/chromium'
      ];
      
      // Find the first available Chrome/Chromium executable
      let executablePath: string | undefined;
      try {
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            executablePath = path;
            console.log(`Found Chrome/Chromium at: ${path}`);
            break;
          }
        }
      } catch (error) {
        console.warn('Could not check Chrome/Chromium paths:', error);
      }
      
      return {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ],
        executablePath: executablePath || process.env.PUPPETEER_EXECUTABLE_PATH,
        timeout: 60000,
        protocolTimeout: 60000
      };
    } else {
      // Development configuration - try to find Chrome in Puppeteer cache
      let executablePath: string | undefined;
      
      // Check for PUPPETEER_EXECUTABLE_PATH environment variable first
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      } else {
        // Try to find Chrome in common Puppeteer cache locations for Windows
        const homedir = os.homedir();
        const possibleCachePaths = [
          // Default Puppeteer cache location
          path.join(homedir, '.cache', 'puppeteer', 'chrome'),
          path.join(homedir, '.cache', 'puppeteer', 'chromium'),
          // Alternative locations
          process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'puppeteer', 'chrome') : null,
          process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'puppeteer', 'chromium') : null,
        ].filter((p): p is string => p !== null);
        
        // Search for chrome.exe in cache directories
        try {
          for (const cachePath of possibleCachePaths) {
            if (fs.existsSync(cachePath)) {
              // Look for chrome.exe or chromium.exe in subdirectories
              const findExecutable = (dir: string): string | null => {
                try {
                  const entries = fs.readdirSync(dir, { withFileTypes: true });
                  for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                      const found = findExecutable(fullPath);
                      if (found) return found;
                    } else if (entry.name === 'chrome.exe' || entry.name === 'chromium.exe') {
                      return fullPath;
                    }
                  }
                } catch (err) {
                  // Continue searching
                }
                return null;
              };
              
              const found = findExecutable(cachePath);
              if (found && fs.existsSync(found)) {
                executablePath = found;
                console.log(`Found Chrome at: ${executablePath}`);
                break;
              }
            }
          }
        } catch (error) {
          console.warn('Could not search for Chrome in cache:', error);
        }
        
        // If still not found, try using Puppeteer's default browser path
        if (!executablePath) {
          try {
            // Puppeteer might have Chrome installed via @puppeteer/browsers
            // Try to get it from the default cache location
            const puppeteerCache = path.join(os.homedir(), '.cache', 'puppeteer');
            if (fs.existsSync(puppeteerCache)) {
              console.log('Searching for Chrome in Puppeteer cache...');
              // Let Puppeteer try to find it automatically by not specifying executablePath
            }
          } catch (error) {
            console.warn('Could not check Puppeteer default cache:', error);
          }
        }
      }
      
      const options: puppeteer.LaunchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      };
      
      // Only set executablePath if we found it, otherwise let Puppeteer find it automatically
      if (executablePath) {
        options.executablePath = executablePath;
      } else {
        console.log('Chrome executable path not specified, Puppeteer will attempt to find it automatically');
      }
      
      return options;
    }
  }

  // Fallback PDF generation using html-pdf-node (no Chrome required)
  private async generatePDFFallback(html: string): Promise<Buffer> {
    try {
      const options = {
        format: 'A4',
        margin: {
          top: '5mm',
          right: '5mm',
          bottom: '5mm',
          left: '5mm'
        },
        printBackground: true
      };
      
      const pdfBuffer = await htmlPdfNode.generatePdf({ content: html }, options);
      console.log('PDF generated using html-pdf-node fallback');
      return pdfBuffer;
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      throw new Error('PDF generation failed: No Chrome/Chromium available and fallback failed');
    }
  }

  // Build and return the HTML for a quotation without generating PDF
  async generateQuotationHTML(quotation: any, printConfig?: PrintConfig): Promise<string> {
    try {
      const storage = getStorage();
      const companySettings = await storage.getCompanySettings();
      let companyInfo = {
        name: companySettings?.name || "BizSuite",
        address: companySettings?.address || "",
        phone: companySettings?.phone || "",
        email: companySettings?.email || "",
        gstin: companySettings?.gstNumber || "",
        logo: companySettings?.logo || "",
        bankDetails: companySettings?.bankDetails || {
          bankName: "",
          accountNo: "",
          ifsc: "",
          branch: ""
        }
      };
      try {
        if (quotation.companyId) {
          const companyRecord = await storage.getCompany(quotation.companyId);
          if (companyRecord) {
            companyInfo = {
              name: companyRecord.name || companyInfo.name,
              address: companyRecord.address || companyInfo.address,
              phone: companyRecord.phone || companyInfo.phone,
              email: companyRecord.email || companyInfo.email,
              gstin: companyRecord.gstNumber || companyInfo.gstin,
              logo: companyInfo.logo,
              bankDetails: companyInfo.bankDetails
            };
          }
        }
      } catch (err) {}

      // Customer lookup (robust)
      let customerDetails = null;
      try {
        const rawCid = quotation.customerId;
        const cidNum = rawCid !== undefined && rawCid !== null ? Number(rawCid) : NaN;
        if (!isNaN(cidNum)) {
          customerDetails = await storage.getCustomer(cidNum as any);
        }
        if (!customerDetails && typeof (storage as any).getAllCustomers === 'function') {
          const allCust = await (storage as any).getAllCustomers();
          customerDetails = allCust.find((c: any) => String(c.id) === String(rawCid) || String(c._id || '') === String(rawCid) || (c.email && quotation.customerEmail && c.email === quotation.customerEmail));
        }
      } catch (err) {}

      const html = quotationTemplate({
        company: companyInfo,
        quoteNumber: quotation.quotationNumber || quotation.id,
        date: this.formatDate(quotation.quotationDate),
        validUntil: this.formatDate(quotation.validUntil),
        terms: quotation.terms,
        customer: {
          company: quotation.customerCompany || customerDetails?.company || quotation.customerName || quotation.customer?.name || "",
          name: quotation.contactPerson || quotation.customerName || quotation.customer?.name || "",
          contactPersonTitle: quotation.contactPersonTitle,
          contactPerson: quotation.contactPerson,
          address: quotation.addressLine1 || quotation.customerAddress || quotation.customer?.address || "",
          city: quotation.city || quotation.customerCity || quotation.customer?.city || "",
          gstin: quotation.customerGstin || customerDetails?.gstNumber || quotation.customer?.gstin || "",
          phone: quotation.customerPhone || customerDetails?.phone || quotation.customer?.phone || "",
          email: quotation.customerEmail || customerDetails?.email || quotation.customer?.email || ""
        },
        items: this.parseItems(quotation.items),
        subtotal: typeof quotation.subtotal === 'string' ? parseFloat(quotation.subtotal) : (quotation.subtotal || 0),
        cgst: typeof quotation.cgstTotal === 'string' ? parseFloat(quotation.cgstTotal) : (quotation.cgstTotal || 0),
        sgst: typeof quotation.sgstTotal === 'string' ? parseFloat(quotation.sgstTotal) : (quotation.sgstTotal || 0),
        igst: typeof quotation.igstTotal === 'string' ? parseFloat(quotation.igstTotal) : (quotation.igstTotal || 0),
        discount: typeof quotation.discount === 'string' ? parseFloat(quotation.discount) : (quotation.discount || 0),
        discountType: quotation.discountType || "percentage",
        totalAmount: typeof quotation.totalAmount === 'string' ? parseFloat(quotation.totalAmount) : (quotation.totalAmount || 0),
        amountInWords: quotation.amountInWords || this.numberToWords(typeof quotation.totalAmount === 'string' ? parseFloat(quotation.totalAmount) : (quotation.totalAmount || 0)),
        currency: "INR",
        printConfig: printConfig
      });

      if (process.env.PDF_DEBUG) {
        try { console.log('PDF_DEBUG: quotation.customerCompany=', quotation?.customerCompany); } catch {}
        try { console.log('PDF_DEBUG: resolved customerDetails=', JSON.stringify(customerDetails)); } catch {}
      }

      return html;
    } catch (err) {
      throw err;
    }
  }

  // Simple, reliable PDF generation for quotations
    async generateQuotationPDF(quotation: any, printConfig?: PrintConfig): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    
    try {
      console.log('Starting simple quotation PDF generation...');

      // Get company settings (global) and prefer quotation-specific company if available
      const storage = getStorage();
      const companySettings = await storage.getCompanySettings();
      let companyInfo = {
        name: companySettings?.name || "BizSuite",
        address: companySettings?.address || "",
        phone: companySettings?.phone || "",
        email: companySettings?.email || "",
        gstin: companySettings?.gstNumber || "",
        logo: companySettings?.logo || "",
        bankDetails: companySettings?.bankDetails || {
          bankName: "",
          accountNo: "",
          ifsc: "",
          branch: ""
        }
      };
      // If quotation belongs to a company (multi-tenant), prefer that company's details
      try {
        if (quotation.companyId) {
          const companyRecord = await storage.getCompany(quotation.companyId);
          if (companyRecord) {
            companyInfo = {
              name: companyRecord.name || companyInfo.name,
              address: companyRecord.address || companyInfo.address,
              phone: companyRecord.phone || companyInfo.phone,
              email: companyRecord.email || companyInfo.email,
              gstin: companyRecord.gstNumber || companyInfo.gstin,
              logo: companyInfo.logo,
              bankDetails: companyInfo.bankDetails
            };
          }
        }
      } catch (err) {
        // ignore and fall back to global settings
      }
      
      // Get customer details if customerId exists (be resilient to string/number/ObjectId values)
      let customerDetails = null;
      try {
        const rawCid = quotation.customerId;
        const cidNum = rawCid !== undefined && rawCid !== null ? Number(rawCid) : NaN;
        if (!isNaN(cidNum)) {
          customerDetails = await storage.getCustomer(cidNum as any);
        }
        // Fallback: search all customers for matching id/_id or email if lookup failed
        if (!customerDetails && typeof (storage as any).getAllCustomers === 'function') {
          const allCust = await (storage as any).getAllCustomers();
          customerDetails = allCust.find((c: any) => String(c.id) === String(rawCid) || String(c._id || '') === String(rawCid) || (c.email && quotation.customerEmail && c.email === quotation.customerEmail));
        }
      } catch (err) {
        // ignore lookup failures
      }

      // Generate HTML content using the template
      const html = quotationTemplate({
        company: companyInfo,
        quoteNumber: quotation.quotationNumber || quotation.id,
        date: this.formatDate(quotation.quotationDate),
        validUntil: this.formatDate(quotation.validUntil),
        terms: quotation.terms,
        customer: {
          company: quotation.customerCompany || customerDetails?.company || quotation.customerName || quotation.customer?.name || "",
          name: quotation.contactPerson || quotation.customerName || quotation.customer?.name || "",
          contactPersonTitle: quotation.contactPersonTitle,
          contactPerson: quotation.contactPerson,
          address: quotation.addressLine1 || quotation.customerAddress || quotation.customer?.address || "",
          city: quotation.city || quotation.customerCity || quotation.customer?.city || "",
          gstin: quotation.customerGstin || customerDetails?.gstNumber || quotation.customer?.gstin || "",
          phone: quotation.customerPhone || customerDetails?.phone || quotation.customer?.phone || "",
          email: quotation.customerEmail || customerDetails?.email || quotation.customer?.email || ""
        },
        items: this.parseItems(quotation.items),
        subtotal: typeof quotation.subtotal === 'string' ? parseFloat(quotation.subtotal) : (quotation.subtotal || 0),
        cgst: typeof quotation.cgstTotal === 'string' ? parseFloat(quotation.cgstTotal) : (quotation.cgstTotal || 0),
        sgst: typeof quotation.sgstTotal === 'string' ? parseFloat(quotation.sgstTotal) : (quotation.sgstTotal || 0),
        igst: typeof quotation.igstTotal === 'string' ? parseFloat(quotation.igstTotal) : (quotation.igstTotal || 0),
        discount: typeof quotation.discount === 'string' ? parseFloat(quotation.discount) : (quotation.discount || 0),
        discountType: quotation.discountType || "percentage",
        totalAmount: typeof quotation.totalAmount === 'string' ? parseFloat(quotation.totalAmount) : (quotation.totalAmount || 0),
        amountInWords: quotation.amountInWords || this.numberToWords(typeof quotation.totalAmount === 'string' ? parseFloat(quotation.totalAmount) : (quotation.totalAmount || 0)),
        currency: "INR",
        printConfig: printConfig
      });
      
      // Log resolved customer details for debugging when `PDF_DEBUG` is set
      try {
        if (process.env.PDF_DEBUG) {
          console.log('PDF_DEBUG: quotation.customerCompany=', quotation?.customerCompany);
          try {
            console.log('PDF_DEBUG: resolved customerDetails=', JSON.stringify(customerDetails));
          } catch (err) {
            console.log('PDF_DEBUG: resolved customerDetails (non-serializable)');
          }
        }
      } catch (err) {
        // ignore debug errors
      }

      // Try Puppeteer first, fallback to html-pdf-node if it fails
      try {
      // Create a simple, fresh browser instance
        tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      
      // Create page
      page = await tempBrowser.newPage();
      
      // Set content directly
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      
      // Wait a bit for content to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '5mm',
          right: '5mm',
          bottom: '5mm',
          left: '5mm'
        }
      });

        console.log('Quotation PDF generated successfully with Puppeteer');
      return Buffer.from(pdfBuffer);
      } catch (puppeteerError) {
        console.warn('Puppeteer failed, trying fallback method:', puppeteerError);
        
        // Clean up Puppeteer resources
        if (page) {
          try { await page.close(); } catch {}
        }
        if (tempBrowser) {
          try { await tempBrowser.close(); } catch {}
        }
        
        // Use fallback method
        return await this.generatePDFFallback(html);
      }
      
    } catch (error) {
      console.error('Quotation PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.warn('Error closing page:', error);
        }
      }
      
      if (tempBrowser) {
        try {
          await tempBrowser.close();
        } catch (error) {
          console.warn('Error closing browser:', error);
        }
      }
    }
  }

  // Simple Proforma Invoice generation using same stable approach
  async generateProformaInvoicePDF(quotation: any, printConfig?: PrintConfig): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    try {
      // Company settings
      const storage = getStorage();
      const companySettings = await storage.getCompanySettings();
      let companyInfo = {
        name: companySettings?.name || "BizSuite",
        address: companySettings?.address || "",
        phone: companySettings?.phone || "",
        email: companySettings?.email || "",
        gstin: companySettings?.gstNumber || "",
        logo: companySettings?.logo || "",
        bankDetails: companySettings?.bankDetails || {
          bankName: "",
          accountNo: "",
          ifsc: "",
          branch: ""
        }
      };
      try {
        if (quotation.companyId) {
          const companyRecord = await storage.getCompany(quotation.companyId);
          if (companyRecord) {
            companyInfo = {
              name: companyRecord.name || companyInfo.name,
              address: companyRecord.address || companyInfo.address,
              phone: companyRecord.phone || companyInfo.phone,
              email: companyRecord.email || companyInfo.email,
              gstin: companyRecord.gstNumber || companyInfo.gstin,
              logo: companyInfo.logo,
              bankDetails: companyInfo.bankDetails
            };
          }
        }
      } catch (err) {}
      
      // Customer details (robust lookup similar to quotations)
      let customerDetails = null;
      try {
        const rawCid = quotation.customerId;
        const cidNum = rawCid !== undefined && rawCid !== null ? Number(rawCid) : NaN;
        if (!isNaN(cidNum)) {
          customerDetails = await storage.getCustomer(cidNum as any);
        }
        if (!customerDetails && typeof (storage as any).getAllCustomers === 'function') {
          const allCust = await (storage as any).getAllCustomers();
          customerDetails = allCust.find((c: any) => String(c.id) === String(rawCid) || String(c._id || '') === String(rawCid) || (c.email && quotation.customerEmail && c.email === quotation.customerEmail));
        }
      } catch (err) {}

      const html = proformaTemplate({
        company: companyInfo,
        invoiceNumber: quotation.quotationNumber || quotation.id,
        invoiceDate: this.formatDate(quotation.quotationDate),
        validUntil: this.formatDate(quotation.validUntil),
        terms: quotation.terms,
        notes: quotation.notes,
        customer: {
          company: quotation.customerCompany || customerDetails?.company || quotation.customerName || quotation.customer?.name || "",
          name: quotation.contactPerson || quotation.customerName || quotation.customer?.name || "",
          address: quotation.addressLine1 || quotation.customerAddress || quotation.customer?.address || "",
          city: quotation.city || quotation.customerCity || quotation.customer?.city || "",
          state: quotation.state || customerDetails?.state || quotation.customer?.state || "",
          country: quotation.country || customerDetails?.country || quotation.customer?.country || "India",
          gstin: quotation.customerGstin || customerDetails?.gstNumber || quotation.customer?.gstin || "",
          phone: quotation.customerPhone || customerDetails?.phone || quotation.customer?.phone || "",
          email: quotation.customerEmail || customerDetails?.email || quotation.customer?.email || ""
        },
        shipping: {
          company: quotation.customerCompany || customerDetails?.company || "",
          name: quotation.contactPerson || customerDetails?.name || "",
          address: quotation.shippingAddressLine1 || quotation.addressLine1 || customerDetails?.address || "",
          city: quotation.shippingCity || quotation.city || customerDetails?.city || "",
          state: quotation.shippingState || quotation.state || customerDetails?.state || "",
          country: quotation.shippingCountry || quotation.country || customerDetails?.country || "India",
          pincode: quotation.shippingPincode || quotation.pincode || customerDetails?.pincode || "",
          phone: quotation.customerPhone || customerDetails?.phone || "",
          email: quotation.customerEmail || customerDetails?.email || ""
        },
        items: this.parseItems(quotation.items),
        subtotal: typeof quotation.subtotal === 'string' ? parseFloat(quotation.subtotal) : (quotation.subtotal || 0),
        cgst: typeof quotation.cgstTotal === 'string' ? parseFloat(quotation.cgstTotal) : (quotation.cgstTotal || 0),
        sgst: typeof quotation.sgstTotal === 'string' ? parseFloat(quotation.sgstTotal) : (quotation.sgstTotal || 0),
        igst: typeof quotation.igstTotal === 'string' ? parseFloat(quotation.igstTotal) : (quotation.igstTotal || 0),
        discount: typeof quotation.discount === 'string' ? parseFloat(quotation.discount) : (quotation.discount || 0),
        discountType: quotation.discountType || 'percentage',
        totalAmount: typeof quotation.totalAmount === 'string' ? parseFloat(quotation.totalAmount) : (quotation.totalAmount || 0)
      });

      // Try Puppeteer first, fallback to html-pdf-node if it fails
      try {
        tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
        page = await tempBrowser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
        });
        
        console.log('Proforma Invoice PDF generated successfully with Puppeteer');
        return Buffer.from(pdfBuffer);
      } catch (puppeteerError) {
        console.warn('Puppeteer failed for proforma invoice, trying fallback method:', puppeteerError);
        
        // Clean up Puppeteer resources
        if (page) {
          try { await page.close(); } catch {}
        }
        if (tempBrowser) {
          try { await tempBrowser.close(); } catch {}
        }
        
        // Use fallback method
        return await this.generatePDFFallback(html);
      }
    } catch (error) {
      console.error('Proforma Invoice PDF generation failed:', error);
      throw new Error(`Proforma invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
    }
  }

  async generateInvoicePDF(invoice: any, printConfig?: PrintConfig): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    try {
      // Company settings
      const storage = getStorage();
      const companySettings = await storage.getCompanySettings();
      let companyInfo = {
        name: companySettings?.name || "BizSuite",
        address: companySettings?.address || "",
        phone: companySettings?.phone || "",
        email: companySettings?.email || "",
        gstin: companySettings?.gstNumber || "",
        logo: companySettings?.logo || "",
        bankDetails: companySettings?.bankDetails || {}
      };
      try {
        if (quotation.customerId) {
          const companyRecord = await storage.getCompany(quotation.customerId as any);
          if (companyRecord) {
            companyInfo = {
              name: companyRecord.name || companyInfo.name,
              address: companyRecord.address || companyInfo.address,
              phone: companyRecord.phone || companyInfo.phone,
              email: companyRecord.email || companyInfo.email,
              gstin: companyRecord.gstNumber || companyInfo.gstin,
              logo: companyInfo.logo,
              bankDetails: companyInfo.bankDetails
            };
          }
        }
      } catch (err) {}
      
      // Customer details (robust lookup for invoice)
      let customerDetails = null;
      try {
        const rawCid = invoice.customerId;
        const cidNum = rawCid !== undefined && rawCid !== null ? Number(rawCid) : NaN;
        if (!isNaN(cidNum)) {
          customerDetails = await storage.getCustomer(cidNum as any);
        }
        if (!customerDetails && typeof (storage as any).getAllCustomers === 'function') {
          const allCust = await (storage as any).getAllCustomers();
          customerDetails = allCust.find((c: any) => String(c.id) === String(rawCid) || String(c._id || '') === String(rawCid) || (c.email && invoice.customerEmail && c.email === invoice.customerEmail));
        }
      } catch (err) {}

      const html = invoiceTemplate({
        company: companyInfo,
        invoiceNumber: invoice.invoiceNumber || invoice.id,
        invoiceDate: this.formatDate(invoice.invoiceDate),
        dueDate: this.formatDate(invoice.dueDate),
        terms: invoice.terms,
        notes: invoice.notes,
        customer: {
          company: invoice.customerCompany || customerDetails?.company || "",
          name: customerDetails?.name || invoice.customerName || "",
          address: invoice.addressLine1 || customerDetails?.address || "",
          city: invoice.city || customerDetails?.city || "",
          state: invoice.state || customerDetails?.state || "",
          country: invoice.country || customerDetails?.country || "India",
          gstin: invoice.customerGstin || customerDetails?.gstNumber || "",
          phone: customerDetails?.phone || "",
          email: customerDetails?.email || "",
        },
        shipping: {
          company: invoice.shippingCompany || invoice.customerCompany || "",
          name: invoice.shippingContactPerson || "",
          address: invoice.shippingAddressLine1 || invoice.addressLine1 || "",
          city: invoice.shippingCity || invoice.city || "",
          state: invoice.shippingState || invoice.state || "",
          country: invoice.shippingCountry || invoice.country || "India",
          pincode: invoice.shippingPincode || invoice.pincode || "",
          phone: customerDetails?.phone || "",
          email: customerDetails?.email || "",
        },
        items: this.parseItems(invoice.items),
        subtotal: typeof invoice.subtotal === 'string' ? parseFloat(invoice.subtotal) || 0 : (invoice.subtotal || 0),
        cgstTotal: typeof invoice.cgstTotal === 'string' ? parseFloat(invoice.cgstTotal) || 0 : (invoice.cgstTotal || 0),
        sgstTotal: typeof invoice.sgstTotal === 'string' ? parseFloat(invoice.sgstTotal) || 0 : (invoice.sgstTotal || 0),
        igstTotal: typeof invoice.igstTotal === 'string' ? parseFloat(invoice.igstTotal) || 0 : (invoice.igstTotal || 0),
        cgst: typeof invoice.cgstTotal === 'string' ? parseFloat(invoice.cgstTotal) || 0 : (invoice.cgstTotal || 0),
        sgst: typeof invoice.sgstTotal === 'string' ? parseFloat(invoice.sgstTotal) || 0 : (invoice.sgstTotal || 0),
        igst: typeof invoice.igstTotal === 'string' ? parseFloat(invoice.igstTotal) || 0 : (invoice.igstTotal || 0),
        totalAmount: typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) || 0 : (invoice.totalAmount || 0),
        paidAmount: typeof invoice.paidAmount === 'string' ? parseFloat(invoice.paidAmount) || 0 : (invoice.paidAmount || 0),
        discount: invoice.discount ? (typeof invoice.discount === 'string' ? parseFloat(invoice.discount) : invoice.discount) : 0,
        discountType: invoice.discountType || 'amount',
        printConfig: printConfig
      });

      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 500));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' } });
      return Buffer.from(pdf);
    } finally {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
    }
  }

  async generateDeliveryChallanPDF(data: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    try {
      const storage = getStorage();
      const companySettings = await storage.getCompanySettings();
      const html = deliveryChallanTemplate({
        company: {
          name: companySettings?.name || "BizSuite",
          address: companySettings?.address || "",
          phone: companySettings?.phone || "",
          email: companySettings?.email || "",
          gstin: companySettings?.gstNumber || "",
          logo: companySettings?.logo || "",
          bankDetails: companySettings?.bankDetails || {}
        },
        challanNumber: data.orderNumber || data.id,
        challanDate: this.formatDate(data.createdAt),
        customer: {
          company: data.customerCompany || data.customerName || "",
          name: data.customerName || "",
          address: data.address || "",
          city: data.city || "",
          gstin: data.gstNumber || "",
          phone: data.phone || "",
          email: data.email || ""
        },
        items: this.parseItems(data.items)
      });
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 500));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' } });
      return Buffer.from(pdf);
    } finally {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
    }
  }

  async generateInternalOrderPDF(order: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    try {
      const storage = getStorage();
      const companySettings = await storage.getCompanySettings();
      const html = jobOrderTemplate({
        company: {
          name: companySettings?.name || "BizSuite",
          address: companySettings?.address || "",
          phone: companySettings?.phone || "",
          email: companySettings?.email || "",
          gstin: companySettings?.gstNumber || "",
          logo: companySettings?.logo || "",
          bankDetails: companySettings?.bankDetails || {}
        },
        orderNumber: order.orderNumber || order.id,
        orderDate: this.formatDate(order.createdAt),
        customer: {
          company: order.customerCompany || order.customerName || "",
          name: order.customerName || "",
          address: order.address || ""
        },
        items: this.parseItems(order.items)
      });
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 500));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' } });
      return Buffer.from(pdf);
    } finally {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
    }
  }

  async generatePurchaseOrderPDF(order: any, supplier?: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    
    console.log('Starting purchase order PDF generation...');

    // Get company settings
    const storage = getStorage();
    const companySettings = await storage.getCompanySettings();
    
    // Parse items from the order
    const items = this.parseItems(order.items);
    
    // Calculate totals
    const subtotal = parseFloat(order.subtotal || "0");
    const taxAmount = parseFloat(order.taxAmount || "0");
    const totalAmount = parseFloat(order.totalAmount || "0");
    
    // Generate HTML content using the template
    const html = purchaseOrderTemplate({
      company: {
        name: companySettings?.name || "Business AI",
        address: companySettings?.address || "",
        phone: companySettings?.phone || "",
        email: companySettings?.email || "",
        gstin: companySettings?.gstNumber || "",
        logo: companySettings?.logo || "",
        state: companySettings?.state || ""
      },
      poNumber: order.poNumber || `PO-${order.id}`,
      poDate: this.formatDate(order.orderDate),
      expectedDelivery: order.expectedDelivery ? this.formatDate(order.expectedDelivery) : undefined,
      vendor: {
        name: order.supplierName || supplier?.name || "Supplier",
        company: order.supplierCompany || supplier?.company || "",
        title: order.supplierTitle || "",
        address: order.supplierAddress || supplier?.address || "",
        city: order.supplierCity || supplier?.city || "",
        state: order.supplierState || supplier?.state || "",
        country: order.supplierCountry || supplier?.country || "",
        pincode: order.supplierPincode || supplier?.pincode || "",
        gstin: order.supplierGstin || supplier?.gstNumber || "",
        pan: order.supplierPan || supplier?.panNumber || "",
        phone: order.supplierPhone || supplier?.phone || "",
        email: order.supplierEmail || supplier?.email || ""
      },
      items: items.map(item => ({
        name: item.name || item.description || "",
        description: item.description || "",
        quantity: item.quantity || 1,
        unit: item.unit || "pcs",
        rate: parseFloat(item.unitPrice || item.rate || "0"),
        amount: (item.quantity || 1) * parseFloat(item.unitPrice || item.rate || "0")
      })),
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      extraCharges: order.extraCharges || [],
      discounts: order.discounts || [],
      deliveryTerms: order.deliveryTerms || "As per vendor",
      paymentTerms: order.paymentTerms || "As per contract",
      terms: order.terms || [],
      notes: (order.notes && typeof order.notes === 'string') ? order.notes : (order.notes ? String(order.notes) : ""),
      currency: "INR",
      printConfig: undefined // Can be passed from request if needed
    });
    
    console.log('Purchase Order PDF - Notes value:', order.notes, 'Type:', typeof order.notes);

    // Try Puppeteer first, fallback to html-pdf-node if it fails
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 500));
      
      const pdf = await page.pdf({ 
        format: 'A4', 
        printBackground: true, 
        margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' } 
      });
      
      // Clean up before returning
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      
      return Buffer.from(pdf);
    } catch (puppeteerError: any) {
      console.warn('Puppeteer failed for purchase order PDF, trying fallback method:', puppeteerError?.message || puppeteerError);
      
      // Clean up Puppeteer resources
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      
      // Use fallback method
      try {
        return await this.generatePDFFallback(html);
      } catch (fallbackError) {
        console.error('Both Puppeteer and fallback PDF generation failed:', fallbackError);
        throw new Error(`Failed to generate purchase order PDF: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  private generateGrnHTML(grn: any, company: any): string {
    const items = this.parseItems(grn.items);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
      h1{font-size:20px;margin:0}h2{font-size:14px;margin:0 0 4px}
      .header{display:flex;justify-content:space-between;margin-bottom:16px}
      .info{margin-bottom:12px;font-size:11px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;padding:6px;text-align:left;border:1px solid #ccc;font-size:11px}
      td{padding:5px 6px;border:1px solid #ddd;font-size:11px}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;background:#d1fae5;color:#065f46}
      .totals{text-align:right;margin-top:8px;font-size:12px}
    </style></head><body>
    <div class="header">
      <div><h1>Goods Receipt Note</h1><div style="font-size:11px;color:#666">${company.name}</div></div>
      <div style="text-align:right;font-size:11px">
        <div><strong>GRN #:</strong> ${grn.grnNumber || `GRN-${grn.id}`}</div>
        <div><strong>Date:</strong> ${this.formatDate(grn.receiptDate || grn.createdAt)}</div>
        <div><strong>PO #:</strong> ${grn.poNumber || '—'}</div>
        <div><span class="badge">${(grn.status || 'draft').toUpperCase()}</span></div>
      </div>
    </div>
    <div class="info">
      <strong>Supplier:</strong> ${grn.supplierName || '—'} &nbsp;|&nbsp;
      <strong>Warehouse:</strong> ${grn.warehouse || '—'} &nbsp;|&nbsp;
      <strong>Received By:</strong> ${grn.receivedBy || '—'}
    </div>
    <table><thead><tr><th>#</th><th>Product</th><th>Ordered Qty</th><th>Received Qty</th><th>Unit</th><th>Unit Cost</th><th>Total</th></tr></thead>
    <tbody>${items.map((item: any, i: number) => `<tr>
      <td>${i + 1}</td><td>${item.name || item.description || ''}</td>
      <td>${item.orderedQty || item.quantity || 0}</td>
      <td>${item.receivedQty || item.quantity || 0}</td>
      <td>${item.unit || 'pcs'}</td>
      <td>₹${parseFloat(item.unitCost || item.unitPrice || '0').toFixed(2)}</td>
      <td>₹${((item.receivedQty || item.quantity || 0) * parseFloat(item.unitCost || item.unitPrice || '0')).toFixed(2)}</td>
    </tr>`).join('')}</tbody></table>
    <div class="totals"><strong>Total Amount: ₹${parseFloat(grn.totalAmount || '0').toFixed(2)}</strong></div>
    ${grn.notes ? `<div style="margin-top:12px;font-size:11px"><strong>Notes:</strong> ${grn.notes}</div>` : ''}
    </body></html>`;
  }

  async generateGrnPDF(grn: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    const storage = getStorage();
    const cs = await storage.getCompanySettings();
    const company = { name: cs?.name || 'Business AI', address: cs?.address || '', phone: cs?.phone || '', email: cs?.email || '' };
    const html = this.generateGrnHTML(grn, company);
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      return Buffer.from(pdf);
    } catch (e: any) {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      try { return await this.generatePDFFallback(html); } catch (fe) {
        throw new Error(`Failed to generate GRN PDF: ${fe instanceof Error ? fe.message : fe}`);
      }
    }
  }

  private generateDeliveryOrderHTML(order: any, company: any): string {
    const items = this.parseItems(order.items);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
      h1{font-size:20px;margin:0}
      .header{display:flex;justify-content:space-between;margin-bottom:16px}
      .info{margin-bottom:12px;font-size:11px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;padding:6px;text-align:left;border:1px solid #ccc;font-size:11px}
      td{padding:5px 6px;border:1px solid #ddd;font-size:11px}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;background:#dbeafe;color:#1d4ed8}
    </style></head><body>
    <div class="header">
      <div><h1>Delivery Order</h1><div style="font-size:11px;color:#666">${company.name}</div></div>
      <div style="text-align:right;font-size:11px">
        <div><strong>DO #:</strong> ${order.deliveryNumber || `DO-${order.id}`}</div>
        <div><strong>Date:</strong> ${this.formatDate(order.deliveryDate || order.createdAt)}</div>
        <div><strong>SO #:</strong> ${order.salesOrderNumber || order.orderNumber || '—'}</div>
        <div><span class="badge">${(order.status || 'draft').toUpperCase()}</span></div>
      </div>
    </div>
    <div class="info">
      <strong>Customer:</strong> ${order.customerName || '—'} &nbsp;|&nbsp;
      <strong>Delivery Address:</strong> ${order.deliveryAddress || '—'}
    </div>
    <table><thead><tr><th>#</th><th>Product</th><th>Ordered Qty</th><th>Delivered Qty</th><th>Unit</th></tr></thead>
    <tbody>${items.map((item: any, i: number) => `<tr>
      <td>${i + 1}</td><td>${item.name || item.description || ''}</td>
      <td>${item.orderedQty || item.quantity || 0}</td>
      <td>${item.deliveredQty || item.quantity || 0}</td>
      <td>${item.unit || 'pcs'}</td>
    </tr>`).join('')}</tbody></table>
    ${order.notes ? `<div style="margin-top:12px;font-size:11px"><strong>Notes:</strong> ${order.notes}</div>` : ''}
    <div style="margin-top:40px;font-size:11px;display:flex;justify-content:space-between">
      <div>Prepared By: ________________________</div>
      <div>Received By: ________________________</div>
    </div>
    </body></html>`;
  }

  async generateDeliveryOrderPDF(order: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    const storage = getStorage();
    const cs = await storage.getCompanySettings();
    const company = { name: cs?.name || 'Business AI' };
    const html = this.generateDeliveryOrderHTML(order, company);
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      return Buffer.from(pdf);
    } catch (e: any) {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      try { return await this.generatePDFFallback(html); } catch (fe) {
        throw new Error(`Failed to generate Delivery Order PDF: ${fe instanceof Error ? fe.message : fe}`);
      }
    }
  }

  private generateProductionOrderHTML(order: any, company: any): string {
    const items = this.parseItems(order.materials || order.items);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
      h1{font-size:20px;margin:0}
      .header{display:flex;justify-content:space-between;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;padding:6px;text-align:left;border:1px solid #ccc;font-size:11px}
      td{padding:5px 6px;border:1px solid #ddd;font-size:11px}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;background:#fef9c3;color:#854d0e}
      .section{margin-top:12px;font-size:11px}
    </style></head><body>
    <div class="header">
      <div><h1>Production Order</h1><div style="font-size:11px;color:#666">${company.name}</div></div>
      <div style="text-align:right;font-size:11px">
        <div><strong>PO #:</strong> ${order.orderNumber || `PRO-${order.id}`}</div>
        <div><strong>Planned Start:</strong> ${this.formatDate(order.plannedStartDate)}</div>
        <div><strong>Planned End:</strong> ${this.formatDate(order.plannedEndDate)}</div>
        <div><span class="badge">${(order.status || 'draft').toUpperCase()}</span></div>
      </div>
    </div>
    <div class="section">
      <strong>Product:</strong> ${order.productName || '—'} &nbsp;|&nbsp;
      <strong>Qty:</strong> ${order.quantity || 0} ${order.unit || 'pcs'} &nbsp;|&nbsp;
      <strong>Work Centre:</strong> ${order.workCentre || '—'}
    </div>
    <div style="margin-top:12px"><strong>Bill of Materials Used:</strong></div>
    <table><thead><tr><th>#</th><th>Material</th><th>Required Qty</th><th>Unit</th></tr></thead>
    <tbody>${items.length ? items.map((item: any, i: number) => `<tr>
      <td>${i + 1}</td><td>${item.name || item.description || ''}</td>
      <td>${item.quantity || 0}</td><td>${item.unit || 'pcs'}</td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#999">No materials listed</td></tr>'}</tbody></table>
    ${order.notes ? `<div style="margin-top:12px;font-size:11px"><strong>Notes:</strong> ${order.notes}</div>` : ''}
    </body></html>`;
  }

  async generateProductionOrderPDF(order: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    const storage = getStorage();
    const cs = await storage.getCompanySettings();
    const company = { name: cs?.name || 'Business AI' };
    const html = this.generateProductionOrderHTML(order, company);
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      return Buffer.from(pdf);
    } catch (e: any) {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      try { return await this.generatePDFFallback(html); } catch (fe) {
        throw new Error(`Failed to generate Production Order PDF: ${fe instanceof Error ? fe.message : fe}`);
      }
    }
  }

  private generatePayslipHTML(payslip: any, company: any): string {
    const earnings = this.parseItems(payslip.earnings || []);
    const deductions = this.parseItems(payslip.deductions || []);
    const gross = parseFloat(payslip.grossSalary || payslip.basicSalary || '0');
    const deductionTotal = deductions.reduce((s: number, d: any) => s + parseFloat(d.amount || '0'), 0);
    const net = parseFloat(payslip.netSalary || String(gross - deductionTotal));
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
      h1{font-size:18px;margin:0}
      .header{display:flex;justify-content:space-between;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:8px}
      .employee-info{margin-bottom:12px;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:4px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;padding:6px;text-align:left;border:1px solid #ccc;font-size:11px}
      td{padding:5px 6px;border:1px solid #ddd;font-size:11px}
      .total-row{background:#f9f9f9;font-weight:bold}
      .net-pay{margin-top:12px;padding:8px;background:#d1fae5;border-radius:4px;text-align:right;font-weight:bold}
    </style></head><body>
    <div class="header">
      <div><h1>Payslip</h1><div style="font-size:10px;color:#666">${company.name}</div></div>
      <div style="text-align:right;font-size:11px">
        <div><strong>Pay Period:</strong> ${payslip.payPeriod || payslip.month || '—'}</div>
        <div><strong>Pay Date:</strong> ${this.formatDate(payslip.payDate || payslip.createdAt)}</div>
      </div>
    </div>
    <div class="employee-info">
      <div><strong>Employee:</strong> ${payslip.employeeName || '—'}</div>
      <div><strong>Employee ID:</strong> ${payslip.employeeId || '—'}</div>
      <div><strong>Department:</strong> ${payslip.department || '—'}</div>
      <div><strong>Designation:</strong> ${payslip.designation || '—'}</div>
    </div>
    <table>
      <thead><tr><th>Earnings</th><th class="text-right">Amount (₹)</th><th>Deductions</th><th class="text-right">Amount (₹)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td>₹${parseFloat(payslip.basicSalary || '0').toFixed(2)}</td>
            <td>${deductions[0]?.name || '—'}</td><td>₹${parseFloat(deductions[0]?.amount || '0').toFixed(2)}</td></tr>
        ${earnings.map((e: any, i: number) => `<tr>
          <td>${e.name || e.description || ''}</td><td>₹${parseFloat(e.amount || '0').toFixed(2)}</td>
          <td>${deductions[i + 1]?.name || ''}</td><td>${deductions[i + 1] ? '₹' + parseFloat(deductions[i + 1].amount || '0').toFixed(2) : ''}</td>
        </tr>`).join('')}
        <tr class="total-row"><td>Gross Salary</td><td>₹${gross.toFixed(2)}</td><td>Total Deductions</td><td>₹${deductionTotal.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <div class="net-pay">Net Pay: ₹${net.toFixed(2)}</div>
    ${payslip.notes ? `<div style="margin-top:12px;font-size:10px"><strong>Notes:</strong> ${payslip.notes}</div>` : ''}
    </body></html>`;
  }

  async generatePayslipPDF(payslip: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    const storage = getStorage();
    const cs = await storage.getCompanySettings();
    const company = { name: cs?.name || 'Business AI' };
    const html = this.generatePayslipHTML(payslip, company);
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      return Buffer.from(pdf);
    } catch (e: any) {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      try { return await this.generatePDFFallback(html); } catch (fe) {
        throw new Error(`Failed to generate Payslip PDF: ${fe instanceof Error ? fe.message : fe}`);
      }
    }
  }

  private generateExpenseClaimHTML(claim: any, company: any): string {
    const items = this.parseItems(claim.items || claim.expenses || []);
    const total = items.reduce((s: number, i: any) => s + parseFloat(i.amount || '0'), 0) || parseFloat(claim.totalAmount || '0');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
      h1{font-size:18px;margin:0}
      .header{display:flex;justify-content:space-between;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;padding:6px;text-align:left;border:1px solid #ccc;font-size:11px}
      td{padding:5px 6px;border:1px solid #ddd;font-size:11px}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;background:#fef3c7;color:#92400e}
      .total{text-align:right;margin-top:8px;font-weight:bold;font-size:13px}
    </style></head><body>
    <div class="header">
      <div><h1>Expense Claim</h1><div style="font-size:10px;color:#666">${company.name}</div></div>
      <div style="text-align:right;font-size:11px">
        <div><strong>Claim #:</strong> ${claim.claimNumber || `EXP-${claim.id}`}</div>
        <div><strong>Date:</strong> ${this.formatDate(claim.claimDate || claim.createdAt)}</div>
        <div><span class="badge">${(claim.status || 'draft').toUpperCase()}</span></div>
      </div>
    </div>
    <div style="font-size:11px;margin-bottom:12px">
      <strong>Employee:</strong> ${claim.employeeName || '—'} &nbsp;|&nbsp;
      <strong>Department:</strong> ${claim.department || '—'} &nbsp;|&nbsp;
      <strong>Purpose:</strong> ${claim.purpose || claim.description || '—'}
    </div>
    <table><thead><tr><th>#</th><th>Description</th><th>Category</th><th>Date</th><th class="text-right">Amount (₹)</th></tr></thead>
    <tbody>${items.map((item: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td>${item.description || item.name || ''}</td>
      <td>${item.category || '—'}</td>
      <td>${item.date ? this.formatDate(item.date) : '—'}</td>
      <td style="text-align:right">₹${parseFloat(item.amount || '0').toFixed(2)}</td>
    </tr>`).join('')}</tbody></table>
    <div class="total">Total Claimed: ₹${total.toFixed(2)}</div>
    ${claim.approvedBy ? `<div style="margin-top:12px;font-size:11px"><strong>Approved By:</strong> ${claim.approvedBy}</div>` : ''}
    </body></html>`;
  }

  async generateExpenseClaimPDF(claim: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    const storage = getStorage();
    const cs = await storage.getCompanySettings();
    const company = { name: cs?.name || 'Business AI' };
    const html = this.generateExpenseClaimHTML(claim, company);
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      return Buffer.from(pdf);
    } catch (e: any) {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      try { return await this.generatePDFFallback(html); } catch (fe) {
        throw new Error(`Failed to generate Expense Claim PDF: ${fe instanceof Error ? fe.message : fe}`);
      }
    }
  }

  private generateJournalEntryHTML(entry: any, company: any): string {
    const lines = this.parseItems(entry.lines || entry.items || []);
    const totalDebit = lines.reduce((s: number, l: any) => s + parseFloat(l.debit || '0'), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + parseFloat(l.credit || '0'), 0);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#333}
      h1{font-size:18px;margin:0}
      .header{display:flex;justify-content:space-between;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;padding:6px;text-align:left;border:1px solid #ccc;font-size:11px}
      td{padding:5px 6px;border:1px solid #ddd;font-size:11px}
      .total-row{background:#f9f9f9;font-weight:bold}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;background:#ede9fe;color:#5b21b6}
    </style></head><body>
    <div class="header">
      <div><h1>Journal Entry</h1><div style="font-size:10px;color:#666">${company.name}</div></div>
      <div style="text-align:right;font-size:11px">
        <div><strong>Entry #:</strong> ${entry.entryNumber || `JE-${entry.id}`}</div>
        <div><strong>Date:</strong> ${this.formatDate(entry.entryDate || entry.createdAt)}</div>
        <div><span class="badge">${(entry.status || 'draft').toUpperCase()}</span></div>
      </div>
    </div>
    <div style="font-size:11px;margin-bottom:12px">
      <strong>Description:</strong> ${entry.description || entry.narration || '—'}
      ${entry.reference ? ` &nbsp;|&nbsp; <strong>Reference:</strong> ${entry.reference}` : ''}
    </div>
    <table>
      <thead><tr><th>Account</th><th>Account Code</th><th>Description</th><th style="text-align:right">Debit (₹)</th><th style="text-align:right">Credit (₹)</th></tr></thead>
      <tbody>
        ${lines.map((l: any) => `<tr>
          <td>${l.accountName || l.account || '—'}</td>
          <td>${l.accountCode || '—'}</td>
          <td>${l.description || l.narration || ''}</td>
          <td style="text-align:right">${parseFloat(l.debit || '0') > 0 ? '₹' + parseFloat(l.debit).toFixed(2) : ''}</td>
          <td style="text-align:right">${parseFloat(l.credit || '0') > 0 ? '₹' + parseFloat(l.credit).toFixed(2) : ''}</td>
        </tr>`).join('')}
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td style="text-align:right">₹${totalDebit.toFixed(2)}</td>
          <td style="text-align:right">₹${totalCredit.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    ${Math.abs(totalDebit - totalCredit) > 0.01 ? '<div style="color:red;margin-top:8px;font-size:11px">⚠ Entry is not balanced</div>' : '<div style="color:green;margin-top:8px;font-size:11px">✓ Entry is balanced</div>'}
    </body></html>`;
  }

  async generateJournalEntryPDF(entry: any): Promise<Buffer> {
    let tempBrowser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;
    const storage = getStorage();
    const cs = await storage.getCompanySettings();
    const company = { name: cs?.name || 'Business AI' };
    const html = this.generateJournalEntryHTML(entry, company);
    try {
      tempBrowser = await puppeteer.launch(this.getPuppeteerOptions());
      page = await tempBrowser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      return Buffer.from(pdf);
    } catch (e: any) {
      if (page) { try { await page.close(); } catch {} }
      if (tempBrowser) { try { await tempBrowser.close(); } catch {} }
      try { return await this.generatePDFFallback(html); } catch (fe) {
        throw new Error(`Failed to generate Journal Entry PDF: ${fe instanceof Error ? fe.message : fe}`);
      }
    }
  }

  // Method to close the PDF generator (called on server shutdown)
  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('PDF Generator browser closed');
      } catch (error) {
        console.warn('Error closing PDF Generator browser:', error);
      }
    }
  }
}

export default PDFGenerator;

// Create and export a singleton instance
export const pdfGenerator = new PDFGenerator(); 