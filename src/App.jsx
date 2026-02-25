// 主应用组件
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  LayoutGrid,
  Image as ImageIcon,
  Search,
  AlertTriangle,
  Settings,
  Lock,
  LogOut,
  User,
  Loader2,
  Upload,
} from 'lucide-react';

// 拖拽排序库
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

// Firebase
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth } from './firebase';

// 组件
import { SiteCard, SortableSiteCard } from './components/SiteCard';
import {
  LoginModal,
  SiteModal,
  BgModal,
  GroupModal,
  ImportModal,
  WebDavModal,
} from './components/modals';

// 工具函数和常量
import {
  DEFAULT_PAGES,
  DEFAULT_BG,
  WEB_DAV_STORAGE_KEY,
  SEARCH_HISTORY_STORAGE_KEY,
  SEARCH_ENGINE_STORAGE_KEY,
  SEARCH_ENGINES,
  DEFAULT_WEB_DAV_CONFIG,
  SINGLE_PAGE_ID,
  SINGLE_PAGE_NAME,
  BOOKMARK_UNGROUPED_GROUP,
} from './utils/constants';
import { normalizeWebDavConfig, mergePagesToSingle } from './utils/helpers';
import { getFaviconUrl } from './utils/favicon';

// 全局样式
const globalStyles = `
  /* 基础动画 */
  @keyframes marquee-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes fadeInDown { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
  @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInScale { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }
  @keyframes slideDown { 0% { opacity: 0; max-height: 0; transform: translateY(-10px); } 100% { opacity: 1; max-height: 500px; transform: translateY(0); } }
  @keyframes slideInRight { 0% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: translateX(0); } }
  @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); } 50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4); } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes rotateIn { 0% { opacity: 0; transform: rotate(-10deg) scale(0.9); } 100% { opacity: 1; transform: rotate(0) scale(1); } }

  /* 动画类 */
  .animate-scroll-text { animation: marquee-scroll 6s linear infinite; min-width: fit-content; display: flex; }
  .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
  .animate-fade-in-scale { animation: fadeInScale 0.4s ease-out forwards; }
  .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
  .animate-slide-down { animation: slideDown 0.4s ease-out forwards; overflow: hidden; }
  .animate-slide-in-right { animation: slideInRight 0.4s ease-out forwards; }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-rotate-in { animation: rotateIn 0.4s ease-out forwards; }

  /* 卡片效果 */
  .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .card-hover:hover { transform: translateY(-4px) scale(1.02); }
  .btn-press { transition: transform 0.15s ease; }
  .btn-press:active { transform: scale(0.95); }

  /* 延迟动画 */
  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }
  .stagger-5 { animation-delay: 0.25s; }

  /* 滚动条 */
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }

  /* 分组收起/展开 */
  .group-content { transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, padding 0.3s ease; overflow: hidden; }
  .group-content.collapsed { max-height: 0 !important; opacity: 0; padding-top: 0; padding-bottom: 0; }
  .group-content.expanded { max-height: 2000px; opacity: 1; }
  .icon-rotate { transition: transform 0.3s ease; }
  .icon-rotate.rotated { transform: rotate(180deg); }
`;

