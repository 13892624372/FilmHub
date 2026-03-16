// ========================================
// 影视网站 - 路由管理
// ========================================

const Router = {
  // 当前路由
  currentRoute: '',
  
  // 初始化路由
  init() {
    // 监听hash变化
    window.addEventListener('hashchange', () => {
      this.handleRoute();
    });
    
    // 初始路由
    this.handleRoute();
  },
  
  // 导航到指定路由
  navigate(hash) {
    window.location.hash = hash;
  },
  
  // 处理路由
  handleRoute() {
    const hash = window.location.hash || '#/';
    this.currentRoute = hash;
    
    // 更新导航状态
    this.updateNavState();
    
    // 解析路由
    const route = this.parseRoute(hash);
    
    // 渲染对应页面
    switch (route.path) {
      case '/':
        this.renderHome();
        break;
      case '/movie':
        this.renderCategory('movie');
        break;
      case '/tv':
        this.renderCategory('tv');
        break;
      case '/variety':
        this.renderCategory('variety');
        break;
      case '/anime':
        this.renderCategory('anime');
        break;
      case '/list':
        this.renderList(route.params);
        break;
      case '/detail':
        this.renderDetail(route.params);
        break;
      case '/play':
        this.renderPlayer(route.params);
        break;
      case '/search':
        this.renderSearch(route.params);
        break;
      case '/source':
        this.renderSourceSettings();
        break;
      default:
        this.renderHome();
    }
    
    // 滚动到顶部
    window.scrollTo(0, 0);
  },
  
  // 解析路由
  parseRoute(hash) {
    // 去掉 #
    const path = hash.substring(1);
    const queryIndex = path.indexOf('?');
    
    let routePath = path;
    let params = {};
    
    if (queryIndex > -1) {
      routePath = path.substring(0, queryIndex);
      const queryString = path.substring(queryIndex + 1);
      params = this.parseQueryString(queryString);
    }
    
    return {
      path: routePath,
      params: params
    };
  },
  
  // 解析查询参数
  parseQueryString(queryString) {
    const params = {};
    const pairs = queryString.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[key] = decodeURIComponent(value || '');
      }
    }
    
    return params;
  },
  
  // 更新导航状态
  updateNavState() {
    const hash = window.location.hash || '#/';
    
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === hash.split('?')[0]) {
        item.classList.add('active');
      }
    });
  },
  
  // 渲染首页
  async renderHome() {
    const mainContent = document.getElementById('mainContent');
    
    if (!App.currentSource) {
      mainContent.innerHTML = this.getEmptySourceHTML();
      return;
    }
    
    App.showLoading(true);
    
    try {
      console.log('当前数据源:', App.currentSource);
      
      // 获取首页数据
      const data = await API.getList(App.currentSource.url, 1);
      
      console.log('API返回数据:', data);
      
      // 检查是否请求失败
      if (data.code === 0 && data.msg && data.msg.includes('请求失败')) {
        mainContent.innerHTML = this.getErrorHTML(data.msg + '<br><br>可能原因：<br>1. 数据源地址不正确<br>2. 数据源需要特定请求头<br>3. 网络连接问题<br><br>请尝试其他数据源');
        App.showLoading(false);
        return;
      }
      
      // 保存分类
      if (data.class && data.class.length > 0) {
        App.categories = data.class;
        App.currentSource.categories = data.class;
        App.saveSources();
      }
      
      let html = '';
      
      // 分类导航
      html += this.getCategoryHTML(data.class);
      
      // 最新影视
      html += '<div class="video-section">';
      html += '<h2 class="category-title">🆕 最新更新</h2>';
      html += this.getVideoGridHTML(data.list);
      html += '</div>';
      
      // 分页
      if (data.pagecount > 1) {
        html += this.getPaginationHTML(data.page, data.pagecount, '#/list?page=');
      }
      
      mainContent.innerHTML = html;
      
      // 异步加载海报
      this.loadPosters(data.list);
      
    } catch (error) {
      console.error('渲染首页错误:', error);
      mainContent.innerHTML = this.getErrorHTML('加载失败：' + error.message);
    } finally {
      App.showLoading(false);
    }
  },
  
  // 渲染分类页
  async renderCategory(type) {
    const mainContent = document.getElementById('mainContent');
    
    if (!App.currentSource) {
      mainContent.innerHTML = this.getEmptySourceHTML();
      return;
    }
    
    // 分类映射 - 更精确的关键词匹配
    const typeMap = {
      'movie': { 
        name: '电影', 
        keywords: ['电影', '片'],
        exclude: ['电视剧', '剧', '综艺', '动漫', '动画']
      },
      'tv': { 
        name: '电视剧', 
        keywords: ['电视剧', '剧'],
        exclude: ['电影', '综艺', '动漫', '动画']
      },
      'variety': { 
        name: '综艺', 
        keywords: ['综艺'],
        exclude: ['电影', '电视剧', '剧', '动漫', '动画']
      },
      'anime': { 
        name: '动漫', 
        keywords: ['动漫', '动画'],
        exclude: ['电影', '电视剧', '剧', '综艺']
      }
    };
    
    const category = typeMap[type];
    
    App.showLoading(true);
    
    try {
      // 获取数据
      const data = await API.getList(App.currentSource.url, 1);
      
      // 检查是否请求失败
      if (data.code === 0 && data.msg && data.msg.includes('请求失败')) {
        mainContent.innerHTML = this.getErrorHTML(data.msg);
        App.showLoading(false);
        return;
      }
      
      // 筛选对应分类 - 更智能的匹配逻辑
      let matchedTypes = [];
      if (data.class && data.class.length > 0) {
        matchedTypes = data.class.filter(c => {
          const typeName = c.type_name;
          // 必须包含关键词
          const hasKeyword = category.keywords.some(k => typeName.includes(k));
          // 不能包含排除词
          const hasExclude = category.exclude.some(e => typeName.includes(e) && !category.keywords.includes(e));
          return hasKeyword && !hasExclude;
        });
      }
      
      console.log(`分类 ${category.name} 匹配结果:`, matchedTypes);
      
      // 获取该分类的影视
      let videos = [];
      let pagecount = 1;
      let currentTypeId = null;
      
      if (matchedTypes.length > 0) {
        // 使用第一个匹配的分类
        currentTypeId = matchedTypes[0].type_id;
        const categoryData = await API.getList(App.currentSource.url, 1, currentTypeId);
        videos = categoryData.list || [];
        pagecount = categoryData.pagecount || 1;
        
        // 如果第一个分类没有数据，尝试其他匹配的分类
        if (videos.length === 0 && matchedTypes.length > 1) {
          for (let i = 1; i < matchedTypes.length; i++) {
            const fallbackData = await API.getList(App.currentSource.url, 1, matchedTypes[i].type_id);
            if (fallbackData.list && fallbackData.list.length > 0) {
              videos = fallbackData.list;
              pagecount = fallbackData.pagecount || 1;
              currentTypeId = matchedTypes[i].type_id;
              break;
            }
          }
        }
      }
      
      let html = '';
      
      // 分类导航
      html += this.getCategoryHTML(data.class, currentTypeId);
      
      // 影视列表
      html += '<div class="video-section">';
      html += `<h2 class="category-title">🎬 ${category.name}</h2>`;
      
      if (videos.length === 0) {
        html += this.getEmptyHTML('该分类暂无数据，请尝试其他分类或数据源');
      } else {
        html += this.getVideoGridHTML(videos);
      }
      
      html += '</div>';
      
      // 分页
      if (pagecount > 1) {
        html += this.getPaginationHTML(1, pagecount, `#/list?type=${currentTypeId || ''}&page=`);
      }
      
      mainContent.innerHTML = html;
      
      // 异步加载海报
      if (videos.length > 0) {
        this.loadPosters(videos);
      }
      
    } catch (error) {
      console.error('渲染分类页错误:', error);
      mainContent.innerHTML = this.getErrorHTML('加载失败：' + error.message);
    } finally {
      App.showLoading(false);
    }
  },
  
  // 渲染列表页
  async renderList(params) {
    const mainContent = document.getElementById('mainContent');
    
    if (!App.currentSource) {
      mainContent.innerHTML = this.getEmptySourceHTML();
      return;
    }
    
    const page = parseInt(params.page) || 1;
    const typeId = params.type || null;
    
    App.showLoading(true);
    
    try {
      // 先获取分类列表
      const classData = await API.getList(App.currentSource.url, 1);
      const categories = classData.class || [];
      
      // 获取当前选中的分类名称
      let currentTypeName = '';
      if (typeId) {
        const currentCat = categories.find(c => String(c.type_id) === String(typeId));
        if (currentCat) {
          currentTypeName = currentCat.type_name;
        }
      }
      
      // 然后获取列表数据
      const data = await API.getList(App.currentSource.url, page, typeId);
      
      // 检查是否请求失败
      if (data.code === 0 && data.msg && data.msg.includes('请求失败')) {
        mainContent.innerHTML = this.getErrorHTML(data.msg);
        App.showLoading(false);
        return;
      }
      
      let html = '';
      
      // 分类导航 - 使用获取到的分类列表
      html += this.getCategoryHTML(categories, typeId);
      
      // 影视列表
      html += '<div class="video-section">';
      if (currentTypeName) {
        html += `<h2 class="category-title">📺 ${currentTypeName}</h2>`;
      } else {
        html += '<h2 class="category-title">📺 全部影视</h2>';
      }
      
      if (!data.list || data.list.length === 0) {
        html += this.getEmptyHTML('该分类暂无数据，请尝试其他分类');
      } else {
        html += this.getVideoGridHTML(data.list);
      }
      html += '</div>';
      
      // 分页
      if (data.pagecount > 1) {
        html += this.getPaginationHTML(
          data.page, 
          data.pagecount, 
          typeId ? `#/list?type=${typeId}&page=` : '#/list?page='
        );
      }
      
      mainContent.innerHTML = html;
      
      // 异步加载海报
      if (data.list && data.list.length > 0) {
        this.loadPosters(data.list);
      }
      
    } catch (error) {
      console.error('渲染列表页错误:', error);
      mainContent.innerHTML = this.getErrorHTML('加载失败：' + error.message);
    } finally {
      App.showLoading(false);
    }
  },
  
  // 渲染详情页
  async renderDetail(params) {
    const mainContent = document.getElementById('mainContent');
    
    if (!App.currentSource) {
      mainContent.innerHTML = this.getEmptySourceHTML();
      return;
    }
    
    const ids = params.id;
    if (!ids) {
      mainContent.innerHTML = this.getErrorHTML('缺少视频ID');
      return;
    }
    
    App.showLoading(true);
    
    try {
      const detail = await API.getDetail(App.currentSource.url, ids);
      
      if (!detail) {
        mainContent.innerHTML = this.getErrorHTML('视频不存在');
        return;
      }
      
      // 解析播放源
      const playSources = App.parsePlayUrls(detail.vod_play_from, detail.vod_play_url);
      
      let html = '<div class="detail-container">';
      
      // 左侧海报
      html += '<div class="detail-poster">';
      html += `<img src="${detail.vod_pic || 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${detail.vod_name}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">`;
      html += '</div>';
      
      // 右侧信息
      html += '<div class="detail-info">';
      html += `<h1>${detail.vod_name}</h1>`;
      
      // 元信息
      html += '<div class="detail-meta">';
      if (detail.type_name) html += `<span>${detail.type_name}</span>`;
      if (detail.vod_time) html += `<span>${detail.vod_time.split(' ')[0]}</span>`;
      if (detail.vod_remarks) html += `<span>${detail.vod_remarks}</span>`;
      html += '</div>';
      
      // 演员导演
      if (detail.vod_actor) {
        html += `<p style="margin-bottom: 10px; color: var(--text-secondary);"><strong>演员：</strong>${detail.vod_actor}</p>`;
      }
      if (detail.vod_director) {
        html += `<p style="margin-bottom: 20px; color: var(--text-secondary);"><strong>导演：</strong>${detail.vod_director}</p>`;
      }
      
      // 剧情简介
      if (detail.vod_content) {
        html += '<div class="detail-desc">';
        html += `<p>${detail.vod_content.replace(/<[^>]+>/g, '')}</p>`;
        html += '</div>';
      }
      
      // 操作按钮
      html += '<div class="detail-actions">';
      if (playSources.length > 0 && playSources[0].episodes.length > 0) {
        html += `<button class="btn-play" onclick="Router.navigate('#/play?id=${ids}&source=0&ep=0')">▶ 立即播放</button>`;
      }
      html += `<button class="btn-favorite" onclick="App.showToast('收藏功能开发中', 'info')">♥ 收藏</button>`;
      html += '</div>';
      
      // 播放源和选集
      if (playSources.length > 0) {
        html += '<div class="source-section">';
        html += '<h3>播放源</h3>';
        html += '<div class="source-tabs">';
        playSources.forEach((source, index) => {
          html += `<button class="source-tab ${index === 0 ? 'active' : ''}" onclick="switchPlaySource(${index})">${source.name}</button>`;
        });
        html += '</div>';
        
        html += '<h3>选集播放</h3>';
        playSources.forEach((source, sourceIndex) => {
          html += `<div class="episode-list" id="episodeList${sourceIndex}" style="${sourceIndex === 0 ? '' : 'display: none;'}">`;
          html += '<div class="episode-grid">';
          source.episodes.forEach((ep, epIndex) => {
            html += `<button class="episode-btn" onclick="Router.navigate('#/play?id=${ids}&source=${sourceIndex}&ep=${epIndex}')">${ep.name}</button>`;
          });
          html += '</div>';
          html += '</div>';
        });
        
        html += '</div>';
      }
      
      html += '</div>';
      html += '</div>';
      
      mainContent.innerHTML = html;
      
      // 添加切换播放源函数
      window.switchPlaySource = (index) => {
        document.querySelectorAll('.source-tab').forEach((tab, i) => {
          tab.classList.toggle('active', i === index);
        });
        document.querySelectorAll('.episode-list').forEach((list, i) => {
          list.style.display = i === index ? 'block' : 'none';
        });
      };
      
    } catch (error) {
      mainContent.innerHTML = this.getErrorHTML('加载失败：' + error.message);
    } finally {
      App.showLoading(false);
    }
  },
  
  // 渲染播放页
  async renderPlayer(params) {
    const mainContent = document.getElementById('mainContent');
    
    if (!App.currentSource) {
      mainContent.innerHTML = this.getEmptySourceHTML();
      return;
    }
    
    const ids = params.id;
    const sourceIndex = parseInt(params.source) || 0;
    const epIndex = parseInt(params.ep) || 0;
    
    if (!ids) {
      mainContent.innerHTML = this.getErrorHTML('缺少视频ID');
      return;
    }
    
    App.showLoading(true);
    
    try {
      const detail = await API.getDetail(App.currentSource.url, ids);
      
      if (!detail) {
        mainContent.innerHTML = this.getErrorHTML('视频不存在');
        return;
      }
      
      // 解析播放源
      const playSources = App.parsePlayUrls(detail.vod_play_from, detail.vod_play_url);
      
      if (playSources.length === 0 || !playSources[sourceIndex]) {
        mainContent.innerHTML = this.getErrorHTML('播放地址不存在');
        return;
      }
      
      const currentSource = playSources[sourceIndex];
      const currentEp = currentSource.episodes[epIndex];
      
      if (!currentEp) {
        mainContent.innerHTML = this.getErrorHTML('剧集不存在');
        return;
      }
      
      let html = '<div class="player-page">';
      
      // 播放器
      html += '<div class="player-container">';
      html += `<video id="videoPlayer" class="video-player" controls autoplay></video>`;
      html += '</div>';
      
      // 播放信息
      html += '<div class="player-info">';
      html += `<h2>${detail.vod_name} - ${currentEp.name}</h2>`;
      html += `<p>播放源：${currentSource.name}</p>`;
      html += '</div>';
      
      // 选集
      html += '<div class="source-section">';
      html += '<h3>切换播放源</h3>';
      html += '<div class="source-tabs">';
      playSources.forEach((source, index) => {
        html += `<button class="source-tab ${index === sourceIndex ? 'active' : ''}" onclick="Router.navigate('#/play?id=${ids}&source=${index}&ep=0')">${source.name}</button>`;
      });
      html += '</div>';
      
      html += '<h3>选集</h3>';
      html += '<div class="episode-grid">';
      currentSource.episodes.forEach((ep, index) => {
        html += `<button class="episode-btn ${index === epIndex ? 'active' : ''}" onclick="Router.navigate('#/play?id=${ids}&source=${sourceIndex}&ep=${index}')">${ep.name}</button>`;
      });
      html += '</div>';
      
      html += '</div>';
      html += '</div>';
      
      mainContent.innerHTML = html;
      
      // 初始化播放器
      this.initPlayer(currentEp.url);
      
    } catch (error) {
      mainContent.innerHTML = this.getErrorHTML('加载失败：' + error.message);
    } finally {
      App.showLoading(false);
    }
  },
  
  // 初始化播放器
  initPlayer(videoUrl) {
    const video = document.getElementById('videoPlayer');
    if (!video) return;
    
    // 判断是否为m3u8格式
    if (videoUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        App.showToast('播放出错，请尝试其他播放源', 'error');
      });
    } else {
      // 普通视频格式
      video.src = videoUrl;
      video.play();
    }
  },
  
  // 渲染搜索页
  async renderSearch(params) {
    const mainContent = document.getElementById('mainContent');
    
    if (!App.currentSource) {
      mainContent.innerHTML = this.getEmptySourceHTML();
      return;
    }
    
    const keyword = params.wd;
    const page = parseInt(params.page) || 1;
    
    if (!keyword) {
      mainContent.innerHTML = this.getErrorHTML('请输入搜索关键词');
      return;
    }
    
    App.showLoading(true);
    
    try {
      const data = await API.search(App.currentSource.url, keyword, page);
      
      // 检查是否请求失败
      if (data.code === 0 && data.msg && data.msg.includes('请求失败')) {
        mainContent.innerHTML = this.getErrorHTML(data.msg);
        App.showLoading(false);
        return;
      }
      
      let html = '';
      
      // 搜索标题
      html += '<div class="search-header">';
      html += `<h2>"<span>${keyword}</span>" 的搜索结果</h2>`;
      html += '</div>';
      
      // 搜索结果
      if (data.list && data.list.length > 0) {
        html += this.getVideoGridHTML(data.list);
        
        // 分页
        if (data.pagecount > 1) {
          html += this.getPaginationHTML(
            data.page, 
            data.pagecount, 
            `#/search?wd=${encodeURIComponent(keyword)}&page=`
          );
        }
      } else {
        html += this.getEmptyHTML('没有找到相关影视');
      }
      
      mainContent.innerHTML = html;
      
      // 异步加载海报
      this.loadPosters(data.list);
      
    } catch (error) {
      mainContent.innerHTML = this.getErrorHTML('搜索失败：' + error.message);
    } finally {
      App.showLoading(false);
    }
  },
  
  // 渲染数据源设置页
  renderSourceSettings() {
    const sourceBtn = document.getElementById('sourceBtn');
    if (sourceBtn) {
      sourceBtn.click();
    }
    // 返回首页
    this.navigate('#/');
  },
  
  // 获取分类HTML - 智能分类映射
  getCategoryHTML(categories, activeTypeId = null) {
    if (!categories || categories.length === 0) return '';
    
    // 智能分类映射表 - 将各种数据源的不同命名统一归类
    const categoryMapping = {
      // 电影类
      'movie': {
        keywords: ['电影', '片'],
        exclude: ['电视剧', '剧', '综艺', '动漫', '动画'],
        icon: '🎬'
      },
      // 电视剧类
      'tv': {
        keywords: ['电视剧', '剧'],
        exclude: ['电影', '综艺', '动漫', '动画'],
        icon: '📺'
      },
      // 综艺类
      'variety': {
        keywords: ['综艺'],
        exclude: ['电影', '电视剧', '剧', '动漫', '动画'],
        icon: '🎪'
      },
      // 动漫类
      'anime': {
        keywords: ['动漫', '动画'],
        exclude: ['电影', '电视剧', '剧', '综艺'],
        icon: '🎨'
      },
      // 纪录片
      'documentary': {
        keywords: ['纪录', '记录', '纪实'],
        exclude: [],
        icon: '📹'
      }
    };
    
    // 对分类进行智能分组
    const groupedCategories = {
      'movie': [],
      'tv': [],
      'variety': [],
      'anime': [],
      'documentary': [],
      'other': []
    };
    
    categories.forEach(cat => {
      const typeName = cat.type_name;
      let matched = false;
      
      // 检查每个分类类型
      for (const [type, config] of Object.entries(categoryMapping)) {
        const hasKeyword = config.keywords.some(k => typeName.includes(k));
        const hasExclude = config.exclude.some(e => typeName.includes(e) && !config.keywords.includes(e));
        
        if (hasKeyword && !hasExclude) {
          groupedCategories[type].push(cat);
          matched = true;
          break;
        }
      }
      
      // 如果没有匹配到任何分类，放入其他
      if (!matched) {
        groupedCategories['other'].push(cat);
      }
    });
    
    let html = '<div class="category-section">';
    html += '<h2 class="category-title">📂 分类筛选</h2>';
    html += '<div class="category-list">';
    
    // 全部
    html += `<a href="#/list" class="category-item ${!activeTypeId ? 'active' : ''}">全部</a>`;
    
    // 按分组渲染分类
    const groupOrder = ['movie', 'tv', 'variety', 'anime', 'documentary', 'other'];
    const groupNames = {
      'movie': '电影',
      'tv': '电视剧',
      'variety': '综艺',
      'anime': '动漫',
      'documentary': '纪录片',
      'other': '其他'
    };
    
    groupOrder.forEach(groupKey => {
      const groupCats = groupedCategories[groupKey];
      if (groupCats.length > 0) {
        // 如果这个分组有多个分类，显示分组标题
        if (groupCats.length > 1) {
          // 找到当前激活的分类
          const activeInGroup = groupCats.find(cat => String(cat.type_id) === String(activeTypeId));
          
          groupCats.forEach(cat => {
            const isActive = String(cat.type_id) === String(activeTypeId);
            html += `<a href="#/list?type=${cat.type_id}" class="category-item ${isActive ? 'active' : ''}" title="${groupNames[groupKey]} - ${cat.type_name}">${cat.type_name}</a>`;
          });
        } else {
          // 只有一个分类，直接显示
          const cat = groupCats[0];
          const isActive = String(cat.type_id) === String(activeTypeId);
          html += `<a href="#/list?type=${cat.type_id}" class="category-item ${isActive ? 'active' : ''}">${cat.type_name}</a>`;
        }
      }
    });
    
    html += '</div>';
    html += '</div>';
    
    return html;
  },
  
  // 获取视频网格HTML
  getVideoGridHTML(videos) {
    if (!videos || videos.length === 0) {
      return this.getEmptyHTML('暂无数据');
    }
    
    let html = '<div class="video-grid">';
    
    videos.forEach(video => {
      html += `<a href="#/detail?id=${video.vod_id}" class="video-card">`;
      html += '<div class="video-poster">';
      // 先用占位图，异步加载真实海报
      html += `<img src="https://via.placeholder.com/200x300?text=Loading" data-id="${video.vod_id}" alt="${video.vod_name}" class="poster-img">`;
      if (video.vod_remarks) {
        html += `<span class="video-badge">${video.vod_remarks}</span>`;
      }
      html += '</div>';
      html += '<div class="video-info">';
      html += `<h3 class="video-title">${video.vod_name}</h3>`;
      html += `<p class="video-meta">${video.type_name || ''}</p>`;
      html += '</div>';
      html += '</a>';
    });
    
    html += '</div>';
    
    return html;
  },
  
  // 异步加载海报
  async loadPosters(videos) {
    if (!videos || videos.length === 0 || !App.currentSource) return;
    
    // 批量获取详情（每次最多5个）
    const batchSize = 5;
    for (let i = 0; i < videos.length; i += batchSize) {
      const batch = videos.slice(i, i + batchSize);
      const ids = batch.map(v => v.vod_id).join(',');
      
      try {
        const detail = await API.getDetail(App.currentSource.url, ids);
        if (detail && detail.vod_pic) {
          // 更新对应视频的海报
          const img = document.querySelector(`img[data-id="${detail.vod_id}"]`);
          if (img) {
            img.src = detail.vod_pic;
          }
        }
      } catch (error) {
        console.error('加载海报失败:', error);
      }
    }
  },
  
  // 获取分页HTML
  getPaginationHTML(currentPage, totalPages, baseUrl) {
    if (totalPages <= 1) return '';
    
    let html = '<div class="pagination">';
    
    // 上一页
    html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="Router.navigate('${baseUrl}${currentPage - 1}')">上一页</button>`;
    
    // 页码
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="Router.navigate('${baseUrl}${i}')">${i}</button>`;
    }
    
    // 下一页
    html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="Router.navigate('${baseUrl}${currentPage + 1}')">下一页</button>`;
    
    html += `<span class="page-info">${currentPage} / ${totalPages} 页</span>`;
    
    html += '</div>';
    
    return html;
  },
  
  // 获取空数据源提示HTML
  getEmptySourceHTML() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📡</div>
        <h3>暂无数据源</h3>
        <p>请先配置数据源才能浏览影视内容</p>
        <button class="btn-primary" style="margin-top: 20px; width: auto; padding: 12px 30px;" onclick="document.getElementById('sourceBtn').click()">
          立即配置数据源
        </button>
      </div>
    `;
  },
  
  // 获取空数据提示HTML
  getEmptyHTML(message) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>${message}</h3>
      </div>
    `;
  },
  
  // 获取错误提示HTML
  getErrorHTML(message) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>出错了</h3>
        <p>${message}</p>
        <button class="btn-primary" style="margin-top: 20px; width: auto; padding: 12px 30px;" onclick="location.reload()">
          重新加载
        </button>
      </div>
    `;
  }
};

// 初始化路由
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
});
