import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Globe, 
  LayoutGrid, 
  Image as ImageIcon,
  Pin,
  Search,
  Zap,
  AlertTriangle,
  Menu,
  Home,
  FileText,
  Settings,
  ArrowRight,
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
import { getFunctions, httpsCallable } from "firebase/functions";
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
const cloudFunctions = getFunctions(app);
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
const DEFAULT_WEB_DAV_CONFIG = {
  url: '',
  username: '',
  password: '',
  filePath: '/my-nav-backup.json',
};

const normalizeWebDavConfig = (config) => ({
  ...DEFAULT_WEB_DAV_CONFIG,
  ...config,
  url: (config?.url || '').trim(),
  username: (config?.username || '').trim(),
  password: config?.password || '',
  filePath: ((config?.filePath || DEFAULT_WEB_DAV_CONFIG.filePath).trim() || DEFAULT_WEB_DAV_CONFIG.filePath),
});

export default function App() {
  const [pages, setPages] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [user, setUser] = useState(null); 
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [activePageId, setActivePageId] = useState(() => {
    return localStorage.getItem('my-nav-active-page') || 'home';
  });
  
  const [bgImage, setBgImage] = useState(() => {
    return localStorage.getItem('my-nav-bg') || null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null); 
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null); 
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', action: null });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
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
        setIsDbConnected(true);
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

  useEffect(() => { localStorage.setItem('my-nav-active-page', activePageId); }, [activePageId]);
  useEffect(() => { if(bgImage) localStorage.setItem('my-nav-bg', bgImage); }, [bgImage]);
  
  useEffect(() => {
    if (!isLoading && pages.length > 0 && !pages.find(p => p.id === activePageId)) {
      setActivePageId(pages[0].id);
    }
  }, [pages, activePageId, isLoading]);

  const activePage = useMemo(() => {
    if (pages.length === 0) return { name: '', groups: [], sites: [] };
    return pages.find(p => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  useEffect(() => {
    setIsBatchMode(false);
    setSelectedSiteIds([]);
  }, [activePageId]);

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
    if (!searchQuery.trim()) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    try { await signOut(auth); alert("已退出管理员模式"); } catch (error) { console.error(error); }
  };

  const savePagesToCloud = async (newPages) => {
    if (!isAdmin) { alert("请先登录管理员账号"); return; }
    try { 
      await setDoc(doc(db, "nav_data", "main"), { pages: newPages }, { merge: true }); 
    } catch (e) { 
      console.error("保存失败:", e); alert("保存失败，请检查登录状态。"); 
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

  const handleWebDavBackup = async (configFromModal) => {
    if (!isAdmin) { alert("请先登录管理员账号"); return; }
    const config = persistWebDavConfig(configFromModal, { silent: true });
    if (!validateWebDavConfig(config)) return;

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pages,
      bgImage: bgImage || DEFAULT_BG,
    };

    try {
      const backupCallable = httpsCallable(cloudFunctions, 'webdavBackup');
      await backupCallable({ config, backupData });
      alert('WebDAV 备份成功。');
    } catch (error) {
      console.error('WebDAV 备份失败:', error);
      const detail = error?.message || '请检查 Firebase 函数部署状态和 WebDAV 配置。';
      alert(`WebDAV 备份失败：${detail}`);
    }
  };

  const handleWebDavRestore = async (configFromModal) => {
    if (!isAdmin) { alert("请先登录管理员账号"); return; }
    const config = persistWebDavConfig(configFromModal, { silent: true });
    if (!validateWebDavConfig(config)) return;

    try {
      const restoreCallable = httpsCallable(cloudFunctions, 'webdavRestore');
      const result = await restoreCallable({ config });
      const backupData = result?.data?.backupData;
      const restoredPages = Array.isArray(backupData?.pages) ? backupData.pages : null;
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
      if (restoredPages[0]?.id) setActivePageId(restoredPages[0].id);
      alert('WebDAV 恢复成功。');
    } catch (error) {
      console.error('WebDAV 恢复失败:', error);
      const detail = error?.message || '请检查 Firebase 函数部署状态和 WebDAV 配置。';
      alert(`WebDAV 恢复失败：${detail}`);
    }
  };

  const getUniquePageName = (baseName, usedNames) => {
    const seed = (baseName || '').trim() || '导入页面';
    if (!usedNames.has(seed)) {
      usedNames.add(seed);
      return seed;
    }
    let suffix = 2;
    while (usedNames.has(`${seed}(${suffix})`)) suffix += 1;
    const finalName = `${seed}(${suffix})`;
    usedNames.add(finalName);
    return finalName;
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

  const buildPagesFromBookmarkHtml = (htmlText) => {
    const parser = new DOMParser();
    const docObj = parser.parseFromString(htmlText, 'text/html');
    const rootDl = docObj.querySelector('DL');
    if (!rootDl) return [];

    const rootItems = parseBookmarkDl(rootDl);
    const rootFolders = rootItems.filter(item => item.type === 'folder');
    const pageFolders = (
      rootFolders.length === 1 &&
      rootFolders[0].children?.some(child => child.type === 'folder')
    )
      ? rootFolders[0].children.filter(child => child.type === 'folder')
      : rootFolders;

    const usedNames = new Set((pages || []).map(p => p.name));
    const importedPages = [];

    pageFolders.forEach((pageFolder, pageIndex) => {
      const groups = [];
      const groupSet = new Set();
      const sites = [];

      const ensureGroup = (groupName) => {
        const normalized = (groupName || '').trim() || '默认';
        if (!groupSet.has(normalized)) {
          groupSet.add(normalized);
          groups.push(normalized);
        }
        return normalized;
      };

      const walkItems = (items, currentGroup = '默认') => {
        items.forEach((item) => {
          if (item.type === 'folder') {
            const nextGroup = ensureGroup(item.name);
            walkItems(item.children || [], nextGroup);
            return;
          }

          if (item.type === 'link') {
            const href = (item.href || '').trim();
            if (!/^https?:\/\//i.test(href)) return;
            let safeName = (item.name || '').trim();
            if (!safeName) {
              try { safeName = new URL(href).hostname; } catch (e) { safeName = href; }
            }
            sites.push({
              id: `import-${Date.now()}-${pageIndex}-${sites.length}`,
              name: safeName,
              url: href,
              innerUrl: '',
              logo: getFaviconUrl(href),
              group: ensureGroup(currentGroup),
              pinned: false,
              useFavicon: true,
            });
          }
        });
      };

      walkItems(pageFolder.children || [], '默认');
      if (sites.length === 0) return;

      importedPages.push({
        id: `page-${Date.now()}-${pageIndex}-${Math.random().toString(36).slice(2, 8)}`,
        name: getUniquePageName(pageFolder.name, usedNames),
        sites,
        groups: groups.length > 0 ? groups : ['默认'],
      });
    });

    return importedPages;
  };

  const handleImportBookmarks = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const htmlText = await file.text();
      const importedPages = buildPagesFromBookmarkHtml(htmlText);
      if (importedPages.length === 0) {
        alert('没有解析到可导入的书签内容。');
        return;
      }
      const mergedPages = [...pages, ...importedPages];
      await savePagesToCloud(mergedPages);
      setActivePageId(importedPages[0].id);
      alert(`导入成功：新增 ${importedPages.length} 个页面。`);
    } catch (error) {
      console.error('导入书签失败:', error);
      alert('导入失败，请确认书签 HTML 文件格式正确。');
    }
  };

  const addPage = (name) => {
    const newPage = { id: Date.now().toString(), name: name || '新页面', sites: [], groups: ['默认'] };
    const newPages = [...pages, newPage];
    savePagesToCloud(newPages);
    setActivePageId(newPage.id);
    setEditingPage(null);
  };
  const updatePageName = (id, newName) => {
    const newPages = pages.map(p => p.id === id ? { ...p, name: newName } : p);
    savePagesToCloud(newPages);
    setEditingPage(null);
  };
  const deletePage = (id) => {
    if (pages.length <= 1) { alert("至少保留一个页面"); return; }
    setConfirmConfig({
      isOpen: true, message: '确定要删除这个页面吗？',
      action: () => {
        const newPages = pages.filter(p => p.id !== id);
        savePagesToCloud(newPages);
        if (activePageId === id) setActivePageId(newPages[0].id);
        setConfirmConfig({ isOpen: false, message: '', action: null });
        setEditingPage(null);
      }
    });
  };

  const updateCurrentPageData = (updater) => {
    const targetId = activePage.id; 
    const newPages = pages.map(p => { if (p.id === targetId) return updater(p); return p; });
    savePagesToCloud(newPages);
  };

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
    if (!name) return;
    updateCurrentPageData(p => { if (p.groups.includes(name)) return p; return { ...p, groups: [...p.groups, name] }; });
  };

  const requestRemoveGroup = (name) => {
    setConfirmConfig({
      isOpen: true, message: `确定要删除分组“${name}”吗？`,
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

  const showSidebarTrigger = isAdmin || pages.length > 1;

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

      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} pages={pages} activePageId={activePageId} setActivePageId={setActivePageId}
        enableAdmin={isAdmin} onAddPage={addPage} onRenamePage={updatePageName} onDeletePage={deletePage}
        setEditingPage={setEditingPage} editingPage={editingPage} showTrigger={showSidebarTrigger}
      />

      <div className={`relative z-10 container mx-auto px-4 py-8 max-w-6xl pb-32 transition-all duration-300 ${isSidebarOpen ? 'pl-4 md:pl-4' : ''}`}>
        
        <div className="flex flex-col items-center justify-center mb-8 pt-10 md:pt-14">
          <div className="w-full max-w-2xl relative group shadow-2xl">
            <form onSubmit={handleSearch} className="relative w-full">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="输入关键词后回车搜索..." className="w-full h-14 pl-6 pr-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all text-white placeholder-white/40 text-lg shadow-inner" />
              <button type="submit" className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white transition-colors cursor-pointer z-10">
                <Search size={22} />
              </button>
            </form>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWebDavModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-sm font-medium transition flex items-center gap-1.5"
            >
              <Settings size={14} />
              WebDAV
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-sm font-medium transition flex items-center gap-1.5"
            >
              <Upload size={14} />
              导入书签
            </button>
            <button
              type="button"
              onClick={() => setIsBatchMode(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${isBatchMode ? 'bg-amber-600/80 hover:bg-amber-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white/90'}`}
            >
              {isBatchMode ? '退出批量' : '批量删除'}
            </button>
            {isBatchMode && (
              <>
                <button
                  type="button"
                  onClick={toggleSelectAllSites}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
                >
                  {selectedSiteIds.length === (activePage.sites || []).length && (activePage.sites || []).length > 0 ? '取消全选' : '全选'}
                </button>
                <button
                  type="button"
                  onClick={requestDeleteSelectedSites}
                  disabled={selectedSiteIds.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white text-sm font-medium transition"
                >
                  删除选中 ({selectedSiteIds.length})
                </button>
              </>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept=".html,text/html"
              className="hidden"
              onChange={handleImportBookmarks}
            />
          </div>
        )}

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
                  <h3 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">{group}</h3>
                  {isAdmin && (
                     <div className="flex gap-1">
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
              <button onClick={() => setIsGroupModalOpen(true)} className="w-11 h-11 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="管理分组"><LayoutGrid size={18} /></button>
              <button onClick={() => setIsBgModalOpen(true)} className="w-11 h-11 bg-gray-700/90 hover:bg-gray-600 text-white rounded-full shadow-lg shadow-black/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm" title="设置背景"><ImageIcon size={18} /></button>
              <button onClick={() => { setEditingSite(null); setIsModalOpen(true); }} className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl shadow-blue-900/50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm ring-4 ring-black/10" title="添加站点"><Plus size={28} /></button>
              <button onClick={handleLogout} className="w-11 h-11 bg-red-600/80 hover:bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm mt-2" title="退出登录"><LogOut size={18} /></button>
            </>
          )}
        </div>
      </div>

      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isModalOpen && <SiteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={saveSite} initialData={editingSite} groups={activePage.groups} />}
      {isBgModalOpen && <BgModal isOpen={isBgModalOpen} onClose={() => setIsBgModalOpen(false)} currentBg={bgImage} onSave={saveBgToCloud} />}
      {isGroupModalOpen && <GroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} groups={activePage.groups} onAdd={addGroup} onRemove={requestRemoveGroup} />}
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

function Sidebar({ isOpen, setIsOpen, pages, activePageId, setActivePageId, enableAdmin, onAddPage, onRenamePage, onDeletePage, setEditingPage, editingPage, showTrigger }) {
  const [newPageName, setNewPageName] = useState('');
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (editingPage && inputRef.current) { setEditingName(editingPage.name); inputRef.current.focus(); } }, [editingPage]);
  useEffect(() => { const handleClickOutside = (e) => { if (isOpen && !e.target.closest('.sidebar-container') && !e.target.closest('.sidebar-trigger')) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isOpen, setIsOpen]);
  if (!showTrigger) return null;
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className={`sidebar-trigger fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/20 hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-md transition-all duration-300 ${isOpen ? 'translate-x-64 opacity-0 pointer-events-none' : 'translate-x-0'}`}><Menu size={24} /></button>
      <div className={`sidebar-container fixed top-0 left-0 bottom-0 w-72 bg-gray-900/95 backdrop-blur-xl border-r border-white/5 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20"><h2 className="text-xl font-bold text-white flex items-center gap-2"><LayoutGrid size={20} className="text-blue-400"/> 导航面板 </h2><button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white p-1 hover:bg-white/10 rounded-md transition"><X size={20} /></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
           {pages.map(page => (
             <div key={page.id} className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border border-transparent ${activePageId === page.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-white/5 text-white/70 hover:text-white hover:border-white/5'}`} onClick={() => { if (editingPage?.id !== page.id) { setActivePageId(page.id); setIsOpen(false); } }}>
               {editingPage?.id === page.id ? (
                 <div className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}><input ref={inputRef} type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="flex-1 bg-black/30 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-400" onKeyDown={e => { if (e.key === 'Enter') onRenamePage(page.id, editingName); if (e.key === 'Escape') setEditingPage(null); }}/><button onClick={() => onRenamePage(page.id, editingName)} className="text-green-400 hover:bg-green-400/20 p-1 rounded"><Check size={14} /></button><button onClick={() => setEditingPage(null)} className="text-red-400 hover:bg-red-400/20 p-1 rounded"><X size={14} /></button></div>
               ) : (
                 <><div className="flex items-center gap-3"><FileText size={16} className={activePageId === page.id ? 'text-white/90' : 'text-white/40'} /><span className="font-medium truncate max-w-[140px]">{page.name}</span></div>{enableAdmin && (<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}><button onClick={() => setEditingPage(page)} className={`p-1.5 rounded-md hover:bg-black/20 ${activePageId === page.id ? 'text-white/80 hover:text-white' : 'text-white/40 hover:text-white'}`}><Edit2 size={12} /></button><button onClick={() => onDeletePage(page.id)} className={`p-1.5 rounded-md hover:bg-black/20 ${activePageId === page.id ? 'text-white/80 hover:text-red-200' : 'text-white/40 hover:text-red-400'}`}><Trash2 size={12} /></button></div>)}</>
               )}
             </div>
           ))}
        </div>
        {enableAdmin && (<div className="p-4 border-t border-white/10 bg-black/20"><div className="flex gap-2"><input type="text" value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="新页面名称" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500 transition" onKeyDown={e => { if (e.key === 'Enter' && newPageName) { onAddPage(newPageName); setNewPageName(''); } }}/><button onClick={() => { if (newPageName) { onAddPage(newPageName); setNewPageName(''); } }} disabled={!newPageName} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-2 rounded-lg transition"><Plus size={18} /></button></div></div>)}
      </div>
    </>
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
    innerUrl: '',
    logo: '',
    group: groups[0] || '默认',
    pinned: false,
    useFavicon: false,
  });

  useEffect(() => {
    if (initialData) {
      const initialUseFavicon = initialData.useFavicon ?? (initialData.url && initialData.logo === getFaviconUrl(initialData.url));
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        innerUrl: initialData.innerUrl || '',
        logo: initialData.logo || '',
        group: initialData.group || groups[0] || '默认',
        pinned: !!initialData.pinned,
        useFavicon: !!initialUseFavicon,
      });
    } else {
      setFormData({
        name: '',
        url: '',
        innerUrl: '',
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
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">外网地址 (默认)</label>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none font-mono text-sm" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <div className="flex justify-between">
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">内网地址 (可选)</label>
              <span className="text-[10px] text-emerald-400/80 self-center">填写后显示“内”按钮</span>
            </div>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none font-mono text-sm" value={formData.innerUrl} onChange={e => setFormData({ ...formData, innerUrl: e.target.value })} placeholder="http://192.168.1.x:port" />
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

function GroupModal({ isOpen, onClose, groups, onAdd, onRemove }) {
  const [newGroup, setNewGroup] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">分组管理</h2>
          <button onClick={onClose}><X size={20} className="text-white/50 hover:text-white" /></button>
        </div>
        <div className="flex gap-2 mb-6">
          <input type="text" value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="新分组名称" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-white focus:border-green-500 focus:outline-none" />
          <button onClick={() => { onAdd(newGroup); setNewGroup(''); }} disabled={!newGroup} className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white rounded-xl font-medium transition">添加</button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {groups.map(g => (
            <div key={g} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition">
              <span className="text-white font-medium pl-1">{g}</span>
              <button onClick={() => onRemove(g)} className="text-white/30 hover:text-red-400 p-1.5 transition rounded-lg hover:bg-white/5"><Trash2 size={16} /></button>
            </div>
          ))}
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

