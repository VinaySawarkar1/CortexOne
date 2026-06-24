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
  try{
    const root = process.cwd();
    const qPath = path.join(root,'data','quotations.json');
    const cPath = path.join(root,'data','customers.json');
    if(!fs.existsSync(qPath)){ console.error('quotations.json not found'); process.exit(2);}    
    if(!fs.existsSync(cPath)){ console.error('customers.json not found'); process.exit(2);}    
    const qs = JSON.parse(fs.readFileSync(qPath,'utf8'));
    const cs = JSON.parse(fs.readFileSync(cPath,'utf8'));

    const latest = qs.slice().sort((a,b)=> (b.id||0)-(a.id||0)).slice(0,10);
    const results = [];
    for(const q of latest){
      const cid = q.customerId;
      const customer = cs.find(c => String(c.id) === String(cid) || String(c._id||'') === String(cid) || (q.customerEmail && c.email === q.customerEmail));
      const qCompany = (q.customerCompany || '').toString().trim();
      const cCompany = (customer && (customer.company || '')).toString().trim();
      const resolvedCompany = qCompany || cCompany || '';
      const resolvedName = q.contactPerson || q.customerName || (customer && customer.name) || '';

      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Quotation ${esc(q.quotationNumber || q.id)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;font-size:10pt} .box{border:1px solid #333;padding:10px;width:700px} .title{font-weight:700;color:#8b0000} .muted{color:#666}</style>
</head><body>
<div class="box">
  <div class="title">Billing Address</div>
  <div style="margin-top:8px">
    ${ (resolvedCompany || resolvedName) ? `<strong>${esc(resolvedCompany || resolvedName)}</strong><br/>` : '<strong>-</strong><br/>' }
    ${ resolvedName ? `${esc(q.contactPersonTitle || '')} ${esc(resolvedName)}<br/>` : '' }
    ${ esc(q.addressLine1 || (customer && customer.address) || '') }<br/>
    ${ esc(q.city || (customer && customer.city) || '') }<br/>
    ${ (q.customerGstin || (customer && customer.gstNumber)) ? 'GSTIN: ' + esc(q.customerGstin || (customer && customer.gstNumber)) + '<br/>' : '' }
    ${ (q.customerPhone || (customer && customer.phone)) ? 'Phone: ' + esc(q.customerPhone || (customer && customer.phone)) : '' }
  </div>
</div>
</body></html>`;

      const tmpBase = path.join(os.tmpdir(), `quotation-${q.id || q.quotationNumber}`);
      if(!fs.existsSync(tmpBase)) fs.mkdirSync(tmpBase, { recursive: true });
      const htmlPath = path.join(tmpBase, 'preview.html');
      const pdfPath = path.join(tmpBase, 'preview.pdf');
      fs.writeFileSync(htmlPath, html, 'utf8');

      // generate pdf via html-pdf-node
      const options = { format: 'A4', margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }, printBackground: true };
      try{
        const buffer = await htmlPdf.generatePdf({ content: html }, options);
        fs.writeFileSync(pdfPath, buffer);
      }catch(err){ console.warn('PDF generation failed for', q.id, err); }

      results.push({ id: q.id, quotationNumber: q.quotationNumber, customerId: cid, quotationCompany: qCompany, customerCompany: cCompany, htmlPath, pdfPath, hasCompany: !!resolvedCompany });
    }

    // print report
    console.log('Generated previews for', results.length, 'quotations');
    const missing = results.filter(r => !r.hasCompany);
    console.log('Missing company in both quotation and customer:', missing.length);
    for(const r of results){
      console.log(`id=${r.id} qn=${r.quotationNumber} cid=${r.customerId} hasCompany=${r.hasCompany} html=${r.htmlPath} pdf=${r.pdfPath}`);
    }

    if(missing.length>0){
      console.log('\nExamples missing company:');
      console.log(missing.map(m => `id=${m.id} qn=${m.quotationNumber} cid=${m.customerId}`).join('\n'));
    }

    console.log('\nTemporary folders created in your OS temp directory. Open the PDF files to inspect.');

  }catch(err){ console.error('batch failed', err); process.exit(1);} 
})();
