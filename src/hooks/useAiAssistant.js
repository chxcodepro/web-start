import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_AI_ASSISTANT_CONFIG } from '../utils/constants';

const CONFIG_DOC = doc(db, 'ai_assistant', 'main');
const CONVERSATIONS_COLLECTION = collection(db, 'ai_assistant_conversations');

const normalizeConversation = (snapshot) => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    title: data.title || '新对话',
    messages: Array.isArray(data.messages) ? data.messages : [],
    createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
  };
};

const createMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt: Date.now(),
  ...extra,
});

const buildTitle = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '新对话';
  return trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed;
};

const finalizeStreamingMessages = (messages, extra = {}) => (
  (Array.isArray(messages) ? messages : []).map(item => (
    item?.streaming
      ? { ...item, streaming: false, ...extra }
      : item
  ))
);

export function useAiAssistant({ user, getApiAuthHeaders, showToast }) {
  const [aiConfig, setAiConfig] = useState(DEFAULT_AI_ASSISTANT_CONFIG);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [streamingConversationId, setStreamingConversationId] = useState('');
  const staleStreamingCleanedRef = useRef(false);
  const streamingDraftRef = useRef(null);

  const replaceConversation = useCallback((conversationId, updater) => {
    setConversations((prev) => {
      const index = prev.findIndex(item => item.id === conversationId);
      if (index === -1) {
        const nextItem = typeof updater === 'function'
          ? updater({ id: conversationId, title: '新对话', messages: [] })
          : { id: conversationId, title: '新对话', messages: [], ...updater };
        return [nextItem, ...prev];
      }
      return prev.map(item => (
        item.id === conversationId
          ? (typeof updater === 'function' ? updater(item) : { ...item, ...updater })
          : item
      ));
    });
  }, []);

  useEffect(() => {
    if (!user) {
      staleStreamingCleanedRef.current = false;
      streamingDraftRef.current = null;
      setAiConfig(DEFAULT_AI_ASSISTANT_CONFIG);
      setConversations([]);
      setActiveConversationId('');
      setConfigLoaded(true);
      setConversationsLoaded(true);
      return undefined;
    }

    staleStreamingCleanedRef.current = false;
    streamingDraftRef.current = null;
    setConfigLoaded(false);
    setConversationsLoaded(false);

    const unsubscribeConfig = onSnapshot(
      CONFIG_DOC,
      (snapshot) => {
        const data = snapshot.data() || {};
        setAiConfig({
          ...DEFAULT_AI_ASSISTANT_CONFIG,
          ...(data.config || {}),
        });
        setConfigLoaded(true);
      },
      () => {
        setConfigLoaded(true);
      }
    );

    const unsubscribeConversations = onSnapshot(
      query(CONVERSATIONS_COLLECTION, orderBy('updatedAt', 'desc')),
      (snapshot) => {
        const next = snapshot.docs.map(normalizeConversation);
        const localStreamingConversation = streamingDraftRef.current;
        if (!localStreamingConversation?.id) {
          setConversations(next);
          setConversationsLoaded(true);
          return;
        }

        const hasStreamingConversation = next.some(item => item.id === localStreamingConversation.id);
        const mergedConversations = hasStreamingConversation
          ? next.map(item => (
              item.id === localStreamingConversation.id
                ? { ...item, ...localStreamingConversation, messages: localStreamingConversation.messages }
                : item
            ))
          : [localStreamingConversation, ...next];

        setConversations(mergedConversations);
        setConversationsLoaded(true);
      },
      () => {
        setConversationsLoaded(true);
      }
    );

    return () => {
      unsubscribeConfig();
      unsubscribeConversations();
    };
  }, [user]);

  useEffect(() => {
    if (!conversations.length) {
      if (activeConversationId) {
        setActiveConversationId('');
      }
      return;
    }
    if (!activeConversationId || !conversations.some(item => item.id === activeConversationId)) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find(item => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const aiLoaded = configLoaded && conversationsLoaded;

  const saveAiConfig = useCallback(async (nextConfig) => {
    if (!user) {
      throw new Error('请先登录管理员账号');
    }
    const normalized = {
      ...DEFAULT_AI_ASSISTANT_CONFIG,
      ...nextConfig,
    };
    await setDoc(CONFIG_DOC, { config: normalized }, { merge: true });
    setAiConfig(normalized);
    showToast('AI 助手配置已保存');
  }, [user, showToast]);

  const createConversation = useCallback(async (seedText = '', options = {}) => {
    if (!user) {
      throw new Error('请先登录管理员账号');
    }
    const title = String(options.title || '').trim() || buildTitle(seedText);
    const ref = await addDoc(CONVERSATIONS_COLLECTION, {
      title,
      messages: Array.isArray(options.messages) ? options.messages : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setActiveConversationId(ref.id);
    return ref.id;
  }, [user]);

  const deleteConversation = useCallback(async (conversationId) => {
    if (!conversationId) return;
    await deleteDoc(doc(db, 'ai_assistant_conversations', conversationId));
    showToast('对话已删除');
  }, [showToast]);

  const updateConversationMessages = useCallback(async (conversationId, messages, title) => {
    await updateDoc(doc(db, 'ai_assistant_conversations', conversationId), {
      title,
      messages,
      updatedAt: serverTimestamp(),
    });
  }, []);

  useEffect(() => {
    if (!user || !conversationsLoaded || streamingConversationId || staleStreamingCleanedRef.current) return;

    const staleConversations = conversations.filter(conversation => (
      Array.isArray(conversation.messages) && conversation.messages.some(message => message?.streaming)
    ));

    if (!staleConversations.length) {
      staleStreamingCleanedRef.current = true;
      return;
    }

    staleConversations.forEach((conversation) => {
      const cleanedMessages = finalizeStreamingMessages(conversation.messages);
      replaceConversation(conversation.id, {
        ...conversation,
        messages: cleanedMessages,
      });
      void updateConversationMessages(conversation.id, cleanedMessages, conversation.title).catch(() => {
        // 忽略收尾失败，下次进入继续清理
      });
    });
    staleStreamingCleanedRef.current = true;
  }, [conversations, conversationsLoaded, replaceConversation, streamingConversationId, updateConversationMessages, user]);

  const sendMessage = useCallback(async (text, configOverride = {}, replayMessageId = '') => {
    const content = String(text || '').trim();
    if (!content) return;
    if (!user) {
      throw new Error('请先登录管理员账号');
    }

    const effectiveAiConfig = {
      ...aiConfig,
      ...(configOverride || {}),
    };

    let conversationId = activeConversationId;
    let currentConversation = activeConversation;
    const currentMessages = currentConversation?.messages || [];
    const replayIndex = replayMessageId
      ? currentMessages.findIndex(item => item.id === replayMessageId && item.role === 'user')
      : -1;
    const isReplay = replayIndex >= 0;
    const replayUserMessage = isReplay ? { ...currentMessages[replayIndex], content } : null;
    const userMessage = replayUserMessage || createMessage('user', content);
    const assistantMessageId = isReplay
      ? `assistant-replay-${Date.now()}`
      : `assistant-${Date.now()}`;
    const baseMessages = isReplay ? currentMessages.slice(0, replayIndex) : currentMessages;
    const draftMessages = [
      ...baseMessages,
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '', createdAt: Date.now(), sources: [], streaming: true },
    ];
    const nextTitle = buildTitle(draftMessages.find(item => item.role === 'user')?.content || content);
    const applyLocalConversation = (messages, overrides = {}) => {
      const nextConversation = {
        ...currentConversation,
        id: conversationId,
        title: nextTitle,
        messages,
        ...overrides,
      };
      streamingDraftRef.current = nextConversation;
      replaceConversation(conversationId, nextConversation);
    };

    if (!conversationId || !currentConversation) {
      conversationId = await createConversation(content, {
        title: nextTitle,
        messages: draftMessages,
      });
      currentConversation = { id: conversationId, title: nextTitle, messages: [] };
    } else {
      await updateConversationMessages(conversationId, draftMessages, nextTitle);
    }

    applyLocalConversation(draftMessages);
    setActiveConversationId(conversationId);
    setStreamingConversationId(conversationId);

    let assistantContent = '';
    let assistantSources = [];
    let lastPersistAt = Date.now();
    let persistChain = Promise.resolve();
    let bufferedDelta = '';
    let flushDeltaTimer = 0;

    const buildMessagesSnapshot = (extra = {}) => draftMessages.map(item => (
      item.id === assistantMessageId
        ? {
            ...item,
            content: assistantContent,
            sources: assistantSources,
            ...extra,
          }
        : item
    ));

    const queuePersist = (messages) => {
      persistChain = persistChain
        .catch(() => {})
        .then(() => updateConversationMessages(conversationId, messages, nextTitle));
      return persistChain;
    };

    const flushBufferedDelta = () => {
      if (!bufferedDelta) return;
      assistantContent += bufferedDelta;
      bufferedDelta = '';
      applyLocalConversation(buildMessagesSnapshot({ streaming: true }));
      if (Date.now() - lastPersistAt >= 600) {
        lastPersistAt = Date.now();
        void queuePersist(buildMessagesSnapshot({ streaming: true }));
      }
    };

    const scheduleDeltaFlush = () => {
      if (flushDeltaTimer) return;
      flushDeltaTimer = globalThis.setTimeout(() => {
        flushDeltaTimer = 0;
        flushBufferedDelta();
      }, 48);
    };

    try {
      const headers = await getApiAuthHeaders();
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          config: effectiveAiConfig,
          messages: draftMessages
            .filter(item => item.role === 'user' || item.role === 'assistant')
            .map(item => ({ role: item.role, content: item.content || '' })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'AI 助手请求失败');
      }

      if (!response.body) {
        throw new Error('AI 助手未返回流式内容');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let reading = true;
      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          continue;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const event = JSON.parse(trimmed);
          if (event.type === 'sources' && Array.isArray(event.data)) {
            assistantSources = event.data;
            applyLocalConversation(buildMessagesSnapshot({ streaming: true }));
          }
          if (event.type === 'delta' && event.data) {
            bufferedDelta += event.data;
            scheduleDeltaFlush();
          }
          if (event.type === 'error') {
            throw new Error(event.data || 'AI 助手请求失败');
          }
        });
      }

      if (flushDeltaTimer) {
        globalThis.clearTimeout(flushDeltaTimer);
        flushDeltaTimer = 0;
      }
      flushBufferedDelta();

      const finalMessages = buildMessagesSnapshot({
        content: assistantContent || '没有收到有效回复',
        sources: assistantSources,
        streaming: false,
      });

      applyLocalConversation(finalMessages);
      await queuePersist(finalMessages);
    } catch (error) {
      if (flushDeltaTimer) {
        globalThis.clearTimeout(flushDeltaTimer);
        flushDeltaTimer = 0;
      }
      flushBufferedDelta();
      const fallbackContent = error?.message || '请求失败，请稍后重试。';
      const finalMessages = buildMessagesSnapshot({
        content: assistantContent || fallbackContent,
        sources: assistantSources,
        streaming: false,
        error: true,
      });
      applyLocalConversation(finalMessages);
      await queuePersist(finalMessages);
      showToast(fallbackContent, 'error');
      throw error;
    } finally {
      streamingDraftRef.current = null;
      setStreamingConversationId('');
    }
  }, [
    activeConversation,
    activeConversationId,
    aiConfig,
    createConversation,
    getApiAuthHeaders,
    replaceConversation,
    showToast,
    updateConversationMessages,
    user,
  ]);

  return {
    aiConfig,
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    isAiSettingsOpen,
    setIsAiSettingsOpen,
    aiLoaded,
    streamingConversationId,
    saveAiConfig,
    createConversation,
    deleteConversation,
    sendMessage,
  };
}
