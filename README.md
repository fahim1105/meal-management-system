# Mess Manager - Multi-User Meal Management System

A comprehensive web application for managing group meals, expenses, and finances for shared living spaces.

## Features

- **User Authentication**: Firebase-based authentication with email/password
- **Group Management**: Create or join groups using unique group codes
- **Role-Based Access**: Manager and Member roles with different permissions
- **Meal Tracking**: 30-day meal sheet with breakfast, lunch, and dinner tracking
- **Finance Management**: Track deposits, bazar costs, and automatic calculations
- **Real-time Calculations**: Automatic meal rate and individual cost calculations
- **Manager Transfer**: Transfer manager role to any group member
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS and DaisyUI

## Tech Stack

### Frontend
- React.js
- React Router
- Tailwind CSS + DaisyUI
- Firebase Authentication
- Axios
- React Hot Toast
- date-fns

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Firebase Admin SDK
- CORS

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Firebase Project

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Email/Password authentication
4. Get your web app configuration
5. Generate a service account key for Firebase Admin SDK

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mess-manager
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email
```

Start the backend server:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
# From root directory
npm install
```

Create `.env` file in root directory:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user data

### Group Management
- `POST /api/group/create` - Create new group
- `POST /api/group/join` - Join existing group
- `GET /api/group/my-group` - Get user's group
- `POST /api/group/transfer-manager` - Transfer manager role

### Meal Management
- `GET /api/meal/:month` - Get meal sheet for month
- `POST /api/meal/toggle` - Toggle meal status

### Finance Management
- `GET /api/finance/:month` - Get finance data for month
- `POST /api/finance/deposit` - Add member deposit
- `POST /api/finance/bazar` - Add bazar cost
- `GET /api/finance/summary/:month` - Get financial summary

## Usage

1. **Register**: Create an account with email and password
2. **Create/Join Group**: Either create a new group or join existing one with group code
3. **Manager Functions**:
   - Mark meals for all members
   - Add deposits for members
   - Add bazar costs
   - Transfer manager role
4. **Member Functions**:
   - View meal sheet
   - View personal and group financial summary

## Calculations

- **Total Meals** = Sum of all meals (breakfast + lunch + dinner) for all members
- **Total Bazar** = Sum of all bazar costs
- **Meal Rate** = Total Bazar ÷ Total Meals
- **Individual Cost** = Member's Total Meals × Meal Rate
- **Balance** = Deposit - Individual Cost

## License

MIT
