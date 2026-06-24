// Fix quotation ID sequence to start from 500
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reckonix';

async function fixQuotationSequence() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Update the sequence counter for quotations to start from 500
    await db.collection('counters').updateOne(
      { _id: 'quotationId' },
      { 
        $set: { 
          seq: 500,
          lastUpdated: new Date()
        }
      }
    );
    
    console.log('✅ Quotation ID sequence updated to start from 500');
    
    // Verify the update
    const counter = await db.collection('counters').findOne({ _id: 'quotationId' });
    console.log('Current sequence value:', counter.seq);
    
  } catch (error) {
    console.error('Error updating sequence:', error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixQuotationSequence();