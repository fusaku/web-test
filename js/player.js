// 播放页面脚本 - player.js

// 全局变量
let currentVideoId = '';
let subtitles = [];
let subtitlesVisible = true;
let player = null;
let updateInterval = null;
let loadingTimeout = null;
let usingFallback = false;
let apiReady = false;

// 用于跟踪已显示的字幕，避免重复创建
let activeSubtitles = new Set();
let subtitleElements = new Map(); // 存储字幕元素的引用
let displayedSubtitles = new Map(); // 记录每个时间点已显示过的字幕行：Map<时间戳, Set<字幕索引>>
let processedSubtitles = new Set(); // 跟踪已经处理过的字幕，防止重复

// 工具函数
function getVideoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function updateLoadingStatus(status) {
  const el = document.getElementById('loading-status');
  if (el) el.textContent = status;
  console.log('Loading status:', status);
}

function showSuccess() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');

  if (usingFallback) {
    document.getElementById('fallback-iframe').classList.remove('hidden');
    const notice = document.createElement('div');
    notice.className = 'fallback-notice';
    notice.textContent = '使用备用播放器 - 字幕可能不完全同步';
    document.getElementById('video-container').appendChild(notice);
  } else {
    document.getElementById('youtube-player').classList.remove('hidden');
  }

  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }

  console.log('Player loaded successfully, using fallback:', usingFallback);
}

function showError(message) {
  console.error('Showing error:', message);
  document.getElementById('error-message').textContent = message;
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('loading').classList.add('hidden');
}

function retryLoad() {
  location.reload();
}

// 获取视频标题
async function fetchVideoTitle(videoId) {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      return data.title || '视频播放';
    }
  } catch (error) {
    console.error('Failed to fetch video title:', error);
  }
  return '视频播放';
}

// 字幕相关函数
function parseASSTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 +
    parseInt(match[3]) + parseInt(match[4]) / 100;
}

// 改进的ASS字幕解析
function parseASSSubtitles(assContent) {
  const lines = assContent.split('\n');
  const subtitleLines = [];
  let inEvents = false;

  for (let line of lines) {
    line = line.trim();
    if (line === '[Events]') {
      inEvents = true;
      continue;
    }
    if (line.startsWith('[') && line !== '[Events]') {
      inEvents = false;
      continue;
    }

    if (inEvents && line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      if (parts.length >= 10) {
        const startTime = parseASSTime(parts[1].trim());
        const endTime = parseASSTime(parts[2].trim());
        const style = parts[3].trim();
        const text = parts.slice(9).join(',').replace(/\\N/g, '\n').trim();

        if (text && startTime !== null && endTime !== null) {
          subtitleLines.push({
            start: startTime,
            end: endTime,
            text: text,
            style: style
          });
        }
      }
    }
  }

  return subtitleLines.sort((a, b) => a.start - b.start);
}

// 改进的字幕加载
async function loadSubtitles(videoId) {
  try {
    console.log('Loading subtitles for:', videoId);
    const response = await fetch(`./subtitles/${videoId}.ass`);

    if (!response.ok) {
      throw new Error(`字幕文件不存在 (${response.status})`);
    }

    const assContent = await response.text();
    console.log('ASS content loaded, length:', assContent.length);

    subtitles = parseASSSubtitles(assContent);
    console.log('Parsed subtitles:', subtitles.length);

    if (subtitles.length > 0) {
      document.getElementById('subtitle-status').textContent = `字幕: ${subtitles.length} 行`;
      document.getElementById('subtitle-toggle').classList.remove('disabled');
      document.getElementById('subtitle-toggle').textContent = '隐藏字幕';
      return true;
    } else {
      throw new Error('字幕文件为空或格式不正确');
    }
  } catch (error) {
    console.error('Subtitle loading error:', error);
    document.getElementById('subtitle-status').textContent = '字幕: 无';
    document.getElementById('subtitle-toggle').classList.add('disabled');
    document.getElementById('subtitle-toggle').textContent = '无字幕';
    subtitles = [];
    subtitlesVisible = false;
    return false;
  }
}

