import { useState, useEffect } from 'react';
import { Bot, Eye, EyeOff, Link2, Loader2, Save, Search, X } from 'lucide-react';
import { DEFAULT_AI_ASSISTANT_CONFIG } from '../../utils/constants';

export default function AiAssistantSettingsModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
  onFetchModels,
}) {
  const [formData, setFormData] = useState(DEFAULT_AI_ASSISTANT_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setFormData({
        ...DEFAULT_AI_ASSISTANT_CONFIG,
        ...initialConfig,
      });
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const canFetchModels = !!formData.baseUrl.trim() && !!formData.apiKey.trim();

  const updateFormData = (updater) => {
    setFormData(prev => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setFetchError('');
    try {
      const models = await onFetchModels?.({
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
      });
      setAvailableModels(models || []);
      if (models?.length && !models.includes(formData.model)) {
        setFormData(prev => ({ ...prev, model: models[0] }));
      }
    } catch (error) {
      setFetchError(error?.message || '获取模型失败');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = async () => {
    await onSave?.(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.12] shadow-[0_30px_80px_rgba(4,10,25,0.45)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Bot size={18} />
              AI 助手设置
            </h2>
            <p className="mt-1 text-xs text-white/45">这里的 Key、模型、提示词都会保存到 Firebase，跨设备自动同步。</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="custom-scrollbar max-h-[70vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 ml-1 block text-xs font-medium text-white/55">接口地址</label>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  value={formData.baseUrl}
                  onChange={(e) => updateFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://api.openai.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] py-2.5 pl-9 pr-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 ml-1 block text-xs font-medium text-white/55">API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => updateFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-xxxxxxxx"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 pr-11 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="ml-1 block text-xs font-medium text-white/55">模型</label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={fetchingModels || !canFetchModels}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {fetchingModels ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  一键获取模型
                </button>
              </div>
              {availableModels.length > 0 ? (
                <select
                  value={formData.model}
                  onChange={(e) => updateFormData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none [&>option]:bg-slate-900"
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => updateFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none"
                />
              )}
              {fetchError && <p className="mt-2 ml-1 text-xs text-red-300">{fetchError}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-xs font-medium text-white/55">系统提示词</label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => updateFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={8}
              placeholder="你是我的私人 AI 助手..."
              className="w-full resize-none rounded-[24px] border border-white/10 bg-white/[0.08] px-4 py-3 text-sm leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none"
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-sm text-white/65">
            <p>默认走 OpenAI 兼容接口。</p>
            <p className="mt-1">模型列表会请求：`你的地址 + /v1/models`。</p>
            <p className="mt-1">聊天会请求：`你的地址 + /v1/chat/completions`。</p>
            <p className="mt-1">联网搜索的开关和渠道已经放到聊天输入框上面。</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.04] px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500/80 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400"
          >
            <Save size={15} />
            直接保存
          </button>
        </div>
      </div>
    </div>
  );
}
