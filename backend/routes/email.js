import express from 'express';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Fine from '../models/Fine.js';
import { verifyToken } from '../middleware/auth.js';
import { sendMonthlyReportEmail, isEmailConfigured } from '../services/emailService.js';
import { sendBazarReminders } from '../services/cronScheduler.js';
import { generateReportPDFBuffer } from '../services/reportPdfService.js';
import { resolveMemberEmail } from '../utils/memberEmail.js';

const router = express.Router();

const verifyCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'CRON_SECRET is not configured' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const handleDutyReminders = async (timeSlot, res) => {
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Email service is not configured' });
  }

  const { todayStr, dutyCount, sent, results, skipped } = await sendBazarReminders(timeSlot);

  if (skipped === 'email_not_configured') {
    return res.status(503).json({ error: 'Email service is not configured' });
  }

  if (dutyCount === 0) {
    return res.json({ message: 'No bazar duty today', sent: 0, timeSlot, date: todayStr });
  }

  return res.json({
    message: `Reminders sent: ${sent} success, ${results.failed.length} failed`,
    timeSlot,
    date: todayStr,
    dutyCount,
    success: results.success,
    failed: results.failed,
  });
};

// POST /api/email/send-monthly-report
router.post('/send-monthly-report', verifyToken, async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({
        error: 'Email service is not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in environment variables.',
      });
    }

    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only the manager can send the monthly report' });
    }

    const month = req.body.month || new Date().toISOString().slice(0, 7);

    const [finance, mealSheet, approvedFines] = await Promise.all([
      Finance.findOne({ groupId: user.groupId, month }),
      MealSheet.findOne({ groupId: user.groupId, month }),
      Fine.find({ groupId: user.groupId, month, status: 'approved' }).sort({ createdAt: -1 }),
    ]);

    const pdfBuffer = await generateReportPDFBuffer({
      group,
      finance,
      mealSheet,
      approvedFines,
      month,
    });

    const activeMembers = group.members.filter((m) => m.status === 'active');
    const recipients = [];

    for (const member of activeMembers) {
      const email = await resolveMemberEmail(group, member.userId);
      if (email) {
        recipients.push({
          userId: member.userId,
          name: member.name,
          email,
        });
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No active members with valid email addresses found' });
    }

    const results = { success: [], failed: [] };

    await Promise.allSettled(
      recipients.map(async (member) => {
        try {
          await sendMonthlyReportEmail({
            to: member.email,
            name: member.name,
            groupName: group.name,
            month,
            pdfBuffer,
          });
          results.success.push(member.email);
        } catch (err) {
          console.error(`Failed to send report to ${member.email}:`, err.message);
          results.failed.push(member.email);
        }
      })
    );

    if (results.failed.length > 0 && results.success.length > 0) {
      return res.status(207).json({
        message: `Report sent to ${results.success.length} members. ${results.failed.length} failed.`,
        success: results.success,
        failed: results.failed,
      });
    }

    if (results.failed.length > 0 && results.success.length === 0) {
      return res.status(500).json({ error: 'Failed to send emails to all members', failed: results.failed });
    }

    res.json({
      message: `Monthly report sent to ${results.success.length} members`,
      count: results.success.length,
      recipients: results.success,
    });
  } catch (error) {
    console.error('Send monthly report error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/cron/morning-reminder', verifyCronSecret, async (req, res) => {
  try {
    await handleDutyReminders('morning', res);
  } catch (error) {
    console.error('Morning reminder cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/cron/evening-reminder', verifyCronSecret, async (req, res) => {
  try {
    await handleDutyReminders('evening', res);
  } catch (error) {
    console.error('Evening reminder cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/trigger-duty-reminders', verifyCronSecret, async (req, res) => {
  try {
    const timeSlot = req.body.timeSlot === 'evening' ? 'evening' : 'morning';
    await handleDutyReminders(timeSlot, res);
  } catch (error) {
    console.error('Trigger duty reminders error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
