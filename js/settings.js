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
let chromeBookmarkBtn = null;         // Chrome 书签导入按钮
let chromeBookmarkFileInput = null;  // Chrome 书签文件选择

// AI 相关 DOM 元素
let aiProvider = null;
let aiApiUrl = null;
let aiApiKey = null;
let aiModel = null;
let aiModelSelect = null;
let aiFetchModelsBtn = null;
let aiTitleOptimizationAuto = null;
let aiTitleOptimizationManual = null;
let aiCategorySuggestionAuto = null;
let aiCategorySuggestionManual = null;
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
let isApiConfigValidated = false;  // API 配置是否通过测试验证

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
  // 先初始化 i18n（检查语言覆盖），再绑定 DOM
  if (window.I18n) {
    await I18n.init();
    I18n.bindDOM();
  }
  
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
  chromeBookmarkBtn = document.getElementById('importChromeBookmarksBtn');
  chromeBookmarkFileInput = document.getElementById('chromeBookmarkFileInput');

  // 初始化 AI DOM 元素
  aiProvider = document.getElementById('aiProvider');
  aiApiUrl = document.getElementById('aiApiUrl');
  aiApiKey = document.getElementById('aiApiKey');
  aiModel = document.getElementById('aiModel');
  aiModelSelect = document.getElementById('aiModelSelect');
  aiFetchModelsBtn = document.getElementById('aiFetchModelsBtn');
  aiTitleOptimizationAuto = document.getElementById('aiTitleOptimizationAuto');
  aiTitleOptimizationManual = document.getElementById('aiTitleOptimizationManual');
  aiCategorySuggestionAuto = document.getElementById('aiCategorySuggestionAuto');
  aiCategorySuggestionManual = document.getElementById('aiCategorySuggestionManual');
  aiGenerateSummary = document.getElementById('aiGenerateSummary');
  aiSmartSearch = document.getElementById('aiSmartSearch');
  aiDetectDuplicates = document.getElementById('aiDetectDuplicates');
  aiTestBtn = document.getElementById('aiTestBtn');
  aiSaveBtn = document.getElementById('aiSaveBtn');
  aiStatus = document.getElementById('aiStatus');
  
  // 提示词编辑相关
  promptModal = document.getElementById('promptModal');
  promptFunctionName = document.getElementById('promptFunctionName');
  promptTextarea = document.getElementById('promptTextarea');
  closePromptModal = document.getElementById('closePromptModal');
  savePromptBtn = document.getElementById('savePromptBtn');
  cancelPromptBtn = document.getElementById('cancelPromptBtn');
  resetPromptBtn = document.getElementById('resetPromptBtn');
  currentPromptKey = null;
  
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
  
  // 设置外观（语言 + 主题）
  setupAppearance();
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
        <p>${filterText ? I18n.t('settings_no_match') : I18n.t('settings_no_bookmarks')}</p>
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
  const lastAccessText = link.lastAccessed ? I18n.formatTimeAgo(link.lastAccessed) : I18n.t('settings_never_viewed');
  statsDiv.innerHTML = `
    <div class="list-stat">
      <i class="fa fa-eye"></i>
      <span>${I18n.t('settings_view_count', String(clickCount))}</span>
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
  viewBtn.title = I18n.t('settings_view');
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
  editBtn.title = I18n.t('edit');
  editBtn.innerHTML = '<i class="fa fa-edit"></i>';
  editBtn.addEventListener('click', () => {
    editBookmark(link);
  });
  actionsDiv.appendChild(editBtn);
  
  // 删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'list-action-btn delete';
  deleteBtn.title = I18n.t('delete');
  deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
  deleteBtn.addEventListener('click', () => {
    deleteBookmark(link);
  });
  actionsDiv.appendChild(deleteBtn);
  
  item.appendChild(actionsDiv);
  
  return item;
}

// 格式化时间（委托给 I18n）
function formatTimeAgo(timestamp) {
  return I18n.formatTimeAgo(timestamp);
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
        showToast(I18n.t('settings_batch_no_select'));
        return;
      }
      
      showConfirmModal(
        I18n.t('settings_confirm_delete_title'),
        I18n.t('settings_batch_confirm_delete', String(selectedLinks.size)),
        () => {
          links = links.filter(link => !selectedLinks.has(link.url));
          const count = selectedLinks.size;
          selectedLinks.clear();
          saveData();
          renderLinks();
          updateSelectedCount();
          showToast(I18n.t('settings_batch_deleted', String(count)));
        }
      );
    });
  }
  
  // 批量添加分组
  if (groupSelectedBtn) {
    groupSelectedBtn.addEventListener('click', () => {
      if (selectedLinks.size === 0) {
        showToast(I18n.t('settings_batch_no_group_select'));
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
          showToast(I18n.t('settings_batch_grouped', String(addedCount)));
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
        showToast(I18n.t('settings_group_created'));
      }, I18n.t('settings_new_group_title'), I18n.t('settings_group_name_input_label'));
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
        <p>${I18n.t('settings_no_groups')}</p>
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
    <div class="group-meta">${I18n.t('settings_bookmarks_count', String(count))} · ${group.auto ? I18n.t('settings_auto_group') : I18n.t('settings_custom_group')}</div>
  `;
  item.appendChild(infoDiv);
  
  // 操作按钮
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'group-actions';
  
  // 编辑按钮（所有分组都可以编辑名称）
  const editBtn = document.createElement('button');
  editBtn.className = 'group-action-btn';
  editBtn.title = I18n.t('edit') + ' ' + I18n.t('settings_title_label');
  editBtn.innerHTML = '<i class="fa fa-edit"></i>';
  editBtn.addEventListener('click', () => {
    editGroup(group);
  });
  actionsDiv.appendChild(editBtn);
  
  // 删除按钮（只有自定义分组可以删除）
  if (!group.auto) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'group-action-btn delete';
    deleteBtn.title = I18n.t('delete') + ' ' + I18n.t('settings_groups_create');
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
    disabledBtn.title = I18n.t('settings_auto_group_cannot_delete');
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
      showToast(I18n.t('settings_group_updated'));
    },
    group.auto ? I18n.t('settings_edit_auto_group_title') : I18n.t('settings_edit_group_title'),
    I18n.t('settings_group_name_input_label')
  );
}

