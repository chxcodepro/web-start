import { verifyRequestAuth } from './_auth.js';
import {
  buildChatUrl,
  buildResponsesUrl,
  buildSearchContext,
  extractDeltaText,
  normalizeBaseUrl,
  sanitizeMessages,
  searchWeb,
  searchWithExa,
} from './_ai.js';

const writeEvent = (res, payload) => {
  res.write(`${JSON.stringify(payload)}\n`);
};

const writeSearchStatus = (res, payload) => {
  writeEvent(res, { type: 'search_status', data: payload });
};

const extractTextFromContent = (content) => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        if (typeof item?.content === 'string') return item.content;
        if (typeof item?.value === 'string') return item.value;
        return '';
      })
      .join('');
  }

  if (typeof content?.text === 'string') {
    return content.text;
  }

  return '';
};

const extractTextFromOutput = (output = []) => (
  (Array.isArray(output) ? output : [])
    .map((item) => {
      if (typeof item?.text === 'string') return item.text;
      if (typeof item?.content === 'string') return item.content;
      if (Array.isArray(item?.content)) {
        return extractTextFromContent(item.content);
      }
      if (Array.isArray(item?.output)) {
        return extractTextFromOutput(item.output);
      }
      return '';
    })
    .join('')
);

const extractEventText = (payload, currentEvent = '') => {
  const eventType = String(payload?.type || currentEvent || '').trim();

  if (eventType === 'response.output_text.delta' && typeof payload?.delta === 'string') {
    return {
      text: payload.delta,
      eventType,
      isFinal: false,
    };
  }

  if ((eventType === 'response.output_text.done' || eventType === 'response.text.done') && typeof payload?.text === 'string') {
    return {
      text: payload.text,
      eventType,
      isFinal: true,
    };
  }

  if (eventType === 'response.completed') {
    const completedText = extractTextFromOutput(payload?.response?.output || payload?.output);
    return {
      text: completedText,
      eventType,
      isFinal: true,
    };
  }

  const deltaText = extractDeltaText(payload);
  if (deltaText) {
    return {
      text: deltaText,
      eventType,
      isFinal: false,
    };
  }

  if (typeof payload?.delta === 'string') {
    return {
      text: payload.delta,
      eventType,
      isFinal: false,
    };
  }

  if (typeof payload?.text === 'string') {
    return {
      text: payload.text,
      eventType,
      isFinal: true,
    };
  }

  return {
    text: '',
    eventType,
    isFinal: false,
  };
};

const emitTextDelta = (res, emittedTextRef, text, isFinal = false) => {
  const nextText = String(text || '');
  if (!nextText) return;

  let delta = nextText;
  if (isFinal && emittedTextRef.value && nextText.startsWith(emittedTextRef.value)) {
    delta = nextText.slice(emittedTextRef.value.length);
  }

  if (!delta) return;
  emittedTextRef.value += delta;
  writeEvent(res, { type: 'delta', data: delta });
};

