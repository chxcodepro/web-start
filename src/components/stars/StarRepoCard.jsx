// GitHub 仓库卡片组件
import { Star, GitFork, ExternalLink, Tag } from 'lucide-react';
import { formatStarsCount, formatDate, getLanguageColor } from '../../utils/starsHelpers';

export default function StarRepoCard({ repo, onEditGroup }) {
  return (
    <div className="group relative bg-white/5 hover:bg-white/10 rounded-2xl transition-all duration-300 p-4 border border-white/5 hover:border-white/10">
      {/* 仓库名称和链接 */}
      <div className="flex items-start justify-between gap-2 mb-2">
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

      {/* 分组标签 */}
      {repo.group ? (
        <button
          onClick={() => onEditGroup?.(repo)}
          className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs rounded-lg transition"
        >
          <Tag size={10} />
          {repo.group}
        </button>
      ) : (
        <button
          onClick={() => onEditGroup?.(repo)}
          className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 text-xs rounded-lg transition border border-dashed border-white/10"
        >
          <Tag size={10} />
          未分组
        </button>
      )}

      {/* Topics */}
      {repo.topics && repo.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {repo.topics.slice(0, 3).map(topic => (
            <span
              key={topic}
              className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300/70 text-[10px] rounded"
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
    </div>
  );
}
