import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
// Analytics only loads in browser production environments
// import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase — only if a project is configured
const isFirebaseConfigured =
  firebaseConfig.projectId && firebaseConfig.projectId.length > 0;

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Firestore — for booking requests, CRM, blog posts
export const db = app ? getFirestore(app) : null;

// Auth — for admin dashboard, Woofing & Donation flows
export const auth = app ? getAuth(app) : null;

// Storage — for admin image uploads
export const storage = app ? getStorage(app) : null;

export { isFirebaseConfigured };
