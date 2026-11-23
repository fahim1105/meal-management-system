import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserName() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = new mongoose.Types.ObjectId('6b03387c3de3877a7b0648ef');
    const groupId = new mongoose.Types.ObjectId('6a1ed37f67531829b578825d');
    
    // Get name from group members
    const group = await mongoose.connection.db.collection('groups')
      .findOne({ _id: groupId });
    
    const member = group.members.find(m => m.email === 'asifalfatthafahim12@gmail.com');
    console.log('📋 Member name from group:', member.name);
    
    // Update user with correct name
    const result = await mongoose.connection.db.collection('users')
      .updateOne(
        { _id: userId },
        { $set: { name: member.name } }
      );
    
    console.log('✅ Updated user name:', result.modifiedCount);
    
    // Verify
    const user = await mongoose.connection.db.collection('users')
      .findOne({ _id: userId });
    
    console.log('\n📋 Updated user:');
    console.log('email:', user.email);
    console.log('name:', user.name);
    
    await mongoose.connection.close();
    console.log('\n✅ Done! Now refresh your browser.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUserName();
