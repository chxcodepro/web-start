import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  LayoutGrid, 
  Image as ImageIcon,
  Search,
  Zap,
  AlertTriangle,
  Settings,
  Lock,
  LogOut,
  User,
  Loader2,
  Upload,
  Download
} from 'lucide-react';

// --- 1. 引入 Firebase 核心与数据库 ---
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, enableIndexedDbPersistence } from "firebase/firestore";
// --- 2. 引入 Firebase 身份认证 ---
import { 
  getAuth, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

/**
 * --- Firebase 配置（必须替换成你自己的）---
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

/**
 * 默认数据结构
 */
const DEFAULT_SITES = [
  { id: '1', name: 'Bilibili', url: 'https://www.bilibili.com', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/bilibili.png', group: '媒体', pinned: false },
  { id: '2', name: 'Jellyfin', url: 'https://demo.jellyfin.org', innerUrl: 'http://192.168.1.10:8096', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png', group: '媒体', pinned: true },
  { id: '3', name: 'iKuai', url: '', innerUrl: 'http://192.168.1.1', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/ikuai.png', group: '系统', pinned: false },
  { id: '4', name: 'Navidrome', url: 'https://www.navidrome.org', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/navidrome.png', group: '媒体', pinned: false },
  { id: '5', name: 'Ubuntu', url: '', innerUrl: 'ssh://192.168.1.20', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/ubuntu.png', group: '系统', pinned: true },
  { id: '6', name: 'VSCode', url: 'https://vscode.dev', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/visual-studio-code.png', group: '开发', pinned: false },
  { id: '7', name: 'OpenWRT', url: '', innerUrl: 'http://192.168.1.2', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/openwrt.png', group: '系统', pinned: false },
  { id: '8', name: 'Docker', url: 'https://www.docker.com', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png', group: '开发', pinned: false },
];

const DEFAULT_GROUPS = ['媒体', '系统', '开发', '社交'];

const DEFAULT_PAGES = [
  {
    id: 'home',
    name: '首页',
    sites: DEFAULT_SITES,
    groups: DEFAULT_GROUPS
  }
];

const DEFAULT_BG = "https://images.unsplash.com/photo-1531685250784-7569952593d2?q=80&w=2874&auto=format&fit=crop";
const WEB_DAV_STORAGE_KEY = 'my-nav-webdav-config';
const SEARCH_HISTORY_STORAGE_KEY = 'my-nav-search-history';
const SEARCH_ENGINE_STORAGE_KEY = 'my-nav-search-engine';

// 搜索引擎配置
const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q=',
    suggestUrl: 'https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-CN&q=',
  },
  bing: {
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search?q=',
    suggestUrl: 'https://api.bing.com/osjson.aspx?query=',
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    searchUrl: 'https://duckduckgo.com/?q=',
    suggestUrl: 'https://duckduckgo.com/ac/?q=',
  },
};

const DEFAULT_WEB_DAV_CONFIG = {
  url: '',
  username: '',
  password: '',
  filePath: '/my-nav-backup.json',
};
const SINGLE_PAGE_ID = 'home';
const SINGLE_PAGE_NAME = '首页';
const BOOKMARK_UNGROUPED_GROUP = '未分组的书签';

const normalizeWebDavConfig = (config) => ({
  ...DEFAULT_WEB_DAV_CONFIG,
  ...config,
  url: (config?.url || '').trim(),
  username: (config?.username || '').trim(),
  password: config?.password || '',
  filePath: ((config?.filePath || DEFAULT_WEB_DAV_CONFIG.filePath).trim() || DEFAULT_WEB_DAV_CONFIG.filePath),
});

const normalizeSiteName = (site) => {
  const name = (site?.name || '').trim();
  if (name) return name;
  const rawUrl = (site?.url || site?.innerUrl || '').trim();
  if (!rawUrl) return '未命名站点';
  try {
    const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(fullUrl).hostname;
  } catch (e) {
    return rawUrl;
  }
};

const mergePagesToSingle = (rawPages) => {
  const sourcePages = Array.isArray(rawPages) ? rawPages : [];
  const groups = [];
  const groupSet = new Set();
  const usedSiteIds = new Set();
  const sites = [];

  const ensureGroup = (groupName) => {
    const normalized = String(groupName || '').trim() || '默认';
    if (!groupSet.has(normalized)) {
      groupSet.add(normalized);
      groups.push(normalized);
    }
    return normalized;
  };

  sourcePages.forEach((page, pageIndex) => {
    (Array.isArray(page?.groups) ? page.groups : []).forEach(ensureGroup);
    (Array.isArray(page?.sites) ? page.sites : []).forEach((site, siteIndex) => {
      const baseId = String(site?.id || `site-${pageIndex}-${siteIndex}`);
      let finalId = baseId;
      let suffix = 2;
      while (usedSiteIds.has(finalId)) {
        finalId = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedSiteIds.add(finalId);

      sites.push({
        id: finalId,
        name: normalizeSiteName(site),
        url: String(site?.url || ''),
        innerUrl: String(site?.innerUrl || ''),
        logo: String(site?.logo || ''),
        group: ensureGroup(site?.group),
        pinned: !!site?.pinned,
        useFavicon: !!site?.useFavicon,
      });
    });
  });

  if (groups.length === 0) groups.push('默认');

  return {
    id: SINGLE_PAGE_ID,
    name: SINGLE_PAGE_NAME,
    groups,
    sites,
  };
};

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
  const [importModalData, setImportModalData] = useState(null); // 书签导入弹窗数据
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

  const isAdmin = !!user;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); 
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => { if(bgImage) localStorage.setItem('my-nav-bg', bgImage); }, [bgImage]);

  const activePage = useMemo(() => {
    return mergePagesToSingle(pages);
  }, [pages]);

  useEffect(() => {
    if (isLoading || !isAdmin || pages.length <= 1) return;
    savePagesToCloud([activePage], { silent: true }).catch(() => {});
  }, [isLoading, isAdmin, pages, activePage]);

  useEffect(() => {
    const siteIds = new Set((activePage.sites || []).map(s => s.id));
    setSelectedSiteIds(prev => prev.filter(id => siteIds.has(id)));
  }, [activePage]);

  useEffect(() => {
    if (!isBatchMode && selectedSiteIds.length > 0) {
      setSelectedSiteIds([]);
    }
  }, [isBatchMode, selectedSiteIds]);

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
    try { await signOut(auth); alert("已退出管理员模式"); } catch (error) { console.error(error); }
  };

  const savePagesToCloud = async (newPages, options = {}) => {
    const { silent = false } = options;
    if (!isAdmin) {
      const detail = "请先登录管理员账号";
      if (!silent) alert(detail);
      throw new Error(detail);
    }
    const normalizedPages = [mergePagesToSingle(newPages)];
    try { 
      await setDoc(doc(db, "nav_data", "main"), { pages: normalizedPages }, { merge: true }); 
    } catch (e) { 
      const detail = e?.message || "保存失败，请检查登录状态。";
      console.error("保存失败:", e);
      if (!silent) alert(`保存失败：${detail}`);
      throw new Error(detail);
    }
  };

  const saveBgToCloud = async (url) => {
    if (!isAdmin) { alert("请先登录管理员账号"); return; }
    setBgImage(url);
    try {
      await setDoc(doc(db, "nav_data", "main"), { bgImage: url }, { merge: true });
    } catch (e) {
      console.error("保存背景失败:", e);
      alert("背景同步失败，请检查网络。");
    }
  };

  const persistWebDavConfig = (nextConfig, { silent = false } = {}) => {
    const normalized = normalizeWebDavConfig(nextConfig);
    setWebdavConfig(normalized);
    localStorage.setItem(WEB_DAV_STORAGE_KEY, JSON.stringify(normalized));
    if (!silent) alert('WebDAV 配置已保存。');
    return normalized;
  };

  const validateWebDavConfig = (config) => {
    if (!config.url || !config.username || !config.password) {
      alert('请填写 WebDAV 地址、用户名和密码。');
      return false;
    }
    if (!config.filePath) {
      alert('请填写备份文件路径。');
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
    if (!isAdmin) { alert("请先登录管理员账号"); return; }
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
      alert('WebDAV 备份成功。');
    } catch (error) {
      console.error('WebDAV 备份失败:', error);
      const detail = error?.message || '请检查 Vercel API 和 WebDAV 配置。';
      alert(`WebDAV 备份失败：${detail}`);
    }
  };

  const handleWebDavRestore = async (configFromModal) => {
    if (!isAdmin) { alert("请先登录管理员账号"); return; }
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
      alert('WebDAV 恢复成功。');
    } catch (error) {
      console.error('WebDAV 恢复失败:', error);
      const detail = error?.message || '请检查 Vercel API 和 WebDAV 配置。';
      alert(`WebDAV 恢复失败：${detail}`);
    }
  };

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
        alert('没有解析到可导入的书签内容。');
        return;
      }
      // 打开导入弹窗让用户选择目标分组
      setImportModalData(importedData);
    } catch (error) {
      console.error('导入书签失败:', error);
      const detail = error?.message || '请确认书签 HTML 文件格式正确。';
      alert(`导入失败：${detail}`);
    }
  };

  const confirmImportBookmarks = async (targetGroup, createNewGroup) => {
    if (!importModalData) return;
    try {
      let finalGroup = targetGroup;
      // 如果是新建分组
      if (createNewGroup && targetGroup) {
        finalGroup = targetGroup.trim();
        if (!finalGroup) {
          alert('请输入新分组名称');
          return;
        }
      }
      // 将所有站点归入目标分组
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
      alert(`导入成功：新增 ${sitesWithGroup.length} 个站点，归入分组「${finalGroup}」。`);
      setImportModalData(null);
    } catch (error) {
      console.error('导入书签失败:', error);
      alert(`导入失败：${error?.message || '未知错误'}`);
    }
  };

  const updateCurrentPageData = (updater) => {
    const nextPage = updater(activePage);
    const normalizedPage = mergePagesToSingle([nextPage]);
    savePagesToCloud([normalizedPage]).catch(() => {});
  };

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (keyword.length < 1) {
      setSearchSuggestions([]);
      return;
    }

    // 本地历史匹配
    const localMatches = searchHistory
      .filter(item => item.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 4);

    // 先显示本地历史
    setSearchSuggestions(localMatches);

    // 然后请求在线建议（通过Vercel API代理避免CORS）
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(keyword)}&engine=${searchEngine}`);
        if (!response.ok) throw new Error('请求失败');
        const data = await response.json();
        const onlineSuggestions = data.suggestions || [];

        // 合并本地和在线建议，去重
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
        // 失败时保持本地历史
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

  const requestDeleteSite = (id) => {
    setConfirmConfig({
      isOpen: true, message: '确定要删除这个站点吗？',
      action: () => {
        updateCurrentPageData(p => ({ ...p, sites: p.sites.filter(s => s.id !== id) }));
        setConfirmConfig({ isOpen: false, message: '', action: null });
      }
    });
  };

  const addGroup = (name) => {
    const nextName = String(name || '').trim();
    if (!nextName) return false;
    if (activePage.groups.includes(nextName)) {
      alert('分组已存在，请换个名称。');
      return false;
    }
    updateCurrentPageData(p => ({ ...p, groups: [...p.groups, nextName] }));
    return true;
  };

  const renameGroup = (oldName, newName) => {
    const oldKey = String(oldName || '').trim();
    const nextName = String(newName || '').trim();
    if (!oldKey || !nextName) {
      alert('分组名称不能为空。');
      return false;
    }
    if (oldKey === nextName) {
      alert('分组名称未变化。');
      return false;
    }
    if (activePage.groups.some(group => group === nextName && group !== oldKey)) {
      alert('分组已存在，请换个名称。');
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
      <style>{`
        @keyframes marquee-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll-text { animation: marquee-scroll 6s linear infinite; min-width: fit-content; display: flex; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      `}</style>

      <div className={`fixed inset-0 z-0 bg-cover bg-center transition-all duration-700 ${!bgImage ? 'bg-gray-900' : ''}`} style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}} />
      <div className="fixed inset-0 z-0 bg-gray-900/50" />

      {isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
           <div className="px-3 py-0.5 text-xs font-medium backdrop-blur-md rounded-b-lg shadow-lg bg-green-600/90 text-white flex items-center gap-1">
              <User size={10} /> 管理员模式
           </div>
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl pb-32 transition-all duration-300">
        
        <div className="flex flex-col items-center justify-center mb-8 pt-10 md:pt-14">
          <div className="w-full max-w-2xl relative group shadow-2xl">
            <form onSubmit={handleSearch} className="relative w-full flex">
              <select
                value={searchEngine}
                onChange={(e) => changeSearchEngine(e.target.value)}
                className="h-14 pl-4 pr-2 rounded-l-full bg-white/10 border border-r-0 border-white/20 backdrop-blur-xl text-white focus:outline-none appearance-none cursor-pointer text-sm font-medium"
              >
                {Object.entries(SEARCH_ENGINES).map(([key, engine]) => (
                  <option key={key} value={key} className="bg-gray-800">{engine.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => { setIsSearchFocused(false); setActiveSuggestionIndex(-1); }, 120)}
                onKeyDown={handleSearchInputKeyDown}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveSuggestionIndex(-1);
                }}
                placeholder="搜索..."
                className="flex-1 h-14 pl-4 pr-14 rounded-r-full bg-white/10 border border-l-0 border-white/20 backdrop-blur-xl focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all text-white placeholder-white/40 text-lg shadow-inner"
              />
              <button type="submit" className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white transition-colors cursor-pointer z-10">
                <Search size={22} />
              </button>
            </form>
            {isSearchFocused && searchQuery.trim().length >= 1 && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-gray-900/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionSelect(suggestion);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      activeSuggestionIndex === index ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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

        <div className="space-y-4">
          {activePage.groups.map(group => {
            const groupItems = groupedSites[group] || [];
            if (!isAdmin && groupItems.length === 0) return null;
            return (
              <div key={group} className="animate-fade-in">
                <div className="flex items-center justify-between mb-2 pb-0.5 border-b border-white/5">
                  {editingGroupInline === group ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingGroupInlineName}
                        onChange={(e) => setEditingGroupInlineName(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-lg font-bold focus:border-blue-500 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const ok = renameGroup(group, editingGroupInlineName);
                            if (ok) { setEditingGroupInline(null); setEditingGroupInlineName(''); }
                          }
                          if (e.key === 'Escape') { setEditingGroupInline(null); setEditingGroupInlineName(''); }
                        }}
                      />
                      <button onClick={() => { const ok = renameGroup(group, editingGroupInlineName); if (ok) { setEditingGroupInline(null); setEditingGroupInlineName(''); } }} className="p-1 hover:bg-white/10 rounded-md text-green-400 transition" title="保存"><Check size={16} /></button>
                      <button onClick={() => { setEditingGroupInline(null); setEditingGroupInlineName(''); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition" title="取消"><X size={16} /></button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">{group}</h3>
                  )}
                  {isAdmin && editingGroupInline !== group && (
                     <div className="flex gap-1">
                        <button onClick={() => { setEditingGroupInline(group); setEditingGroupInlineName(group); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-blue-400 transition" title="编辑分组名称"><Edit2 size={16} /></button>
                        <button onClick={() => { setEditingSite({ group, pinned: false }); setIsModalOpen(true); }} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-green-400 transition" title="添加站点"><Plus size={16} /></button>
                        <button onClick={() => requestRemoveGroup(group)} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-red-400 transition" title="删除分组"><Trash2 size={16} /></button>
                     </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                  {groupItems.map(site => (
                    <SiteCard key={site.id} site={site} isAdmin={isAdmin} 
                      onEdit={() => { setEditingSite(site); setIsModalOpen(true); }} onDelete={() => requestDeleteSite(site.id)}
                      isBatchMode={isBatchMode} isSelected={selectedSiteIds.includes(site.id)} onToggleSelect={toggleSiteSelection}
                    />
                  ))}
                  {isAdmin && groupItems.length === 0 && (
                     <button onClick={() => { setEditingSite({ group, pinned: false }); setIsModalOpen(true); }} className="h-20 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/20 hover:border-white/20 hover:text-white/50 transition-all hover:bg-white/5">
                       <Plus size={20} />
                       <span className="text-xs mt-1 font-medium">添加</span>
                     </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {groupedSites['Others']?.length > 0 && (
             <div className="animate-fade-in opacity-80">
                 <div className="flex items-center justify-between mb-2 pb-0.5 border-b border-white/5"><h3 className="text-lg font-bold text-white/90">未分类</h3></div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                   {groupedSites['Others'].map(site => (
                      <SiteCard key={site.id} site={site} isAdmin={isAdmin} 
                        onEdit={() => { setEditingSite(site); setIsModalOpen(true); }} onDelete={() => requestDeleteSite(site.id)}
                        isBatchMode={isBatchMode} isSelected={selectedSiteIds.includes(site.id)} onToggleSelect={toggleSiteSelection}
                      />
                   ))}
                </div>
             </div>
          )}
        </div>

        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
          {!isAdmin ? (
            <button onClick={() => setIsLoginModalOpen(true)} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full shadow-lg backdrop-blur-sm flex items-center justify-center transition-all border border-white/10" title="管理员登录">
              <Lock size={20} />
            </button>
          ) : (
            <>
              <button onClick={() => setIsGroupModalOpen(true)} className="w-12 h-12 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="管理分组"><LayoutGrid size={18} /></button>
              <button onClick={() => setIsBgModalOpen(true)} className="w-12 h-12 bg-gray-700/90 hover:bg-gray-600 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="设置背景"><ImageIcon size={18} /></button>
              <button onClick={() => setIsWebDavModalOpen(true)} className="w-12 h-12 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-full shadow-lg shadow-cyan-900/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="WebDAV"><Settings size={18} /></button>
              <button onClick={() => importInputRef.current?.click()} className="w-12 h-12 bg-violet-600/90 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="导入书签"><Upload size={18} /></button>
              <button onClick={() => setIsBatchMode(v => !v)} className={`w-12 h-12 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm ${isBatchMode ? 'bg-amber-600/90 hover:bg-amber-500 shadow-amber-900/40' : 'bg-white/20 hover:bg-white/30 shadow-black/40'}`} title={isBatchMode ? '退出批量' : '批量删除'}><Trash2 size={18} /></button>
              {isBatchMode && (
                <>
                  <button onClick={toggleSelectAllSites} className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title={selectedSiteIds.length === (activePage.sites || []).length && (activePage.sites || []).length > 0 ? '取消全选' : '全选'}><Check size={18} /></button>
                  <button onClick={requestDeleteSelectedSites} disabled={selectedSiteIds.length === 0} className="w-12 h-12 bg-red-600/90 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-900/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title={`删除选中 (${selectedSiteIds.length})`}><Trash2 size={18} /></button>
                </>
              )}
              <button onClick={() => { setEditingSite(null); setIsModalOpen(true); }} className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="添加站点"><Plus size={20} /></button>
              <button onClick={handleLogout} className="w-12 h-12 bg-red-600/80 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-900/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="退出登录"><LogOut size={18} /></button>
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

      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isModalOpen && <SiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={saveSite} initialData={editingSite} groups={activePage.groups} />}
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
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} />
          <div className="relative z-10 bg-gray-900 border border-white/10 rounded-xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
             <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><AlertTriangle size={24} /></div>
                <h3 className="text-lg font-bold text-white">确认操作</h3>
                <p className="text-white/70 text-sm">{confirmConfig.message}</p>
                <div className="flex gap-3 w-full mt-2">
                   <button onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition font-medium">取消</button>
                   <button onClick={confirmConfig.action} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition font-medium shadow-lg shadow-red-900/30">删除</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginModal({ isOpen, onClose }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(getAuth(), provider); onClose(); } 
    catch (err) { 
      console.error(err); 
      if (err.code === 'auth/unauthorized-domain') { 
        setError('登录失败：域名未授权，请在 Firebase 控制台添加当前域名。'); 
      } else { 
        setError('登录失败，请检查网络后重试。'); 
      } 
    } 
    finally { setLoading(false); }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">管理员登录</h2>
        {error && <p className="text-red-400 text-sm text-center mb-4 px-2">{error}</p>}
        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <span className="animate-pulse">登录中...</span> : <><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>使用谷歌账号登录</>}
        </button>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white"><X size={20}/></button>
      </div>
    </div>
  );
}

function SiteCard({ site, isAdmin, onEdit, onDelete, className = "", isBatchMode = false, isSelected = false, onToggleSelect }) {
  const [imgError, setImgError] = useState(false);
  const textContainerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  useEffect(() => { setImgError(false); }, [site.logo]);
  useLayoutEffect(() => { if (textContainerRef.current && textRef.current) { setShouldScroll(textRef.current.scrollWidth > textContainerRef.current.clientWidth + 2); } }, [site.name, className]);
  const mainLink = site.url || site.innerUrl || '#';
  const hasInner = !!site.innerUrl;
  const isInnerOnly = !site.url && site.innerUrl;
  return (
    <div className={`group relative h-20 md:h-20 hover:bg-white/10 rounded-2xl transition-all duration-200 flex items-center px-3 overflow-hidden w-full ${className}`}>
      {!isBatchMode && <a href={mainLink} target="_blank" rel="noreferrer" className="absolute inset-0 z-0" />}
      {isBatchMode && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(site.id); }}
          className={`absolute top-1.5 left-1.5 z-30 w-5 h-5 rounded border flex items-center justify-center transition ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-black/40 border-white/30 text-transparent hover:border-white/60'}`}
          title="选择站点"
        >
          <Check size={12} />
        </button>
      )}
      <div className="relative z-10 w-14 h-14 flex-shrink-0 bg-white/5 rounded-xl p-1.5 flex items-center justify-center shadow-sm pointer-events-none">
        {!imgError && site.logo ? <img src={site.logo} alt={site.name} className="w-full h-full object-contain drop-shadow-sm" onError={() => setImgError(true)} /> : <span className="text-xl font-bold text-white/40">{site.name.charAt(0).toUpperCase()}</span>}
      </div>
      <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center ml-3 overflow-hidden pointer-events-none" ref={textContainerRef}>
        <div className="w-full relative h-6 flex items-center">
           <h4 ref={textRef} className={`text-sm font-semibold text-white/90 truncate tracking-wide text-shadow absolute inset-0 transition-opacity duration-300 ${shouldScroll ? 'group-hover:opacity-0' : ''}`}>{site.name}</h4>
           {shouldScroll && <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute inset-0 flex items-center"><div className="animate-scroll-text"><span className="text-sm font-semibold text-white/90 tracking-wide text-shadow whitespace-nowrap">{site.name}</span><span className="inline-block w-8"></span><span className="text-sm font-semibold text-white/90 tracking-wide text-shadow whitespace-nowrap">{site.name}</span><span className="inline-block w-8"></span></div></div>}
        </div>
      </div>
      {!isBatchMode && !isInnerOnly && hasInner && <a href={site.innerUrl} target="_blank" rel="noreferrer" className="relative z-20 mt-auto ml-auto md:absolute md:bottom-1.5 md:right-1.5 bg-emerald-500/20 hover:bg-emerald-500/90 text-emerald-300 hover:text-white text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 transition-all font-bold shadow-sm opacity-0 group-hover:opacity-100" title={`内网地址: ${site.innerUrl}`} onClick={(e) => e.stopPropagation()}>内</a>}
      {isAdmin && !isBatchMode && <div className="absolute top-1.5 right-1.5 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1 backdrop-blur-md border border-white/10 scale-90 hover:scale-100 pointer-events-auto"><button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-white/70 hover:text-blue-400 rounded-md hover:bg-white/10 transition"><Edit2 size={12} /></button><button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-white/70 hover:text-red-400 rounded-md hover:bg-white/10 transition"><Trash2 size={12} /></button></div>}
    </div>
  );
}

