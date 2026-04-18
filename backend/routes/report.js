import express from 'express';
import PDFDocument from 'pdfkit';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/download/:month', verifyToken, async (req, res) => {
  try {
    const { month } = req.params;
    const user = await User.findOne({ uid: req.user.uid });

    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    
    // Check if user is manager
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can download reports' });
    }

    const finance = await Finance.findOne({ groupId: user.groupId, month });
    const mealSheet = await MealSheet.findOne({ groupId: user.groupId, month });

    // Calculate summary
    const totalBazar = finance?.bazarCosts.reduce((sum, b) => sum + b.amount, 0) || 0;
    
    const memberStats = {};
    
    group.members.forEach(member => {
      memberStats[member.userId] = {
        name: member.name,
        email: member.email,
        status: member.status,
        ownMeals: 0,
        guestMeals: 0,
        totalMeals: 0,
        breakfastCount: 0,
        lunchCount: 0,
        dinnerCount: 0,
        deposit: 0,
        cost: 0,
        balance: 0
      };
    });

    // Calculate meals
    if (mealSheet) {
      for (const [day, meals] of mealSheet.days) {
        meals.forEach(meal => {
          if (memberStats[meal.userId]) {
            const ownBreakfast = meal.breakfast ? 1 : 0;
            const ownLunch = meal.lunch ? 1 : 0;
            const ownDinner = meal.dinner ? 1 : 0;
            
            const guestBreakfast = meal.breakfast ? Math.max(0, (meal.breakfastCount || 1) - 1) : 0;
            const guestLunch = meal.lunch ? Math.max(0, (meal.lunchCount || 1) - 1) : 0;
            const guestDinner = meal.dinner ? Math.max(0, (meal.dinnerCount || 1) - 1) : 0;
            
            const totalBreakfast = meal.breakfast ? (meal.breakfastCount || 1) : 0;
            const totalLunch = meal.lunch ? (meal.lunchCount || 1) : 0;
            const totalDinner = meal.dinner ? (meal.dinnerCount || 1) : 0;
            
            memberStats[meal.userId].ownMeals += ownBreakfast + ownLunch + ownDinner;
            memberStats[meal.userId].guestMeals += guestBreakfast + guestLunch + guestDinner;
            memberStats[meal.userId].totalMeals += totalBreakfast + totalLunch + totalDinner;
            memberStats[meal.userId].breakfastCount += totalBreakfast;
            memberStats[meal.userId].lunchCount += totalLunch;
            memberStats[meal.userId].dinnerCount += totalDinner;
          }
        });
      }
    }

    // Calculate deposits (cumulative sum per user)
    if (finance) {
      finance.deposits.forEach(deposit => {
        if (memberStats[deposit.userId]) {
          memberStats[deposit.userId].deposit += deposit.amount;
        }
      });
    }

    const totalMeals = Object.values(memberStats).reduce((sum, m) => sum + m.totalMeals, 0);
    const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

    const memberIds = Object.keys(memberStats);
    let assignedCost = 0;
    memberIds.forEach((userId, i) => {
      if (i < memberIds.length - 1) {
        const cost = Math.round(memberStats[userId].totalMeals * mealRate * 100) / 100;
        memberStats[userId].cost = cost;
        assignedCost += cost;
      } else {
        memberStats[userId].cost = Math.round((totalBazar - assignedCost) * 100) / 100;
      }
      memberStats[userId].balance = Math.round((memberStats[userId].deposit - memberStats[userId].cost) * 100) / 100;
    });

    // Create PDF with better settings
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4',
      bufferPages: true
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${month}.pdf`);

    doc.pipe(res);

    // Helper function to draw a line
    const drawLine = (y, color = '#000000') => {
      doc.strokeColor(color).lineWidth(1)
         .moveTo(50, y).lineTo(545, y).stroke();
    };

    // Helper to format currency (using BDT instead of symbol)
    const formatCurrency = (amount) => `BDT ${amount.toFixed(2)}`;

    // Helper to format date consistently regardless of server locale
    const formatDate = (d) => {
      const date = new Date(d);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    };

    // Header with background
    doc.rect(0, 0, 595, 100).fill('#3b82f6');
    doc.fillColor('#ffffff')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('MESS MANAGEMENT REPORT', 50, 35, { align: 'center' });
    
    doc.fillColor('#ffffff')
       .fontSize(12)
       .font('Helvetica')
       .text(`Monthly Financial & Meal Report`, 50, 70, { align: 'center' });

    doc.fillColor('#000000');
    doc.moveDown(3);

    // Group Info Box
    const infoY = 120;
    doc.rect(50, infoY, 495, 60).stroke('#3b82f6');
    
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Group Name:', 60, infoY + 10);
    doc.font('Helvetica').text(group.name, 150, infoY + 10);
    
    doc.font('Helvetica-Bold').text('Group Code:', 350, infoY + 10);
    doc.font('Helvetica').text(group.groupCode, 430, infoY + 10);
    
    doc.font('Helvetica-Bold').text('Report Month:', 60, infoY + 30);
    doc.font('Helvetica').text(month, 150, infoY + 30);
    
    doc.font('Helvetica-Bold').text('Generated:', 350, infoY + 30);
    doc.font('Helvetica').text(formatDate(new Date()), 430, infoY + 30);

    doc.moveDown(3);

    // Financial Summary Box
    const summaryY = 200;
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#3b82f6')
       .text('FINANCIAL OVERVIEW', 50, summaryY);
    
    doc.fillColor('#000000');
    doc.rect(50, summaryY + 25, 495, 100).stroke('#e5e7eb');
    
    doc.fontSize(10).font('Helvetica');
    const summaryData = [
      ['Total Bazar Cost:', formatCurrency(totalBazar)],
      ['Total Meals:', totalMeals.toString()],
      ['Meal Rate:', formatCurrency(mealRate)],
      ['Total Deposits:', formatCurrency(Object.values(memberStats).reduce((sum, m) => sum + m.deposit, 0))],
      ['Net Balance:', formatCurrency(Object.values(memberStats).reduce((sum, m) => sum + m.balance, 0))]
    ];

    let summaryItemY = summaryY + 35;
    summaryData.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 70, summaryItemY, { width: 150 });
      doc.font('Helvetica').text(value, 250, summaryItemY, { width: 250, align: 'right' });
      summaryItemY += 18;
    });

    doc.moveDown(2);

    // Member Details Table
    let currentY = summaryY + 150;
    
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#3b82f6')
       .text('MEMBER DETAILS', 50, currentY);
    
    currentY += 30;
    doc.fillColor('#000000');

    // Table header with background
    doc.rect(50, currentY, 495, 25).fill('#3b82f6');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    
    doc.text('Name', 55, currentY + 8, { width: 90 });
    doc.text('Own', 145, currentY + 8, { width: 40, align: 'center' });
    doc.text('Guest', 185, currentY + 8, { width: 40, align: 'center' });
    doc.text('Total', 225, currentY + 8, { width: 40, align: 'center' });
    doc.text('Deposit', 265, currentY + 8, { width: 80, align: 'right' });
    doc.text('Cost', 345, currentY + 8, { width: 80, align: 'right' });
    doc.text('Balance', 425, currentY + 8, { width: 110, align: 'right' });

    currentY += 25;
    doc.fillColor('#000000');

    // Table rows
    doc.fontSize(9).font('Helvetica');
    Object.values(memberStats).forEach((stats, index) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, currentY, 495, 20).fill('#f9fafb');
      }

      doc.fillColor('#000000');
      doc.text(stats.name, 55, currentY + 5, { width: 90 });
      doc.text(stats.ownMeals.toString(), 145, currentY + 5, { width: 40, align: 'center' });
      doc.text(stats.guestMeals.toString(), 185, currentY + 5, { width: 40, align: 'center' });
      doc.text(stats.totalMeals.toString(), 225, currentY + 5, { width: 40, align: 'center' });
      doc.text(formatCurrency(stats.deposit), 265, currentY + 5, { width: 80, align: 'right' });
      doc.text(formatCurrency(stats.cost), 345, currentY + 5, { width: 80, align: 'right' });
      
      // Color code balance
      doc.fillColor(stats.balance >= 0 ? '#10b981' : '#ef4444');
      doc.text(formatCurrency(stats.balance), 425, currentY + 5, { width: 110, align: 'right' });
      doc.fillColor('#000000');

      currentY += 20;
    });

    doc.rect(50, currentY, 495, 0).stroke('#e5e7eb');
    currentY += 30;

    // Meal Type Breakdown
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#3b82f6')
       .text('MEAL TYPE BREAKDOWN', 50, currentY);
    
    currentY += 30;
    doc.fillColor('#000000');

    // Table header
    doc.rect(50, currentY, 495, 25).fill('#3b82f6');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    
    doc.text('Name', 55, currentY + 8, { width: 200 });
    doc.text('Breakfast', 255, currentY + 8, { width: 80, align: 'center' });
    doc.text('Lunch', 335, currentY + 8, { width: 80, align: 'center' });
    doc.text('Dinner', 415, currentY + 8, { width: 120, align: 'center' });

    currentY += 25;
    doc.fillColor('#000000');

    // Table rows
    doc.fontSize(9).font('Helvetica');
    Object.values(memberStats).forEach((stats, index) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }

      if (index % 2 === 0) {
        doc.rect(50, currentY, 495, 20).fill('#f9fafb');
      }

      doc.fillColor('#000000');
      doc.text(stats.name, 55, currentY + 5, { width: 200 });
      doc.text(stats.breakfastCount.toString(), 255, currentY + 5, { width: 80, align: 'center' });
      doc.text(stats.lunchCount.toString(), 335, currentY + 5, { width: 80, align: 'center' });
      doc.text(stats.dinnerCount.toString(), 415, currentY + 5, { width: 120, align: 'center' });

      currentY += 20;
    });

    doc.rect(50, currentY, 495, 0).stroke('#e5e7eb');
    currentY += 30;

    // Bazar History
    if (finance?.bazarCosts?.length > 0) {
      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(14).font('Helvetica-Bold')
         .fillColor('#3b82f6')
         .text('BAZAR HISTORY', 50, currentY);
      
      currentY += 30;
      doc.fillColor('#000000');

      // Table header
      doc.rect(50, currentY, 495, 25).fill('#3b82f6');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      
      doc.text('Date', 55, currentY + 8, { width: 100 });
      doc.text('Amount', 155, currentY + 8, { width: 120, align: 'right' });
      doc.text('Description', 295, currentY + 8, { width: 240 });

      currentY += 25;
      doc.fillColor('#000000');

      // Table rows
      doc.fontSize(9).font('Helvetica');
      finance.bazarCosts.forEach((bazar, index) => {
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
        }

        if (index % 2 === 0) {
          doc.rect(50, currentY, 495, 20).fill('#f9fafb');
        }

        doc.fillColor('#000000');
        doc.text(formatDate(new Date(bazar.date)), 55, currentY + 5, { width: 100 });
        doc.text(formatCurrency(bazar.amount), 155, currentY + 5, { width: 120, align: 'right' });
        doc.text(bazar.description || '-', 295, currentY + 5, { width: 240 });

        currentY += 20;
      });

      doc.rect(50, currentY, 495, 0).stroke('#e5e7eb');
      currentY += 5;
      
      // Total
      doc.rect(50, currentY, 495, 25).fill('#e5e7eb');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('TOTAL', 55, currentY + 8, { width: 100 });
      doc.text(formatCurrency(totalBazar), 155, currentY + 8, { width: 100, align: 'right' });
    }

    // Footer on last page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica')
         .fillColor('#6b7280')
         .text(
           `Page ${i + 1} of ${pageCount} | Generated on ${formatDate(new Date())} | This is a computer-generated report`,
           50,
           770,
           { align: 'center', width: 495 }
         );
    }

    doc.end();

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
