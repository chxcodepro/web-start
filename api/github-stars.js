// 获取 GitHub Stars 列表 API
import { verifyRequestAuth } from './_auth.js';

// 获取所有 starred 仓库（分页）
const fetchAllStarredRepos = async (token) => {
  const repos = [];
  let page = 1;
  const perPage = 100;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(
      `https://api.github.com/user/starred?per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'My-Nav-Stars',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `GitHub API 错误: ${response.status}`);
    }

    const data = await response.json();
    if (data.length === 0) {
      hasNextPage = false;
      continue;
    }

    repos.push(...data);

    // 检查是否还有下一页
    const linkHeader = response.headers.get('Link');
    hasNextPage = !!(linkHeader && linkHeader.includes('rel="next"'));
    if (!hasNextPage) continue;

    page++;

    // 安全限制：最多获取 5000 个仓库
    if (repos.length >= 5000) {
      hasNextPage = false;
    }
  }

  return repos;
};

// 格式化仓库数据
const formatRepoData = (repo) => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name,
  description: repo.description || '',
  url: repo.html_url,
  language: repo.language || '',
  stars: repo.stargazers_count,
  topics: repo.topics || [],
  owner: {
    login: repo.owner?.login || '',
    avatarUrl: repo.owner?.avatar_url || '',
  },
  createdAt: repo.created_at,
  updatedAt: repo.updated_at,
  pushedAt: repo.pushed_at,
});

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
    const { githubToken } = body;

    if (!githubToken) {
      return res.status(400).json({ error: '缺少 GitHub Token' });
    }

    // 获取所有 starred 仓库
    const rawRepos = await fetchAllStarredRepos(githubToken);
    const repos = rawRepos.map(formatRepoData);

    return res.status(200).json({
      ok: true,
      repos,
      total: repos.length,
    });
  } catch (error) {
    console.error('获取 GitHub Stars 失败:', error);
    const detail = error?.message || '服务器内部错误';
    return res.status(500).json({ error: detail });
  }
}
