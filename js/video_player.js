// 视频播放器模块 - video-player.js

class VideoPlayer {
  constructor(subtitleManager) {
    this.player = null;
    this.subtitleManager = subtitleManager;
    this.updateInterval = null;
    this.loadingTimeout = null;
    this.usingFallback = false;
    this.apiReady = false;
    this.currentVideoId = '';
  }

  // 初始化播放器
  async initialize(videoId) {
    this.currentVideoId = videoId;
    
    try {
      await this.loadYouTubeAPI();
      if (this.apiReady) {
        this.initializeYouTubePlayer();
      }
    } catch (error) {
      console.error('YouTube API loading failed:', error);
      setTimeout(() => this.tryFallbackPlayer(), 1000);
    }
  }

  // 加载YouTube API
  loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        console.log('YouTube API already loaded');
        this.apiReady = true;
        resolve();
        return;
      }

      console.log('Loading YouTube API...');
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API callback triggered');
        this.apiReady = true;
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
        reject(new Error(window.i18n.t('error.ytApiLoadFailed', 'YouTube API脚本加载失败')));
      };
      document.head.appendChild(script);

      setTimeout(() => {
        if (!this.apiReady) {
          console.error('YouTube API initialization timeout');
          reject(new Error(window.i18n.t('error.ytApiTimeout', 'YouTube API初始化超时')));
        }
      }, 15000);
    });
  }

  // 初始化YouTube播放器
  initializeYouTubePlayer() {
    if (!this.apiReady || !this.currentVideoId) {
      console.log('API or video ID not ready');
      return;
    }

    try {
      this.updateLoadingStatus(window.i18n.t('loading.createPlayer', '创建YouTube播放器...'));
      console.log('Creating YouTube player for video:', this.currentVideoId);

      this.player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: this.currentVideoId,
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
          'onReady': (event) => this.onPlayerReady(event),
          'onStateChange': (event) => this.onPlayerStateChange(event),
          'onError': (event) => this.onPlayerError(event)
        }
      });

      this.loadingTimeout = setTimeout(() => {
        console.log('YouTube player timeout, trying fallback');
        this.tryFallbackPlayer();
      }, 10000);

    } catch (error) {
      console.error('Error creating YouTube player:', error);
      this.tryFallbackPlayer();
    }
  }

  // 播放器就绪回调
  onPlayerReady(event) {
    console.log('YouTube player ready');
    this.showSuccess();
    this.startSubtitleUpdate();
  }

  // 播放器状态变化回调
  onPlayerStateChange(event) {
    console.log('Player state changed:', event.data);
    if (event.data === YT.PlayerState.PLAYING) {
      this.startSubtitleUpdate();
    }
  }

  // 播放器错误回调
  onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    this.tryFallbackPlayer();
  }

  // 尝试备用播放器
  tryFallbackPlayer() {
    if (this.usingFallback) return;

    console.log('Using fallback player');
    this.usingFallback = true;
    this.updateLoadingStatus(window.i18n.t('loading.fallbackPlayer', '使用备用播放器...'));

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    const fb = document.getElementById('fallback-iframe');
    fb.src = `https://www.youtube.com/embed/${this.currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1&fs=1`;
    fb.onload = () => {
      this.showSuccess();
      this.startBasicSubtitleUpdate();
    };
  }

  // 开始字幕更新（YouTube播放器）
  startSubtitleUpdate() {
    if (this.subtitleManager.subtitles.length === 0) return;

    console.log('Starting YouTube subtitle update');
    if (this.updateInterval) clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        try {
          const currentTime = this.player.getCurrentTime();
          this.subtitleManager.displayCurrentSubtitle(currentTime);
        } catch (error) {
          console.error('Error getting current time:', error);
        }
      }
    }, 100);
  }

  // 开始基础字幕更新（备用播放器）
  startBasicSubtitleUpdate() {
    if (this.subtitleManager.subtitles.length === 0) return;

    console.log('Starting basic subtitle update');
    let startTime = Date.now();

    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      this.subtitleManager.displayCurrentSubtitle(elapsed);
    }, 500);
  }

  // 显示成功状态
  showSuccess() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');

    if (this.usingFallback) {
      document.getElementById('fallback-iframe').classList.remove('hidden');
      const notice = document.createElement('div');
      notice.className = 'fallback-notice';
      notice.textContent = window.i18n.t('subtitles.fallbackNotice', '使用备用播放器 - 字幕可能不完全同步');
      document.getElementById('video-container').appendChild(notice);
    } else {
      document.getElementById('youtube-player').classList.remove('hidden');
    }

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    console.log('Player loaded successfully, using fallback:', this.usingFallback);
  }

  // 显示错误
  showError(message) {
    console.error('Showing error:', message);
    document.getElementById('error-message').textContent = message;
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
  }

  // 更新加载状态
  updateLoadingStatus(status) {
    const el = document.getElementById('loading-status');
    if (el) el.textContent = status;
    console.log('Loading status:', status);
  }

  // 重试加载
  retry() {
    location.reload();
  }

  // 清理资源
  cleanup() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch (error) {
        console.error('Error destroying player:', error);
      }
    }
  }
}

// 导出视频播放器
window.VideoPlayer = VideoPlayer;