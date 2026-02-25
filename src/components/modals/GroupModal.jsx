// 分组管理弹窗组件
import { useState } from 'react';
import { X, Check, Edit2, Trash2, LayoutGrid } from 'lucide-react';

export default function GroupModal({ isOpen, onClose, groups, onAdd, onRemove, onRename, onMove, showToast }) {
  const [newGroup, setNewGroup] = useState('');
  const [editingGroup, setEditingGroup] = useState('');
  const [editingName, setEditingName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);

  const startEditGroup = (name) => {
    setEditingGroup(name);
    setEditingName(name);
  };

  const handleSaveGroupName = () => {
    const ok = onRename(editingGroup, editingName);
    if (!ok) return;
    showToast('分组名称已保存', 'success');
    setEditingGroup('');
    setEditingName('');
  };

  const toggleGroupSelection = (groupName) => {
    setSelectedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const toggleSelectAll = () => {
    if (selectedGroups.length === groups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups([...groups]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedGroups.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedGroups.length} 个分组吗？`)) return;
    selectedGroups.forEach(g => onRemove(g));
    setSelectedGroups([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]" onClick={onClose} />
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl w-full max-w-md p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in-scale">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutGrid size={20} className="text-indigo-400" />
            分组管理
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <X size={18} className="text-white/70 hover:text-white" />
          </button>
        </div>
        {/* 添加新分组 */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newGroup}
            onChange={e => setNewGroup(e.target.value)}
            placeholder="新分组名称..."
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:border-indigo-500/50 focus:bg-white/15 focus:outline-none transition-all"
          />
          <button
            onClick={() => {
              const ok = onAdd(newGroup);
              if (!ok) return;
              setNewGroup('');
            }}
            disabled={!newGroup}
            className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-green-900/30"
          >
            添加
          </button>
        </div>
        {/* 全选/删除选中 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-white/60 hover:text-white transition flex items-center gap-2 group"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedGroups.length === groups.length && groups.length > 0 ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30' : 'border-white/30 group-hover:border-white/50'}`}>
              {selectedGroups.length === groups.length && groups.length > 0 && <Check size={10} className="text-white" />}
            </div>
            {selectedGroups.length === groups.length && groups.length > 0 ? '取消全选' : '全选'}
          </button>
          {selectedGroups.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg"
            >
              <Trash2 size={12} />
              删除选中 ({selectedGroups.length})
            </button>
          )}
        </div>
        {/* 分组列表 */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {groups.map((g, index) => (
            <div key={g} className="backdrop-blur-sm bg-white/5 p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group">
              {editingGroup === g ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    placeholder="输入新分组名称"
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveGroupName} className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-900/30">保存</button>
                    <button onClick={() => { setEditingGroup(''); setEditingName(''); }} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-xs transition">取消</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleGroupSelection(g)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedGroups.includes(g)
                          ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30'
                          : 'border-white/30 hover:border-white/50'
                      }`}
                    >
                      {selectedGroups.includes(g) && <Check size={12} className="text-white" />}
                    </button>
                    <span className="text-white font-medium">{g}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onMove(g, 'up')}
                      disabled={index === 0}
                      className="px-2 py-1 text-[11px] text-white/70 hover:text-white disabled:opacity-30 transition rounded-md hover:bg-white/10"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => onMove(g, 'down')}
                      disabled={index === groups.length - 1}
                      className="px-2 py-1 text-[11px] text-white/70 hover:text-white disabled:opacity-30 transition rounded-md hover:bg-white/10"
                    >
                      ↓
                    </button>
                    <button onClick={() => startEditGroup(g)} className="text-white/50 hover:text-blue-400 p-1.5 transition rounded-lg hover:bg-white/10" title="重命名"><Edit2 size={14} /></button>
                    <button onClick={() => onRemove(g)} className="text-white/50 hover:text-red-400 p-1.5 transition rounded-lg hover:bg-white/10" title="删除"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="text-center py-8 text-white/40 text-sm">
              暂无分组，请添加一个
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
