import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRgBH1Ci87HOkOIRFrrdHSkx6jQh8jgYQ",
  authDomain: "jayby-v2.firebaseapp.com",
  projectId: "jayby-v2",
  storageBucket: "jayby-v2.firebasestorage.app",
  messagingSenderId: "54806463837",
  appId: "1:54806463837:web:6d5345f8f2c618273e54b4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateProfile,
  doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy
};