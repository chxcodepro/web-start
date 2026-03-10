import { useState, useEffect, useMemo, useCallback } from 'react';
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

export function useAiAssistant({ user, getApiAuthHeaders, showToast }) {
  const [aiConfig, setAiConfig] = useState(DEFAULT_AI_ASSISTANT_CONFIG);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [streamingConversationId, setStreamingConversationId] = useState('');

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
      setAiConfig(DEFAULT_AI_ASSISTANT_CONFIG);
      setConversations([]);
      setActiveConversationId('');
      setConfigLoaded(true);
      setConversationsLoaded(true);
      return undefined;
    }

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
        setConversations(next);
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
      messages: [],
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

  const sendMessage = useCallback(async (text, configOverride = {}) => {
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

    if (!conversationId || !currentConversation) {
      conversationId = await createConversation(content);
      currentConversation = { id: conversationId, title: buildTitle(content), messages: [] };
    }

    const userMessage = createMessage('user', content);
    const assistantMessageId = `assistant-${Date.now()}`;
    const draftMessages = [
      ...(currentConversation.messages || []),
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '', createdAt: Date.now(), sources: [], streaming: true },
    ];
    const nextTitle = currentConversation.messages?.length ? currentConversation.title : buildTitle(content);

    replaceConversation(conversationId, {
      ...currentConversation,
      title: nextTitle,
      messages: draftMessages,
    });
    setActiveConversationId(conversationId);
    setStreamingConversationId(conversationId);

    let assistantContent = '';
    let assistantSources = [];

    try {
      const headers = await getApiAuthHeaders();
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          config: effectiveAiConfig,
          messages: draftMessages
            .filter(item => item.role === 'user' || item.role === 'assistant')
            .map(item => ({ role: item.role, content: item.content })),
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
            replaceConversation(conversationId, (conversation) => ({
              ...conversation,
              messages: conversation.messages.map(item => (
                item.id === assistantMessageId
                  ? { ...item, sources: assistantSources }
                  : item
              )),
            }));
          }
          if (event.type === 'delta' && event.data) {
            assistantContent += event.data;
            replaceConversation(conversationId, (conversation) => ({
              ...conversation,
              messages: conversation.messages.map(item => (
                item.id === assistantMessageId
                  ? { ...item, content: assistantContent, sources: assistantSources }
                  : item
              )),
            }));
          }
          if (event.type === 'error') {
            throw new Error(event.data || 'AI 助手请求失败');
          }
        });
      }

      const finalMessages = draftMessages.map(item => (
        item.id === assistantMessageId
          ? { ...item, content: assistantContent || '没有收到有效回复', sources: assistantSources, streaming: false }
          : item
      ));

      replaceConversation(conversationId, {
        ...currentConversation,
        title: nextTitle,
        messages: finalMessages,
      });
      await updateConversationMessages(conversationId, finalMessages, nextTitle);
    } catch (error) {
      const fallbackContent = error?.message || '请求失败，请稍后重试。';
      const finalMessages = draftMessages.map(item => (
        item.id === assistantMessageId
          ? { ...item, content: fallbackContent, sources: assistantSources, streaming: false, error: true }
          : item
      ));
      replaceConversation(conversationId, {
        ...currentConversation,
        title: nextTitle,
        messages: finalMessages,
      });
      await updateConversationMessages(conversationId, finalMessages, nextTitle);
      showToast(fallbackContent, 'error');
      throw error;
    } finally {
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
