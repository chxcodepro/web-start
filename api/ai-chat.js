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

      const reader = upstreamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
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
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
            return;
          }
          if (!trimmed.startsWith('data:')) return;
          const payloadText = trimmed.slice(5).trim();
          if (!payloadText || payloadText === '[DONE]') return;
          try {
            const payload = JSON.parse(payloadText);
            if (currentEvent === 'response.output_text.delta' && payload?.delta) {
              writeEvent(res, { type: 'delta', data: payload.delta });
            }
          } catch {
            // 忽略单条解析失败
          }
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

      const reader = upstreamResponse.body.getReader();
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
          if (!trimmed.startsWith('data:')) return;
          const payloadText = trimmed.slice(5).trim();
          if (!payloadText || payloadText === '[DONE]') return;
          try {
            const payload = JSON.parse(payloadText);
            const delta = extractDeltaText(payload);
            if (delta) {
              writeEvent(res, { type: 'delta', data: delta });
            }
          } catch {
            // 忽略单条解析失败
          }
        });
      }
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
