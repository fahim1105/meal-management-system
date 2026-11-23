import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import JoinRequest from '../models/JoinRequest.js';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import BazarSchedule from '../models/BazarSchedule.js';
import MealConfig from '../models/MealConfig.js';
import Fine from '../models/Fine.js';
import { verifyToken } from '../middleware/auth.js';
import admin from '../config/firebase.js';

const router = express.Router();

// Helper function to set custom claims
const setUserClaims = async (uid, groupId) => {
  try {
    if (admin.apps.length > 0) {
      await admin.auth().setCustomUserClaims(uid, {
        groupId: groupId ? String(groupId) : null
      });
    }
  } catch (error) {
    console.error('Error setting custom claims:', error.message);
  }
};

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

    // Check if user is in an ACTIVE group (not just has groupId)
    if (user.groupId && user.isActive) {
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
        email: user.email,
        status: 'active',
        joinedAt: new Date()
      }]
    });

    await group.save();

    // Clear any previous group data and set new group
    user.groupId = group._id;
    user.isActive = true;
    user.leftAt = null;
    user.scheduledDeletion = null;
    await user.save();

    // Set custom claims with new group ID
    await setUserClaims(uid, group._id);

    // Delete any lingering join requests for this user
    await JoinRequest.deleteMany({ userId: uid });

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

    // Check if user is in an ACTIVE group (not just has groupId)
    if (user.groupId && user.isActive) {
      return res.status(400).json({ error: 'User already in a group' });
    }

    const group = await Group.findOne({ groupCode });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user was previously a member (inactive) in THIS group
    const existingMemberIndex = group.members.findIndex(m => m.userId === uid);

    if (existingMemberIndex !== -1) {
      // User is rejoining SAME group - reactivate them and update joinedAt to the new date
      group.members[existingMemberIndex].status = 'active';
      group.members[existingMemberIndex].joinedAt = new Date();
      group.members[existingMemberIndex].rejoinedAt = new Date();
      group.members[existingMemberIndex].leftAt = null;
      group.members[existingMemberIndex].hasLeft = false; // Reset hasLeft so manager can deactivate/reactivate again
      await group.save();

      // Reactivate user
      user.groupId = group._id;
      user.isActive = true;
      user.leftAt = null;
      user.scheduledDeletion = null;
      await user.save();
      await setUserClaims(uid, group._id);

      return res.json({ message: 'Rejoined group successfully', group, rejoined: true });
    } else {
      // New member OR joining DIFFERENT group
      if (user.groupId && !user.isActive) {
        const oldGroup = await Group.findById(user.groupId);
        if (oldGroup) {
          oldGroup.members = oldGroup.members.filter(m => m.userId !== uid);
          await oldGroup.save();
        }
      }

      // Ensure completely fresh start: purge any leftover historical data if user was previously deleted
      const pullDays = {};
      for (let d = 1; d <= 31; d++) {
        pullDays[`days.${d}`] = { userId: uid };
      }
      await MealSheet.updateMany({ groupId: group._id }, { $pull: pullDays });
      await Finance.updateMany({ groupId: group._id }, { $pull: { deposits: { userId: uid } } });
      await BazarSchedule.updateMany({ groupId: group._id }, { $pull: { ranges: { userId: uid } } });
      await MealConfig.updateMany({ groupId: group._id }, { $pull: { configs: { userId: uid } } });
      await Fine.deleteMany({
        groupId: group._id,
        $or: [{ targetUserId: uid }, { requestedByUserId: uid }]
      });

      group.members.push({
        userId: uid,
        name: user.name,
        email: user.email,
        status: 'active',
        joinedAt: new Date()
      });
    }

    await group.save();

    // Set new group and clear any old inactive status
    user.groupId = group._id;
    user.isActive = true;
    user.leftAt = null;
    user.scheduledDeletion = null;
    await user.save();

    // Set custom claims with new group ID
    await setUserClaims(uid, group._id);

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
    const users = await User.find({ uid: { $in: memberUserIds } }, 'uid photoURL groupId');
    const userMap = Object.fromEntries(users.map(u => [u.uid, u]));

    const groupObj = group.toObject();
    groupObj.members = groupObj.members.map(m => {
      const u = userMap[m.userId];
      const hasLeft = !!(m.hasLeft || !u || !u.groupId || u.groupId.toString() !== group._id.toString());
      return {
        ...m,
        photoURL: u?.photoURL || null,
        hasLeft
      };
    });

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
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.groupId) {
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
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

    // Check if target member has left the group
    const targetUser = await User.findOne({ uid: memberId });
    const userHasLeft = !!(member.hasLeft || !targetUser || !targetUser.groupId || targetUser.groupId.toString() !== group._id.toString());

    if (userHasLeft) {
      return res.status(400).json({ 
        error: 'This user has left the group. Manager cannot activate a member who left the group.' 
      });
    }

    if (member.status === 'active') {
      member.status = 'inactive';
      member.leftAt = new Date();
    } else {
      member.status = 'active';
      member.rejoinedAt = new Date();
      member.leftAt = null;
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
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.groupId) {
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
    }

    const group = await Group.findById(user.groupId);

    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only manager can transfer role' });
    }

    const newManager = group.members.find(m => m.userId === newManagerId);
    if (!newManager) {
      return res.status(404).json({ error: 'New manager not found in group' });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find the current manager's member record to get their name
    const currentManagerMember = group.members.find(m => m.userId === group.managerId);
    const currentManagerName = currentManagerMember?.name || '';

    // Close out the current manager's tenure in history
    const existingEntry = group.managerHistory?.find(
      (h) => h.managerId === group.managerId && h.toMonth == null
    );
    if (existingEntry) {
      existingEntry.toMonth = currentMonth;
    } else {
      // First ever transfer — seed the initial manager's record
      group.managerHistory.push({
        managerId: group.managerId,
        managerName: currentManagerName,
        fromMonth: group.currentMonth || currentMonth,
        toMonth: currentMonth,
        transferredAt: now,
      });
    }

    // Start the new manager's open-ended entry
    group.managerHistory.push({
      managerId: newManagerId,
      managerName: newManager.name || '',
      fromMonth: currentMonth,
      toMonth: null,
      transferredAt: now,
    });

    group.managerId = newManagerId;
    await group.save();

    // Update current month's Finance doc so it always reflects the latest manager
    // while the month is still running. Once the month is over this is the final stamp.
    await Finance.updateOne(
      { groupId: group._id, month: currentMonth },
      {
        $set: {
          managerId: newManagerId,
          managerName: newManager.name || '',
        },
      }
    );

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leave', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has no group already, clear claims & join requests and succeed
    if (!user.groupId) {
      user.isActive = false;
      user.leftAt = null;
      user.scheduledDeletion = null;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
    }

    if (!user.groupId) {
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
    }

    const group = await Group.findById(user.groupId);
    if (!group) {
      user.groupId = null;
      user.isActive = false;
      user.leftAt = null;
      user.scheduledDeletion = null;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
    }

    // Check if user is the manager
    if (group.managerId === uid) {
      // If only one member, allow deletion
      if (group.members.length === 1) {
        await Group.findByIdAndDelete(group._id);
        user.groupId = null;
        user.isActive = false;
        user.leftAt = null;
        user.scheduledDeletion = null;
        await user.save();
        await setUserClaims(uid, null);
        await JoinRequest.deleteMany({ groupId: group._id });
        return res.json({ message: 'Group deleted successfully', groupDeleted: true });
      } else {
        return res.status(403).json({ error: 'Manager must transfer role before leaving' });
      }
    }

    const now = new Date();

    // Mark member as inactive in the group (so historical financial calculations remain intact)
    const memberIndex = group.members.findIndex(m => m.userId === uid);
    if (memberIndex !== -1) {
      group.members[memberIndex].status = 'inactive';
      group.members[memberIndex].leftAt = now;
      group.members[memberIndex].hasLeft = true;
      await group.save();
    }

    // User leaves group completely: NO GROUP ACCESS anymore
    user.groupId = null;
    user.isActive = false;
    user.leftAt = now;
    user.scheduledDeletion = null;
    await user.save();

    // Immediately clear Firebase custom claims
    await setUserClaims(uid, null);

    // Delete any join request for this user so they don't linger
    await JoinRequest.deleteMany({ userId: uid });

    res.json({
      message: 'Left group successfully',
      groupDeleted: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.groupId) {
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
    }

    const group = await Group.findById(user.groupId);
    if (!group) {
      user.groupId = null;
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Group deleted successfully' });
    }

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
    user.isActive = false;
    user.leftAt = null;
    user.scheduledDeletion = null;
    await user.save();
    await setUserClaims(uid, null);
    await JoinRequest.deleteMany({ groupId: group._id });

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

    // Check if user is in an ACTIVE group (not just has groupId)
    if (user.groupId && user.isActive) {
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
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.groupId) {
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
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

    // Check if user is in an ACTIVE group (not just has groupId)
    if (requestingUser.groupId && requestingUser.isActive) {
      return res.status(409).json({ error: 'User is already in another group' });
    }

    // If user has old inactive groupId from different group, clean it up
    if (requestingUser.groupId && !requestingUser.isActive && requestingUser.groupId.toString() !== group._id.toString()) {
      const oldGroup = await Group.findById(requestingUser.groupId);
      if (oldGroup) {
        oldGroup.members = oldGroup.members.filter(m => m.userId !== joinRequest.userId);
        await oldGroup.save();
      }
    }

    // Start transaction-like operations
    // Update join request
    joinRequest.status = 'approved';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = uid;
    await joinRequest.save();

    // Check if user was previously a member (inactive) in THIS group
    const existingMemberIndex = group.members.findIndex(m => m.userId === joinRequest.userId);

    let member;
    if (existingMemberIndex !== -1) {
      // User is rejoining SAME group - reactivate them and update joinedAt to the new date!
      group.members[existingMemberIndex].status = 'active';
      group.members[existingMemberIndex].joinedAt = new Date();
      group.members[existingMemberIndex].rejoinedAt = new Date();
      group.members[existingMemberIndex].leftAt = null;
      group.members[existingMemberIndex].hasLeft = false; // Reset hasLeft so manager can deactivate/reactivate again
      member = group.members[existingMemberIndex];
    } else {
      // New member - add them
      // Clean up any remnants from previous tenures if user was previously deleted
      const pullDays = {};
      for (let d = 1; d <= 31; d++) {
        pullDays[`days.${d}`] = { userId: joinRequest.userId };
      }
      await MealSheet.updateMany({ groupId: group._id }, { $pull: pullDays });
      await Finance.updateMany({ groupId: group._id }, { $pull: { deposits: { userId: joinRequest.userId } } });
      await BazarSchedule.updateMany({ groupId: group._id }, { $pull: { ranges: { userId: joinRequest.userId } } });
      await MealConfig.updateMany({ groupId: group._id }, { $pull: { configs: { userId: joinRequest.userId } } });
      await Fine.deleteMany({
        groupId: group._id,
        $or: [{ targetUserId: joinRequest.userId }, { requestedByUserId: joinRequest.userId }]
      });

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

    // Update user's groupId and clear any inactive status
    requestingUser.groupId = group._id;
    requestingUser.isActive = true;
    requestingUser.leftAt = null;
    requestingUser.scheduledDeletion = null;
    await requestingUser.save();

    // Set custom claims with new group ID
    await setUserClaims(joinRequest.userId, group._id);

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

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety: If user has no active group, delete any stale 'approved' requests
    if (!user.groupId || !user.isActive) {
      await JoinRequest.deleteMany({ userId: uid, status: 'approved' });
    }

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

    // If request was approved, verify user is actually active in that group
    if (request.status === 'approved') {
      if (!user.groupId || !user.isActive || user.groupId.toString() !== request.groupId.toString()) {
        await JoinRequest.findByIdAndDelete(request._id);
        return res.json({
          hasRequest: false,
          request: null
        });
      }
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

// DELETE /api/group/cancel-request - Cancel or clear user's own join request
router.delete('/cancel-request', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const requestId = req.body?.requestId || req.query?.requestId;

    if (requestId) {
      const joinRequest = await JoinRequest.findById(requestId);
      if (joinRequest) {
        if (joinRequest.userId !== uid) {
          return res.status(403).json({ error: 'You can only cancel your own requests' });
        }
        await JoinRequest.findByIdAndDelete(requestId);
      }
    } else {
      // If no requestId provided, delete any join request for this user
      await JoinRequest.deleteMany({ userId: uid });
    }

    res.json({
      message: 'Join request cancelled successfully'
    });
  } catch (error) {
    console.error('Error in cancel-request:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/group/remove-member/:memberId - Manager removes a member from group
router.delete('/remove-member/:memberId', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { memberId } = req.params;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.groupId) {
      user.isActive = false;
      await user.save();
      await setUserClaims(uid, null);
      await JoinRequest.deleteMany({ userId: uid });
      return res.json({ message: 'Left group successfully', groupDeleted: false });
    }

    const group = await Group.findById(user.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only manager can remove members' });
    }

    if (memberId === uid) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const targetGroupId = user.groupId;

    // 1. Remove member from Group.members array
    group.members = group.members.filter(m => m.userId !== memberId);
    await group.save();

    // 2. Remove all meals of this user from MealSheet across all months of this group
    const pullDays = {};
    for (let d = 1; d <= 31; d++) {
      pullDays[`days.${d}`] = { userId: memberId };
    }
    await MealSheet.updateMany(
      { groupId: targetGroupId },
      { $pull: pullDays }
    );

    const mealSheets = await MealSheet.find({ groupId: targetGroupId });
    for (const sheet of mealSheets) {
      let modified = false;
      if (sheet.days) {
        const dayEntries = sheet.days instanceof Map ? Array.from(sheet.days.entries()) : Object.entries(sheet.days);
        for (const [day, entries] of dayEntries) {
          if (Array.isArray(entries)) {
            const initialCount = entries.length;
            const filtered = entries.filter(e => String(e?.userId || '').trim() !== String(memberId).trim());
            if (filtered.length !== initialCount) {
              if (sheet.days instanceof Map) {
                sheet.days.set(day, filtered);
              } else {
                sheet.days[day] = filtered;
              }
              modified = true;
            }
          }
        }
      }
      if (modified) {
        sheet.markModified('days');
        await sheet.save();
      }
    }

    // 3. Remove all deposits of this user from Finance across all months of this group
    await Finance.updateMany(
      { groupId: targetGroupId },
      { $pull: { deposits: { userId: memberId } } }
    );

    // 4. Remove all bazar schedule assignments for this user
    await BazarSchedule.updateMany(
      { groupId: targetGroupId },
      { $pull: { ranges: { userId: memberId } } }
    );

    // 5. Remove meal configurations for this user
    await MealConfig.updateMany(
      { groupId: targetGroupId },
      { $pull: { configs: { userId: memberId } } }
    );

    // 6. Remove any fines targeting or requested by this user in this group
    await Fine.deleteMany({
      groupId: targetGroupId,
      $or: [{ targetUserId: memberId }, { requestedByUserId: memberId }]
    });

    // 7. Clean up removed user
    const removedUser = await User.findOne({ uid: memberId });
    if (removedUser) {
      removedUser.groupId = null;
      removedUser.isActive = false;
      removedUser.leftAt = new Date();
      removedUser.scheduledDeletion = null;
      await removedUser.save();
      await setUserClaims(memberId, null);
      await JoinRequest.deleteMany({ userId: memberId });
    }

    res.json({ message: 'Member deleted and all their records purged successfully', group });
  } catch (error) {
    console.error('Error in remove-member:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/group/toggle-fine - Manager toggles fine feature on/off
router.patch('/toggle-fine', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const user = await User.findOne({ uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== uid) {
      return res.status(403).json({ error: 'Only manager can toggle fine feature' });
    }

    group.fineEnabled = !group.fineEnabled;
    await group.save();

    res.json({ fineEnabled: group.fineEnabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
