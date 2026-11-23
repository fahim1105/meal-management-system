import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const users = await mongoose.connection.db.collection('users')
      .find({ email: 'asifalfatthafahim12@gmail.com' })
      .toArray();
    
    console.log('\n📋 Users found:', users.length);
    users.forEach((user, i) => {
      console.log(`\n--- User ${i + 1} ---`);
      console.log('_id:', user._id);
      console.log('uid:', user.uid);
      console.log('email:', user.email);
      console.log('name:', user.name);
      console.log('groupId:', user.groupId);
      console.log('isActive:', user.isActive);
      console.log('createdAt:', user.createdAt);
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser();