// 字幕显示函数
function displayCurrentSubtitle(currentTime) {
  // 清理过期的时间记录（超过当前时间10秒的记录）
  for (const [timeKey, lineSet] of displayedSubtitles.entries()) {
    const recordTime = parseFloat(timeKey);
    if (currentTime - recordTime > 10) {
      displayedSubtitles.delete(timeKey);
    }
  }
  
  const overlay = document.getElementById('subtitle-overlay');

  if (!subtitlesVisible || subtitles.length === 0) {
    // 清除所有字幕
    overlay.innerHTML = '';
    activeSubtitles.clear();
    subtitleElements.clear();
    return;
  }

  // 检测时间跳跃，清理过时的显示记录
  if (typeof displayCurrentSubtitle.lastTime === 'undefined') {
    displayCurrentSubtitle.lastTime = currentTime;
  }

  const timeDiff = Math.abs(currentTime - displayCurrentSubtitle.lastTime);
  if (timeDiff > 1) { // 降低到1秒阈值
    console.log(`Time jump detected: ${displayCurrentSubtitle.lastTime} -> ${currentTime}`);
    displayedSubtitles.clear();
  }
  displayCurrentSubtitle.lastTime = currentTime;

  // 获取当前应该显示的字幕
  const currentSubs = subtitles.filter(sub =>
    currentTime >= sub.start && currentTime <= sub.end
  );

  // 创建当前应该显示的字幕ID集合
  const currentSubIds = new Set();

  currentSubs.forEach((sub, index) => {
    const lines = sub.text.split('\n');
    lines.forEach((line, lineIndex) => {
      if (!line.trim()) return;

      // 使用字幕在原数组中的真实索引作为唯一标识
      const realSubIndex = subtitles.indexOf(sub);
      const subId = `sub_${realSubIndex}_${lineIndex}_${sub.start}_${sub.end}`;
      const timeKey = `${sub.start.toFixed(1)}`; // 更准确的时间表示

      currentSubIds.add(subId);

      // 检查这个时间点的这一行字幕是否已经显示过
      if (!displayedSubtitles.has(timeKey)) {
        displayedSubtitles.set(timeKey, new Set());
      }

      const displayedAtTime = displayedSubtitles.get(timeKey);
      const lineKey = `${realSubIndex}_${lineIndex}`;

      // 如果字幕已经存在或这一行在这个时间点已经显示过，跳过创建
      if (activeSubtitles.has(subId) || displayedAtTime.has(lineKey)) {
        return;
      }

      // 标记这一行字幕在这个时间点已显示
      displayedAtTime.add(lineKey);
      // 标记为已处理
      processedSubtitles.add(subId);
      // 标记为活跃字幕
      activeSubtitles.add(subId);

      // 创建字幕元素
      const div = document.createElement('div');
      div.className = 'danmaku-subtitle';
      div.dataset.subtitleId = subId;
      div.dataset.startTime = sub.start;
      div.dataset.endTime = sub.end;

      // 存储元素引用
      subtitleElements.set(subId, div);

      // 解析ASS标签
      let cleanText = line;
      let moveData = null;

      // 提取移动标签
      const moveMatch = line.match(/\\move\((\d+),(\d+),(\d+),(\d+)\)/);
      const alphaMatch = line.match(/\\alpha&H([0-9A-Fa-f]+)&/);

      if (moveMatch) {
        moveData = {
          x1: parseInt(moveMatch[1]),
          y1: parseInt(moveMatch[2]),
          x2: parseInt(moveMatch[3]),
          y2: parseInt(moveMatch[4])
        };
      }

      // 设置基本样式
      div.style.position = 'absolute';
      div.style.color = '#fff';
      div.style.fontSize = '16px';
      div.style.fontWeight = '600';
      div.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 3px rgba(0,0,0,0.8)';
      div.style.whiteSpace = 'nowrap';
      div.style.pointerEvents = 'none';
      div.style.zIndex = '100';

      // 设置透明度
      if (alphaMatch) {
        const alpha = parseInt(alphaMatch[1], 16);
        div.style.opacity = (255 - alpha) / 255;
      }

      if (moveData) {
        // 弹幕动画：使用ASS坐标系统
        const containerWidth = overlay.offsetWidth || 1200;
        const containerHeight = overlay.offsetHeight || 675;
        const duration = sub.end - sub.start;

        // 将ASS坐标系统转换为CSS坐标
        const scaleX = containerWidth / 640;
        const scaleY = containerHeight / 360;

        const startX = moveData.x1 * scaleX;
        const startY = moveData.y1 * scaleY;
        const endX = moveData.x2 * scaleX;
        const endY = moveData.y2 * scaleY;

        // 设置初始位置
        div.style.left = `${startX}px`;
        div.style.top = `${startY}px`;
        div.style.transition = `all ${duration}s linear`;

        // 开始动画
        requestAnimationFrame(() => {
          div.style.left = `${endX}px`;
          div.style.top = `${endY}px`;
        });
      } else {
        // 默认弹幕处理
        const containerWidth = overlay.offsetWidth || 1200;
        const duration = sub.end - sub.start;
        const yPos = 20 + (index + lineIndex) * 25;

        div.style.left = `${containerWidth}px`;
        div.style.top = `${yPos}px`;
        div.style.transition = `left ${duration}s linear`;

        // 开始弹幕动画
        requestAnimationFrame(() => {
          div.style.left = `-200px`;
        });
      }

      // 处理文本样式标签
      cleanText = line.replace(/\{[^}]*\}/g, (match) => {
        if (match.includes('\\b1')) div.style.fontWeight = 'bold';
        if (match.includes('\\i1')) div.style.fontStyle = 'italic';
        if (match.includes('\\u1')) div.style.textDecoration = 'underline';
        if (match.includes('\\s1')) div.style.textDecoration = 'line-through';

        // 颜色标签
        const colorMatch = match.match(/\\c&H([0-9A-Fa-f]{6})&/);
        if (colorMatch) {
          const color = colorMatch[1];
          const r = parseInt(color.substr(4, 2), 16);
          const g = parseInt(color.substr(2, 2), 16);
          const b = parseInt(color.substr(0, 2), 16);
          div.style.color = `rgb(${r}, ${g}, ${b})`;
        }

        return '';
      });

      div.textContent = cleanText.trim();
      overlay.appendChild(div);
    });
  });

  // 清除真正过期的字幕（基于时间判断，而不是当前显示状态）
  const subtitlesToRemove = [];
  activeSubtitles.forEach(subId => {
    const element = subtitleElements.get(subId);
    if (element) {
      const endTime = parseFloat(element.dataset.endTime);
      // 只有当字幕真正结束时才移除，给一点缓冲时间
      if (currentTime > endTime + 0.5) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        subtitlesToRemove.push(subId);
      }
    }
  });

  // 从集合中移除已删除的字幕
  subtitlesToRemove.forEach(subId => {
    activeSubtitles.delete(subId);
    subtitleElements.delete(subId);
    processedSubtitles.delete(subId); // 清理已处理记录，允许重新播放
  });
}

