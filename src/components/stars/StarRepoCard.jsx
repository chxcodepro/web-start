// GitHub 仓库卡片组件
import { useState, useRef, useEffect } from 'react';
import { Star, ExternalLink, Tag, Package, ChevronDown, Plus, Check, Pin } from 'lucide-react';
import { formatStarsCount, formatDate, getLanguageColor } from '../../utils/starsHelpers';

// 简单内存缓存，避免重复请求（限制最大 500 条）
const releaseCache = {};
const CACHE_MAX_SIZE = 500;

const setReleaseCache = (key, value) => {
  const keys = Object.keys(releaseCache);
  if (keys.length >= CACHE_MAX_SIZE) {
    delete releaseCache[keys[0]];
  }
  releaseCache[key] = value;
};

export default function StarRepoCard({ repo, groups = [], onUpdateRepo, searchQuery = '' }) {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [note, setNote] = useState(repo.note || '');

  // 关键词高亮
  const highlight = (text) => {
    if (!searchQuery?.trim() || !text) return text;
    const escaped = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.trim().toLowerCase()
        ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">{part}</mark>
        : part
    );
  };
  const [latestRelease, setLatestRelease] = useState(undefined); // undefined=未加载, null=无发行版, string=版本号
  const dropdownRef = useRef(null);

  // 懒加载最新 Release
  useEffect(() => {
    if (!repo.fullName) return;
    if (releaseCache[repo.fullName] !== undefined) {
      setLatestRelease(releaseCache[repo.fullName]);
      return;
    }

    let isMounted = true;

    fetch(`https://api.github.com/repos/${repo.fullName}/releases/latest`)
      .then(res => {
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        const version = data?.tag_name || null;
        setReleaseCache(repo.fullName, version);
        if (isMounted) {
          setLatestRelease(version);
        }
      })
      .catch(() => {
        setReleaseCache(repo.fullName, null);
        if (isMounted) {
          setLatestRelease(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repo.fullName]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowGroupDropdown(false);
        setNewGroupName('');
      }
    };
    if (showGroupDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGroupDropdown]);

  // 同步 repo.note 变化
  useEffect(() => {
    setNote(repo.note || '');
  }, [repo.note]);

  // 选择分组
  const handleSelectGroup = (groupName) => {
    onUpdateRepo?.(repo.id, { group: groupName });
    setShowGroupDropdown(false);
    setNewGroupName('');
  };

  // 新建分组
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onUpdateRepo?.(repo.id, { group: newGroupName.trim() });
      setShowGroupDropdown(false);
      setNewGroupName('');
    }
  };

  // 保存备注（失焦时触发）
  const handleNoteBlur = () => {
    if (note !== (repo.note || '')) {
      onUpdateRepo?.(repo.id, { note: note.trim() });
    }
  };

  // 切换置顶状态
  const handleTogglePin = () => {
    onUpdateRepo?.(repo.id, { pinned: !repo.pinned });
  };

  return (
    <div className={`group relative rounded-2xl border border-white/10 bg-white/[0.12] p-3 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_54px_rgba(5,10,25,0.24)] backdrop-blur-2xl hover:bg-white/[0.15] hover:border-white/15 md:p-4 ${showGroupDropdown ? 'z-[60]' : ''}`}>
      {/* 置顶按钮 */}
      <button
        onClick={handleTogglePin}
        className={`absolute top-2 right-2 p-1 rounded-full transition z-10 ${
          repo.pinned
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/30 hover:text-white/60 hover:bg-white/20'
        }`}
        title={repo.pinned ? '取消置顶' : '置顶'}
      >
        <Pin size={14} className={repo.pinned ? 'fill-amber-400' : ''} />
      </button>

      {/* 仓库名称和链接 */}
      <div className="flex items-start justify-between gap-2 mb-2 pr-6">
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 min-w-0"
        >
          <h4 className="text-sm font-semibold text-white/90 truncate hover:text-cyan-400 transition-colors">
            {highlight(repo.fullName || repo.name)}
          </h4>
        </a>
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 text-white/30 hover:text-white/70 transition"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* 描述 */}
      {repo.description && (
        <p className="text-xs text-white/50 line-clamp-2 mb-3 leading-relaxed">
          {highlight(repo.description)}
        </p>
      )}

      {/* 标签信息栏 */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        {/* 语言 */}
        {repo.language && (
          <span className="flex items-center gap-1 text-white/60">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getLanguageColor(repo.language) }}
            />
            {repo.language}
          </span>
        )}

        {/* Stars 数量 */}
        <span className="flex items-center gap-1 text-white/60">
          <Star size={12} className="text-yellow-400/70" />
          {formatStarsCount(repo.stars)}
        </span>

        {/* 代码更新时间 */}
        {repo.pushedAt && (
          <span className="text-white/40">
            {formatDate(repo.pushedAt)}
          </span>
        )}
      </div>

      {/* 分组选择器 */}
      <div className="relative mt-3" ref={dropdownRef}>
        <button
          onClick={() => setShowGroupDropdown(!showGroupDropdown)}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition ${
            repo.group
              ? 'border border-cyan-400/20 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
              : 'border border-dashed border-white/15 bg-white/[0.08] text-white/50 hover:bg-white/[0.14] hover:text-white/70'
          }`}
        >
          <Tag size={10} />
          {repo.group || '未分组'}
          <ChevronDown size={10} className={`transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉选择框（向下弹出） */}
        {showGroupDropdown && (
          <div className="absolute left-0 top-full z-[100] mt-1 min-w-[160px] rounded-xl border border-white/10 bg-white/[0.12] py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_54px_rgba(5,10,25,0.32)] backdrop-blur-2xl animate-fade-in">
            {/* 新建分组输入 */}
            <div className="px-2 py-1.5 border-b border-white/10">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  placeholder="新建分组..."
                  className="flex-1 rounded border-none bg-white/[0.08] px-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  autoFocus
                />
                {newGroupName.trim() && (
                  <button
                    onClick={handleCreateGroup}
                    className="p-1 text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* 现有分组列表 */}
            <div className="max-h-[200px] overflow-y-auto">
              {/* 取消分组选项 */}
              {repo.group && (
                <button
                  onClick={() => handleSelectGroup('')}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/50 transition hover:bg-white/[0.1]"
                >
                  取消分组
                </button>
              )}
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => handleSelectGroup(g)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
                    repo.group === g
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'text-white/70 hover:bg-white/[0.1]'
                  }`}
                >
                  {g}
                  {repo.group === g && <Check size={10} />}
                </button>
              ))}
              {groups.length === 0 && !newGroupName && (
                <div className="px-3 py-2 text-xs text-white/40">暂无分组</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 备注输入框（自动换行） */}
      <div className="mt-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="添加备注..."
          rows={1}
          className="w-full bg-transparent border-none resize-none text-xs text-white/60 placeholder-white/30 focus:outline-none focus:text-white/80 py-1 leading-relaxed"
          style={{ minHeight: '1.5rem', overflow: 'hidden' }}
          onInput={(e) => {
            // 自动撑高
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
      </div>

      {/* Topics */}
      {repo.topics && repo.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {repo.topics.slice(0, 3).map(topic => (
            <span
              key={topic}
              className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300/70 text-[10px] rounded"
            >
              {highlight(topic)}
            </span>
          ))}
          {repo.topics.length > 3 && (
            <span className="text-[10px] text-white/30">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Releases */}
      {repo.url && (
        <div className="mt-3 pt-2 border-t border-white/10">
          {latestRelease === undefined ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-white/30">
              <Package size={10} />
              加载中...
            </span>
          ) : latestRelease ? (
            <a
              href={`${repo.url}/releases/tag/${latestRelease}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-white/50 hover:text-orange-400 transition"
            >
              <Package size={10} />
              {latestRelease}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-white/25">
              <Package size={10} />
              无发行版
            </span>
          )}
        </div>
      )}
    </div>
  );
}
