import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDQd184iWHxgn1g-dPrRbupChD8MSXf4Iw",
  authDomain: "sietrendforce.firebaseapp.com",
  projectId: "sietrendforce",
  storageBucket: "sietrendforce.firebasestorage.app",
  messagingSenderId: "21862818172",
  appId: "1:21862818172:web:5c59a03d855b18936ec4f9",
  measurementId: "G-3J3TL6VWC8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
