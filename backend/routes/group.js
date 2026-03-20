import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const generateGroupCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

router.post('/create', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.groupId) {
      return res.status(400).json({ error: 'User already in a group' });
    }

    const groupCode = generateGroupCode();
    
    const group = new Group({
      name,
      groupCode,
      managerId: uid,
      members: [{
        userId: uid,
        name: user.name,
        email: user.email
      }]
    });

    await group.save();

    user.groupId = group._id;
    await user.save();

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/join', verifyToken, async (req, res) => {
  try {
    const { groupCode } = req.body;
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.groupId) {
      return res.status(400).json({ error: 'User already in a group' });
    }

    const group = await Group.findOne({ groupCode });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user was previously a member (inactive)
    const existingMemberIndex = group.members.findIndex(m => m.userId === uid);
    
    if (existingMemberIndex !== -1) {
      // User is rejoining - reactivate them
      group.members[existingMemberIndex].status = 'active';
      group.members[existingMemberIndex].rejoinedAt = new Date();
    } else {
      // New member - add them
      group.members.push({
        userId: uid,
        name: user.name,
        email: user.email,
        status: 'active',
        joinedAt: new Date()
      });
    }

    await group.save();

    user.groupId = group._id;
    await user.save();

    res.json({ group, rejoined: existingMemberIndex !== -1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-group', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/toggle-member-status', verifyToken, async (req, res) => {
  try {
    const { memberId } = req.body;
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);

    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only manager can change member status' });
    }

    if (memberId === uid) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }

    const member = group.members.find(m => m.userId === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.status === 'active') {
      member.status = 'inactive';
      member.leftAt = new Date();
    } else {
      member.status = 'active';
      member.rejoinedAt = new Date();
    }

    await group.save();
    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/transfer-manager', verifyToken, async (req, res) => {
  try {
    const { newManagerId } = req.body;
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    
    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only manager can transfer role' });
    }

    const newManager = group.members.find(m => m.userId === newManagerId);
    if (!newManager) {
      return res.status(404).json({ error: 'New manager not found in group' });
    }

    group.managerId = newManagerId;
    await group.save();

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leave', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    
    // Check if user is the manager
    if (group.managerId === uid) {
      // If only one member, allow deletion
      if (group.members.length === 1) {
        await Group.findByIdAndDelete(group._id);
        user.groupId = null;
        await user.save();
        return res.json({ message: 'Group deleted successfully', groupDeleted: true });
      } else {
        return res.status(403).json({ error: 'Manager must transfer role before leaving' });
      }
    }

    // Mark member as inactive instead of removing
    const memberIndex = group.members.findIndex(m => m.userId === uid);
    if (memberIndex !== -1) {
      group.members[memberIndex].status = 'inactive';
      group.members[memberIndex].leftAt = new Date();
      await group.save();
    }

    // Remove group from user
    user.groupId = null;
    await user.save();

    res.json({ message: 'Left group successfully', group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    
    // Only manager can delete group
    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only manager can delete group' });
    }

    // Only allow deletion if user is the only member
    if (group.members.length > 1) {
      return res.status(403).json({ error: 'Cannot delete group with multiple members' });
    }

    await Group.findByIdAndDelete(group._id);
    user.groupId = null;
    await user.save();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
