import cron from 'node-cron';
import BazarSchedule from '../models/BazarSchedule.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { sendBazarReminderEmail, isEmailConfigured } from './emailService.js';
import { resolveMemberEmail } from '../utils/memberEmail.js';
import admin from '../config/firebase.js';

// Today's calendar date in Bangladesh (UTC+6) as YYYY-MM-DD
export const getTodayInBD = () => {
  const now = new Date();
  const bdOffset = 6 * 60;
  const bdNow = new Date(now.getTime() + bdOffset * 60 * 1000);
  return bdNow.toISOString().slice(0, 10);
};

// Find members whose bazar duty includes today (BD), then send reminders
export const sendBazarReminders = async (timeSlot) => {
  const todayStr = getTodayInBD();
  const today = new Date(todayStr);
  const results = { success: [], failed: [] };

  if (!isEmailConfigured()) {
    console.log('⚠️ Email service is not configured. Skipping bazar reminders.');
    return { todayStr, dutyCount: 0, sent: 0, results, skipped: 'email_not_configured' };
  }

  console.log(`🔔 [${timeSlot.toUpperCase()}] Checking bazar duty for: ${todayStr}`);

  const allSchedules = await BazarSchedule.find({});
  const dutyEntries = [];

  for (const schedule of allSchedules) {
    for (const range of schedule.ranges) {
      const from = new Date(range.fromDate);
      const to = new Date(range.toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      if (today >= from && today <= to) {
        dutyEntries.push({
          groupId: schedule.groupId,
          userId: range.userId,
          name: range.name,
          fromDate: range.fromDate,
          toDate: range.toDate,
        });
      }
    }
  }

  if (dutyEntries.length === 0) {
    console.log('✅ No bazar duty today. No reminders sent.');
    return { todayStr, dutyCount: 0, sent: 0, results };
  }

  console.log(`📧 Found ${dutyEntries.length} member(s) with bazar duty today`);

  const groupCache = new Map();

  await Promise.allSettled(
    dutyEntries.map(async (entry) => {
      try {
        const gid = entry.groupId.toString();
        if (!groupCache.has(gid)) {
          groupCache.set(gid, await Group.findById(entry.groupId));
        }
        const group = groupCache.get(gid);
        const email = await resolveMemberEmail(group, entry.userId);

        if (!email) {
          console.warn(`⚠️ No email for user ${entry.userId} (${entry.name})`);
          results.failed.push(entry.name);
          return;
        }

        await sendBazarReminderEmail({
          to: email,
          name: entry.name,
          date: today,
          fromDate: entry.fromDate,
          toDate: entry.toDate,
          timeSlot,
        });

        console.log(`✅ Reminder sent to ${entry.name} (${email})`);
        results.success.push(email);
      } catch (err) {
        console.error(`❌ Failed to send reminder to ${entry.name}:`, err.message);
        results.failed.push(entry.name);
      }
    })
  );

  console.log(`📊 Reminder Summary: ${results.success.length} sent, ${results.failed.length} failed`);
  return {
    todayStr,
    dutyCount: dutyEntries.length,
    sent: results.success.length,
    results,
  };
};

let morningJob = null;
let eveningJob = null;
let monthlyCleanupJob = null;

// Monthly cleanup job - runs on 1st of every month at 00:01 BD time (18:01 UTC previous day)
export const cleanupInactiveMembers = async () => {
  console.log('\n🧹 ========== MONTHLY CLEANUP: Removing inactive members ==========');
  
  try {
    const now = new Date();
    
    // Find all users scheduled for deletion
    const usersToCleanup = await User.find({
      isActive: false,
      scheduledDeletion: { $lte: now }
    });
    
    console.log(`Found ${usersToCleanup.length} users scheduled for cleanup`);
    
    for (const user of usersToCleanup) {
      try {
        // Remove from group members array
        if (user.groupId) {
          const group = await Group.findById(user.groupId);
          if (group) {
            group.members = group.members.filter(m => m.userId !== user.uid);
            await group.save();
            console.log(`✅ Removed ${user.name} from group ${group.name}`);
          }
        }
        
        // Clear user's group data
        user.groupId = null;
        user.isActive = true;
        user.leftAt = null;
        user.scheduledDeletion = null;
        await user.save();
        
        // Clear Firebase custom claims
        if (admin.apps.length > 0) {
          await admin.auth().setCustomUserClaims(user.uid, { groupId: null });
        }
        
        console.log(`✅ Cleaned up user: ${user.name} (${user.email})`);
      } catch (err) {
        console.error(`❌ Failed to cleanup user ${user.name}:`, err.message);
      }
    }
    
    console.log(`📊 Cleanup Summary: ${usersToCleanup.length} users processed`);
    console.log('====================================================\n');
    
    return { processed: usersToCleanup.length };
  } catch (error) {
    console.error('❌ Monthly cleanup failed:', error);
    return { error: error.message };
  }
};

export const initializeCronJobs = () => {
  if (process.env.VERCEL) {
    console.log('⏭️ Vercel deployment: use Vercel Cron → /api/email/cron/* (node-cron disabled)');
    return;
  }

  console.log('⏰ Initializing cron jobs for bazar reminders and monthly cleanup...');

  // 10:00 AM Bangladesh = 04:00 UTC
  morningJob = cron.schedule(
    '0 4 * * *',
    async () => {
      console.log('\n🌅 ========== MORNING REMINDER (10:00 AM BD) ==========');
      await sendBazarReminders('morning');
      console.log('====================================================\n');
    },
    { timezone: 'UTC' }
  );

  // 6:00 PM Bangladesh = 12:00 UTC
  eveningJob = cron.schedule(
    '0 12 * * *',
    async () => {
      console.log('\n🌆 ========== EVENING REMINDER (6:00 PM BD) ==========');
      await sendBazarReminders('evening');
      console.log('====================================================\n');
    },
    { timezone: 'UTC' }
  );

  // Monthly cleanup: 1st of every month at 00:01 BD time = 18:01 UTC previous day
  monthlyCleanupJob = cron.schedule(
    '1 18 * * *',
    async () => {
      const today = getTodayInBD();
      // Only run if it's the 1st of the month in Bangladesh
      if (today.endsWith('-01')) {
        await cleanupInactiveMembers();
      }
    },
    { timezone: 'UTC' }
  );

  console.log('✅ Cron jobs initialized');
  console.log('📅 Morning: 10:00 AM Bangladesh | Evening: 6:00 PM Bangladesh');
  console.log('🧹 Monthly Cleanup: 1st of every month at 00:01 AM Bangladesh');
};

export const stopCronJobs = () => {
  morningJob?.stop();
  eveningJob?.stop();
  monthlyCleanupJob?.stop();
  morningJob = null;
  eveningJob = null;
  monthlyCleanupJob = null;
};

export const triggerManualReminder = async (timeSlot = 'morning') => {
  console.log(`\n🧪 ========== MANUAL TEST REMINDER (${timeSlot.toUpperCase()}) ==========`);
  const result = await sendBazarReminders(timeSlot);
  console.log('====================================================\n');
  return result;
};
