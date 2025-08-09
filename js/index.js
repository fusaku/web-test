// 首页脚本 - index.js

// 全局变量
let allVideos = [];
const batchSize = 15;   
const displayStep = 12; 
let filteredVideos = [];
let loadedBatches = 0;  
let displayedCount = 0; 

// DOM元素引用
const filterInput = document.getElementById('filter');
const videoGrid = document.getElementById('video-grid');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const mainContent = document.getElementById('main-content');

// 从外部JSON文件加载视频数据
async function loadVideoData() {
  try {
    showLoading();
    // 尝试加载 videos.json 文件
    const response = await fetch('./videos.json');
    if (!response.ok) {
      throw new Error('无法加载视频数据');
    }
    const data = await response.json();
    allVideos = data.videos || [];
    filteredVideos = [...allVideos];
    
    // 动态生成分类导航
    generateCategories();
    
    // 开始显示视频
    resetAndLoad();
    hideLoading();
  } catch (error) {
    console.error('加载视频数据失败:', error);
    hideLoading();
    // 如果加载失败，使用示例数据
    loadFallbackData();
  }
}

// 备用示例数据
function loadFallbackData() {
  allVideos = [];
  for(let i=1; i<=50; i++) {
    allVideos.push({
      id: "dQw4w9WgXcQ",
      title: "示例视频 #" + i,
      date: "2025-08-0" + ((i % 5) + 1),
      tags: ["示例", i % 3 === 0 ? "热门" : "普通"],
      description: "这是示例视频的描述"
    });
  }
  filteredVideos = [...allVideos];
  generateCategories();
  resetAndLoad();
}

// 动态生成分类导航
function generateCategories() {
  const years = [...new Set(allVideos.map(v => v.date?.substring(0, 4)).filter(Boolean))].sort().reverse();
  const months = [...new Set(allVideos.map(v => v.date?.substring(5, 7)).filter(Boolean))].sort();
  const tags = [...new Set(allVideos.flatMap(v => v.tags || []))].sort();

  // 生成年份导航
  const yearList = document.getElementById('yearList');
  yearList.innerHTML = years.map(year => 
    `<li data-filter="${year}">${year}年</li>`
  ).join('');

  // 生成月份导航
  const monthList = document.getElementById('monthList');
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  monthList.innerHTML = months.map(month => {
    const monthNum = parseInt(month);
    return `<li data-filter="${month}">${monthNames[monthNum-1]}</li>`;
  }).join('');

  // 生成标签导航
  const tagList = document.getElementById('tagList');
  tagList.innerHTML = tags.map(tag => 
    `<li data-filter="${tag}">${tag}</li>`
  ).join('');
}

// 创建视频项目元素
function createVideoItem(video) {
  const div = document.createElement('div');
  div.className = 'video-item';
  
  // 格式化日期
  const dateStr = video.date ? new Date(video.date).toLocaleDateString('zh-CN') : '';
  
  div.innerHTML = `
    <iframe src="https://www.youtube.com/embed/${video.id}" allowfullscreen></iframe>
    <div class="video-title" title="${video.displayTitle || video.title || '加载中...'}">${video.displayTitle || video.title || '加载中...'}</div>
    ${dateStr ? `<div class="video-date">${dateStr}</div>` : ''}
  `;
  
  // 添加点击事件跳转到播放页面
  div.addEventListener('click', () => {
    window.location.href = `player.html?v=${video.id}`;
  });
  
  // 如果还没有获取到真实标题，就去获取
  if (!video.displayTitle) {
    fetchYouTubeTitle(video.id).then(realTitle => {
      if (realTitle) {
        video.displayTitle = realTitle;
        const titleElement = div.querySelector('.video-title');
        if (titleElement) {
          titleElement.textContent = realTitle;
          titleElement.title = realTitle;
        }
      }
    });
  }
  
  return div;
}

// 获取 YouTube 视频真实标题
async function fetchYouTubeTitle(videoId) {
  try {
    // 使用 YouTube oEmbed API 获取视频信息
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return data.title;
    }
  } catch (error) {
    console.warn(`无法获取视频 ${videoId} 的标题:`, error);
  }
  return null;
}

