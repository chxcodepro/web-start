// 站点卡片组件
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Edit2, Trash2, Check } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FAVICON_SERVICES,
  getDomainFromUrl,
  getCachedFavicon,
  setFaviconCache,
  clearFaviconCache,
} from '../utils/favicon';

export function SiteCard({ site, isAdmin, onEdit, onDelete, className = "", isBatchMode = false, isSelected = false, onToggleSelect, isDragging = false }) {
  const domain = getDomainFromUrl(site.url || site.innerUrl || '');

  // 同步读取缓存，避免首次渲染发起错误渠道的请求
  const initialCache = domain ? getCachedFavicon(domain) : null;
  const [faviconIndex, setFaviconIndex] = useState(() =>
    initialCache && initialCache.serviceIndex >= 0 ? initialCache.serviceIndex : 0
  );
  const [imgError, setImgError] = useState(() =>
    initialCache?.serviceIndex === -1
  );
  const [cachedUrl, setCachedUrl] = useState(() =>
    initialCache && initialCache.serviceIndex >= 0 ? initialCache.url : null
  );
  const imgRef = useRef(null);
  const textContainerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  // domain 变化时重新检查缓存
  const prevDomainRef = useRef(domain);
  useEffect(() => {
    if (prevDomainRef.current === domain) return;
    prevDomainRef.current = domain;
    setImgError(false);
    setCachedUrl(null);
    if (domain) {
      const cached = getCachedFavicon(domain);
      if (cached) {
        if (cached.serviceIndex === -1) {
          setImgError(true);
          setFaviconIndex(0);
        } else {
          setCachedUrl(cached.url);
          setFaviconIndex(cached.serviceIndex);
        }
      } else {
        setFaviconIndex(0);
      }
    } else {
      setFaviconIndex(0);
    }
  }, [domain]);

  useLayoutEffect(() => {
    if (textContainerRef.current && textRef.current) {
      setShouldScroll(textRef.current.scrollWidth > textContainerRef.current.clientWidth + 2);
    }
  }, [site.name, className]);

  const mainLink = site.url || site.innerUrl || '#';
  const hasInner = !!site.innerUrl;
  const isInnerOnly = !site.url && site.innerUrl;

  // 优先用缓存，否则按服务列表获取
  const faviconUrl = cachedUrl || (domain && faviconIndex < FAVICON_SERVICES.length
    ? FAVICON_SERVICES[faviconIndex](domain)
    : '');

  // 图片加载成功时校验是否为有效图标
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;

    const { naturalWidth, naturalHeight } = img;

    // 检测无效图标的多种情况：
    // 1. 尺寸过小（< 10px）- 明显无效
    // 2. Google API 请求 sz=64 但返回 16x16 - 这是 Google 的默认地球图标
    // 3. 其他服务返回的占位图通常也是 16x16 或更小
    const isGoogleApi = faviconUrl.includes('google.com/s2/favicons');
    const minValidSize = isGoogleApi ? 24 : 10; // Google API 要求更高的阈值

    if (naturalWidth < minValidSize || naturalHeight < minValidSize) {
      handleImgError();
      return;
    }

    // 图标有效，缓存 URL 和服务索引
    if (!cachedUrl && domain && faviconUrl) {
      setFaviconCache(domain, faviconUrl, faviconIndex);
      setCachedUrl(faviconUrl);
    }
  };

  // 图片加载失败时尝试下一个服务
  const handleImgError = () => {
    if (cachedUrl) {
      // 缓存的URL失效，清除 localStorage 缓存并重新获取
      clearFaviconCache(domain);
      setCachedUrl(null);
      setFaviconIndex(0);
    } else if (faviconIndex < FAVICON_SERVICES.length - 1) {
      setFaviconIndex(prev => prev + 1);
    } else {
      // 所有渠道都失败，缓存失败标记，下次直接显示字母图标
      if (domain) setFaviconCache(domain, '', -1);
      setImgError(true);
    }
  };

  return (
    <div className={`group relative h-16 md:h-20 hover:bg-white/10 rounded-2xl transition-all duration-300 flex items-center px-2 md:px-3 overflow-hidden w-full card-hover ${isDragging ? 'opacity-50 scale-105 shadow-2xl bg-white/20' : ''} ${className}`}>
      {!isBatchMode && <a href={mainLink} rel="noreferrer" className="absolute inset-0 z-0" />}
      {isBatchMode && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(site.id); }}
          className={`absolute top-1.5 left-1.5 z-30 w-5 h-5 md:w-5 md:h-5 rounded border flex items-center justify-center transition ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-black/40 border-white/30 text-transparent hover:border-white/60'}`}
          title="选择站点"
        >
          <Check size={12} />
        </button>
      )}
      <div className="relative z-10 w-10 h-10 md:w-14 md:h-14 flex-shrink-0 bg-white/5 rounded-xl p-1 md:p-1.5 flex items-center justify-center shadow-sm pointer-events-none">
        {!imgError && faviconUrl ? (
          <img ref={imgRef} src={faviconUrl} alt={site.name} className="w-full h-full object-contain drop-shadow-sm" onLoad={handleImgLoad} onError={handleImgError} />
        ) : (
          <span className="text-lg md:text-xl font-bold text-white/40">{(site.name?.[0] || '?').toUpperCase()}</span>
        )}
      </div>
      <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center ml-2 md:ml-3 overflow-hidden pointer-events-none" ref={textContainerRef}>
        <div className="w-full relative h-5 md:h-6 flex items-center">
          <h4 ref={textRef} className={`text-xs md:text-sm font-semibold text-white/90 truncate tracking-wide text-shadow absolute inset-0 transition-opacity duration-300 ${shouldScroll ? 'group-hover:opacity-0' : ''}`}>{site.name}</h4>
          {shouldScroll && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute inset-0 flex items-center">
              <div className="animate-scroll-text">
                <span className="text-xs md:text-sm font-semibold text-white/90 tracking-wide text-shadow whitespace-nowrap">{site.name}</span>
                <span className="inline-block w-8"></span>
                <span className="text-xs md:text-sm font-semibold text-white/90 tracking-wide text-shadow whitespace-nowrap">{site.name}</span>
                <span className="inline-block w-8"></span>
              </div>
            </div>
          )}
        </div>
      </div>
      {!isBatchMode && !isInnerOnly && hasInner && (
        <a href={site.innerUrl} target="_blank" rel="noreferrer" className="relative z-20 mt-auto ml-auto md:absolute md:bottom-1.5 md:right-1.5 bg-emerald-500/20 hover:bg-emerald-500/90 text-emerald-300 hover:text-white text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 transition-all font-bold shadow-sm opacity-0 group-hover:opacity-100" title={`内网地址: ${site.innerUrl}`} onClick={(e) => e.stopPropagation()}>内</a>
      )}
      {isAdmin && !isBatchMode && (
        <div className="absolute top-1 right-1 md:top-1.5 md:right-1.5 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1 backdrop-blur-md border border-white/10 scale-90 hover:scale-100 pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 md:p-1 text-white/70 hover:text-blue-400 rounded-md hover:bg-white/10 transition"><Edit2 size={14} className="md:w-3 md:h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 md:p-1 text-white/70 hover:text-red-400 rounded-md hover:bg-white/10 transition"><Trash2 size={14} className="md:w-3 md:h-3" /></button>
        </div>
      )}
    </div>
  );
}

// 可排序的 SiteCard 包装组件
export function SortableSiteCard({ site, isAdmin, onEdit, onDelete, isBatchMode, isSelected, onToggleSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: site.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  // 管理员模式下整个卡片可拖拽
  const dragProps = isAdmin && !isBatchMode ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isAdmin && !isBatchMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...dragProps}
    >
      <SiteCard
        site={site}
        isAdmin={isAdmin}
        onEdit={onEdit}
        onDelete={onDelete}
        isBatchMode={isBatchMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        isDragging={isDragging}
      />
    </div>
  );
}

export default SiteCard;