// YouTube API相关函数
function onYouTubeIframeAPIReady() {
  console.log('YouTube API ready');
  apiReady = true;
  if (currentVideoId) {
    initializeYouTubePlayer();
  }
}

function onPlayerReady(event) {
  console.log('YouTube player ready');
  showSuccess();
  startSubtitleUpdate();
}

function onPlayerStateChange(event) {
  console.log('Player state changed:', event.data);
  if (event.data === YT.PlayerState.PLAYING) {
    startSubtitleUpdate();
  }
}

function onPlayerError(event) {
  console.error('YouTube player error:', event.data);
  tryFallbackPlayer();
}

// 播放器初始化
function initializeYouTubePlayer() {
  if (!apiReady || !currentVideoId) {
    console.log('API or video ID not ready');
    return;
  }

  try {
    updateLoadingStatus('创建YouTube播放器...');
    console.log('Creating YouTube player for video:', currentVideoId);

    player = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: currentVideoId,
      playerVars: {
        'playsinline': 1,
        'autoplay': 1,
        'controls': 1,
        'rel': 0,
        'modestbranding': 1,
        'fs': 1,
        'enablejsapi': 1
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
        'onError': onPlayerError
      }
    });

    loadingTimeout = setTimeout(() => {
      console.log('YouTube player timeout, trying fallback');
      tryFallbackPlayer();
    }, 10000);

  } catch (error) {
    console.error('Error creating YouTube player:', error);
    tryFallbackPlayer();
  }
}

