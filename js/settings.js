/**
 * 书签白板 - 设置页面逻辑
 */

// ========== DOM 元素 ==========
let settingsBoard = null;
let searchInput = null;
let themeToggle = null;
let backToMainBtn = null;
let groupsList = null;
let addGroupBtn = null;
let exportDataBtn = null;
let importDataBtn = null;
let importFileInput = null;

// AI 相关 DOM 元素
let aiProvider = null;
let aiApiUrl = null;
let aiApiKey = null;
let aiModel = null;
let aiModelSelect = null;
let aiFetchModelsBtn = null;
let aiOptimizeTitle = null;
let aiSuggestCategory = null;
let aiGenerateTags = null;
let aiGenerateSummary = null;
let aiSmartSearch = null;
let aiDetectDuplicates = null;
let aiTestBtn = null;
let aiSaveBtn = null;
let aiStatus = null;

// ========== 状态管理 ==========
let links = [];
let groups = [];
let filterText = '';
let sortBy = 'createdAt-desc';
let domainCache = new Map();
let autoGroupNames = {};
let selectedLinks = new Set();
let isBatchMode = false;

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  // 第一步：立即恢复或设置默认菜单（优先级最高）
  initMenuState();
  
  // 初始化 DOM 元素
  settingsBoard = document.getElementById('settingsBookmarkBoard');
  searchInput = document.getElementById('settingsSearchInput');
  themeToggle = document.getElementById('settingsThemeToggle');
  backToMainBtn = document.getElementById('backToMain');
  groupsList = document.getElementById('groupsList');
  addGroupBtn = document.getElementById('addGroupBtn');
  exportDataBtn = document.getElementById('exportDataBtn');
  importDataBtn = document.getElementById('importDataBtn');
  importFileInput = document.getElementById('importFileInput');
  
  // 初始化 AI DOM 元素
  aiProvider = document.getElementById('aiProvider');
  aiApiUrl = document.getElementById('aiApiUrl');
  aiApiKey = document.getElementById('aiApiKey');
  aiModel = document.getElementById('aiModel');
  aiModelSelect = document.getElementById('aiModelSelect');
  aiFetchModelsBtn = document.getElementById('aiFetchModelsBtn');
  aiOptimizeTitle = document.getElementById('aiOptimizeTitle');
  aiSuggestCategory = document.getElementById('aiSuggestCategory');
  aiGenerateTags = document.getElementById('aiGenerateTags');
  aiGenerateSummary = document.getElementById('aiGenerateSummary');
  aiSmartSearch = document.getElementById('aiSmartSearch');
  aiDetectDuplicates = document.getElementById('aiDetectDuplicates');
  aiTestBtn = document.getElementById('aiTestBtn');
  aiSaveBtn = document.getElementById('aiSaveBtn');
  aiStatus = document.getElementById('aiStatus');
  
  // 加载主题
  loadTheme();
  
  // 设置导航
  setupNavigation();
  
  // 设置返回按钮
  setupBackButton();
  
  // 加载数据
  loadData();
  
  // 设置事件监听
  setupEventListeners();
  
  // 设置批量操作
  setupBatchMode();
  
  // 设置分组管理
  setupGroupManagement();
  
  // 设置数据管理
  setupDataManagement();
  
  // 设置 AI 助手
  setupAISettings();
});

// 初始化菜单状态
function initMenuState() {
  const lastMenu = localStorage.getItem('settings_last_menu');
  const targetMenu = lastMenu || 'bookmark-manager'; // 如果没有记录，默认书签管理
  
  const navItem = document.querySelector(`.nav-item[data-section="${targetMenu}"]`);
  const section = document.getElementById(targetMenu);
  
  if (navItem && section) {
    navItem.classList.add('active');
    section.classList.add('active');
    
    // 延迟刷新数据，确保loadData已经执行
    setTimeout(() => refreshSectionData(targetMenu), 100);
  }
}

// 加载主题
function loadTheme() {
  chrome.storage.local.get(['darkMode'], (result) => {
    if (result.darkMode === true || 
        (result.darkMode === undefined && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  });
}

// 加载数据
function loadData() {
  chrome.storage.local.get(['links', 'groups', 'autoGroupNames'], (result) => {
    links = (result.links || []).map(link => ({
      ...link,
      groups: link.groups || [],
      pinned: link.pinned || false,
      clickCount: link.clickCount || 0,
      lastAccessed: link.lastAccessed || null
    }));
    
    groups = result.groups || [];
    autoGroupNames = result.autoGroupNames || {};
    
    renderLinks();
  });
}

// 设置导航切换
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.settings-section');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(section => section.classList.remove('active'));
      
      item.classList.add('active');
      
      const sectionId = item.getAttribute('data-section');
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      // 保存当前菜单到 localStorage
      saveCurrentMenu(sectionId);
      
      // 刷新对应section的数据
      refreshSectionData(sectionId);
    });
  });
}

// 刷新section数据
function refreshSectionData(sectionId) {
  switch(sectionId) {
    case 'bookmark-manager':
      renderLinks();
      break;
    case 'groups':
      renderGroups();
      break;
    case 'data':
      updateDataStats();
      break;
    // 其他section可以在这里添加
  }
}

// 保存当前菜单
function saveCurrentMenu(sectionId) {
  localStorage.setItem('settings_last_menu', sectionId);
}

// 设置返回按钮
function setupBackButton() {
  if (backToMainBtn) {
    backToMainBtn.addEventListener('click', () => {
      // 清除菜单状态记录
      localStorage.removeItem('settings_last_menu');
      
      // 返回主页
      window.location.href = 'new-tab.html';
    });
  }
}

// 设置事件监听
function setupEventListeners() {
  // 监听 storage 变化
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.links) {
      loadData();
    }
  });
  
  // 搜索功能
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterText = e.target.value.toLowerCase();
      renderLinks();
    });
  }
}

