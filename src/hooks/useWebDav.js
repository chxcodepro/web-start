import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { WEB_DAV_STORAGE_KEY, DEFAULT_WEB_DAV_CONFIG, DEFAULT_BG } from '../utils/constants';
import { normalizeWebDavConfig, mergePagesToSingle } from '../utils/helpers';

/**
 * WebDAV 备份恢复 Hook
 * 负责 WebDAV 配置管理、备份、恢复功能
 */
export function useWebDav({ isAdmin, activePage, bgImage, setPages, setBgImage, getApiAuthHeaders, showToast }) {
  const [isWebDavModalOpen, setIsWebDavModalOpen] = useState(false);
  const [webdavConfig, setWebdavConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(WEB_DAV_STORAGE_KEY);
      if (!saved) return DEFAULT_WEB_DAV_CONFIG;
      return normalizeWebDavConfig(JSON.parse(saved));
    } catch (e) {
      console.error('读取 WebDAV 配置失败:', e);
      return DEFAULT_WEB_DAV_CONFIG;
    }
  });

  // 保存配置
  const persistWebDavConfig = (nextConfig, { silent = false } = {}) => {
    const normalized = normalizeWebDavConfig(nextConfig);
    setWebdavConfig(normalized);
    localStorage.setItem(WEB_DAV_STORAGE_KEY, JSON.stringify(normalized));
    if (!silent) showToast('WebDAV 配置已保存', 'success');
    return normalized;
  };

  // 验证配置
  const validateWebDavConfig = (config) => {
    if (!config.url || !config.username || !config.password) {
      showToast('请填写 WebDAV 地址、用户名和密码', 'error');
      return false;
    }
    if (!config.filePath) {
      showToast('请填写备份文件路径', 'error');
      return false;
    }
    return true;
  };

  // 备份到 WebDAV
  const handleWebDavBackup = async (configFromModal) => {
    if (!isAdmin) {
      showToast('请先登录管理员账号', 'error');
      return;
    }
    const config = persistWebDavConfig(configFromModal, { silent: true });
    if (!validateWebDavConfig(config)) return;

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pages: [activePage],
      bgImage: bgImage || DEFAULT_BG,
    };

    try {
      const headers = await getApiAuthHeaders();
      const response = await fetch('/api/webdav-backup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ config, backupData }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      showToast('WebDAV 备份成功', 'success');
    } catch (error) {
      console.error('WebDAV 备份失败:', error);
      const detail = error?.message || '请检查 Vercel API 和 WebDAV 配置。';
      showToast(`WebDAV 备份失败：${detail}`, 'error');
    }
  };

  // 从 WebDAV 恢复
  const handleWebDavRestore = async (configFromModal) => {
    if (!isAdmin) {
      showToast('请先登录管理员账号', 'error');
      return;
    }
    const config = persistWebDavConfig(configFromModal, { silent: true });
    if (!validateWebDavConfig(config)) return;

    // 先确认再请求，避免浪费网络资源
    const shouldRestore = window.confirm(`将从 WebDAV 恢复数据并覆盖当前所有内容，是否继续？\n目标文件：${config.filePath}`);
    if (!shouldRestore) return;

    try {
      const headers = await getApiAuthHeaders();
      const response = await fetch('/api/webdav-restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ config }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      const backupData = payload?.backupData;
      const restoredPages = Array.isArray(backupData?.pages) ? [mergePagesToSingle(backupData.pages)] : null;
      const restoredBgImage = typeof backupData?.bgImage === 'string' && backupData.bgImage.trim()
        ? backupData.bgImage
        : DEFAULT_BG;

      if (!restoredPages || restoredPages.length === 0) {
        throw new Error('备份文件格式无效，缺少 pages 数据。');
      }

      await setDoc(
        doc(db, 'nav_data', 'main'),
        { pages: restoredPages, bgImage: restoredBgImage },
        { merge: true }
      );

      setPages(restoredPages);
      setBgImage(restoredBgImage);
      showToast('WebDAV 恢复成功', 'success');
    } catch (error) {
      console.error('WebDAV 恢复失败:', error);
      const detail = error?.message || '请检查 Vercel API 和 WebDAV 配置。';
      showToast(`WebDAV 恢复失败：${detail}`, 'error');
    }
  };

  return {
    isWebDavModalOpen,
    setIsWebDavModalOpen,
    webdavConfig,
    persistWebDavConfig,
    handleWebDavBackup,
    handleWebDavRestore,
  };
}
