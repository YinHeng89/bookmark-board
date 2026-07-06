/**
 * 书签白板 - 后台脚本
 * 处理右键菜单功能
 */

// 扩展安装时创建右键菜单并启用侧边栏
chrome.runtime.onInstalled.addListener(() => {
  // 页面右键菜单 - 添加当前页面
  chrome.contextMenus.create({
    id: 'addToBookmarkBoard',
    title: chrome.i18n.getMessage('context_menu_add_page') || '添加到书签白板',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // 链接右键菜单 - 添加链接
  chrome.contextMenus.create({
    id: 'addLinkToBookmarkBoard',
    title: chrome.i18n.getMessage('context_menu_add_link') || '添加链接到书签白板',
    contexts: ['link'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // 打开侧边栏
  chrome.contextMenus.create({
    id: 'openSidebar',
    title: chrome.i18n.getMessage('context_menu_open_sidebar') || '打开书签白板侧边栏',
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

// 辅助：获取 i18n 消息（Service Worker 直接调用）
function i18n(key, ...subs) {
  let msg = chrome.i18n.getMessage(key) || key;
  subs.forEach((s, i) => {
    msg = msg.replace(new RegExp('\\$' + (i + 1), 'g'), String(s));
  });
  return msg;
}

// 添加书签（带 AI 优化）
async function addBookmarkWithAI(url, title, icon, tabId) {
  // 如果没有标题，从 URL 提取域名
  if (!title) {
    try {
      const urlObj = new URL(url);
      title = urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      title = i18n('unnamed');
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
  if (aiSettings && aiSettings.features && aiSettings.config?.apiUrl) {
    console.log(' 标题优化自动:', aiSettings.features.titleOptimization?.auto);
    console.log(' 分类建议自动:', aiSettings.features.categorySuggestion?.auto);
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
        },
        google: {
          name: 'Google',
          defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',
          chatEndpoint: '/models/'  // 前缀，实际 endpoint 动态拼接模型名
        }
      };

      const isGoogle = aiSettings.provider === 'google';
      const provider = AI_CONFIG[aiSettings.provider] || AI_CONFIG.custom;
      const baseUrl = aiSettings.config.apiUrl || provider.defaultUrl;
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');

      // Google Gemini 的 API Key 放在 URL 查询参数中，其余供应商用 Bearer header
      let apiUrl;
      const headers = {
        'Content-Type': 'application/json'
      };

      if (isGoogle) {
        const apiKey = aiSettings.config.apiKey || '';
        const model = aiSettings.config.model || 'gemini-1.5-pro';
        const chatEndpoint = `/models/${model}:generateContent`;
        apiUrl = `${cleanBaseUrl}${chatEndpoint}?key=${encodeURIComponent(apiKey)}`;
      } else {
        apiUrl = `${cleanBaseUrl}${provider.chatEndpoint}`;
        if (aiSettings.config.apiKey) {
          headers['Authorization'] = `Bearer ${aiSettings.config.apiKey}`;
        }
      }

      const autoTasks = [];

      // 自动标题优化
      if (aiSettings.features.titleOptimization?.auto) {
        // 使用配置的提示词或默认提示词
        let titlePrompt = aiSettings.prompts?.titleOptimization ||
          `<task>
优化标题
:</task>

<input>
<title>{title}</title>
<url>{url}</url>
</input>

<rules>
- 只输出最终标题
- 禁止输出解释
- 保持核心含义不变
- 去除冗余信息（如"官网"、"首页"、"| 网站名"、"- 网站名"、促销信息、标签、标题等）
- 禁止输出多行
- 格式规范：主要关键词 - 次要描述
- 删除官网首页等无意义文本
- 删除重复网站名
- 长度限制15-25字符
- 只允许输出中文
</rules>

<output></output>`;

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
            body: JSON.stringify(
              isGoogle
                ? { contents: [{ parts: [{ text: titlePrompt }] }] }
                : {
                    model: aiSettings.config.model,
                    messages: [{ role: 'user', content: titlePrompt }],
                    stream: false,
                    max_tokens: 50,
                    temperature: 0.3
                  }
            )
          })
          .then(res => res.json())
          .then(data => {
            // Google Gemini 响应格式：data.candidates[0].content.parts[0].text
            const optimizedTitle = isGoogle
              ? (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
              : (data.choices?.[0]?.message?.content || '');
            const trimmed = optimizedTitle.trim();
            if (trimmed && trimmed !== link.title) {
              link.title = trimmed;
              console.log('✅ 自动标题优化成功:', trimmed);
            }
          })
          .catch(err => console.error('自动标题优化失败:', err))
        );
      }

      // 自动分类建议
      if (aiSettings.features.categorySuggestion?.auto) {
        // 读取现有分组
        const groups = await new Promise((resolve) => {
          chrome.storage.local.get(['groups'], (result) => {
            resolve(result.groups || []);
          });
        });

        const groupNames = groups.map(g => g.name || g).filter(Boolean);
        const groupsText = groupNames.length > 0 ? `现有分组：${groupNames.join('、')}` : '当前没有分组，请推荐一个新的分组名称。';

        // 使用配置的提示词或默认提示词
        let categoryPrompt = aiSettings.prompts?.categorySuggestion ||
          `<task>
智能书签分类
:</task>

<input>
<title>{title}</title>
<url>{url}</url>
<domain>{domain}</domain>
<existingGroups>{groupsText}</existingGroups>
</input>

<rules>
- 只输出分组名称
- 禁止输出解释
- 禁止输出推理
- 禁止输出分析
- 禁止输出多行
- 禁止输出引号
- 优先匹配现有分组
- 无匹配时创建新分组
- 分组名称2-6个中文字
</rules>

<output></output>`;

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
            body: JSON.stringify(
              isGoogle
                ? { contents: [{ parts: [{ text: categoryPrompt }] }] }
                : {
                    model: aiSettings.config.model,
                    messages: [{ role: 'user', content: categoryPrompt }],
                    stream: false,
                    max_tokens: 30,
                    temperature: 0.3
                  }
            )
          })
          .then(res => res.json())
          .then(data => {
            // Google Gemini 响应格式：data.candidates[0].content.parts[0].text
            const suggestedGroup = isGoogle
              ? (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
              : (data.choices?.[0]?.message?.content || '').trim();
            if (suggestedGroup &&
                suggestedGroup !== 'undefined' &&
                suggestedGroup !== 'null' &&
                suggestedGroup !== '无重复' &&
                suggestedGroup !== '') {

              const groupName = suggestedGroup;

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
      showNotification(tabId, i18n('context_menu_notification_exists'), 'warning');
      return;
    }

    // 添加新书签
    links.unshift(link);
    chrome.storage.local.set({ links }, () => {
      // 通知书签白板页面刷新
      chrome.runtime.sendMessage({ action: 'refreshData' }).catch(() => {
        // 忽略错误：如果没有打开书签白板页面，这是正常的
      });

      // 在当前页面显示成功通知
      const aiTag = (aiSettings && aiSettings.features &&
        (aiSettings.features.titleOptimization?.auto || aiSettings.features.categorySuggestion?.auto)) ? ' (AI 优化)' : '';
      showNotification(tabId, i18n('context_menu_notification_added', link.title + aiTag), 'success');
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
      title = i18n('unnamed');
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
      showNotification(tabId, i18n('context_menu_notification_exists'), 'warning');
      return;
    }

    // 添加新书签
    links.unshift(link);
    chrome.storage.local.set({ links }, () => {
      // 在当前页面显示成功通知
      showNotification(tabId, i18n('context_menu_notification_added', link.title), 'success');
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
