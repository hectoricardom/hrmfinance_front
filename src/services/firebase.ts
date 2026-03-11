import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc,updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Base64Decode } from './utils';
// Firebase configuration
// You need to replace these with your actual Firebase project credentials
const firebaseConfig2 = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
};



let frBs = 'eyAiYXBpS2V5IjogIkFJemFTeUJBbGN2WlRMMXRsQ05LRExENEJpTWJhR01iTnhCRjQtTSIsICAiYXV0aERvbWFpbiI6ICJocm0tMTEyOC5maXJlYmFzZWFwcC5jb20iLCAgImRhdGFiYXNlVVJMIjogImh0dHBzOi8vaHJtLTExMjguZmlyZWJhc2Vpby5jb20iLCAgInByb2plY3RJZCI6ICJocm0tMTEyOCIsICAic3RvcmFnZUJ1Y2tldCI6ICJocm0tMTEyOC5hcHBzcG90LmNvbSIsICAibWVzc2FnaW5nU2VuZGVySWQiOiAiMTA0OTI1MDU4NTI0NSIsICAiYXBwSWQiOiAiMToxMDQ5MjUwNTg1MjQ1OndlYjowZGFkMDAyMDI3MjM1MTRjY2M1Mjc0In0='


// Initialize Firebase
const app = initializeApp(JSON.parse(Base64Decode(frBs)));

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app);

// Add additional scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');


export  { getDoc, doc, setDoc, updateDoc  }