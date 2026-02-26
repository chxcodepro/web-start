// Firebase 配置和初始化
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Firebase 配置
 */
const firebaseConfig = {
  apiKey: "AIzaSyACYOZdLd6EPbtzC7Ih5P0QxSsWanGQZWU",
  authDomain: "chxpro.firebaseapp.com",
  projectId: "chxpro",
  storageBucket: "chxpro.firebasestorage.app",
  messagingSenderId: "277865065775",
  appId: "1:277865065775:web:ad2214aa3916060a1085da",
  measurementId: "G-SEKTVNDHDT"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 使用新 API 初始化 Firestore，支持多标签页离线持久化
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

export { app, db, auth };
