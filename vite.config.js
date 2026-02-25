import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 本地开发时模拟 /api/suggest 接口
    {
      name: 'api-suggest-proxy',
      configureServer(server) {
        server.middlewares.use('/api/suggest', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const q = url.searchParams.get('q');
          const engine = url.searchParams.get('engine') || 'google';

          if (!q) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: '缺少关键词', suggestions: [] }));
            return;
          }

          const apis = {
            google: `https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-CN&q=${encodeURIComponent(q)}`,
            bing: `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`,
            duckduckgo: `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`,
          };

          try {
            const response = await fetch(apis[engine] || apis.google, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            const data = await response.json();

            let suggestions = [];
            if (engine === 'duckduckgo') {
              suggestions = Array.isArray(data) ? data.map(item => item.phrase || item) : [];
            } else {
              suggestions = Array.isArray(data?.[1]) ? data[1] : [];
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions }));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '请求失败', suggestions: [] }));
          }
        });
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
})