// 获取书签域名（带缓存）
function getLinkDomain(link) {
  if (domainCache.has(link.url)) {
    return domainCache.get(link.url);
  }
  
  try {
    const domain = new URL(link.url).hostname.replace(/^www\./, '').toLowerCase();
    domainCache.set(link.url, domain);
    return domain;
  } catch (e) {
    domainCache.set(link.url, '');
    return '';
  }
}

// 排序书签
function sortLinks(linksToSort) {
  const [field, order] = sortBy.split('-');
  
  return [...linksToSort].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'createdAt':
        comparison = (a.createdAt || 0) - (b.createdAt || 0);
        break;
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      case 'clickCount':
        comparison = (a.clickCount || 0) - (b.clickCount || 0);
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
}

// 渲染书签
function renderLinks() {
  if (!settingsBoard) return;
  
  settingsBoard.innerHTML = '';
  
  let filtered = [...links];
  
  // 搜索过滤
  if (filterText) {
    filtered = filtered.filter(link => {
      const domain = getLinkDomain(link);
      return (
        link.title.toLowerCase().includes(filterText) ||
        link.url.toLowerCase().includes(filterText) ||
        domain.includes(filterText)
      );
    });
  }
  
  // 排序
  filtered = sortLinks(filtered);
  
  if (filtered.length === 0) {
    settingsBoard.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-inbox"></i>
        <p>${filterText ? '没有匹配的书签' : '暂无书签'}</p>
      </div>
    `;
    return;
  }
  
  // 渲染列表项
  filtered.forEach(link => {
    const item = createBookmarkListItem(link);
    settingsBoard.appendChild(item);
  });
}

// 创建书签列表项
function createBookmarkListItem(link) {
  const item = document.createElement('div');
  item.className = 'bookmark-list-item' + (isBatchMode ? ' batch-mode' : '');
  item.dataset.url = link.url;
  
  if (selectedLinks.has(link.url)) {
    item.classList.add('selected');
  }
  
  // 复选框（批量模式下显示）
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'list-checkbox';
  checkbox.checked = selectedLinks.has(link.url);
  checkbox.style.display = isBatchMode ? 'block' : 'none';
  checkbox.addEventListener('change', (e) => {
    e.stopPropagation();
    toggleSelection(link.url, e.target.checked);
  });
  item.appendChild(checkbox);
  
  // 批量模式下点击列表项切换选择
  if (isBatchMode) {
    item.addEventListener('click', (e) => {
      // 如果点击的是按钮，不处理
      if (e.target.closest('.list-action-btn')) return;
      
      const isSelected = selectedLinks.has(link.url);
      toggleSelection(link.url, !isSelected);
      checkbox.checked = !isSelected;
    });
  }
  
  // 图标
  const iconDiv = document.createElement('div');
  iconDiv.className = 'list-icon';
  const img = document.createElement('img');
  img.src = link.icon || 'default-icon.png';
  img.alt = link.title;
  img.onerror = function() {
    this.src = 'default-icon.png';
  };
  iconDiv.appendChild(img);
  item.appendChild(iconDiv);
  
  // 内容
  const content = document.createElement('div');
  content.className = 'list-content';
  
  // 标题
  const titleDiv = document.createElement('div');
  titleDiv.className = 'list-title';
  titleDiv.textContent = link.title;
  content.appendChild(titleDiv);
  
  // URL
  const urlDiv = document.createElement('div');
  urlDiv.className = 'list-url';
  urlDiv.textContent = link.url;
  content.appendChild(urlDiv);
  
  item.appendChild(content);
  
  // 统计
  const statsDiv = document.createElement('div');
  statsDiv.className = 'list-stats';
  const clickCount = link.clickCount || 0;
  const lastAccessText = link.lastAccessed ? formatTimeAgo(link.lastAccessed) : '从未查看';
  statsDiv.innerHTML = `
    <div class="list-stat">
      <i class="fa fa-eye"></i>
      <span>${clickCount}次</span>
    </div>
    <div class="list-stat">
      <i class="fa fa-clock-o"></i>
      <span>${lastAccessText}</span>
    </div>
  `;
  item.appendChild(statsDiv);
  
  // 操作按钮（查看、编辑和删除）
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'list-actions';
  
  // 查看按钮
  const viewBtn = document.createElement('button');
  viewBtn.className = 'list-action-btn view';
  viewBtn.title = '查看';
  viewBtn.innerHTML = '<i class="fa fa-external-link"></i>';
  viewBtn.addEventListener('click', () => {
    link.clickCount = (link.clickCount || 0) + 1;
    link.lastAccessed = Date.now();
    saveData();
    window.open(link.url, '_blank');
  });
  actionsDiv.appendChild(viewBtn);
  
  // 编辑按钮
  const editBtn = document.createElement('button');
  editBtn.className = 'list-action-btn';
  editBtn.title = '编辑';
  editBtn.innerHTML = '<i class="fa fa-edit"></i>';
  editBtn.addEventListener('click', () => {
    editBookmark(link);
  });
  actionsDiv.appendChild(editBtn);
  
  // 删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'list-action-btn delete';
  deleteBtn.title = '删除';
  deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
  deleteBtn.addEventListener('click', () => {
    deleteBookmark(link);
  });
  actionsDiv.appendChild(deleteBtn);
  
  item.appendChild(actionsDiv);
  
  return item;
}

// 格式化时间
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

// 保存数据
function saveData() {
  chrome.storage.local.set({ links });
}

// ========== 批量操作功能 ==========
function setupBatchMode() {
  const batchModeBtn = document.getElementById('batchModeBtn');
  const batchActions = document.getElementById('batchActions');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const groupSelectedBtn = document.getElementById('groupSelectedBtn');
  
  // 切换批量模式
  if (batchModeBtn) {
    batchModeBtn.addEventListener('click', () => {
      isBatchMode = !isBatchMode;
      batchModeBtn.classList.toggle('active', isBatchMode);
      batchActions.classList.toggle('show', isBatchMode);
      
      // 控制搜索框宽度
      const toolbarLeft = document.querySelector('.toolbar-left');
      if (toolbarLeft) {
        toolbarLeft.classList.toggle('batch-mode', isBatchMode);
      }
      
      // 退出批量模式时清空选择
      if (!isBatchMode) {
        selectedLinks.clear();
        updateSelectedCount();
      }
      
      renderLinks();
    });
  }
  
  // 全选
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const items = document.querySelectorAll('.bookmark-list-item');
      items.forEach(item => {
        const url = item.dataset.url;
        selectedLinks.add(url);
        item.classList.add('selected');
        const checkbox = item.querySelector('.list-checkbox');
        if (checkbox) checkbox.checked = true;
      });
      updateSelectedCount();
    });
  }
  
  // 取消全选
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      selectedLinks.clear();
      const items = document.querySelectorAll('.bookmark-list-item');
      items.forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.list-checkbox');
        if (checkbox) checkbox.checked = false;
      });
      updateSelectedCount();
    });
  }
  
  // 批量删除
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
      if (selectedLinks.size === 0) {
        showToast('请先选择要删除的书签');
        return;
      }
      
      showConfirmModal(
        '确认删除',
        `确定要删除 ${selectedLinks.size} 个书签吗？`,
        () => {
          links = links.filter(link => !selectedLinks.has(link.url));
          const count = selectedLinks.size;
          selectedLinks.clear();
          saveData();
          renderLinks();
          updateSelectedCount();
          showToast(`已删除 ${count} 个书签`);
        }
      );
    });
  }
  
  // 批量添加分组
  if (groupSelectedBtn) {
    groupSelectedBtn.addEventListener('click', () => {
      if (selectedLinks.size === 0) {
        showToast('请先选择要添加分组的书签');
        return;
      }
      
      // 使用页面内弹窗选择分组
      showGroupSelectionModal((selectedGroupId) => {
        if (!selectedGroupId) return;
        
        // 添加书签到分组
        let addedCount = 0;
        links.forEach(link => {
          if (selectedLinks.has(link.url)) {
            if (!link.groups) link.groups = [];
            if (!link.groups.includes(selectedGroupId)) {
              link.groups.push(selectedGroupId);
              addedCount++;
            }
          }
        });
        
        // 保存
        chrome.storage.local.set({ links }, () => {
          selectedLinks.clear();
          renderLinks();
          updateSelectedCount();
          
          // 显示成功提示
          showToast(`已将 ${addedCount} 个书签添加到分组`);
        });
      });
    });
  }
}

// ========== 分组管理功能 ==========
function setupGroupManagement() {
  // 新建分组
  if (addGroupBtn) {
    addGroupBtn.addEventListener('click', () => {
      showEditModal({ title: '', url: '' }, (name) => {
        const newGroup = {
          id: 'group_' + Date.now(),
          name: name.trim(),
          createdAt: Date.now()
        };
        groups.push(newGroup);
        saveGroups();
        renderGroups();
        showToast('分组已创建');
      }, '新建分组', '请输入分组名称：');
    });
  }
  
  // 监听分组切换，刷新列表
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.section === 'groups') {
        setTimeout(() => renderGroups(), 100);
      }
    });
  });
}

// 渲染分组列表
function renderGroups() {
  if (!groupsList) return;
  
  groupsList.innerHTML = '';
  
  // 生成自动分组
  const autoGroups = generateAutoGroups();
  
  // 合并所有分组（自动分组 + 自定义分组）
  const allGroups = [...autoGroups, ...groups];
  
  if (allGroups.length === 0) {
    groupsList.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-folder-open"></i>
        <p>暂无分组</p>
      </div>
    `;
    return;
  }
  
  // 渲染分组列表项
  allGroups.forEach(group => {
    const item = createGroupListItem(group);
    groupsList.appendChild(item);
  });
}

