/**
 * i18n 国际化工具模块
 * 统一封装 chrome.i18n.getMessage，支持手动语言覆盖
 *
 * 用法：
 *   await I18n.init()                        — 初始化（必须在 bindDOM 前调用）
 *   I18n.t('key')                            — 简单翻译
 *   I18n.t('key_with_params', 'val1')        — 带参数翻译 ($1, $2...)
 *   I18n.formatTimeAgo(timestamp)            — 时间格式化
 *   I18n.bindDOM()                           — 自动绑定 data-i18n 元素
 *   I18n.getLanguage()                       — 获取当前生效语言
 *   I18n.setLanguage('zh_CN'|'en'|'auto')   — 切换语言（会刷新页面）
 */

class I18n {
  /** @type {Object|null} 手动覆盖的翻译字典 */
  static _overrideMessages = null;
  /** @type {string|null} 当前覆盖的语言 */
  static _overrideLang = null;
  /** @type {boolean} 是否已初始化 */
  static _initialized = false;

  /**
   * 初始化：检查语言覆盖设置，必要时加载自定义翻译数据
   * 必须在 bindDOM() 之前调用
   */
  static async init() {
    if (I18n._initialized) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await new Promise(resolve => {
          chrome.storage.local.get(['langOverride'], resolve);
        });

        const langOverride = result.langOverride;
        if (langOverride && langOverride !== 'auto') {
          I18n._overrideLang = langOverride;
          // 加载对应语言的消息文件
          const url = chrome.runtime.getURL('_locales/' + langOverride + '/messages.json');
          const resp = await fetch(url);
          const data = await resp.json();
          I18n._overrideMessages = {};
          for (const [key, val] of Object.entries(data)) {
            I18n._overrideMessages[key] = val.message;
          }
        }
      }
    } catch (e) {
      console.warn('I18n: 语言覆盖加载失败，使用默认语言', e);
    }

    I18n._initialized = true;
  }

  /**
   * 获取翻译文本
   */
  static t(key, ...substitutions) {
    let msg = key;

    // 优先使用手动覆盖的翻译
    if (I18n._overrideMessages && I18n._overrideMessages[key] !== undefined) {
      msg = I18n._overrideMessages[key];
    }
    // 其次使用 chrome.i18n API（扩展环境）
    else if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      msg = chrome.i18n.getMessage(key) || key;
    }

    // 参数替换 $1, $2, ...
    if (substitutions.length > 0) {
      substitutions.forEach((sub, i) => {
        msg = msg.replace(new RegExp('\\$' + (i + 1), 'g'), String(sub));
      });
    }

    return msg;
  }

  /**
   * 检查翻译 key 是否存在
   */
  static has(key) {
    if (I18n._overrideMessages && I18n._overrideMessages[key] !== undefined) return true;
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const msg = chrome.i18n.getMessage(key);
      return msg !== '' && msg !== key;
    }
    return false;
  }

  /**
   * 获取当前生效的 UI 语言
   * @returns {string} 如 "zh_CN", "en"
   */
  static getLanguage() {
    if (I18n._overrideLang) return I18n._overrideLang;
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
      return chrome.i18n.getUILanguage();
    }
    return navigator.language || 'zh_CN';
  }

  /**
   * 判断是否为中文语言
   */
  static isChinese() {
    return I18n.getLanguage().startsWith('zh');
  }

  /**
   * 设置界面语言
   * @param {'auto'|'zh_CN'|'en'} lang - 语言代码
   */
  static async setLanguage(lang) {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    await new Promise(resolve => {
      chrome.storage.local.set({ langOverride: lang === 'auto' ? 'auto' : lang }, resolve);
    });
    // 刷新页面以应用新语言
    window.location.reload();
  }

  /**
   * 获取当前语言偏好设置
   * @returns {Promise<string>} 'auto' | 'zh_CN' | 'en'
   */
  static async getLanguagePreference() {
    if (typeof chrome === 'undefined' || !chrome.storage) return 'auto';
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['langOverride'], resolve);
    });
    return result.langOverride || 'auto';
  }

  /**
   * 格式化相对时间
   */
  static formatTimeAgo(timestamp) {
    if (!timestamp) return I18n.t('time_never');

    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return I18n.t('time_just_now');
    if (years > 0) return I18n.t('time_years_ago', String(years));
    if (months > 0) return I18n.t('time_months_ago', String(months));
    if (days > 0) return I18n.t('time_days_ago', String(days));
    if (hours > 0) return I18n.t('time_hours_ago', String(hours));
    if (minutes > 0) return I18n.t('time_minutes_ago', String(minutes));
    return I18n.t('time_just_now');
  }

  /**
   * 自动绑定 DOM 中的 data-i18n 和 data-i18n-attr 元素
   */
  static bindDOM() {
    // 文本内容替换
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key) {
        const translated = I18n.t(key);
        if (translated) el.textContent = translated;
      }
    });

    // 属性替换
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const attrString = el.dataset.i18nAttr;
      if (!attrString) return;
      const pairs = attrString.split(',').map(s => s.trim());
      pairs.forEach(pair => {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          const attrName = pair.substring(0, colonIdx).trim();
          const key = pair.substring(colonIdx + 1).trim();
          const translated = I18n.t(key);
          if (translated) el.setAttribute(attrName, translated);
        }
      });
    });

    // HTML 内容替换
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      if (key) {
        const translated = I18n.t(key);
        if (translated) el.innerHTML = translated;
      }
    });
  }
}

// 导出全局单例
window.I18n = I18n;
