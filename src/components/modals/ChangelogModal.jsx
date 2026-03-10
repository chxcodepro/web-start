// 更新日志弹窗组件
import { useState, useEffect } from 'react';
import { X, FileText, Github } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { APP_VERSION } from '../../utils/constants';

// GitHub 仓库地址
const GITHUB_REPO_URL = 'https://github.com/chxcodepro/web-start';

export default function ChangelogModal({ isOpen, onClose }) {
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // 动态导入 CHANGELOG.md 内容
      fetch('/CHANGELOG.md')
        .then(res => res.text())
        .then(text => {
          setChangelog(text);
          setLoading(false);
        })
        .catch(() => {
          setChangelog('无法加载更新日志');
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-lg max-h-[80vh] shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in-scale flex flex-col">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={20} className="text-emerald-400" />
            更新日志
            <span className="text-xs font-normal text-white/40 ml-1">v{APP_VERSION}</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: () => null,
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold text-emerald-400 mt-4 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-medium text-white/60 mt-4 mb-2">{children}</h3>
                  ),
                  ul: ({ children }) => <ul className="pl-2 space-y-1.5">{children}</ul>,
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-white/80 text-sm">
                      <span className="text-white/40 mt-1 shrink-0">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  p: ({ children }) => <p className="text-white/70 text-sm mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  code: ({ children }) => (
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-emerald-300">{children}</code>
                  ),
                  hr: () => <hr className="border-white/10 my-4" />,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">
                      {children}
                    </a>
                  ),
                }}
              >
                {changelog}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 底部 GitHub 链接 */}
        <div className="p-4 pt-0 border-t border-white/10 mt-2">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-white/70 hover:text-white text-sm font-medium transition-all"
          >
            <Github size={16} />
            访问 GitHub 仓库
          </a>
        </div>
      </div>
    </div>
  );
}
