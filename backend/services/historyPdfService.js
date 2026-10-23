import PDFDocument from 'pdfkit';

const formatCurrency = (amount) => `BDT ${Number(amount).toFixed(2)}`;

const formatDate = (d) => {
  const date = new Date(d);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m - 1]} ${y}`;
};

const THEME = {
  header: '#6366f1', // indigo
  headerDark: '#4f46e5',
  border: '#818cf8',
  section: '#6366f1',
  breakfast: '#3b82f6',
  lunch: '#8b5cf6',
  dinner: '#10b981',
  positive: '#059669',
  negative: '#dc2626',
  muted: '#6b7280',
  rowAlt: '#eef2ff',
};

/**
 * Render personal meal history PDF into an open PDFDocument.
 */
export function renderHistoryPdf(doc, { group, memberName, history }) {
  const activeMonths = history
    .filter((h) => h.inRange)
    .sort((a, b) => b.month.localeCompare(a.month));

  const completedMonths = activeMonths.filter((h) => !h.isCurrentMonth && h.hasData);

  // ── Header banner ──
  doc.rect(0, 0, 595, 100).fill(THEME.header);
  doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold')
    .text('MEAL HISTORY REPORT', 50, 28, { align: 'center', width: 495 });
  doc.fillColor('#e0e7ff').fontSize(11).font('Helvetica')
    .text(`${group.name}  |  All Months`, 50, 62, { align: 'center', width: 495 });
  doc.fillColor('#c7d2fe').fontSize(10)
    .text(`Member: ${memberName}`, 50, 78, { align: 'center', width: 495 });

  // ── Info box ──
  const infoY = 118;
  doc.fillColor('#000000');
  doc.rect(50, infoY, 495, 42).stroke(THEME.border);
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Group Code:', 60, infoY + 14);
  doc.font('Helvetica').text(group.groupCode || '—', 140, infoY + 14);
  doc.font('Helvetica-Bold').text('Generated:', 320, infoY + 14);
  doc.font('Helvetica').text(formatDate(new Date()), 390, infoY + 14);

  let y = infoY + 60;

  // ── Monthly comparison table ──
  doc.fontSize(13).font('Helvetica-Bold').fillColor(THEME.section)
    .text('MONTHLY COMPARISON', 50, y);
  y += 22;

  if (activeMonths.length === 0) {
    doc.fontSize(11).font('Helvetica').fillColor(THEME.muted)
      .text('No history data available yet.', 50, y);
    y += 30;
  } else {
    const cols = [
      { key: 'month',   label: 'Month',   x: 55,  w: 70 },
      { key: 'manager', label: 'Manager', x: 130, w: 90 },
      { key: 'meals',   label: 'Meals',   x: 225, w: 40 },
      { key: 'rate',    label: 'Rate',    x: 270, w: 68 },
      { key: 'deposit', label: 'Deposit', x: 343, w: 68 },
      { key: 'cost',    label: 'Cost',    x: 416, w: 68 },
      { key: 'balance', label: 'Balance', x: 489, w: 56 },
    ];

    const drawTableHeader = () => {
      doc.rect(50, y, 495, 22).fill(THEME.header);
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      cols.forEach((c) => {
        doc.text(c.label, c.x, y + 7, { width: c.w });
      });
      y += 22;
      doc.fillColor('#000000');
    };

    drawTableHeader();

    activeMonths.forEach((row, index) => {
      if (y > 720) {
        doc.addPage();
        y = 50;
        drawTableHeader();
      }

      const rowH = 22;
      if (index % 2 === 0) doc.rect(50, y, 495, rowH).fill(THEME.rowAlt);

      const label = row.isCurrentMonth
        ? `${monthLabel(row.month)}*`
        : monthLabel(row.month);

      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      doc.text(label, cols[0].x, y + 7, { width: cols[0].w });
      doc.text(row.managerName || '—', cols[1].x, y + 7, { width: cols[1].w, ellipsis: true });
      doc.text(String(row.totalMeals), cols[2].x, y + 7, { width: cols[2].w });
      doc.text(formatCurrency(row.mealRate), cols[3].x, y + 7, { width: cols[3].w });
      doc.fillColor(THEME.positive);
      doc.text(formatCurrency(row.deposit), cols[4].x, y + 7, { width: cols[4].w });
      doc.fillColor('#ea580c');
      doc.text(formatCurrency(row.cost), cols[5].x, y + 7, { width: cols[5].w });
      doc.fillColor(row.balance >= 0 ? THEME.positive : THEME.negative).font('Helvetica-Bold');
      doc.text(formatCurrency(row.balance), cols[6].x, y + 7, { width: cols[6].w });
      doc.fillColor('#000000').font('Helvetica');

      y += rowH;
    });

    if (activeMonths.some((h) => h.isCurrentMonth)) {
      y += 8;
      doc.fontSize(8).fillColor(THEME.muted)
        .text('* Running month — figures may change until month ends', 50, y);
      y += 16;
    }
  }

  // ── Overall meal distribution ──
  const totalBreakfast = completedMonths.reduce((s, h) => s + h.breakfast, 0);
  const totalLunch = completedMonths.reduce((s, h) => s + h.lunch, 0);
  const totalDinner = completedMonths.reduce((s, h) => s + h.dinner, 0);
  const mealTotal = totalBreakfast + totalLunch + totalDinner;

  y += 20;
  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  doc.fontSize(13).font('Helvetica-Bold').fillColor(THEME.section)
    .text('OVERALL MEAL DISTRIBUTION', 50, y);
  y += 8;
  doc.fontSize(9).font('Helvetica').fillColor(THEME.muted)
    .text('Completed months combined (excludes running month)', 50, y + 10);
  y += 30;

  if (mealTotal === 0) {
    doc.fontSize(10).fillColor(THEME.muted)
      .text('No completed meal data yet.', 50, y);
    y += 20;
  } else {
    const parts = [
      { name: 'Breakfast', count: totalBreakfast, color: THEME.breakfast },
      { name: 'Lunch', count: totalLunch, color: THEME.lunch },
      { name: 'Dinner', count: totalDinner, color: THEME.dinner },
    ].filter((p) => p.count > 0);

    // Percentage text line
    const pctLine = parts
      .map((p) => `${p.name}: ${((p.count / mealTotal) * 100).toFixed(0)}%`)
      .join('  |  ');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(pctLine, 50, y, {
      width: 495,
      align: 'center',
    });
    y += 28;

    // Horizontal bars
    const barLeft = 50;
    const barWidth = 495;
    const barHeight = 18;

      parts.forEach((p) => {
      const pct = p.count / mealTotal;
      const fillW = Math.max(4, Math.round(barWidth * pct));

      doc.fontSize(9).font('Helvetica').fillColor('#334155')
        .text(`${p.name}  (${p.count} meals)`, barLeft, y);
      y += 14;

      doc.rect(barLeft, y, barWidth, barHeight).fill('#f1f5f9');
      doc.rect(barLeft, y, fillW, barHeight).fill(p.color);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
        .text(`${(pct * 100).toFixed(0)}%`, barLeft + 6, y + 5, {
          width: Math.max(fillW - 8, 30),
        });
      y += barHeight + 14;
    });
  }

  // Gap months note
  const gapMonths = history.filter((h) => h.isGap);
  if (gapMonths.length > 0) {
    y += 16;
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    doc.fontSize(8).fillColor(THEME.muted).font('Helvetica')
      .text(
        `Not in group during: ${gapMonths.map((h) => monthLabel(h.month)).join(', ')}`,
        50,
        y,
        { width: 495 }
      );
  }

  // Footer on every page
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor(THEME.muted).text(
      `Page ${i + 1} of ${pageCount}  |  Generated on ${formatDate(new Date())}  |  Mess Manager`,
      50,
      770,
      { align: 'center', width: 495 }
    );
  }
}

/** Generate history PDF as Buffer (for email / tests). */
export function generateHistoryPDFBuffer({ group, memberName, history }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      renderHistoryPdf(doc, { group, memberName, history });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