// 删除分组
function deleteGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  
  showConfirmModal(
    I18n.t('settings_confirm_delete_title'),
    I18n.t('settings_confirm_delete_group', group.name),
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
      showToast(I18n.t('settings_group_deleted'));
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
    showToast(I18n.t('settings_bookmark_updated'));
  });
}

// 删除书签
function deleteBookmark(link) {
  showConfirmModal(
    I18n.t('settings_confirm_delete_title'),
    I18n.t('settings_confirm_delete_bookmark', link.title),
    () => {
      links = links.filter(l => l.url !== link.url);
      saveData();
      renderLinks();
      showToast(I18n.t('settings_bookmark_deleted'));
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
  const message = customMessage || (isGroupEdit ? '' : '');
  
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      <div class="modal-body">
        ${message ? `<p style="margin-bottom: 1rem; color: var(--text-secondary);">${message}</p>` : ''}
        <div class="modal-field">
          <label>${isGroupEdit ? I18n.t('settings_group_name_label') : I18n.t('settings_title_label')}</label>
          <input type="text" id="modalTitleInput" value="${link.title || ''}" placeholder="${isGroupEdit ? I18n.t('settings_group_name_placeholder') : ''}" />
        </div>
        ${!isGroupEdit ? `
        <div class="modal-field">
          <label>${I18n.t('settings_url_label')}</label>
          <input type="text" id="modalUrlInput" value="${link.url || ''}" />
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">${I18n.t('cancel')}</button>
        <button class="modal-btn modal-btn-primary">${I18n.t('save')}</button>
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
      showToast(I18n.t('modal_input_name_required'));
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
  modal.style.zIndex = '10000'; // 确保在提示词弹窗之上
  modal.innerHTML = `
    <div class="modal-content modal-small">
      <h3>${title}</h3>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">${I18n.t('cancel')}</button>
        <button class="modal-btn modal-btn-danger">${I18n.t('confirm')}</button>
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
    optionsHtml = `<p class="no-groups">${I18n.t('modal_group_selection_no_groups')}</p>`;
  }
  
  modal.innerHTML = `
    <div class="modal-content modal-small">
      <h3>${I18n.t('modal_group_selection_title')}</h3>
      <div class="modal-body group-list">
        ${optionsHtml}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">${I18n.t('cancel')}</button>
        <button class="modal-btn modal-btn-primary" ${groups.length === 0 ? 'disabled' : ''}>${I18n.t('confirm')}</button>
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

  // Chrome 书签导入
  if (chromeBookmarkBtn) {
    chromeBookmarkBtn.addEventListener('click', () => {
      chromeBookmarkFileInput.click();
    });
  }
  if (chromeBookmarkFileInput) {
    chromeBookmarkFileInput.addEventListener('change', handleChromeBookmarksImport);
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
    showToast(I18n.t('data_export_preparing'));
    
    // 收集所有数据
    const exportObj = {
      version: '3.2.9',
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
    
    showToast(I18n.t('data_export_success'));
  } catch (error) {
    console.error('导出数据失败:', error);
    showToast(I18n.t('data_export_failed', error.message));
  }
}

// ── Chrome 书签解析器（Netscape 格式） ─────────────────
/**
 * 解析 Chrome 导出的书签 HTML 文件
 * @param {string} html - 书签 HTML 内容
 * @returns {{ bookmarks: Array<{url:string, title:string, addDate:number, group:string}>, folderNames: Set<string> }}
 */
function parseChromeBookmarks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const bookmarks = [];
  const folderNames = new Set();

  // Chrome 书签文件标准结构: <DL><DT><H3>文件夹名</H3><DL><DT><A HREF="...">书签</A>
  // 递归遍历
  function traverse(dlElement, groupName) {
    if (!dlElement || !dlElement.children) return;

    for (let i = 0; i < dlElement.children.length; i++) {
      const child = dlElement.children[i];
      if (child.tagName !== 'DT') continue;

      const h3 = child.querySelector('h3');
      const link = child.querySelector('a');

      if (h3) {
        // 文件夹节点
        const name = h3.textContent.trim();
        folderNames.add(name);

        // 查找子书签
        const subDl = child.querySelector('dl');
        if (subDl) {
          traverse(subDl, name);
        }
      } else if (link) {
        // 书签节点
        const href = link.getAttribute('href');
        const title = link.textContent.trim();
        const addDate = link.getAttribute('ADD_DATE');

        if (href && title) {
          bookmarks.push({
            url: href,
            title: title,
            addDate: addDate ? parseInt(addDate) * 1000 : Date.now(), // 秒 → 毫秒
            group: groupName || '' // 空串 = 未分组
          });
        }
      }
    }
  }

  // 从根 DL 开始遍历
  const rootDl = doc.querySelector('dl');
  if (rootDl) {
    traverse(rootDl, '');
  }

  return { bookmarks, folderNames };
}

// ── 从 Chrome 书签文件导入 ─────────────────────────────

async function handleChromeBookmarksImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 重置 input 以便重新选择同一个文件
  event.target.value = '';

  try {
    showToast(I18n.t('data_import_chrome_reading'));

    const html = await file.text();
    const { bookmarks: importedBookmarks, folderNames } = parseChromeBookmarks(html);

    if (importedBookmarks.length === 0) {
      showToast(I18n.t('data_import_chrome_empty'));
      return;
    }

    // 计算统计信息
    const existingUrls = new Set(links.map(l => l.url));
    const newBookmarks = importedBookmarks.filter(b => !existingUrls.has(b.url));
    const skippedCount = importedBookmarks.length - newBookmarks.length;

    // 确认弹窗（多语言）
    let confirmMsg = I18n.t('data_import_chrome_found',
      String(importedBookmarks.length), String(folderNames.size));
    if (skippedCount > 0) {
      confirmMsg += '\n' + I18n.t('data_import_chrome_skipped', String(skippedCount));
    }
    confirmMsg += '\n' + I18n.t('data_import_chrome_appending', String(newBookmarks.length));
    confirmMsg += '\n\n' + I18n.t('data_import_chrome_continue');

    showConfirmModal(I18n.t('data_import_chrome_confirm_title'), confirmMsg, async () => {
      try {
        showToast(I18n.t('data_import_chrome_importing'));

        // 1. 创建/查找分组
        const groupMap = {}; // { folderName: groupId }
        for (const g of groups) {
          groupMap[g.name] = g.id;
        }

        const newGroups = [];
        for (const name of folderNames) {
          if (!groupMap[name] && name) {
            const newGroup = {
              id: 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: name,
              createdAt: Date.now()
            };
            groupMap[name] = newGroup.id;
            newGroups.push(newGroup);
          }
        }

        // 2. 创建新书签
        for (const b of newBookmarks) {
          let domain = '';
          try { domain = new URL(b.url).hostname; } catch(e) {}

          const newLink = {
            url: b.url,
            title: b.title,
            icon: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : 'default-icon.png',
            createdAt: b.addDate,
            groups: b.group && groupMap[b.group] ? [groupMap[b.group]] : [],
            pinned: false,
            clickCount: 0,
            lastAccessed: null
          };
          links.unshift(newLink);
        }

        // 3. 合并分组
        groups = [...groups, ...newGroups];

        // 4. 保存
        chrome.storage.local.set({ links, groups }, () => {
          if (chrome.runtime.lastError) {
            showToast(I18n.t('data_import_chrome_save_failed', chrome.runtime.lastError.message));
            return;
          }

          showToast(I18n.t('data_import_chrome_success',
            String(newBookmarks.length), String(newGroups.length)));
          updateDataStats();
          renderLinks();
        });
      } catch (err) {
        console.error('导入 Chrome 书签失败:', err);
        showToast(I18n.t('data_import_chrome_save_failed', err.message));
      }
    });
  } catch (err) {
    console.error('解析书签文件失败:', err);
    showToast(I18n.t('data_import_chrome_parse_failed'));
  }
}

// 导入数据
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    showToast(I18n.t('data_import_reading'));
    
    // 读取文件
    const text = await file.text();
    
    // 解密数据
    const decryptedData = await decryptData(text);
    
    // 解析JSON
    const importObj = JSON.parse(decryptedData);
    
    // 验证数据
    if (!importObj.links || !importObj.groups) {
      throw new Error(I18n.t('data_import_invalid'));
    }
    
    // 确认导入
    showConfirmModal(
      I18n.t('modal_confirm_import_title'),
      I18n.t('data_import_overwrite', String(importObj.links.length), String(importObj.groups.length)),
      async () => {
        try {
          showToast(I18n.t('data_import_importing'));
          
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
            showToast(I18n.t('data_import_success'));
            
            // 刷新当前视图
            const activeSection = document.querySelector('.settings-section.active');
            if (activeSection) {
              refreshSectionData(activeSection.id);
            }
          });
        } catch (error) {
          console.error('导入数据失败:', error);
          showToast(I18n.t('data_import_failed', error.message));
        }
      }
    );
  } catch (error) {
    console.error('导入失败:', error);
    showToast(error.message || I18n.t('data_import_corrupt'));
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
      throw new Error(I18n.t('data_encrypt_invalid'));
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
    throw new Error(I18n.t('data_decrypt_failed'));
  }
}

// 默认提示词配置
const DEFAULT_PROMPTS = {
  titleOptimization: `<task>
优化书签标题
</task>

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

<output></output>`,
  
  categorySuggestion: `<task>
智能书签分类
</task>

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

<output></output>`,
  
  generateSummary: `请为以下网页生成一个简洁的内容摘要。

标题：{title}
网址：{url}

要求：
1. 摘要控制在50-100字
2. 突出网页的核心内容和价值
3. 使用中文
4. 只返回摘要内容，不要其他说明

摘要：`,
  
  smartSearch: `你是一个搜索优化助手。请理解用户的搜索意图，并返回更精准的搜索结果。

用户搜索：{query}

要求：
1. 理解搜索的真正意图
2. 提取关键搜索词
3. 返回优化后的搜索关键词
4. 只返回搜索关键词，用空格分隔

优化后的搜索：`
};

/**
 * 获取 AI 设置
 */
async function getAISettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiSettings'], (result) => {
      resolve(result.aiSettings || {});
    });
  });
}

// ========== 外观与主题设置 ==========
function setupAppearance() {
  // 加载当前设置
  loadAppearanceSettings();
  
  // 语言选项点击
  const langOptions = document.querySelectorAll('#languageOptions .appearance-option');
  langOptions.forEach(btn => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value;
      // 高亮选中项
      langOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 保存并刷新
      await I18n.setLanguage(value);
    });
  });
  
  // 主题选项点击
  const themeOptions = document.querySelectorAll('#themeOptions .appearance-option');
  themeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      // 高亮选中项
      themeOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 立即应用
      applyTheme(value);
      // 保存
      chrome.storage.local.set({ themeMode: value });
    });
  });
}

function loadAppearanceSettings() {
  // 语言偏好
  I18n.getLanguagePreference().then(langPref => {
    const langValue = langPref === 'auto' ? 'auto' : langPref;
    const langBtn = document.querySelector(`#languageOptions .appearance-option[data-value="${langValue}"]`);
    if (langBtn) {
      document.querySelectorAll('#languageOptions .appearance-option').forEach(b => b.classList.remove('active'));
      langBtn.classList.add('active');
    }
  });
  
  // 主题偏好
  chrome.storage.local.get(['themeMode', 'darkMode'], (result) => {
    const themeMode = result.themeMode || 'auto';
    // 兼容旧的 darkMode 布尔值
    if (!result.themeMode && result.darkMode === true) {
      // 旧设置：darkMode=true → dark
      const darkBtn = document.querySelector('#themeOptions .appearance-option[data-value="dark"]');
      if (darkBtn) {
        document.querySelectorAll('#themeOptions .appearance-option').forEach(b => b.classList.remove('active'));
        darkBtn.classList.add('active');
      }
      return;
    }
    const themeBtn = document.querySelector(`#themeOptions .appearance-option[data-value="${themeMode}"]`);
    if (themeBtn) {
      document.querySelectorAll('#themeOptions .appearance-option').forEach(b => b.classList.remove('active'));
      themeBtn.classList.add('active');
    }
  });
}

