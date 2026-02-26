// GitHub OAuth 回调处理
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: '未配置 GitHub OAuth 环境变量' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { code } = body;

    if (!code) {
      return res.status(400).json({ error: '缺少授权码 code' });
    }

    // 用 code 换取 access_token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('换取 access_token 失败');
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('未获取到 access_token');
    }

    // 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'My-Nav-Stars',
      },
    });

    if (!userResponse.ok) {
      throw new Error('获取用户信息失败');
    }

    const userData = await userResponse.json();

    return res.status(200).json({
      ok: true,
      accessToken,
      user: {
        login: userData.login,
        avatarUrl: userData.avatar_url,
        name: userData.name,
        email: userData.email,
      },
    });
  } catch (error) {
    console.error('GitHub OAuth 回调处理失败:', error);
    const detail = error?.message || '服务器内部错误';
    return res.status(500).json({ error: detail });
  }
}
