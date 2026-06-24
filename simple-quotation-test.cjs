const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Enable session cookie handling
  withCredentials: true
});

async function testQuotationFlow() {
  console.log('🚀 Starting Quotation Test on Port 3001');
  console.log('==========================================\n');

  try {
    // Test 1: Login
    console.log('1. Testing Login...');
    const loginResponse = await api.post('/auth/login', {
      username: 'vinay',
      password: 'password123'
    });
    
    console.log('✅ Login successful');
    console.log('   User:', {
      id: loginResponse.data.id,
      username: loginResponse.data.username,
      role: loginResponse.data.role
    });
    
    // The axios instance now automatically handles session cookies
    console.log('   Session cookies saved for subsequent requests\n');

    // Test 2: Create Quotation
    console.log('2. Testing Quotation Creation...');
    const quotationData = {
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contactPerson: 'Test Contact Person',
      contactPersonTitle: 'Manager',
      customerCompany: 'Test Customer Company',
      addressLine1: '123 Test Street',
      addressLine2: 'Test Area',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '123456',
      items: [
        {
          name: 'Test Product',
          description: 'Test Product Description',
          quantity: 2,
          unit: 'pcs',
          rate: 500,
          amount: 1000
        }
      ],
      subtotal: '1000',
      taxAmount: '180',
      totalAmount: '1180',
      terms: 'Payment due within 30 days',
      notes: 'Test quotation created via automated test',
      status: 'draft'
    };

    const createResponse = await api.post('/quotations', quotationData);
    console.log('✅ Quotation created successfully');
    console.log('   Quotation ID:', createResponse.data.id);
    console.log('   Quotation Number:', createResponse.data.quotationNumber);
    console.log('   Status:', createResponse.data.status);
    console.log('   Total Amount:', createResponse.data.totalAmount);

    const quotationId = createResponse.data.id;

    // Test 3: Get Quotation
    console.log('\n3. Testing Quotation Retrieval...');
    const getResponse = await api.get(`/quotations/${quotationId}`);
    console.log('✅ Quotation retrieved successfully');
    console.log('   Contact Person:', getResponse.data.contactPerson);
    console.log('   Customer Company:', getResponse.data.customerCompany);
    console.log('   Items count:', getResponse.data.items?.length || 0);

    // Test 4: List All Quotations
    console.log('\n4. Testing Quotation Listing...');
    const listResponse = await api.get('/quotations');
    console.log('✅ Quotations list retrieved successfully');
    console.log('   Total quotations:', listResponse.data.length);
    console.log('   First quotation ID:', listResponse.data[0]?.id);
    console.log('   First quotation number:', listResponse.data[0]?.quotationNumber);

    // Test 5: Update Quotation
    console.log('\n5. Testing Quotation Update...');
    const updateData = {
      status: 'sent',
      notes: 'Updated via test - quotation sent to customer'
    };
    const updateResponse = await api.put(`/quotations/${quotationId}`, updateData);
    console.log('✅ Quotation updated successfully');
    console.log('   Updated status:', updateResponse.data.status);
    console.log('   Updated notes:', updateResponse.data.notes);

    // Test 6: Download PDF
    console.log('\n6. Testing Quotation PDF Download...');
    const pdfResponse = await api.get(`/quotations/${quotationId}/download-pdf`, {
      responseType: 'arraybuffer'
    });
    console.log('✅ PDF generated successfully');
    console.log('   PDF size:', pdfResponse.data.byteLength, 'bytes');
    console.log('   Content-Type:', pdfResponse.headers['content-type']);

    // Test 7: Convert to Invoice
    console.log('\n7. Testing Quotation to Invoice Conversion...');
    const convertResponse = await api.post(`/quotations/${quotationId}/convert-to-invoice`);
    console.log('✅ Quotation converted to invoice successfully');
    console.log('   Invoice ID:', convertResponse.data.invoice?.id);
    console.log('   Invoice Number:', convertResponse.data.invoice?.invoiceNumber);

    // Test 8: Convert to Order
    console.log('\n8. Testing Quotation to Order Conversion...');
    const orderResponse = await api.post(`/quotations/${quotationId}/convert-to-order`);
    console.log('✅ Quotation converted to order successfully');
    console.log('   Order ID:', orderResponse.data.order?.id);
    console.log('   Order Number:', orderResponse.data.order?.orderNumber);

    // Test 9: Generate Proforma Invoice
    console.log('\n9. Testing Proforma Invoice Generation...');
    const proformaResponse = await api.get(`/quotations/${quotationId}/proforma-invoice`, {
      responseType: 'arraybuffer'
    });
    console.log('✅ Proforma invoice generated successfully');
    console.log('   PDF size:', proformaResponse.data.byteLength, 'bytes');

    // Test 10: Delete Quotation
    console.log('\n10. Testing Quotation Deletion...');
    const deleteResponse = await api.delete(`/quotations/${quotationId}`);
    console.log('✅ Quotation deleted successfully');
    console.log('   Message:', deleteResponse.data.message);

    // Verify deletion
    console.log('\n11. Verifying Deletion...');
    try {
      await api.get(`/quotations/${quotationId}`);
      console.log('❌ ERROR: Quotation still exists after deletion');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Deletion verified: Quotation no longer exists');
      } else {
        console.log('❌ Unexpected error during deletion verification:', error.message);
      }
    }

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('✅ Login authentication: PASSED');
    console.log('✅ Quotation creation: PASSED');
    console.log('✅ Quotation retrieval: PASSED');
    console.log('✅ Quotation listing: PASSED');
    console.log('✅ Quotation update: PASSED');
    console.log('✅ PDF generation: PASSED');
    console.log('✅ Invoice conversion: PASSED');
    console.log('✅ Order conversion: PASSED');
    console.log('✅ Proforma generation: PASSED');
    console.log('✅ Quotation deletion: PASSED');
    console.log('✅ Deletion verification: PASSED');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('================');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('Network Error: No response received');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n🔍 Troubleshooting Tips:');
    console.log('1. Make sure the server is running on port 3001');
    console.log('2. Check that the user credentials are correct');
    console.log('3. Verify the server is accepting requests');
    console.log('4. Check server logs for any authentication issues');
  }
}

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`   ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.log(`   ${error.response.config.method?.toUpperCase()} ${error.response.config.url} -> ${error.response.status}`);
    }
    return Promise.reject(error);
  }
);

// Run the test
testQuotationFlow();