// 加载下一批视频数据
function loadNextBatch() {
  showLoading();
  return new Promise(resolve => {
    setTimeout(() => {
      loadedBatches++;
      hideLoading();
      resolve();
    }, 300);
  });
}

// 显示更多视频
function showMoreVideos() {
  const totalLoadedVideos = loadedBatches * batchSize;
  if(displayedCount >= filteredVideos.length) return;
  if(displayedCount >= totalLoadedVideos) return;

  const nextCount = Math.min(displayedCount + displayStep, totalLoadedVideos, filteredVideos.length);
  for(let i = displayedCount; i < nextCount; i++) {
    videoGrid.appendChild(createVideoItem(filteredVideos[i]));
  }
  displayedCount = nextCount;
}

// 重置并加载
function resetAndLoad() {
  videoGrid.innerHTML = "";
  loadedBatches = 0;
  displayedCount = 0;
  
  if (filteredVideos.length === 0) {
    videoGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px; font-size: 16px;">没有找到相关视频</div>';
    return;
  }
  
  loadNextBatch().then(() => {
    showMoreVideos();
  });
}

// 显示加载状态
function showLoading() {
  loading.style.display = 'block';
  errorDiv.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
  loading.style.display = 'none';
}

// 显示错误状态
function showError(message) {
  errorDiv.textContent = message || '数据加载失败，请稍后重试';
  errorDiv.style.display = 'block';
  hideLoading();
}

// 清除导航栏激活状态
function clearActiveNav() {
  document.querySelectorAll('#sidebar li.active').forEach(li => li.classList.remove('active'));
}

// 分类点击处理
function onCategoryClick(type, value, element) {
  if (type === "year") {
    filteredVideos = allVideos.filter(v => v.date && v.date.startsWith(value));
  } else if (type === "month") {
    filteredVideos = allVideos.filter(v => v.date && v.date.substring(5, 7) === value);
  } else if (type === "tag") {
    filteredVideos = allVideos.filter(v => v.tags && v.tags.includes(value));
  }
  
  filterInput.value = "";
  clearActiveNav();
  element.classList.add('active');
  resetAndLoad();
}

// 搜索过滤
function handleSearch() {
  const text = filterInput.value.trim().toLowerCase();
  filteredVideos = allVideos.filter(v => 
    (v.title && v.title.toLowerCase().includes(text)) ||
    (v.displayTitle && v.displayTitle.toLowerCase().includes(text)) ||
    (v.description && v.description.toLowerCase().includes(text)) ||
    (v.tags && v.tags.some(tag => tag.toLowerCase().includes(text)))
  );
  clearActiveNav();
  resetAndLoad();
}

// 滚动加载处理
function handleScroll() {
  const scrollTop = mainContent.scrollTop;
  const scrollHeight = mainContent.scrollHeight;
  const clientHeight = mainContent.clientHeight;
  
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    if(displayedCount >= loadedBatches * batchSize && displayedCount < filteredVideos.length) {
      loadNextBatch().then(showMoreVideos);
    } else {
      showMoreVideos();
    }
  }
}

// 事件绑定
function bindEvents() {
  // 搜索框事件
  filterInput.addEventListener('input', handleSearch);
  
  // 分类导航事件
  document.getElementById('yearList').addEventListener('click', e => {
    if(e.target.tagName === 'LI') {
      onCategoryClick('year', e.target.dataset.filter, e.target);
    }
  });
  
  document.getElementById('monthList').addEventListener('click', e => {
    if(e.target.tagName === 'LI') {
      onCategoryClick('month', e.target.dataset.filter, e.target);
    }
  });
  
  document.getElementById('tagList').addEventListener('click', e => {
    if(e.target.tagName === 'LI') {
      onCategoryClick('tag', e.target.dataset.filter, e.target);
    }
  });

  // 滚动加载事件
  mainContent.addEventListener('scroll', handleScroll);
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filterInput.value) {
      filterInput.value = '';
      handleSearch();
    } else if (e.key === '/' && e.target !== filterInput) {
      e.preventDefault();
      filterInput.focus();
    }
  });
}

// 初始化应用
function initializeApp() {
  console.log('初始化首页应用...');
  
  // 绑定事件
  bindEvents();
  
  // 加载视频数据
  loadVideoData();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeApp);