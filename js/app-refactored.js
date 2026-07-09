/**
 * 书签白板 - 主逻辑文件（重构版）
 * 模块化架构，清晰的职责分离
 * 
 * 注意：模块实例已在各自文件中导出为全局变量
 * - modalManager, toastManager, dataManager
 * - uiRenderer, bookmarkOps, groupManager, aiIntegration
 */

// ========== DOM 元素 ==========
const board = document.getElementById('board');
const emptyState = document.getElementById('emptyState');
const emptyStatePinned = document.getElementById('emptyStatePinned');
const emptyStateRecent = document.getElementById('emptyStateRecent');
const searchInput = document.getElementById('search');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const mobileSearch = document.getElementById('mobileSearch');
const themeToggle = document.getElementById('themeToggle');
const hideTipBtn = document.getElementById('hideTip');
const tipBar = document.getElementById('tipBar');
const footer = document.getElementById('footer');
const addManualBtn = document.getElementById('addManualBtn');

// ========== 状态管理 ==========
let filterText = '';
let activeGroupFilter = 'all';
let sortBy = 'createdAt-desc';
let currentView = 'all';

// ========== 初始化 ==========
loadTheme();

window.addEventListener('load', async () => {
  document.body.classList.add('loaded');
  // 先初始化 i18n（检查语言覆盖），再绑定 DOM
  if (window.I18n) {
    await I18n.init();
    I18n.bindDOM();
  }
  // 生成排序选项下拉框
  initSortSelect();
  loadData();
});

setupEventListeners();

// ========== 排序下拉框初始化 ==========
function initSortSelect() {
  const sortSelect = document.getElementById('sortSelect');
  if (!sortSelect) return;

  const sortOptions = [
    { value: 'createdAt-desc',  key: 'sort_created_desc' },
    { value: 'createdAt-asc',   key: 'sort_created_asc' },
    { value: 'title-asc',       key: 'sort_title_asc' },
    { value: 'title-desc',      key: 'sort_title_desc' },
    { value: 'clickCount-desc', key: 'sort_clicks_desc' },
  ];

  sortSelect.innerHTML = '';
  sortOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = I18n.t(opt.key);
    sortSelect.appendChild(option);
  });
}

