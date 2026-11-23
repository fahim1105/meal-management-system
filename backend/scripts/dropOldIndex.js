import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function dropOldIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const collection = mongoose.connection.db.collection('users');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes.map(i => i.name));
    
    // Drop the old firebaseUid index if it exists
    try {
      await collection.dropIndex('firebaseUid_1');
      console.log('✅ Dropped firebaseUid_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('⚠️ firebaseUid_1 index does not exist');
      } else {
        throw err;
      }
    }
    
    // List indexes again
    const newIndexes = await collection.indexes();
    console.log('📋 Indexes after cleanup:', newIndexes.map(i => i.name));
    
    await mongoose.connection.close();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropOldIndex();
