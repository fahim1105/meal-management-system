import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserGroup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = new mongoose.Types.ObjectId('6b03387c3de3877a7b0648ef');
    const groupId = new mongoose.Types.ObjectId('6a1ed37f67531829b578825d');
    
    // Update user with correct groupId
    const result = await mongoose.connection.db.collection('users')
      .updateOne(
        { _id: userId },
        { 
          $set: { 
            groupId: groupId,
            isActive: true
          } 
        }
      );
    
    console.log('✅ Updated user:', result.modifiedCount);
    
    // Verify
    const user = await mongoose.connection.db.collection('users')
      .findOne({ _id: userId });
    
    console.log('\n📋 Updated user:');
    console.log('email:', user.email);
    console.log('groupId:', user.groupId);
    console.log('isActive:', user.isActive);
    
    await mongoose.connection.close();
    console.log('\n✅ Done! Now refresh your browser.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUserGroup();