// ========== 主题管理 ==========
function loadTheme() {
  chrome.storage.local.get(['themeMode', 'darkMode'], (result) => {
    let isDark = false;
    const themeMode = result.themeMode || 'auto';
    
    if (themeMode === 'dark') {
      isDark = true;
    } else if (themeMode === 'light') {
      isDark = false;
    } else {
      // auto: 跟随系统 或 兼容旧的 darkMode 布尔值
      isDark = (result.darkMode === true) || 
        (result.darkMode === undefined && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      updateThemeIcon(true);
    }
  });
}

function updateThemeIcon(isDark) {
  const moonIcon = themeToggle.querySelector('.fa-moon-o');
  const sunIcon = themeToggle.querySelector('.fa-sun-o');
  
  if (isDark) {
    moonIcon.style.display = 'none';
    sunIcon.style.display = '';
  } else {
    moonIcon.style.display = '';
    sunIcon.style.display = 'none';
  }
}

// ========== 数据加载 ==========
function loadData() {
  if (dataManager.links.length > 0 && emptyState) {
    emptyState.innerHTML = '<i class="fa fa-spinner fa-spin"></i><p>' + I18n.t('loading') + '</p>';
  }
  
  // 恢复提示栏状态
  chrome.storage.local.get(['tipHidden'], (result) => {
    if (result.tipHidden === true) {
      tipBar.style.display = 'none';
    }
  });
  
  dataManager.loadData(() => {
    // 一次性读取所有用户偏好，避免多次渲染造成抖动
    chrome.storage.local.get(['viewPreference', 'groupFilter', 'sortPreference'], (result) => {
      // 1. 视图偏好
      if (result.viewPreference) {
        currentView = result.viewPreference;
      } else {
        const hasPinned = dataManager.links.some(link => link.pinned);
        currentView = hasPinned ? 'pinned' : 'all';
      }

      // 2. 分组筛选偏好
      if (result.groupFilter) {
        activeGroupFilter = result.groupFilter;
      }

      // 3. 排序偏好
      if (result.sortPreference) {
        sortBy = result.sortPreference;
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = sortBy;
      }

      // 一次性渲染（无抖动！）
      setActiveViewTab();
      renderGroups();
      renderLinks();
    });
  });
}

/**
 * 设置当前视图对应的高亮 tab
 */
function setActiveViewTab() {
  const viewTabs = document.querySelectorAll('.view-tab');
  viewTabs.forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.view-tab[data-view="${currentView}"]`);
  if (activeTab) activeTab.classList.add('active');
}

// ========== 事件监听 ==========
function setupEventListeners() {
  // 拖拽事件
  board.addEventListener('dragover', (e) => {
    e.preventDefault();
    board.style.outline = '2px dashed var(--primary)';
    board.style.outlineOffset = '-2px';
  });

  board.addEventListener('dragleave', () => {
    board.style.outline = '';
    board.style.outlineOffset = '';
  });

  board.addEventListener('drop', (e) => {
    e.preventDefault();
    board.style.outline = '';
    board.style.outlineOffset = '';

    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    
    if (url && /^https?:\/\//.test(url)) {
      const cleanUrl = url.trim().split('\n')[0];
      
      chrome.tabs.query({ url: cleanUrl }, (tabs) => {
        let title = null;
        if (tabs && tabs.length > 0) {
          title = tabs[0].title;
        }
        addLinkFromUrl(cleanUrl, title);
      });
    }
  });

  // 搜索事件
  searchInput.addEventListener('input', (e) => {
    filterText = e.target.value.toLowerCase();
    renderLinks();
  });

  mobileSearchInput.addEventListener('input', (e) => {
    filterText = e.target.value.toLowerCase();
    renderLinks();
  });
  
  // 排序事件
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      chrome.storage.local.set({ sortPreference: sortBy });
      renderLinks();
    });
  }

  // 移动端搜索按钮
  mobileSearchBtn.addEventListener('click', () => {
    mobileSearch.classList.toggle('show');
    if (mobileSearch.classList.contains('show')) {
      mobileSearchInput.focus();
    }
  });

  // 主题切换
  themeToggle.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark');
    const mode = isDark ? 'dark' : 'light';
    chrome.storage.local.set({ darkMode: isDark, themeMode: mode });
    updateThemeIcon(isDark);
  });

  // 隐藏提示栏
  hideTipBtn.addEventListener('click', () => {
    tipBar.style.display = 'none';
    chrome.storage.local.set({ tipHidden: true });
  });

  // 监听 storage 变化
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.links) {
      loadData();
    }
  });

  // 监听系统主题变化（仅在 auto 模式下生效）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.storage.local.get(['themeMode'], (result) => {
      // 只有在 auto 模式或未设置时才跟随系统
      if (!result.themeMode || result.themeMode === 'auto') {
        const isDark = e.matches;
        document.documentElement.classList.toggle('dark', isDark);
        updateThemeIcon(isDark);
        chrome.storage.local.set({ darkMode: isDark });
      }
    });
  });

  // 监听消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showToast') {
      toastManager.show(message.message);
      loadData();
    }
    
    if (message.action === 'refreshData') {
      loadData();
    }
  });

  // 手动添加
  addManualBtn.addEventListener('click', () => {
    modalManager.show({
      title: I18n.t('modal_add_bookmark_title'),
      message: I18n.t('modal_add_bookmark_message'),
      input: true,
      defaultValue: I18n.t('modal_default_url'),
      onConfirm: (url) => {
        if (url && /^https?:\/\//.test(url)) {
          addLinkFromUrl(url);
        } else {
          toastManager.show(I18n.t('modal_input_valid_url'));
        }
      }
    });
  });
  
  // 空状态导入按钮
  const importEmptyBtn = document.getElementById('importEmptyBtn');
  const importEmptyFileInput = document.getElementById('importEmptyFileInput');
  
  if (importEmptyBtn && importEmptyFileInput) {
    importEmptyBtn.addEventListener('click', () => {
      importEmptyFileInput.click();
    });
    
    importEmptyFileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      await bookmarkOps.importData(file, () => {
        loadData();
      });
      
      event.target.value = '';
    });
  }

  // 分组筛选事件委托
  const groupsContainer = document.querySelector('.groups-container');
  if (groupsContainer) {
    groupsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.group-tab');
      if (tab) {
        activeGroupFilter = tab.dataset.group;
        chrome.storage.local.set({ groupFilter: activeGroupFilter });

        // 在置顶/最近视图时点击分组 → 自动切到「所有书签」
        if (currentView !== 'all') {
          currentView = 'all';
          chrome.storage.local.set({ viewPreference: currentView });
          setActiveViewTab();
        }

        renderGroups();
        renderLinks();
      }
      
      // 检查是否点击了添加按钮
      if (e.target.closest('#addGroupBtn') || e.target.closest('.add-group-btn')) {
        groupManager.createGroup(() => {
          renderGroups();
        });
      }
    });
  }
  
  // Tab 切换事件
  const viewTabs = document.querySelectorAll('.view-tab');
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.dataset.view;
      // 持久化用户选择
      chrome.storage.local.set({ viewPreference: currentView });
      renderSections();
    });
  });
}

// ========== 数据操作 ==========
async function addLinkFromUrl(url, draggedTitle = null) {
  await bookmarkOps.addLinkFromUrl(url, draggedTitle, () => {
    renderLinks();
  });
}

// ========== UI 渲染 ==========
function getFilteredLinks() {
  let filtered = dataManager.links;
  
  // 按分组筛选
  if (activeGroupFilter !== 'all') {
    if (activeGroupFilter.startsWith('auto_')) {
      const domain = activeGroupFilter.replace('auto_', '');
      filtered = filtered.filter(link => dataManager.getLinkDomain(link) === domain);
    } else {
      filtered = filtered.filter(link => link.groups && link.groups.includes(activeGroupFilter));
    }
  }
  
  // 智能搜索
  if (filterText) {
    const searchTerms = filterText.toLowerCase().split(' ').filter(t => t.trim());
    
    filtered = filtered.filter(link => {
      return searchTerms.every(term => {
        // #标签搜索
        if (term.startsWith('#')) {
          const tagName = term.substring(1);
          return link.tags && link.tags.some(tag => 
            tag.toLowerCase().includes(tagName)
          );
        }
        
        // @域名搜索
        if (term.startsWith('@')) {
          const domainPart = term.substring(1);
          return dataManager.getLinkDomain(link).includes(domainPart);
        }
        
        // !分组搜索（兼容中英文）
        if (term.startsWith('!') || term.startsWith('\uff01')) {
          const groupName = term.substring(1);
          return link.groups && link.groups.some(groupId => {
            const group = dataManager.groups.find(g => g.id === groupId);
            return group && group.name.toLowerCase().includes(groupName);
          });
        }
        
        // 默认搜索
        const domain = dataManager.getLinkDomain(link);
        return link.title.toLowerCase().includes(term) || 
               link.url.toLowerCase().includes(term) ||
               (domain && domain.includes(term));
      });
    });
  }
  
  // 排序
  filtered = [...filtered].sort((a, b) => {
    const [field, order] = sortBy.split('-');
    
    if (field === 'createdAt') {
      return order === 'desc' 
        ? (b.createdAt || 0) - (a.createdAt || 0)
        : (a.createdAt || 0) - (b.createdAt || 0);
    } else if (field === 'title') {
      const comparison = (a.title || '').localeCompare(b.title || '', 'zh-CN');
      return order === 'desc' ? -comparison : comparison;
    } else if (field === 'clickCount') {
      return order === 'desc'
        ? (b.clickCount || 0) - (a.clickCount || 0)
        : (a.clickCount || 0) - (b.clickCount || 0);
    }
    
    return 0;
  });
  
  return filtered;
}

function renderGroups() {
  uiRenderer.renderGroups(
    '.groups-container',
    activeGroupFilter,
    null, // 点击事件已通过事件委托处理
    (group, x, y) => {
      groupManager.showGroupContextMenu(group, x, y, () => {
        renderGroups();
        renderLinks();
      });
    }
  );
}

function renderSections() {
  const filteredLinks = getFilteredLinks();
  
  uiRenderer.renderBookmarkCards(
    board,
    filteredLinks,
    {
      onCardClick: (link) => {
        // 记录点击统计
        link.clickCount = (link.clickCount || 0) + 1;
        link.lastAccessed = Date.now();
        dataManager.save();
        
        window.open(link.url, '_blank');
      },
      onCardContextMenu: (link, x, y) => {
        groupManager.showBookmarkContextMenu(
          link, 
          x, 
          y, 
          () => renderLinks(),
          (link) => aiIntegration.aiOptimizeBookmark(link, () => renderLinks()),
          bookmarkOps  // 传入 bookmarkOps 实例
        );
      },
      emptyStateElement: emptyState,
      emptyStatePinnedElement: emptyStatePinned,
      emptyStateRecentElement: emptyStateRecent,
      currentView: currentView
    }
  );
  
  // 添加"手动添加"卡片
  if (filteredLinks.length > 0 && !filterText && activeGroupFilter === 'all') {
    uiRenderer.addAddCard(board, () => {
      addManualBtn.click();
    });
  }
}

function renderLinks() {
  renderSections();
}
