const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 代理API请求
  if (pathname === '/api/proxy') {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }

    console.log('代理请求:', targetUrl);

    try {
      const proxyRes = await proxyRequest(targetUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(proxyRes);
    } catch (error) {
      console.error('代理错误:', error.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        code: 0, 
        msg: '请求失败: ' + error.message,
        list: [],
        class: []
      }));
    }
    return;
  }

  // 静态文件服务
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 对于前端路由，返回index.html
        if (!ext) {
          fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
            if (err) {
              res.writeHead(500);
              res.end('Server Error');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content);
            }
          });
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// 代理请求函数
function proxyRequest(targetUrl) {
  return new Promise((resolve, reject) => {
    try {
      const parsedTarget = new URL(targetUrl);
      const isHttps = parsedTarget.protocol === 'https:';
      const protocol = isHttps ? https : http;

      const options = {
        hostname: parsedTarget.hostname,
        port: parsedTarget.port || (isHttps ? 443 : 80),
        path: parsedTarget.pathname + parsedTarget.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': parsedTarget.protocol + '//' + parsedTarget.hostname + '/',
          'Origin': parsedTarget.protocol + '//' + parsedTarget.hostname,
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        },
        timeout: 20000,
        rejectUnauthorized: false
      };

      console.log('请求选项:', {
        hostname: options.hostname,
        path: options.path,
        port: options.port
      });

      const proxyReq = protocol.request(options, (proxyRes) => {
        let data = '';
        
        console.log('响应状态:', proxyRes.statusCode);
        console.log('响应头:', JSON.stringify(proxyRes.headers, null, 2));
        
        proxyRes.setEncoding('utf8');
        
        proxyRes.on('data', (chunk) => {
          data += chunk;
        });
        
        proxyRes.on('end', () => {
          console.log('响应数据长度:', data.length);
          if (data.length > 0) {
            console.log('响应数据前200字符:', data.substring(0, 200));
          }
          resolve(data);
        });
      });

      proxyReq.on('error', (err) => {
        console.error('请求错误:', err.message);
        reject(new Error('请求失败: ' + err.message));
      });

      proxyReq.on('timeout', () => {
        console.error('请求超时');
        proxyReq.destroy();
        reject(new Error('请求超时'));
      });

      proxyReq.end();
    } catch (err) {
      console.error('URL解析错误:', err.message);
      reject(new Error('URL解析失败: ' + err.message));
    }
  });
}

server.listen(PORT, () => {
  console.log(`
========================================
  影视网站服务已启动
========================================
  访问地址: http://localhost:${PORT}
  
  功能说明:
  1. 首页 - 影视列表和分类
  2. 详情页 - 影视详情信息
  3. 播放页 - M3U8视频播放
  4. 数据源管理 - 配置多个视频源
  
  按 Ctrl+C 停止服务
========================================
  `);
});
