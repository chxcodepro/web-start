const DEFAULT_BASE_URL = 'https://api.openai.com';

const stripTags = (text) => String(text || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, '\'')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

const decodeDuckUrl = (url) => {
  try {
    const parsed = new URL(url, 'https://duckduckgo.com');
    const target = parsed.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : parsed.toString();
  } catch {
    return url;
  }
};

export const normalizeBaseUrl = (input) => {
  const raw = String(input || DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;
  const withoutSuffix = raw
    .replace(/\/v1\/chat\/completions\/?$/i, '')
    .replace(/\/v1\/models\/?$/i, '')
    .replace(/\/chat\/completions\/?$/i, '')
    .replace(/\/models\/?$/i, '')
    .replace(/\/+$/, '');
  return withoutSuffix || DEFAULT_BASE_URL;
};

export const buildModelsUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1') ? `${normalized}/models` : `${normalized}/v1/models`;
};

export const buildChatUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1') ? `${normalized}/chat/completions` : `${normalized}/v1/chat/completions`;
};

export const buildResponsesUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith('/v1') ? `${normalized}/responses` : `${normalized}/v1/responses`;
};

export const sanitizeMessages = (messages = []) => messages
  .filter(item => ['system', 'user', 'assistant'].includes(item?.role))
  .map(item => ({
    role: item.role,
    content: String(item.content || '').trim(),
  }))
  .filter(item => item.content);

export const searchWeb = async (queryText) => {
  const query = String(queryText || '').trim();
  if (!query) return [];

  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=cn-zh&kp=-2`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`联网搜索失败：HTTP ${response.status}`);
  }

  const html = await response.text();
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const results = [];
  let match;

  while ((match = linkRegex.exec(html)) && results.length < 5) {
    const [, href, titleHtml] = match;
    const nearby = html.slice(match.index, match.index + 1600);
    const snippetMatch = nearby.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
    const title = stripTags(titleHtml);
    const snippet = stripTags(snippetMatch?.[1] || snippetMatch?.[2] || '');
    const url = decodeDuckUrl(href);

    if (!title || !url.startsWith('http')) continue;
    results.push({
      title,
      url,
      snippet: snippet || '未提取到摘要',
    });
  }

  return results;
};

export const searchWithExa = async (queryText, apiKey) => {
  const query = String(queryText || '').trim();
  const key = String(apiKey || '').trim();
  if (!query) return [];
  if (!key) {
    throw new Error('Exa 搜索缺少 API Key');
  }

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify({
      query,
      type: 'auto',
      numResults: 5,
      text: true,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || payload?.message || `Exa 搜索失败：HTTP ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.results)
    ? payload.results.map(item => ({
      title: item?.title || item?.url || '未命名结果',
      url: item?.url || '',
      snippet: String(item?.text || '').slice(0, 240) || '未提取到摘要',
    })).filter(item => item.url)
    : [];
};

export const buildSearchContext = (results = []) => {
  if (!results.length) return '';
  return [
    '以下是刚刚进行的联网搜索结果，请优先参考这些内容回答，并尽量引用链接：',
    ...results.map((item, index) => `${index + 1}. ${item.title}\n链接：${item.url}\n摘要：${item.snippet}`),
  ].join('\n\n');
};

export const extractDeltaText = (payload) => {
  const choice = payload?.choices?.[0];
  const delta = choice?.delta?.content;
  if (typeof delta === 'string') return delta;
  if (Array.isArray(delta)) {
    return delta
      .map(item => item?.text || item?.content || '')
      .join('');
  }
  if (typeof choice?.message?.content === 'string') return choice.message.content;
  return '';
};
