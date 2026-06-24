// templates.ts
export type Currency = "INR" | "USD" | "EUR" | "GBP" | string;

export interface LineItem {
  name?: string;
  description?: string;
  hsnSac?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  discount?: number;
  discountType?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  amount?: number;
  batchNo?: string;
  remarks?: string;
  requiredQty?: number;
  issuedQty?: number;
}

export interface CompanyInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logo?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    upi?: string;
    swift?: string;
    branch?: string;
  };
}

export interface DocBase {
  company?: CompanyInfo;
  qrImage?: string; // data:image/png;base64,... or empty
  currency?: Currency;
  // amountInWords can be provided or left to renderer to compute
  amountInWords?: string;
}

export interface PrintConfig {
  // Basic Elements
  header: boolean;
  orgDupTrip: boolean;
  gstSummary: boolean;
  branch: boolean;
  footer: boolean;
  partyInformation: boolean;
  gstInExport: boolean;
  bankDetails: boolean;
  digitalSignature: boolean;
  gstin: boolean;
  hsnInExport: boolean;
  disclaimer: boolean;
  
  // Party Information
  mobile: boolean;
  partyGstin: boolean;
  email: boolean;
  companyBeforePOC: boolean;
  contactPersonName: boolean;
  totalBeforeRoundOff: boolean;
  
  // Item List
  itemCode: boolean;
  discountAmt: boolean;
  gstAmounts: boolean;
  nonStockItemCode: boolean;
  notes: boolean;
  taxableAmount: boolean;
  leadTime: boolean;
  discountRate: boolean;
  hsnSac: boolean;
  qtyInServices: boolean;
}

