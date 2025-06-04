
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDU5p5UTmk43ggMP5Ximrf4IjP_-gibSM",
  authDomain: "smartfusion-rag.firebaseapp.com",
  projectId: "smartfusion-rag",
  storageBucket: "smartfusion-rag.firebasestorage.app",
  messagingSenderId: "399921165081",
  appId: "1:399921165081:web:8b6c36453e7cf033bf8b88",
  measurementId: "G-SHXYF8KE3Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);