class I18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = {};
    this.supportedLanguages = ['zh-CN', 'en', 'ja'];
  }

  detectLanguage() {
    // 检测浏览器语言
    const browserLang = navigator.language || navigator.languages[0] || 'zh-CN';

    // 语言映射
    const langMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-CN',
      'en': 'en',
      'en-US': 'en',
      'en-GB': 'en',
      'ja': 'ja',
      'ja-JP': 'ja'
    };

    return langMap[browserLang] || langMap[browserLang.substring(0, 2)] || 'zh-CN';
  }

  async loadLanguage(lang = this.currentLang) {
    try {
      const response = await fetch(`../lang/${lang}.json`);
      if (!response.ok) throw new Error('Language file not found');

      this.translations = await response.json();
      this.currentLang = lang;
      return true;
    } catch (error) {
      console.error('Failed to load language:', error);
      // 回退到中文
      if (lang !== 'zh-CN') {
        return await this.loadLanguage('zh-CN');
      }
      return false;
    }
  }

  t(key, defaultValue = key) {
    return this.translations[key] || defaultValue;
  }

  updatePageTexts() {
    // 更新所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);

      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // 更新页面标题
    if (this.translations.title) {
      document.title = this.translations.title + (this.translations.subtitle ? ' - ' + this.translations.subtitle : '');
    }
  }
}

// 全局实例
window.i18n = new I18n();