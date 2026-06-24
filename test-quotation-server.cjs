#!/usr/bin/env node

/**
 * Quotation Test Script for Port 3001 Server
 * Tests quotation functionality on the running server
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const PORT = 3001;

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=' + (global.sessionId || ''),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS', error: null });
    console.log(`✅ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║     QUOTATION SYSTEM TEST - PORT 3001 SERVER                       ║
║     Testing: ${BASE_URL}
╚════════════════════════════════════════════════════════════════════╝
  `);

  // ============================================================================
  // SECTION 1: AUTHENTICATION
  // ============================================================================
  console.log('\n📋 SECTION 1: Authentication Tests\n');

  await test('Login with admin credentials', async () => {
    const res = await makeRequest('POST', '/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    assert(res.status === 200 || res.status === 302, `Login failed with status ${res.status}`);
    
    // Extract session ID from Set-Cookie header
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      global.sessionId = setCookie[0]?.split(';')[0]?.split('=')[1];
      console.log(`Session ID extracted: ${global.sessionId ? 'YES' : 'NO'}`);
    }
  });

  // ============================================================================
  // SECTION 2: QUOTATION CREATION
  // ============================================================================
  console.log('\n📋 SECTION 2: Quotation Creation Tests\n');

  await test('Create quotation with valid data', async () => {
    const payload = {
      quotationNumber: `RX-VQ25-TEST-${Date.now()}`,
      customerId: 1,
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contactPerson: 'Test User',
      addressLine1: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '123456',
      items: [{
        description: 'Test Service',
        quantity: 1,
        unit: 'Service',
        rate: '10000',
        cgst: '9',
        sgst: '9',
        igst: '0'
      }],
      subtotal: '10000',
      cgstTotal: '900',
      sgstTotal: '900',
      igstTotal: '0',
      taxableTotal: '10000',
      totalAmount: '11800',
      sameAsBilling: true
    };

    const res = await makeRequest('POST', '/api/quotations', payload);
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data.id, 'Response should contain quotation ID');
    
    global.createdQuotationId = res.data.id;
    global.createdQuotationNumber = res.data.quotationNumber;
    console.log(`Created quotation: ID=${res.data.id}, Number=${res.data.quotationNumber}`);
  });

  await test('List all quotations', async () => {
    const res = await makeRequest('GET', '/api/quotations');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Response should be an array');
    assert(res.data.length > 0, 'Should have at least one quotation');
    console.log(`Found ${res.data.length} quotations`);
  });

  await test('Get quotation by ID', async () => {
    const res = await makeRequest('GET', `/api/quotations/${global.createdQuotationId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.id === global.createdQuotationId, 'Should return correct quotation');
  });

  await test('Update quotation', async () => {
    const updatePayload = {
      contactPerson: 'Updated Test User'
    };

    const res = await makeRequest('PUT', `/api/quotations/${global.createdQuotationId}`, updatePayload);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.contactPerson === 'Updated Test User', 'Should update contact person');
  });

  // ============================================================================
  // RESULTS
  // ============================================================================
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                       TEST RESULTS SUMMARY                         ║
╚════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`
✅ Passed: ${testResults.passed}
❌ Failed: ${testResults.failed}
📊 Total:  ${testResults.passed + testResults.failed}
  `);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  } else {
    console.log(`
✅ ALL TESTS PASSED!

Quotation system is working correctly on port 3001!
    `);
  }

  console.log('\n');
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});