// 页面管理模块 - page-manager.js

class PageManager {
  constructor() {
    this.subtitleManager = new SubtitleManager();
    this.videoPlayer = new VideoPlayer(this.subtitleManager);
    this.currentVideoId = '';
  }

  // 工具函数：从URL获取视频ID
  getVideoIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('v');
  }

  // 获取视频标题
  async fetchVideoTitle(videoId) {
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      if (res.ok) {
        const data = await res.json();
        return data.title || window.i18n.t('player.videoPlay', '视频播放');
      }
    } catch (error) {
      console.error('Failed to fetch video title:', error);
    }
    return window.i18n.t('player.videoPlay', '视频播放');
  }

  // 初始化多语言
  async initializeI18n() {
    await window.i18n.loadLanguage();
    window.i18n.updatePageTexts();
  }

  // 页面初始化
  async initializePage() {
    try {
      this.currentVideoId = this.getVideoIdFromUrl();
      if (!this.currentVideoId) {
        throw new Error(window.i18n.t('error.noVideoId', '未提供视频ID'));
      }

      console.log('Initializing page for video:', this.currentVideoId);
      this.videoPlayer.updateLoadingStatus(window.i18n.t('loading.videoInfo', '加载视频信息...'));

      // 并行加载视频标题和字幕
      const [title] = await Promise.all([
        this.fetchVideoTitle(this.currentVideoId),
        this.subtitleManager.loadSubtitles(this.currentVideoId)
      ]);

      document.getElementById('video-title').textContent = title;
      document.title = `${title} - ${window.i18n.t('player.videoPlay', '视频播放')}`;

      this.videoPlayer.updateLoadingStatus(window.i18n.t('loading.ytApi', '加载YouTube API...'));

      // 初始化播放器
      await this.videoPlayer.initialize(this.currentVideoId);

    } catch (err) {
      console.error('Page initialization error:', err);
      this.videoPlayer.showError(err.message);
    }
  }

  // 重试加载
  retryLoad() {
    location.reload();
  }

  // 绑定事件
  bindEvents() {
    // 字幕切换按钮
    document.getElementById('subtitle-toggle').addEventListener('click', () => {
      this.subtitleManager.toggle();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.key === 's' || e.key === 'S') && this.subtitleManager.subtitles.length > 0) {
        e.preventDefault();
        this.subtitleManager.toggle();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        window.location.href = 'index.html';
      }
    });

    // 标题滚动
    this.initTitleScroll();

    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.subtitleManager.activeSubtitleAreas.clear();
      console.log('Window resized, cleared subtitle areas');
    });

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  // 初始化标题滚动
  initTitleScroll() {
    const titleElement = document.getElementById('video-title');
    let isScrolling = false;
    let startX = 0;
    let scrollLeft = 0;

    // 检查标题是否需要滚动
    function checkScrollable() {
      const isScrollable = titleElement.scrollWidth > titleElement.clientWidth;
      titleElement.classList.toggle('scrollable', isScrollable);
      return isScrollable;
    }

    // 鼠标事件（桌面端）
    titleElement.addEventListener('mousedown', (e) => {
      if (!checkScrollable()) return;

      isScrolling = true;
      titleElement.style.cursor = 'grabbing';
      startX = e.pageX - titleElement.offsetLeft;
      scrollLeft = titleElement.scrollLeft;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isScrolling) return;
      e.preventDefault();

      const x = e.pageX - titleElement.offsetLeft;
      const walk = (x - startX) * 2;
      titleElement.scrollLeft = scrollLeft - walk;
    });

    document.addEventListener('mouseup', () => {
      if (isScrolling) {
        isScrolling = false;
        titleElement.style.cursor = 'grab';
      }
    });

    // 触摸事件（移动端）
    let touchStartX = 0;
    let touchScrollLeft = 0;

    titleElement.addEventListener('touchstart', (e) => {
      if (!checkScrollable()) return;

      touchStartX = e.touches[0].clientX;
      touchScrollLeft = titleElement.scrollLeft;
    }, { passive: true });

    titleElement.addEventListener('touchmove', (e) => {
      if (!checkScrollable()) return;

      const touchX = e.touches[0].clientX;
      const walk = (touchStartX - touchX) * 1.5;
      titleElement.scrollLeft = touchScrollLeft + walk;
    }, { passive: true });

    // 监听窗口大小变化
    window.addEventListener('resize', checkScrollable);

    // 初始检查
    setTimeout(checkScrollable, 100);
  }

  // 清理所有资源
  cleanup() {
    this.videoPlayer.cleanup();
    this.subtitleManager.cleanup();
  }
}

// 横屏管理类
class LandscapeManager {
  constructor() {
    this.headerTimeout = null;
    this.isLandscape = false;
  }

  // 检查是否为移动端横屏
  checkLandscapeMode() {
    const isMobile = window.innerWidth <= 926;
    const isLandscapeOrientation = window.innerWidth > window.innerHeight;
    const isShortHeight = window.innerHeight <= 428;

    return isMobile && isLandscapeOrientation && isShortHeight;
  }

  // 隐藏标题
  hideHeader() {
    const header = document.getElementById('header');
    if (header && this.isLandscape) {
      header.classList.remove('show');
    }

    if (this.headerTimeout) {
      clearTimeout(this.headerTimeout);
      this.headerTimeout = null;
    }
  }

  // 处理屏幕方向变化
  handleOrientationChange() {
    setTimeout(() => {
      const wasLandscape = this.isLandscape;
      this.isLandscape = this.checkLandscapeMode();

      console.log('方向变化检测:', {
        width: window.innerWidth,
        height: window.innerHeight,
        isLandscape: this.isLandscape,
        wasLandscape: wasLandscape
      });

      if (this.isLandscape && !wasLandscape) {
        console.log('切换到横屏模式');
        this.hideHeader();
      } else if (!this.isLandscape && wasLandscape) {
        console.log('切换到竖屏模式');
        this.hideHeader();
      }
    }, 200);
  }

  // 初始化横屏功能
  initialize() {
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    window.addEventListener('resize', () => {
      this.handleOrientationChange();
    });
  }
}

// 全局实例
let pageManager = null;
let landscapeManager = null;

// 全局函数（供HTML和YouTube API调用）
window.onYouTubeIframeAPIReady = function() {
  console.log('YouTube API ready callback triggered');
  if (pageManager && pageManager.videoPlayer) {
    pageManager.videoPlayer.apiReady = true;
    if (pageManager.videoPlayer.currentVideoId) {
      pageManager.videoPlayer.initializeYouTubePlayer();
    }
  }
};

window.retryLoad = function() {
  if (pageManager) {
    pageManager.retryLoad();
  } else {
    location.reload();
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing player...');
  
  try {
    // 创建管理器实例
    pageManager = new PageManager();
    landscapeManager = new LandscapeManager();

    // 初始化多语言
    await pageManager.initializeI18n();
    
    // 绑定事件
    pageManager.bindEvents();
    
    // 初始化横屏功能
    landscapeManager.initialize();
    
    // 初始化页面
    await pageManager.initializePage();
    
  } catch (error) {
    console.error('Page initialization failed:', error);
    if (pageManager && pageManager.videoPlayer) {
      pageManager.videoPlayer.showError(error.message);
    } else {
      // fallback error display
      const errorEl = document.getElementById('error-message');
      if (errorEl) {
        errorEl.textContent = error.message;
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('loading').classList.add('hidden');
      }
    }
  }
});