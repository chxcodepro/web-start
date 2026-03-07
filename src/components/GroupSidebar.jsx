import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Layers, X } from 'lucide-react';

/**
 * 通用分组导航侧边栏
 * 桌面端：sticky 可折叠侧边栏
 * 移动端：浮动按钮 + 抽屉
 */
export default function GroupSidebar({
  groups,
  storageKey = 'group-sidebar',
  stickyTop = '0px',
  paddingTop = '0px',
  scrollOffset = 80,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(`${storageKey}-collapsed`) === 'true';
    } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState('');
  const observerRef = useRef(null);

  // 持久化折叠状态
  useEffect(() => {
    try { localStorage.setItem(`${storageKey}-collapsed`, String(collapsed)); } catch {}
  }, [collapsed, storageKey]);

  // IntersectionObserver 检测当前可见分组
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    const elements = document.querySelectorAll('[data-group-section]');
    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveGroup(visible[0].target.dataset.groupSection);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    elements.forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, [groups]);

  // 点击分组 → 滚动到对应位置
  const handleGroupClick = useCallback((name) => {
    const elements = document.querySelectorAll('[data-group-section]');
    const target = Array.from(elements).find(el => el.dataset.groupSection === name);
    if (target) {
      const rect = target.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - scrollOffset,
        behavior: 'smooth',
      });
      setActiveGroup(name);
    }
    setMobileOpen(false);
  }, [scrollOffset]);

  // 分组列表
  const renderGroupList = () => (
    <div className="flex flex-col gap-0.5 px-2 py-2 overflow-y-auto flex-1 sidebar-scroll">
      {groups.map(({ name, count }) => {
        const isActive = activeGroup === name;
        return (
          <button
            key={name}
            onClick={() => handleGroupClick(name)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all duration-200 ${
              isActive
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.08]'
            }`}
          >
            {isActive && <div className="w-0.5 h-4 bg-cyan-400 rounded-full shrink-0" />}
            <span className="truncate flex-1 text-left">{name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
              isActive ? 'bg-cyan-500/25 text-cyan-300' : 'bg-white/[0.08] text-white/35'
            }`}>{count}</span>
          </button>
        );
      })}
    </div>
  );

  if (!groups || groups.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes sidebarSlideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes sidebarFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* 移动端浮动触发按钮 */}
      <button
        className="fixed left-3 bottom-6 z-40 md:hidden w-11 h-11 bg-white/15 backdrop-blur-xl border border-white/20 rounded-full shadow-lg flex items-center justify-center text-white/70 active:scale-95 transition-all"
        onClick={() => setMobileOpen(true)}
      >
        <Layers size={18} />
      </button>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            style={{ animation: 'sidebarFadeIn 0.2s ease-out' }}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-60 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl flex flex-col"
            style={{ animation: 'sidebarSlideIn 0.25s ease-out' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className="text-sm font-bold text-white/80">分组导航</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>
            {renderGroupList()}
          </div>
        </div>
      )}

      {/* 桌面端 sticky 侧边栏 */}
      <div
        className={`hidden md:flex flex-col shrink-0 sticky backdrop-blur-xl bg-gray-900/40 border-r border-white/10 transition-all duration-300 z-20 ${
          collapsed ? 'w-10' : 'w-48'
        }`}
        style={{
          top: stickyTop,
          height: `calc(100vh - ${stickyTop})`,
          paddingTop: paddingTop,
        }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center pt-2">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition"
              title="展开分组导航"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
              <span className="text-[11px] font-bold text-white/40 tracking-wider">分组导航</span>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition"
                title="折叠侧边栏"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            {renderGroupList()}
          </>
        )}
      </div>
    </>
  );
}
