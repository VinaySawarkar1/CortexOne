const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reckonix';

async function checkQuotationIds() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const quotations = db.collection('quotations');
        const counters = db.collection('counters');
        
        console.log('🔍 Checking current quotation IDs in database...');
        
        // Get all quotations and find the maximum ID
        const allQuotations = await quotations.find({}).toArray();
        console.log(`📊 Total quotations found: ${allQuotations.length}`);
        
        if (allQuotations.length > 0) {
            // Extract numeric IDs and find the maximum
            const numericIds = allQuotations.map(q => {
                if (typeof q.id === 'number') {
                    return q.id;
                }
                // If it's a string or other format, try to convert
                const parsed = parseInt(q.id);
                return isNaN(parsed) ? 0 : parsed;
            }).filter(id => id > 0);
            
            const maxId = Math.max(...numericIds);
            console.log(`📈 Maximum quotation ID found: ${maxId}`);
            
            // Show a sample of the IDs to understand the pattern
            console.log('\n📋 Sample quotation IDs:');
            numericIds.sort((a, b) => a - b).slice(-10).forEach(id => {
                console.log(`  - ${id}`);
            });
            
            // Check the current sequence counter
            const sequenceDoc = await counters.findOne({ _id: 'quotationId' });
            const currentSequence = sequenceDoc ? sequenceDoc.sequence_value : 0;
            console.log(`\n🔢 Current sequence counter: ${currentSequence}`);
            
            if (currentSequence <= maxId) {
                console.log(`⚠️  Sequence counter needs to be updated!`);
                console.log(`   Current sequence: ${currentSequence}`);
                console.log(`   Max ID in DB: ${maxId}`);
                console.log(`   Setting sequence to: ${maxId + 1}`);
                
                // Update the sequence counter
                await counters.updateOne(
                    { _id: 'quotationId' },
                    { $set: { sequence_value: maxId + 1 } },
                    { upsert: true }
                );
                
                console.log('✅ Sequence counter updated successfully!');
            } else {
                console.log('✅ Sequence counter is correctly set.');
            }
            
        } else {
            console.log('📭 No quotations found in database.');
            console.log('💡 Setting initial sequence to 501 (as requested)');
            
            // Set initial sequence to 501 as requested
            await counters.updateOne(
                { _id: 'quotationId' },
                { $set: { sequence_value: 501 } },
                { upsert: true }
            );
            
            console.log('✅ Initial sequence set to 501!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

checkQuotationIds();