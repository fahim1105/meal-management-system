# Requirements Document

## Introduction

This feature adds an email notification system to the Meal Management application. It covers two distinct capabilities:

1. **Monthly Report Email** — The Manager can trigger a bulk email from the Manager Settings page that sends the current month's financial and meal summary PDF report to all active group members.
2. **Bazar Duty Reminder Email** — On each day that a member has bazar duty, the system automatically sends that member two scheduled reminder emails: one at 10:00 AM and one at 6:00 PM, containing their name, the date, and their duty period (from–to dates).

The backend is a Node.js/Express server deployed on Vercel (serverless). PDFKit is already installed and used for report generation. Email delivery will use Nodemailer with an SMTP provider (e.g., Gmail or a transactional SMTP service). Scheduled reminders will use `node-cron` running in a persistent process (separate from the Vercel serverless functions, or via a dedicated cron endpoint triggered by an external scheduler).

---

## Glossary

- **System**: The Meal Management backend API server.
- **Email_Service**: The module responsible for composing and sending emails via SMTP using Nodemailer.
- **PDF_Generator**: The existing PDFKit-based module that produces the monthly report PDF buffer.
- **Scheduler**: The `node-cron`-based module that registers and fires timed jobs for bazar duty reminders.
- **Manager**: The group member whose `uid` matches `Group.managerId`; has elevated permissions.
- **Member**: An entry in `Group.members` with `status: "active"`.
- **BazarSchedule**: The MongoDB document containing duty ranges (`fromDate`, `toDate`) per user per month.
- **Finance**: The MongoDB document containing deposits and bazar costs for a group and month.
- **MealSheet**: The MongoDB document containing per-day meal entries for a group and month.
- **Duty_Period**: The date range `[fromDate, toDate]` assigned to a member in a `BazarSchedule` range entry.
- **Meal_Rate**: Total bazar cost divided by total meals consumed across all members for the month.
- **Report_Month**: The current calendar month in `YYYY-MM` format at the time the report email is triggered.

---

## Requirements

### Requirement 1: Monthly Report Email — Manager Trigger

**User Story:** As a Manager, I want to send the current month's report PDF to all active group members via email with a single button click, so that every member stays informed about the group's financial and meal summary without manually downloading and forwarding the PDF.

#### Acceptance Criteria

1. THE `System` SHALL expose a `POST /api/email/send-monthly-report` endpoint protected by the existing `verifyToken` middleware.
2. WHEN the `POST /api/email/send-monthly-report` endpoint is called, THE `System` SHALL verify that the authenticated user's `uid` matches `Group.managerId` before proceeding.
3. IF the authenticated user's `uid` does not match `Group.managerId`, THEN THE `System` SHALL return HTTP 403 with the message `"Only the manager can send the monthly report"`.
4. WHEN the manager triggers the endpoint, THE `PDF_Generator` SHALL produce a PDF buffer for the current `Report_Month` using the same calculation logic as the existing `GET /api/report/download/:month` route.
5. WHEN the PDF buffer is ready, THE `Email_Service` SHALL send one email per active `Member` in the group, attaching the PDF with filename `report-{YYYY-MM}.pdf`.
6. THE `Email_Service` SHALL set the email subject to `"[Mess Manager] Monthly Report – {YYYY-MM}"`.
7. THE `Email_Service` SHALL include the member's name, group name, and report month in the email body.
8. IF the `Finance` or `MealSheet` document for the current month does not exist, THEN THE `PDF_Generator` SHALL generate the report with zero values rather than returning an error.
9. WHEN all emails have been dispatched, THE `System` SHALL return HTTP 200 with a JSON body containing the count of emails sent and the list of recipient email addresses.
10. IF the `Email_Service` fails to send to one or more recipients, THEN THE `System` SHALL return HTTP 207 (Multi-Status) with a JSON body listing successful and failed recipients.
11. IF the group has no active members with a valid email address, THEN THE `System` SHALL return HTTP 400 with the message `"No active members with valid email addresses found"`.

---

### Requirement 2: Monthly Report Email — Frontend Button

**User Story:** As a Manager, I want a clearly labelled button on the Manager Settings page that sends the monthly report email, so that I can trigger the bulk email without leaving the application.

#### Acceptance Criteria

1. THE `Manager_Settings_Page` SHALL render a button labelled `"Send Monthly Report Email"` that is visible only when the authenticated user is the group manager.
2. WHEN the button is clicked, THE `Manager_Settings_Page` SHALL call `POST /api/email/send-monthly-report` with the Firebase auth token in the `Authorization` header.
3. WHILE the email request is in progress, THE `Manager_Settings_Page` SHALL display a loading indicator on the button and disable further clicks.
4. WHEN the API returns HTTP 200, THE `Manager_Settings_Page` SHALL display a success toast notification stating `"Monthly report sent to {n} members"`.
5. WHEN the API returns HTTP 207, THE `Manager_Settings_Page` SHALL display a warning toast listing the failed recipient email addresses.
6. IF the API returns an error (HTTP 4xx or 5xx), THEN THE `Manager_Settings_Page` SHALL display an error toast with the message returned by the API.

