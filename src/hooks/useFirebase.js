import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { DEFAULT_PAGES, DEFAULT_BG } from '../utils/constants';
import { mergePagesToSingle } from '../utils/helpers';

/**
 * Firebase 认证和数据管理 Hook
 * 负责用户认证、页面数据监听、云端保存
 */
export function useFirebase({ showToast }) {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [bgImage, setBgImage] = useState(() => {
    return localStorage.getItem('my-nav-bg') || null;
  });

  const isAdmin = !!user;

  // 用户认证监听
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firebase 数据监听
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'nav_data', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pages) setPages(data.pages);
        if (data.bgImage) setBgImage(data.bgImage); else setBgImage(DEFAULT_BG);
      } else {
        // 文档不存在时只设置本地默认值，不覆盖数据库
        // 防止网络问题导致误判为"首次使用"而清空数据
        setPages(DEFAULT_PAGES);
        setBgImage(DEFAULT_BG);
        setTimeout(() => showToast('云端数据为空或读取失败，显示默认内容', 'error'), 100);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Firebase 监听错误:', error);
      // 网络错误时设置默认值并提示用户
      setPages(DEFAULT_PAGES);
      setBgImage(DEFAULT_BG);
      setIsLoading(false);
      showToast('网络连接失败，显示离线数据', 'error');
    });
    return () => unsubscribe();
  }, [showToast]);

  // 背景图片本地缓存
  useEffect(() => {
    if (bgImage) localStorage.setItem('my-nav-bg', bgImage);
  }, [bgImage]);

  // 云端保存函数
  const savePagesToCloud = async (newPages, options = {}) => {
    const { silent = false } = options;
    if (!isAdmin) {
      const detail = '请先登录管理员账号';
      if (!silent) showToast(detail, 'error');
      throw new Error(detail);
    }
    const normalizedPages = [mergePagesToSingle(newPages)];
    try {
      await setDoc(doc(db, 'nav_data', 'main'), { pages: normalizedPages }, { merge: true });
    } catch (e) {
      const detail = e?.message || '保存失败，请检查登录状态。';
      console.error('保存失败:', e);
      if (!silent) showToast(`保存失败：${detail}`, 'error');
      throw new Error(detail);
    }
  };

  const saveBgToCloud = async (url) => {
    if (!isAdmin) {
      showToast('请先登录管理员账号', 'error');
      return;
    }
    setBgImage(url);
    try {
      await setDoc(doc(db, 'nav_data', 'main'), { bgImage: url }, { merge: true });
    } catch (e) {
      console.error('保存背景失败:', e);
      showToast('背景同步失败，请检查网络', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('已退出管理员模式');
    } catch (error) {
      console.error(error);
    }
  };

  // 获取 API 认证头
  const getApiAuthHeaders = async () => {
    if (!user) throw new Error('请先登录管理员账号。');
    try {
      const idToken = await user.getIdToken(true); // true = 强制刷新 token
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      };
    } catch (e) {
      throw new Error('登录已过期，请重新登录。');
    }
  };

  return {
    pages,
    setPages,
    isLoading,
    authReady,
    user,
    isAdmin,
    bgImage,
    setBgImage,
    savePagesToCloud,
    saveBgToCloud,
    handleLogout,
    getApiAuthHeaders,
  };
}
