import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import JoinRequest from '../models/JoinRequest.js';
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
    
    // Attach photoURL from User collection to each member
    const memberUserIds = group.members.map(m => m.userId);
    const users = await User.find({ uid: { $in: memberUserIds } }, 'uid photoURL');
    const photoMap = Object.fromEntries(users.map(u => [u.uid, u.photoURL]));
    
    const groupObj = group.toObject();
    groupObj.members = groupObj.members.map(m => ({
      ...m,
      photoURL: photoMap[m.userId] || null
    }));
    
    res.json({ group: groupObj });
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

// ============================================
// JOIN REQUEST APPROVAL SYSTEM ROUTES
// ============================================

// POST /api/group/request-join - Submit a join request
router.post('/request-join', verifyToken, async (req, res) => {
  try {
    const { groupCode } = req.body;
    const uid = req.user.uid;

    // Find user
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already in a group
    if (user.groupId) {
      return res.status(400).json({ error: 'You are already in a group' });
    }

    // Find group by code
    const group = await Group.findOne({ groupCode });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user already has a pending request for this group
    const existingPendingRequest = await JoinRequest.findOne({
      userId: uid,
      groupId: group._id,
      status: 'pending'
    });

    if (existingPendingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this group' });
    }

    // Check if user is already a member (active or inactive)
    const existingMember = group.members.find(m => m.userId === uid);
    if (existingMember && existingMember.status === 'active') {
      return res.status(409).json({ error: 'You are already a member of this group' });
    }

    // Create join request
    const joinRequest = new JoinRequest({
      groupId: group._id,
      userId: uid,
      userName: user.name,
      userEmail: user.email,
      userPhotoURL: user.photoURL || null,
      status: 'pending',
      requestedAt: new Date()
    });

    await joinRequest.save();

    res.status(201).json({
      joinRequest,
      message: 'Join request submitted successfully'
    });
  } catch (error) {
    console.error('Error in request-join:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/group/join-requests - Get all join requests for manager's group
router.get('/join-requests', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { status = 'pending' } = req.query;

    // Find user's group
    const user = await User.findOne({ uid });
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is manager
    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only managers can view join requests' });
    }

    // Query join requests
    const query = { groupId: group._id };
    if (status !== 'all') {
      query.status = status;
    }

    const joinRequests = await JoinRequest.find(query)
      .sort({ requestedAt: -1 })
      .limit(50);

    res.json({
      joinRequests,
      count: joinRequests.length
    });
  } catch (error) {
    console.error('Error in join-requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/group/approve-request - Approve a join request
router.post('/approve-request', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const uid = req.user.uid;

    // Find join request
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Verify request is pending
    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not in pending status' });
    }

    // Find group
    const group = await Group.findById(joinRequest.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is manager
    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only the group manager can approve requests' });
    }

    // Find requesting user
    const requestingUser = await User.findOne({ uid: joinRequest.userId });
    if (!requestingUser) {
      return res.status(404).json({ error: 'Requesting user not found' });
    }

    // Check if user is still eligible (not in another group)
    if (requestingUser.groupId) {
      return res.status(409).json({ error: 'User is already in another group' });
    }

    // Start transaction-like operations
    // Update join request
    joinRequest.status = 'approved';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = uid;
    await joinRequest.save();

    // Check if user was previously a member (inactive)
    const existingMemberIndex = group.members.findIndex(m => m.userId === joinRequest.userId);
    
    let member;
    if (existingMemberIndex !== -1) {
      // User is rejoining - reactivate them
      group.members[existingMemberIndex].status = 'active';
      group.members[existingMemberIndex].rejoinedAt = new Date();
      member = group.members[existingMemberIndex];
    } else {
      // New member - add them
      member = {
        userId: joinRequest.userId,
        name: joinRequest.userName,
        email: joinRequest.userEmail,
        status: 'active',
        joinedAt: new Date()
      };
      group.members.push(member);
    }

    await group.save();

    // Update user's groupId
    requestingUser.groupId = group._id;
    await requestingUser.save();

    res.json({
      message: 'Join request approved successfully',
      joinRequest,
      member
    });
  } catch (error) {
    console.error('Error in approve-request:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/group/reject-request - Reject a join request
router.post('/reject-request', verifyToken, async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    const uid = req.user.uid;

    // Find join request
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Verify request is pending
    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not in pending status' });
    }

    // Find group
    const group = await Group.findById(joinRequest.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is manager
    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only the group manager can reject requests' });
    }

    // Update join request
    joinRequest.status = 'rejected';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = uid;
    if (reason) {
      joinRequest.rejectionReason = reason;
    }
    await joinRequest.save();

    res.json({
      message: 'Join request rejected',
      joinRequest
    });
  } catch (error) {
    console.error('Error in reject-request:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/group/my-request-status - Check user's join request status
router.get('/my-request-status', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { groupCode } = req.query;

    const query = { userId: uid };

    // If groupCode provided, find group and filter by groupId
    if (groupCode) {
      const group = await Group.findOne({ groupCode });
      if (group) {
        query.groupId = group._id;
      }
    }

    // Find most recent request
    const request = await JoinRequest.findOne(query)
      .sort({ requestedAt: -1 });

    if (!request) {
      return res.json({
        hasRequest: false,
        request: null
      });
    }

    res.json({
      hasRequest: true,
      request
    });
  } catch (error) {
    console.error('Error in my-request-status:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/group/cancel-request - Cancel user's own join request
router.delete('/cancel-request', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const uid = req.user.uid;

    // Find join request
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Verify request belongs to user
    if (joinRequest.userId !== uid) {
      return res.status(403).json({ error: 'You can only cancel your own requests' });
    }

    // Verify request is pending
    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    // Delete the request
    await JoinRequest.findByIdAndDelete(requestId);

    res.json({
      message: 'Join request cancelled successfully'
    });
  } catch (error) {
    console.error('Error in cancel-request:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
