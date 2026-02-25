// 图标缓存相关工具函数

const FAVICON_CACHE_KEY = 'favicon-cache';
const FAVICON_CACHE_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7天过期

// 多源 favicon 服务列表（按优先级排序）
export const FAVICON_SERVICES = [
  (domain) => `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
  (domain) => `https://icon.horse/icon/${domain}`,
  (domain) => `https://favicon.im/${domain}?larger=true`,
  (domain) => `https://${domain}/favicon.ico`,
];

// 获取图标缓存
export const getFaviconCache = () => {
  try {
    const cache = localStorage.getItem(FAVICON_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch (e) {
    return {};
  }
};

// 保存图标缓存
export const setFaviconCache = (domain, url) => {
  try {
    const cache = getFaviconCache();
    cache[domain] = { url, time: Date.now() };
    // 清理过期缓存
    Object.keys(cache).forEach(key => {
      if (Date.now() - cache[key].time > FAVICON_CACHE_EXPIRE) {
        delete cache[key];
      }
    });
    localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // 忽略存储错误
  }
};

// 获取缓存的图标URL
export const getCachedFavicon = (domain) => {
  const cache = getFaviconCache();
  const item = cache[domain];
  if (item && Date.now() - item.time < FAVICON_CACHE_EXPIRE) {
    return item.url;
  }
  return null;
};

// 清除指定域名的图标缓存
export const clearFaviconCache = (domain) => {
  try {
    const cache = getFaviconCache();
    if (cache[domain]) {
      delete cache[domain];
      localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    // 忽略存储错误
  }
};

// 从 URL 提取域名
export const getDomainFromUrl = (url) => {
  try {
    const fullUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    return new URL(fullUrl).hostname;
  } catch (e) {
    return '';
  }
};

// 获取 favicon URL（默认第一个服务）
export const getFaviconUrl = (url) => {
  const domain = getDomainFromUrl(url);
  if (!domain) return '';
  return FAVICON_SERVICES[0](domain);
};
