// 版本标签组件
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import ChangelogModal from './modals/ChangelogModal';
import { APP_VERSION } from '../utils/constants';

export default function VersionTag() {
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    // 检查本地存储的版本号，判断是否有新版本
    const lastSeenVersion = localStorage.getItem('web-start-last-seen-version');
    if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
      setHasNewVersion(true);
    }
  }, []);

  const handleOpenChangelog = () => {
    setIsChangelogOpen(true);
    // 标记用户已看过此版本
    localStorage.setItem('web-start-last-seen-version', APP_VERSION);
    setHasNewVersion(false);
  };

  // 有新版本时才显示
  if (!hasNewVersion) {
    return (
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    );
  }

  return (
    <>
      {/* 版本标签 */}
      <button
        onClick={handleOpenChangelog}
        className="fixed bottom-3 left-3 z-40 px-2 py-1 backdrop-blur-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 hover:border-emerald-400/50 rounded-full text-[10px] font-medium text-emerald-400 hover:text-emerald-300 transition-all duration-300 flex items-center gap-1 animate-pulse"
        title="查看更新日志"
      >
        <Sparkles size={10} />
        <span>v{APP_VERSION}</span>
      </button>

      {/* 更新日志弹窗 */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </>
  );
}
