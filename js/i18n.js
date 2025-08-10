// 兼容 iOS Safari 的 i18n 实现
function I18n() {
  this.currentLang = this.detectLanguage();
  this.translations = {};
  this.supportedLanguages = ['zh-CN', 'en', 'ja'];
  this.isLoaded = false;
  this.loadPromise = null;
}

I18n.prototype.detectLanguage = function() {
  // 临时强制使用中文进行测试
  // console.log('强制使用中文');
  // return 'zh-CN';
  
  // 自动检测逻辑
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
};

I18n.prototype.loadLanguage = function(lang) {
  var self = this;
  lang = lang || this.currentLang;
  
  // 如果正在加载，返回现有的Promise
  if (this.loadPromise) {
    return this.loadPromise;
  }

  this.loadPromise = this._doLoadLanguage(lang);
  return this.loadPromise;
};

I18n.prototype._doLoadLanguage = function(lang) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    try {
      console.log('开始加载语言包:', lang);
      
      // 根据文件结构，使用正确的路径
      var possiblePaths = [
        'lang/' + lang + '.json',
        './lang/' + lang + '.json'
      ];
      
      var pathIndex = 0;
      
      function tryNextPath() {
        if (pathIndex >= possiblePaths.length) {
          throw new Error('Language file not found for any path: ' + lang);
        }
        
        var path = possiblePaths[pathIndex];
        console.log('尝试路径:', path);
        
        // 使用 XMLHttpRequest 替代 fetch 以提高兼容性
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                console.log('成功使用路径:', path);
                self.translations = JSON.parse(xhr.responseText);
                self.currentLang = lang;
                self.isLoaded = true;
                
                console.log('语言包加载成功:', lang, Object.keys(self.translations));
                console.log('示例翻译测试:', self.translations.siteTitle, self.translations.navigation && self.translations.navigation.categories);
                
                // 立即更新页面
                self.updatePageTexts();
                self.loadPromise = null;
                resolve(true);
              } catch (e) {
                console.error('JSON 解析失败:', e);
                pathIndex++;
                tryNextPath();
              }
            } else {
              console.log('路径失败:', path, xhr.status);
              pathIndex++;
              tryNextPath();
            }
          }
        };
        
        xhr.onerror = function() {
          console.log('网络错误:', path);
          pathIndex++;
          tryNextPath();
        };
        
        xhr.send();
      }
      
      tryNextPath();
      
    } catch (error) {
      console.error('Failed to load language:', lang, error);
      
      // 回退到中文
      if (lang !== 'zh-CN') {
        console.log('回退到中文');
        self._doLoadLanguage('zh-CN').then(resolve).catch(reject);
      } else {
        // 如果都加载失败，使用内置翻译
        console.log('使用内置翻译');
        self.translations = self.getFallbackTranslations();
        self.currentLang = 'zh-CN';
        self.isLoaded = true;
        self.updatePageTexts();
        self.loadPromise = null;
        resolve(false);
      }
    }
  });
};

// 内置的基础翻译，防止完全加载失败
I18n.prototype.getFallbackTranslations = function() {
  return {
    "siteTitle": "视频分享主页",
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
      "text": "加载中..."
    },
    "error": {
      "dataLoadFailed": "数据加载失败，请稍后重试"
    }
  };
};

I18n.prototype.t = function(key, defaultValue) {
  defaultValue = defaultValue || key;
  
  // 即使isLoaded未定义，只要translations有内容就尝试翻译
  if (!this.translations || Object.keys(this.translations).length === 0) {
    console.warn('语言包为空，使用默认值:', key);
    return defaultValue;
  }

  // 支持嵌套key，如 'navigation.categories'
  var keys = key.split('.');
  var value = this.translations;
  
  console.log('查找翻译:', key, 'keys:', keys);
  
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    console.log('第' + (i + 1) + '层: "' + k + '"', 'value类型:', typeof value, 'value:', value);
    
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
      console.log('找到: "' + k + '" ->', value);
    } else {
      console.warn('翻译key不存在: ' + key + ' (在第' + (i + 1) + '层 "' + k + '" 失败)');
      console.log('可用的keys:', value ? Object.keys(value) : 'value为空');
      return defaultValue;
    }
  }
  
  console.log('最终翻译结果:', key, '->', value);
  return value || defaultValue;
};

I18n.prototype.updatePageTexts = function() {
  if (!this.isLoaded) {
    console.warn('语言包未加载，跳过更新');
    return;
  }

  console.log('开始更新页面文本...');
  var updateCount = 0;

  // 处理 data-i18n 属性
  var i18nElements = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < i18nElements.length; i++) {
    var element = i18nElements[i];
    var key = element.getAttribute('data-i18n');
    var translation = this.t(key);
    
    if (translation !== key) { // 只有找到翻译才更新
      element.textContent = translation;
      updateCount++;
      console.log('更新: ' + key + ' -> ' + translation);
    }
  }

  // 处理 data-i18n-placeholder 属性
  var placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  for (var i = 0; i < placeholderElements.length; i++) {
    var element = placeholderElements[i];
    var key = element.getAttribute('data-i18n-placeholder');
    var translation = this.t(key);
    
    if (translation !== key) {
      element.placeholder = translation;
      updateCount++;
      console.log('更新占位符: ' + key + ' -> ' + translation);
    }
  }

  // 更新页面标题
  var siteTitle = this.t('siteTitle');
  var siteSubtitle = this.t('siteSubtitle');
  
  if (siteTitle !== 'siteTitle') {
    document.title = siteTitle + (siteSubtitle !== 'siteSubtitle' ? ' - ' + siteSubtitle : '');
    updateCount++;
  }

  // 更新HTML lang属性
  document.documentElement.lang = this.currentLang;

  console.log('页面文本更新完成，共更新 ' + updateCount + ' 处');
};

// 新增：强制刷新动态内容
I18n.prototype.refreshDynamicContent = function() {
  // 触发分类重新生成
  if (typeof generateCategories === 'function') {
    generateCategories();
  }
  
  // 触发错误信息更新
  var errorDiv = document.getElementById('error');
  if (errorDiv && errorDiv.style.display !== 'none') {
    errorDiv.textContent = this.t('error.dataLoadFailed');
  }
};

// 新增：等待加载完成
I18n.prototype.waitForLoad = function() {
  var self = this;
  if (this.isLoaded) return Promise.resolve(true);
  if (this.loadPromise) return this.loadPromise;
  return Promise.resolve(false);
};

// 全局实例
window.i18n = new I18n();