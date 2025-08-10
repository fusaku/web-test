// 简化版 i18n - 先确保基本功能正常
function I18n() {
  this.currentLang = this.detectLanguage();
  this.translations = this.getFallbackTranslations(); // 先用内置翻译
  this.supportedLanguages = ['zh-CN', 'en', 'ja'];
  this.isLoaded = true; // 设为已加载，使用内置翻译
  this.loadPromise = null;
  
  // 立即更新页面
  var self = this;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      self.updatePageTexts();
    });
  } else {
    setTimeout(function() { self.updatePageTexts(); }, 100);
  }
}

I18n.prototype.detectLanguage = function() {
  try {
    var browserLangs = navigator.languages || [navigator.language] || ['zh-CN'];
    console.log('检测到浏览器语言列表:', browserLangs);
    
    // 语言映射
    var langMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-CN',
      'zh-HK': 'zh-CN',
      'en': 'en',
      'en-US': 'en',
      'en-GB': 'en',
      'ja': 'ja',
      'ja-JP': 'ja'
    };
    
    // 遍历浏览器语言列表，找到第一个支持的语言
    for (var i = 0; i < browserLangs.length; i++) {
      var browserLang = browserLangs[i];
      var mappedLang = langMap[browserLang] || langMap[browserLang.substring(0, 2)];
      if (mappedLang && this.supportedLanguages.indexOf(mappedLang) !== -1) {
        console.log('选择语言:', mappedLang, '(来源:', browserLang, ')');
        return mappedLang;
      }
    }
    
    console.log('未找到匹配语言，使用默认中文');
    return 'zh-CN';
  } catch (e) {
    console.error('语言检测失败:', e);
    return 'zh-CN';
  }
};

// 内置的基础翻译，防止完全加载失败
I18n.prototype.getFallbackTranslations = function() {
  return {
    "siteTitle": "视频分享主页",
    "siteSubtitle": "Video Sharing Homepage",
    "navigation": {
      "categories": "分类导航",
      "byYear": "按年分类",
      "byMonth": "按月分类",
      "byTag": "按标签分类"
    },
    "search": {
      "placeholder": "输入关键词过滤视频...",
      "noResults": "没有找到相关视频"
    },
    "loading": {
      "text": "加载中...",
      "loadingVideo": "正在加载视频...",
      "initPlayer": "初始化播放器"
    },
    "error": {
      "dataLoadFailed": "数据加载失败，请稍后重试",
      "loadFailed": "加载失败",
      "cannotLoadVideo": "无法加载视频"
    },
    "player": {
      "backToList": "← 返回列表",
      "retry": "重试"
    },
    "subtitles": {
      "status": "字幕",
      "loading": "加载中...",
      "show": "显示字幕",
      "hide": "隐藏字幕"
    },
    "playerTitle": "视频播放 - 字幕播放器"
  };
};

I18n.prototype.t = function(key, defaultValue) {
  try {
    defaultValue = defaultValue || key;
    
    if (!this.translations) {
      console.warn('translations 不存在，使用默认值:', key);
      return defaultValue;
    }

    // 支持嵌套key，如 'navigation.categories'
    var keys = key.split('.');
    var value = this.translations;
    
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn('翻译key不存在:', key);
        return defaultValue;
      }
    }
    
    return value || defaultValue;
  } catch (e) {
    console.error('翻译函数出错:', key, e);
    return defaultValue || key;
  }
};

I18n.prototype.updatePageTexts = function() {
  try {
    console.log('开始更新页面文本...');
    var updateCount = 0;

    // 处理 data-i18n 属性
    var i18nElements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < i18nElements.length; i++) {
      try {
        var element = i18nElements[i];
        var key = element.getAttribute('data-i18n');
        var translation = this.t(key);
        
        if (translation !== key) { // 只有找到翻译才更新
          element.textContent = translation;
          updateCount++;
          console.log('更新: ' + key + ' -> ' + translation);
        }
      } catch (e) {
        console.error('更新文本元素出错:', e);
      }
    }

    // 处理 data-i18n-placeholder 属性
    var placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    for (var i = 0; i < placeholderElements.length; i++) {
      try {
        var element = placeholderElements[i];
        var key = element.getAttribute('data-i18n-placeholder');
        var translation = this.t(key);
        
        if (translation !== key) {
          element.placeholder = translation;
          updateCount++;
          console.log('更新占位符: ' + key + ' -> ' + translation);
        }
      } catch (e) {
        console.error('更新占位符出错:', e);
      }
    }

    // 更新页面标题
    try {
      var siteTitle = this.t('siteTitle');
      if (siteTitle !== 'siteTitle') {
        document.title = siteTitle;
        updateCount++;
      }
    } catch (e) {
      console.error('更新标题出错:', e);
    }

    // 更新HTML lang属性
    try {
      document.documentElement.lang = this.currentLang;
    } catch (e) {
      console.error('更新lang属性出错:', e);
    }

    console.log('页面文本更新完成，共更新 ' + updateCount + ' 处');
  } catch (e) {
    console.error('updatePageTexts 总体出错:', e);
  }
};

// 简化的加载函数 - 目前只返回已有的翻译
I18n.prototype.loadLanguage = function(lang) {
  var self = this;
  return new Promise(function(resolve) {
    console.log('简化版：使用内置翻译');
    resolve(true);
  });
};

// 新增：强制刷新动态内容
I18n.prototype.refreshDynamicContent = function() {
  try {
    // 触发分类重新生成
    if (typeof generateCategories === 'function') {
      generateCategories();
    }
    
    // 触发错误信息更新
    var errorDiv = document.getElementById('error');
    if (errorDiv && errorDiv.style.display !== 'none') {
      errorDiv.textContent = this.t('error.dataLoadFailed');
    }
  } catch (e) {
    console.error('refreshDynamicContent 出错:', e);
  }
};

// 新增：等待加载完成
I18n.prototype.waitForLoad = function() {
  return Promise.resolve(true);
};

// 全局实例
try {
  window.i18n = new I18n();
  console.log('i18n 初始化成功');
} catch (e) {
  console.error('i18n 初始化失败:', e);
}