// 创建分组列表项
function createGroupListItem(group) {
  const item = document.createElement('div');
  item.className = 'group-list-item' + (group.auto ? ' auto-group' : '');
  
  // 图标
  const iconDiv = document.createElement('div');
  iconDiv.className = 'group-icon';
  iconDiv.innerHTML = group.auto ? '<i class="fa fa-globe"></i>' : '<i class="fa fa-folder"></i>';
  item.appendChild(iconDiv);
  
  // 信息
  const infoDiv = document.createElement('div');
  infoDiv.className = 'group-info';
  
  // 计算分组的书签数量
  let count = 0;
  if (group.auto) {
    count = group.count || 0;
  } else {
    count = links.filter(link => link.groups && link.groups.includes(group.id)).length;
  }
  
  infoDiv.innerHTML = `
    <div class="group-name">${group.name}</div>
    <div class="group-meta">${count} 个书签 · ${group.auto ? '自动分组' : '自定义分组'}</div>
  `;
  item.appendChild(infoDiv);
  
  // 操作按钮
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'group-actions';
  
  // 编辑按钮（所有分组都可以编辑名称）
  const editBtn = document.createElement('button');
  editBtn.className = 'group-action-btn';
  editBtn.title = '编辑名称';
  editBtn.innerHTML = '<i class="fa fa-edit"></i>';
  editBtn.addEventListener('click', () => {
    editGroup(group);
  });
  actionsDiv.appendChild(editBtn);
  
  // 删除按钮（只有自定义分组可以删除）
  if (!group.auto) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'group-action-btn delete';
    deleteBtn.title = '删除分组';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.addEventListener('click', () => {
      deleteGroup(group.id);
    });
    actionsDiv.appendChild(deleteBtn);
  } else {
    // 自动分组显示不可删除提示
    const disabledBtn = document.createElement('button');
    disabledBtn.className = 'group-action-btn';
    disabledBtn.disabled = true;
    disabledBtn.title = '自动分组不可删除';
    disabledBtn.innerHTML = '<i class="fa fa-lock"></i>';
    actionsDiv.appendChild(disabledBtn);
  }
  
  item.appendChild(actionsDiv);
  
  return item;
}

