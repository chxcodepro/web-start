import { verifyRequestAuth } from './_auth.js';
import {
  buildChatUrl,
  buildResponsesUrl,
  buildSearchContext,
  extractDeltaText,
  sanitizeMessages,
  searchWeb,
  searchWithExa,
} from './_ai.js';

const writeEvent = (res, payload) => {
  res.write(`${JSON.stringify(payload)}\n`);
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

    if (!apiKey || !model) {
      return res.status(400).json({ error: '请先填写 AI 助手的 Key 和模型' });
    }

    const latestUserMessage = [...messages].reverse().find(item => item.role === 'user')?.content || '';
    let searchResults = [];

    if (enableWebSearch && latestUserMessage && searchMode !== 'openai') {
      try {
        if (searchMode === 'exa') {
          searchResults = await searchWithExa(latestUserMessage, searchApiKey || apiKey);
        } else {
          searchResults = await searchWeb(latestUserMessage);
        }
      } catch (error) {
        searchResults = [];
      }
    }

    const mergedMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...(searchResults.length ? [{ role: 'system', content: buildSearchContext(searchResults) }] : []),
      ...messages,
    ];

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    if (searchResults.length) {
      writeEvent(res, { type: 'sources', data: searchResults });
    }

    if (searchMode === 'openai') {
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
