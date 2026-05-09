/**
 * 书签白板 - 侧边栏逻辑
 */

let links = [];
let filterText = '';
const SIDEBAR_DISPLAY_LIMIT = 50;  // 侧边栏最多显示50个书签

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  loadTheme();
  setupStorageListener();
});

function loadData() {
  // 显示加载状态
  const container = document.getElementById('linkList');
  if (container) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">加载中...</div>';
  }
  
  chrome.storage.local.get(['links'], (result) => {
    links = result.links || [];
    renderLinks();
  });
}

function loadTheme() {
  const savedTheme = localStorage.getItem('darkMode');
  
  // 如果有保存的主题设置，使用保存的
  if (savedTheme !== null) {
    const isDark = savedTheme === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    updateThemeIcon();
  } else {
    // 否则跟随系统设置
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
    updateThemeIcon();
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const isDark = e.matches;
      document.documentElement.classList.toggle('dark', isDark);
      updateThemeIcon();
    });
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  updateThemeIcon();
}

function updateThemeIcon() {
  const themeToggle = document.getElementById('sidebarThemeToggle');
  if (themeToggle) {
    const isDark = document.documentElement.classList.contains('dark');
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
    }
  }
}

function setupEventListeners() {
  // 关闭按钮
  const closeBtn = document.getElementById('closeSidebar');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // 主题切换
  const themeToggle = document.getElementById('sidebarThemeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // 添加书签
  const addBtn = document.getElementById('sidebarAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      // 获取当前活动标签页
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          const tab = tabs[0];
          addBookmark(tab.url, tab.title, tab.favIconUrl);
        }
      });
    });
  }

  // 搜索
  const searchInput = document.getElementById('sidebarSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterText = e.target.value.toLowerCase();
      renderLinks();
    });
  }

  // 手动添加书签
  const manualAddBtn = document.getElementById('sidebarManualAdd');
  if (manualAddBtn) {
    manualAddBtn.addEventListener('click', showManualAddDialog);
  }

  // 拖拽事件
  setupDragAndDrop();
}

// 监听来自后台脚本的消息（右键菜单添加书签后刷新）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showToast') {
    loadData();
  }
});

// 监听 storage 变化，自动刷新
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.links) {
      loadData();
    }
  });
}

function renderLinks() {
  const board = document.getElementById('sidebarBoard');
  if (!board) return;
  
  board.innerHTML = '';

  const filtered = getFilteredLinks();
  
  if (filtered.length === 0) {
    board.innerHTML = `
      <div class="sidebar-empty">
        <i class="fa fa-bookmark"></i>
        <p>暂无书签</p>
        <p class="sidebar-drop-hint">拖拽链接到此处添加书签</p>
      </div>
    `;
    return;
  }
  
  // 限制显示数量，提高性能
  const displayLinks = filtered.slice(0, SIDEBAR_DISPLAY_LIMIT);
  
  // 分批渲染，避免卡顿
  let index = 0;
  const batchSize = 10;
  
  function renderBatch() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(index + batchSize, displayLinks.length);
    
    for (let i = index; i < end; i++) {
      const card = createBookmarkCard(displayLinks[i]);
      fragment.appendChild(card);
    }
    
    board.appendChild(fragment);
    index = end;
    
    if (index < displayLinks.length) {
      requestAnimationFrame(renderBatch);
    } else if (filtered.length > SIDEBAR_DISPLAY_LIMIT) {
      // 显示提示
      const hint = document.createElement('div');
      hint.className = 'sidebar-hint';
      hint.style.cssText = 'text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.875rem;';
      hint.textContent = `显示 ${SIDEBAR_DISPLAY_LIMIT}/${filtered.length} 个书签，请使用搜索筛选`;
      board.appendChild(hint);
    }
  }
  
  requestAnimationFrame(renderBatch);
}

function getFilteredLinks() {
  let filtered = links;
  
  if (filterText) {
    filtered = filtered.filter(link => 
      link.title.toLowerCase().includes(filterText) ||
      link.url.toLowerCase().includes(filterText)
    );
  }
  
  return filtered;
}

