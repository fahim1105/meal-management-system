import nodemailer from 'nodemailer';

// Check if email is configured
const isEmailConfigured = () => {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Send monthly report email with PDF attachment
export const sendMonthlyReportEmail = async ({ to, name, groupName, month, pdfBuffer }) => {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured');
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const [year, monthNum] = month.split('-');
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 16px; }
        .message { color: #475569; line-height: 1.7; font-size: 15px; }
        .highlight-box { background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px 20px; margin: 24px 0; }
        .highlight-box p { margin: 0; color: #1e40af; font-size: 14px; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Monthly Report</h1>
          <p>${groupName} &mdash; ${monthLabel}</p>
        </div>
        <div class="body">
          <p class="greeting">Dear ${name},</p>
          <p class="message">
            Your monthly financial and meal report for <strong>${monthLabel}</strong> is ready.
            Please find the detailed PDF report attached to this email.
          </p>
          <div class="highlight-box">
            <p>📎 Attachment: <strong>report-${month}.pdf</strong></p>
            <p style="margin-top:8px;">This report includes your meal summary, deposit history, cost breakdown, and balance for the month.</p>
          </div>
          <p class="message">
            If you have any questions about the report, please contact your group manager.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email from <strong>Mess Manager</strong>. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Mess Manager" <${from}>`,
    to,
    subject: `[Mess Manager] Monthly Report – ${monthLabel}`,
    html,
    text: `Dear ${name}, your monthly report for ${monthLabel} is attached. Group: ${groupName}.`,
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'Mess Manager App',
      'List-Unsubscribe': `<mailto:${from}>`,
    },
    attachments: [
      {
        filename: `report-${month}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

// Send bazar duty reminder email
export const sendBazarReminderEmail = async ({ to, name, date, fromDate, toDate, timeSlot }) => {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured');
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const formatDate = (d) => {
    const date = new Date(d);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[date.getUTCMonth()]}`;
  };

  const formattedDate = formatDate(date);
  const formattedFrom = formatDate(fromDate);
  const formattedTo = formatDate(toDate);
  const emoji = timeSlot === 'morning' ? '🌅' : '🌆';
  const timeLabel = timeSlot === 'morning' ? '10:00 AM' : '6:00 PM';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 16px; }
        .message { color: #475569; line-height: 1.7; font-size: 15px; }
        .reminder-badge { display: inline-block; background: #f59e0b; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${emoji} Bazar Duty Reminder</h1>
          <p>${formattedDate} — ${timeLabel} Reminder</p>
        </div>
        <div class="body">
          <p class="greeting">Dear ${name},</p>
          <span class="reminder-badge">🛒 Today is your Bazar Day!</span>
          <p class="message">
            This is a friendly reminder that you have <strong>bazar duty today</strong>.
            Please make sure to buy groceries for the group.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;margin:24px 0;font-family:Arial,sans-serif;font-size:14px;">
            <tr>
              <td width="140" nowrap style="color:#92400e;font-weight:bold;padding:14px 8px 10px 20px;border-bottom:1px solid #fde68a;white-space:nowrap;">📅&nbsp;Today's&nbsp;Date</td>
              <td nowrap style="color:#1e293b;text-align:right;padding:14px 20px 10px 8px;border-bottom:1px solid #fde68a;white-space:nowrap;">${formattedDate}</td>
            </tr>
            <tr>
              <td width="140" nowrap style="color:#92400e;font-weight:bold;padding:10px 8px 10px 20px;border-bottom:1px solid #fde68a;white-space:nowrap;">📆&nbsp;Duty&nbsp;Period</td>
              <td nowrap style="color:#1e293b;text-align:right;padding:10px 20px 10px 8px;border-bottom:1px solid #fde68a;white-space:nowrap;">${formattedFrom}&nbsp;<span style="color:#b45309;">to</span>&nbsp;${formattedTo}</td>
            </tr>
            <tr>
              <td width="140" nowrap style="color:#92400e;font-weight:bold;padding:10px 8px 14px 20px;white-space:nowrap;">⏰&nbsp;Reminder&nbsp;Time</td>
              <td nowrap style="color:#1e293b;text-align:right;padding:10px 20px 14px 8px;font-weight:bold;white-space:nowrap;">${timeLabel}</td>
            </tr>
          </table>
          <p class="message">
            Don't forget to collect money from the manager before going to the market. 
            Keep all receipts for record-keeping.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated reminder from <strong>Mess Manager</strong>. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Mess Manager" <${from}>`,
    to,
    subject: `[Mess Manager] Bazar Duty Reminder – ${formattedDate}`,
    html,
    text: `Dear ${name}, reminder: you have bazar duty today (${formattedDate}). Duty period: ${formattedFrom} to ${formattedTo}.`,
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'Mess Manager App',
    },
  });
};