// 辅助函数：计算 favicon URL
const getFaviconUrl = (url) => {
  try {
    // 补全协议，避免 new URL 报错
    const fullUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    const domain = new URL(fullUrl).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch (e) {
    return '';
  }
};

function SiteModal({ isOpen, onClose, onSubmit, initialData, groups }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    logo: '',
    group: groups[0] || '默认',
    pinned: false,
    useFavicon: false,
  });

  useEffect(() => {
    if (initialData) {
      const initialUseFavicon = initialData.useFavicon ?? (initialData.url && initialData.logo === getFaviconUrl(initialData.url));
      // 兼容旧数据：优先用url，没有则用innerUrl
      const mergedUrl = initialData.url || initialData.innerUrl || '';
      setFormData({
        name: initialData.name || '',
        url: mergedUrl,
        logo: initialData.logo || '',
        group: initialData.group || groups[0] || '默认',
        pinned: !!initialData.pinned,
        useFavicon: !!initialUseFavicon,
      });
    } else {
      setFormData({
        name: '',
        url: '',
        logo: '',
        group: groups[0] || '默认',
        pinned: false,
        useFavicon: false,
      });
    }
  }, [initialData, groups]);

  useEffect(() => {
    if (formData.useFavicon && formData.url) {
      const iconUrl = getFaviconUrl(formData.url);
      if (iconUrl) {
        setFormData(prev => (prev.logo !== iconUrl ? { ...prev, logo: iconUrl } : prev));
      }
    }
  }, [formData.useFavicon, formData.url]);

  const handleAutoMatch = () => {
    if (!formData.name) return;
    const slug = formData.name.trim().toLowerCase().replace(/\s+/g, '-');
    const newLogoUrl = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${slug}.png`;
    setFormData(prev => ({ ...prev, logo: newLogoUrl, useFavicon: false }));
  };

  const handleLogoChange = (e) => {
    setFormData({ ...formData, logo: e.target.value, useFavicon: false });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">{initialData ? '编辑站点' : '添加站点'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">名称</label>
              <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="例如: Jellyfin" />
            </div>
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">分组</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none appearance-none" value={formData.group} onChange={e => setFormData({ ...formData, group: e.target.value })}>
                {groups.map(g => <option key={g} value={g} className="bg-gray-800">{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">网址</label>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none font-mono text-sm" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">图标地址</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none text-sm font-mono truncate" value={formData.logo} onChange={handleLogoChange} placeholder="https://..." />
              <button type="button" onClick={handleAutoMatch} className="px-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center justify-center transition" title="根据名称自动获取图标"><Zap size={16} /> <span className="text-xs ml-1 font-bold">自动</span></button>
              <div className="w-11 h-11 bg-white/5 rounded-xl p-1.5 flex items-center justify-center border border-white/10 shrink-0">{formData.logo ? <img src={formData.logo} className="w-full h-full object-contain" alt="预览" onError={(e) => e.target.style.display='none'} /> : <div className="text-xs text-white/20">?</div>}</div>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-white/30">自动匹配使用 homarr-labs 源。</p>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white transition whitespace-nowrap ml-2 select-none">
                <input type="checkbox" checked={formData.useFavicon} onChange={e => setFormData(prev => ({ ...prev, useFavicon: e.target.checked }))} className="rounded border-white/20 bg-white/5 focus:ring-0 text-blue-500" />
                <span>使用站点图标</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 pl-1 cursor-pointer" onClick={() => setFormData({ ...formData, pinned: !formData.pinned })}>
            <div className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${formData.pinned ? 'bg-yellow-500 border-yellow-500' : 'border-white/20 bg-white/5'}`}>
              {formData.pinned && <Check size={14} className="text-black" />}
            </div>
            <span className="text-sm text-white/80 select-none">置顶 (显示在顶部区域)</span>
          </div>
          <div className="pt-6 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition font-medium">取消</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-900/40">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BgModal({ isOpen, onClose, currentBg, onSave }) {
  const [url, setUrl] = useState(currentBg);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">自定义背景</h2>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="图片 URL 地址" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white mb-4 focus:border-blue-500 focus:outline-none" />
        <div className="h-32 w-full rounded-xl bg-cover bg-center mb-6 border border-white/10 shadow-inner" style={{ backgroundImage: `url(${url})` }}></div>
        <div className="flex gap-3">
          <button onClick={() => { onSave(url); onClose(); }} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition">应用</button>
          <button onClick={() => { onSave(DEFAULT_BG); onClose(); }} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition">恢复默认</button>
        </div>
      </div>
    </div>
  );
}