export default function App() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [bgImage, setBgImage] = useState(() => {
    return localStorage.getItem('my-nav-bg') || null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const [searchEngine, setSearchEngine] = useState(() => {
    try {
      const saved = localStorage.getItem(SEARCH_ENGINE_STORAGE_KEY);
      return saved && SEARCH_ENGINES[saved] ? saved : 'google';
    } catch (e) {
      return 'google';
    }
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    } catch (e) {
      return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', action: null });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [isWebDavModalOpen, setIsWebDavModalOpen] = useState(false);
  const [editingGroupInline, setEditingGroupInline] = useState(null);
  const [editingGroupInlineName, setEditingGroupInlineName] = useState('');
  const [importModalData, setImportModalData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [collapsedGroups, setCollapsedGroups] = useState({});
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
  const importInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [activeDragId, setActiveDragId] = useState(null);

  // Toast 提示函数
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isAdmin = !!user;

  // 用户认证监听
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Firebase 数据监听
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "nav_data", "main"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pages) setPages(data.pages);
        if (data.bgImage) setBgImage(data.bgImage); else setBgImage(DEFAULT_BG);
      } else {
        setDoc(doc(db, "nav_data", "main"), { pages: DEFAULT_PAGES, bgImage: DEFAULT_BG });
        setPages(DEFAULT_PAGES);
        setBgImage(DEFAULT_BG);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase 监听错误:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 背景图片本地缓存
  useEffect(() => { if(bgImage) localStorage.setItem('my-nav-bg', bgImage); }, [bgImage]);

  // 合并页面数据
  const activePage = useMemo(() => {
    return mergePagesToSingle(pages);
  }, [pages]);

  // 多页面合并为单页
  useEffect(() => {
    if (isLoading || !isAdmin || pages.length <= 1) return;
    savePagesToCloud([activePage], { silent: true }).catch(() => {});
  }, [isLoading, isAdmin, pages, activePage]);

  // 清理无效的选中站点
  useEffect(() => {
    const siteIds = new Set((activePage.sites || []).map(s => s.id));
    setSelectedSiteIds(prev => prev.filter(id => siteIds.has(id)));
  }, [activePage]);

  // 退出批量模式时清空选择
  useEffect(() => {
    if (!isBatchMode && selectedSiteIds.length > 0) {
      setSelectedSiteIds([]);
    }
  }, [isBatchMode, selectedSiteIds]);

  // 搜索处理函数
  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = searchQuery.trim();
    if (!keyword) return;
    const nextHistory = [keyword, ...searchHistory.filter(item => item !== keyword)].slice(0, 30);
    setSearchHistory(nextHistory);
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    setSearchSuggestions([]);
    setActiveSuggestionIndex(-1);
    const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.google;
    const url = `${engine.searchUrl}${encodeURIComponent(keyword)}`;
    window.open(url, '_blank');
  };

  const handleSuggestionSelect = (keyword) => {
    setSearchQuery(keyword);
    setIsSearchFocused(false);
    setSearchSuggestions([]);
    setActiveSuggestionIndex(-1);
    const nextHistory = [keyword, ...searchHistory.filter(item => item !== keyword)].slice(0, 30);
    setSearchHistory(nextHistory);
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.google;
    const url = `${engine.searchUrl}${encodeURIComponent(keyword)}`;
    window.open(url, '_blank');
  };

  const changeSearchEngine = (engineKey) => {
    setSearchEngine(engineKey);
    localStorage.setItem(SEARCH_ENGINE_STORAGE_KEY, engineKey);
  };

  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setActiveSuggestionIndex(-1);
      e.currentTarget.blur();
      return;
    }
    if (!isSearchFocused || searchSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
      return;
    }
    if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(searchSuggestions[activeSuggestionIndex]);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); showToast('已退出管理员模式'); } catch (error) { console.error(error); }
  };

  // 云端保存函数
  const savePagesToCloud = async (newPages, options = {}) => {
    const { silent = false } = options;
    if (!isAdmin) {
      const detail = "请先登录管理员账号";
      if (!silent) showToast(detail, 'success');
      throw new Error(detail);
    }
    const normalizedPages = [mergePagesToSingle(newPages)];
    try {
      await setDoc(doc(db, "nav_data", "main"), { pages: normalizedPages }, { merge: true });
    } catch (e) {
      const detail = e?.message || "保存失败，请检查登录状态。";
      console.error("保存失败:", e);
      if (!silent) showToast(`保存失败：${detail}`, 'error');
      throw new Error(detail);
    }
  };

  const saveBgToCloud = async (url) => {
    if (!isAdmin) { showToast('请先登录管理员账号', 'error'); return; }
    setBgImage(url);
    try {
      await setDoc(doc(db, "nav_data", "main"), { bgImage: url }, { merge: true });
    } catch (e) {
      console.error("保存背景失败:", e);
      showToast('背景同步失败，请检查网络', 'error');
    }
  };

  // WebDAV 相关函数
  const persistWebDavConfig = (nextConfig, { silent = false } = {}) => {
    const normalized = normalizeWebDavConfig(nextConfig);
    setWebdavConfig(normalized);
    localStorage.setItem(WEB_DAV_STORAGE_KEY, JSON.stringify(normalized));
    if (!silent) showToast('WebDAV 配置已保存', 'success');
    return normalized;
  };

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

  const getApiAuthHeaders = async () => {
    if (!user) throw new Error('请先登录管理员账号。');
    const idToken = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    };
  };

  const handleWebDavBackup = async (configFromModal) => {
    if (!isAdmin) { showToast('请先登录管理员账号', 'error'); return; }
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

  const handleWebDavRestore = async (configFromModal) => {
    if (!isAdmin) { showToast('请先登录管理员账号', 'error'); return; }
    const config = persistWebDavConfig(configFromModal, { silent: true });
    if (!validateWebDavConfig(config)) return;

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

      const shouldRestore = window.confirm(`将覆盖当前所有数据，是否继续？\n目标文件：${config.filePath}`);
      if (!shouldRestore) return;

      await setDoc(
        doc(db, "nav_data", "main"),
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

  // 书签解析函数
  const parseBookmarkDl = (dlNode) => {
    if (!dlNode) return [];
    const items = [];
    const children = Array.from(dlNode.children || []);

    children.forEach((node) => {
      if (node.tagName !== 'DT') return;

      const folderTitle = node.querySelector(':scope > H3');
      const linkNode = node.querySelector(':scope > A');
      if (folderTitle) {
        let next = node.nextElementSibling;
        while (next && next.tagName === 'P') next = next.nextElementSibling;
        const childDl = (next && next.tagName === 'DL') ? next : node.querySelector(':scope > DL');
        items.push({
          type: 'folder',
          name: folderTitle.textContent?.trim() || '未命名文件夹',
          children: parseBookmarkDl(childDl),
        });
        return;
      }

      if (linkNode) {
        items.push({
          type: 'link',
          name: linkNode.textContent?.trim() || '',
          href: linkNode.getAttribute('HREF') || linkNode.getAttribute('href') || '',
        });
      }
    });

    return items;
  };

  const buildBookmarkImportData = (htmlText) => {
    const parser = new DOMParser();
    const docObj = parser.parseFromString(htmlText, 'text/html');
    const rootDl = docObj.querySelector('DL');
    if (!rootDl) return { groups: [], sites: [] };

    const rootItems = parseBookmarkDl(rootDl);
    const groups = [];
    const groupSet = new Set();
    const sites = [];
    const importSeed = Date.now();

    const ensureGroup = (groupName) => {
      const normalized = (groupName || '').trim() || BOOKMARK_UNGROUPED_GROUP;
      if (!groupSet.has(normalized)) {
        groupSet.add(normalized);
        groups.push(normalized);
      }
      return normalized;
    };

    const pushSite = (item, groupName) => {
      const href = (item.href || '').trim();
      if (!/^https?:\/\//i.test(href)) return;
      let safeName = (item.name || '').trim();
      if (!safeName) {
        try { safeName = new URL(href).hostname; } catch (e) { safeName = href; }
      }
      const finalGroup = ensureGroup(groupName);
      sites.push({
        id: `import-${importSeed}-${sites.length}`,
        name: safeName,
        url: href,
        innerUrl: '',
        logo: getFaviconUrl(href),
        group: finalGroup,
        pinned: false,
        useFavicon: true,
      });
    };

    const walkItems = (items, currentGroup = BOOKMARK_UNGROUPED_GROUP) => {
      items.forEach((item) => {
        if (item.type === 'folder') {
          const nextGroup = ensureGroup(item.name);
          walkItems(item.children || [], nextGroup);
          return;
        }
        if (item.type === 'link') {
          pushSite(item, currentGroup);
        }
      });
    };

    walkItems(rootItems, BOOKMARK_UNGROUPED_GROUP);
    return { groups, sites };
  };

  const handleImportBookmarks = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const htmlText = await file.text();
      const importedData = buildBookmarkImportData(htmlText);
      if (importedData.sites.length === 0) {
        showToast('没有解析到可导入的书签内容', 'error');
        return;
      }
      setImportModalData(importedData);
    } catch (error) {
      console.error('导入书签失败:', error);
      const detail = error?.message || '请确认书签 HTML 文件格式正确。';
      showToast(`导入失败：${detail}`, 'error');
    }
  };

  const confirmImportBookmarks = async (targetGroup, createNewGroup) => {
    if (!importModalData) return;
    try {
      let finalGroup = targetGroup;
      if (createNewGroup && targetGroup) {
        finalGroup = targetGroup.trim();
        if (!finalGroup) {
          showToast('请输入新分组名称', 'error');
          return;
        }
      }
      const sitesWithGroup = importModalData.sites.map(site => ({
        ...site,
        group: finalGroup,
      }));
      const importedPage = {
        id: SINGLE_PAGE_ID,
        name: SINGLE_PAGE_NAME,
        groups: [finalGroup],
        sites: sitesWithGroup,
      };
      const mergedPage = mergePagesToSingle([activePage, importedPage]);
      await savePagesToCloud([mergedPage], { silent: true });
      showToast(`导入成功：新增 ${sitesWithGroup.length} 个站点，归入分组「${finalGroup}」`, 'success');
      setImportModalData(null);
    } catch (error) {
      console.error('导入书签失败:', error);
      showToast(`导入失败：${error?.message || '未知错误'}`, 'error');
    }
  };

  // 页面数据更新函数
  const updateCurrentPageData = (updater) => {
    const nextPage = updater(activePage);
    const normalizedPage = mergePagesToSingle([nextPage]);
    savePagesToCloud([normalizedPage]).catch(() => {});
  };

  // 搜索建议 effect
  useEffect(() => {
    const keyword = searchQuery.trim();
    if (keyword.length < 1) {
      setSearchSuggestions([]);
      return;
    }

    const localMatches = searchHistory
      .filter(item => item.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 4);

    setSearchSuggestions(localMatches);

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(keyword)}&engine=${searchEngine}`);
        if (!response.ok) throw new Error('请求失败');
        const data = await response.json();
        const onlineSuggestions = data.suggestions || [];

        const merged = [...localMatches, ...onlineSuggestions];
        const seen = new Set();
        const unique = merged.filter(item => {
          const key = String(item).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (!cancelled) setSearchSuggestions(unique.slice(0, 8));
      } catch (error) {
        console.log('在线建议获取失败，使用本地历史');
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchHistory, searchEngine]);

  useEffect(() => {
    if (!isSearchFocused || searchSuggestions.length === 0) {
      setActiveSuggestionIndex(-1);
      return;
    }
    setActiveSuggestionIndex((prev) => (prev >= searchSuggestions.length ? 0 : prev));
  }, [isSearchFocused, searchSuggestions]);

  // 站点操作函数
  const saveSite = (siteData) => {
    updateCurrentPageData(p => {
      let newSites;
      if (editingSite && editingSite.id) {
        newSites = p.sites.map(s => s.id === editingSite.id ? { ...siteData, id: editingSite.id } : s);
      } else {
        newSites = [...p.sites, { ...siteData, id: Date.now().toString() }];
      }
      return { ...p, sites: newSites };
    });
    setIsModalOpen(false);
    setEditingSite(null);
  };

  // 批量添加站点
  const saveSitesBatch = (sitesData) => {
    if (!sitesData || sitesData.length === 0) return;
    updateCurrentPageData(p => {
      const newSites = sitesData.map((site, index) => ({
        ...site,
        id: `${Date.now()}-${index}`,
      }));
      return { ...p, sites: [...p.sites, ...newSites] };
    });
    setIsModalOpen(false);
    setEditingSite(null);
    showToast(`成功添加 ${sitesData.length} 个站点`, 'success');
  };

  // 拖拽排序处理
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    updateCurrentPageData(p => {
      const oldIndex = p.sites.findIndex(s => s.id === active.id);
      const newIndex = p.sites.findIndex(s => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return p;

      const newSites = arrayMove(p.sites, oldIndex, newIndex);
      return { ...p, sites: newSites };
    });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const activeDragSite = activeDragId ? activePage.sites.find(s => s.id === activeDragId) : null;

  const requestDeleteSite = (id) => {
    setConfirmConfig({
      isOpen: true, message: '确定要删除这个站点吗？',
      action: () => {
        updateCurrentPageData(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) }));
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  // 分组操作函数
  const addGroup = (name) => {
    const nextName = String(name || '').trim();
    if (!nextName) return false;
    if (activePage.groups.includes(nextName)) {
      showToast('分组已存在，请换个名称', 'error');
      return false;
    }
    updateCurrentPageData(p => ({ ...p, groups: [...p.groups, nextName] }));
    return true;
  };

  const renameGroup = (oldName, newName) => {
    const oldKey = String(oldName || '').trim();
    const nextName = String(newName || '').trim();
    if (!oldKey || !nextName) {
      showToast('分组名称不能为空', 'error');
      return false;
    }
    if (oldKey === nextName) {
      return true;
    }
    if (activePage.groups.some(group => group === nextName && group !== oldKey)) {
      showToast('分组已存在，请换个名称', 'error');
      return false;
    }
    updateCurrentPageData((p) => ({
      ...p,
      groups: p.groups.map(group => (group === oldKey ? nextName : group)),
      sites: p.sites.map(site => (site.group === oldKey ? { ...site, group: nextName } : site)),
    }));
    return true;
  };

  const moveGroup = (groupName, direction) => {
    updateCurrentPageData((p) => {
      const currentIndex = p.groups.indexOf(groupName);
      if (currentIndex < 0) return p;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= p.groups.length) return p;
      const nextGroups = [...p.groups];
      [nextGroups[currentIndex], nextGroups[targetIndex]] = [nextGroups[targetIndex], nextGroups[currentIndex]];
      return { ...p, groups: nextGroups };
    });
  };

  const requestRemoveGroup = (name) => {
    setConfirmConfig({
      isOpen: true, message: `确定要删除分组"${name}"吗？`,
      action: () => {
        updateCurrentPageData(p => ({
          ...p,
          groups: p.groups.filter(g => g !== name),
          sites: p.sites.filter(s => s.group !== name),
        }));
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  // 批量选择函数
  const toggleSiteSelection = (siteId) => {
    setSelectedSiteIds((prev) => {
      if (prev.includes(siteId)) return prev.filter(id => id !== siteId);
      return [...prev, siteId];
    });
  };

  const toggleSelectAllSites = () => {
    const allSiteIds = (activePage.sites || []).map(s => s.id);
    if (allSiteIds.length === 0) return;
    setSelectedSiteIds((prev) => (prev.length === allSiteIds.length ? [] : allSiteIds));
  };

  const requestDeleteSelectedSites = () => {
    if (selectedSiteIds.length === 0) return;
    const selectedSet = new Set(selectedSiteIds);
    setConfirmConfig({
      isOpen: true,
      message: `确定要删除 ${selectedSiteIds.length} 个已选站点吗？`,
      action: () => {
        updateCurrentPageData(p => ({ ...p, sites: p.sites.filter(s => !selectedSet.has(s.id)) }));
        setSelectedSiteIds([]);
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  // 计算属性
  const pinnedSites = useMemo(() => activePage.sites ? activePage.sites.filter(s => s.pinned) : [], [activePage]);
  const groupedSites = useMemo(() => {
    const map = {};
    if (!activePage.groups) return map;
    activePage.groups.forEach(g => map[g] = []);
    activePage.sites.forEach(s => {
      if (!s.pinned) {
        if (activePage.groups.includes(s.group)) { map[s.group].push(s); } else { if (!map['Others']) map['Others'] = []; map['Others'].push(s); }
      }
    });
    return map;
  }, [activePage]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative text-white font-sans selection:bg-purple-500">
        <div className={`fixed inset-0 z-0 bg-cover bg-center ${!bgImage ? 'bg-gray-900' : ''}`} style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}} />
        <div className="fixed inset-0 z-0 bg-gray-900/50 backdrop-blur-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 size={48} className="animate-spin text-blue-400" />
          <p className="text-white/50 text-sm font-medium tracking-widest animate-pulse">正在从云端加载配置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-white relative font-sans selection:bg-purple-500 selection:text-white">
      <style>{globalStyles}</style>

      <div className={`fixed inset-0 z-0 bg-cover bg-center transition-all duration-700 ${!bgImage ? 'bg-gray-900' : ''}`} style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}} />
      <div className="fixed inset-0 z-0 bg-gray-900/50" />

      {isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
          <div className="px-3 py-0.5 text-xs font-medium backdrop-blur-md rounded-b-lg shadow-lg bg-green-600/90 text-white flex items-center gap-1">
            <User size={10} /> 管理员模式
          </div>
        </div>
      )}

      <div className="relative z-10 container mx-auto pl-8 pr-4 md:pl-16 md:pr-6 py-8 max-w-[1600px] pb-40 transition-all duration-300">

        {/* 搜索框区域 */}
        <div className={`flex flex-col items-center justify-center mb-8 pt-10 md:pt-14 relative ${isSearchFocused || isEngineDropdownOpen ? 'z-40' : 'z-20'}`}>
          <div className="w-full max-w-2xl relative group animate-fade-in-up">
            <div className="relative backdrop-blur-xl bg-white/10 rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.3)] hover:border-white/30 transition-all duration-300 hover:scale-[1.01]">
              <form onSubmit={handleSearch} className="relative w-full flex items-center">
                {/* 搜索引擎选择器 */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsEngineDropdownOpen(!isEngineDropdownOpen)}
                    onBlur={() => setTimeout(() => setIsEngineDropdownOpen(false), 150)}
                    className="h-14 pl-5 pr-8 bg-transparent border-r border-white/10 text-white/90 focus:outline-none cursor-pointer text-sm font-medium hover:text-white transition-colors flex items-center gap-2"
                  >
                    {SEARCH_ENGINES[searchEngine]?.name || 'Google'}
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform ${isEngineDropdownOpen ? 'rotate-180' : ''}`}>
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {isEngineDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 z-[70] backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden min-w-[120px] animate-slide-down">
                      {Object.entries(SEARCH_ENGINES).map(([key, engine]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            changeSearchEngine(key);
                            setIsEngineDropdownOpen(false);
                            setTimeout(() => searchInputRef.current?.focus(), 0);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-all flex items-center gap-2 ${
                            searchEngine === key
                              ? 'bg-white/20 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {searchEngine === key && <Check size={14} className="text-cyan-400" />}
                          <span className={searchEngine === key ? '' : 'pl-5'}>{engine.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 搜索输入框 */}
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onClick={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => { setIsSearchFocused(false); setActiveSuggestionIndex(-1); }, 120)}
                  onKeyDown={handleSearchInputKeyDown}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveSuggestionIndex(-1);
                    if (!isSearchFocused) setIsSearchFocused(true);
                  }}
                  placeholder="搜索..."
                  className="flex-1 h-14 px-4 bg-transparent text-white placeholder-white/40 text-lg focus:outline-none"
                />
                <button type="submit" className="pr-5 pl-2 flex items-center text-white/50 hover:text-white transition-colors cursor-pointer">
                  <Search size={22} />
                </button>
              </form>
            </div>
            {/* 搜索建议下拉 */}
            {isSearchFocused && searchQuery.trim().length >= 1 && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 z-[70] backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden animate-slide-down">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionSelect(suggestion);
                    }}
                    className={`w-full text-left px-5 py-3 text-sm transition-all duration-150 flex items-center gap-3 ${
                      activeSuggestionIndex === index
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Search size={14} className="text-white/40" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 搜索遮罩层 */}
        {(isSearchFocused || isEngineDropdownOpen) && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-fade-in"
            onClick={() => {
              setIsSearchFocused(false);
              setIsEngineDropdownOpen(false);
            }}
          />
        )}

        {/* 置顶站点 */}
        {pinnedSites.length > 0 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="flex flex-wrap justify-center gap-1.5">
              {pinnedSites.map(site => (
                <SiteCard key={site.id} site={site} className="w-28 md:w-36 lg:w-40" isAdmin={isAdmin}
                  onEdit={() => { setEditingSite(site); setIsModalOpen(true); }} onDelete={() => requestDeleteSite(site.id)}
                  isBatchMode={isBatchMode} isSelected={selectedSiteIds.includes(site.id)} onToggleSelect={toggleSiteSelection}
                />
              ))}
            </div>
          </div>
        )}

        {/* 分组站点列表 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-4">
            {activePage.groups.map((group, groupIndex) => {
              const groupItems = groupedSites[group] || [];
              if (!isAdmin && groupItems.length === 0) return null;
              const isCollapsed = collapsedGroups[group];
              return (
                <div key={group} className="animate-fade-in-up" style={{ animationDelay: `${groupIndex * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-2 pb-0.5 border-b border-white/5">
                    {editingGroupInline === group ? (
                      <div className="flex items-center gap-2 animate-fade-in-scale">
                        <input
                          type="text"
                          value={editingGroupInlineName}
                          onChange={(e) => setEditingGroupInlineName(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-lg font-bold focus:border-blue-500 focus:outline-none transition-all"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const ok = renameGroup(group, editingGroupInlineName);
                              if (ok) { setEditingGroupInline(null); setEditingGroupInlineName(''); }
                            }
                            if (e.key === 'Escape') { setEditingGroupInline(null); setEditingGroupInlineName(''); }
                          }}
                        />
                        <button onClick={() => { const ok = renameGroup(group, editingGroupInlineName); if (ok) { setEditingGroupInline(null); setEditingGroupInlineName(''); } }} className="p-1 hover:bg-white/10 rounded-md text-green-400 transition btn-press" title="保存"><Check size={16} /></button>
                        <button onClick={() => { setEditingGroupInline(null); setEditingGroupInlineName(''); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition btn-press" title="取消"><X size={16} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                        className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2 hover:text-white transition-colors btn-press"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="currentColor"
                          className={`icon-rotate text-white/40 ${isCollapsed ? '' : 'rotated'}`}
                        >
                          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                        {group}
                        <span className="text-xs text-white/30 font-normal">({groupItems.length})</span>
                      </button>
                    )}
                    {isAdmin && editingGroupInline !== group && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingGroupInline(group); setEditingGroupInlineName(group); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-blue-400 transition btn-press" title="编辑分组名称"><Edit2 size={16} /></button>
                        <button onClick={() => { setEditingSite({ group, pinned: false }); setIsModalOpen(true); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-green-400 transition btn-press" title="添加站点"><Plus size={16} /></button>
                        <button onClick={() => requestRemoveGroup(group)} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-red-400 transition btn-press" title="删除分组"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>
                  <div className={`group-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                    <SortableContext items={groupItems.map(s => s.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1.5">
                        {groupItems.map((site) => (
                          isAdmin && !isBatchMode ? (
                            <SortableSiteCard
                              key={site.id}
                              site={site}
                              isAdmin={isAdmin}
                              onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                              onDelete={() => requestDeleteSite(site.id)}
                              isBatchMode={isBatchMode}
                              isSelected={selectedSiteIds.includes(site.id)}
                              onToggleSelect={toggleSiteSelection}
                            />
                          ) : (
                            <SiteCard
                              key={site.id}
                              site={site}
                              isAdmin={isAdmin}
                              onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                              onDelete={() => requestDeleteSite(site.id)}
                              isBatchMode={isBatchMode}
                              isSelected={selectedSiteIds.includes(site.id)}
                              onToggleSelect={toggleSiteSelection}
                            />
                          )
                        ))}
                        {isAdmin && groupItems.length === 0 && (
                          <button onClick={() => { setEditingSite({ group, pinned: false }); setIsModalOpen(true); }} className="h-20 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/20 hover:border-white/20 hover:text-white/50 transition-all hover:bg-white/5">
                            <Plus size={20} />
                            <span className="text-xs mt-1 font-medium">添加</span>
                          </button>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              );
            })}

            {/* 未分类站点 */}
            {groupedSites['Others']?.length > 0 && (
              <div className="animate-fade-in opacity-80">
                <div className="flex items-center justify-between mb-2 pb-0.5 border-b border-white/5"><h3 className="text-lg font-bold text-white/90">未分类</h3></div>
                <SortableContext items={groupedSites['Others'].map(s => s.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                    {groupedSites['Others'].map(site => (
                      isAdmin && !isBatchMode ? (
                        <SortableSiteCard
                          key={site.id}
                          site={site}
                          isAdmin={isAdmin}
                          onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                          onDelete={() => requestDeleteSite(site.id)}
                          isBatchMode={isBatchMode}
                          isSelected={selectedSiteIds.includes(site.id)}
                          onToggleSelect={toggleSiteSelection}
                        />
                      ) : (
                        <SiteCard
                          key={site.id}
                          site={site}
                          isAdmin={isAdmin}
                          onEdit={() => { setEditingSite(site); setIsModalOpen(true); }}
                          onDelete={() => requestDeleteSite(site.id)}
                          isBatchMode={isBatchMode}
                          isSelected={selectedSiteIds.includes(site.id)}
                          onToggleSelect={toggleSiteSelection}
                        />
                      )
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}
          </div>
          {/* 拖拽预览 */}
          <DragOverlay>
            {activeDragSite ? (
              <div className="opacity-90">
                <SiteCard
                  site={activeDragSite}
                  isAdmin={false}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isBatchMode={false}
                  isSelected={false}
                  onToggleSelect={() => {}}
                  isDragging={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* 浮动操作按钮 */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40 animate-slide-in-right">
          {!isAdmin ? (
            <button onClick={() => setIsLoginModalOpen(true)} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full shadow-lg backdrop-blur-sm flex items-center justify-center transition-all border border-white/10 btn-press animate-float" title="管理员登录">
              <Lock size={20} />
            </button>
          ) : (
            <>
              <button onClick={() => setIsGroupModalOpen(true)} className="w-12 h-12 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="管理分组"><LayoutGrid size={18} /></button>
              <button onClick={() => setIsBgModalOpen(true)} className="w-12 h-12 bg-gray-700/90 hover:bg-gray-600 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="设置背景"><ImageIcon size={18} /></button>
              <button onClick={() => setIsWebDavModalOpen(true)} className="w-12 h-12 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-full shadow-lg shadow-cyan-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="WebDAV"><Settings size={18} /></button>
              <button onClick={() => importInputRef.current?.click()} className="w-12 h-12 bg-violet-600/90 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="导入书签"><Upload size={18} /></button>
              <button onClick={() => setIsBatchMode(v => !v)} className={`w-12 h-12 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press ${isBatchMode ? 'bg-amber-600/90 hover:bg-amber-500 shadow-amber-900/40' : 'bg-white/20 hover:bg-white/30 shadow-black/40'}`} title={isBatchMode ? '退出批量' : '批量删除'}><Trash2 size={18} /></button>
              {isBatchMode && (
                <>
                  <button onClick={toggleSelectAllSites} className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-bounce-in" title={selectedSiteIds.length === (activePage.sites || []).length && (activePage.sites || []).length > 0 ? '取消全选' : '全选'}><Check size={18} /></button>
                  <button onClick={requestDeleteSelectedSites} disabled={selectedSiteIds.length === 0} className="w-12 h-12 bg-red-600/90 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-900/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-bounce-in" title={`删除选中 (${selectedSiteIds.length})`}><Trash2 size={18} /></button>
                </>
              )}
              <button onClick={() => { setEditingSite(null); setIsModalOpen(true); }} className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press animate-pulse-glow" title="添加站点"><Plus size={20} /></button>
              <button onClick={handleLogout} className="w-12 h-12 bg-red-600/80 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-900/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm btn-press" title="退出登录"><LogOut size={18} /></button>
            </>
          )}
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".html,text/html"
          className="hidden"
          onChange={handleImportBookmarks}
        />
      </div>

      {/* 弹窗组件 */}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isModalOpen && <SiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={saveSite} onBatchSubmit={saveSitesBatch} initialData={editingSite} groups={activePage.groups} />}
      {isBgModalOpen && <BgModal isOpen={isBgModalOpen} onClose={() => setIsBgModalOpen(false)} currentBg={bgImage} onSave={saveBgToCloud} />}
      {isGroupModalOpen && (
        <GroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          groups={activePage.groups}
          onAdd={addGroup}
          onRemove={requestRemoveGroup}
          onRename={renameGroup}
          onMove={moveGroup}
          showToast={showToast}
        />
      )}
      {importModalData && (
        <ImportModal
          isOpen={!!importModalData}
          onClose={() => setImportModalData(null)}
          importData={importModalData}
          existingGroups={activePage.groups}
          onConfirm={confirmImportBookmarks}
        />
      )}
      {isWebDavModalOpen && (
        <WebDavModal
          isOpen={isWebDavModalOpen}
          onClose={() => setIsWebDavModalOpen(false)}
          initialConfig={webdavConfig}
          onSaveConfig={persistWebDavConfig}
          onBackup={handleWebDavBackup}
          onRestore={handleWebDavRestore}
        />
      )}

      {/* 确认弹窗 */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeInUp_0.2s_ease-out]" onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} />
          <div className="relative z-10 bg-gray-900 border border-white/10 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-bounce-in">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-bold text-white">确认操作</h3>
              <p className="text-white/70 text-sm">{confirmConfig.message}</p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition font-medium btn-press">取消</button>
                <button onClick={confirmConfig.action} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition font-medium shadow-lg shadow-red-900/30 btn-press">删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-[fadeInDown_0.3s_ease-out]">
          <div className={`px-5 py-3 rounded-2xl backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              : 'bg-red-500/20 border-red-400/30 text-red-300'
          }`}>
            {toast.type === 'success' ? (
              <Check size={18} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={18} className="text-red-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
