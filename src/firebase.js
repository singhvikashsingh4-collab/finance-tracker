import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUZc80vDiam0K4HN4KQt4alGEEPJGNqH8",
  authDomain: "finance-tracker-2eeba.firebaseapp.com",
  projectId: "finance-tracker-2eeba",
  storageBucket: "finance-tracker-2eeba.firebasestorage.app",
  messagingSenderId: "894111810041",
  appId: "1:894111810041:web:190d3d421677ebe2c37d28"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
