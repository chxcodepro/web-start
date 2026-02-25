import { verifyRequestAuth } from './_auth.js';

const DEFAULT_FILE_PATH = '/my-nav-backup.json';

const normalizeConfig = (config = {}) => {
  const url = String(config.url || '').trim().replace(/\/+$/, '');
  const username = String(config.username || '').trim();
  const password = String(config.password || '');
  const rawPath = String(config.filePath || DEFAULT_FILE_PATH).trim();
  const filePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return { url, username, password, filePath };
};

const buildTargetUrl = (config) => `${config.url}${config.filePath}`;

const validateConfig = (config) => {
  if (!config.url || !config.username || !config.password) {
    return '缺少 WebDAV 地址、用户名或密码。';
  }
  if (!/^https:\/\//i.test(config.url)) {
    return 'WebDAV 地址必须是 https。';
  }
  return '';
};

const errorText = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 200);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authResult = await verifyRequestAuth(req);
    if (!authResult.ok) {
      return res.status(401).json({ error: authResult.error });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const config = normalizeConfig(body.config);
    const backupData = body.backupData;
    const configError = validateConfig(config);

    if (configError) {
      return res.status(400).json({ error: configError });
    }
    if (!backupData || !Array.isArray(backupData.pages) || backupData.pages.length === 0) {
      return res.status(400).json({ error: '备份数据无效，缺少 pages。' });
    }

    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const targetUrl = buildTargetUrl(config);
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(backupData, null, 2),
    });

    if (!response.ok) {
      const text = errorText(await response.text());
      return res.status(response.status).json({
        error: `WebDAV 上传失败（HTTP ${response.status}）。${text}`,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    const detail = error?.message || '服务器内部错误。';
    return res.status(500).json({ error: detail });
  }
}
