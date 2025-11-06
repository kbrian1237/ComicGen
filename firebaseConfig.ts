import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyDP3G5nFgbMLi1bivIevZfxe5Hjym0c7_E",
  authDomain: "comicgen-c0096.firebaseapp.com",
  projectId: "comicgen-c0096",
  storageBucket: "comicgen-c0096.firebasestorage.app",
  messagingSenderId: "1048254624589",
  appId: "1:1048254624589:web:f15cfc683b2cf6fe13fd04",
  measurementId: "G-B90FZ8QN6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };