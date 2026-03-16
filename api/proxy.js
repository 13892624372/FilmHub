const https = require('https');
const http = require('http');
const { URL } = require('url');

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 获取目标URL
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  
  try {
    const url = new URL(targetUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*'
      },
      timeout: 8000 // 8秒超时
    };
    
    const proxyReq = client.request(options, (proxyRes) => {
      let data = '';
      
      proxyRes.on('data', (chunk) => {
        data += chunk;
      });
      
      proxyRes.on('end', () => {
        res.status(200).send(data);
      });
    });
    
    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Proxy request failed', message: error.message });
    });
    
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Request timeout' });
    });
    
    proxyReq.end();
    
  } catch (error) {
    console.error('URL parse error:', error);
    res.status(400).json({ error: 'Invalid URL', message: error.message });
  }
};
