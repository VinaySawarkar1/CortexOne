const fs = require('fs');
const path = require('path');

function maybe(s){ return s === undefined || s === null || String(s).trim() === '' }

(async ()=>{
  try{
    const root = process.cwd();
    const qPath = path.join(root,'data','quotations.json');
    const cPath = path.join(root,'data','customers.json');
    if(!fs.existsSync(qPath)){ console.error('quotations.json not found'); process.exit(2);}    
    if(!fs.existsSync(cPath)){ console.error('customers.json not found'); process.exit(2);}    
    const qs = JSON.parse(fs.readFileSync(qPath,'utf8'));
    const cs = JSON.parse(fs.readFileSync(cPath,'utf8'));

    const report = [];
    for(const q of qs){
      const cid = q.customerId;
      const customer = cs.find(c => String(c.id) === String(cid) || String(c._id||'') === String(cid) || (q.customerEmail && c.email === q.customerEmail));
      const qCompany = q.customerCompany;
      const cCompany = customer && customer.company;
      const has = !(maybe(qCompany) && maybe(cCompany));
      report.push({ id: q.id, quotationNumber: q.quotationNumber, customerId: cid, customerCompanyStored: qCompany||'', customerCompanyCustomer: cCompany||'', hasCompany: has });
    }

    const missing = report.filter(r => !r.hasCompany);
    console.log('Total quotations:', report.length);
    console.log('Quotations missing company (both quotation.customerCompany and customer.company empty):', missing.length);
    if(missing.length>0){
      console.log(missing.slice(0,200).map(r => `id=${r.id} qn=${r.quotationNumber} cid=${r.customerId}`).join('\n'));
    }

    // Also show some examples where quotation has empty but customer has company
    const qEmptyCustomerHas = report.filter(r => (String(r.customerCompanyStored||'').trim()==='') && String(r.customerCompanyCustomer||'').trim() !== '');
    console.log('\nQuotations where quotation.customerCompany is empty but customer record has company:', qEmptyCustomerHas.length);
    if(qEmptyCustomerHas.length>0){
      console.log(qEmptyCustomerHas.slice(0,200).map(r => `id=${r.id} qn=${r.quotationNumber} cid=${r.customerId} customerCompany=${r.customerCompanyCustomer}`).join('\n'));
    }

  }catch(err){ console.error('scan failed', err); process.exit(1);} 
})();
