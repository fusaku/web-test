class I18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = {};
    this.supportedLanguages = ['zh-CN', 'en', 'ja'];
    this.isLoaded = false;
    this.loadPromise = null;
  }

  detectLanguage() {
    // 临时强制使用中文进行测试 - 测试完成后可以改回自动检测
    console.log('强制使用中文');
    return 'zh-CN';
    
    /* 自动检测逻辑（需要时取消注释）
    const browserLangs = navigator.languages || [navigator.language] || ['zh-CN'];
    console.log('检测到浏览器语言列表:', browserLangs);
    
    // 语言映射
    const langMap = {
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
    for (const browserLang of browserLangs) {
      const mappedLang = langMap[browserLang] || langMap[browserLang.substring(0, 2)];
      if (mappedLang && this.supportedLanguages.includes(mappedLang)) {
        console.log('选择语言:', mappedLang, '(来源:', browserLang, ')');
        return mappedLang;
      }
    }
    
    console.log('未找到匹配语言，使用默认中文');
    return 'zh-CN';
    */
  }

  async loadLanguage(lang = this.currentLang) {
    // 如果正在加载，返回现有的Promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._doLoadLanguage(lang);
    return this.loadPromise;
  }

  async _doLoadLanguage(lang) {
    try {
      console.log('开始加载语言包:', lang);
      
      // 根据文件结构，使用正确的路径
      const possiblePaths = [
        `lang/${lang}.json`,
        `./lang/${lang}.json`
      ];
      
      let response = null;
      let usedPath = '';
      
      for (const path of possiblePaths) {
        try {
          console.log('尝试路径:', path);
          response = await fetch(path);
          if (response.ok) {
            usedPath = path;
            break;
          }
        } catch (e) {
          console.log('路径失败:', path, e.message);
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Language file not found for any path: ${lang}`);
      }
      
      console.log('成功使用路径:', usedPath);
      this.translations = await response.json();
      this.currentLang = lang;
      this.isLoaded = true;
      
      console.log('语言包加载成功:', lang, Object.keys(this.translations));
      console.log('示例翻译测试:', this.translations.siteTitle, this.translations.navigation?.categories);
      
      // 立即更新页面
      this.updatePageTexts();
      
      return true;
    } catch (error) {
      console.error('Failed to load language:', lang, error);
      
      // 回退到中文
      if (lang !== 'zh-CN') {
        console.log('回退到中文');
        return await this._doLoadLanguage('zh-CN');
      }
      
      // 如果都加载失败，使用内置翻译
      console.log('使用内置翻译');
      this.translations = this.getFallbackTranslations();
      this.currentLang = 'zh-CN';
      this.isLoaded = true;
      this.updatePageTexts();
      
      return false;
    } finally {
      this.loadPromise = null;
    }
  }

  // 内置的基础翻译，防止完全加载失败
  getFallbackTranslations() {
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
  }

  t(key, defaultValue = key) {
    // 即使isLoaded未定义，只要translations有内容就尝试翻译
    if (!this.translations || Object.keys(this.translations).length === 0) {
      console.warn('语言包为空，使用默认值:', key);
      return defaultValue;
    }

    // 支持嵌套key，如 'navigation.categories'
    const keys = key.split('.');
    let value = this.translations;
    
    console.log('查找翻译:', key, 'keys:', keys);
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      console.log(`第${i+1}层: "${k}"`, 'value类型:', typeof value, 'value:', value);
      
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
        console.log(`找到: "${k}" ->`, value);
      } else {
        console.warn(`翻译key不存在: ${key} (在第${i+1}层 "${k}" 失败)`);
        console.log('可用的keys:', value ? Object.keys(value) : 'value为空');
        return defaultValue;
      }
    }
    
    console.log('最终翻译结果:', key, '->', value);
    return value || defaultValue;
  }

  updatePageTexts() {
    if (!this.isLoaded) {
      console.warn('语言包未加载，跳过更新');
      return;
    }

    console.log('开始更新页面文本...');
    let updateCount = 0;

    // 处理 data-i18n 属性
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (translation !== key) { // 只有找到翻译才更新
        element.textContent = translation;
        updateCount++;
        console.log(`更新: ${key} -> ${translation}`);
      }
    });

    // 处理 data-i18n-placeholder 属性
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      
      if (translation !== key) {
        element.placeholder = translation;
        updateCount++;
        console.log(`更新占位符: ${key} -> ${translation}`);
      }
    });

    // 更新页面标题
    const siteTitle = this.t('siteTitle');
    const siteSubtitle = this.t('siteSubtitle');
    
    if (siteTitle !== 'siteTitle') {
      document.title = siteTitle + (siteSubtitle !== 'siteSubtitle' ? ' - ' + siteSubtitle : '');
      updateCount++;
    }

    // 更新HTML lang属性
    document.documentElement.lang = this.currentLang;

    console.log(`页面文本更新完成，共更新 ${updateCount} 处`);
  }

  // 新增：强制刷新动态内容
  refreshDynamicContent() {
    // 触发分类重新生成
    if (typeof generateCategories === 'function') {
      generateCategories();
    }
    
    // 触发错误信息更新
    const errorDiv = document.getElementById('error');
    if (errorDiv && errorDiv.style.display !== 'none') {
      errorDiv.textContent = this.t('error.dataLoadFailed');
    }
  }

  // 新增：等待加载完成
  async waitForLoad() {
    if (this.isLoaded) return true;
    if (this.loadPromise) return this.loadPromise;
    return false;
  }
}

// 全局实例
window.i18n = new I18n();