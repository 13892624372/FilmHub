// ========================================
// 影视网站 - 主应用
// ========================================

const App = {
  // 数据源管理
  sources: [],
  currentSource: null,
  
  // 分类数据
  categories: [],
  
  // 初始化
  init() {
    this.loadSources();
    this.bindEvents();
    this.initMobileMenu();
  },
  
  // 预配置的默认数据源
  defaultSources: [
    {
      id: 1001,
      name: '量子资源',
      url: 'https://cj.lziplayer.com/api.php/provide/vod/',
      categories: []
    },
    {
      id: 1002,
      name: '百度资源',
      url: 'https://api.apibdzy.com/api.php/provide/vod/',
      categories: []
    },
    {
      id: 1003,
      name: '快播资源',
      url: 'https://www.kuaibozy.com/api.php/provide/vod/',
      categories: []
    },
    {
      id: 1004,
      name: '无尽资源',
      url: 'https://api.wujinapi.me/api.php/provide/vod/',
      categories: []
    },
    {
      id: 1005,
      name: '卧龙资源',
      url: 'https://collect.wolongzyw.com/api.php/provide/vod/',
      categories: []
    }
  ],

  // 从本地存储加载数据源
  loadSources() {
    const saved = localStorage.getItem('videoSources');
    const hasInitialized = localStorage.getItem('sourcesInitialized');
    
    if (saved) {
      this.sources = JSON.parse(saved);
    }
    
    // 如果是第一次加载，添加默认数据源
    if (!hasInitialized && this.sources.length === 0) {
      this.sources = [...this.defaultSources];
      this.saveSources();
      localStorage.setItem('sourcesInitialized', 'true');
      console.log('已添加默认数据源:', this.sources);
    }
    
    const current = localStorage.getItem('currentSource');
    if (current) {
      this.currentSource = JSON.parse(current);
    } else if (this.sources.length > 0) {
      // 如果没有当前数据源，默认使用第一个
      this.currentSource = this.sources[0];
      this.saveSources();
    }
    
    this.updateSourceUI();
  },
  
  // 保存数据源到本地存储
  saveSources() {
    localStorage.setItem('videoSources', JSON.stringify(this.sources));
    if (this.currentSource) {
      localStorage.setItem('currentSource', JSON.stringify(this.currentSource));
    }
  },

  // ==================== 搜索历史功能 ====================
  
  // 获取搜索历史
  getSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
  },
  
  // 保存搜索历史
  saveSearchHistory(history) {
    localStorage.setItem('searchHistory', JSON.stringify(history));
  },
  
  // 添加搜索历史
  addSearchHistory(keyword) {
    if (!keyword || keyword.trim() === '') return;
    
    let history = this.getSearchHistory();
    keyword = keyword.trim();
    
    // 如果已存在，先删除旧的
    history = history.filter(item => item !== keyword);
    
    // 添加到最前面
    history.unshift(keyword);
    
    // 最多保存50条
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    this.saveSearchHistory(history);
  },
  
  // 删除单条搜索历史
  removeSearchHistory(keyword) {
    let history = this.getSearchHistory();
    history = history.filter(item => item !== keyword);
    this.saveSearchHistory(history);
    this.renderSearchHistory();
  },
  
  // 清空搜索历史
  clearSearchHistory() {
    localStorage.removeItem('searchHistory');
    this.renderSearchHistory();
    this.showToast('搜索历史已清空', 'success');
  },
  
  // 显示搜索历史
  showSearchHistory() {
    const searchHistory = document.getElementById('searchHistory');
    if (searchHistory) {
      this.renderSearchHistory();
      searchHistory.classList.add('active');
    }
  },
  
  // 隐藏搜索历史
  hideSearchHistory() {
    const searchHistory = document.getElementById('searchHistory');
    if (searchHistory) {
      searchHistory.classList.remove('active');
    }
  },
  
  // 是否显示全部历史
  showAllHistory: false,
  
  // 切换显示全部历史
  toggleShowAllHistory() {
    this.showAllHistory = !this.showAllHistory;
    this.renderSearchHistory();
  },
  
  // 渲染搜索历史
  renderSearchHistory() {
    const historyList = document.getElementById('searchHistoryList');
    const historyMore = document.getElementById('searchHistoryMore');
    const showMoreBtn = document.getElementById('showMoreHistory');
    
    if (!historyList) return;
    
    const history = this.getSearchHistory();
    
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="search-history-empty">
          <span class="icon">🔍</span>
          <div>暂无搜索记录</div>
        </div>
      `;
      if (historyMore) historyMore.style.display = 'none';
      return;
    }
    
    // 默认显示10条，展开显示全部
    const displayCount = this.showAllHistory ? history.length : Math.min(10, history.length);
    const displayHistory = history.slice(0, displayCount);
    
    historyList.innerHTML = displayHistory.map((keyword, index) => `
      <div class="search-history-item" data-keyword="${keyword}">
        <div class="history-text">
          <span class="icon">${index < 3 ? '🔥' : '🕐'}</span>
          <span class="keyword">${keyword}</span>
        </div>
        <button class="delete-btn" data-keyword="${keyword}" title="删除">×</button>
      </div>
    `).join('');
    
    // 绑定点击事件
    historyList.querySelectorAll('.search-history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-btn')) {
          const keyword = item.dataset.keyword;
          document.getElementById('searchInput').value = keyword;
          this.hideSearchHistory();
          // 触发搜索
          document.getElementById('searchBtn').click();
        }
      });
    });
    
    // 绑定删除按钮事件
    historyList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const keyword = btn.dataset.keyword;
        this.removeSearchHistory(keyword);
      });
    });
    
    // 显示/隐藏"展开更多"按钮
    if (historyMore) {
      if (history.length > 10) {
        historyMore.style.display = 'block';
        if (showMoreBtn) {
          showMoreBtn.textContent = this.showAllHistory ? '收起 ▲' : '展开更多 ▼';
        }
      } else {
        historyMore.style.display = 'none';
      }
    }
  },
  
  // 验证数据源地址格式
  validateSourceUrl(url) {
    // 检查是否是有效的URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, message: 'URL必须以http://或https://开头' };
    }
    
    // 检查是否包含api.php/provide/vod路径
    if (!url.includes('api.php/provide/vod')) {
      return { 
        valid: false, 
        message: 'CMSV10数据源地址格式不正确！\n\n正确格式示例：\nhttps://域名/api.php/provide/vod/\n\n请检查地址是否完整' 
      };
    }
    
    return { valid: true };
  },
  
  // 添加数据源
  addSource(name, url) {
    // 验证URL格式
    const validation = this.validateSourceUrl(url);
    if (!validation.valid) {
      this.showToast(validation.message, 'error');
      return null;
    }
    
    // 确保以/结尾
    if (!url.endsWith('/')) {
      url += '/';
    }
    
    const source = {
      id: Date.now(),
      name,
      url,
      categories: []
    };
    
    this.sources.push(source);
    this.saveSources();
    this.updateSourceUI();
    
    // 如果是第一个数据源，自动设为当前源
    if (this.sources.length === 1) {
      this.setCurrentSource(source.id);
    }
    
    return source;
  },
  
  // 删除数据源
  deleteSource(id) {
    this.sources = this.sources.filter(s => s.id !== id);
    
    if (this.currentSource && this.currentSource.id === id) {
      this.currentSource = this.sources.length > 0 ? this.sources[0] : null;
    }
    
    this.saveSources();
    this.updateSourceUI();
  },
  
  // 设置当前数据源
  setCurrentSource(id) {
    const source = this.sources.find(s => s.id === id);
    if (source) {
      this.currentSource = source;
      this.saveSources();
      this.updateSourceUI();
      
      // 加载分类
      this.loadCategories();
      
      return true;
    }
    return false;
  },
  
  // 加载分类
  async loadCategories() {
    if (!this.currentSource) return;
    
    try {
      const data = await API.getList(this.currentSource.url, 1);
      if (data.class && data.class.length > 0) {
        this.currentSource.categories = data.class;
        this.categories = data.class;
        this.saveSources();
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  },
  
  // 更新数据源UI
  updateSourceUI() {
    const select = document.getElementById('currentSourceSelect');
    const list = document.getElementById('sourceList');
    
    // 更新下拉框
    if (select) {
      select.innerHTML = '<option value="">请选择数据源</option>';
      this.sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.name;
        if (this.currentSource && this.currentSource.id === source.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }
    
    // 更新列表
    if (list) {
      if (this.sources.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">暂无数据源，请添加</p>';
      } else {
        list.innerHTML = this.sources.map(source => `
          <div class="source-item">
            <div class="source-item-info">
              <h4>${source.name} ${this.currentSource && this.currentSource.id === source.id ? '<span style="color: var(--success-color);">(当前)</span>' : ''}</h4>
              <p>${source.url}</p>
            </div>
            <div class="source-item-actions">
              <button class="btn-small" onclick="App.switchSource(${source.id})">切换</button>
              <button class="btn-small delete" onclick="App.deleteSource(${source.id})">删除</button>
            </div>
          </div>
        `).join('');
      }
    }
  },
  
  // 切换数据源
  async switchSource(id) {
    if (this.setCurrentSource(id)) {
      this.showToast('已切换到新数据源，正在加载...', 'success');
      this.updateSourceUI();
      
      // 关闭数据源弹窗
      const sourceModal = document.getElementById('sourceModal');
      if (sourceModal) {
        sourceModal.classList.remove('active');
      }
      
      // 延迟一下确保数据保存后再刷新页面
      setTimeout(() => {
        // 刷新页面到首页
        window.location.hash = '#/';
        window.location.reload();
      }, 500);
    }
  },
  
  // 绑定事件
  bindEvents() {
    // 数据源管理按钮
    const sourceBtn = document.getElementById('sourceBtn');
    const sourceModal = document.getElementById('sourceModal');
    const closeModal = document.getElementById('closeModal');
    
    if (sourceBtn) {
      sourceBtn.addEventListener('click', () => {
        sourceModal.classList.add('active');
      });
    }
    
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        sourceModal.classList.remove('active');
      });
    }
    
    // 点击弹窗外部关闭
    if (sourceModal) {
      sourceModal.addEventListener('click', (e) => {
        if (e.target === sourceModal) {
          sourceModal.classList.remove('active');
        }
      });
    }
    
    // 当前数据源选择
    const currentSourceSelect = document.getElementById('currentSourceSelect');
    if (currentSourceSelect) {
      currentSourceSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.switchSource(parseInt(e.target.value));
        }
      });
    }
    
    // 添加数据源
    const addSourceBtn = document.getElementById('addSourceBtn');
    if (addSourceBtn) {
      addSourceBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('newSourceName');
        const urlInput = document.getElementById('newSourceUrl');
        
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        
        if (!name || !url) {
          this.showToast('请填写完整信息', 'error');
          return;
        }
        
        // 添加数据源
        const source = this.addSource(name, url);
        if (!source) {
          // 验证失败，addSource已经显示了错误信息
          return;
        }
        
        // 清空输入
        nameInput.value = '';
        urlInput.value = '';
        
        // 测试数据源是否可用
        this.showToast('正在测试数据源...', 'info');
        
        try {
          const testData = await API.getList(source.url, 1);
          
          if (testData.code === 0 && testData.msg && testData.msg.includes('请求失败')) {
            this.showToast('数据源连接失败，请检查地址是否正确', 'error');
            // 删除添加的数据源
            this.deleteSource(source.id);
            return;
          }
          
          if (testData.list && testData.list.length > 0) {
            this.showToast('数据源添加成功，已获取 ' + testData.list.length + ' 条数据', 'success');
            // 刷新页面显示数据
            Router.navigate('#/');
          } else {
            this.showToast('数据源添加成功，但未获取到数据', 'warning');
          }
          
        } catch (error) {
          this.showToast('数据源测试失败: ' + error.message, 'error');
          // 删除添加的数据源
          this.deleteSource(source.id);
        }
      });
    }
    
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    const doSearch = () => {
      const keyword = searchInput.value.trim();
      if (keyword) {
        // 保存搜索历史
        this.addSearchHistory(keyword);
        // 隐藏搜索历史
        this.hideSearchHistory();
        Router.navigate(`#/search?wd=${encodeURIComponent(keyword)}`);
        searchInput.value = '';
      }
    };
    
    if (searchBtn) {
      searchBtn.addEventListener('click', doSearch);
    }
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          doSearch();
        }
      });
      
      // 搜索框获得焦点时显示搜索历史
      searchInput.addEventListener('focus', () => {
        this.showSearchHistory();
      });
      
      // 点击外部隐藏搜索历史
      document.addEventListener('click', (e) => {
        const searchBox = document.querySelector('.search-box');
        if (searchBox && !searchBox.contains(e.target)) {
          this.hideSearchHistory();
        }
      });
    }
    
    // 搜索历史相关按钮
    const clearHistoryBtn = document.getElementById('clearHistory');
    const showMoreHistoryBtn = document.getElementById('showMoreHistory');
    
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearSearchHistory();
      });
    }
    
    if (showMoreHistoryBtn) {
      showMoreHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleShowAllHistory();
      });
    }
    
    // 重置数据源按钮
    const resetSourceBtn = document.getElementById('resetSourceBtn');
    if (resetSourceBtn) {
      resetSourceBtn.addEventListener('click', () => {
        if (confirm('确定要重置为默认数据源吗？这将清除所有已配置的数据源。')) {
          // 清除本地存储
          localStorage.removeItem('videoSources');
          localStorage.removeItem('currentSource');
          localStorage.removeItem('sourcesInitialized');
          
          // 重新加载默认数据源
          this.sources = [...this.defaultSources];
          this.currentSource = this.sources[0];
          this.saveSources();
          localStorage.setItem('sourcesInitialized', 'true');
          
          this.updateSourceUI();
          this.showToast('已重置为默认数据源', 'success');
          
          // 关闭弹窗并刷新页面
          document.getElementById('sourceModal').classList.remove('active');
          Router.navigate('#/');
        }
      });
    }
  },
  
  // 初始化移动端菜单
  initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
      });
      
      // 点击菜单项后关闭菜单
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('active');
        });
      });
    }
  },
  
  // 显示/隐藏加载
  showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
      if (show) {
        loading.classList.add('active');
      } else {
        loading.classList.remove('active');
      }
    }
  },
  
  // 显示提示消息
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = 'toast ' + type;
      toast.classList.add('active');
      
      setTimeout(() => {
        toast.classList.remove('active');
      }, 3000);
    }
  },
  
  // 解析播放地址
  parsePlayUrls(playFrom, playUrl) {
    if (!playFrom || !playUrl) return [];
    
    const fromNames = playFrom.split('$$$');
    const urlParts = playUrl.split('$$$');
    const sources = [];
    
    for (let i = 0; i < urlParts.length; i++) {
      const episodes = [];
      const episodeParts = urlParts[i].split('#');
      
      for (const part of episodeParts) {
        const match = part.match(/(.+?)\$(.+)/);
        if (match) {
          episodes.push({
            name: match[1].trim(),
            url: match[2].trim()
          });
        }
      }
      
      if (episodes.length > 0) {
        sources.push({
          name: fromNames[i] || `播放源${i + 1}`,
          episodes: episodes
        });
      }
    }
    
    // 优先返回m3u8格式的播放源
    return sources.sort((a, b) => {
      const aHasM3u8 = a.episodes.some(ep => ep.url.includes('.m3u8'));
      const bHasM3u8 = b.episodes.some(ep => ep.url.includes('.m3u8'));
      return bHasM3u8 - aHasM3u8;
    });
  }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
