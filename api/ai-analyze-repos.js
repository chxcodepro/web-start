// AI 分析仓库分组 API
import { verifyRequestAuth } from './_auth.js';

// AI 提供商配置
const AI_CONFIGS = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildRequest: (apiKey, prompt) => ({
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-latest',
    buildRequest: (apiKey, prompt) => ({
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    }),
    parseResponse: (data) => data.content?.[0]?.text,
  },
  google: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    buildRequest: (apiKey, prompt) => ({
      headers: {
        'Content-Type': 'application/json',
      },
      // API Key 通过 URL 参数传递
      urlSuffix: `?key=${apiKey}`,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text,
  },
  custom: {
    // 自定义端点使用 OpenAI 兼容格式
    buildRequest: (apiKey, prompt, model) => ({
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },
};

// 构建分组分析的 prompt
const buildGroupingPrompt = (repos, presetGroups = [], usePresetOnly = false) => {
  const repoList = repos.map(r => ({
    id: r.id,
    name: r.fullName || r.name,
    description: r.description || '',
    language: r.language || '',
    topics: r.topics || [],
  }));

  // 根据是否有预设分组，生成不同的 prompt
  if (presetGroups.length > 0 && usePresetOnly) {
    // 仅使用预设分组模式
    return `你是一个 GitHub 仓库分类专家。请分析以下仓库列表，并将每个仓库分配到指定的分组中。

预设分组列表：
${presetGroups.map(g => `- ${g}`).join('\n')}

要求：
1. 只能使用上述预设分组，不能创建新分组
2. 每个仓库只能属于一个分组
3. 如果某个仓库确实无法归类到任何预设分组，请将其分配到"其他"分组
4. 只返回 JSON 格式，不要有其他说明文字

仓库列表：
${JSON.stringify(repoList, null, 2)}

请返回如下 JSON 格式（不要添加 markdown 代码块标记）：
{
  "groups": ["分组1", "分组2", ...],
  "assignments": {
    "仓库ID": "分组名称",
    ...
  }
}`;
  } else if (presetGroups.length > 0) {
    // 优先使用预设分组，但允许创建新分组
    return `你是一个 GitHub 仓库分类专家。请分析以下仓库列表，并为每个仓库分配一个合适的分组。

已有分组（优先使用）：
${presetGroups.map(g => `- ${g}`).join('\n')}

要求：
1. 优先使用上述已有分组
2. 如果仓库确实不适合任何已有分组，可以创建新分组
3. 新分组名称应该简洁、直观，使用中文
4. 每个仓库只能属于一个分组
5. 只返回 JSON 格式，不要有其他说明文字

仓库列表：
${JSON.stringify(repoList, null, 2)}

请返回如下 JSON 格式（不要添加 markdown 代码块标记）：
{
  "groups": ["分组1", "分组2", ...],
  "assignments": {
    "仓库ID": "分组名称",
    ...
  }
}`;
  } else {
    // 无预设分组，AI 自由分组
    return `你是一个 GitHub 仓库分类专家。请分析以下仓库列表，并为每个仓库分配一个合适的分组。

要求：
1. 分组名称应该简洁、直观，使用中文
2. 分组数量控制在 5-15 个之间
3. 常见分组示例：前端框架、后端框架、开发工具、命令行工具、机器学习、数据科学、游戏开发、文档教程、配置文件、UI 组件库等
4. 每个仓库只能属于一个分组
5. 只返回 JSON 格式，不要有其他说明文字

仓库列表：
${JSON.stringify(repoList, null, 2)}

请返回如下 JSON 格式（不要添加 markdown 代码块标记）：
{
  "groups": ["分组1", "分组2", ...],
  "assignments": {
    "仓库ID": "分组名称",
    ...
  }
}`;
  }
};

// 解析 AI 返回的 JSON
const parseAIResponse = (text) => {
  // 移除可能的 markdown 代码块标记
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('AI 返回格式无效，无法解析 JSON');
  }
};

// 调用 AI 接口
const callAI = async (provider, apiKey, prompt, customEndpoint, customModel) => {
  const config = AI_CONFIGS[provider];
  if (!config) {
    throw new Error(`不支持的 AI 提供商: ${provider}`);
  }

  let endpoint = config.endpoint;
  let requestConfig;

  if (provider === 'custom') {
    if (!customEndpoint) {
      throw new Error('自定义模式需要提供 API 端点');
    }
    endpoint = customEndpoint;
    requestConfig = config.buildRequest(apiKey, prompt, customModel);
  } else {
    requestConfig = config.buildRequest(apiKey, prompt);
    if (requestConfig.urlSuffix) {
      endpoint += requestConfig.urlSuffix;
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: requestConfig.headers,
    body: requestConfig.body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    throw new Error(`AI API 调用失败: ${errorMsg}`);
  }

  const data = await response.json();
  const content = config.parseResponse(data);

  if (!content) {
    throw new Error('AI 未返回有效内容');
  }

  return content;
};

// 批量处理仓库（分批 + 并发控制）
const BATCH_SIZE = 30;
const CONCURRENT_LIMIT = 2;

const analyzeReposInBatches = async (repos, provider, apiKey, customEndpoint, customModel, presetGroups, usePresetOnly) => {
  // 分批
  const batches = [];
  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    batches.push(repos.slice(i, i + BATCH_SIZE));
  }

  const allGroups = new Set();
  const allAssignments = {};

  // 并发处理批次
  for (let i = 0; i < batches.length; i += CONCURRENT_LIMIT) {
    const concurrentBatches = batches.slice(i, i + CONCURRENT_LIMIT);
    // 使用 allSettled 防止单个失败导致全部丢失
    const results = await Promise.allSettled(
      concurrentBatches.map(async (batch) => {
        const prompt = buildGroupingPrompt(batch, presetGroups, usePresetOnly);
        const response = await callAI(provider, apiKey, prompt, customEndpoint, customModel);
        return parseAIResponse(response);
      })
    );

    // 合并成功的结果
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.groups) {
          result.value.groups.forEach(g => allGroups.add(g));
        }
        if (result.value.assignments) {
          Object.assign(allAssignments, result.value.assignments);
        }
      } else if (result.status === 'rejected') {
        console.error('AI 批次处理失败:', result.reason);
      }
    }

    // 批次间延迟，避免限流
    if (i + CONCURRENT_LIMIT < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    groups: Array.from(allGroups),
    assignments: allAssignments,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 验证用户登录
    const authResult = await verifyRequestAuth(req);
    if (!authResult.ok) {
      return res.status(401).json({ error: authResult.error });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { repos, provider, apiKey, customEndpoint, customModel, presetGroups, usePresetOnly } = body;

    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return res.status(400).json({ error: '缺少仓库数据' });
    }

    if (!provider || !apiKey) {
      return res.status(400).json({ error: '缺少 AI 配置信息' });
    }

    // 过滤已有分组的仓库
    const reposToAnalyze = repos.filter(r => !r.group);

    if (reposToAnalyze.length === 0) {
      return res.status(200).json({
        ok: true,
        groups: [],
        assignments: {},
        message: '所有仓库已分组',
      });
    }

    // 调用 AI 分析
    const result = await analyzeReposInBatches(
      reposToAnalyze,
      provider,
      apiKey,
      customEndpoint,
      customModel,
      presetGroups || [],
      usePresetOnly || false
    );

    return res.status(200).json({
      ok: true,
      groups: result.groups,
      assignments: result.assignments,
      analyzed: reposToAnalyze.length,
    });
  } catch (error) {
    console.error('AI 分析失败:', error);
    const detail = error?.message || '服务器内部错误';
    return res.status(500).json({ error: detail });
  }
}
