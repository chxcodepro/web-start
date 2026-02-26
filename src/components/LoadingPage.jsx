import { Loader2 } from 'lucide-react';

/**
 * 加载状态页面组件
 */
export default function LoadingPage({ bgImage }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative text-white font-sans selection:bg-purple-500">
      <div
        className={`fixed inset-0 z-0 bg-cover bg-center ${!bgImage ? 'bg-gray-900' : ''}`}
        style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
      />
      <div className="fixed inset-0 z-0 bg-gray-900/50 backdrop-blur-none" />
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 size={48} className="animate-spin text-blue-400" />
        <p className="text-white/50 text-sm font-medium tracking-widest animate-pulse">
          正在从云端加载配置...
        </p>
      </div>
    </div>
  );
}
