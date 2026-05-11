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
    // 添加当前页面 - 直接在 background.js 中处理 AI 优化
    addBookmarkWithAI(tab.url, tab.title, tab.favIconUrl, tab.id);
  }
  
  if (info.menuItemId === 'addLinkToBookmarkBoard') {
    // 添加链接 - 直接在 background.js 中处理 AI 优化
    const linkUrl = info.linkUrl;
    const linkTitle = info.selectionText || info.linkText || '';
    
    // 获取链接的 favicon
    let faviconUrl = '';
    try {
      const url = new URL(linkUrl);
      faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch (e) {
      console.error('URL 解析失败:', e);
    }
    
    addBookmarkWithAI(linkUrl, linkTitle, faviconUrl, tab.id);
  }
});

// 添加书签（带 AI 优化）
async function addBookmarkWithAI(url, title, icon, tabId) {
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

  // 读取 AI 设置
  const aiSettings = await new Promise((resolve) => {
    chrome.storage.local.get(['aiSettings'], (result) => {
      resolve(result.aiSettings);
    });
  });

  // 如果开启了 AI 自动优化，调用 AI 服务
  if (aiSettings && aiSettings.features && aiSettings.provider && aiSettings.config?.apiUrl) {
    try {
      // 直接在 background.js 中调用 AI API
      const AI_CONFIG = {
        custom: {
          name: '自定义 API',
          defaultUrl: 'http://localhost:8000',
          chatEndpoint: '/v1/chat/completions'
        },
        lmstudio: {
          name: 'LM Studio',
          defaultUrl: 'http://localhost:1234',
          chatEndpoint: '/v1/chat/completions'
        },
        openai: {
          name: 'OpenAI',
          defaultUrl: 'https://api.openai.com/v1',
          chatEndpoint: '/chat/completions'
        },
        anthropic: {
          name: 'Anthropic',
          defaultUrl: 'https://api.anthropic.com',
          chatEndpoint: '/v1/messages'
        },
        aliyun: {
          name: '阿里云',
          defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          chatEndpoint: '/chat/completions'
        },
        zhipu: {
          name: '智谱',
          defaultUrl: 'https://open.bigmodel.cn/api/paas/v4',
          chatEndpoint: '/chat/completions'
        }
      };
      
      const provider = AI_CONFIG[aiSettings.provider] || AI_CONFIG.custom;
      const baseUrl = aiSettings.config.apiUrl || provider.defaultUrl;
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const apiUrl = `${cleanBaseUrl}${provider.chatEndpoint}`;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (aiSettings.config.apiKey) {
        headers['Authorization'] = `Bearer ${aiSettings.config.apiKey}`;
      }
      
      const autoTasks = [];
      
      // 自动标题优化
      if (aiSettings.features.autoOptimizeTitle) {
        // 使用配置的提示词或默认提示词
        let titlePrompt = aiSettings.prompts?.autoOptimizeTitle || 
          `你是一个专业的书签管理助手。请优化以下书签标题，使其更简洁、更有意义。

原始标题：{title}
网址：{url}

要求：
1. 保持核心含义不变
2. 去除冗余信息（如"官网"、"首页"、"| 网站名"、"- 网站名"、促销信息等）
3. 控制在 15-25 个字符
4. 使用中文
5. 格式规范：主要关键词 - 次要描述

**重要：直接返回优化后的标题，不要解释、不要分析、不要思考过程。**

只返回标题文字本身，例如：Parallels Desktop 26 - Mac虚拟机升级

优化后的标题：`;
        
        // 替换模板变量
        titlePrompt = titlePrompt
          .replace(/{title}/g, link.title)
          .replace(/{url}/g, link.url)
          .replace(/{domain}/g, new URL(link.url).hostname)
          .replace(/{groupsText}/g, '');
        
        autoTasks.push(
          fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: aiSettings.config.model,
              messages: [{ role: 'user', content: titlePrompt }],
              stream: false,
              max_tokens: 50,
              temperature: 0.3
            })
          })
          .then(res => res.json())
          .then(data => {
            const optimizedTitle = data.choices?.[0]?.message?.content?.trim();
            if (optimizedTitle && optimizedTitle !== link.title) {
              link.title = optimizedTitle;
              console.log('✅ 自动标题优化成功:', optimizedTitle);
            }
          })
          .catch(err => console.error('自动标题优化失败:', err))
        );
      }
      
      // 自动分类建议
      if (aiSettings.features.autoSuggestCategory) {
        // 读取现有分组
        const groups = await new Promise((resolve) => {
          chrome.storage.local.get(['groups'], (result) => {
            resolve(result.groups || []);
          });
        });
        
        const groupNames = groups.map(g => g.name || g).filter(Boolean);
        const groupsText = groupNames.length > 0 ? `现有分组：${groupNames.join('、')}` : '当前没有分组，请推荐一个新的分组名称。';
        
        // 使用配置的提示词或默认提示词
        let categoryPrompt = aiSettings.prompts?.autoSuggestCategory || 
          `你是一个智能分类专家。请为以下书签推荐最合适的分组。

标题：{title}
网址：{url}
域名：{domain}

{groupsText}

要求：
1. 如果有匹配的现有分组，直接返回该分组名称
2. 如果没有匹配的，推荐一个新分组名称
3. 使用中文
4. 分组名称要简洁明确（2-6个字）
5. 只返回分组名称，不要任何其他内容

分组名称：`;
        
        // 替换模板变量
        categoryPrompt = categoryPrompt
          .replace(/{title}/g, link.title)
          .replace(/{url}/g, link.url)
          .replace(/{domain}/g, new URL(link.url).hostname)
          .replace(/{groupsText}/g, groupsText);
        
        autoTasks.push(
          fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: aiSettings.config.model,
              messages: [{ role: 'user', content: categoryPrompt }],
              stream: false,
              max_tokens: 30,
              temperature: 0.3
            })
          })
          .then(res => res.json())
          .then(data => {
            const suggestedGroup = data.choices?.[0]?.message?.content?.trim();
            if (suggestedGroup && 
                suggestedGroup !== 'undefined' && 
                suggestedGroup !== 'null' &&
                suggestedGroup !== '无重复' &&
                suggestedGroup.trim() !== '') {
              
              const groupName = suggestedGroup.trim();
              
              // 查找或创建分组
              let targetGroup = groups.find(g => g.name === groupName);
              
              if (!targetGroup) {
                targetGroup = {
                  id: 'group_' + Date.now(),
                  name: groupName
                };
                groups.push(targetGroup);
                console.log('✅ 创建新分组:', groupName);
                
                // 保存分组
                chrome.storage.local.set({ groups });
              }
              
              // 添加书签到分组
              if (!link.groups) link.groups = [];
              if (!link.groups.includes(targetGroup.id)) {
                link.groups.push(targetGroup.id);
                console.log('✅ 自动分类成功:', groupName);
              }
            }
          })
          .catch(err => console.error('自动分类建议失败:', err))
        );
      }
      
      // 等待 AI 优化完成
      if (autoTasks.length > 0) {
        await Promise.allSettled(autoTasks);
        console.log('✅ AI 自动优化完成');
      }
    } catch (err) {
      console.error('AI 服务调用失败:', err);
    }
  }

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
      // 通知书签白板页面刷新
      chrome.runtime.sendMessage({ action: 'refreshData' });
      
      // 在当前页面显示成功通知
      const aiTag = (aiSettings && aiSettings.features && (aiSettings.features.autoOptimizeTitle || aiSettings.features.autoSuggestCategory)) ? ' (AI 优化)' : '';
      showNotification(tabId, `已添加书签: ${link.title}${aiTag}`, 'success');
    });
  });
}

// 添加书签的通用函数（不带 AI）
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
