import { useState, useEffect, useMemo } from 'react';
import { Bot, Eye, EyeOff, Link2, Loader2, Save, Search, X } from 'lucide-react';
import { DEFAULT_AI_ASSISTANT_CONFIG } from '../../utils/constants';

export default function AiAssistantSettingsModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
  onFetchModels,
  onValidate,
}) {
  const [formData, setFormData] = useState(DEFAULT_AI_ASSISTANT_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [fetchError, setFetchError] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    if (initialConfig) {
      setFormData({
        ...DEFAULT_AI_ASSISTANT_CONFIG,
        ...initialConfig,
      });
      setValidationResult(null);
    }
  }, [initialConfig]);

  const fingerprint = useMemo(() => JSON.stringify(formData), [formData]);

  useEffect(() => {
    setValidationResult(null);
  }, [fingerprint]);

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

  const runValidation = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await onValidate?.(formData);
      const message = [result?.message || '验证通过', result?.searchMessage || ''].filter(Boolean).join('，');
      setValidationResult({ ok: true, message });
      return true;
    } catch (error) {
      setValidationResult({ ok: false, message: error?.message || '验证失败' });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    const passed = await runValidation();
    if (!passed) return;
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
            <div className="mb-2 flex items-center justify-between">
              <label className="ml-1 block text-xs font-medium text-white/55">联网搜索</label>
              <button
                type="button"
                onClick={() => updateFormData(prev => ({ ...prev, enableWebSearch: !prev.enableWebSearch }))}
                className={`relative h-6 w-11 rounded-full transition ${
                  formData.enableWebSearch ? 'bg-cyan-500/70' : 'bg-white/20'
                }`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  formData.enableWebSearch ? 'left-[22px]' : 'left-0.5'
                }`} />
              </button>
            </div>
            <p className="ml-1 text-[11px] text-white/40">开启后，聊天前会先走一次联网搜索，把结果带进模型上下文。</p>
          </div>

          {formData.enableWebSearch && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 ml-1 block text-xs font-medium text-white/55">搜索模式</label>
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { key: 'duckduckgo', label: 'DuckDuckGo' },
                    { key: 'exa', label: 'Exa' },
                    { key: 'openai', label: 'OpenAI 原生' },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateFormData(prev => ({ ...prev, searchMode: item.key }))}
                      className={`rounded-2xl border px-3 py-2.5 text-sm transition ${
                        formData.searchMode === item.key
                          ? 'border-cyan-300/25 bg-cyan-500/15 text-white'
                          : 'border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.searchMode === 'exa' && (
                <div className="md:col-span-2">
                  <label className="mb-1.5 ml-1 block text-xs font-medium text-white/55">Exa 搜索 Key</label>
                  <input
                    type="password"
                    value={formData.searchApiKey || ''}
                    onChange={(e) => updateFormData(prev => ({ ...prev, searchApiKey: e.target.value }))}
                    placeholder="不填就复用上面的主 API Key"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none"
                  />
                </div>
              )}

              <div className="md:col-span-2 rounded-[22px] border border-white/10 bg-white/[0.06] p-3 text-[12px] leading-6 text-white/50">
                {formData.searchMode === 'duckduckgo' && '服务端先去 DuckDuckGo 搜索，再把结果喂给模型，兼容性最好。'}
                {formData.searchMode === 'exa' && '服务端用 Exa 搜索，再把结果喂给模型，结果更干净，但需要 Exa Key。'}
                {formData.searchMode === 'openai' && '直接走 OpenAI Responses 的原生 web search，只有支持该能力的接口才能正常工作。'}
              </div>
            </div>
          )}

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
            <p className="mt-1">保存前会自动验证，验证通过才会写入 Firebase。</p>
          </div>

          {validationResult && (
            <div className={`rounded-[22px] border px-4 py-3 text-sm ${
              validationResult.ok
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                : 'border-red-400/20 bg-red-500/10 text-red-200'
            }`}>
              {validationResult.message}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/10 bg-white/[0.04] px-5 py-4">
          <button
            type="button"
            onClick={runValidation}
            disabled={validating}
            className="flex-1 rounded-2xl bg-white/10 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {validating ? '验证中...' : '验证配置'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={validating}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-500/80 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {validating ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            验证并保存
          </button>
        </div>
      </div>
    </div>
  );
}
