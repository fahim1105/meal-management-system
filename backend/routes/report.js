import express from 'express';
import PDFDocument from 'pdfkit';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Fine from '../models/Fine.js';
import { verifyToken } from '../middleware/auth.js';
import { computeReportData, renderMonthlyReportPdf } from '../services/reportPdfService.js';

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

export default router;
