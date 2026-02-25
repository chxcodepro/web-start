// 站点编辑弹窗组件
import { useState, useEffect } from 'react';
import { Plus, X, Check, List } from 'lucide-react';

export default function SiteModal({ isOpen, onClose, onSubmit, onBatchSubmit, initialData, groups }) {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    group: groups[0] || '默认',
    pinned: false,
  });
  // 批量模式数据
  const [batchName, setBatchName] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [batchGroup, setBatchGroup] = useState(groups[0] || '默认');
  const [batchPinned, setBatchPinned] = useState(false);

  // 编辑模式下禁用批量
  const isEditMode = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      const mergedUrl = initialData.url || initialData.innerUrl || '';
      setFormData({
        name: initialData.name || '',
        url: mergedUrl,
        group: initialData.group || groups[0] || '默认',
        pinned: !!initialData.pinned,
      });
      setIsBatchMode(false);
    } else {
      setFormData({
        name: '',
        url: '',
        group: groups[0] || '默认',
        pinned: false,
      });
      setBatchName('');
      setBatchUrls('');
      setBatchGroup(groups[0] || '默认');
      setBatchPinned(false);
    }
  }, [initialData, groups]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBatchSubmit = (e) => {
    e.preventDefault();
    // 解析多行网址
    const urls = batchUrls
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (urls.length === 0 || !batchName.trim()) return;

    // 构建站点列表，所有站点用同一个名称
    const sites = urls.map(url => ({
      name: batchName.trim(),
      url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
      group: batchGroup,
      pinned: batchPinned,
    }));

    if (onBatchSubmit) {
      onBatchSubmit(sites);
    }
  };

  // 计算批量模式下的网址数量
  const urlCount = batchUrls
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 animate-fade-in-scale">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Plus size={20} className="text-blue-400" />
            {isEditMode ? '编辑站点' : (isBatchMode ? '批量添加' : '添加站点')}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>

        {/* 模式切换（仅新增时显示） */}
        {!isEditMode && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setIsBatchMode(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                !isBatchMode
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              单个添加
            </button>
            <button
              type="button"
              onClick={() => setIsBatchMode(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                isBatchMode
                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              <List size={14} />
              批量添加
            </button>
          </div>
        )}

        {/* 单个添加表单 */}
        {!isBatchMode && (
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
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${formData.pinned ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
              onClick={() => setFormData({ ...formData, pinned: !formData.pinned })}
            >
              <div className={`flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all ${formData.pinned ? 'bg-yellow-500 border-yellow-500' : 'border-white/30'}`}>
                {formData.pinned && <Check size={12} className="text-black" />}
              </div>
              <span className="text-sm text-white/80 select-none">置顶显示</span>
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition font-medium">
                取消
              </button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-medium transition-all shadow-lg shadow-blue-900/40">
                保存
              </button>
            </div>
          </form>
        )}

        {/* 批量添加表单 */}
        {isBatchMode && (
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 font-medium mb-2 ml-1">名称 <span className="text-white/30">（统一）</span></label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:border-violet-500/50 focus:bg-white/15 focus:outline-none transition-all"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  placeholder="例如: 镜像站"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 font-medium mb-2 ml-1">分组</label>
                <select
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-violet-500/50 focus:outline-none appearance-none cursor-pointer"
                  value={batchGroup}
                  onChange={e => setBatchGroup(e.target.value)}
                >
                  {groups.map(g => <option key={g} value={g} className="bg-gray-900 text-white">{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 font-medium mb-2 ml-1">
                网址列表 <span className="text-white/30">（一行一个）</span>
              </label>
              <textarea
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:border-violet-500/50 focus:bg-white/15 focus:outline-none font-mono text-sm transition-all resize-none"
                rows={5}
                value={batchUrls}
                onChange={e => setBatchUrls(e.target.value)}
                placeholder={`https://example1.com\nhttps://example2.com\nexample3.com`}
              />
              {urlCount > 0 && (
                <p className="text-[10px] text-violet-300 mt-1.5 ml-1">已输入 {urlCount} 个网址</p>
              )}
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${batchPinned ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
              onClick={() => setBatchPinned(!batchPinned)}
            >
              <div className={`flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all ${batchPinned ? 'bg-yellow-500 border-yellow-500' : 'border-white/30'}`}>
                {batchPinned && <Check size={12} className="text-black" />}
              </div>
              <span className="text-sm text-white/80 select-none">全部置顶</span>
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition font-medium">
                取消
              </button>
              <button
                type="submit"
                disabled={urlCount === 0 || !batchName.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-violet-900/40"
              >
                添加 {urlCount > 0 ? `${urlCount} 个站点` : ''}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
