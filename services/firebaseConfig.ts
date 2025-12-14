
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";

// Your web app's Firebase configuration
// These should be in your .env file
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper to check if config is present
export const isFirebaseConfigured = (): boolean => {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

// Re-export Firestore functions for ease of use in services
export { collection, getDocs, setDoc, doc, deleteDoc, writeBatch };
