import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7nGWvYRB7jc4PYN6sQNSCn7j3JOS2R1I",
  authDomain: "job-nexusvision.firebaseapp.com",
  databaseURL: "https://job-nexusvision-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "job-nexusvision",
  storageBucket: "job-nexusvision.firebasestorage.app",
  messagingSenderId: "622716594916",
  appId: "1:622716594916:web:9af4e1aa4df1cfa7b19af1",
  measurementId: "G-76XZPJC2WW"
};

// 既に初期化されている場合は既存のインスタンスを使用
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);