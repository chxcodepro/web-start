import { verifyRequestAuth } from './_auth.js';
import {
  buildModelsUrl,
  buildResponsesUrl,
  normalizeBaseUrl,
  searchWeb,
  searchWithExa,
} from './_ai.js';

const validateModelAccess = async (baseUrl, apiKey, model) => {
  const response = await fetch(buildModelsUrl(baseUrl), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || '模型列表获取失败');
  }

  const models = Array.isArray(payload?.data)
    ? payload.data.map(item => item?.id).filter(Boolean)
    : [];

  if (models.length > 0 && model && !models.includes(model)) {
    throw new Error(`模型 ${model} 不在当前接口返回列表中`);
  }

  return models;
};

const validateOpenAiSearch = async (baseUrl, apiKey, model) => {
  const response = await fetch(buildResponsesUrl(baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: '请使用 web search 搜索今天的一条科技新闻，只回复 ok。',
      include: ['web_search_call.action.sources'],
      tools: [{ type: 'web_search' }],
      max_output_tokens: 16,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || 'OpenAI 原生搜索不可用');
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const hasWebSearchCall = outputItems.some((item) => {
    if (item?.type === 'web_search_call') return true;
    if (Array.isArray(item?.action?.sources) && item.action.sources.length > 0) return true;
    return false;
  });

  if (!hasWebSearchCall) {
    const hostname = (() => {
      try {
        return new URL(normalizeBaseUrl(baseUrl)).hostname;
      } catch {
        return '当前地址';
      }
    })();
    throw new Error(`${hostname} 返回成功，但没有检测到 web_search 工具调用。请确认 baseUrl 和模型真的支持 OpenAI 原生搜索`);
  }

  return true;
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
    const baseUrl = String(config.baseUrl || '').trim();
    const apiKey = String(config.apiKey || '').trim();
    const model = String(config.model || '').trim();
    const enableWebSearch = config.enableWebSearch !== false;
    const searchMode = String(config.searchMode || 'duckduckgo').trim();
    const searchApiKey = String(config.searchApiKey || '').trim();

    if (!baseUrl) {
      return res.status(400).json({ error: '请填写接口地址' });
    }
    if (!apiKey) {
      return res.status(400).json({ error: '请填写 API Key' });
    }
    if (!model) {
      return res.status(400).json({ error: '请填写模型名称' });
    }

    const models = await validateModelAccess(baseUrl, apiKey, model);

    let searchMessage = '未开启联网搜索';
    if (enableWebSearch) {
      if (searchMode === 'exa') {
        const results = await searchWithExa('OpenAI 最新模型', searchApiKey || apiKey);
        if (!results.length) {
          throw new Error('Exa 搜索没有返回结果');
        }
        searchMessage = 'Exa 搜索验证通过';
      } else if (searchMode === 'openai') {
        await validateOpenAiSearch(baseUrl, apiKey, model);
        searchMessage = 'OpenAI 原生搜索验证通过';
      } else {
        const results = await searchWeb('OpenAI 最新模型');
        if (!results.length) {
          throw new Error('DuckDuckGo 搜索没有返回结果');
        }
        searchMessage = 'DuckDuckGo 搜索验证通过';
      }
    }

    return res.status(200).json({
      ok: true,
      message: '配置验证通过',
      searchMessage,
      modelsCount: models.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || '配置验证失败' });
  }
}
