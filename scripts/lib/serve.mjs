/**
 * 一个只读的静态服务器，用来给探针和截图脚本提供 http:// 环境。
 *
 * 为什么不用 file://：站点在 file:// 下 fetch('/search-index.json') 会被拦，
 * 搜索结果永远是空的 —— 那样测出来的「通过」没有意义。
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export async function startServer(root, port = 4399) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let filePath = path.join(root, decodeURIComponent(url.pathname));

      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('404');
        return;
      }
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const body = await fs.readFile(filePath);
      res.writeHead(200, {
        'content-type': TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(err));
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