function createBookmarkCard(link) {
  const card = document.createElement('div');
  card.className = 'bookmark-card';
  
  const inner = document.createElement('div');
  inner.className = 'card-inner card-gradient-1';
  
  // 图标
  const iconDiv = document.createElement('div');
  iconDiv.className = 'card-icon';
  const img = document.createElement('img');
  img.src = link.icon || 'default-icon.png';
  img.alt = link.title;
  img.onerror = function() {
    this.src = 'default-icon.png';
  };
  iconDiv.appendChild(img);
  
  // 内容
  const content = document.createElement('div');
  content.className = 'card-content';
  
  const h3 = document.createElement('h3');
  h3.className = 'card-title';
  h3.textContent = link.title;
  
  const domain = document.createElement('p');
  domain.className = 'card-domain';
  try {
    domain.textContent = new URL(link.url).hostname.replace(/^www\./, '');
  } catch (e) {
    domain.textContent = '';
  }
  
  content.appendChild(h3);
  content.appendChild(domain);
  
  // 操作按钮
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'card-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'card-btn card-btn-edit';
  editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
  editBtn.title = '编辑';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editBookmark(link);
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-btn card-btn-delete';
  deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
  deleteBtn.title = '删除';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteBookmark(link);
  });
  
  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);
  
  inner.appendChild(iconDiv);
  inner.appendChild(content);
  inner.appendChild(actionsDiv);
  card.appendChild(inner);
  
  // 点击打开链接
  inner.addEventListener('click', (e) => {
    // 如果点击的是按钮，不打开链接
    if (e.target.closest('.card-btn')) return;
    chrome.tabs.create({ url: link.url });
  });
  
  return card;
}

function editBookmark(link) {
  const newTitle = prompt('修改书签名称：', link.title);
  if (newTitle !== null && newTitle.trim()) {
    link.title = newTitle.trim();
    saveData();
    renderLinks();
  }
}

function deleteBookmark(link) {
  if (confirm(`确定删除 "${link.title}" 吗？`)) {
    links = links.filter(l => l.url !== link.url);
    saveData();
    renderLinks();
  }
}

function saveData() {
  chrome.storage.local.set({ links });
}

function addBookmark(url, title, iconUrl) {
  // 检查是否已存在
  const exists = links.find(l => l.url === url);
  if (exists) {
    showSidebarToast('该书签已存在！', 'warning');
    return;
  }

  const newLink = {
    id: Date.now().toString(),
    url: url,
    title: title || '未命名',
    icon: iconUrl || 'default-icon.png',
    groups: []
  };

  links.unshift(newLink);
  saveData();
  showSidebarToast('书签已添加！', 'success');
}

function showSidebarToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#10B981' : '#F59E0B';
  
  toast.style.cssText = `
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: ${bgColor};
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 0.875rem;
    font-weight: 500;
    animation: slideDown 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function showManualAddDialog() {
  // 创建模态框
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: var(--bg-card);
    border-radius: 1rem;
    padding: 1.5rem;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  dialog.innerHTML = `
    <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">
      <i class="fa fa-plus-circle" style="color: var(--primary); margin-right: 0.5rem;"></i>
      手动添加书签
    </h3>
    <div style="margin-bottom: 1rem;">
      <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-secondary);">
        网站地址 *
      </label>
      <input type="url" id="manualUrl" placeholder="https://example.com" required
        style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-secondary); color: var(--text-primary); font-size: 0.875rem; box-sizing: border-box;" />
    </div>
    <div style="margin-bottom: 1.5rem;">
      <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-secondary);">
        书签名称
      </label>
      <input type="text" id="manualTitle" placeholder="留空则自动获取"
        style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-secondary); color: var(--text-primary); font-size: 0.875rem; box-sizing: border-box;" />
    </div>
    <div style="display: flex; gap: 0.75rem;">
      <button id="manualCancel" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer; font-size: 0.875rem; font-weight: 600; transition: all 0.2s;">
        取消
      </button>
      <button id="manualSubmit" style="flex: 1; padding: 0.75rem; border: none; border-radius: 0.5rem; background: var(--primary); color: white; cursor: pointer; font-size: 0.875rem; font-weight: 600; transition: all 0.2s;">
        添加
      </button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // 自动聚焦
  setTimeout(() => {
    document.getElementById('manualUrl').focus();
  }, 100);

  // 取消按钮
  document.getElementById('manualCancel').addEventListener('click', () => {
    overlay.remove();
  });

  // 点击背景关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // 提交按钮
  document.getElementById('manualSubmit').addEventListener('click', () => {
    const url = document.getElementById('manualUrl').value.trim();
    const title = document.getElementById('manualTitle').value.trim();

    if (!url) {
      showSidebarToast('请输入网站地址', 'warning');
      return;
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch (e) {
      showSidebarToast('URL 格式不正确', 'warning');
      return;
    }

    // 如果没填标题，尝试获取网站信息
    if (!title) {
      fetchWebsiteInfo(url).then(info => {
        addBookmark(url, info.title, info.icon);
        overlay.remove();
      }).catch(() => {
        addBookmark(url, '未命名', 'default-icon.png');
        overlay.remove();
      });
    } else {
      addBookmark(url, title, 'default-icon.png');
      overlay.remove();
    }
  });

  // 回车提交
  document.getElementById('manualUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('manualSubmit').click();
    }
  });

  document.getElementById('manualTitle').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('manualSubmit').click();
    }
  });
}

