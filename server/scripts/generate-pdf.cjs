const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const htmlPdf = require('html-pdf-node');

function esc(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

(async function(){
  try {
    const idArg = process.argv[2] || process.env.QUOTATION_ID || '532';
    const qid = String(idArg);
    const root = process.cwd();
    const quotationsPath = path.join(root, 'data', 'quotations.json');
    const customersPath = path.join(root, 'data', 'customers.json');

    if (!fs.existsSync(quotationsPath)) {
      console.error('Could not find quotations.json at', quotationsPath);
      process.exit(2);
    }
    if (!fs.existsSync(customersPath)) {
      console.error('Could not find customers.json at', customersPath);
      process.exit(2);
    }

    const quotations = JSON.parse(fs.readFileSync(quotationsPath, 'utf8'));
    const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'));

    const quotation = quotations.find(q => String(q.id) === qid || String(q.quotationNumber) === qid || String(q._id || '') === qid);
    if (!quotation) {
      console.error('Quotation not found for id:', qid);
      process.exit(3);
    }

    const customer = customers.find(c => String(c.id) === String(quotation.customerId) || String(c._id || '') === String(quotation.customerId) || (quotation.customerEmail && c.email === quotation.customerEmail));

    const resolvedCompany = quotation.customerCompany || (customer && customer.company) || '';
    const resolvedName = quotation.contactPerson || quotation.customerName || (customer && customer.name) || '';

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Quotation ${esc(quotation.quotationNumber || quotation.id)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;font-size:10pt} .box{border:1px solid #333;padding:10px;width:700px} .title{font-weight:700;color:#8b0000} .muted{color:#666}</style>
</head><body>
<div class="box">
  <div class="title">Billing Address</div>
  <div style="margin-top:8px">
    ${ (resolvedCompany || resolvedName) ? `<strong>${esc(resolvedCompany || resolvedName)}</strong><br/>` : '<strong>-</strong><br/>' }
    ${ resolvedName ? `${esc(quotation.contactPersonTitle || '')} ${esc(resolvedName)}<br/>` : '' }
    ${ esc(quotation.addressLine1 || (customer && customer.address) || '') }<br/>
    ${ esc(quotation.city || (customer && customer.city) || '') }<br/>
    ${ (quotation.customerGstin || (customer && customer.gstNumber)) ? 'GSTIN: ' + esc(quotation.customerGstin || (customer && customer.gstNumber)) + '<br/>' : '' }
    ${ (quotation.customerPhone || (customer && customer.phone)) ? 'Phone: ' + esc(quotation.customerPhone || (customer && customer.phone)) : '' }
  </div>
</div>
</body></html>`;

    const outPdf = path.join(os.tmpdir(), `quotation-${qid}-preview.pdf`);

    const options = {
      format: 'A4',
      margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
      printBackground: true
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    fs.writeFileSync(outPdf, pdfBuffer);
    console.log('Saved preview PDF to', outPdf);

    // open default viewer
    let cmd;
    if (process.platform === 'win32') cmd = `start "" "${outPdf}"`;
    else if (process.platform === 'darwin') cmd = `open "${outPdf}"`;
    else cmd = `xdg-open "${outPdf}"`;

    exec(cmd, (err) => {
      if (err) console.warn('Failed to open PDF automatically:', err);
      else console.log('Opened PDF in default viewer (if available)');
    });

  } catch (err) {
    console.error('Error generating PDF preview:', err);
    process.exit(1);
  }
})();