function applyTheme(mode) {
  const root = document.documentElement;
  
  if (mode === 'dark') {
    root.classList.add('dark');
    chrome.storage.local.set({ darkMode: true, themeMode: 'dark' });
  } else if (mode === 'light') {
    root.classList.remove('dark');
    chrome.storage.local.set({ darkMode: false, themeMode: 'light' });
  } else {
    // auto: 跟随系统
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    chrome.storage.local.set({ darkMode: undefined, themeMode: 'auto' });
  }
}

// ========== AI 助手功能 ==========

/**
 * 动态生成 AI 供应商下拉选项
 */
function initAIProviderSelect() {
  if (!aiProvider) return;
  
  const providers = [
    { value: 'lmstudio', key: 'ai_provider_lmstudio' },
    { value: 'openai', key: 'ai_provider_openai' },
    { value: 'anthropic', key: 'ai_provider_anthropic' },
    { value: 'aliyun', key: 'ai_provider_aliyun' },
    { value: 'zhipu', key: 'ai_provider_zhipu' },
    { value: 'baidu', key: 'ai_provider_baidu' },
    { value: 'tencent', key: 'ai_provider_tencent' },
    { value: 'moonshot', key: 'ai_provider_moonshot' },
    { value: 'google', key: 'ai_provider_google' },
    { value: 'custom', key: 'ai_provider_custom' }
  ];
  
  aiProvider.innerHTML = '';
  providers.forEach(p => {
    const option = document.createElement('option');
    option.value = p.value;
    option.textContent = I18n.t(p.key);
    aiProvider.appendChild(option);
  });
}

