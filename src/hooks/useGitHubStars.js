import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GITHUB_STARS_STORAGE_KEY, DEFAULT_STARS_CONFIG } from '../utils/constants';
import { syncStarsData, applyGroupAssignments, extractGroups } from '../utils/starsHelpers';

/**
 * GitHub Stars 管理 Hook
 * 负责 Stars 配置、同步、AI 分析等功能
 */
export function useGitHubStars({ user, getApiAuthHeaders, showToast }) {
  const [showStarsPage, setShowStarsPage] = useState(false);
  const [starsEnabled, setStarsEnabled] = useState(() => {
    try {
      return localStorage.getItem(GITHUB_STARS_STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });
  const [starsConfig, setStarsConfig] = useState(DEFAULT_STARS_CONFIG);
  const [starsRepos, setStarsRepos] = useState([]);
  const [starsGroups, setStarsGroups] = useState([]);
  const [starsSyncing, setStarsSyncing] = useState(false);
  const [starsAnalyzing, setStarsAnalyzing] = useState(false);
  const [starsLastSyncAt, setStarsLastSyncAt] = useState(null);
  const [isStarsSettingsOpen, setIsStarsSettingsOpen] = useState(false);

  // 保存到云端
  const saveStarsToCloud = useCallback(async (updates) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'github_stars', user.uid), updates, { merge: true });
    } catch (error) {
      console.error('保存 Stars 数据失败:', error);
      throw error;
    }
  }, [user]);

  // 处理 OAuth 回调 - 检测 URL 中的 code 和 state 参数
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      // 如果没有 code 参数，不是 OAuth 回调
      if (!code) return;

      // 验证 state 防止 CSRF 攻击
      const savedState = sessionStorage.getItem('github-oauth-state');
      if (!savedState || savedState !== state) {
        showToast('OAuth 验证失败，请重新授权', 'error');
        // 清理 URL 参数
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // 检查用户是否已登录
      if (!user) {
        showToast('请先登录再授权 GitHub', 'error');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // 清理 sessionStorage 中的 state
      sessionStorage.removeItem('github-oauth-state');

      try {
        // 用 code 换取 access_token
        const response = await fetch('/api/github-oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        if (!response.ok || !data.accessToken) {
          throw new Error(data.error || '获取 Token 失败');
        }

        // 保存 Token 到云端
        await saveStarsToCloud({
          github: {
            accessToken: data.accessToken,
            login: data.user?.login,
            avatarUrl: data.user?.avatarUrl,
          },
        });

        setStarsConfig(prev => ({
          ...prev,
          github: {
            accessToken: data.accessToken,
            login: data.user?.login,
            avatarUrl: data.user?.avatarUrl,
          },
        }));

        showToast(`GitHub 授权成功：${data.user?.login || '已连接'}`, 'success');
      } catch (error) {
        console.error('OAuth 回调处理失败:', error);
        showToast(`授权失败：${error?.message || '未知错误'}`, 'error');
      } finally {
        // 清理 URL 参数
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    // 只在组件挂载时检查一次
    handleOAuthCallback();
  }, [showToast, saveStarsToCloud, user]);

  // GitHub Stars 数据监听
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'github_stars', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // 合并为一次更新，避免连续 setState 导致状态不一致
          if (data.github || data.aiConfig) {
            setStarsConfig(prev => ({
              ...prev,
              ...(data.github && { github: data.github }),
              ...(data.aiConfig && { aiConfig: data.aiConfig }),
            }));
          }
          if (data.repos) setStarsRepos(data.repos);
          if (data.groups) setStarsGroups(data.groups);
          if (data.lastSyncAt) setStarsLastSyncAt(data.lastSyncAt.toDate?.() || data.lastSyncAt);
        }
      },
      (error) => {
        console.error('Stars 数据监听错误:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 保存 Stars 功能开关
  useEffect(() => {
    try {
      localStorage.setItem(GITHUB_STARS_STORAGE_KEY, String(starsEnabled));
    } catch (e) {
      // 忽略
    }
  }, [starsEnabled]);

  // 测试 GitHub Token
  const handleTestGitHubToken = async (token) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Token 无效');
      }
      const userData = await response.json();
      return {
        success: true,
        user: {
          login: userData.login,
          avatar_url: userData.avatar_url,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message || '验证失败',
      };
    }
  };

  // 开始 OAuth 授权
  const handleStartOAuth = async () => {
    try {
      const response = await fetch(`/api/github-oauth-url?redirect_uri=${encodeURIComponent(window.location.origin + '/oauth-callback')}`);
      const data = await response.json();
      if (data.authUrl) {
        sessionStorage.setItem('github-oauth-state', data.state);
        window.location.href = data.authUrl;
      }
    } catch (error) {
      showToast('获取授权链接失败', 'error');
    }
  };

  // 保存 Stars 配置
  const handleSaveStarsConfig = async (config) => {
    setStarsConfig(config);
    setStarsEnabled(true);
    try {
      await saveStarsToCloud({
        github: config.github,
        aiConfig: config.aiConfig,
      });
      showToast('Stars 配置已保存', 'success');
    } catch (error) {
      showToast('保存配置失败', 'error');
    }
  };

  // 同步 Stars
  const handleSyncStars = async () => {
    if (!starsConfig.github?.accessToken) {
      showToast('请先配置 GitHub Token', 'error');
      return;
    }

    setStarsSyncing(true);
    try {
      const headers = await getApiAuthHeaders();
      const response = await fetch('/api/github-stars', {
        method: 'POST',
        headers,
        body: JSON.stringify({ githubToken: starsConfig.github.accessToken }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || '同步失败');
      }

      // 增量同步
      const { repos: syncedRepos, stats } = syncStarsData(payload.repos, starsRepos);
      const newGroups = extractGroups(syncedRepos);

      await saveStarsToCloud({
        repos: syncedRepos,
        groups: newGroups,
        lastSyncAt: new Date(),
      });

      setStarsRepos(syncedRepos);
      setStarsGroups(newGroups);
      setStarsLastSyncAt(new Date());

      showToast(`同步完成：新增 ${stats.added}，移除 ${stats.removed}`, 'success');
    } catch (error) {
      console.error('同步 Stars 失败:', error);
      showToast(`同步失败：${error?.message || '未知错误'}`, 'error');
    } finally {
      setStarsSyncing(false);
    }
  };

  // AI 分析
  const handleAIAnalyze = async () => {
    if (!starsConfig.aiConfig?.apiKey) {
      showToast('请先配置 AI API Key', 'error');
      return;
    }

    const ungroupedRepos = starsRepos.filter(r => !r.group);
    if (ungroupedRepos.length === 0) {
      showToast('所有仓库已分组', 'success');
      return;
    }

    setStarsAnalyzing(true);
    try {
      const headers = await getApiAuthHeaders();
      const response = await fetch('/api/ai-analyze-repos', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repos: ungroupedRepos,
          provider: starsConfig.aiConfig.provider,
          apiKey: starsConfig.aiConfig.apiKey,
          customEndpoint: starsConfig.aiConfig.customEndpoint,
          customModel: starsConfig.aiConfig.customModel,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'AI 分析失败');
      }

      // 应用分组结果
      const updatedRepos = applyGroupAssignments(starsRepos, payload.assignments);
      const allGroups = [...new Set([...starsGroups, ...payload.groups])];

      await saveStarsToCloud({
        repos: updatedRepos,
        groups: allGroups,
      });

      setStarsRepos(updatedRepos);
      setStarsGroups(allGroups);

      showToast(`AI 分组完成：分析了 ${payload.analyzed} 个仓库`, 'success');
    } catch (error) {
      console.error('AI 分析失败:', error);
      showToast(`AI 分析失败：${error?.message || '未知错误'}`, 'error');
    } finally {
      setStarsAnalyzing(false);
    }
  };

  // 更新单个仓库
  const handleUpdateStarsRepo = async (repoId, updates) => {
    const updatedRepos = starsRepos.map(r =>
      r.id === repoId ? { ...r, ...updates } : r
    );
    const newGroups = extractGroups(updatedRepos);

    setStarsRepos(updatedRepos);
    setStarsGroups(newGroups);

    try {
      await saveStarsToCloud({
        repos: updatedRepos,
        groups: newGroups,
      });
    } catch (error) {
      console.error('更新仓库失败:', error);
      showToast('更新失败', 'error');
    }
  };

  return {
    showStarsPage,
    setShowStarsPage,
    starsEnabled,
    setStarsEnabled,
    starsConfig,
    starsRepos,
    starsGroups,
    starsSyncing,
    starsAnalyzing,
    starsLastSyncAt,
    isStarsSettingsOpen,
    setIsStarsSettingsOpen,
    handleTestGitHubToken,
    handleStartOAuth,
    handleSaveStarsConfig,
    handleSyncStars,
    handleAIAnalyze,
    handleUpdateStarsRepo,
  };
}
