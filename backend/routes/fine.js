import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import Fine from '../models/Fine.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { sendFineApprovedEmail, sendFineRejectedEmail, isEmailConfigured } from '../services/emailService.js';
import { resolveMemberEmail } from '../utils/memberEmail.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/fine
// Manager directly adds an approved fine
// ─────────────────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { month, targetUserId, amount, reason, imageUrl } = req.body;

    if (!month || !targetUserId || !amount || !reason?.trim()) {
      return res.status(400).json({ error: 'month, targetUserId, amount and reason are required' });
    }

    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can directly add a fine' });
    }

    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) return res.status(404).json({ error: 'Member not found in group' });

    const fine = await Fine.create({
      groupId: user.groupId,
      month,
      targetUserId,
      targetUserName: targetMember.name,
      amount: Number(amount),
      reason: reason.trim(),
      imageUrl: imageUrl || null,
      status: 'approved',
      requestedByUserId: req.user.uid,
      requestedByName: user.name || 'Manager',
      approvedAt: new Date(),
    });

    if (isEmailConfigured()) {
      try {
        const toFined = await resolveMemberEmail(group, targetUserId);
        if (toFined) {
          await sendFineApprovedEmail({
            toFined,
            finedName: targetMember.name,
            toRequester: null,
            requesterName: null,
            approvedByManager: true,
            amount: Number(amount),
            reason: reason.trim(),
            month,
          });
        }
      } catch (emailErr) {
        console.error('Fine email error (manager direct):', emailErr.message);
      }
    }

    res.status(201).json({ fine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/fine/request
// Any member requests a fine (needs manager approval)
// ─────────────────────────────────────────────────────────────
router.post('/request', verifyToken, async (req, res) => {
  try {
    const { month, targetUserId, amount, reason, imageUrl } = req.body;

    if (!month || !targetUserId || !amount || !reason?.trim()) {
      return res.status(400).json({ error: 'month, targetUserId, amount and reason are required' });
    }

    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) return res.status(404).json({ error: 'Member not found in group' });

    const requester = group.members.find((m) => m.userId === req.user.uid);

    const fine = await Fine.create({
      groupId: user.groupId,
      month,
      targetUserId,
      targetUserName: targetMember.name,
      amount: Number(amount),
      reason: reason.trim(),
      imageUrl: imageUrl || null,
      status: 'pending',
      requestedByUserId: req.user.uid,
      requestedByName: requester?.name || user.name || 'Member',
    });

    res.status(201).json({ fine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/fine/:id/approve
// Manager approves a pending fine request
// ─────────────────────────────────────────────────────────────
router.patch('/:id/approve', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can approve fines' });
    }

    const fine = await Fine.findOne({ _id: req.params.id, groupId: user.groupId });
    if (!fine) return res.status(404).json({ error: 'Fine not found' });
    if (fine.status !== 'pending') return res.status(400).json({ error: 'Fine is not pending' });

    fine.status = 'approved';
    fine.approvedAt = new Date();
    await fine.save();

    if (isEmailConfigured()) {
      try {
        const toFined = await resolveMemberEmail(group, fine.targetUserId);
        const toRequester = fine.requestedByUserId
          ? await resolveMemberEmail(group, fine.requestedByUserId)
          : null;

        await sendFineApprovedEmail({
          toFined,
          finedName: fine.targetUserName,
          toRequester,
          requesterName: fine.requestedByName,
          approvedByManager: false,
          amount: fine.amount,
          reason: fine.reason,
          month: fine.month,
        });
      } catch (emailErr) {
        console.error('Fine approve email error:', emailErr.message);
      }
    }

    res.json({ fine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/fine/:id/reject
// Manager rejects a pending fine request
// ─────────────────────────────────────────────────────────────
router.patch('/:id/reject', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can reject fines' });
    }

    const fine = await Fine.findOne({ _id: req.params.id, groupId: user.groupId });
    if (!fine) return res.status(404).json({ error: 'Fine not found' });
    if (fine.status !== 'pending') return res.status(400).json({ error: 'Fine is not pending' });

    fine.status = 'rejected';
    fine.rejectReason = req.body.rejectReason || null;
    await fine.save();

    if (isEmailConfigured()) {
      try {
        const to = fine.requestedByUserId
          ? await resolveMemberEmail(group, fine.requestedByUserId)
          : null;

        if (to) {
          await sendFineRejectedEmail({
            to,
            requesterName: fine.requestedByName,
            targetName: fine.targetUserName,
            amount: fine.amount,
            reason: fine.reason,
            rejectReason: fine.rejectReason,
            month: fine.month,
          });
        }
      } catch (emailErr) {
        console.error('Fine reject email error:', emailErr.message);
      }
    }

    res.json({ fine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/fine/:id
// Manager deletes an approved fine
// ─────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can delete fines' });
    }

    const fine = await Fine.findOneAndDelete({ _id: req.params.id, groupId: user.groupId });
    if (!fine) return res.status(404).json({ error: 'Fine not found' });

    res.json({ message: 'Fine deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/fine/:month/summary
// Per-member total approved fines for the month
// NOTE: must come before GET /:month to avoid "summary" being
//       treated as a month value
// ─────────────────────────────────────────────────────────────
router.get('/:month/summary', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);

    const fines = await Fine.find({
      groupId: user.groupId,
      month: req.params.month,
      status: 'approved',
    });

    const summaryMap = {};
    group.members.forEach((m) => {
      summaryMap[m.userId] = { userId: m.userId, name: m.name, total: 0, count: 0 };
    });

    fines.forEach((f) => {
      if (summaryMap[f.targetUserId]) {
        summaryMap[f.targetUserId].total += f.amount;
        summaryMap[f.targetUserId].count += 1;
      }
    });

    res.json({ summary: Object.values(summaryMap) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/fine/:month
// Returns { fines: [...approved], pending: [...pending] }
// NOTE: must come last among GET routes — it's a catch-all param
// ─────────────────────────────────────────────────────────────
router.get('/:month', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const [fines, pending] = await Promise.all([
      Fine.find({ groupId: user.groupId, month: req.params.month, status: 'approved' }).sort({ createdAt: -1 }),
      Fine.find({ groupId: user.groupId, month: req.params.month, status: 'pending' }).sort({ createdAt: -1 }),
    ]);

    res.json({ fines, pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
