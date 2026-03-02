// GitHub Stars 独立页面
import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  Github,
} from 'lucide-react';
import StarRepoCard from './StarRepoCard';
import {
  searchRepos,
  sortRepos,
  filterByLanguage,
  extractLanguages,
  extractGroups,
  groupReposByCategory,
} from '../../utils/starsHelpers';

export default function GitHubStarsPage({
  repos,
  groups,
  config,
  onBack,
  onSync,
  onAIAnalyze,
  onOpenSettings,
  onUpdateRepo,
  syncing,
  analyzing,
  lastSyncAt,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('stars');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [viewMode, setViewMode] = useState('group'); // 'group' | 'list'
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // 从 localStorage 恢复视图偏好
  useEffect(() => {
    try {
      const saved = localStorage.getItem('my-nav-github-stars-view');
      if (saved) {
        const { viewMode: vm, sortBy: sb } = JSON.parse(saved);
        if (vm) setViewMode(vm);
        if (sb) setSortBy(sb);
      }
    } catch (e) {
      // 忽略
    }
  }, []);

  // 保存视图偏好
  useEffect(() => {
    try {
      localStorage.setItem('my-nav-github-stars-view', JSON.stringify({ viewMode, sortBy }));
    } catch (e) {
      // 忽略
    }
  }, [viewMode, sortBy]);

  // 获取所有语言
  const languages = useMemo(() => extractLanguages(repos), [repos]);

  // 获取所有分组
  const allGroups = useMemo(() => groups || extractGroups(repos), [repos, groups]);

  // 过滤和排序
  const filteredRepos = useMemo(() => {
    let result = repos || [];  // 防止 repos 为 undefined
    result = searchRepos(result, searchQuery);
    result = filterByLanguage(result, filterLanguage);
    result = sortRepos(result, sortBy);
    return result;
  }, [repos, searchQuery, filterLanguage, sortBy]);

  // 按分组整理
  const groupedRepos = useMemo(() => {
    return groupReposByCategory(filteredRepos, allGroups);
  }, [filteredRepos, allGroups]);

  // 统计信息
  const stats = useMemo(() => {
    const safeRepos = repos || [];
    const ungroupedCount = safeRepos.filter(r => !r.group).length;
    return {
      total: safeRepos.length,
      filtered: filteredRepos.length,
      ungrouped: ungroupedCount,
      groupCount: allGroups.length,
    };
  }, [repos, filteredRepos, allGroups]);

  // 切换分组折叠
  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // 检查是否已配置 GitHub
  const isGitHubConfigured = config?.github?.accessToken;

  return (
    <div className="min-h-screen">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-gray-900/80 border-b border-white/10">
        <div className="container mx-auto px-4 md:px-8 max-w-[1600px]">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <Github size={20} />
                  GitHub Stars
                </h1>
                <p className="text-xs text-white/40">
                  {stats.total} 个仓库 · {stats.groupCount} 个分组
                </p>
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 同步按钮 */}
              <button
                onClick={onSync}
                disabled={syncing || !isGitHubConfigured}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-xl text-sm text-white font-medium transition flex items-center gap-2"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? '同步中...' : '同步'}
              </button>

              {/* AI 分组按钮 */}
              <button
                onClick={onAIAnalyze}
                disabled={analyzing || stats.ungrouped === 0 || !config?.aiConfig?.apiKey}
                className="px-3 py-2 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-sm text-white font-medium transition flex items-center gap-2"
              >
                <Sparkles size={14} className={analyzing ? 'animate-pulse' : ''} />
                {analyzing ? '分析中...' : `AI 分组 (${stats.ungrouped})`}
              </button>

              {/* 设置按钮 */}
              <button
                onClick={onOpenSettings}
                className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 未配置 GitHub 提示 */}
      {!isGitHubConfigured && (
        <div className="container mx-auto px-4 md:px-8 max-w-[1600px] py-8">
          <div className="text-center py-16">
            <Github size={64} className="mx-auto mb-6 text-white/20" />
            <h2 className="text-xl font-bold text-white mb-2">尚未配置 GitHub</h2>
            <p className="text-white/50 mb-6">请先在设置中配置 GitHub Token 以获取你的 Stars</p>
            <button
              onClick={onOpenSettings}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition"
            >
              前往设置
            </button>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      {isGitHubConfigured && (
        <div className="container mx-auto px-4 md:px-8 max-w-[1600px] py-6">
          {/* 搜索和筛选栏 */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索仓库..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none text-sm"
              />
            </div>

            {/* 筛选按钮组 */}
            <div className="flex items-center gap-2">
              {/* 语言筛选 */}
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer [&>option]:bg-gray-800 [&>option]:text-white"
              >
                <option value="all">所有语言</option>
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>

              {/* 排序 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer [&>option]:bg-gray-800 [&>option]:text-white"
              >
                <option value="stars">按 Stars</option>
                <option value="name">按名称</option>
                <option value="updated">按更新</option>
                <option value="language">按语言</option>
              </select>

              {/* 视图切换 */}
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('group')}
                  className={`p-2 rounded-lg transition ${viewMode === 'group' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* 仓库列表 */}
          {(repos || []).length === 0 ? (
            <div className="text-center py-16">
              <RefreshCw size={48} className="mx-auto mb-4 text-white/20" />
              <p className="text-white/50">暂无 Stars 数据</p>
              <p className="text-white/30 text-sm mt-2">点击"同步"按钮获取你的 GitHub Stars</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-16">
              <Search size={48} className="mx-auto mb-4 text-white/20" />
              <p className="text-white/50">没有找到匹配的仓库</p>
            </div>
          ) : viewMode === 'group' ? (
            /* 分组视图 */
            <div className="space-y-6">
              {Object.entries(groupedRepos).map(([groupName, groupRepos]) => {
                if (groupRepos.length === 0) return null;
                const isCollapsed = collapsedGroups[groupName];

                return (
                  <div key={groupName} className="animate-fade-in">
                    {/* 分组标题 */}
                    <button
                      onClick={() => toggleGroupCollapse(groupName)}
                      className="w-full flex items-center justify-between mb-3 pb-2 border-b border-white/10 hover:border-white/20 transition"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight size={16} className="text-white/50" />
                        ) : (
                          <ChevronDown size={16} className="text-white/50" />
                        )}
                        <h3 className="text-lg font-bold text-white/90">{groupName}</h3>
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                          {groupRepos.length}
                        </span>
                      </div>
                    </button>

                    {/* 仓库网格 */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {groupRepos.map(repo => (
                          <StarRepoCard
                            key={repo.id}
                            repo={repo}
                            groups={allGroups}
                            onUpdateRepo={onUpdateRepo}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* 列表视图 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredRepos.map(repo => (
                <StarRepoCard
                  key={repo.id}
                  repo={repo}
                  groups={allGroups}
                  onUpdateRepo={onUpdateRepo}
                />
              ))}
            </div>
          )}

          {/* 上次同步时间 */}
          {lastSyncAt && (
            <div className="mt-8 text-center text-xs text-white/30">
              上次同步: {new Date(lastSyncAt).toLocaleString('zh-CN')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