const readStreamLines = async (response, handleLine) => {
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
      handleLine(line);
    });
  }

  const tail = buffer.trim();
  if (tail) {
    handleLine(tail);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authResult = await verifyRequestAuth(req);
  if (!authResult.ok) {
    return res.status(401).json({ error: authResult.error });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const config = body.config || {};
    const messages = sanitizeMessages(body.messages);
    const apiKey = String(config.apiKey || '').trim();
    const model = String(config.model || '').trim();
    const systemPrompt = String(config.systemPrompt || '').trim();
    const enableWebSearch = config.enableWebSearch !== false;
    const searchMode = String(config.searchMode || 'duckduckgo').trim();
    const searchApiKey = String(config.searchApiKey || '').trim();
    const searchModeLabel = searchMode === 'exa'
      ? 'Exa'
      : searchMode === 'openai'
        ? 'OpenAI 原生搜索'
        : 'DuckDuckGo';

    if (!apiKey || !model) {
      return res.status(400).json({ error: '请先填写 AI 助手的 Key 和模型' });
    }

    const latestUserMessage = [...messages].reverse().find(item => item.role === 'user')?.content || '';
    let searchResults = [];
    let searchStatus = null;

    if (enableWebSearch && latestUserMessage && searchMode !== 'openai') {
      try {
        if (searchMode === 'exa') {
          searchResults = await searchWithExa(latestUserMessage, searchApiKey || apiKey);
        } else {
          searchResults = await searchWeb(latestUserMessage);
        }
        if (!searchResults.length) {
          searchStatus = {
            level: 'warning',
            mode: searchMode,
            message: `${searchModeLabel} 没有返回结果，本次回答不会包含实时联网结果。`,
          };
        }
      } catch (error) {
        searchResults = [];
        searchStatus = {
          level: 'warning',
          mode: searchMode,
          message: `${searchModeLabel} 搜索失败：${error?.message || '未知错误'}。本次回答不会包含实时联网结果。`,
        };
      }
    }

    const mergedMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...(searchResults.length ? [{ role: 'system', content: buildSearchContext(searchResults) }] : []),
      ...(searchStatus ? [{
        role: 'system',
        content: '本次联网搜索没有成功拿到可用结果。不要声称已经联网查到了实时信息；如果继续回答，要明确说明这次没有拿到实时搜索结果。',
      }] : []),
      ...messages,
    ];

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    if (searchResults.length) {
      writeEvent(res, { type: 'sources', data: searchResults });
    }
    if (searchStatus) {
      writeSearchStatus(res, searchStatus);
    }

    if (searchMode === 'openai') {
      const normalizedBaseUrl = normalizeBaseUrl(config.baseUrl);
      try {
        const hostname = new URL(normalizedBaseUrl).hostname.toLowerCase();
        if (hostname !== 'api.openai.com') {
          writeSearchStatus(res, {
            level: 'warning',
            mode: searchMode,
            message: `当前接口地址是 ${hostname}，不是官方 OpenAI。即使请求成功，也可能只是普通回答，未必真的用了 web_search。`,
          });
        }
      } catch {
        writeSearchStatus(res, {
          level: 'warning',
          mode: searchMode,
          message: '当前接口地址格式异常，无法确认 OpenAI 原生搜索是否可用。',
        });
      }

      const upstreamResponse = await fetch(buildResponsesUrl(config.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          input: mergedMessages.map(item => ({ role: item.role, content: item.content })),
          include: ['web_search_call.action.sources'],
          tools: [{ type: 'web_search' }],
        }),
      });

      if (!upstreamResponse.ok) {
        const payload = await upstreamResponse.json().catch(() => ({}));
        return res.status(upstreamResponse.status).json({
          error: payload?.error?.message || payload?.message || 'OpenAI 原生搜索请求失败',
        });
      }

      if (!upstreamResponse.body) {
        writeEvent(res, { type: 'error', data: 'OpenAI 原生搜索没有返回可读取的流' });
        return res.end();
      }

      const emittedTextRef = { value: '' };
      let currentEvent = '';

      await readStreamLines(upstreamResponse, (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
          return;
        }

        const payloadText = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
        if (!payloadText || payloadText === '[DONE]') return;

        try {
          const payload = JSON.parse(payloadText);
          const { text, isFinal } = extractEventText(payload, currentEvent);
          emitTextDelta(res, emittedTextRef, text, isFinal);
        } catch {
          // 忽略单条解析失败
        }
      });

      if (!emittedTextRef.value.trim()) {
        writeSearchStatus(res, {
          level: 'warning',
          mode: searchMode,
          message: 'OpenAI 原生搜索请求成功了，但没有解析到正文输出。当前接口或模型可能不支持 web_search。',
        });
      }
    } else {
      const upstreamResponse = await fetch(buildChatUrl(config.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.7,
          messages: mergedMessages,
        }),
      });

      if (!upstreamResponse.ok) {
        const payload = await upstreamResponse.json().catch(() => ({}));
        return res.status(upstreamResponse.status).json({
          error: payload?.error?.message || payload?.message || 'AI 服务请求失败',
        });
      }

      if (!upstreamResponse.body) {
        writeEvent(res, { type: 'error', data: 'AI 服务没有返回可读取的流' });
        return res.end();
      }

      const emittedTextRef = { value: '' };

      await readStreamLines(upstreamResponse, (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('event:')) return;

        const payloadText = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
        if (!payloadText || payloadText === '[DONE]') return;

        try {
          const payload = JSON.parse(payloadText);
          const { text, isFinal } = extractEventText(payload);
          emitTextDelta(res, emittedTextRef, text, isFinal);
        } catch {
          // 忽略单条解析失败
        }
      });
    }

    writeEvent(res, { type: 'done' });
    return res.end();
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'AI 助手请求失败' });
    }
    writeEvent(res, { type: 'error', data: error?.message || 'AI 助手请求失败' });
    return res.end();
  }
}
