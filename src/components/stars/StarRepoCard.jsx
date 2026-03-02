// GitHub 仓库卡片组件
import { useState, useRef, useEffect } from 'react';
import { Star, ExternalLink, Tag, Package, ChevronDown, Plus, Check, CheckCircle2 } from 'lucide-react';
import { formatStarsCount, formatDate, getLanguageColor } from '../../utils/starsHelpers';

export default function StarRepoCard({ repo, groups = [], onUpdateRepo }) {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [note, setNote] = useState(repo.note || '');
  const dropdownRef = useRef(null);

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

  // 切换已读状态
  const handleToggleRead = () => {
    onUpdateRepo?.(repo.id, { isRead: !repo.isRead });
  };

  // Releases 链接
  const releasesUrl = repo.url ? `${repo.url}/releases` : null;

  return (
    <div className="group relative bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-300 p-4 border border-white/10 hover:border-white/20">
      {/* 已读标记按钮 */}
      <button
        onClick={handleToggleRead}
        className={`absolute top-2 right-2 p-1 rounded-full transition z-10 ${
          repo.isRead
            ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30'
            : 'text-white/30 hover:text-white/50 hover:bg-white/10'
        }`}
        title={repo.isRead ? '标记为未读' : '标记为已读'}
      >
        <CheckCircle2 size={16} />
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
            {repo.fullName || repo.name}
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
          {repo.description}
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

        {/* 更新时间 */}
        {repo.updatedAt && (
          <span className="text-white/40">
            {formatDate(repo.updatedAt)}
          </span>
        )}
      </div>

      {/* 分组选择器 */}
      <div className="relative mt-3" ref={dropdownRef}>
        <button
          onClick={() => setShowGroupDropdown(!showGroupDropdown)}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition ${
            repo.group
              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
              : 'bg-white/10 hover:bg-white/15 text-white/50 hover:text-white/70 border border-dashed border-white/20'
          }`}
        >
          <Tag size={10} />
          {repo.group || '未分组'}
          <ChevronDown size={10} className={`transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉选择框 */}
        {showGroupDropdown && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-gray-800 border border-white/20 rounded-xl shadow-xl min-w-[160px] py-1 animate-fade-in">
            {/* 新建分组输入 */}
            <div className="px-2 py-1.5 border-b border-white/10">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  placeholder="新建分组..."
                  className="flex-1 bg-white/10 border-none rounded px-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                  className="w-full px-3 py-1.5 text-left text-xs text-white/50 hover:bg-white/10 transition flex items-center gap-2"
                >
                  取消分组
                </button>
              )}
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => handleSelectGroup(g)}
                  className={`w-full px-3 py-1.5 text-left text-xs transition flex items-center justify-between ${
                    repo.group === g
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-white/70 hover:bg-white/10'
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

      {/* 备注输入框 */}
      <div className="mt-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="添加备注..."
          className="w-full bg-transparent border-none text-xs text-white/60 placeholder-white/30 focus:outline-none focus:text-white/80 py-1"
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
              {topic}
            </span>
          ))}
          {repo.topics.length > 3 && (
            <span className="text-[10px] text-white/30">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Releases 链接 */}
      <div className="mt-3 pt-2 border-t border-white/10">
        {releasesUrl ? (
          <a
            href={releasesUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-orange-400 transition"
          >
            <Package size={10} />
            Releases
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-white/20">
            <Package size={10} />
            无发行版
          </span>
        )}
      </div>
    </div>
  );
}