function tryFallbackPlayer() {
  if (usingFallback) return;

  console.log('Using fallback player');
  usingFallback = true;
  updateLoadingStatus('使用备用播放器...');

  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }

  const fb = document.getElementById('fallback-iframe');
  fb.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1&fs=1`;
  fb.onload = () => {
    showSuccess();
    startBasicSubtitleUpdate();
  };
}

function startBasicSubtitleUpdate() {
  if (subtitles.length === 0) return;

  console.log('Starting basic subtitle update');
  let startTime = Date.now();

  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    displayCurrentSubtitle(elapsed);
  }, 500);
}

function startSubtitleUpdate() {
  if (subtitles.length === 0) return;

  console.log('Starting YouTube subtitle update');
  if (updateInterval) clearInterval(updateInterval);

  updateInterval = setInterval(() => {
    if (player && typeof player.getCurrentTime === 'function') {
      try {
        const currentTime = player.getCurrentTime();
        displayCurrentSubtitle(currentTime);
      } catch (error) {
        console.error('Error getting current time:', error);
      }
    }
  }, 100);
}

// API加载
function loadYouTubeAPI() {
  return new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      console.log('YouTube API already loaded');
      apiReady = true;
      resolve();
      return;
    }

    console.log('Loading YouTube API...');
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API callback triggered');
      apiReady = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onload = () => {
      console.log('YouTube API script loaded');
    };
    script.onerror = () => {
      console.error('Failed to load YouTube API script');
      reject(new Error('YouTube API脚本加载失败'));
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (!apiReady) {
        console.error('YouTube API initialization timeout');
        reject(new Error('YouTube API初始化超时'));
      }
    }, 15000);
  });
}

// 字幕切换
function toggleSubtitles() {
  const btn = document.getElementById('subtitle-toggle');
  if (btn.classList.contains('disabled') || subtitles.length === 0) return;

  subtitlesVisible = !subtitlesVisible;
  btn.textContent = subtitlesVisible ? '隐藏字幕' : '显示字幕';

  if (!subtitlesVisible) {
    // 清理所有字幕状态
    document.getElementById('subtitle-overlay').innerHTML = '';
    activeSubtitles.clear();
    subtitleElements.clear();
  }

  console.log('Subtitles toggled:', subtitlesVisible);
}

// 页面初始化
async function initializePage() {
  try {
    currentVideoId = getVideoIdFromUrl();
    if (!currentVideoId) {
      throw new Error('未提供视频ID');
    }

    console.log('Initializing page for video:', currentVideoId);
    updateLoadingStatus('加载视频信息...');

    // 并行加载视频标题和字幕
    const [title] = await Promise.all([
      fetchVideoTitle(currentVideoId),
      loadSubtitles(currentVideoId)
    ]);

    document.getElementById('video-title').textContent = title;
    document.title = `${title} - 视频播放`;

    updateLoadingStatus('加载YouTube API...');

    try {
      await loadYouTubeAPI();
      if (apiReady) {
        initializeYouTubePlayer();
      }
    } catch (error) {
      console.error('YouTube API loading failed:', error);
      setTimeout(() => tryFallbackPlayer(), 1000);
    }

  } catch (err) {
    console.error('Page initialization error:', err);
    showError(err.message);
  }
}

// 事件绑定
function bindEvents() {
  // 字幕切换按钮
  document.getElementById('subtitle-toggle').addEventListener('click', toggleSubtitles);

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.key === 's' || e.key === 'S') && subtitles.length > 0) {
      e.preventDefault();
      toggleSubtitles();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      window.location.href = 'index.html';
    }
  });
}

// 清理资源
function cleanupResources() {
  if (updateInterval) clearInterval(updateInterval);
  if (loadingTimeout) clearTimeout(loadingTimeout);
  if (player && typeof player.destroy === 'function') {
    try {
      player.destroy();
    } catch (error) {
      console.error('Error destroying player:', error);
    }
  }
}

// 暴露全局函数供HTML调用
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
window.retryLoad = retryLoad;

// 页面卸载时清理资源
window.addEventListener('beforeunload', cleanupResources);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing player...');
  bindEvents();
  initializePage();
});