import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Bot,
  Loader2,
  MessageSquarePlus,
  Send,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

const formatTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const searchModeLabel = {
  duckduckgo: 'DuckDuckGo 搜索',
  exa: 'Exa 搜索',
  openai: 'OpenAI 原生搜索',
};

const pickSearchConfig = (config = {}) => ({
  enableWebSearch: config.enableWebSearch !== false,
  searchMode: String(config.searchMode || 'duckduckgo').trim(),
  searchApiKey: String(config.searchApiKey || ''),
});

export default function AiAssistantPage({
  visible,
  onClose,
  isLoggedIn,
  onRequireLogin,
  aiConfig,
  conversations,
  activeConversation,
  activeConversationId,
  setActiveConversationId,
  onCreateConversation,
  onDeleteConversation,
  onSendMessage,
  onSaveConfig,
  onOpenSettings,
  streamingConversationId,
}) {
  const [draft, setDraft] = useState('');
  const [searchConfig, setSearchConfig] = useState(() => pickSearchConfig(aiConfig));
  const [savingSearchConfig, setSavingSearchConfig] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchPanelRef = useRef(null);

  useEffect(() => {
    setSearchConfig(pickSearchConfig(aiConfig));
  }, [aiConfig]);

  useEffect(() => {
    if (!showSearchPanel) return undefined;

    const handlePointerDown = (event) => {
      if (searchPanelRef.current?.contains(event.target)) return;
      setShowSearchPanel(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showSearchPanel]);

  const emptyHint = useMemo(() => {
    if (!isLoggedIn) return '登录后才能使用 AI 助手。';
    if (!activeConversation) return '默认话题准备中，等一下就能直接发消息。';
    return '问点什么，比如让它帮你查资料、写提示词、整理链接。';
  }, [activeConversation, isLoggedIn]);

  const isStreaming = Boolean(streamingConversationId);
  const searchConfigDirty = JSON.stringify(searchConfig) !== JSON.stringify(pickSearchConfig(aiConfig));

  const submitDraft = async () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await onSendMessage?.(text, searchConfig);
    } catch {
      // 提示由上层处理
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitDraft();
  };

  const handleDraftKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!draft.trim() || isStreaming) return;
    void submitDraft();
  };

  const handleSaveSearchConfig = async () => {
    setSavingSearchConfig(true);
    try {
      await onSaveConfig?.({
        ...aiConfig,
        ...searchConfig,
      });
      setShowSearchPanel(false);
    } catch {
      // 提示由上层处理
    } finally {
      setSavingSearchConfig(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[70] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      visible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
    }`}>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
      <div className="relative z-10 flex h-full flex-col text-white">
        <div className="border-b border-white/10 bg-white/[0.1] backdrop-blur-2xl">
          <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/[0.08] p-2 text-white/75 transition hover:bg-white/[0.14] hover:text-white"
              >
                <ArrowDown size={18} />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-lg font-bold">
                  <Sparkles size={18} className="text-cyan-300" />
                  AI 助手
                </h1>
                <p className="text-xs text-white/45">背景沿用当前页面，聊天、配置、会话都会同步到 Firebase。</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isLoggedIn) return onRequireLogin?.();
                  onCreateConversation?.();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.14] hover:text-white"
              >
                <MessageSquarePlus size={15} />
                新建对话
              </button>
              <button
                onClick={() => {
                  if (!isLoggedIn) return onRequireLogin?.();
                  onOpenSettings?.();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.14] hover:text-white"
              >
                <Settings size={15} />
                设置
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-[1700px] gap-4 px-4 py-4 md:px-8">
          <aside className="hidden w-[320px] shrink-0 overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_54px_rgba(4,10,25,0.22)] backdrop-blur-2xl lg:flex lg:flex-col">
            <div className="border-b border-white/10 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/35">会话列表</p>
              <p className="mt-2 text-sm text-white/55">{conversations.length} 个对话</p>
            </div>
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
              {conversations.map((conversation) => {
                const preview = conversation.messages?.[conversation.messages.length - 1]?.content || '还没有消息';
                const active = conversation.id === activeConversationId;
                return (
                  <div
                    key={conversation.id}
                    className={`w-full rounded-[22px] border px-3 py-3 text-left transition ${
                      active
                        ? 'border-cyan-300/25 bg-cyan-400/10 shadow-[0_18px_40px_rgba(14,116,144,0.18)]'
                        : 'border-white/8 bg-white/[0.05] hover:bg-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveConversationId?.(conversation.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-white/90">{conversation.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{preview}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteConversation?.(conversation.id);
                        }}
                        className="rounded-full p-1.5 text-white/30 transition hover:bg-white/10 hover:text-red-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] text-white/30">{formatTime(conversation.updatedAt || conversation.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_60px_rgba(4,10,25,0.26)] backdrop-blur-2xl">
            <div className="border-b border-white/10 bg-white/[0.05] px-5 py-4">
              <h2 className="text-base font-semibold text-white/90">{activeConversation?.title || 'AI 助手'}</h2>
              <p className="mt-1 text-xs text-white/45">
                当前模型：{aiConfig?.model || '未设置'} {aiConfig?.enableWebSearch ? `· ${searchModeLabel[aiConfig?.searchMode] || '联网搜索已开启'}` : '· 联网搜索已关闭'}
              </p>
            </div>

            <div className="custom-scrollbar flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3 lg:hidden">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId?.(conversation.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                    conversation.id === activeConversationId
                      ? 'border-cyan-300/25 bg-cyan-400/10 text-white'
                      : 'border-white/10 bg-white/[0.06] text-white/55'
                  }`}
                >
                  {conversation.title}
                </button>
              ))}
            </div>

            <div data-ai-scrollable className="custom-scrollbar flex-1 overflow-y-auto px-4 py-5 md:px-6">
              {!activeConversation?.messages?.length ? (
                <div className="flex h-full min-h-[360px] items-center justify-center">
                  <div className="max-w-xl rounded-[30px] border border-white/10 bg-white/[0.06] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                      <Bot size={24} />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-white">AI 助手待命中</h3>
                    <p className="mt-3 text-sm leading-7 text-white/55">{emptyHint}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[86%] rounded-[28px] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${
                        message.role === 'user'
                          ? 'border-cyan-300/15 bg-cyan-400/10 text-white'
                          : 'border-white/10 bg-white/[0.07] text-white/85'
                      }`}>
                        <div className="whitespace-pre-wrap break-words text-sm leading-7">{message.content || '...'}</div>
                        {message.sources?.length > 0 && (
                          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/10 p-3">
                            <p className="text-xs font-medium text-cyan-200/90">联网搜索结果</p>
                            <div className="mt-2 space-y-2">
                              {message.sources.map((source, index) => (
                                <a
                                  key={`${source.url}-${index}`}
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-2xl bg-white/[0.05] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                                >
                                  <div className="font-medium text-white/85">{source.title}</div>
                                  <div className="mt-1 line-clamp-2 leading-5 text-white/45">{source.snippet}</div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-white/[0.05] p-4 md:p-5">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  placeholder={isLoggedIn ? '给 AI 助手发条消息...' : '请先登录后再使用 AI 助手'}
                  rows={3}
                  disabled={isStreaming}
                  className="w-full resize-none rounded-[26px] border border-white/10 bg-white/[0.08] px-4 py-3 text-sm leading-7 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-white/35">回车发送，Shift + 回车换行。向下滚动可以返回导航页。</p>
                  <div className="relative flex items-center gap-2" ref={searchPanelRef}>
                    <button
                      type="button"
                      onClick={() => setShowSearchPanel(prev => !prev)}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm text-white transition ${
                        showSearchPanel || searchConfig.enableWebSearch
                          ? 'border-cyan-300/20 bg-cyan-500/12'
                          : 'border-white/10 bg-white/[0.08] hover:bg-white/[0.14]'
                      }`}
                    >
                      <Search size={14} />
                      联网搜索
                    </button>
                    {showSearchPanel && (
                      <div className="absolute bottom-full right-0 z-20 mb-2 w-[320px] rounded-[24px] border border-white/10 bg-slate-950/95 p-4 shadow-[0_24px_60px_rgba(4,10,25,0.42)] backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white/88">联网搜索</p>
                            <p className="mt-1 text-xs text-white/45">这里改的是聊天时用的搜索方式。</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSearchPanel(false)}
                            className="rounded-full p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-xs text-white/60">启用联网搜索</span>
                          <button
                            type="button"
                            onClick={() => setSearchConfig(prev => ({ ...prev, enableWebSearch: !prev.enableWebSearch }))}
                            className={`relative h-6 w-11 rounded-full transition ${
                              searchConfig.enableWebSearch ? 'bg-cyan-500/70' : 'bg-white/20'
                            }`}
                          >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                              searchConfig.enableWebSearch ? 'left-[22px]' : 'left-0.5'
                            }`} />
                          </button>
                        </div>

                        {searchConfig.enableWebSearch && (
                          <>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {[
                                { key: 'duckduckgo', label: 'DuckDuckGo' },
                                { key: 'exa', label: 'Exa' },
                                { key: 'openai', label: 'OpenAI 原生' },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => setSearchConfig(prev => ({ ...prev, searchMode: item.key }))}
                                  className={`rounded-2xl border px-3 py-2 text-xs transition ${
                                    searchConfig.searchMode === item.key
                                      ? 'border-cyan-300/25 bg-cyan-500/15 text-white'
                                      : 'border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>

                            {searchConfig.searchMode === 'exa' && (
                              <div className="mt-4 space-y-2">
                                <label className="block text-xs text-white/55">Exa 搜索 Key</label>
                                <input
                                  type="password"
                                  value={searchConfig.searchApiKey}
                                  onChange={(event) => setSearchConfig(prev => ({ ...prev, searchApiKey: event.target.value }))}
                                  placeholder="不填就复用上面的主 API Key"
                                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl focus:border-cyan-400/70 focus:bg-white/[0.12] focus:outline-none"
                                />
                              </div>
                            )}

                            <p className="mt-4 text-xs text-white/45">
                              {searchConfig.searchMode === 'duckduckgo' && 'DuckDuckGo 不用额外 Key，兼容性最好。'}
                              {searchConfig.searchMode === 'exa' && 'Exa 结果更干净，没填搜索 Key 就会复用主 API Key。'}
                              {searchConfig.searchMode === 'openai' && 'OpenAI 原生搜索要求接口本身支持 Responses 和 web search。'}
                            </p>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={handleSaveSearchConfig}
                          disabled={savingSearchConfig || !searchConfigDirty}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm text-white transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingSearchConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          {savingSearchConfig ? '保存中...' : searchConfigDirty ? '保存联网配置' : '已保存'}
                        </button>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={!draft.trim() || isStreaming}
                      className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={14} />
                      {isStreaming ? '生成中...' : '发送'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
