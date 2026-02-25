// 通用工具函数
import { DEFAULT_WEB_DAV_CONFIG, SINGLE_PAGE_ID, SINGLE_PAGE_NAME } from './constants';

// 规范化 WebDAV 配置
export const normalizeWebDavConfig = (config) => ({
  ...DEFAULT_WEB_DAV_CONFIG,
  ...config,
  url: (config?.url || '').trim(),
  username: (config?.username || '').trim(),
  password: config?.password || '',
  filePath: ((config?.filePath || DEFAULT_WEB_DAV_CONFIG.filePath).trim() || DEFAULT_WEB_DAV_CONFIG.filePath),
});

// 规范化站点名称
export const normalizeSiteName = (site) => {
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

// 合并多页面为单页
export const mergePagesToSingle = (rawPages) => {
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
