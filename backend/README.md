# Mess Manager Backend

Express.js backend API for the Mess Manager application.

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mess-manager
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email
```

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Database Models

### User
- uid (Firebase UID)
- email
- name
- groupId (reference to Group)

### Group
- name
- groupCode (unique 6-character code)
- managerId (Firebase UID)
- members (array of user objects)
- currentMonth

### MealSheet
- groupId
- month (YYYY-MM format)
- days (Map of day -> meal entries)

### Finance
- groupId
- month (YYYY-MM format)
- deposits (array)
- bazarCosts (array)

## API Documentation

All protected routes require Firebase ID token in Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

See main README.md for complete API endpoint documentation.


---

## Deployment to Vercel

### Quick Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### Detailed Instructions
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment guide.

### After Deployment
1. Copy your Vercel deployment URL
2. Set environment variables in Vercel (see `.env.vercel.example`), including:
   - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` — SMTP for emails
   - `CRON_SECRET` — random string; Vercel Cron uses this for bazar reminders
3. Update frontend `.env`:
   ```env
   VITE_API_URL=https://your-backend.vercel.app/api
   ```
4. Redeploy after setting env vars so **Vercel Cron** runs:
   - **10:00 AM Bangladesh** → `GET /api/email/cron/morning-reminder`
   - **6:00 PM Bangladesh** → `GET /api/email/cron/evening-reminder`
5. Test API: `curl https://your-backend.vercel.app/`

### Bazar duty reminder emails
Members whose bazar schedule includes **today** (Bangladesh date) receive two emails:
morning (10:00 AM) and evening (6:00 PM). Only users on duty that day are emailed.

Manual test (replace URL and secret):
```bash
curl -X POST https://your-backend.vercel.app/api/email/trigger-duty-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"timeSlot":"morning"}'
```

---

## Files for Vercel Deployment
- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to ignore during deployment
- `deploy.sh` - Automated deployment script
- `.env.vercel.example` - Environment variables template

---

## Support
For deployment issues, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
