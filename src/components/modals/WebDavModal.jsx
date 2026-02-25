// WebDAV 配置弹窗组件
import { useState, useEffect } from 'react';
import { X, Upload, Download } from 'lucide-react';
import { DEFAULT_WEB_DAV_CONFIG } from '../../utils/constants';
import { normalizeWebDavConfig } from '../../utils/helpers';

export default function WebDavModal({ isOpen, onClose, initialConfig, onSaveConfig, onBackup, onRestore }) {
  const [formData, setFormData] = useState(DEFAULT_WEB_DAV_CONFIG);
  const [loadingAction, setLoadingAction] = useState('');

  useEffect(() => {
    setFormData(normalizeWebDavConfig(initialConfig));
  }, [initialConfig]);

  const runAction = async (actionName, actionFn) => {
    setLoadingAction(actionName);
    try {
      await actionFn(formData);
    } finally {
      setLoadingAction('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-white">WebDAV 手动备份</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">WebDAV 地址</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://dav.example.com/remote.php/dav/files/用户名"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="用户名"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="密码"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 font-medium mb-1.5 ml-1">备份文件路径</label>
            <input
              type="text"
              value={formData.filePath}
              onChange={(e) => setFormData(prev => ({ ...prev, filePath: e.target.value }))}
              placeholder="/my-nav-backup.json"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:bg-white/10 focus:outline-none text-sm font-mono"
            />
            <p className="text-[11px] text-white/40 mt-1 ml-1">会备份并恢复：标签页、分组、站点和背景图。</p>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onSaveConfig(formData)}
            disabled={loadingAction !== ''}
            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white text-sm font-medium transition"
          >
            保存配置
          </button>
          <button
            type="button"
            onClick={() => runAction('backup', onBackup)}
            disabled={loadingAction !== ''}
            className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
          >
            <Upload size={14} />
            {loadingAction === 'backup' ? '备份中...' : '上传备份'}
          </button>
          <button
            type="button"
            onClick={() => runAction('restore', onRestore)}
            disabled={loadingAction !== ''}
            className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            {loadingAction === 'restore' ? '恢复中...' : '从 WebDAV 恢复'}
          </button>
        </div>
      </div>
    </div>
  );
}
