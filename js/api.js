// ========================================
// 影视网站 - API接口
// ========================================

const API = {
  // CORS代理服务器地址列表
  corsProxies: [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ],
  
  // 当前使用的代理索引
  currentProxyIndex: 0,
  
  // 获取当前代理URL
  get proxyUrl() {
    return this.corsProxies[this.currentProxyIndex];
  },
  
  // 切换到下一个代理
  switchProxy() {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    console.log('切换到CORS代理:', this.proxyUrl);
  },
  
  // 请求超时时间
  timeout: 20000,
  
  // 发送请求
  async request(apiUrl) {
    // 尝试所有代理
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxyUrl = this.corsProxies[(this.currentProxyIndex + i) % this.corsProxies.length];
      const url = `${proxyUrl}${encodeURIComponent(apiUrl)}`;
      
      try {
        const result = await this.tryRequest(url);
        // 如果成功，更新当前代理索引
        this.currentProxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
        return result;
      } catch (error) {
        console.warn(`代理 ${proxyUrl} 请求失败:`, error.message);
        continue;
      }
    }
    
    throw new Error('所有CORS代理都不可用');
  },
  
  // 尝试单个请求
  async tryRequest(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      const text = await response.text();
      
      // 尝试解析JSON
      try {
        const data = JSON.parse(text);
        // 如果返回的是错误对象
        if (data.code === 0 && data.msg && data.msg.includes('请求失败')) {
          console.warn('API返回错误:', data.msg);
        }
        return data;
      } catch (e) {
        // 如果不是JSON，返回空数据
        console.warn('返回数据不是JSON格式:', text.substring(0, 100));
        return {
          code: 0,
          msg: '数据格式错误',
          list: [],
          class: []
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      console.error('API请求错误:', error);
      return {
        code: 0,
        msg: '请求失败: ' + error.message,
        list: [],
        class: []
      }
    }
  },
  
  // 获取影视列表
  async getList(baseUrl, page = 1, typeId = null) {
    // 确保baseUrl以/结尾
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    let url = `${baseUrl}?ac=list&pg=${page}`;
    if (typeId) {
      url += `&t=${typeId}`;
    }
    
    console.log('请求URL:', url);
    
    const data = await this.request(url);
    
    // 标准化返回数据
    return {
      code: data.code || 0,
      msg: data.msg || '',
      page: data.page || page,
      pagecount: data.pagecount || 1,
      limit: data.limit || 20,
      total: data.total || 0,
      list: data.list || [],
      class: data.class || []
    };
  },
  
  // 搜索影视
  async search(baseUrl, keyword, page = 1) {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    const url = `${baseUrl}?ac=list&wd=${encodeURIComponent(keyword)}&pg=${page}`;
    
    console.log('搜索URL:', url);
    
    const data = await this.request(url);
    
    return {
      code: data.code || 0,
      msg: data.msg || '',
      page: data.page || page,
      pagecount: data.pagecount || 1,
      limit: data.limit || 20,
      total: data.total || 0,
      list: data.list || [],
      class: data.class || []
    };
  },
  
  // 获取影视详情
  async getDetail(baseUrl, ids) {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    const url = `${baseUrl}?ac=detail&ids=${ids}`;
    
    console.log('详情URL:', url);
    
    const data = await this.request(url);
    
    if (data.list && data.list.length > 0) {
      return data.list[0];
    }
    
    return null;
  }
};
