// ========================================
// 影视网站 - API接口
// ========================================

const API = {
  // 公共CORS代理服务器列表
  corsProxies: [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/get?url=',
    'https://api.codetabs.com/v1/proxy?quest='
  ],
  
  // 当前使用的代理索引
  currentProxyIndex: 0,
  
  // 请求超时时间
  timeout: 10000,
  
  // 发送请求
  async request(apiUrl) {
    // 尝试所有代理
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
      const proxyUrl = this.corsProxies[proxyIndex];
      const url = `${proxyUrl}${encodeURIComponent(apiUrl)}`;
      
      try {
        console.log(`尝试代理 ${proxyIndex + 1}/${this.corsProxies.length}: ${proxyUrl.substring(0, 30)}...`);
        
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
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        
        // 尝试解析JSON
        try {
          let data = JSON.parse(text);
          
          // allorigins 返回的数据在 contents 字段中
          if (proxyUrl.includes('allorigins') && data.contents) {
            data = JSON.parse(data.contents);
          }
          
          // 如果成功，记住这个代理
          this.currentProxyIndex = proxyIndex;
          console.log('✓ 代理请求成功');
          
          return data;
        } catch (e) {
          console.warn('返回数据不是JSON格式:', text.substring(0, 100));
          return {
            code: 0,
            msg: '数据格式错误',
            list: [],
            class: []
          };
        }
      } catch (error) {
        console.warn(`代理 ${proxyIndex + 1} 失败:`, error.message);
        continue;
      }
    }
    
    console.error('所有代理都不可用');
    return {
      code: 0,
      msg: '所有代理都不可用，请稍后重试',
      list: [],
      class: []
    };
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