// Helper: format number in en-IN style
function fmt(num: number | undefined | null, currency: Currency = "INR") {
  const value = typeof num === "number" ? num : 0;
  // show currency symbol for INR/others if needed (caller can pre-format)
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

  // Helper: Convert number to words (Indian Rupees)
  function numberToWords(num: number): string {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const scales = ["", "Thousand", "Million", "Billion", "Trillion", "Quadrillion", "Quintillion", "Sextillion", "Septillion", "Octillion", "Nonillion", "Decillion", "Undecillion", "Duodecillion", "Tredecillion", "Quattuordeciillion", "Quindecillion", "Sexdecillion", "Septendecillion", "Octodecillion", "Nonodecillion", "Vigintillion", "Unvigintillion", "Duovigintillion", "Tresvigintillion", "Quattuorvigintillion", "Quinvigintillion", "Sexvigintillion", "Septendecillion", "Octovigintillion", "Nonovigintillion", "Centillion"];

    if (num === 0) return "Zero";
    if (num < 0) return "Minus " + numberToWords(Math.abs(num));

    let words = "";
    let scaleIndex = 0;

    while (num > 0) {
      let chunk = Math.floor(num % 1000);
      if (chunk !== 0) {
        let chunkWords = "";
        if (chunk >= 100) {
          chunkWords += units[Math.floor(chunk / 100)] + " Hundred ";
          chunk = chunk % 100;
        }
        if (chunk >= 20) {
          chunkWords += tens[Math.floor(chunk / 10)] + " ";
          chunk = chunk % 10;
        }
        if (chunk > 0) {
          chunkWords += units[chunk] + " ";
        }
        if (chunkWords !== "") {
          chunkWords += scales[scaleIndex] + " ";
        }
        words = chunkWords + words;
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    return words.trim();
  }

// Template: Quotation
export function quotationTemplate(data: DocBase & {
  quoteNumber?: string;
  date?: string;
  validUntil?: string;
  terms?: string;
  customer?: {
    company?: string;
    name?: string;
    contactPersonTitle?: string;
    contactPerson?: string;
    address?: string;
    city?: string;
    gstin?: string;
    phone?: string;
    email?: string;
  };
  items?: LineItem[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  discount?: number;
  discountType?: string;
  totalAmount?: number;
  printConfig?: PrintConfig;
}) {
  const company = data.company || {};
  const config = data.printConfig || {
    header: true,
    orgDupTrip: false,
    gstSummary: false,
    branch: false,
    footer: true,
    partyInformation: true,
    gstInExport: false,
    bankDetails: true,
    digitalSignature: false,
    gstin: true,
    hsnInExport: false,
    disclaimer: true,
    mobile: true,
    partyGstin: true,
    email: true,
    companyBeforePOC: true,
    contactPersonName: true,
    totalBeforeRoundOff: true,
    itemCode: false,
    discountAmt: true,
    gstAmounts: true,
    nonStockItemCode: true,
    notes: true,
    taxableAmount: true,
    leadTime: false,
    discountRate: false,
    hsnSac: false,
    qtyInServices: true,
  };

  const itemsHtml = (data.items || []).map((it, i) => {
    // Ensure proper parsing of numeric values
    const rate = typeof it.rate === 'string' ? parseFloat(it.rate) || 0 : (it.rate ?? 0);
    const quantity = typeof it.quantity === 'string' ? parseFloat(it.quantity) || 1 : (it.quantity ?? 1);
    const taxable = quantity * rate;
    
    // Parse discount values
    const itemDiscount = typeof it.discount === 'string' ? parseFloat(it.discount) || 0 : (it.discount ?? 0);
    const itemDiscountType = it.discountType || 'amount';
    
    // Calculate discounted taxable amount
    let discountedTaxable = taxable;
    if (itemDiscount > 0) {
      if (itemDiscountType === 'percentage') {
        discountedTaxable = taxable - (taxable * itemDiscount / 100);
      } else {
        discountedTaxable = taxable - itemDiscount;
      }
    }
    
    // Parse GST amounts properly - they might be stored as strings
    const igstAmount = typeof it.igst === 'string' ? parseFloat(it.igst) || 0 : (it.igst ?? 0);
    const cgstAmount = typeof it.cgst === 'string' ? parseFloat(it.cgst) || 0 : (it.cgst ?? 0);
    const sgstAmount = typeof it.sgst === 'string' ? parseFloat(it.sgst) || 0 : (it.sgst ?? 0);
    
    // GST percentage is fixed at 18%
    const gstPercentage = 18;
    
    // Use the actual GST amount for total calculation
    const gstAmount = igstAmount + cgstAmount + sgstAmount;
    const amountWithTax = discountedTaxable + gstAmount;
    
    // Check if any item has discount to determine column visibility
    const hasDiscount = (data.items || []).some(item => item.discount && item.discount > 0);
    
    return `
      <tr>
        <td class="c">${i + 1}</td>
        <td style="color: #000;">${(it.description || "").replace(/\n/g, '<br/>')}</td>
        <td class="c">${quantity}</td>
        <td class="c">${it.unit ?? "nos"}</td>
        <td class="r">${fmt(rate, data.currency)}</td>
        ${hasDiscount ? `<td class="c">${itemDiscount > 0 ? (itemDiscountType === 'percentage' ? itemDiscount + '%' : fmt(itemDiscount, data.currency)) : '-'}</td>` : ''}
        <td class="r">${fmt(discountedTaxable, data.currency)}</td>
        <td class="c">${gstPercentage > 0 ? gstPercentage.toFixed(2) + "%" : "-"}</td>
        <td class="r">${fmt(amountWithTax, data.currency)}</td>
      </tr>
    `;
  }).join("");

  // Calculate subtotal from items using discounted taxable amounts, ignoring incoming subtotal to ensure accuracy
  const subtotal = (data.items || []).reduce((s, it) => {
    const quantity = typeof it.quantity === 'string' ? parseFloat(it.quantity) || 1 : (it.quantity ?? 1);
    const rate = typeof it.rate === 'string' ? parseFloat(it.rate) || 0 : (it.rate ?? 0);
    const taxable = quantity * rate;
    
    // Apply item discount if present
    const itemDiscount = typeof it.discount === 'string' ? parseFloat(it.discount) || 0 : (it.discount ?? 0);
    const itemDiscountType = it.discountType || 'amount';
    
    let discountedTaxable = taxable;
    if (itemDiscount > 0) {
      if (itemDiscountType === 'percentage') {
        discountedTaxable = taxable - (taxable * itemDiscount / 100);
      } else {
        discountedTaxable = taxable - itemDiscount;
      }
    }
    
    return s + discountedTaxable;
  }, 0);
  
  // Use provided GST totals or calculate from items
  const igst = data.igst ?? (data.items || []).reduce((s, it) => {
    const igstAmount = typeof it.igst === 'string' ? parseFloat(it.igst) || 0 : (it.igst ?? 0);
    return s + igstAmount;
  }, 0);
  
  const total = data.totalAmount ?? (subtotal + igst);

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Quotation - ${data.quoteNumber || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      :root{--accent:#8b0000;--muted:#666;--border:#333;--light-border:#e6e6e6}
      body{font-family:'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;margin:0;padding:0;font-size:8pt;color:#222}
      
      /* Main container with border */
      .document-container{border:1px solid var(--border);padding:0;margin:0;background:#fff}
      
      /* Header section in table format */
      .header-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .header-table td{border:1px solid var(--border);padding:8px;vertical-align:top}
      .header-table .company-cell{width:65%;background:#f8f8f8}
      .header-table .meta-cell{width:35%;text-align:center}
      
      .company-name{font-size:16px;font-weight:700;color:#222;margin-bottom:4px}
      .company-addr{font-size:8pt;color:var(--muted);line-height:1.3}
      .logo-box{background:transparent;color:#fff;padding:2px;display:inline-block;border-radius:4px;text-align:center;margin-bottom:8px;min-height:80px;display:flex;align-items:center;justify-content:center}
      .logo-title{font-weight:700;letter-spacing:0.5px;font-size:10px}
      .logo-tag{font-size:7pt;opacity:0.95;margin-top:1px}
      .company-logo{max-width:150px;max-height:120px;object-fit:contain}
      .proforma .company-logo{max-width:180px;max-height:140px;object-fit:contain}
      .doc-meta{font-size:7pt}
      .doc-meta div{margin-bottom:2px}
      
      /* Quotation details section */
      .quotation-details-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .quotation-details-table td{border:1px solid var(--border);padding:4px;background:#f8f8f8}
      
      /* Title section in table */
      .title-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .title-table td{border:1px solid var(--border);padding:6px;text-align:center;background:#f8f8f8}
      .title-text{font-weight:700;font-size:16px;text-transform:uppercase;margin:0}
      
      /* Addresses section in table format */
      .addresses-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .addresses-table td{border:1px solid var(--border);padding:4px;vertical-align:top;width:50%}
      .addresses-table .addr-title{font-weight:600;margin-bottom:2px;color:var(--accent);font-size:8pt}
      
      /* Items table with enhanced borders */
      .items-table{width:100%;border-collapse:collapse;margin-bottom:4px;border:1px solid var(--border)}
      .items-table th{border:1px solid var(--border);padding:3px;font-size:7pt;background:#f8f8f8;font-weight:600;text-align:center}
      .items-table td{border:1px solid var(--border);padding:2px;font-size:7pt}
      .items-table td.c{text-align:center} .items-table td.r{text-align:right}
      .muted{font-size:6pt;color:var(--muted)}
      
      /* Totals section in table format */
      .totals-table{width:360px;float:right;border-collapse:collapse;margin-bottom:4px}
      .totals-table td{border:1px solid var(--border);padding:2px;font-size:7pt}
      .totals-table tr.total-row td{font-weight:700;background:#f8f8f8;border-top:2px solid var(--border)}
      
      /* Amount in words section in table */
      .amount-words-table{width:100%;border-collapse:collapse;margin-bottom:4px;clear:both}
      .amount-words-table td{border:1px solid var(--border);padding:4px;background:#f8f8f8}
      .amount-words-text{font-weight:600;margin:0;font-size:7pt}
      
      /* Bank details section in table */
      .bank-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .bank-table td{border:1px solid var(--border);padding:4px}
      .bank-table .bank-title{font-weight:600;color:var(--accent);margin-bottom:2px;font-size:7pt}
      
      /* Terms section in table */
      .terms-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .terms-table td{border:1px solid var(--border);padding:8px}
      .terms-table .terms-title{font-weight:600;color:var(--accent);margin-bottom:4px;font-size:7pt}
      .terms-table ul{margin:4px 0;padding-left:16px}
      .terms-table li{margin-bottom:2px;font-size:6pt}
      
      /* Footer section in table format */
      .footer-table{width:100%;border-collapse:collapse;margin-top:4px}
      .footer-table td{border:1px solid var(--border);padding:6px;vertical-align:top;width:50%}
      .footer-table .disclaimer{font-size:6pt;color:var(--muted)}
      .signature{text-align:center}
      .signature .line{border-top:1px solid #000;width:120px;margin:40px auto 2px}
      .qr{max-width:60px;display:block;margin:0 auto}
      
      /* Alternate row shading */
      .items-table tbody tr:nth-child(even){background:#fbfbfb}
    </style>
  </head>
  <body>
    <div class="document-container">
      <!-- Title Section in Table - Moved to Top -->
      <table class="title-table">
        <tr>
          <td>
            <div class="title-text">QUOTATION</div>
          </td>
        </tr>
      </table>

      ${config.header ? `
      <!-- Header Section in Table -->
      <table class="header-table">
        <tr>
          <td class="company-cell">
            <div class="company-name">${company.name ?? "BizSuite"}</div>
            <div class="company-addr">
              ${company.address || ""}<br/>
              ${company.phone ? `Mobile Number: ${company.phone}<br/>` : ""}
              ${company.email ? `Email: ${company.email}<br/>` : ""}
              ${company.gstin ? `GST: ${company.gstin}<br/>` : ""}
              ${company.phone ? `Phone: ${company.phone}` : ""}
            </div>
          </td>
          <td class="meta-cell">
            <div class="logo-box">
              ${company.logo ? 
                `<img src="${company.logo}" alt="Company Logo" class="company-logo" />` : 
                `<div class="logo-title">${company.name ?? "BizSuite"}™</div>
                 <div class="logo-tag">TEST. MEASURE. CALIBRATE.</div>`
              }
            </div>
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Quotation Details Section -->
      <table class="quotation-details-table">
        <tr>
          <td>
            <div class="doc-meta">
              <div><strong>Quotation No. :</strong> ${data.quoteNumber ?? "RX-VQ25-25-07-155"}</div>
              <div><strong>Date :</strong> ${data.date ?? "06-Aug-2025"}</div>
              <div><strong>Valid till :</strong> ${data.validUntil ?? "31-Aug-2025"}</div>
            </div>
          </td>
        </tr>
      </table>

      ${config.partyInformation ? `
      <!-- Addresses Section in Table -->
      <table class="addresses-table">
        <tr>
          <td>
            <div class="addr-title">Billing Address</div>
            <div>
              ${ (data.customer?.company || data.customer?.contactPerson || data.customer?.name) ? `<strong>${data.customer?.company || data.customer?.contactPerson || data.customer?.name}</strong><br/>` : "-" }
              ${(!data.customer?.company && data.customer?.name && data.customer?.contactPerson) ? `${data.customer.contactPersonTitle || ""} ${data.customer.name}<br/>` : (data.customer?.company ? (data.customer?.name ? `${data.customer.contactPersonTitle || ""} ${data.customer.name}<br/>` : "") : "")}
              ${data.customer?.address || ""}<br/>
              ${data.customer?.city || ""}<br/>
              ${config.gstin && data.customer?.gstin ? `GSTIN: ${data.customer.gstin}<br/>` : ""}
              ${config.mobile && data.customer?.phone ? `Phone: ${data.customer.phone}` : ""}
            </div>
          </td>
          <td>
            <div class="addr-title">Shipping Address</div>
            <div>
              ${ (data.customer?.company || data.customer?.contactPerson || data.customer?.name) ? `<strong>${data.customer?.company || data.customer?.contactPerson || data.customer?.name}</strong><br/>` : "-" }
              ${(!data.customer?.company && data.customer?.name && data.customer?.contactPerson) ? `${data.customer.contactPersonTitle || ""} ${data.customer.name}<br/>` : (data.customer?.company ? (data.customer?.name ? `${data.customer.contactPersonTitle || ""} ${data.customer.name}<br/>` : "") : "")}
              ${data.customer?.address || ""}<br/>
              ${data.customer?.city || ""}<br/>
              ${config.gstin && data.customer?.gstin ? `GSTIN: ${data.customer.gstin}<br/>` : ""}
              ${config.mobile && data.customer?.phone ? `Phone: ${data.customer.phone}` : ""}
            </div>
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:4%">No.</th>
            <th style="width:35%">Item & Description</th>
            <th style="width:8%">Qty</th>
            <th style="width:8%">Unit</th>
            <th style="width:12%">Rate (₹)</th>
            ${(data.items || []).some(item => item.discount && item.discount > 0) ? '<th style="width:8%">Discount</th>' : ''}
            <th style="width:12%">Taxable (₹)</th>
            <th style="width:8%">GST</th>
            <th style="width:12%">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || `<tr><td class="c">1</td><td>Laboratory Abrasive Cut Off Machine</td><td class="c">1</td><td class="c">no.s</td><td class="r">2,31,000.00</td><td class="r">2,31,000.00</td><td class="c">18.00%</td><td class="r">2,72,580.00</td></tr>
          <tr><td class="c">2</td><td>Double Disc Polishing and Lapping Machine Manual Control</td><td class="c">1</td><td class="c">no.s</td><td class="r">94,000.00</td><td class="r">94,000.00</td><td class="c">18.00%</td><td class="r">1,10,920.00</td></tr>
          <tr><td class="c">3</td><td>Hot Mounting Press Pneumatic Machine</td><td class="c">1</td><td class="c">no.s</td><td class="r">1,44,000.00</td><td class="r">1,44,000.00</td><td class="c">18.00%</td><td class="r">1,69,920.00</td></tr>`}
        </tbody>
      </table>

      <!-- Totals Section in Table -->
      <table class="totals-table">
        <!-- Use discounted taxable subtotal so item-level discounts are reflected -->
        <tr><td>Total Amount (₹)</td><td class="r">${fmt(subtotal, data.currency)}</td></tr>
        ${data.discount && data.discount > 0 ? `<tr><td>${data.discountType === 'percentage' ? `(${data.discount}%)` : ''} (₹)</td><td class="r">${fmt(data.discountType === 'percentage' ? (subtotal * data.discount / 100) : data.discount, data.currency)}</td></tr>` : ''}
        ${data.igst && data.igst > 0 ? 
          `<tr><td>Add IGST (₹)</td><td class="r">${fmt(data.igst, data.currency)}</td></tr>` : 
          `${data.cgst && data.cgst > 0 ? `<tr><td>Add CGST (₹)</td><td class="r">${fmt(data.cgst, data.currency)}</td></tr>` : ''}
           ${data.sgst && data.sgst > 0 ? `<tr><td>Add SGST (₹)</td><td class="r">${fmt(data.sgst, data.currency)}</td></tr>` : ''}`
        }
        <tr class="total-row"><td>Grand Total (₹)</td><td class="r">${fmt(data.totalAmount || total, data.currency)}</td></tr>
      </table>

      <!-- Amount in Words Section in Table -->
      <table class="amount-words-table">
        <tr>
          <td>
            <div class="amount-words-text">
              <strong>Total Quotation Amount in Words:</strong><br/>${data.amountInWords || "Rupees " + (data.totalAmount || total).toLocaleString('en-IN') + " only"}
            </div>
          </td>
        </tr>
      </table>

      ${config.bankDetails ? `
      <!-- Bank Details Section in Table -->
      <table class="bank-table">
        <tr>
          <td>
            <div class="bank-title">Bank Details:</div>
            ${company.bankDetails?.bankName ? `Bank Name: ${company.bankDetails.bankName}` : ""}${company.bankDetails?.branch ? ` • Branch: ${company.bankDetails.branch}` : ""}<br/>
            ${company.bankDetails?.accountNo ? `A/C No.: ${company.bankDetails.accountNo}` : ""}${company.bankDetails?.ifsc ? ` • IFSC: ${company.bankDetails.ifsc}` : ""}
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Terms Section in Table -->
      <table class="terms-table">
        <tr>
          <td>
            <div class="terms-title">Terms & Conditions:</div>
            ${(() => {
              const raw = (data.terms || '').toString();
              // Split by newline first; also support semicolons and bullet separators
              const list = raw
                ? raw.split(/\r?\n|[•;]+/).map(t => t.trim()).filter(Boolean)
                : [];
              const items = (list.length ? list : [
                'Installation & Commissioning: Extra',
                'Payment Terms: 50% Advance Along with PO, Balance 50% and Taxes before delivery',
                'Delivery: 5 to 6 Weeks',
                'Freight: At Actual'
              ]).map(t => `<li style=\"margin-bottom: 2px; font-size: 6pt;\">${t}</li>`).join('');
              return `<ul style=\"margin: 4px 0; padding-left: 16px;\">${items}</ul>`;
            })()}
          </td>
        </tr>
      </table>

      ${config.footer ? `
      <!-- Footer Section in Table -->
      <table class="footer-table">
        <tr>
          <td>
            ${data.qrImage ? `<img class="qr" src="${data.qrImage}" alt="QR"/>` : ""}
            ${config.disclaimer ? `<div class="disclaimer">This is a computer-generated quotation. E. & O. E.</div>` : ""}
          </td>
          <td>
            <div class="signature">
              <div class="line"></div>
              <div><strong>For, ${company.name ?? "BizSuite"}</strong></div>
              <div>Authorised Signatory</div>
            </div>
          </td>
        </tr>
      </table>
      ` : ''}
    </div>
  </body>
  </html>
  `;
}

// -- Proforma Template (very similar layout to quotation)
export function proformaTemplate(data: DocBase & {
  invoiceNumber?: string;
  invoiceDate?: string;
  validUntil?: string;
  customer?: { company?: string; name?: string; address?: string; city?: string; state?: string; country?: string; gstin?: string; phone?: string; email?: string; };
  shipping?: { company?: string; name?: string; address?: string; city?: string; state?: string; country?: string; pincode?: string; phone?: string; email?: string; };
  items?: LineItem[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  totalAmount?: number;
  terms?: string;
  notes?: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  igst?: number;
}) {
  const company = data.company || {};
  // Generate items HTML exactly like quotation template
  // Check if any item has discount to determine column visibility
  const hasDiscount = (data.items || []).some(item => {
    const itemDiscount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : (item.discount ?? 0);
    return itemDiscount > 0;
  }) || (data.discount && data.discount > 0);

  const itemsHtml = (data.items || []).map((it, i) => {
    // Ensure proper parsing of numeric values
    const rate = typeof it.rate === 'string' ? parseFloat(it.rate) || 0 : (it.rate ?? 0);
    const quantity = typeof it.quantity === 'string' ? parseFloat(it.quantity) || 1 : (it.quantity ?? 1);
    const taxable = quantity * rate;
    
    // Parse discount values
    const itemDiscount = typeof it.discount === 'string' ? parseFloat(it.discount) || 0 : (it.discount ?? 0);
    const itemDiscountType = it.discountType || 'amount';
    
    // Calculate discounted taxable amount
    let discountedTaxable = taxable;
    if (itemDiscount > 0) {
      if (itemDiscountType === 'percentage') {
        discountedTaxable = taxable - (taxable * itemDiscount / 100);
      } else {
        discountedTaxable = taxable - itemDiscount;
      }
    }
    
    // Parse GST amounts properly - they might be stored as strings
    const igstAmount = typeof it.igst === 'string' ? parseFloat(it.igst) || 0 : (it.igst ?? 0);
    const cgstAmount = typeof it.cgst === 'string' ? parseFloat(it.cgst) || 0 : (it.cgst ?? 0);
    const sgstAmount = typeof it.sgst === 'string' ? parseFloat(it.sgst) || 0 : (it.sgst ?? 0);
    
    // GST percentage is fixed at 18%
    const gstPercentage = 18;
    
    // Use the actual GST amount for total calculation (like quotation)
    const gstAmount = igstAmount + cgstAmount + sgstAmount;
    const amountWithTax = discountedTaxable + gstAmount;
    
    // Ensure we have valid values
    const itemName = it.name || it.description || "Item " + (i + 1);
    const itemDescription = it.description && it.name ? it.description : "";
    const itemHsnSac = it.hsnSac || "-";
    
    return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${itemName}${itemDescription ? `<div class="muted">${itemDescription}</div>` : ""}</td>
        <td class="c">${itemHsnSac}</td>
        <td class="c">${quantity}</td>
        <td class="c">${it.unit || "nos"}</td>
        <td class="r">${fmt(rate, data.currency)}</td>
        ${hasDiscount ? `<td class="c">${itemDiscount > 0 ? (itemDiscountType === 'percentage' ? itemDiscount + '%' : fmt(itemDiscount, data.currency)) : '-'}</td>` : ''}
        <td class="r">${fmt(discountedTaxable, data.currency)}</td>
        <td class="c">${gstPercentage > 0 ? gstPercentage.toFixed(2) + "%" : "-"}</td>
        <td class="r">${fmt(amountWithTax, data.currency)}</td>
      </tr>
    `;
  }).join("");

  // Calculate totals like quotation (use discounted taxable per item)
  const subtotal = (data.items || []).reduce((s, it) => {
    const quantity = typeof it.quantity === 'string' ? parseFloat(it.quantity) || 1 : (it.quantity ?? 1);
    const rate = typeof it.rate === 'string' ? parseFloat(it.rate) || 0 : (it.rate ?? 0);
    const base = quantity * rate;
    const dVal = typeof it.discount === 'string' ? parseFloat(it.discount) || 0 : (it.discount ?? 0);
    const dType = it.discountType || 'amount';
    const discounted = dType === 'percentage' ? base - (base * dVal / 100) : base - dVal;
    return s + Math.max(discounted, 0);
  }, 0);
  
  const discountVal = typeof data.discount === 'string' ? parseFloat(data.discount) || 0 : (data.discount || 0);
  const discountAmount = data.discountType === 'percentage' ? (subtotal * discountVal / 100) : discountVal;
  const taxableAmount = subtotal - discountAmount;
  
  // Calculate GST based on customer state (same logic as quotation form)
  const companyState = "Maharashtra"; // Company state
  const companyCountry = "India"; // Company country
  const customerState = data.shipping?.state || data.customer?.state || "";
  const customerCountry = data.shipping?.country || data.customer?.country || "India";
  
  // Recalculate GST if state information is available, otherwise use provided values
  let cgst = typeof data.cgst === 'string' ? parseFloat(data.cgst) || 0 : (data.cgst || 0);
  let sgst = typeof data.sgst === 'string' ? parseFloat(data.sgst) || 0 : (data.sgst || 0);
  let igst = typeof data.igst === 'string' ? parseFloat(data.igst) || 0 : (data.igst || 0);
  
  // If customer state is provided, recalculate GST based on state rules
  if (customerState && customerCountry === companyCountry) {
    if (customerState === companyState) {
      // Same state: Apply CGST + SGST (9% each = 18% total)
      cgst = (taxableAmount * 9) / 100;
      sgst = (taxableAmount * 9) / 100;
      igst = 0;
    } else {
      // Different state: Apply IGST (18%)
      cgst = 0;
      sgst = 0;
      igst = (taxableAmount * 18) / 100;
    }
  } else if (customerCountry !== companyCountry) {
    // Different country: No GST
    cgst = 0;
    sgst = 0;
    igst = 0;
  } else {
    // Use provided GST values if state not available, but ensure they match taxable amount
    // Calculate from items if individual GST amounts are provided
    const calculatedCgst = (data.items || []).reduce((sum, it) => {
      const cgstAmount = typeof it.cgst === 'string' ? parseFloat(it.cgst) || 0 : (it.cgst ?? 0);
      return sum + cgstAmount;
    }, 0);
    const calculatedSgst = (data.items || []).reduce((sum, it) => {
      const sgstAmount = typeof it.sgst === 'string' ? parseFloat(it.sgst) || 0 : (it.sgst ?? 0);
      return sum + sgstAmount;
    }, 0);
    const calculatedIgst = (data.items || []).reduce((sum, it) => {
      const igstAmount = typeof it.igst === 'string' ? parseFloat(it.igst) || 0 : (it.igst ?? 0);
      return sum + igstAmount;
    }, 0);
    
    // Use calculated values if they differ significantly from provided totals
    if (Math.abs(calculatedCgst + calculatedSgst + calculatedIgst - (cgst + sgst + igst)) > 0.01) {
      cgst = calculatedCgst;
      sgst = calculatedSgst;
      igst = calculatedIgst;
    }
  }
  
  const total = (taxableAmount + cgst + sgst + igst);

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Proforma Invoice - ${data.invoiceNumber || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      :root{--accent:#8b0000;--muted:#666;--border:#333;--light-border:#e6e6e6}
      body{font-family:'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;margin:0;padding:0;font-size:11pt;color:#222}
      
      /* Main container with border - exactly like quotation */
      .document-container{border:1px solid var(--border);padding:0;margin:0;background:#fff}
      
      /* Title section in table - exactly like quotation */
      .title-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .title-table td{border:1px solid var(--border);padding:6px;text-align:center;background:#f8f8f8}
      .title-text{font-weight:700;font-size:16px;text-transform:uppercase;margin:0}
      
      /* Header section in table format - exactly like quotation */
      .header-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .header-table td{border:1px solid var(--border);padding:8px;vertical-align:top}
      .header-table .company-cell{width:65%;background:#f8f8f8}
      .header-table .meta-cell{width:35%;text-align:center}
      
      .company-name{font-size:16px;font-weight:700;color:#222;margin-bottom:4px}
      .company-addr{font-size:8pt;color:var(--muted);line-height:1.3}
      .logo-box{background:transparent;color:#fff;padding:2px;display:inline-block;border-radius:4px;text-align:center;margin-bottom:8px;min-height:80px;display:flex;align-items:center;justify-content:center}
      .logo-title{font-weight:700;letter-spacing:0.5px;font-size:10px}
      .logo-tag{font-size:7pt;opacity:0.95;margin-top:1px}
      .company-logo{max-width:150px;max-height:120px;object-fit:contain}
      .doc-meta{font-size:7pt}
      .doc-meta div{margin-bottom:2px}
      
      /* Proforma Invoice details section - exactly like quotation details */
      .quotation-details-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .quotation-details-table td{border:1px solid var(--border);padding:4px;background:#f8f8f8}
      
      /* Addresses section in table format - exactly like quotation */
      .addresses-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .addresses-table td{border:1px solid var(--border);padding:4px;vertical-align:top;width:50%}
      .addresses-table .addr-title{font-weight:600;margin-bottom:2px;color:var(--accent);font-size:8pt}
      .addresses-table .addr-content{font-size:7pt;line-height:1.3;color:#222}
      
      /* Items table with enhanced borders - exactly like quotation */
      .items-table{width:100%;border-collapse:collapse;margin-bottom:4px;border:1px solid var(--border)}
      .items-table th{border:1px solid var(--border);padding:3px;font-size:7pt;background:#f8f8f8;font-weight:600;text-align:center}
      .items-table td{border:1px solid var(--border);padding:2px;font-size:7pt}
      .items-table td.c{text-align:center} .items-table td.r{text-align:right}
      .muted{font-size:6pt;color:var(--muted)}
      
      /* Totals section in table format - exactly like quotation */
      .totals-table{width:360px;float:right;border-collapse:collapse;margin-bottom:4px}
      .totals-table td{border:1px solid var(--border);padding:2px;font-size:7pt}
      .totals-table tr.total-row td{font-weight:700;background:#f8f8f8;border-top:2px solid var(--border)}
      
      /* Amount in words section in table - exactly like quotation */
      .amount-words-table{width:100%;border-collapse:collapse;margin-bottom:4px;clear:both}
      .amount-words-table td{border:1px solid var(--border);padding:4px;background:#f8f8f8}
      .amount-words-text{font-weight:600;margin:0;font-size:7pt}
      
      /* Bank details section in table - exactly like quotation */
      .bank-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .bank-table td{border:1px solid var(--border);padding:4px}
      .bank-table .bank-title{font-weight:600;color:var(--accent);margin-bottom:2px;font-size:7pt}
      
      /* Terms section in table - exactly like quotation */
      .terms-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .terms-table td{border:1px solid var(--border);padding:8px}
      .terms-table .terms-title{font-weight:600;color:var(--accent);margin-bottom:4px;font-size:7pt}
      .terms-table ul{margin:4px 0;padding-left:16px}
      .terms-table li{margin-bottom:2px;font-size:6pt}
      
      /* Footer section in table format - exactly like quotation */
      .footer-table{width:100%;border-collapse:collapse;margin-top:4px}
      .footer-table td{border:1px solid var(--border);padding:6px;vertical-align:top;width:50%}
      .footer-table .disclaimer{font-size:6pt;color:var(--muted)}
      .signature{text-align:center}
      .signature .line{border-top:1px solid #000;width:120px;margin:40px auto 2px}
      .qr{max-width:60px;display:block;margin:0 auto}
      
      /* Alternate row shading - exactly like quotation */
      .items-table tbody tr:nth-child(even){background:#fbfbfb}
    </style>
  </head>
  <body>
    <div class="document-container">
      <!-- Title Section in Table - Moved to Top (exactly like quotation) -->
      <table class="title-table">
        <tr>
          <td>
            <div class="title-text">PROFORMA INVOICE</div>
          </td>
        </tr>
      </table>

      <!-- Header Section in Table (exactly like quotation) -->
      <table class="header-table">
        <tr>
          <td class="company-cell">
            <div class="company-name">${company.name ?? "BizSuite"}</div>
            <div class="company-addr">
              ${company.address || ""}<br/>
              ${company.phone ? `Mobile Number: ${company.phone}<br/>` : ""}
              ${company.email ? `Email: ${company.email}<br/>` : ""}
              ${company.gstin ? `GST: ${company.gstin}<br/>` : ""}
              ${company.phone ? `Phone: ${company.phone}` : ""}
            </div>
          </td>
          <td class="meta-cell">
            <div class="logo-box">
              ${company.logo ? 
                `<img src="${company.logo}" alt="Company Logo" class="company-logo" />` : 
                `<div class="logo-title">${company.name ?? "BizSuite"}™</div>
                 <div class="logo-tag">TEST. MEASURE. CALIBRATE.</div>`
              }
            </div>
          </td>
        </tr>
      </table>

      <!-- Proforma Invoice Details Section -->
      <table class="quotation-details-table">
        <tr>
          <td>
            <div class="doc-meta">
              <div><strong>Proforma Invoice No. :</strong> ${data.invoiceNumber ?? "-"}</div>
              <div><strong>Date :</strong> ${data.invoiceDate ?? new Date().toLocaleDateString('en-GB')}</div>
              <div><strong>Valid till :</strong> ${data.validUntil ?? "-"}</div>
            </div>
          </td>
        </tr>
      </table>



      <!-- Addresses Section in Table -->
      <table class="addresses-table">
        <tr>
          <td>
            <div class="addr-title">Billing Address</div>
            <div class="addr-content">
              <strong>${data.customer?.company ?? data.customer?.name ?? "-"}</strong><br/>
              ${data.customer?.name ? `${data.customer.name}<br/>` : ""}
              ${data.customer?.address ?? "-"}<br/>
              ${data.customer?.city ?? ""}<br/>
              GSTIN: ${data.customer?.gstin ?? "-"}<br/>
              Phone: ${data.customer?.phone ?? "-"} • ${data.customer?.email ?? ""}
            </div>
          </td>
          <td>
            <div class="addr-title">Shipping Address</div>
            <div class="addr-content">
              <strong>${data.shipping?.company ?? data.customer?.company ?? data.customer?.name ?? "-"}</strong><br/>
              ${(data.shipping?.name ?? data.customer?.name) ? `${data.shipping?.name ?? data.customer?.name}<br/>` : ""}
              ${data.shipping?.address ?? data.customer?.address ?? "-"}<br/>
              ${data.shipping?.city ?? data.customer?.city ?? ""}<br/>
              ${data.shipping?.pincode ? `PIN: ${data.shipping.pincode}<br/>` : ""}
              ${data.shipping?.phone ? `Phone: ${data.shipping.phone}` : (data.customer?.phone ? `Phone: ${data.customer.phone}` : "")}
            </div>
          </td>
        </tr>
      </table>

      <!-- Items Table (exactly like quotation) -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:4%">Sr</th>
            <th style="width:${hasDiscount ? '32%' : '35%'}">Item & Description</th>
            <th style="width:8%">HSN/SAC</th>
            <th style="width:8%">Qty</th>
            <th style="width:8%">Unit</th>
            <th style="width:12%">Rate (₹)</th>
            ${hasDiscount ? '<th style="width:8%">Discount</th>' : ''}
            <th style="width:12%">Taxable (₹)</th>
            <th style="width:8%">GST</th>
            <th style="width:12%">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || `<tr><td class="c">1</td><td>Sample Item</td><td class="c">-</td><td class="c">1</td><td class="c">no.s</td><td class="r">0.00</td>${data.discount && data.discount > 0 ? '<td class="r">0.00</td>' : ''}<td class="r">0.00</td><td class="c">18.00%</td><td class="r">0.00</td></tr>`}
        </tbody>
      </table>

      <!-- Totals Section in Table (exactly like quotation) -->
      <table class="totals-table">
        <tr><td>Total Amount (₹)</td><td class="r">${fmt(subtotal, data.currency)}</td></tr>
        ${data.discount && data.discount > 0 ? `<tr><td>${data.discountType === 'percentage' ? `(${data.discount}%)` : ''} (₹)</td><td class="r">${fmt(discountAmount, data.currency)}</td></tr>` : ''}
        ${data.igst && data.igst > 0 ? 
          `<tr><td>Add IGST (₹)</td><td class="r">${fmt(data.igst, data.currency)}</td></tr>` : 
          `${data.cgst && data.cgst > 0 ? `<tr><td>Add CGST (₹)</td><td class="r">${fmt(data.cgst, data.currency)}</td></tr>` : ''}
           ${data.sgst && data.sgst > 0 ? `<tr><td>Add SGST (₹)</td><td class="r">${fmt(data.sgst, data.currency)}</td></tr>` : ''}`
        }
        <tr class="total-row"><td>Grand Total (₹)</td><td class="r">${fmt(total, data.currency)}</td></tr>
      </table>

      <!-- Amount in Words Section in Table (exactly like quotation) -->
      <table class="amount-words-table">
        <tr>
          <td>
            <div class="amount-words-text">
              <strong>Total Proforma Invoice Amount in Words:</strong><br/>${data.amountInWords || "Rupees " + total.toLocaleString('en-IN') + " only"}
            </div>
          </td>
        </tr>
      </table>

      <!-- Terms Section in Table (exactly like quotation) -->
      <table class="terms-table">
        <tr>
          <td>
            <div class="terms-title">Terms & Conditions:</div>
            ${data.terms ? `
            <ul style="margin: 4px 0; padding-left: 16px;">
              ${data.terms.split('\n').filter(term => term.trim()).map(term => `<li style="margin-bottom: 2px; font-size: 6pt;">${term.trim()}</li>`).join('')}
            </ul>
            ` : `
            <ul style="margin: 4px 0; padding-left: 16px;">
              <li style="margin-bottom: 2px; font-size: 6pt;">Installation & Commissioning: Extra</li>
              <li style="margin-bottom: 2px; font-size: 6pt;">Payment Terms: 50% Advance Along with PO, Balance 50% and Taxes before delivery</li>
              <li style="margin-bottom: 2px; font-size: 6pt;">Delivery: 5 to 6 Weeks</li>
              <li style="margin-bottom: 2px; font-size: 6pt;">Freight: At Actual</li>
              <li style="margin-bottom: 2px; font-size: 6pt;">P&F: 4% Extra</li>
            </ul>
            `}
          </td>
        </tr>
      </table>

      <!-- Bank Details Section in Table (exactly like quotation) -->
      <table class="bank-table">
        <tr>
          <td>
            <div class="bank-title">Bank Details:</div>
            ${company.bankDetails?.bankName ? `Bank Name: ${company.bankDetails.bankName}` : ""}${company.bankDetails?.branch ? ` • Branch: ${company.bankDetails.branch}` : ""}<br/>
            ${company.bankDetails?.accountNo ? `A/C No.: ${company.bankDetails.accountNo}` : ""}${company.bankDetails?.ifsc ? ` • IFSC: ${company.bankDetails.ifsc}` : ""}
          </td>
        </tr>
      </table>

      <!-- Footer Section in Table -->
      <table class="footer-table">
        <tr>
          <td>This is a computer-generated Proforma Invoice. E. & O. E.</td>
        </tr>
      </table>
    </div>
  </body>
  </html>
  `;
}

// -- Delivery Challan Template
export function deliveryChallanTemplate(data: DocBase & {
  challanNumber?: string;
  challanDate?: string;
  transportMode?: string;
  vehicleNumber?: string;
  customer?: { company?: string; name?: string; address?: string; city?: string; gstin?: string; phone?: string; email?: string; };
  items?: LineItem[];
}) {
  const company = data.company || {};
  const itemsHtml = (data.items || []).map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${it.name || it.description || ""}${it.description ? `<div class="muted">${it.description}</div>` : ""}</td>
      <td class="c">${it.batchNo ?? "-"}</td>
      <td class="c">${it.quantity ?? 1}</td>
      <td class="c">${it.unit ?? "nos"}</td>
      <td>${it.remarks ?? ""}</td>
    </tr>
  `).join("");

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Delivery Challan - ${data.challanNumber || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      :root{--accent:#8b0000;--muted:#666;--border:#e6e6e6}
      body{font-family:'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;margin:0;padding:20px;font-size:11pt;color:#222}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
      .company-name{font-size:18px;font-weight:700}
      .doc-meta{text-align:right;font-size:10pt}
      .title{text-align:center;font-weight:700;font-size:20px;margin:12px 0;text-transform:uppercase}
      .info{display:flex;justify-content:space-between;margin-bottom:12px}
      .info .box{width:48%;border:1px solid var(--border);padding:10px;border-radius:4px}
      table.items{width:100%;border-collapse:collapse;margin-top:10px}
      table.items th, table.items td{border:1px solid var(--border);padding:8px;font-size:10pt}
      table.items th{background:#f8f8f8;font-weight:600}
      td.c{text-align:center}
      .footer{margin-top:16px;font-size:10pt}
      .signature-section{display:flex;justify-content:space-between;margin-top:26px}
      .signature-box{width:48%;text-align:center}
      .signature-line{border-top:1px solid #000;width:80%;margin:60px auto 6px}
      .disclaimer{font-size:9pt;color:var(--muted);text-align:center;margin-top:8px}
      table.items tbody tr:nth-child(even){background:#fbfbfb}
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="company-name">${company.name ?? "Business AI"}</div>
        <div class="muted">${company.address ?? ""}</div>
        <div class="muted">GST: ${company.gstin ?? "-"}</div>
      </div>
      <div class="doc-meta">
        <div><strong>Challan No:</strong> ${data.challanNumber ?? "-"}</div>
        <div><strong>Date:</strong> ${data.challanDate ?? new Date().toLocaleDateString('en-GB')}</div>
        <div><strong>Mode of Transport:</strong> ${data.transportMode ?? "-"}</div>
        <div><strong>Vehicle No:</strong> ${data.vehicleNumber ?? "-"}</div>
      </div>
    </div>

    <div class="title">DELIVERY CHALLAN</div>

    <div class="info">
      <div class="box">
        <strong>Delivery To:</strong><br/>
        <strong>${data.customer?.company ?? data.customer?.name ?? "-"}</strong><br/>
        ${data.customer?.address ?? "-"}<br/>
        ${data.customer?.city ?? ""}<br/>
        GSTIN: ${data.customer?.gstin ?? "-"}<br/>
        Phone: ${data.customer?.phone ?? "-"}
      </div>
      <div class="box">
        <strong>Contact Person:</strong><br/>
        ${data.customer?.name ?? "-"}<br/>
        Phone: ${data.customer?.phone ?? "-"}<br/>
        Email: ${data.customer?.email ?? "-"}
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:6%">Sr</th>
          <th style="width:48%">Item & Description</th>
          <th style="width:14%">Batch No</th>
          <th style="width:10%">Quantity</th>
          <th style="width:10%">Unit</th>
          <th style="width:12%">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td class="c">1</td><td>Sample Item</td><td class="c">-</td><td class="c">1</td><td class="c">nos</td><td></td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      <div>
        <strong>Terms & Conditions:</strong><br/>
        1. Goods delivered in good condition.<br/>
        2. No claims entertained after delivery.<br/>
        3. Payments as per invoice.
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Issued By (Company)</strong></div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Received By (Customer)</strong></div>
      </div>
    </div>

    <div class="disclaimer">This is a computer-generated Delivery Challan. E. & O. E.</div>
  </body>
  </html>
  `;
}

// -- Internal Job Order Template
export function jobOrderTemplate(data: DocBase & {
  orderNumber?: string;
  orderDate?: string;
  department?: string;
  assignedBy?: string;
  priority?: string;
  dueDate?: string;
  customer?: { name?: string; company?: string; address?: string; phone?: string; email?: string; };
  specialInstructions?: string;
  items?: LineItem[];
  remarks?: string;
  status?: string;
}) {
  const company = data.company || {};
  const itemsHtml = (data.items || []).map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${it.name || it.description || ""}</td>
      <td class="c">${it.requiredQty ?? 1}</td>
      <td class="c">${it.issuedQty ?? 0}</td>
      <td>${it.remarks ?? ""}</td>
    </tr>
  `).join("");

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Internal Job Order - ${data.orderNumber || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      :root{--accent:#8b0000;--muted:#666;--border:#e6e6e6}
      body{font-family:'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;margin:0;padding:20px;font-size:11pt;color:#222}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
      .company-name{font-size:18px;font-weight:700}
      .title{text-align:center;font-weight:700;font-size:20px;margin:12px 0;text-transform:uppercase}
      .info{display:flex;justify-content:space-between;margin-bottom:12px}
      .info .box{width:48%;border:1px solid var(--border);padding:10px;border-radius:4px}
      .customer{background:#f8f8f8;padding:12px;border-radius:4px;margin-bottom:12px}
      table.items{width:100%;border-collapse:collapse;margin-top:10px}
      table.items th, table.items td{border:1px solid var(--border);padding:8px;font-size:10pt}
      table.items th{background:#f8f8f8;font-weight:600}
      td.c{text-align:center}
      .footer{margin-top:16px;font-size:10pt}
      .signature-section{display:flex;justify-content:space-between;margin-top:26px}
      .signature-box{width:48%;text-align:center}
      .signature-line{border-top:1px solid #000;width:80%;margin:60px auto 6px}
      .disclaimer{font-size:9pt;color:var(--muted);text-align:center;margin-top:8px}
      table.items tbody tr:nth-child(even){background:#fbfbfb}
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="company-name">${company.name ?? "Business AI"}</div>
        <div class="muted">${company.address ?? ""}</div>
      </div>
      <div style="text-align:right">
        <div><strong>Job Order No:</strong> ${data.orderNumber ?? "-"}</div>
        <div><strong>Date:</strong> ${data.orderDate ?? new Date().toLocaleDateString('en-GB')}</div>
        <div><strong>Dept:</strong> ${data.department ?? "-"}</div>
        <div><strong>Priority:</strong> ${data.priority ?? "-"}</div>
      </div>
    </div>

    <div class="title">INTERNAL JOB ORDER</div>

    <div class="customer">
      <h4 style="margin:0 0 8px 0">Customer Information:</h4>
      <div style="display:flex;justify-content:space-between">
        <div>
          <strong>${data.customer?.name ?? "-"}</strong><br/>
          ${data.customer?.company ?? ""}<br/>
          ${data.customer?.phone ?? ""}<br/>
          ${data.customer?.email ?? ""}
        </div>
        <div>
          <strong>Address:</strong><br/>
          ${data.customer?.address ?? "-"}<br/><br/>
          <strong>Special Instructions:</strong><br/>
          ${data.specialInstructions ?? "None"}
        </div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:6%">Sr</th>
          <th style="width:46%">Item</th>
          <th style="width:12%">Required Qty</th>
          <th style="width:12%">Issued Qty</th>
          <th style="width:24%">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td class="c">1</td><td>Sample Item</td><td class="c">1</td><td class="c">0</td><td></td></tr>`}
      </tbody>
    </table>

    <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:12px">
      <strong>Remarks:</strong><br/>${data.remarks ?? "No special remarks"}
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Supervisor</strong></div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Production Head</strong></div>
      </div>
    </div>

    <div class="disclaimer">This is a computer-generated Internal Job Order. E. & O. E.</div>
  </body>
  </html>
  `;
}

// Template: Purchase Order
export function purchaseOrderTemplate(data: DocBase & {
  poNumber?: string;
  poDate?: string;
  expectedDelivery?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  terms?: string[];
  notes?: string;
  vendor?: {
    name?: string;
    company?: string;
    title?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    gstin?: string;
    pan?: string;
    phone?: string;
    email?: string;
  };
  items?: LineItem[];
  subtotal?: number;
  taxAmount?: number;
  extraCharges?: { description: string; amount: number }[];
  discounts?: { description: string; amount: number }[];
  totalAmount?: number;
  printConfig?: PrintConfig;
}) {
  const company = data.company || {};
  const config = data.printConfig || {
    header: true,
    orgDupTrip: false,
    gstSummary: false,
    branch: false,
    footer: true,
    partyInformation: true,
    gstInExport: false,
    bankDetails: true,
    digitalSignature: false,
    gstin: true,
    hsnInExport: false,
    disclaimer: true,
    mobile: true,
    partyGstin: true,
    email: true,
    companyBeforePOC: true,
    contactPersonName: true,
    totalBeforeRoundOff: true,
    itemCode: false,
    discountAmt: true,
    gstAmounts: true,
    nonStockItemCode: true,
    notes: true,
    taxableAmount: true,
    leadTime: false,
    discountRate: false,
    hsnSac: false,
    qtyInServices: true,
  };

  const itemsHtml = (data.items || []).map((it, i) => {
    const quantity = typeof it.quantity === 'string' ? parseFloat(it.quantity) || 1 : (it.quantity ?? 1);
    const rate = typeof it.rate === 'string' ? parseFloat(it.rate) || 0 : (it.rate ?? 0);
    const amount = quantity * rate;
    
    // Handle product name and description like quotation template
    // Product name is the primary identifier
    const itemName = it.name || it.description || "Item " + (i + 1);
    // Description is shown separately below the name if it exists and is different from name
    const itemDescription = it.description && it.description !== itemName ? it.description : "";
    
    return `
      <tr>
        <td class="c">${i + 1}</td>
        <td style="color: #000;">
          <div>${itemName}</div>
          ${itemDescription ? `<div class="muted" style="margin-top: 2px; font-size: 6.5pt; color: #666;">${itemDescription.replace(/\n/g, '<br/>')}</div>` : ""}
        </td>
        <td class="c">${quantity}</td>
        <td class="c">${it.unit ?? "nos"}</td>
        <td class="r">${fmt(rate, data.currency)}</td>
        <td class="r">${fmt(amount, data.currency)}</td>
      </tr>
    `;
  }).join("");

  const subtotal = data.subtotal ?? (data.items || []).reduce((s, it) => {
    const quantity = typeof it.quantity === 'string' ? parseFloat(it.quantity) || 1 : (it.quantity ?? 1);
    const rate = typeof it.rate === 'string' ? parseFloat(it.rate) || 0 : (it.rate ?? 0);
    return s + (quantity * rate);
  }, 0);

  const extraChargesTotal = (data.extraCharges || []).reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const discountsTotal = (data.discounts || []).reduce((sum, discount) => sum + (discount.amount || 0), 0);
  const taxAmount = data.taxAmount ?? (subtotal * 0.18); // 18% GST
  const total = data.totalAmount ?? (subtotal + extraChargesTotal + taxAmount - discountsTotal);

  // Calculate CGST/SGST/IGST similar to quotation
  const companyState = "Maharashtra"; // Company state (hardcoded for now)
  const isInterState = !data.vendor?.state || companyState !== data.vendor.state;
  const cgst = isInterState ? 0 : (taxAmount / 2);
  const sgst = isInterState ? 0 : (taxAmount / 2);
  const igst = isInterState ? taxAmount : 0;

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Purchase Order - ${data.poNumber || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      :root{--accent:#8b0000;--muted:#666;--border:#333;--light-border:#e6e6e6}
      body{font-family:'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;margin:0;padding:0;font-size:8pt;color:#222}
      
      /* Main container with border */
      .document-container{border:1px solid var(--border);padding:0;margin:0;background:#fff}
      
      /* Header section in table format */
      .header-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .header-table td{border:1px solid var(--border);padding:8px;vertical-align:top}
      .header-table .company-cell{width:65%;background:#f8f8f8}
      .header-table .meta-cell{width:35%;text-align:center}
      
      .company-name{font-size:16px;font-weight:700;color:#222;margin-bottom:4px}
      .company-addr{font-size:8pt;color:var(--muted);line-height:1.3}
      .logo-box{background:transparent;color:#fff;padding:2px;display:inline-block;border-radius:4px;text-align:center;margin-bottom:8px;min-height:80px;display:flex;align-items:center;justify-content:center}
      .logo-title{font-weight:700;letter-spacing:0.5px;font-size:10px}
      .logo-tag{font-size:7pt;opacity:0.95;margin-top:1px}
      .company-logo{max-width:150px;max-height:120px;object-fit:contain}
      .doc-meta{font-size:7pt}
      .doc-meta div{margin-bottom:2px}
      
      /* Purchase Order details section */
      .po-details-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .po-details-table td{border:1px solid var(--border);padding:4px;background:#f8f8f8}
      
      /* Title section in table */
      .title-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .title-table td{border:1px solid var(--border);padding:6px;text-align:center;background:#f8f8f8}
      .title-text{font-weight:700;font-size:16px;text-transform:uppercase;margin:0}
      
      /* Addresses section in table format */
      .addresses-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .addresses-table td{border:1px solid var(--border);padding:4px;vertical-align:top;width:50%}
      .addresses-table .addr-title{font-weight:600;margin-bottom:2px;color:var(--accent);font-size:8pt}
      
      /* Items table with enhanced borders */
      .items-table{width:100%;border-collapse:collapse;margin-bottom:4px;border:1px solid var(--border)}
      .items-table th{border:1px solid var(--border);padding:3px;font-size:7pt;background:#f8f8f8;font-weight:600;text-align:center}
      .items-table td{border:1px solid var(--border);padding:2px;font-size:7pt}
      .items-table td.c{text-align:center} .items-table td.r{text-align:right}
      .muted{font-size:6pt;color:var(--muted)}
      
      /* Totals section in table format */
      .totals-table{width:360px;float:right;border-collapse:collapse;margin-bottom:4px}
      .totals-table td{border:1px solid var(--border);padding:2px;font-size:7pt}
      .totals-table tr.total-row td{font-weight:700;background:#f8f8f8;border-top:2px solid var(--border)}
      
      /* Amount in words section in table */
      .amount-words-table{width:100%;border-collapse:collapse;margin-bottom:4px;clear:both}
      .amount-words-table td{border:1px solid var(--border);padding:4px;background:#f8f8f8}
      .amount-words-text{font-weight:600;margin:0;font-size:7pt}
      
      /* Bank details section in table */
      .bank-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .bank-table td{border:1px solid var(--border);padding:4px}
      .bank-table .bank-title{font-weight:600;color:var(--accent);margin-bottom:2px;font-size:7pt}
      
      /* Terms section in table */
      .terms-table{width:100%;border-collapse:collapse;margin-bottom:4px}
      .terms-table td{border:1px solid var(--border);padding:8px}
      .terms-table .terms-title{font-weight:600;color:var(--accent);margin-bottom:4px;font-size:7pt}
      .terms-table ul{margin:4px 0;padding-left:16px}
      .terms-table li{margin-bottom:2px;font-size:6pt}
      
      /* Footer section in table format */
      .footer-table{width:100%;border-collapse:collapse;margin-top:4px}
      .footer-table td{border:1px solid var(--border);padding:6px;vertical-align:top;width:50%}
      .footer-table .disclaimer{font-size:6pt;color:var(--muted)}
      .signature{text-align:center}
      .signature .line{border-top:1px solid #000;width:120px;margin:40px auto 2px}
      
      /* Alternate row shading */
      .items-table tbody tr:nth-child(even){background:#fbfbfb}
    </style>
  </head>
  <body>
    <div class="document-container">
      <!-- Title Section in Table - Moved to Top -->
      <table class="title-table">
        <tr>
          <td>
            <div class="title-text">PURCHASE ORDER</div>
          </td>
        </tr>
      </table>

      ${config.header ? `
      <!-- Header Section in Table -->
      <table class="header-table">
        <tr>
          <td class="company-cell">
            <div class="company-name">${company.name ?? "BizSuite"}</div>
            <div class="company-addr">${company.address ?? ""}</div>
            ${company.phone ? `<div class="company-addr">Phone: ${company.phone}</div>` : ''}
            ${company.email ? `<div class="company-addr">Email: ${company.email}</div>` : ''}
            ${company.gstin ? `<div class="company-addr">GSTIN: ${company.gstin}</div>` : ''}
          </td>
          <td class="meta-cell">
            ${company.logo ? `<img src="${company.logo}" alt="Company Logo" class="company-logo" />` : `
              <div class="logo-box">
                <div>
                  <div class="logo-title">${(company.name ?? "BizSuite").substring(0, 1)}</div>
                  <div class="logo-tag">${(company.name ?? "BizSuite").split(' ').map(w => w[0]).join('')}</div>
                </div>
              </div>
            `}
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Purchase Order Details Section -->
      <table class="po-details-table">
        <tr>
          <td>
            <div class="doc-meta">
              <div><strong>PO No. :</strong> ${data.poNumber ?? "-"}</div>
              <div><strong>Date :</strong> ${data.poDate ?? new Date().toLocaleDateString('en-GB')}</div>
              ${data.expectedDelivery ? `<div><strong>Expected Delivery :</strong> ${data.expectedDelivery}</div>` : ''}
            </div>
          </td>
        </tr>
      </table>

      <!-- Addresses Section in Table Format -->
      <table class="addresses-table">
        <tr>
          <td>
            <div class="addr-title">VENDOR DETAILS</div>
            ${data.vendor?.company ? `<div><strong>Company:</strong> ${data.vendor.company}</div>` : ''}
            ${data.vendor?.title && data.vendor?.name ? `<div><strong>${data.vendor.title}:</strong> ${data.vendor.name}</div>` : data.vendor?.name ? `<div><strong>Name:</strong> ${data.vendor.name}</div>` : ''}
            ${data.vendor?.address ? `<div><strong>Address:</strong> ${data.vendor.address}</div>` : ''}
            ${data.vendor?.city || data.vendor?.state ? `<div>${[data.vendor?.city, data.vendor?.state, data.vendor?.pincode].filter(Boolean).join(', ')}</div>` : ''}
            ${data.vendor?.country ? `<div><strong>Country:</strong> ${data.vendor.country}</div>` : ''}
            ${data.vendor?.gstin ? `<div><strong>GSTIN:</strong> ${data.vendor.gstin}</div>` : ''}
            ${data.vendor?.pan ? `<div><strong>PAN:</strong> ${data.vendor.pan}</div>` : ''}
            ${data.vendor?.phone ? `<div><strong>Phone:</strong> ${data.vendor.phone}</div>` : ''}
            ${data.vendor?.email ? `<div><strong>Email:</strong> ${data.vendor.email}</div>` : ''}
          </td>
          <td>
            <div class="addr-title">OUR DETAILS</div>
            <div><strong>Company:</strong> ${company.name ?? "BizSuite"}</div>
            <div><strong>Address:</strong> ${company.address ?? ""}</div>
            ${company.phone ? `<div><strong>Phone:</strong> ${company.phone}</div>` : ''}
            ${company.email ? `<div><strong>Email:</strong> ${company.email}</div>` : ''}
            ${company.gstin ? `<div><strong>GSTIN:</strong> ${company.gstin}</div>` : ''}
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:6%">Sr</th>
            <th style="width:50%">Product & Description</th>
            <th style="width:10%">Qty</th>
            <th style="width:10%">Unit</th>
            <th style="width:12%">Unit Price (${data.currency ?? "INR"})</th>
            <th style="width:12%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || `<tr><td class="c">1</td><td>Sample Item</td><td class="c">1</td><td class="c">nos</td><td class="r">${fmt(0)}</td><td class="r">${fmt(0)}</td></tr>`}
        </tbody>
      </table>

      <!-- Totals Section -->
      <table class="totals-table">
        <tr><td>Sub Total</td><td class="r">${fmt(subtotal, data.currency)}</td></tr>
        ${extraChargesTotal > 0 ? `<tr><td>Extra Charges</td><td class="r">${fmt(extraChargesTotal, data.currency)}</td></tr>` : ''}
        ${discountsTotal > 0 ? `<tr><td>Discount</td><td class="r">-${fmt(discountsTotal, data.currency)}</td></tr>` : ''}
        ${isInterState ? `
          <tr><td>IGST (18%)</td><td class="r">${fmt(igst, data.currency)}</td></tr>
        ` : `
          <tr><td>CGST (9%)</td><td class="r">${fmt(cgst, data.currency)}</td></tr>
          <tr><td>SGST (9%)</td><td class="r">${fmt(sgst, data.currency)}</td></tr>
        `}
        <tr class="total-row"><td><strong>Total Amount</strong></td><td class="r"><strong>${fmt(total, data.currency)}</strong></td></tr>
      </table>

      <!-- Amount in Words -->
      <table class="amount-words-table">
        <tr>
          <td>
            <div class="amount-words-text">Amount in Words: ${numberToWords(total)} ${data.currency ?? "INR"} Only</div>
          </td>
        </tr>
      </table>

      <!-- Extra Charges Details -->
      ${(data.extraCharges && data.extraCharges.length > 0) ? `
      <table class="charges-table">
        <tr>
          <td colspan="2">
            <div class="charges-title">EXTRA CHARGES</div>
            ${data.extraCharges.map(charge => `
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span>${charge.description}</span>
                <span>${fmt(charge.amount, data.currency)}</span>
              </div>
            `).join('')}
          </td>
        </tr>
      </table>
      ` : ''}

      <!-- Discounts Details -->
      ${(data.discounts && data.discounts.length > 0) ? `
      <table class="charges-table">
        <tr>
          <td colspan="2">
            <div class="charges-title">DISCOUNTS</div>
            ${data.discounts.map(discount => `
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span>${discount.description}</span>
                <span>-${fmt(discount.amount, data.currency)}</span>
              </div>
            `).join('')}
          </td>
        </tr>
      </table>
      ` : ''}




      <!-- Notes Section -->
      ${(() => {
        const notesValue = data.notes;
        if (!notesValue) return '';
        const notesStr = String(notesValue).trim();
        if (notesStr.length === 0) return '';
        return `
      <table class="terms-table">
        <tr>
          <td>
            <div class="terms-title">Notes:</div>
            <div style="margin: 4px 0; font-size: 7pt; line-height: 1.4; white-space: pre-wrap;">${notesStr.replace(/\n/g, '<br/>')}</div>
          </td>
        </tr>
      </table>
        `;
      })()}

      <!-- Terms Section in Table -->
      <table class="terms-table">
        <tr>
          <td>
            <div class="terms-title">Terms & Conditions:</div>
            ${(() => {
              if (data.terms && Array.isArray(data.terms) && data.terms.length > 0) {
                return `<ul style="margin: 4px 0; padding-left: 16px;">${data.terms.map((term: string) => `<li style="margin-bottom: 2px; font-size: 6pt;">${term}</li>`).join('')}</ul>`;
              }
              const defaultTerms = [
                'Goods should be as per specifications and quality standards',
                'Delivery should be completed within the specified timeframe',
                'Payment will be made as per agreed payment terms',
                'All taxes and duties to be paid by the vendor',
                'Replacement warranty for manufacturing defects'
              ];
              return `<ul style="margin: 4px 0; padding-left: 16px;">${defaultTerms.map(term => `<li style="margin-bottom: 2px; font-size: 6pt;">${term}</li>`).join('')}</ul>`;
            })()}
          </td>
        </tr>
      </table>

      ${config.footer ? `
      <!-- Footer Section in Table -->
      <table class="footer-table">
        <tr>
          <td>
            ${config.disclaimer ? `<div class="disclaimer">This is a computer-generated Purchase Order. E. & O. E.</div>` : ''}
          </td>
          <td>
            <div class="signature">
              <div class="line"></div>
              <div><strong>For, ${company.name ?? "BizSuite"}</strong></div>
              <div>Authorised Signatory</div>
            </div>
          </td>
        </tr>
      </table>
      ` : ''}
    </div>
  </body>
  </html>
  `;
} 
// -- Invoice Template
export function invoiceTemplate(data: DocBase & {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  customer?: { company?: string; name?: string; address?: string; city?: string; state?: string; country?: string; gstin?: string; phone?: string; email?: string; };
  shipping?: { company?: string; name?: string; address?: string; city?: string; state?: string; country?: string; pincode?: string; phone?: string; email?: string; };
  items?: LineItem[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalAmount?: number;
  paidAmount?: number;
  terms?: string;
  notes?: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}) { return proformaTemplate(data as any); }
