import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocFromServer } from 'firebase/firestore';
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuc6lglcx0WuwYhhfiMpYQYZ1hVFyvMWM",
  authDomain: "cric-freak.firebaseapp.com",
  projectId: "cric-freak",
  storageBucket: "cric-freak.firebasestorage.app",
  messagingSenderId: "283943330247",
  appId: "1:283943330247:web:c19f0f075e399d242779e2",
  measurementId: "G-6W30RBGD6N"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the standard initialization for Firestore
export const db = getFirestore(app); 
export const googleProvider = new GoogleAuthProvider();

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.error("Firebase connection error:", error);
  }
}
testConnection();

export { doc, getDoc, setDoc, collection, query, where, onSnapshot, signInWithPopup, signOut, onAuthStateChanged };