// 编辑分组
function editGroup(group) {
  showEditModal(
    { title: group.name, url: '' },
    (name) => {
      if (group.auto) {
        // 自动分组：只保存自定义名称
        autoGroupNames[group.id] = name.trim();
        chrome.storage.local.set({ autoGroupNames });
      } else {
        // 自定义分组：更新分组名称
        group.name = name.trim();
        saveGroups();
      }
      renderGroups();
      showToast('分组名称已更新');
    },
    group.auto ? '编辑自动分组名称' : '编辑分组',
    '请输入分组名称：'
  );
}

// 删除分组
function deleteGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  
  showConfirmModal(
    '确认删除',
    `确定要删除分组 "${group.name}" 吗？\n分组内的书签不会被删除。`,
    () => {
      // 从所有书签中移除该分组
      links.forEach(link => {
        if (link.groups) {
          link.groups = link.groups.filter(gId => gId !== groupId);
        }
      });
      
      // 删除分组
      groups = groups.filter(g => g.id !== groupId);
      saveGroups();
      renderGroups();
      showToast('分组已删除');
    }
  );
}

// 保存分组
function saveGroups() {
  chrome.storage.local.set({ groups });
}

// 生成自动分组
function generateAutoGroups() {
  const domainCount = {};
  
  links.forEach(link => {
    const domain = getLinkDomain(link);
    if (domain) {
      domainCount[domain] = (domainCount[domain] || 0) + 1;
    }
  });
  
  return Object.entries(domainCount)
    .filter(([_, count]) => count >= 2)  // 只显示有2个及以上书签的域名
    .map(([domain, count]) => ({
      id: 'auto_' + domain,
      name: autoGroupNames['auto_' + domain] || domain,
      auto: true,
      count: count,
      domain: domain
    }))
    .sort((a, b) => b.count - a.count);  // 按数量排序
}

// 切换选择
function toggleSelection(url, checked) {
  if (checked) {
    selectedLinks.add(url);
  } else {
    selectedLinks.delete(url);
  }
  
  // 更新UI
  const item = document.querySelector(`.bookmark-list-item[data-url="${url}"]`);
  if (item) {
    item.classList.toggle('selected', checked);
  }
  
  updateSelectedCount();
}

// 更新选中数量
function updateSelectedCount() {
  const countEl = document.getElementById('selectedCountText');
  if (countEl) {
    countEl.textContent = selectedLinks.size;
  }
}

// 编辑书签
function editBookmark(link) {
  showEditModal(link, () => {
    saveData();
    renderLinks();
    showToast('书签已更新');
  });
}

// 删除书签
function deleteBookmark(link) {
  showConfirmModal(
    '确认删除',
    `确定要删除"${link.title}"吗？`,
    () => {
      links = links.filter(l => l.url !== link.url);
      saveData();
      renderLinks();
      showToast('书签已删除');
    }
  );
}

// ========== 页面内弹窗功能 ==========

// 显示编辑弹窗
function showEditModal(link, onConfirm, customTitle = '编辑书签', customMessage = '') {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  const isGroupEdit = !link.url;
  const title = customTitle;
  const message = customMessage || (isGroupEdit ? '请输入名称：' : '');
  
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      <div class="modal-body">
        ${message ? `<p style="margin-bottom: 1rem; color: var(--text-secondary);">${message}</p>` : ''}
        <div class="modal-field">
          <label>${isGroupEdit ? '分组名称' : '标题'}</label>
          <input type="text" id="modalTitleInput" value="${link.title || ''}" placeholder="${isGroupEdit ? '请输入分组名称' : ''}" />
        </div>
        ${!isGroupEdit ? `
        <div class="modal-field">
          <label>URL</label>
          <input type="text" id="modalUrlInput" value="${link.url || ''}" />
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">取消</button>
        <button class="modal-btn modal-btn-primary">保存</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const titleInput = modal.querySelector('#modalTitleInput');
  const urlInput = modal.querySelector('#modalUrlInput');
  const cancelBtn = modal.querySelector('.modal-btn-cancel');
  const confirmBtn = modal.querySelector('.modal-btn-primary');
  
  // 聚焦到输入框
  setTimeout(() => titleInput.focus(), 100);
  
  // 取消
  cancelBtn.addEventListener('click', () => modal.remove());
  
  // 确认
  confirmBtn.addEventListener('click', () => {
    const name = titleInput.value.trim();
    if (!name && isGroupEdit) {
      showToast('请输入名称');
      return;
    }
    
    if (isGroupEdit) {
      onConfirm(name);
    } else {
      link.title = name || link.title;
      link.url = urlInput.value.trim() || link.url;
    }
    modal.remove();
    if (!isGroupEdit) onConfirm();
  });
  
  // 回车确认，ESC取消（绑定到document，确保任何情况都能响应）
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    } else if (e.key === 'Escape') {
      cancelBtn.click();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // 弹窗关闭时移除事件监听
  const originalRemove = modal.remove.bind(modal);
  modal.remove = function() {
    document.removeEventListener('keydown', handleKeyDown);
    originalRemove();
  };
}

// 显示确认弹窗
function showConfirmModal(title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content modal-small">
      <h3>${title}</h3>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">取消</button>
        <button class="modal-btn modal-btn-danger">确认</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cancelBtn = modal.querySelector('.modal-btn-cancel');
  const confirmBtn = modal.querySelector('.modal-btn-danger');
  
  // 取消
  cancelBtn.addEventListener('click', () => modal.remove());
  
  // 确认
  confirmBtn.addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
  
  // ESC取消（绑定到document）
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') cancelBtn.click();
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // 弹窗关闭时移除事件监听
  const originalRemove = modal.remove.bind(modal);
  modal.remove = function() {
    document.removeEventListener('keydown', handleKeyDown);
    originalRemove();
  };
}

// 显示分组选择弹窗
function showGroupSelectionModal(onSelect) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  // 生成选项HTML
  let optionsHtml = '';
  groups.forEach(group => {
    optionsHtml += `
      <div class="group-option" data-id="${group.id}">
        <input type="radio" name="groupSelect" id="group_${group.id}" value="${group.id}" />
        <label for="group_${group.id}">${group.name}</label>
      </div>
    `;
  });
  
  if (groups.length === 0) {
    optionsHtml = '<p class="no-groups">暂无分组，请先创建分组</p>';
  }
  
  modal.innerHTML = `
    <div class="modal-content modal-small">
      <h3>选择分组</h3>
      <div class="modal-body group-list">
        ${optionsHtml}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">取消</button>
        <button class="modal-btn modal-btn-primary" ${groups.length === 0 ? 'disabled' : ''}>确定</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cancelBtn = modal.querySelector('.modal-btn-cancel');
  const confirmBtn = modal.querySelector('.modal-btn-primary');
  
  // 取消
  cancelBtn.addEventListener('click', () => {
    modal.remove();
    onSelect(null);
  });
  
  // 确认
  confirmBtn.addEventListener('click', () => {
    const selected = modal.querySelector('input[name="groupSelect"]:checked');
    modal.remove();
    onSelect(selected ? selected.value : null);
  });
  
  // 双击选项直接确认
  modal.querySelectorAll('.group-option').forEach(option => {
    option.addEventListener('dblclick', () => {
      const radio = option.querySelector('input[type="radio"]');
      radio.checked = true;
      confirmBtn.click();
    });
  });
  
  // ESC取消（绑定到document）
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') cancelBtn.click();
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // 弹窗关闭时移除事件监听
  const originalRemove = modal.remove.bind(modal);
  modal.remove = function() {
    document.removeEventListener('keydown', handleKeyDown);
    originalRemove();
  };
}

// 显示Toast提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== 数据管理功能 ==========
function setupDataManagement() {
  // 导出数据
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportData);
  }
  
  // 导入数据
  if (importDataBtn) {
    importDataBtn.addEventListener('click', () => {
      importFileInput.click();
    });
  }
  
  // 文件选择
  if (importFileInput) {
    importFileInput.addEventListener('change', handleImportFile);
  }
}

