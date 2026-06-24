const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://vinay:FBKAbt5g5DhxFK3@cluster0.5hfxub2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'business_ai';

async function fixQuotationIds() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const quotationsCollection = db.collection('quotations');
    const countersCollection = db.collection('counters');
    
    // Get all existing quotations
    const allQuotations = await quotationsCollection.find({}).toArray();
    console.log(`📊 Found ${allQuotations.length} existing quotations`);
    
    if (allQuotations.length === 0) {
      console.log('🆕 No quotations found. Setting quotationId sequence to start from 500...');
      
      // Initialize the sequence to start from 500
      await countersCollection.updateOne(
        { _id: 'quotationId' },
        { 
          $set: { 
            sequence_value: 500,
            _id: 'quotationId'
          } 
        },
        { upsert: true }
      );
      
      console.log('✅ Quotation ID sequence initialized to start from 500');
      return;
    }
    
    // Get the highest existing quotation ID
    const maxId = Math.max(...allQuotations.map(q => q.id || 0));
    const nextId = Math.max(maxId + 1, 500);
    
    console.log(`📈 Highest existing quotation ID: ${maxId}`);
    console.log(`🎯 Setting next quotation ID to: ${nextId}`);
    
    // Update the sequence to start from the next available ID
    await countersCollection.updateOne(
      { _id: 'quotationId' },
      { 
        $set: { 
          sequence_value: nextId,
          _id: 'quotationId'
        } 
      },
      { upsert: true }
    );
    
    console.log('✅ Quotation ID sequence updated successfully');
    
    // Display sample of existing quotations
    console.log('\n📋 Sample of existing quotations:');
    allQuotations.slice(0, 5).forEach((q, index) => {
      console.log(`   ${index + 1}. ID: ${q.id}, Number: ${q.quotationNumber}, Date: ${q.quotationDate}`);
    });
    
    if (allQuotations.length > 5) {
      console.log(`   ... and ${allQuotations.length - 5} more`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing quotation IDs:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixQuotationIds().then(() => {
  console.log('\n🎉 Quotation ID fix completed!');
}).catch(error => {
  console.error('💥 Fix failed:', error);
  process.exit(1);
});