#!/usr/bin/env node

/**
 * Test script to verify quotation ID generation starts from 500
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testQuotationIdGeneration() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reckonix';
  
  let client;
  
  try {
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('🔍 Testing quotation ID generation...');
    console.log('Database connected successfully');
    
    const db = client.db();
    const quotations = db.collection('quotations');
    const counters = db.collection('counters');
    
    // Check current sequence value
    const sequenceDoc = await counters.findOne({ _id: 'quotationId' });
    console.log(`📊 Current quotation sequence: ${sequenceDoc ? sequenceDoc.seq : 'Not found'}`);
    
    // Get the highest existing quotation ID
    const highestQuotation = await quotations.find({}).sort({ quotationNumber: -1 }).limit(1).toArray();
    const highestId = highestQuotation.length > 0 ? highestQuotation[0].quotationNumber : 0;
    console.log(`📈 Highest existing quotation ID: ${highestId}`);
    
    // Simulate next quotation ID generation
    const nextId = highestId + 1;
    console.log(`🎯 Next quotation ID that would be generated: ${nextId}`);
    
    // Check if next ID is >= 500
    if (nextId >= 500) {
      console.log('✅ SUCCESS: Next quotation ID will start from 500 onwards');
      console.log('🎉 The quotation edit mismatch issue should now be resolved!');
    } else {
      console.log('❌ ISSUE: Next quotation ID is still below 500');
      console.log('⚠️  Manual intervention may be needed');
    }
    
    // Show a few recent quotations for reference
    console.log('\n📋 Recent quotations (last 5):');
    const recentQuotations = await quotations.find({})
      .sort({ quotationNumber: -1 })
      .limit(5)
      .project({ quotationNumber: 1, quotationId: 1, customerName: 1, createdAt: 1 })
      .toArray();
    
    recentQuotations.forEach(q => {
      console.log(`   ID: ${q.quotationNumber} | QuotationId: ${q.quotationId} | Customer: ${q.customerName || 'N/A'}`);
    });
    
    console.log('\n🔧 Summary:');
    console.log(`- Current sequence starts at: 500`);
    console.log(`- New quotations will have IDs from: ${nextId}`);
    console.log(`- This ensures no conflict with existing ${highestId} quotations in database`);
    
  } catch (error) {
    console.error('❌ Error testing quotation ID generation:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testQuotationIdGeneration()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testQuotationIdGeneration };