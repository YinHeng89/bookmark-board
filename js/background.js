/**
 * 书签白板 - 后台脚本
 * 处理右键菜单功能
 */

// 扩展安装时创建右键菜单并启用侧边栏
chrome.runtime.onInstalled.addListener(() => {
  // 页面右键菜单 - 添加当前页面
  chrome.contextMenus.create({
    id: 'addToBookmarkBoard',
    title: '添加到书签白板',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
  
  // 链接右键菜单 - 添加链接
  chrome.contextMenus.create({
    id: 'addLinkToBookmarkBoard',
    title: '添加链接到书签白板',
    contexts: ['link'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
  
  // 打开侧边栏
  chrome.contextMenus.create({
    id: 'openSidebar',
    title: '打开书签白板侧边栏',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
  
  // 启用侧边栏
  chrome.sidePanel.setOptions({
    enabled: true,
    path: 'sidebar.html'
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidebar') {
    // 打开侧边栏
    chrome.sidePanel.open({ tabId: tab.id });
    return;
  }
  
  if (info.menuItemId === 'addToBookmarkBoard') {
    // 添加当前页面
    addBookmark(tab.url, tab.title, tab.favIconUrl, tab.id);
  }
  
  if (info.menuItemId === 'addLinkToBookmarkBoard') {
    // 添加链接
    const linkUrl = info.linkUrl;
    // 优先使用选中的文本，其次是链接文本
    const linkTitle = info.selectionText || info.linkText || '';
    
    // 获取链接的 favicon
    let faviconUrl = '';
    try {
      const url = new URL(linkUrl);
      faviconUrl = `https://${url.hostname}/favicon.ico`;
    } catch (e) {
      console.error('URL 解析失败:', e);
    }
    
    addBookmark(linkUrl, linkTitle, faviconUrl, tab.id);
  }
});

// 添加书签的通用函数
function addBookmark(url, title, icon, tabId) {
  // 如果没有标题，从 URL 提取域名
  if (!title) {
    try {
      const urlObj = new URL(url);
      title = urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      title = '未命名';
    }
  }
  
  const link = {
    url: url,
    title: title,
    icon: icon || 'default-icon.png',
    groups: [],
    createdAt: Date.now()
  };

  // 存储到 chrome.storage.local
  chrome.storage.local.get(['links'], (result) => {
    const links = result.links || [];
    
    // 检查是否已存在
    if (links.some(l => l.url === link.url)) {
      // 在当前页面显示通知
      showNotification(tabId, '该链接已存在', 'warning');
      return;
    }
    
    // 添加新书签
    links.unshift(link);
    chrome.storage.local.set({ links }, () => {
      // 在当前页面显示成功通知
      showNotification(tabId, `已添加书签: ${link.title}`, 'success');
    });
  });
}

// 在指定标签页显示通知
function showNotification(tabId, message, type = 'success') {
  // 执行脚本在当前页面显示通知
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (msg, notificationType) => {
      // 创建 Toast 通知
      const toast = document.createElement('div');
      const isSuccess = notificationType === 'success';
      const bgColor = isSuccess ? 'white' : '#FEF3C7';
      const iconClass = isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle';
      const iconColor = isSuccess ? '#4F46E5' : '#F59E0B';
      
      toast.style.cssText = `
        position: fixed;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: #1E293B;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 999999;
        animation: slideDown 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      `;
      
      // 添加图标
      const icon = document.createElement('i');
      icon.className = `fa ${iconClass}`;
      icon.style.color = iconColor;
      toast.appendChild(icon);
      
      // 添加文字
      const text = document.createElement('span');
      text.textContent = msg;
      toast.appendChild(text);
      
      document.body.appendChild(toast);
      
      // 3秒后自动消失
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },
    args: [message, type]
  }).catch(() => {
    console.log('无法在当前页面显示通知');
  });
}

// 点击扩展图标打开侧边栏
// Chrome 会自动处理：如果已打开则忽略，侧边栏通过自身按钮关闭
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});
