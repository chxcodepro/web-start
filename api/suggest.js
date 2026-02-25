// Vercel Serverless Function - 搜索建议代理
// 解决前端直接请求搜索引擎API的CORS问题

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { q, engine = 'google' } = req.query;

  if (!q) {
    return res.status(400).json({ error: '缺少搜索关键词' });
  }

  const apis = {
    google: `https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-CN&q=${encodeURIComponent(q)}`,
    bing: `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`,
    duckduckgo: `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`,
  };

  const apiUrl = apis[engine] || apis.google;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // 统一返回格式：数组形式的建议列表
    let suggestions = [];

    if (engine === 'duckduckgo') {
      // DuckDuckGo 返回 [{phrase: "xxx"}, ...]
      suggestions = Array.isArray(data) ? data.map(item => item.phrase || item) : [];
    } else {
      // Google/Bing 返回 ["query", ["suggestion1", "suggestion2", ...]]
      suggestions = Array.isArray(data?.[1]) ? data[1] : [];
    }

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('搜索建议请求失败:', error);
    res.status(500).json({ error: '获取建议失败', suggestions: [] });
  }
}
