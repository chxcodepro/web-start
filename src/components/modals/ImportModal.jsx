// 书签导入弹窗组件
import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';

export default function ImportModal({ isOpen, onClose, importData, existingGroups, onConfirm }) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (isOpen && existingGroups.length > 0) {
      setSelectedGroup(existingGroups[0]);
      setIsNewGroup(false);
      setNewGroupName('');
    }
  }, [isOpen, existingGroups]);

  if (!isOpen || !importData) return null;

  const handleConfirm = () => {
    if (isNewGroup) {
      onConfirm(newGroupName.trim(), true);
    } else {
      onConfirm(selectedGroup, false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-md p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in-scale">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload size={20} className="text-violet-400" />
            导入书签
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>

        {/* 解析结果统计 */}
        <div className="mb-5 p-4 backdrop-blur-sm bg-gradient-to-r from-violet-500/20 to-indigo-500/20 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-violet-300">{importData.sites.length}</span>
            </div>
            <div>
              <p className="text-white font-medium">个书签待导入</p>
              <p className="text-white/50 text-xs">选择目标分组后导入</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 font-medium mb-3 ml-1">选择目标分组</label>
            <div className="space-y-3">
              {/* 选择现有分组 */}
              <label
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  !isNewGroup ? 'bg-white/15 border border-indigo-500/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setIsNewGroup(false)}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  !isNewGroup ? 'border-indigo-500 bg-indigo-500' : 'border-white/30'
                }`}>
                  {!isNewGroup && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-white/90 text-sm font-medium">选择现有分组</span>
              </label>
              {!isNewGroup && (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none appearance-none cursor-pointer"
                >
                  {existingGroups.map(g => (
                    <option key={g} value={g} className="bg-gray-900 text-white">{g}</option>
                  ))}
                </select>
              )}

              {/* 新建分组 */}
              <label
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isNewGroup ? 'bg-white/15 border border-indigo-500/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setIsNewGroup(true)}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isNewGroup ? 'border-indigo-500 bg-indigo-500' : 'border-white/30'
                }`}>
                  {isNewGroup && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-white/90 text-sm font-medium">新建分组</span>
              </label>
              {isNewGroup && (
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="输入新分组名称..."
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:border-indigo-500/50 focus:outline-none transition-all"
                  autoFocus
                />
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition font-medium">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isNewGroup && !newGroupName.trim()}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-violet-900/40"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}
