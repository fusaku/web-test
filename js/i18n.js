// 增强版 i18n - 添加外部文件加载功能
function I18n() {
  this.supportedLanguages = ['zh-CN', 'en', 'ja']; // 先定义支持的语言
  this.currentLang = this.detectLanguage();
  this.translations = this.getFallbackTranslations(); // 先用内置翻译
  this.isLoaded = true; // 设为已加载，使用内置翻译
  this.loadPromise = null;
  
  // 立即更新页面
  var self = this;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      self.updatePageTexts();
      // DOM 加载完成后，尝试加载外部语言文件
      self.loadExternalLanguage();
    });
  } else {
    setTimeout(function() { 
      self.updatePageTexts(); 
      // 尝试加载外部语言文件
      self.loadExternalLanguage();
    }, 100);
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
    "playerTitle": "视频播放 - 字幕播放器",
    "date": {
      "year": "年",
      "month": "月",
      "day": "日"
    },
    "months": {
      "01": "1月",
      "02": "2月", 
      "03": "3月",
      "04": "4月",
      "05": "5月",
      "06": "6月",
      "07": "7月",
      "08": "8月",
      "09": "9月",
      "10": "10月",
      "11": "11月",
      "12": "12月"
    }
  };
};

// 尝试加载外部语言文件
I18n.prototype.loadExternalLanguage = function(lang) {
  var self = this;
  lang = lang || this.currentLang;
  
  console.log('尝试加载外部语言文件:', lang);
  
  var possiblePaths = [
    'lang/' + lang + '.json',
    './lang/' + lang + '.json',
    '../lang/' + lang + '.json'
  ];
  
  var tryPath = function(pathIndex) {
    if (pathIndex >= possiblePaths.length) {
      console.log('所有外部语言文件路径都失败，继续使用内置翻译');
      return;
    }
    
    var path = possiblePaths[pathIndex];
    console.log('尝试加载路径:', path);
    
    // 使用兼容性更好的 XMLHttpRequest
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.timeout = 5000; // 5秒超时
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var externalTranslations = JSON.parse(xhr.responseText);
            console.log('外部语言文件加载成功:', path);
            
            // 合并外部翻译和内置翻译
            self.translations = self.mergeTranslations(self.translations, externalTranslations);
            console.log('翻译合并完成，重新更新页面');
            
            // 重新更新页面
            self.updatePageTexts();
            self.refreshDynamicContent();
            
          } catch (e) {
            console.error('外部语言文件JSON解析失败:', path, e);
            tryPath(pathIndex + 1);
          }
        } else {
          console.log('外部语言文件加载失败:', path, 'Status:', xhr.status);
          tryPath(pathIndex + 1);
        }
      }
    };
    
    xhr.onerror = function() {
      console.log('外部语言文件网络错误:', path);
      tryPath(pathIndex + 1);
    };
    
    xhr.ontimeout = function() {
      console.log('外部语言文件加载超时:', path);
      tryPath(pathIndex + 1);
    };
    
    xhr.send();
  };
  
  tryPath(0);
};

// 合并翻译对象
I18n.prototype.mergeTranslations = function(base, external) {
  var merged = {};
  
  // 复制基础翻译
  for (var key in base) {
    if (base.hasOwnProperty(key)) {
      if (typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
        merged[key] = this.mergeTranslations(base[key], {});
      } else {
        merged[key] = base[key];
      }
    }
  }
  
  // 覆盖/添加外部翻译
  for (var key in external) {
    if (external.hasOwnProperty(key)) {
      if (typeof external[key] === 'object' && external[key] !== null && !Array.isArray(external[key]) && merged[key]) {
        merged[key] = this.mergeTranslations(merged[key], external[key]);
      } else {
        merged[key] = external[key];
      }
    }
  }
  
  return merged;
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

// 公开的加载语言接口
I18n.prototype.loadLanguage = function(lang) {
  var self = this;
  lang = lang || this.currentLang;
  
  return new Promise(function(resolve) {
    self.currentLang = lang;
    self.loadExternalLanguage(lang);
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