function fetchWebsiteInfo(url) {
  return new Promise((resolve, reject) => {
    // 从 URL 提取域名作为标题
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      resolve({
        title: hostname,
        icon: 'default-icon.png'
      });
    } catch (e) {
      resolve({
        title: '未命名',
        icon: 'default-icon.png'
      });
    }
  });
}

function setupDragAndDrop() {
  const board = document.getElementById('sidebarBoard');
  if (!board) return;

  // 拖拽悬停
  board.addEventListener('dragover', (e) => {
    e.preventDefault();
    board.style.outline = '2px dashed var(--primary)';
    board.style.outlineOffset = '-4px';
    board.style.borderRadius = '0.5rem';
  });

  // 拖拽离开
  board.addEventListener('dragleave', (e) => {
    e.preventDefault();
    board.style.outline = '';
    board.style.outlineOffset = '';
    board.style.borderRadius = '';
  });

  // 拖拽放下
  board.addEventListener('drop', (e) => {
    e.preventDefault();
    board.style.outline = '';
    board.style.outlineOffset = '';
    board.style.borderRadius = '';

    // 获取拖拽的 URL
    const url = e.dataTransfer.getData('text/uri-list') || 
                e.dataTransfer.getData('text/plain');
    
    if (!url) {
      showSidebarToast('无法获取链接地址', 'warning');
      return;
    }

    // 清理 URL（去除可能的换行符等）
    const cleanUrl = url.trim().split('\n')[0];
    
    // 验证 URL 格式
    try {
      new URL(cleanUrl);
    } catch (e) {
      showSidebarToast('URL 格式不正确', 'warning');
      return;
    }

    // 检查是否已存在
    const exists = links.find(l => l.url === cleanUrl);
    if (exists) {
      showSidebarToast('该书签已存在！', 'warning');
      return;
    }

    // 查询当前标签页，尝试获取标题
    chrome.tabs.query({ url: cleanUrl }, (tabs) => {
      let finalTitle = '未命名';
      let icon = 'default-icon.png';
      
      if (tabs && tabs.length > 0) {
        // 找到了匹配的标签页，使用其标题
        const tab = tabs[0];
        finalTitle = tab.title || '未命名';
        icon = tab.favIconUrl || `https://${new URL(cleanUrl).hostname}/favicon.ico`;
      } else {
        // 没有匹配的标签页，使用域名作为标题
        try {
          const hostname = new URL(cleanUrl).hostname.replace(/^www\./, '');
          finalTitle = hostname.length > 30 ? hostname.substring(0, 30) + '...' : hostname;
          icon = `https://${new URL(cleanUrl).hostname}/favicon.ico`;
        } catch (e) {
          // 使用默认值
        }
      }

      // 限制标题长度
      finalTitle = finalTitle.length > 50 ? finalTitle.substring(0, 50) + '...' : finalTitle;

      // 添加书签
      const newLink = {
        id: Date.now().toString(),
        url: cleanUrl,
        title: finalTitle,
        icon: icon,
        groups: []
      };

      links.unshift(newLink);
      saveData();
      showSidebarToast('书签已添加！', 'success');
    });
  });
}
