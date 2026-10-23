import express from 'express';
import PDFDocument from 'pdfkit';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Fine from '../models/Fine.js';
import { verifyToken } from '../middleware/auth.js';
import { computeReportData, renderMonthlyReportPdf } from '../services/reportPdfService.js';
import { computeMemberHistory } from '../services/historyService.js';
import { renderHistoryPdf } from '../services/historyPdfService.js';

const router = express.Router();

router.get('/download/:month', verifyToken, async (req, res) => {
  try {
    const { month } = req.params;
    const user = await User.findOne({ uid: req.user.uid });

    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);

    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can download reports' });
    }

    const [finance, mealSheet, approvedFines] = await Promise.all([
      Finance.findOne({ groupId: user.groupId, month }),
      MealSheet.findOne({ groupId: user.groupId, month }),
      Fine.find({ groupId: user.groupId, month, status: 'approved' }).sort({ createdAt: -1 }),
    ]);

    const reportData = computeReportData(group, finance, mealSheet);

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Disposition', `attachment; filename=report-${month}.pdf`);

    doc.pipe(res);

    renderMonthlyReportPdf(doc, {
      group,
      month,
      finance,
      approvedFines,
      ...reportData,
    });

    doc.end();
  } catch (error) {
    console.error('Report generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Any group member can download their personal history PDF
router.get('/history-pdf', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    const member = group.members.find((m) => m.userId === req.user.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { history } = await computeMemberHistory(group, member, req.user.uid);
    const memberName = member.name || user.name || 'Member';

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
    });

    const safeName = (group.name || 'group').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=meal-history-${safeName}.pdf`
    );

    doc.pipe(res);
    renderHistoryPdf(doc, { group, memberName, history });
    doc.end();
  } catch (error) {
    console.error('History PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
