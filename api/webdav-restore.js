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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const config = normalizeConfig(body.config);
    const configError = validateConfig(config);

    if (configError) {
      return res.status(400).json({ error: configError });
    }

    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const targetUrl = buildTargetUrl(config);
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${token}`,
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      const text = errorText(await response.text());
      return res.status(response.status).json({
        error: `WebDAV 下载失败（HTTP ${response.status}）。${text}`,
      });
    }

    const rawText = await response.text();
    let backupData = null;
    try {
      backupData = JSON.parse(rawText);
    } catch (error) {
      return res.status(400).json({ error: 'WebDAV 文件不是合法 JSON。' });
    }

    if (!Array.isArray(backupData?.pages) || backupData.pages.length === 0) {
      return res.status(400).json({ error: '备份文件缺少 pages 数据。' });
    }

    return res.status(200).json({ backupData });
  } catch (error) {
    const detail = error?.message || '服务器内部错误。';
    return res.status(500).json({ error: detail });
  }
}
