// 背景设置弹窗组件
import { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { DEFAULT_BG } from '../../utils/constants';

export default function BgModal({ isOpen, onClose, currentBg, onSave }) {
  const [url, setUrl] = useState(currentBg);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-md p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in-scale">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-cyan-400" />
            自定义背景
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入图片 URL 地址..."
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 mb-4 focus:border-cyan-500/50 focus:outline-none transition-all"
        />
        <div className="h-36 w-full rounded-2xl bg-cover bg-center mb-6 border border-white/20 shadow-inner overflow-hidden" style={{ backgroundImage: `url(${url})` }}>
          {!url && <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">预览区域</div>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { onSave(url); onClose(); }} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-medium transition-all shadow-lg shadow-cyan-900/30">
            应用
          </button>
          <button onClick={() => { onSave(DEFAULT_BG); onClose(); }} className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white/80 font-medium transition">
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
}
