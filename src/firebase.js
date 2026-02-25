// Firebase 配置和初始化
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
const db = getFirestore(app);
const auth = getAuth(app);

// 启用离线持久化
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('多标签页同时打开可能导致持久化失败');
    } else if (err.code === 'unimplemented') {
      console.log('当前浏览器不支持持久化');
    }
  });
} catch (e) {
  console.log("持久化初始化错误", e);
}

export { app, db, auth };
