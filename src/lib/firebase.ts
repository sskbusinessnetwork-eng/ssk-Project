import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration with placeholders (filled with actual values from firebase-applet-config.json)
const firebaseConfig = {
  apiKey: "AIzaSyCP7o76nlemi-V-yyS9MM3DHwAus-6hmDs",
  authDomain: "gen-lang-client-0868313770.firebaseapp.com",
  projectId: "gen-lang-client-0868313770",
  storageBucket: "gen-lang-client-0868313770.firebasestorage.app",
  messagingSenderId: "864774128269",
  appId: "1:864774128269:web:2eb4823edd48fec77398c4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-35d264fb-61eb-476e-868e-69235285c02a");
export { app };
export default app;
