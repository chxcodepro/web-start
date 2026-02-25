const FIREBASE_WEB_API_KEY = 'AIzaSyACYOZdLd6EPbtzC7Ih5P0QxSsWanGQZWU';

const verifyFirebaseIdToken = async (idToken) => {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  const user = Array.isArray(data?.users) ? data.users[0] : null;
  if (!user) return null;

  return {
    email: String(user.email || '').toLowerCase(),
    localId: user.localId || '',
  };
};

export const verifyRequestAuth = async (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, error: '未授权：请先登录管理员账号。' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, error: '未授权：缺少 token。' };
  }

  try {
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return { ok: false, error: '登录已失效，请重新登录。' };
    }
    return { ok: true, user };
  } catch (error) {
    return { ok: false, error: '鉴权失败，请稍后重试。' };
  }
};
