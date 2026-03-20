import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Only initialize Firebase if credentials are properly configured
if (process.env.FIREBASE_PROJECT_ID && 
    process.env.FIREBASE_PRIVATE_KEY && 
    process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') &&
    !process.env.FIREBASE_PRIVATE_KEY.includes('PASTE_YOUR_PRIVATE_KEY_HERE')) {
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.warn('⚠️  Firebase Admin initialization failed:', error.message);
    console.warn('⚠️  Running in demo mode without Firebase authentication');
  }
} else {
  console.warn('⚠️  Firebase Admin credentials not configured');
  console.warn('⚠️  Please set up Firebase Admin SDK in backend/.env');
  console.warn('⚠️  Running in demo mode without authentication');
}

export default admin;