// 更新数据统计
function updateDataStats() {
  const totalBookmarks = document.getElementById('totalBookmarks');
  const totalGroups = document.getElementById('totalGroups');
  const totalClicks = document.getElementById('totalClicks');
  
  if (totalBookmarks) totalBookmarks.textContent = links.length;
  if (totalGroups) totalGroups.textContent = groups.length;
  if (totalClicks) {
    const clicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
    totalClicks.textContent = clicks;
  }
}

// 导出数据
async function exportData() {
  try {
    showToast('正在准备导出数据...');
    
    // 收集所有数据
    const exportObj = {
      version: '3.2.0',
      exportDate: new Date().toISOString(),
      links: links,
      groups: groups,
      autoGroupNames: autoGroupNames || {},
      settings: {
        darkMode: document.documentElement.classList.contains('dark'),
        sortBy: sortBy
      }
    };
    
    // 转换为JSON
    const jsonData = JSON.stringify(exportObj, null, 2);
    
    // 加密数据
    const encryptedData = await encryptData(jsonData);
    
    // 创建下载
    const blob = new Blob([encryptedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmark-board-backup-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据导出成功！');
  } catch (error) {
    console.error('导出数据失败:', error);
    showToast('导出数据失败: ' + error.message);
  }
}

// 导入数据
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    showToast('正在读取文件...');
    
    // 读取文件
    const text = await file.text();
    
    // 解密数据
    const decryptedData = await decryptData(text);
    
    // 解析JSON
    const importObj = JSON.parse(decryptedData);
    
    // 验证数据
    if (!importObj.links || !importObj.groups) {
      throw new Error('数据格式不正确');
    }
    
    // 确认导入
    showConfirmModal(
      '确认导入',
      `导入将覆盖当前所有数据！\n书签: ${importObj.links.length} 个\n分组: ${importObj.groups.length} 个\n\n确定要继续吗？`,
      async () => {
        try {
          showToast('正在导入数据...');
          
          // 导入数据
          links = importObj.links || [];
          groups = importObj.groups || [];
          autoGroupNames = importObj.autoGroupNames || {};
          
          // 导入设置
          if (importObj.settings) {
            if (importObj.settings.darkMode !== undefined) {
              chrome.storage.local.set({ darkMode: importObj.settings.darkMode });
            }
            if (importObj.settings.sortBy) {
              sortBy = importObj.settings.sortBy;
            }
          }
          
          // 保存到本地
          chrome.storage.local.set({ 
            links, 
            groups, 
            autoGroupNames 
          }, () => {
            showToast('数据导入成功！');
            
            // 刷新当前视图
            const activeSection = document.querySelector('.settings-section.active');
            if (activeSection) {
              refreshSectionData(activeSection.id);
            }
          });
        } catch (error) {
          console.error('导入数据失败:', error);
          showToast('导入数据失败: ' + error.message);
        }
      }
    );
  } catch (error) {
    console.error('导入失败:', error);
    showToast('导入失败: ' + (error.message || '文件格式错误或数据已损坏'));
  }
  
  // 清空input，允许重复导入同一文件
  event.target.value = '';
}

// 加密数据（UTF-8 + Base64 + XOR + Base64）
async function encryptData(data) {
  const key = 'bookmark-board-2026';
  
  // 1. UTF-8 编码
  const utf8Bytes = new TextEncoder().encode(data);
  const latin1Str = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
  
  // 2. Base64 编码
  const base64Str = btoa(latin1Str);
  
  // 3. XOR 密钥混淆
  const xorResult = base64Str.split('').map((char, i) => {
    return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
  }).join('');
  
  // 4. 再次 Base64 编码（确保输出可打印字符）
  const xorLatin1 = Array.from(new TextEncoder().encode(xorResult), byte => String.fromCharCode(byte)).join('');
  const finalBase64 = btoa(xorLatin1);
  
  return JSON.stringify({
    v: 1,
    d: finalBase64
  });
}

