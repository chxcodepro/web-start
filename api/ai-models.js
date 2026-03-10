import { verifyRequestAuth } from './_auth.js';
import { buildModelsUrl } from './_ai.js';

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
    const baseUrl = body.baseUrl;
    const apiKey = String(body.apiKey || '').trim();

    if (!apiKey) {
      return res.status(400).json({ error: '请先填写 API Key' });
    }

    const response = await fetch(buildModelsUrl(baseUrl), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || payload?.message || '获取模型列表失败',
      });
    }

    const models = Array.isArray(payload?.data)
      ? payload.data
        .map(item => item?.id)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
      : [];

    return res.status(200).json({ models });
  } catch (error) {
    return res.status(500).json({ error: error?.message || '获取模型列表失败' });
  }
}
