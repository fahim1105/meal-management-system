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
2. Update frontend `.env`:
   ```env
   VITE_API_URL=https://your-backend.vercel.app/api
   ```
3. Test API: `curl https://your-backend.vercel.app/`

---

## Files for Vercel Deployment
- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to ignore during deployment
- `deploy.sh` - Automated deployment script
- `.env.vercel.example` - Environment variables template

---

## Support
For deployment issues, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