// Fine request rejected — notify the member who submitted the request
export const sendFineRejectedEmail = async ({
  to,
  requesterName,
  targetName,
  amount,
  reason,
  rejectReason,
  month,
}) => {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured');
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const noteRow = rejectReason
    ? `<tr>
        <td style="padding:12px 16px;color:#991b1b;font-weight:bold;vertical-align:top;">Manager Note</td>
        <td style="padding:12px 16px;color:#1e293b;text-align:right;">${rejectReason}</td>
      </tr>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
      <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Fine Request Rejected</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${month}</p>
        </div>
        <div style="padding:28px 24px;">
          <p style="font-size:16px;color:#1e293b;">Dear ${requesterName},</p>
          <p style="color:#475569;line-height:1.7;">Your fine request was rejected by the manager.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin:20px 0;font-size:14px;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #fecaca;color:#991b1b;font-weight:bold;width:40%;">Member</td>
              <td style="padding:12px 16px;border-bottom:1px solid #fecaca;color:#1e293b;text-align:right;">${targetName}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #fecaca;color:#991b1b;font-weight:bold;">Amount</td>
              <td style="padding:12px 16px;border-bottom:1px solid #fecaca;color:#1e293b;text-align:right;">BDT ${Number(amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #fecaca;color:#991b1b;font-weight:bold;vertical-align:top;">Reason</td>
              <td style="padding:12px 16px;border-bottom:1px solid #fecaca;color:#1e293b;text-align:right;">${reason}</td>
            </tr>
            ${noteRow}
          </table>
          <p style="color:#64748b;font-size:13px;">Fines are separate from meal balance calculations.</p>
        </div>
        <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">Mess Manager — automated email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Mess Manager" <${from}>`,
    to,
    subject: `[Mess Manager] Fine Request Rejected – ${targetName}`,
    html,
    text: `Dear ${requesterName}, your fine request for ${targetName} (BDT ${amount}) was rejected. Reason: ${reason}.${rejectReason ? ` Note: ${rejectReason}` : ''}`,
  });
};

// Fine approved — notify the fined member AND the requester
export const sendFineApprovedEmail = async ({
  toFined,
  finedName,
  toRequester,
  requesterName,
  approvedByManager, // true if manager directly added (no requester)
  amount,
  reason,
  month,
}) => {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured');
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const buildFinedHtml = () => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
      <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ Fine Issued</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${month}</p>
        </div>
        <div style="padding:28px 24px;">
          <p style="font-size:16px;color:#1e293b;">Dear ${finedName},</p>
          <p style="color:#475569;line-height:1.7;">A fine has been issued against you${approvedByManager ? ' by the manager' : ' and approved by the manager'}.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;margin:20px 0;font-size:14px;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #fde68a;color:#92400e;font-weight:bold;width:40%;">Amount</td>
              <td style="padding:12px 16px;border-bottom:1px solid #fde68a;color:#1e293b;text-align:right;font-weight:bold;">BDT ${Number(amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #fde68a;color:#92400e;font-weight:bold;vertical-align:top;">Reason</td>
              <td style="padding:12px 16px;border-bottom:1px solid #fde68a;color:#1e293b;text-align:right;">${reason}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#92400e;font-weight:bold;">Issued by</td>
              <td style="padding:12px 16px;color:#1e293b;text-align:right;">${approvedByManager ? 'Manager' : requesterName}</td>
            </tr>
          </table>
          <p style="color:#64748b;font-size:13px;">This fine is recorded separately from your meal balance.</p>
        </div>
        <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">Mess Manager — automated email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const buildRequesterHtml = () => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
      <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">✅ Fine Request Approved</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${month}</p>
        </div>
        <div style="padding:28px 24px;">
          <p style="font-size:16px;color:#1e293b;">Dear ${requesterName},</p>
          <p style="color:#475569;line-height:1.7;">Your fine request has been <strong>approved</strong> by the manager.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:20px 0;font-size:14px;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #bbf7d0;color:#166534;font-weight:bold;width:40%;">Fined Member</td>
              <td style="padding:12px 16px;border-bottom:1px solid #bbf7d0;color:#1e293b;text-align:right;">${finedName}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #bbf7d0;color:#166534;font-weight:bold;">Amount</td>
              <td style="padding:12px 16px;border-bottom:1px solid #bbf7d0;color:#1e293b;text-align:right;font-weight:bold;">BDT ${Number(amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#166534;font-weight:bold;vertical-align:top;">Reason</td>
              <td style="padding:12px 16px;color:#1e293b;text-align:right;">${reason}</td>
            </tr>
          </table>
        </div>
        <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">Mess Manager — automated email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emails = [];

  // Always email the fined person
  if (toFined) {
    emails.push(
      transporter.sendMail({
        from: `"Mess Manager" <${from}>`,
        to: toFined,
        subject: `[Mess Manager] Fine Issued – BDT ${Number(amount).toFixed(2)}`,
        html: buildFinedHtml(),
        text: `Dear ${finedName}, a fine of BDT ${amount} has been issued against you. Reason: ${reason}.`,
      })
    );
  }

  // Email the requester only if it's a member request (not manager-direct)
  if (!approvedByManager && toRequester && toRequester !== toFined) {
    emails.push(
      transporter.sendMail({
        from: `"Mess Manager" <${from}>`,
        to: toRequester,
        subject: `[Mess Manager] Fine Request Approved – ${finedName}`,
        html: buildRequesterHtml(),
        text: `Dear ${requesterName}, your fine request for ${finedName} (BDT ${amount}) has been approved.`,
      })
    );
  }

  await Promise.allSettled(emails);
};

export { isEmailConfigured };