// 解密数据
async function decryptData(encryptedText) {
  try {
    const encrypted = JSON.parse(encryptedText);
    if (!encrypted.v || !encrypted.d) {
      throw new Error('无效的加密数据');
    }
    
    const key = 'bookmark-board-2026';
    
    // 1. Base64 解码（还原 XOR 结果）
    const xorLatin1 = atob(encrypted.d);
    const xorBytes = new Uint8Array(xorLatin1.length);
    for (let i = 0; i < xorLatin1.length; i++) {
      xorBytes[i] = xorLatin1.charCodeAt(i);
    }
    const xorResult = new TextDecoder().decode(xorBytes);
    
    // 2. XOR 密钥还原
    const base64Str = xorResult.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
    }).join('');
    
    // 3. Base64 解码
    const latin1Str = atob(base64Str);
    
    // 4. Latin1 → UTF-8
    const utf8Bytes = new Uint8Array(latin1Str.length);
    for (let i = 0; i < latin1Str.length; i++) {
      utf8Bytes[i] = latin1Str.charCodeAt(i);
    }
    
    // 5. UTF-8 解码
    return new TextDecoder().decode(utf8Bytes);
  } catch (error) {
    throw new Error('解密失败，文件可能已损坏或格式不正确');
  }
}

// ========== AI 助手功能 ==========

/**
 * 设置 AI 助手
 */
function setupAISettings() {
  // 加载 AI 设置
  loadAISettings();
  
  // 测试连接按钮
  if (aiTestBtn) {
    aiTestBtn.addEventListener('click', testAIConnection);
  }
  
  // 保存设置按钮
  if (aiSaveBtn) {
    aiSaveBtn.addEventListener('click', saveAISettings);
  }
  
  // 供应商切换时自动填充默认值
  if (aiProvider) {
    aiProvider.addEventListener('change', onProviderChange);
  }
  
  // 获取模型列表按钮
  if (aiFetchModelsBtn) {
    aiFetchModelsBtn.addEventListener('click', fetchModelsList);
  }
  
  // 模型选择变化时同步到输入框
  if (aiModelSelect) {
    aiModelSelect.addEventListener('change', () => {
      if (aiModel) {
        // 如果选择"自定义"，显示输入框
        if (aiModelSelect.value === 'custom') {
          aiModel.style.display = 'block';
          aiModel.focus();
        } else {
          aiModel.style.display = 'none';
          aiModel.value = aiModelSelect.value;
        }
      }
    });
  }
  
  // AI 功能开关变化时自动保存
  const featureCheckboxes = [
    aiOptimizeTitle,
    aiSuggestCategory,
    aiGenerateSummary,
    aiSmartSearch
  ].filter(Boolean);
  
  featureCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // 延迟保存，确保 UI 更新完成
      setTimeout(() => {
        saveAISettings();
      }, 100);
    });
  });
  
  // API 配置区折叠/展开
  const aiConfigToggle = document.getElementById('aiConfigToggle');
  const aiConfigBody = document.getElementById('aiConfigBody');
  const aiToggleIcon = document.querySelector('.ai-toggle-icon');
  
  if (aiConfigToggle && aiConfigBody) {
    aiConfigToggle.addEventListener('click', () => {
      const isCollapsed = aiConfigBody.classList.toggle('collapsed');
      if (aiToggleIcon) {
        aiToggleIcon.classList.toggle('collapsed', isCollapsed);
      }
      
      // 保存折叠状态
      localStorage.setItem('ai_config_collapsed', isCollapsed ? 'true' : 'false');
    });
  }
  
  // 全选/全不选功能
  const aiToggleAllBtn = document.getElementById('aiToggleAllFeatures');
  if (aiToggleAllBtn) {
    aiToggleAllBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.ai-feature-card input[type="checkbox"]');
      // 检查是否全部已选中
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      // 如果全部已选中，则全不选；否则全选
      const newState = !allChecked;
      checkboxes.forEach(cb => {
        cb.checked = newState;
      });
      
      // 更新按钮文字
      const btnText = aiToggleAllBtn.querySelector('span');
      if (btnText) {
        btnText.textContent = newState ? '取消全选' : '全选';
      }
      
      // 自动保存设置
      saveAISettings();
    });
  }
}

/**
 * 更新 AI 配置摘要
 */
function updateAIConfigSummary(provider, providerConfig) {
  const summaryEl = document.getElementById('aiConfigSummary');
  if (!summaryEl) return;
  
  if (providerConfig.apiUrl || providerConfig.model) {
    // 已配置
    const providerNames = {
      lmstudio: 'LM Studio',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      aliyun: '阿里云',
      zhipu: '智谱 AI',
      baidu: '百度文心',
      tencent: '腾讯混元',
      moonshot: '月之暗面',
      google: 'Google',
      custom: '自定义'
    };
    
    const name = providerNames[provider] || provider;
    const model = providerConfig.model || '未选择';
    summaryEl.textContent = `${name} - ${model}`;
    summaryEl.classList.add('configured');
  } else {
    // 未配置
    summaryEl.textContent = '未配置';
    summaryEl.classList.remove('configured');
  }
}

/**
 * 加载 AI 设置
 */
