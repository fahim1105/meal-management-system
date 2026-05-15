import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Try initializeFirestore with long polling to fix QUIC protocol errors
  // This helps users behind ISPs that block QUIC/UDP
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    });
    console.log('✅ Firebase initialized with long polling');
  } catch (firestoreError) {
    // Fallback to default getFirestore if initializeFirestore fails
    // (e.g., if Firestore was already initialized)
    db = getFirestore(app);
    console.log('✅ Firebase initialized with default settings');
  }
  
  // Set persistence to LOCAL so user stays logged in after page reload
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('✅ Firebase persistence enabled');
    })
    .catch((error) => {
      console.warn('⚠️ Firebase persistence error:', error);
    });
    
} catch (error) {
  console.warn('⚠️ Firebase initialization failed. Using demo mode.', error);
}

export { auth, db };