/**
 * 设置 AI 助手
 */
function setupAISettings() {
  // 加载 AI 设置
  loadAISettings();
  
  // 动态生成 AI 供应商下拉选项
  initAIProviderSelect();
  
  // 测试连接按钮
  if (aiTestBtn) {
    aiTestBtn.addEventListener('click', testAIConnection);
  }
  
  // 保存设置按钮
  if (aiSaveBtn) {
    aiSaveBtn.addEventListener('click', saveAISettings);
  }
  
  // API 配置输入框变化时，禁用保存按钮（需要重新测试）
  [aiApiUrl, aiApiKey, aiModel].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        isApiConfigValidated = false;
        updateSaveButtonState(false);
      });
    }
  });
  
  // 供应商切换时，禁用保存按钮（需要重新测试）
  if (aiProvider) {
    aiProvider.addEventListener('change', () => {
      isApiConfigValidated = false;
      updateSaveButtonState(false);
      onProviderChange();
    });
  }
  
  // 获取模型列表按钮
  if (aiFetchModelsBtn) {
    aiFetchModelsBtn.addEventListener('click', fetchModelsList);
  }
  
  // 提示词编辑按钮事件绑定
  document.querySelectorAll('.ai-edit-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); // 阻止默认行为
      e.stopPropagation(); // 阻止事件冒泡到 label
      const promptKey = e.currentTarget.dataset.prompt;
      openPromptEditor(promptKey);
    });
  });
  
  // 弹窗关闭按钮
  if (closePromptModal) {
    closePromptModal.addEventListener('click', closePromptEditor);
  }
  
  // 取消按钮
  if (cancelPromptBtn) {
    cancelPromptBtn.addEventListener('click', closePromptEditor);
  }
  
  // 保存按钮
  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', saveCurrentPrompt);
  }
  
  // 恢复默认按钮
  if (resetPromptBtn) {
    resetPromptBtn.addEventListener('click', resetToDefaultPrompt);
  }
  
  // 点击遮罩层关闭
  if (promptModal) {
    promptModal.addEventListener('click', (e) => {
      if (e.target === promptModal) {
        closePromptEditor();
      }
    });
  }
  
  // ESC 键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && promptModal && promptModal.classList.contains('show')) {
      closePromptEditor();
    }
  });
  
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
  
  // AI 功能开关变化时自动保存（只保存功能设置，不影响 API 配置）
  const featureCheckboxes = [
    aiTitleOptimizationAuto,
    aiTitleOptimizationManual,
    aiCategorySuggestionAuto,
    aiCategorySuggestionManual,
    aiGenerateSummary,
    aiSmartSearch
  ].filter(Boolean);
  
  featureCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // 延迟保存，确保 UI 更新完成
      setTimeout(() => {
        saveAIFeaturesOnly();  // 只保存功能开关，不保存 API 配置
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
      lmstudio: I18n.t('ai_provider_lmstudio'),
      openai: I18n.t('ai_provider_openai'),
      anthropic: I18n.t('ai_provider_anthropic'),
      aliyun: I18n.t('ai_provider_aliyun'),
      zhipu: I18n.t('ai_provider_zhipu'),
      baidu: I18n.t('ai_provider_baidu'),
      tencent: I18n.t('ai_provider_tencent'),
      moonshot: I18n.t('ai_provider_moonshot'),
      google: I18n.t('ai_provider_google'),
      custom: I18n.t('ai_provider_custom')
    };
    
    const name = providerNames[provider] || provider;
    const model = providerConfig.model || I18n.t('not_selected');
    summaryEl.textContent = `${name} - ${model}`;
    summaryEl.classList.add('configured');
  } else {
    // 未配置
    summaryEl.textContent = I18n.t('not_configured');
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
    if (settings.features) {
      // 加载新格式数据
      if (aiTitleOptimizationAuto) 
        aiTitleOptimizationAuto.checked = settings.features.titleOptimization?.auto || false;
      if (aiTitleOptimizationManual) 
        aiTitleOptimizationManual.checked = settings.features.titleOptimization?.manual || false;
      if (aiCategorySuggestionAuto) 
        aiCategorySuggestionAuto.checked = settings.features.categorySuggestion?.auto || false;
      if (aiCategorySuggestionManual) 
        aiCategorySuggestionManual.checked = settings.features.categorySuggestion?.manual || false;
      if (aiGenerateSummary) 
        aiGenerateSummary.checked = settings.features.generateSummary || false;
      if (aiSmartSearch) 
        aiSmartSearch.checked = settings.features.smartSearch || false;
    }
    
    // 更新配置摘要
    updateAIConfigSummary(settings.provider, providerConfig);
    
    // 初始化保存按钮状态：默认禁用，需要测试通过后才能保存
    isApiConfigValidated = false;
    updateSaveButtonState(false);
    
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

/**
 * 打开提示词编辑器
 */
function openPromptEditor(promptKey) {
  currentPromptKey = promptKey;
  
  // 获取功能名称
      const functionNames = {
    titleOptimization: I18n.t('ai_func_titleOptimization'),
    categorySuggestion: I18n.t('ai_func_categorySuggestion'),
    generateSummary: I18n.t('ai_func_generateSummary'),
    smartSearch: I18n.t('ai_func_smartSearch')
  };

  if (promptFunctionName) {
    promptFunctionName.textContent = I18n.t('ai_prompt_function', functionNames[promptKey] || promptKey);
  }
  
  // 加载当前提示词（优先使用自定义，否则使用默认）
  loadPromptContent(promptKey);
  
  // 显示弹窗
  if (promptModal) {
    promptModal.classList.add('show');
  }
}

/**
 * 关闭提示词编辑器
 */
function closePromptEditor() {
  if (promptModal) {
    promptModal.classList.remove('show');
  }
  currentPromptKey = null;
}

/**
 * 加载提示词内容
 */
function loadPromptContent(promptKey) {
  if (!promptTextarea || !promptKey) return;
  
  // 获取当前 AI 设置
  const aiSettings = window.currentAISettings || {};
  const customPrompts = aiSettings.prompts || {};
  
  // 优先使用自定义提示词，否则使用默认
  const currentPrompt = customPrompts[promptKey] || DEFAULT_PROMPTS[promptKey] || '';
  
  promptTextarea.value = currentPrompt;
}

/**
 * 保存当前提示词
 */
async function saveCurrentPrompt() {
  if (!currentPromptKey || !promptTextarea) return;
  
  const newPrompt = promptTextarea.value.trim();
  
  if (!newPrompt) {
    showToast(I18n.t('ai_prompt_save_empty'));
    return;
  }
  
  try {
    // 获取当前 AI 设置
    const aiSettings = await getAISettings();
    
    // 确保 prompts 对象存在
    if (!aiSettings.prompts) {
      aiSettings.prompts = {};
    }
    
    // 保存自定义提示词
    aiSettings.prompts[currentPromptKey] = newPrompt;
    
    // 保存到 storage
    await chrome.storage.local.set({ aiSettings });
    
    // 更新全局缓存
    window.currentAISettings = aiSettings;
    
    showToast(I18n.t('ai_prompt_save_done'));
    closePromptEditor();
  } catch (error) {
    console.error('保存提示词失败:', error);
    showToast(I18n.t('ai_prompt_save_failed', error.message));
  }
}

/**
 * 恢复默认提示词
 */
async function resetToDefaultPrompt() {
  if (!currentPromptKey) return;
  
  showConfirmModal(
    I18n.t('ai_prompt_reset'),
    I18n.t('ai_prompt_reset_confirm'),
    async () => {
      try {
        // 获取当前 AI 设置
        const aiSettings = await getAISettings();
        
        // 删除自定义提示词
        if (aiSettings.prompts && aiSettings.prompts[currentPromptKey]) {
          delete aiSettings.prompts[currentPromptKey];
          
          // 保存到 storage
          await chrome.storage.local.set({ aiSettings });
          
          // 更新全局缓存
          window.currentAISettings = aiSettings;
        }
        
        // 重新加载默认提示词
        loadPromptContent(currentPromptKey);
        
        showToast(I18n.t('ai_prompt_reset_done'));
      } catch (error) {
        console.error('恢复默认提示词失败:', error);
        showToast(I18n.t('ai_prompt_reset_failed', error.message));
      }
    }
  );
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
      titleOptimization: {
        auto: aiTitleOptimizationAuto?.checked || false,
        manual: aiTitleOptimizationManual?.checked || false
      },
      categorySuggestion: {
        auto: aiCategorySuggestionAuto?.checked || false,
        manual: aiCategorySuggestionManual?.checked || false
      },
      generateSummary: aiGenerateSummary?.checked || false,
      smartSearch: aiSmartSearch?.checked || false
    }
  };
  
  // 如果有 API 配置，检查是否通过测试验证
  if (settings.config.apiUrl && !isApiConfigValidated) {
    showAISstatus('error', I18n.t('ai_need_test_first'));
    return;
  }
  
  // 如果没有 API 地址，只保存功能开关
  if (!settings.config.apiUrl) {
    // 只保存功能开关，不保存供应商配置
    chrome.storage.local.get(['aiSettings'], (result) => {
      const existingSettings = result.aiSettings || {};
      existingSettings.features = settings.features;
      
      chrome.storage.local.set({ aiSettings: existingSettings }, () => {
        if (chrome.runtime.lastError) {
          showAISstatus('error', I18n.t('ai_save_failed', chrome.runtime.lastError.message));
          return;
        }
        showAISstatus('success', I18n.t('ai_save_success_features'));
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
        showAISstatus('error', I18n.t('ai_save_failed', chrome.runtime.lastError.message));
        return;
      }
      
      showAISstatus('success', I18n.t('ai_save_success'));
      
      // 实时更新 API 配置摘要
      updateAIConfigSummary(currentProvider, providerConfigs[currentProvider]);
      
      // 3秒后隐藏状态
      setTimeout(() => {
        if (aiStatus) aiStatus.style.display = 'none';
      }, 3000);
    });
  });
}

