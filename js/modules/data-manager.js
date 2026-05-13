/**
 * 数据管理模块
 * 负责书签和分组数据的存储、加载和状态管理
 */

class DataManager {
  constructor() {
    this.links = [];
    this.groups = [];
    this.autoGroupNames = {};
    this.domainCache = new Map();
  }

  /**
   * 加载数据
   * @param {Function} callback - 加载完成后的回调
   */
  loadData(callback) {
    chrome.storage.local.get(['links', 'groups', 'autoGroupNames'], (result) => {
      // 加载书签数据
      this.links = (result.links || []).map(link => ({
        ...link,
        groups: link.groups || [],
        pinned: link.pinned || false,
        clickCount: link.clickCount || 0,
        lastAccessed: link.lastAccessed || null
      }));
      
      // 加载分组数据
      this.groups = result.groups || [];
      
      // 加载自动分组的自定义名称
      this.autoGroupNames = result.autoGroupNames || {};
      
      // 清除域名缓存
      this.domainCache.clear();
      
      callback?.();
    });
  }

  /**
   * 保存数据
   * @param {Function} callback - 保存完成后的回调
   */
  save(callback) {
    chrome.storage.local.set({ links: this.links, groups: this.groups }, () => {
      // 清除域名缓存（数据变化后需要重新解析）
      this.domainCache.clear();
      callback?.();
    });
  }

  /**
   * 保存自动分组名称
   * @param {Function} callback
   */
  saveAutoGroupNames(callback) {
    chrome.storage.local.set({ autoGroupNames: this.autoGroupNames }, callback);
  }

  /**
   * 获取书签域名（带缓存）
   * @param {Object} link - 书签对象
   * @returns {string} 域名
   */
  getLinkDomain(link) {
    if (this.domainCache.has(link.url)) {
      return this.domainCache.get(link.url);
    }
    
    try {
      const domain = new URL(link.url).hostname.replace(/^www\./, '').toLowerCase();
      this.domainCache.set(link.url, domain);
      return domain;
    } catch (e) {
      this.domainCache.set(link.url, '');
      return '';
    }
  }

  /**
   * 添加书签
   * @param {Object} link - 书签对象
   */
  addLink(link) {
    this.links.unshift(link);
  }

  /**
   * 删除书签
   * @param {string} url - 书签 URL
   */
  deleteLink(url) {
    this.links = this.links.filter(l => l.url !== url);
  }

  /**
   * 更新书签
   * @param {string} url - 书签 URL
   * @param {Object} updates - 更新的字段
   */
  updateLink(url, updates) {
    const link = this.links.find(l => l.url === url);
    if (link) {
      Object.assign(link, updates);
    }
  }

  /**
   * 添加分组
   * @param {Object} group - 分组对象
   */
  addGroup(group) {
    this.groups.push(group);
  }

  /**
   * 删除分组
   * @param {string} groupId - 分组 ID
   */
  deleteGroup(groupId) {
    // 从所有书签中移除该分组
    this.links.forEach(link => {
      link.groups = link.groups.filter(gId => gId !== groupId);
    });
    
    // 删除分组
    this.groups = this.groups.filter(g => g.id !== groupId);
  }

  /**
   * 更新分组
   * @param {string} groupId - 分组 ID
   * @param {Object} updates - 更新的字段
   */
  updateGroup(groupId, updates) {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      Object.assign(group, updates);
    }
  }

  /**
   * 检查书签是否存在
   * @param {string} url - 书签 URL
   * @returns {boolean}
   */
  linkExists(url) {
    return this.links.some(link => link.url === url);
  }

  /**
   * 生成自动分组（根据域名）
   * @returns {Array} 自动分组列表
   */
  generateAutoGroups() {
    const domainMap = {};
    
    this.links.forEach(link => {
      try {
        const domain = new URL(link.url).hostname.replace(/^www\./, '');
        if (!domainMap[domain]) {
          domainMap[domain] = {
            id: 'auto_' + domain,
            name: domain,
            icon: 'fa-globe',
            auto: true,
            count: 0
          };
        }
        domainMap[domain].count++;
      } catch (e) {
        // 忽略无效URL
      }
    });
    
    // 只显示有2个以上书签的域名
    return Object.values(domainMap)
      .filter(g => g.count >= 2)
      .map(g => {
        const displayName = this.autoGroupNames[g.id] || g.name;
        return {
          ...g,
          name: displayName
        };
      });
  }
}

// 导出单例
const dataManager = new DataManager();
