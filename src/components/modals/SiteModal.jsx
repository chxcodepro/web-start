// 站点编辑弹窗组件
import { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';

export default function SiteModal({ isOpen, onClose, onSubmit, initialData, groups }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    group: groups[0] || '默认',
    pinned: false,
  });

  useEffect(() => {
    if (initialData) {
      // 兼容旧数据：优先用url，没有则用innerUrl
      const mergedUrl = initialData.url || initialData.innerUrl || '';
      setFormData({
        name: initialData.name || '',
        url: mergedUrl,
        group: initialData.group || groups[0] || '默认',
        pinned: !!initialData.pinned,
      });
    } else {
      setFormData({
        name: '',
        url: '',
        group: groups[0] || '默认',
        pinned: false,
      });
    }
  }, [initialData, groups]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 animate-fade-in-scale">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Plus size={20} className="text-blue-400" />
            {initialData?.id ? '编辑站点' : '添加站点'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 font-medium mb-2 ml-1">名称</label>
              <input
                type="text"
                required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:border-blue-500/50 focus:bg-white/15 focus:outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: Jellyfin"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 font-medium mb-2 ml-1">分组</label>
              <select
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none appearance-none cursor-pointer"
                value={formData.group}
                onChange={e => setFormData({ ...formData, group: e.target.value })}
              >
                {groups.map(g => <option key={g} value={g} className="bg-gray-900 text-white">{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 font-medium mb-2 ml-1">网址</label>
            <input
              type="text"
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:border-blue-500/50 focus:bg-white/15 focus:outline-none font-mono text-sm transition-all"
              value={formData.url}
              onChange={e => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-[10px] text-white/30 mt-1.5 ml-1">图标将自动从网址获取</p>
          </div>
          {/* 置顶选项 */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${formData.pinned ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
            onClick={() => setFormData({ ...formData, pinned: !formData.pinned })}
          >
            <div className={`flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all ${formData.pinned ? 'bg-yellow-500 border-yellow-500' : 'border-white/30'}`}>
              {formData.pinned && <Check size={12} className="text-black" />}
            </div>
            <span className="text-sm text-white/80 select-none">置顶显示</span>
          </div>
          {/* 操作按钮 */}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition font-medium">
              取消
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-medium transition-all shadow-lg shadow-blue-900/40">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
