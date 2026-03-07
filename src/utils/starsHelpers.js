// GitHub Stars 工具函数

/**
 * 同步 Stars 数据
 * - 新增：GitHub 有但本地没有 → 添加（group 为空，待 AI 分组）
 * - 取消：本地有但 GitHub 没有 → 删除
 * - 保留：两边都有 → 保持原有 group 不变
 */
export const syncStarsData = (githubRepos, localRepos) => {
  const githubIds = new Set(githubRepos.map(r => r.id));
  const localMap = new Map(localRepos.map(r => [r.id, r]));

  // 保留已有仓库（保持原 group）
  const toKeep = localRepos.filter(r => githubIds.has(r.id));

  // 添加新 Star 的仓库（group 为空）
  const toAdd = githubRepos
    .filter(r => !localMap.has(r.id))
    .map(r => ({ ...r, group: '' }));

  // 计算被删除的仓库数量（用于提示）
  const removedCount = localRepos.filter(r => !githubIds.has(r.id)).length;

  return {
    repos: [...toKeep, ...toAdd],
    stats: {
      kept: toKeep.length,
      added: toAdd.length,
      removed: removedCount,
    },
  };
};

/**
 * 应用 AI 分组结果到仓库列表
 */
export const applyGroupAssignments = (repos, assignments) => {
  return repos.map(repo => {
    // 如果已有分组，保持不变
    if (repo.group) return repo;

    // 查找 AI 分配的分组（支持 id 或 fullName 作为 key）
    const groupByIdNum = assignments[repo.id];
    const groupByIdStr = assignments[String(repo.id)];
    const groupByName = assignments[repo.fullName];

    const assignedGroup = groupByIdNum || groupByIdStr || groupByName || '';

    return { ...repo, group: assignedGroup };
  });
};

/**
 * 获取所有分组
 */
export const extractGroups = (repos) => {
  const groups = new Set();
  repos.forEach(repo => {
    if (repo.group) {
      groups.add(repo.group);
    }
  });
  return Array.from(groups).sort();
};

/**
 * 按分组整理仓库
 */
export const groupReposByCategory = (repos, groups) => {
  const grouped = {};

  // 初始化分组
  groups.forEach(g => {
    grouped[g] = [];
  });

  // 未分组
  grouped['未分组'] = [];

  // 分配仓库
  repos.forEach(repo => {
    if (repo.group && grouped[repo.group]) {
      grouped[repo.group].push(repo);
    } else {
      grouped['未分组'].push(repo);
    }
  });

  // 置顶的排在分组前排
  Object.keys(grouped).forEach(g => {
    grouped[g].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  });

  return grouped;
};

/**
 * 搜索仓库
 */
export const searchRepos = (repos, query) => {
  if (!query || !query.trim()) return repos;

  const keyword = query.toLowerCase().trim();

  return repos.filter(repo => {
    const name = (repo.name || '').toLowerCase();
    const fullName = (repo.fullName || '').toLowerCase();
    const description = (repo.description || '').toLowerCase();
    const language = (repo.language || '').toLowerCase();
    const topics = (repo.topics || []).join(' ').toLowerCase();
    const group = (repo.group || '').toLowerCase();
    const note = (repo.note || '').toLowerCase();

    return (
      name.includes(keyword) ||
      fullName.includes(keyword) ||
      description.includes(keyword) ||
      language.includes(keyword) ||
      topics.includes(keyword) ||
      group.includes(keyword) ||
      note.includes(keyword)
    );
  });
};

/**
 * 排序仓库
 */
export const sortRepos = (repos, sortBy = 'stars') => {
  const sorted = [...repos];

  switch (sortBy) {
    case 'stars':
      sorted.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      break;
    case 'name':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'updated':
      sorted.sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));
      break;
    case 'language':
      sorted.sort((a, b) => (a.language || 'zzz').localeCompare(b.language || 'zzz'));
      break;
    default:
      break;
  }

  return sorted;
};

/**
 * 按语言筛选仓库
 */
export const filterByLanguage = (repos, language) => {
  if (!language || language === 'all') return repos;
  return repos.filter(repo => repo.language === language);
};

/**
 * 获取所有语言列表
 */
export const extractLanguages = (repos) => {
  const languages = new Set();
  repos.forEach(repo => {
    if (repo.language) {
      languages.add(repo.language);
    }
  });
  return Array.from(languages).sort();
};

/**
 * 格式化 Stars 数量
 */
export const formatStarsCount = (count) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
};

/**
 * 格式化日期
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 1) return '今天';
  if (days < 2) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
};

/**
 * 获取语言颜色（GitHub 风格）
 */
export const getLanguageColor = (language) => {
  const colors = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    Vue: '#41b883',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Lua: '#000080',
    Scala: '#c22d40',
    Elixir: '#6e4a7e',
    Haskell: '#5e5086',
    Clojure: '#db5855',
    R: '#198CE7',
    MATLAB: '#e16737',
    Jupyter: '#DA5B0B',
    Vim: '#199f4b',
    Dockerfile: '#384d54',
    Makefile: '#427819',
    Markdown: '#083fa1',
  };

  return colors[language] || '#8b949e';
};
