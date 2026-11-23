import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkGroups() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const userId = new mongoose.Types.ObjectId('6b03387c3de3877a7b0648ef');
    
    // Check all groups
    const allGroups = await mongoose.connection.db.collection('groups')
      .find({})
      .toArray();
    
    console.log('\n📋 Total groups:', allGroups.length);
    
    // Check if user is in any group's members array
    const groupsWithUser = allGroups.filter(group => 
      group.members?.some(m => 
        m.userId?.toString() === userId.toString() || 
        m.email === 'asifalfatthafahim12@gmail.com'
      )
    );
    
    console.log('📋 Groups containing this user:', groupsWithUser.length);
    
    groupsWithUser.forEach((group, i) => {
      console.log(`\n--- Group ${i + 1} ---`);
      console.log('_id:', group._id);
      console.log('name:', group.name);
      console.log('manager:', group.manager);
      const member = group.members.find(m => 
        m.userId?.toString() === userId.toString() || 
        m.email === 'asifalfatthafahim12@gmail.com'
      );
      console.log('Member info:', member);
    });
    
    // Also check by manager field
    const managedGroups = allGroups.filter(g => g.manager?.toString() === userId.toString());
    console.log('\n📋 Groups managed by this user:', managedGroups.length);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGroups();
