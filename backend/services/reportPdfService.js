import PDFDocument from 'pdfkit';

const formatCurrency = (amount) => `BDT ${Number(amount).toFixed(2)}`;

const formatDate = (d) => {
  const date = new Date(d);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const formatShortDate = (d) => {
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
};

const iterateMealDays = (mealSheet) => {
  if (!mealSheet?.days) return [];
  if (mealSheet.days instanceof Map) return [...mealSheet.days.entries()];
  return Object.entries(mealSheet.days);
};

/** Compute member stats, meal rate, totals — shared by download & email PDF. */
export function computeReportData(group, finance, mealSheet) {
  const totalBazar = finance?.bazarCosts?.reduce((sum, b) => sum + b.amount, 0) || 0;

  const memberStats = {};
  group.members.forEach((member) => {
    memberStats[member.userId] = {
      name: member.name,
      ownMeals: 0,
      guestMeals: 0,
      totalMeals: 0,
      breakfastCount: 0,
      lunchCount: 0,
      dinnerCount: 0,
      deposit: 0,
      cost: 0,
      balance: 0,
    };
  });

  for (const [, meals] of iterateMealDays(mealSheet)) {
    if (!Array.isArray(meals)) continue;
    meals.forEach((meal) => {
      if (!memberStats[meal.userId]) return;
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
    });
  }

  if (finance?.deposits) {
    finance.deposits.forEach((deposit) => {
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
    memberStats[userId].balance =
      Math.round((memberStats[userId].deposit - memberStats[userId].cost) * 100) / 100;
  });

  return { memberStats, totalBazar, totalMeals, mealRate };
}

/** Draw full monthly report into an open PDFDocument. */
export function renderMonthlyReportPdf(doc, { group, month, finance, approvedFines = [], memberStats, totalBazar, totalMeals, mealRate }) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const [, reportMonthNum] = month.split('-').map(Number);
  const fineSectionTitle = `Fine (${monthNames[reportMonthNum - 1] || month})`;

  const managerMember = group.members.find((m) => m.userId === group.managerId);
  const managerName = managerMember?.name || 'Manager';
  const getIssuedByName = (fine) => {
    const name = fine.requestedByName || managerName;
    if (fine.requestedByUserId === group.managerId) return `${name} (Manager)`;
    return name;
  };

  doc.rect(0, 0, 595, 100).fill('#3b82f6');
  doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
    .text('MESS MANAGEMENT REPORT', 50, 35, { align: 'center' });
  doc.fillColor('#ffffff').fontSize(12).font('Helvetica')
    .text('Monthly Financial & Meal Report', 50, 70, { align: 'center' });
  doc.fillColor('#000000').moveDown(3);

  const infoY = 120;
  doc.rect(50, infoY, 495, 75).stroke('#3b82f6');
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Group Name:', 60, infoY + 10);
  doc.font('Helvetica').text(group.name, 150, infoY + 10);
  doc.font('Helvetica-Bold').text('Group Code:', 350, infoY + 10);
  doc.font('Helvetica').text(group.groupCode, 430, infoY + 10);
  doc.font('Helvetica-Bold').text('Report Month:', 60, infoY + 30);
  doc.font('Helvetica').text(month, 150, infoY + 30);
  doc.font('Helvetica-Bold').text('Generated:', 350, infoY + 30);
  doc.font('Helvetica').text(formatDate(new Date()), 430, infoY + 30);
  doc.font('Helvetica-Bold').text('Manager:', 60, infoY + 50);
  doc.font('Helvetica').text(managerName, 150, infoY + 50);

  const summaryY = 215;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#3b82f6').text('FINANCIAL OVERVIEW', 50, summaryY);
  doc.fillColor('#000000');
  doc.rect(50, summaryY + 25, 495, 100).stroke('#e5e7eb');

  const summaryData = [
    ['Total Bazar Cost:', formatCurrency(totalBazar)],
    ['Total Meals:', totalMeals.toString()],
    ['Meal Rate:', formatCurrency(mealRate)],
    ['Total Deposits:', formatCurrency(Object.values(memberStats).reduce((s, m) => s + m.deposit, 0))],
    ['Net Balance:', formatCurrency(Object.values(memberStats).reduce((s, m) => s + m.balance, 0))],
  ];

  let summaryItemY = summaryY + 35;
  summaryData.forEach(([label, value]) => {
    doc.fontSize(10).font('Helvetica-Bold').text(label, 70, summaryItemY, { width: 150 });
    doc.font('Helvetica').text(value, 250, summaryItemY, { width: 250, align: 'right' });
    summaryItemY += 18;
  });

  let currentY = summaryY + 150;
  if (currentY > 650) {
    doc.addPage();
    currentY = 50;
  }

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#3b82f6').text('MEMBER DETAILS', 50, currentY);
  currentY += 30;
  doc.fillColor('#000000');

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
  doc.fillColor('#000000').fontSize(9).font('Helvetica');

  Object.values(memberStats).forEach((stats, index) => {
    if (currentY > 720) {
      doc.addPage();
      currentY = 50;
    }
    if (index % 2 === 0) doc.rect(50, currentY, 495, 20).fill('#f9fafb');
    doc.fillColor('#000000');
    doc.text(stats.name, 55, currentY + 5, { width: 90 });
    doc.text(stats.ownMeals.toString(), 145, currentY + 5, { width: 40, align: 'center' });
    doc.text(stats.guestMeals.toString(), 185, currentY + 5, { width: 40, align: 'center' });
    doc.text(stats.totalMeals.toString(), 225, currentY + 5, { width: 40, align: 'center' });
    doc.text(formatCurrency(stats.deposit), 265, currentY + 5, { width: 80, align: 'right' });
    doc.text(formatCurrency(stats.cost), 345, currentY + 5, { width: 80, align: 'right' });
    doc.fillColor(stats.balance >= 0 ? '#10b981' : '#ef4444');
    doc.text(formatCurrency(stats.balance), 425, currentY + 5, { width: 110, align: 'right' });
    doc.fillColor('#000000');
    currentY += 20;
  });

  doc.rect(50, currentY, 495, 0).stroke('#e5e7eb');
  currentY += 30;

  if (currentY > 650) {
    doc.addPage();
    currentY = 50;
  }

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#3b82f6').text('MEAL TYPE BREAKDOWN', 50, currentY);
  currentY += 30;
  doc.fillColor('#000000');

  doc.rect(50, currentY, 495, 25).fill('#3b82f6');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('Name', 55, currentY + 8, { width: 200 });
  doc.text('Breakfast', 255, currentY + 8, { width: 80, align: 'center' });
  doc.text('Lunch', 335, currentY + 8, { width: 80, align: 'center' });
  doc.text('Dinner', 415, currentY + 8, { width: 120, align: 'center' });
  currentY += 25;
  doc.fillColor('#000000').fontSize(9).font('Helvetica');

  Object.values(memberStats).forEach((stats, index) => {
    if (currentY > 720) {
      doc.addPage();
      currentY = 50;
    }
    if (index % 2 === 0) doc.rect(50, currentY, 495, 20).fill('#f9fafb');
    doc.fillColor('#000000');
    doc.text(stats.name, 55, currentY + 5, { width: 200 });
    doc.text(stats.breakfastCount.toString(), 255, currentY + 5, { width: 80, align: 'center' });
    doc.text(stats.lunchCount.toString(), 335, currentY + 5, { width: 80, align: 'center' });
    doc.text(stats.dinnerCount.toString(), 415, currentY + 5, { width: 120, align: 'center' });
    currentY += 20;
  });

  doc.rect(50, currentY, 495, 0).stroke('#e5e7eb');
  currentY += 30;

  if (finance?.bazarCosts?.length > 0) {
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#3b82f6').text('BAZAR HISTORY', 50, currentY);
    currentY += 30;
    doc.fillColor('#000000');

    doc.rect(50, currentY, 495, 25).fill('#3b82f6');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 55, currentY + 8, { width: 100 });
    doc.text('Amount', 155, currentY + 8, { width: 120, align: 'right' });
    doc.text('Description', 295, currentY + 8, { width: 240 });
    currentY += 25;
    doc.fillColor('#000000').fontSize(9).font('Helvetica');

    finance.bazarCosts.forEach((bazar, index) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }
      if (index % 2 === 0) doc.rect(50, currentY, 495, 20).fill('#f9fafb');
      doc.fillColor('#000000');
      doc.text(formatDate(new Date(bazar.date)), 55, currentY + 5, { width: 100 });
      doc.text(formatCurrency(bazar.amount), 155, currentY + 5, { width: 120, align: 'right' });
      doc.text(bazar.description || '-', 295, currentY + 5, { width: 240 });
      currentY += 20;
    });

    doc.rect(50, currentY, 495, 0).stroke('#e5e7eb');
    currentY += 5;
    doc.rect(50, currentY, 495, 25).fill('#e5e7eb');
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('TOTAL', 55, currentY + 8, { width: 100 });
    doc.text(formatCurrency(totalBazar), 155, currentY + 8, { width: 100, align: 'right' });
    currentY += 30;
  }

  const fineTotals = {};
  group.members.forEach((m) => {
    if (m.status === 'active') fineTotals[m.userId] = { name: m.name, total: 0, count: 0 };
  });
  approvedFines.forEach((f) => {
    if (!fineTotals[f.targetUserId]) {
      fineTotals[f.targetUserId] = { name: f.targetUserName, total: 0, count: 0 };
    }
    fineTotals[f.targetUserId].total += f.amount;
    fineTotals[f.targetUserId].count += 1;
  });

  if (approvedFines.length > 0) {
    if (currentY > 600) {
      doc.addPage();
      currentY = 50;
    }
    currentY += 40;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#dc2626').text(fineSectionTitle, 50, currentY);
    currentY += 28;
    doc.fillColor('#000000');

    doc.rect(50, currentY, 495, 25).fill('#dc2626');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Member', 55, currentY + 8, { width: 200 });
    doc.text('Count', 255, currentY + 8, { width: 80, align: 'center' });
    doc.text('Total Fine', 345, currentY + 8, { width: 190, align: 'right' });
    currentY += 25;
    doc.fillColor('#000000').font('Helvetica');

    Object.values(fineTotals)
      .filter((s) => s.count > 0)
      .sort((a, b) => b.total - a.total)
      .forEach((stats, index) => {
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
        }
        if (index % 2 === 0) doc.rect(50, currentY, 495, 20).fill('#fef2f2');
        doc.fillColor('#000000');
        doc.text(stats.name, 55, currentY + 5, { width: 200 });
        doc.text(stats.count.toString(), 255, currentY + 5, { width: 80, align: 'center' });
        doc.fillColor('#dc2626').font('Helvetica-Bold');
        doc.text(formatCurrency(stats.total), 345, currentY + 5, { width: 190, align: 'right' });
        doc.fillColor('#000000').font('Helvetica');
        currentY += 20;
      });

    currentY += 25;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626').text('Fine Details', 50, currentY);
    currentY += 20;

    const FINE_TABLE_LEFT = 55;
    const fineColDefs = [
      { key: 'date', w: 50, gutterAfter: 8 },
      { key: 'member', w: 52, gutterAfter: 8 },
      { key: 'issuedBy', w: 52, gutterAfter: 6 },
      { key: 'amount', w: 68, gutterAfter: 8 },
      { key: 'reason', w: 238, gutterAfter: 0 },
    ];
    const fineCols = {};
    let fineColX = FINE_TABLE_LEFT;
    for (const { key, w, gutterAfter } of fineColDefs) {
      fineCols[key] = { x: fineColX, w };
      fineColX += w + gutterAfter;
    }
    const FINE_ROW_PAD = 6;
    const FINE_MIN_ROW = 24;

    const drawFineDetailsHeader = () => {
      doc.rect(50, currentY, 495, 22).fill('#dc2626');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('Date', fineCols.date.x, currentY + 7, { width: fineCols.date.w });
      doc.text('Member', fineCols.member.x, currentY + 7, { width: fineCols.member.w });
      doc.text('Issued By', fineCols.issuedBy.x, currentY + 7, { width: fineCols.issuedBy.w });
      doc.text('Amount', fineCols.amount.x, currentY + 7, { width: fineCols.amount.w });
      doc.text('Reason', fineCols.reason.x, currentY + 7, { width: fineCols.reason.w });
      currentY += 22;
      doc.fillColor('#000000');
    };

    drawFineDetailsHeader();

    approvedFines.forEach((fine, index) => {
      const reason = fine.reason || '-';
      doc.fontSize(8).font('Helvetica');
      const reasonHeight = doc.heightOfString(reason, { width: fineCols.reason.w });
      const rowHeight = Math.max(FINE_MIN_ROW, Math.ceil(reasonHeight) + FINE_ROW_PAD * 2);

      if (currentY + rowHeight > 750) {
        doc.addPage();
        currentY = 50;
        drawFineDetailsHeader();
      }

      if (index % 2 === 0) doc.rect(50, currentY, 495, rowHeight).fill('#fff7ed');

      const textY = currentY + FINE_ROW_PAD;
      doc.fillColor('#000000').font('Helvetica');
      doc.text(formatShortDate(new Date(fine.createdAt)), fineCols.date.x, textY, { width: fineCols.date.w });
      doc.text(fine.targetUserName, fineCols.member.x, textY, { width: fineCols.member.w });
      doc.text(getIssuedByName(fine), fineCols.issuedBy.x, textY, { width: fineCols.issuedBy.w });
      doc.fillColor('#dc2626').font('Helvetica-Bold');
      doc.text(formatCurrency(fine.amount), fineCols.amount.x, textY, { width: fineCols.amount.w });
      doc.fillColor('#000000').font('Helvetica');
      doc.text(reason, fineCols.reason.x, textY, { width: fineCols.reason.w });

      currentY += rowHeight;
    });
  }

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text(
      `Page ${i + 1} of ${pageCount} | Generated on ${formatDate(new Date())} | This is a computer-generated report`,
      50,
      770,
      { align: 'center', width: 495 }
    );
  }
}

/** Same PDF as download — returns Buffer for email attachments. */
export function generateReportPDFBuffer({ group, finance, mealSheet, approvedFines, month }) {
  return new Promise((resolve, reject) => {
    try {
      const { memberStats, totalBazar, totalMeals, mealRate } = computeReportData(group, finance, mealSheet);
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      renderMonthlyReportPdf(doc, {
        group,
        month,
        finance,
        approvedFines: approvedFines || [],
        memberStats,
        totalBazar,
        totalMeals,
        mealRate,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
