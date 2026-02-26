// 生成 GitHub OAuth 授权 URL
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({ error: '未配置 GITHUB_CLIENT_ID 环境变量' });
    }

    // 从请求中获取回调地址（如果有）
    const redirectUri = req.query.redirect_uri || '';

    // 构建 OAuth 授权 URL
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'read:user',
      allow_signup: 'false',
    });

    if (redirectUri) {
      params.set('redirect_uri', redirectUri);
    }

    // 生成随机 state 防止 CSRF
    const state = Math.random().toString(36).substring(2, 15);
    params.set('state', state);

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return res.status(200).json({
      ok: true,
      authUrl,
      state,
    });
  } catch (error) {
    console.error('生成 OAuth URL 失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