function GroupModal({ isOpen, onClose, groups, onAdd, onRemove, onRename, onMove }) {
  const [newGroup, setNewGroup] = useState('');
  const [editingGroup, setEditingGroup] = useState('');
  const [editingName, setEditingName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);

  const startEditGroup = (name) => {
    setEditingGroup(name);
    setEditingName(name);
  };

  const handleSaveGroupName = () => {
    const ok = onRename(editingGroup, editingName);
    if (!ok) return;
    alert('分组名称已保存。');
    setEditingGroup('');
    setEditingName('');
  };

  const toggleGroupSelection = (groupName) => {
    setSelectedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const toggleSelectAll = () => {
    if (selectedGroups.length === groups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups([...groups]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedGroups.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedGroups.length} 个分组吗？`)) return;
    selectedGroups.forEach(g => onRemove(g));
    setSelectedGroups([]);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">分组管理</h2>
          <button onClick={onClose}><X size={20} className="text-white/50 hover:text-white" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input type="text" value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="新分组名称" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-white focus:border-green-500 focus:outline-none" />
          <button
            onClick={() => {
              const ok = onAdd(newGroup);
              if (!ok) return;
              setNewGroup('');
            }}
            disabled={!newGroup}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white rounded-xl font-medium transition"
          >
            添加
          </button>
        </div>
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-white/60 hover:text-white transition flex items-center gap-1"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${selectedGroups.length === groups.length && groups.length > 0 ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
              {selectedGroups.length === groups.length && groups.length > 0 && <Check size={12} className="text-white" />}
            </div>
            {selectedGroups.length === groups.length && groups.length > 0 ? '取消全选' : '全选'}
          </button>
          {selectedGroups.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1"
            >
              <Trash2 size={12} />
              删除选中 ({selectedGroups.length})
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {groups.map((g, index) => (
            <div key={g} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition">
              {editingGroup === g ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    placeholder="输入新分组名称"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveGroupName} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition">保存名称</button>
                    <button onClick={() => { setEditingGroup(''); setEditingName(''); }} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition">取消</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleGroupSelection(g)}
                      className="w-4 h-4 rounded border flex items-center justify-center transition"
                      style={{
                        backgroundColor: selectedGroups.includes(g) ? '#3b82f6' : 'transparent',
                        borderColor: selectedGroups.includes(g) ? '#3b82f6' : 'rgba(255,255,255,0.3)'
                      }}
                    >
                      {selectedGroups.includes(g) && <Check size={12} className="text-white" />}
                    </button>
                    <span className="text-white font-medium">{g}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onMove(g, 'up')}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30 transition rounded hover:bg-white/5"
                      title="上移"
                    >
                      上移
                    </button>
                    <button
                      onClick={() => onMove(g, 'down')}
                      disabled={index === groups.length - 1}
                      className="px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30 transition rounded hover:bg-white/5"
                      title="下移"
                    >
                      下移
                    </button>
                    <button onClick={() => startEditGroup(g)} className="text-white/40 hover:text-blue-400 p-1.5 transition rounded-lg hover:bg-white/5" title="重命名"><Edit2 size={16} /></button>
                    <button onClick={() => onRemove(g)} className="text-white/30 hover:text-red-400 p-1.5 transition rounded-lg hover:bg-white/5" title="删除"><Trash2 size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImportModal({ isOpen, onClose, importData, existingGroups, onConfirm }) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (isOpen && existingGroups.length > 0) {
      setSelectedGroup(existingGroups[0]);
      setIsNewGroup(false);
      setNewGroupName('');
    }
  }, [isOpen, existingGroups]);

  if (!isOpen || !importData) return null;

  const handleConfirm = () => {
    if (isNewGroup) {
      onConfirm(newGroupName.trim(), true);
    } else {
      onConfirm(selectedGroup, false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-white">导入书签</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={20} /></button>
        </div>

        <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/70 text-sm">
            解析到 <span className="text-blue-400 font-bold">{importData.sites.length}</span> 个书签
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 font-medium mb-2 ml-1">选择目标分组</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isNewGroup}
                  onChange={() => setIsNewGroup(false)}
                  className="text-blue-500"
                />
                <span className="text-white/80 text-sm">选择现有分组</span>
              </label>
              {!isNewGroup && (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none appearance-none"
                >
                  {existingGroups.map(g => (
                    <option key={g} value={g} className="bg-gray-800">{g}</option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input
                  type="radio"
                  checked={isNewGroup}
                  onChange={() => setIsNewGroup(true)}
                  className="text-blue-500"
                />
                <span className="text-white/80 text-sm">新建分组</span>
              </label>
              {isNewGroup && (
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="输入新分组名称"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition font-medium">取消</button>
          <button
            onClick={handleConfirm}
            disabled={isNewGroup && !newGroupName.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition shadow-lg shadow-blue-900/40"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}

function WebDavModal({ isOpen, onClose, initialConfig, onSaveConfig, onBackup, onRestore }) {
  const [formData, setFormData] = useState(DEFAULT_WEB_DAV_CONFIG);
  const [loadingAction, setLoadingAction] = useState('');

  useEffect(() => {
    setFormData(normalizeWebDavConfig(initialConfig));
  }, [initialConfig]);

  const runAction = async (actionName, actionFn) => {
    setLoadingAction(actionName);
    try {
      await actionFn(formData);
    } finally {
      setLoadingAction('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-white">WebDAV 手动备份</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">WebDAV 地址</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://dav.example.com/remote.php/dav/files/用户名"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="用户名"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="密码"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">备份文件路径</label>
            <input
              type="text"
              value={formData.filePath}
              onChange={(e) => setFormData(prev => ({ ...prev, filePath: e.target.value }))}
              placeholder="/my-nav-backup.json"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm font-mono"
            />
            <p className="text-[11px] text-white/40 mt-1 ml-1">会备份并恢复：标签页、分组、站点和背景图。</p>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onSaveConfig(formData)}
            disabled={loadingAction !== ''}
            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white text-sm font-medium transition"
          >
            保存配置
          </button>
          <button
            type="button"
            onClick={() => runAction('backup', onBackup)}
            disabled={loadingAction !== ''}
            className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
          >
            <Upload size={14} />
            {loadingAction === 'backup' ? '备份中...' : '上传备份'}
          </button>
          <button
            type="button"
            onClick={() => runAction('restore', onRestore)}
            disabled={loadingAction !== ''}
            className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            {loadingAction === 'restore' ? '恢复中...' : '从 WebDAV 恢复'}
          </button>
        </div>
      </div>
    </div>
  );
}