---

### Requirement 3: Bazar Duty Reminder — Scheduled Email

**User Story:** As a group member with bazar duty today, I want to receive two reminder emails (at 10:00 AM and 6:00 PM) on my duty day, so that I do not forget to buy groceries for the group.

#### Acceptance Criteria

1. THE `Scheduler` SHALL register two daily cron jobs: one firing at 10:00 AM (local server time) and one at 6:00 PM (local server time).
2. WHEN a cron job fires, THE `Scheduler` SHALL query all `BazarSchedule` documents to find every range entry where today's date falls within `[fromDate, toDate]` (inclusive).
3. WHEN a matching duty range is found, THE `Email_Service` SHALL send a reminder email to the email address stored in `User.email` for the matching `userId`.
4. THE `Email_Service` SHALL set the reminder email subject to `"[Mess Manager] Bazar Duty Reminder – {date}"` where `{date}` is today's date in `DD MMM YYYY` format.
5. THE `Email_Service` SHALL include the following fields in the reminder email body: member's name, today's date in `DD MMM YYYY` format, duty period start date (`fromDate`) in `DD MMM YYYY` format, and duty period end date (`toDate`) in `DD MMM YYYY` format.
6. IF a `User` document cannot be found for a duty range's `userId`, THEN THE `Scheduler` SHALL log the missing user and skip sending the email for that entry without stopping the job.
7. IF the `Email_Service` fails to send a reminder email, THEN THE `Scheduler` SHALL log the error including the `userId` and continue processing remaining duty entries.
8. WHILE no `BazarSchedule` range entry matches today's date, THE `Scheduler` SHALL complete the job without sending any emails.

---

### Requirement 4: Email Service Configuration

**User Story:** As a developer, I want the email sending capability to be configured via environment variables, so that SMTP credentials are not hardcoded and can be changed per deployment environment.

#### Acceptance Criteria

1. THE `Email_Service` SHALL read SMTP configuration exclusively from the following environment variables: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`.
2. IF any of `EMAIL_HOST`, `EMAIL_USER`, or `EMAIL_PASS` are absent at server startup, THEN THE `System` SHALL log a warning message `"Email service not configured: missing environment variables"` and disable email sending.
3. WHILE email sending is disabled, THE `System` SHALL return HTTP 503 with the message `"Email service is not configured"` when the `POST /api/email/send-monthly-report` endpoint is called.
4. THE `Email_Service` SHALL use `EMAIL_FROM` as the sender address in all outgoing emails; WHERE `EMAIL_FROM` is not set, THE `Email_Service` SHALL fall back to `EMAIL_USER` as the sender address.

---

### Requirement 5: Email Content — Round-Trip and Data Integrity

**User Story:** As a group member, I want the report PDF attached to the email to contain accurate data, so that I can trust the figures without cross-checking the app manually.

#### Acceptance Criteria

1. THE `PDF_Generator` SHALL calculate `Meal_Rate` as `totalBazarCost / totalMeals`; WHERE `totalMeals` equals zero, THE `PDF_Generator` SHALL set `Meal_Rate` to zero.
2. THE `PDF_Generator` SHALL calculate each member's `cost` as `memberTotalMeals × Meal_Rate`, with the last member absorbing any rounding remainder so that the sum of all member costs equals `totalBazarCost`.
3. THE `PDF_Generator` SHALL calculate each member's `balance` as `memberDeposit − memberCost`.
4. FOR ALL valid monthly data sets, the sum of all member balances SHALL equal `totalDeposits − totalBazarCost` (net balance invariant).
5. THE `PDF_Generator` SHALL include the following sections in the PDF: Financial Overview (total bazar cost, total meals, meal rate, total deposits, net balance), Member Details table (name, own meals, guest meals, total meals, deposit, cost, balance), and Bazar History table (date, amount, description).

---

### Requirement 6: Scheduler Lifecycle

**User Story:** As a developer, I want the cron scheduler to start and stop cleanly with the server process, so that there are no orphaned jobs or resource leaks.

#### Acceptance Criteria

1. THE `Scheduler` SHALL start all cron jobs when the Express server process initialises (i.e., when `server.js` is loaded in a non-serverless environment).
2. WHEN the server process receives a `SIGTERM` or `SIGINT` signal, THE `Scheduler` SHALL stop all running cron jobs before the process exits.
3. WHERE the deployment environment is Vercel serverless (i.e., `NODE_ENV === "production"` on Vercel), THE `Scheduler` SHALL NOT register cron jobs; instead, THE `System` SHALL expose a `POST /api/email/trigger-duty-reminders` endpoint that can be called by an external cron service (e.g., Vercel Cron, GitHub Actions, or cron-job.org).
4. WHEN `POST /api/email/trigger-duty-reminders` is called, THE `System` SHALL execute the same duty-reminder logic as the internal cron job and return HTTP 200 with the count of reminder emails sent.
