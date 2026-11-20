import express from 'express';
import PDFDocument from 'pdfkit';
import { verifyToken } from '../middleware/auth.js';
import BazarSchedule from '../models/BazarSchedule.js';
import Group from '../models/Group.js';
import User from '../models/User.js';

const router = express.Router();

// GET schedule for a month
router.get('/:month', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const schedule = await BazarSchedule.findOne({ groupId: user.groupId, month: req.params.month });
    res.json({ schedule: schedule || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET download PDF for a month (any member)
router.get('/:month/pdf', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    const schedule = await BazarSchedule.findOne({ groupId: user.groupId, month: req.params.month });

    if (!schedule?.ranges?.length) {
      return res.status(404).json({ error: 'No schedule found for this month' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bazar-schedule-${req.params.month}.pdf`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 90).fill('#0d9488');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold')
       .text('BAZAR SCHEDULE', 50, 28, { align: 'center' });
    doc.fontSize(11).font('Helvetica')
       .text(`${group.name}  |  Month: ${req.params.month}`, 50, 60, { align: 'center' });

    const formatDate = (d) => {
      const date = new Date(d);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    };
    const infoY = 110;
    doc.rect(50, infoY, 495, 40).stroke('#0d9488');
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Group Code:', 60, infoY + 14);
    doc.font('Helvetica').text(group.groupCode, 140, infoY + 14);
    doc.font('Helvetica-Bold').text('Generated:', 350, infoY + 14);
    doc.font('Helvetica').text(formatDate(new Date()), 420, infoY + 14);

    // Table header
    let y = 175;
    doc.rect(50, y, 495, 25).fill('#0d9488');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('#', 60, y + 8, { width: 30 });
    doc.text('Member Name', 90, y + 8, { width: 180 });
    doc.text('From Date', 270, y + 8, { width: 120 });
    doc.text('To Date', 390, y + 8, { width: 120 });

    y += 25;
    doc.fillColor('#000000').fontSize(10).font('Helvetica');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedRanges = [...schedule.ranges].sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate));

    sortedRanges.forEach((entry, i) => {
      if (y > 720) { doc.addPage(); y = 50; }

      const from = new Date(entry.fromDate);
      const to = new Date(entry.toDate);
      const isActive = today >= from && today <= to;

      if (i % 2 === 0) doc.rect(50, y, 495, 22).fill('#f0fdfa');
      if (isActive) doc.rect(50, y, 495, 22).fill('#ccfbf1');

      doc.fillColor('#000000');
      doc.text((i + 1).toString(), 60, y + 6, { width: 30 });
      doc.text(entry.name, 90, y + 6, { width: 180 });
      doc.text(formatDate(from), 270, y + 6, { width: 120 });
      doc.text(formatDate(to), 390, y + 6, { width: 120 });

      if (isActive) {
        doc.fillColor('#0d9488').font('Helvetica-Bold').text('>> On Duty', 480, y + 6, { width: 60 });
        doc.fillColor('#000000').font('Helvetica');
      }

      y += 22;
    });

    // Footer
    doc.rect(50, y + 10, 495, 1).fill('#e5e7eb');
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
       .text(`Generated on ${formatDate(new Date())} | Mess Manager`, 50, y + 18, { align: 'center', width: 495 });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create/replace schedule (manager only)
// body: { month, ranges: [{ userId, fromDate, toDate }] }
router.post('/', verifyToken, async (req, res) => {
  try {
    const { month, ranges } = req.body;

    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) return res.status(403).json({ error: 'Only manager can set schedule' });

    if (!ranges?.length) return res.status(400).json({ error: 'No ranges provided' });

    // Validate and build range entries
    const rangeEntries = ranges.map(r => {
      const member = group.members.find(m => m.userId === r.userId);
      if (!member) throw new Error(`Member not found: ${r.userId}`);
      
      // Check if member is active
      if (member.status === 'inactive') {
        throw new Error(`Cannot assign bazar to inactive member: ${member.name}`);
      }
      
      // Check date ranges for members who left and rejoined
      const fromDate = new Date(r.fromDate);
      const toDate = new Date(r.toDate);
      
      if (member.leftAt && member.rejoinedAt) {
        const leftDate = new Date(member.leftAt);
        const rejoinDate = new Date(member.rejoinedAt);
        // Check if any part of the range falls in inactive period
        if (fromDate < rejoinDate && toDate >= leftDate) {
          throw new Error(`${member.name}: Cannot assign bazar for dates when member was not in group`);
        }
      }
      
      if (member.leftAt && !member.rejoinedAt) {
        const leftDate = new Date(member.leftAt);
        if (toDate >= leftDate) {
          throw new Error(`${member.name}: Cannot assign bazar after member left the group`);
        }
      }
      
      if (toDate < fromDate) {
        throw new Error(`${member.name}: End date must be after or equal to start date`);
      }
      
      return {
        userId: member.userId,
        name: member.name,
        fromDate,
        toDate,
      };
    });

    await BazarSchedule.findOneAndUpdate(
      { groupId: user.groupId, month },
      { groupId: user.groupId, month, ranges: rangeEntries },
      { upsert: true, new: true }
    );

    res.json({ message: 'Schedule saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE full schedule for a month (manager only)
router.delete('/:month', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) return res.status(403).json({ error: 'Only manager can delete schedule' });

    await BazarSchedule.findOneAndDelete({ groupId: user.groupId, month: req.params.month });
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