function loadAISettings() {
  chrome.storage.local.get(['aiSettings', 'aiProviderConfigs'], (result) => {
    const settings = result.aiSettings || getDefaultAISettings();
    const providerConfigs = result.aiProviderConfigs || {};  // 各供应商的独立配置
    
    // 填充供应商选择
    if (aiProvider) aiProvider.value = settings.provider || 'custom';
    
    // 加载当前供应商的配置
    const currentProvider = settings.provider || 'custom';
    const providerConfig = providerConfigs[currentProvider] || {};
    
    // 填充表单（优先使用供应商独立配置）
    if (aiApiUrl) aiApiUrl.value = providerConfig.apiUrl || settings.config?.apiUrl || '';
    if (aiApiKey) aiApiKey.value = providerConfig.apiKey || settings.config?.apiKey || '';
    if (aiModel) aiModel.value = providerConfig.model || settings.config?.model || '';
    
    // 同步更新下拉框显示
    if (aiModelSelect) {
      const savedModel = providerConfig.model || settings.config?.model || '';
      
      if (savedModel) {
        // 有保存的模型：不显示"自动获取"提示
        aiModelSelect.innerHTML = '<option value="custom">自定义（手动输入）</option>';
        
        // 检查下拉框中是否已有该选项
        const existingOption = Array.from(aiModelSelect.options).find(opt => opt.value === savedModel);
        if (!existingOption) {
          // 如果没有，创建新选项并插入到"自定义"之前
          const customOption = aiModelSelect.querySelector('option[value="custom"]');
          const newOption = document.createElement('option');
          newOption.value = savedModel;
          newOption.textContent = savedModel;
          newOption.selected = true;
          
          if (customOption) {
            aiModelSelect.insertBefore(newOption, customOption);
          } else {
            aiModelSelect.appendChild(newOption);
          }
        } else {
          // 直接选中已有选项
          aiModelSelect.value = savedModel;
        }
      } else {
        // 没有保存的模型：显示"自动获取"提示
        aiModelSelect.innerHTML = '<option value="">-- 自动获取模型 --</option><option value="custom">自定义（手动输入）</option>';
        aiModelSelect.value = '';
      }
    }
    
    // 填充功能开关（全局共享）
    if (aiOptimizeTitle) aiOptimizeTitle.checked = settings.features?.optimizeTitle || false;
    if (aiSuggestCategory) aiSuggestCategory.checked = settings.features?.suggestCategory || false;
    if (aiGenerateSummary) aiGenerateSummary.checked = settings.features?.generateSummary || false;
    if (aiSmartSearch) aiSmartSearch.checked = settings.features?.smartSearch || false;
    
    // 更新配置摘要
    updateAIConfigSummary(settings.provider, providerConfig);
    
    // 根据配置状态决定默认展开/折叠
    const isConfigured = providerConfig.apiUrl || providerConfig.model;
    const storedCollapsed = localStorage.getItem('ai_config_collapsed');
    
    // 清除旧的存储状态，重新根据配置决定
    localStorage.removeItem('ai_config_collapsed');
    
    const shouldCollapse = !!isConfigured; // 已配置则折叠，未配置则展开
    
    const aiConfigBody = document.getElementById('aiConfigBody');
    const aiToggleIcon = document.querySelector('.ai-toggle-icon');
    if (aiConfigBody && shouldCollapse) {
      aiConfigBody.classList.add('collapsed');
      if (aiToggleIcon) {
        aiToggleIcon.classList.add('collapsed');
      }
    }
  });
}
function saveAISettings() {
  const currentProvider = aiProvider?.value || 'custom';
  
  // 获取当前供应商的默认配置
  const providerConfig = (typeof AI_PROVIDERS !== 'undefined') ? AI_PROVIDERS[currentProvider] : null;
  
  // 如果用户没有填写 API 地址，使用 placeholder 中的默认值
  let apiUrl = aiApiUrl?.value || '';
  if (!apiUrl && aiApiUrl?.placeholder) {
    apiUrl = aiApiUrl.placeholder;  // 使用 placeholder 中的默认地址
  }
  
  const settings = {
    provider: currentProvider,
    config: {
      apiUrl: apiUrl,
      apiKey: aiApiKey?.value || '',
      model: aiModel?.value || ''
    },
    features: {
      optimizeTitle: aiOptimizeTitle?.checked || false,
      suggestCategory: aiSuggestCategory?.checked || false,
      generateSummary: aiGenerateSummary?.checked || false,
      smartSearch: aiSmartSearch?.checked || false
    }
  };
  
  // 如果没有 API 地址，只保存功能开关
  if (!settings.config.apiUrl) {
    // 只保存功能开关，不保存供应商配置
    chrome.storage.local.get(['aiSettings'], (result) => {
      const existingSettings = result.aiSettings || {};
      existingSettings.features = settings.features;
      
      chrome.storage.local.set({ aiSettings: existingSettings }, () => {
        if (chrome.runtime.lastError) {
          showAISstatus('error', '保存失败: ' + chrome.runtime.lastError.message);
          return;
        }
        showAISstatus('success', '功能设置已保存！');
      });
    });
    return;
  }
  
  // 获取现有供应商配置
  chrome.storage.local.get(['aiProviderConfigs'], (result) => {
    const providerConfigs = result.aiProviderConfigs || {};
    
    // 保存当前供应商的配置
    providerConfigs[currentProvider] = {
      apiUrl: settings.config.apiUrl,
      apiKey: settings.config.apiKey,
      model: settings.config.model
    };
    
    // 同时保存全局设置
    chrome.storage.local.set({ 
      aiSettings: settings,
      aiProviderConfigs: providerConfigs
    }, () => {
      if (chrome.runtime.lastError) {
        showAISstatus('error', '保存失败: ' + chrome.runtime.lastError.message);
        return;
      }
      
      showAISstatus('success', '设置已保存！');
      
      // 3秒后隐藏状态
      setTimeout(() => {
        if (aiStatus) aiStatus.style.display = 'none';
      }, 3000);
    });
  });
}

/**
 * 测试 AI 连接
 */
async function testAIConnection() {
  // 如果用户没有填写 API 地址，使用 placeholder 中的默认值
  let apiUrl = aiApiUrl?.value || '';
  if (!apiUrl && aiApiUrl?.placeholder) {
    apiUrl = aiApiUrl.placeholder;
  }
  
  if (!apiUrl) {
    showAISstatus('error', '请先填写 API 地址');
    return;
  }
  
  showAISstatus('loading', '正在测试连接...');
  
  try {
    // 创建 AI 服务实例
    const settings = {
      provider: aiProvider?.value || 'custom',
      config: {
        apiUrl: apiUrl,
        apiKey: aiApiKey?.value || '',
        model: aiModel?.value || ''
      }
    };
    
    const aiService = new AIService(settings);
    const result = await aiService.testConnection();
    
    if (result.success) {
      showAISstatus('success', result.message);
    } else {
      showAISstatus('error', result.message);
    }
  } catch (error) {
    showAISstatus('error', '测试失败: ' + error.message);
  }
}

