// 常量和默认配置

// 应用版本号（从 package.json 读取）
import packageJson from '../../package.json';
export const APP_VERSION = packageJson.version;

// 默认站点数据
export const DEFAULT_SITES = [
  { id: '1', name: 'Bilibili', url: 'https://www.bilibili.com', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/bilibili.png', group: '媒体', pinned: false },
  { id: '2', name: 'Jellyfin', url: 'https://demo.jellyfin.org', innerUrl: 'http://192.168.1.10:8096', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png', group: '媒体', pinned: true },
  { id: '3', name: 'iKuai', url: '', innerUrl: 'http://192.168.1.1', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/ikuai.png', group: '系统', pinned: false },
  { id: '4', name: 'Navidrome', url: 'https://www.navidrome.org', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/navidrome.png', group: '媒体', pinned: false },
  { id: '5', name: 'Ubuntu', url: '', innerUrl: 'ssh://192.168.1.20', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/ubuntu.png', group: '系统', pinned: true },
  { id: '6', name: 'VSCode', url: 'https://vscode.dev', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/visual-studio-code.png', group: '开发', pinned: false },
  { id: '7', name: 'OpenWRT', url: '', innerUrl: 'http://192.168.1.2', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/openwrt.png', group: '系统', pinned: false },
  { id: '8', name: 'Docker', url: 'https://www.docker.com', innerUrl: '', logo: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png', group: '开发', pinned: false },
];

export const DEFAULT_GROUPS = ['媒体', '系统', '开发', '社交'];

export const DEFAULT_PAGES = [
  {
    id: 'home',
    name: '首页',
    sites: DEFAULT_SITES,
    groups: DEFAULT_GROUPS
  }
];

export const DEFAULT_BG = "https://images.unsplash.com/photo-1531685250784-7569952593d2?q=80&w=2874&auto=format&fit=crop";

// 存储键名
export const WEB_DAV_STORAGE_KEY = 'my-nav-webdav-config';
export const SEARCH_HISTORY_STORAGE_KEY = 'my-nav-search-history';
export const SEARCH_ENGINE_STORAGE_KEY = 'my-nav-search-engine';

// 搜索引擎配置
export const SEARCH_ENGINES = {
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

// WebDAV 默认配置（坚果云）
export const DEFAULT_WEB_DAV_CONFIG = {
  url: 'https://dav.jianguoyun.com/dav/',
  username: '',
  password: '',
  filePath: '/my-nav-backup.json',
};

// 单页配置
export const SINGLE_PAGE_ID = 'home';
export const SINGLE_PAGE_NAME = '首页';
export const BOOKMARK_UNGROUPED_GROUP = '未分组的书签';

// GitHub Stars 功能相关常量
export const GITHUB_STARS_STORAGE_KEY = 'my-nav-github-stars-enabled';
export const GITHUB_STARS_VIEW_KEY = 'my-nav-github-stars-view';

// AI 服务商配置
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    name: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-latest',
  },
  google: {
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
  },
  custom: {
    name: '自定义',
    endpoint: '',
    model: '',
  },
};

// GitHub Stars 默认配置
export const DEFAULT_STARS_CONFIG = {
  github: {
    authType: 'pat', // 'pat' | 'oauth'
    accessToken: '',
    username: '',
    avatarUrl: '',
  },
  aiConfig: {
    provider: 'openai',
    apiKey: '',
    customEndpoint: '',
    customModel: '',
    presetGroups: [], // 预设分组列表
    usePresetOnly: false, // 是否仅使用预设分组
  },
};

export const DEFAULT_AI_ASSISTANT_CONFIG = {
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: '你是我的私人 AI 助手。默认用中文回答，回答要直接、清楚、实用；需要联网时结合搜索结果给出结论，并尽量附上来源链接。',
  enableWebSearch: true,
  searchMode: 'openai',
  searchApiKey: '',
};