/**
 * 只保存 AI 功能设置（不影响 API 配置）
 */
function saveAIFeaturesOnly() {
  const settings = {
    features: {
      titleOptimization: {
        auto: aiTitleOptimizationAuto?.checked || false,
        manual: aiTitleOptimizationManual?.checked || false
      },
      categorySuggestion: {
        auto: aiCategorySuggestionAuto?.checked || false,
        manual: aiCategorySuggestionManual?.checked || false
      },
      generateSummary: aiGenerateSummary?.checked || false,
      smartSearch: aiSmartSearch?.checked || false
    }
  };
  
  // 只更新功能设置，不触碰 API 配置
  chrome.storage.local.get(['aiSettings'], (result) => {
    const existingSettings = result.aiSettings || {};
    existingSettings.features = settings.features;
    
    chrome.storage.local.set({ aiSettings: existingSettings }, () => {
      if (chrome.runtime.lastError) {
        showAISstatus('error', I18n.t('ai_save_failed', chrome.runtime.lastError.message));
        return;
      }
      
      showAISstatus('success', I18n.t('ai_save_success_features'));
      
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
    showAISstatus('error', I18n.t('ai_need_url'));
    updateSaveButtonState(false);
    return;
  }
  
  // API Key 不强制要求，让测试接口自己验证
  showAISstatus('loading', I18n.t('ai_testing'));
  
  // 测试按钮显示 loading 状态
  const originalText = aiTestBtn.innerHTML;
  aiTestBtn.disabled = true;
  aiTestBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span>' + I18n.t('ai_testing') + '</span>';
  
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
      // 测试成功，显示保存按钮
      isApiConfigValidated = true;
      updateSaveButtonState(true);
    } else {
      showAISstatus('error', result.message);
      // 测试失败，隐藏保存按钮
      isApiConfigValidated = false;
      updateSaveButtonState(false);
    }
  } catch (error) {
    showAISstatus('error', I18n.t('ai_test_failed', error.message));
    // 测试失败，隐藏保存按钮
    isApiConfigValidated = false;
    updateSaveButtonState(false);
  } finally {
    // 恢复测试按钮状态
    aiTestBtn.disabled = false;
    aiTestBtn.innerHTML = originalText;
  }
}

/**
 * 更新保存按钮状态
 * @param {boolean} isValidated - 是否通过测试验证
 */
function updateSaveButtonState(isValidated) {
  if (!aiSaveBtn) return;
  
  if (isValidated) {
    // 测试通过：显示按钮（带动画）
    aiSaveBtn.classList.add('show');
    aiSaveBtn.title = '保存 AI 配置';
  } else {
    // 未测试或测试失败：隐藏按钮
    aiSaveBtn.classList.remove('show');
    aiSaveBtn.title = '';
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
    showAISstatus('error', I18n.t('ai_need_url'));
    return;
  }
  
  showAISstatus('loading', I18n.t('ai_testing_models'));
  
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
      
      showAISstatus('success', I18n.t('ai_model_count', String(models.length)));
      
      // 显示 Toast 通知
      if (typeof showToast === 'function') {
        showToast(I18n.t('ai_model_count', String(models.length)));
      }
    } else {
      showAISstatus('error', I18n.t('ai_model_none'));
    }
  } catch (error) {
    showAISstatus('error', I18n.t('ai_model_fetch_failed', error.message));
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
      titleOptimization: {
        auto: false,
        manual: true  // 默认开启手动优化
      },
      categorySuggestion: {
        auto: false,
        manual: true  // 默认开启手动分组
      },
      generateSummary: false,
      smartSearch: false
    }
  };
}