/**
 * 供应商切换事件
 */
function onProviderChange() {
  const provider = aiProvider?.value || 'custom';
  
  // 安全检查 AI_PROVIDERS 是否存在
  if (typeof AI_PROVIDERS === 'undefined') {
    console.warn('AI_PROVIDERS 未定义，跳过自动填充');
    return;
  }
  
  const providerConfig = AI_PROVIDERS[provider];
  
  if (!providerConfig) return;
  
  // 获取所有供应商配置
  chrome.storage.local.get(['aiProviderConfigs'], (result) => {
    const providerConfigs = result.aiProviderConfigs || {};
    const currentConfig = providerConfigs[provider] || {};
    
    // 如果有保存的配置，加载它
    if (currentConfig.apiUrl) {
      if (aiApiUrl) aiApiUrl.value = currentConfig.apiUrl;
      if (aiApiKey) aiApiKey.value = currentConfig.apiKey || '';
      if (aiModel) aiModel.value = currentConfig.model || '';
      
      // 同步更新下拉框显示（有保存的模型，不显示"自动获取"提示）
      if (aiModelSelect) {
        aiModelSelect.innerHTML = '<option value="custom">自定义（手动输入）</option>';
        
        if (currentConfig.model) {
          // 添加已保存的模型选项
          const customOption = aiModelSelect.querySelector('option[value="custom"]');
          const savedOption = document.createElement('option');
          savedOption.value = currentConfig.model;
          savedOption.textContent = currentConfig.model;
          savedOption.selected = true;
          
          if (customOption) {
            aiModelSelect.insertBefore(savedOption, customOption);
          } else {
            aiModelSelect.appendChild(savedOption);
          }
        }
      }
    } else {
      // 没有保存的配置，清空输入框，显示 placeholder 提示
      if (aiApiUrl) {
        aiApiUrl.value = '';  // 不填充默认值
        aiApiUrl.placeholder = providerConfig.defaultUrl || 'https://api.example.com/v1';  // 显示为提示
      }
      
      if (aiApiKey) {
        aiApiKey.value = '';
        aiApiKey.placeholder = providerConfig.needApiKey ? 'sk-...' : '可选';
      }
      
      if (aiModel) {
        aiModel.value = '';
      }
      
      // 重置下拉框（显示"自动获取"提示）
      if (aiModelSelect) {
        aiModelSelect.innerHTML = '<option value="">-- 自动获取模型 --</option><option value="custom">自定义（手动输入）</option>';
      }
    }
    
    // 隐藏自定义输入框（切换供应商时重置）
    if (aiModel) {
      aiModel.style.display = 'none';
    }
  });
}

/**
 * 获取模型列表
 */
async function fetchModelsList() {
  // 如果用户没有填写 API 地址，使用 placeholder 中的默认值
  let apiUrl = aiApiUrl?.value || '';
  if (!apiUrl && aiApiUrl?.placeholder) {
    apiUrl = aiApiUrl.placeholder;
  }
  
  if (!apiUrl) {
    showAISstatus('error', '请先填写 API 地址');
    return;
  }
  
  showAISstatus('loading', '正在获取模型列表...');
  
  try {
    // 创建 AI 服务实例
    const settings = {
      provider: aiProvider?.value || 'custom',
      config: {
        apiUrl: apiUrl,
        apiKey: aiApiKey?.value || '',
        model: aiModel?.value || ''
      }
    };
    
    const aiService = new AIService(settings);
    const models = await aiService.fetchModels();
    
    if (models && models.length > 0) {
      // 清空下拉框
      aiModelSelect.innerHTML = '';
      
      // 添加模型选项（第一个模型默认选中）
      models.forEach((model, index) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        if (index === 0) {
          option.selected = true;  // 默认选中第一个
          aiModel.value = model;   // 同步到隐藏输入框
        }
        aiModelSelect.appendChild(option);
      });
      
      // 添加分隔线（可选）
      const divider = document.createElement('option');
      divider.disabled = true;
      divider.textContent = '──────────';
      aiModelSelect.appendChild(divider);
      
      // 添加“自定义”选项（放在最后）
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = '自定义（手动输入）';
      aiModelSelect.appendChild(customOption);
      
      // 隐藏自定义输入框（加载成功后重置）
      if (aiModel) {
        aiModel.style.display = 'none';
      }
      
      showAISstatus('success', `获取到 ${models.length} 个模型`);
      
      // 显示 Toast 通知
      if (typeof showToast === 'function') {
        showToast(`成功加载 ${models.length} 个模型`, 'success');
      }
    } else {
      showAISstatus('error', '未获取到模型列表');
    }
  } catch (error) {
    showAISstatus('error', '获取模型失败: ' + error.message);
  }
}

/**
 * 显示 AI 状态
 */
function showAISstatus(type, message) {
  // 使用 toast 通知替代内联状态显示
  if (type === 'loading') {
    // loading 状态不显示 toast，只在控制台输出
    console.log(message);
  } else if (type === 'success') {
    showToast(message);
  } else if (type === 'error') {
    showToast(message, 'error');
  }
}

/**
 * 获取默认 AI 设置
 */
function getDefaultAISettings() {
  return {
    provider: 'lmstudio',
    config: {
      apiUrl: '',  // 不预设默认值，由 placeholder 提供提示
      apiKey: '',
      model: ''
    },
    features: {
      optimizeTitle: true,
      suggestCategory: true,
      generateSummary: false,
      smartSearch: false
    }
  };
}
