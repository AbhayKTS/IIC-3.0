import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD2g_iNJHkfJE2CvyofCommhw9HazbXEgw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "almadox.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "almadox",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "almadox.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "473982185360",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:473982185360:web:679f5d01889c00707d4d15",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8RBD7FN623",
};

// Initialize Firebase app singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Analytics safely (only supported in browser environments)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics is optional; ignore if blocked by ad-blocker or unsupported
  });
}

export default app;
