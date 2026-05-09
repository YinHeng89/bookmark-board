/**
 * 书签白板 - 主逻辑文件
 * 重构版本：使用原生 CSS + 语义化类名
 */

// ========== DOM 元素 ==========
const board = document.getElementById('board');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const mobileSearch = document.getElementById('mobileSearch');
const themeToggle = document.getElementById('themeToggle');
const hideTipBtn = document.getElementById('hideTip');
const tipBar = document.getElementById('tipBar');
const footer = document.getElementById('footer');
const addManualBtn = document.getElementById('addManualBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalInput = document.getElementById('modalInput');
const modalCancel = document.getElementById('modalCancel');
const modalOk = document.getElementById('modalOk');

// ========== 状态管理 ==========
let links = [];
let groups = [];  // 分组数据
let filterText = '';
let activeGroupFilter = 'all';  // 当前选中的分组
let sortBy = 'createdAt-desc';  // 排序方式：createdAt-desc, createdAt-asc, title-asc, title-desc, clickCount-desc
let currentView = 'all';  // 当前视图：all, pinned, recent
let domainCache = new Map();  // 域名缓存，优化性能
let autoGroupNames = {};  // 自动分组的自定义名称 {domain: customName}

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

// ========== 初始化 ==========
// 先加载主题（快速）
loadTheme();

// 防止 FOUC：CSS 加载完成后显示页面
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  // CSS 加载后再加载数据，避免阻塞渲染
  loadData();
});

setupEventListeners();

function loadTheme() {
  // 快速加载主题设置，避免闪烁
  chrome.storage.local.get(['darkMode'], (result) => {
    if (result.darkMode === true || 
        (result.darkMode === undefined && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      updateThemeIcon(true);
    }
  });
}

function loadData() {
  // 显示加载状态（仅在已存在数据时显示，避免覆盖初始空状态）
  if (links.length > 0 && emptyState) {
    emptyState.innerHTML = '<i class="fa fa-spinner fa-spin"></i><p>加载中...</p>';
  }
  
  chrome.storage.local.get(['links', 'groups', 'tipHidden', 'autoGroupNames'], (result) => {

    // 恢复提示栏状态
    if (result.tipHidden === true) {
      tipBar.style.display = 'none';
    }

    // 加载书签数据
    links = (result.links || []).map(link => ({
      ...link,
      groups: link.groups || [],  // 兼容旧数据
      pinned: link.pinned || false,  // 置顶标记
      clickCount: link.clickCount || 0,  // 点击次数
      lastAccessed: link.lastAccessed || null  // 最后访问时间
    }));
    
    // 加载分组数据
    groups = result.groups || [];
    
    // 加载自动分组的自定义名称
    autoGroupNames = result.autoGroupNames || {};
    
    renderGroups();  // 渲染分组
    renderLinks();   // 渲染书签
  });
}

function setupEventListeners() {
  // 拖拽事件
  board.addEventListener('dragover', (e) => {
    e.preventDefault();
    board.style.outline = '2px dashed var(--primary)';
    board.style.outlineOffset = '-2px';
  });

  // 监听 storage 变化，自动刷新（侧边栏添加/编辑/删除时）
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.links) {
      loadData();
    }
  });

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const savedTheme = localStorage.getItem('darkMode');
    // 只有当用户没有手动设置过主题时，才跟随系统
    if (savedTheme === null) {
      const isDark = e.matches;
      document.documentElement.classList.toggle('dark', isDark);
      updateThemeIcon(isDark);
      chrome.storage.local.set({ darkMode: isDark });
    }
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
      // 清理 URL
      const cleanUrl = url.trim().split('\n')[0];
      
      // 查询当前标签页，尝试获取标题
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
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    chrome.storage.local.set({ darkMode: isDark });
    updateThemeIcon(isDark);
  });

  // 隐藏提示栏
  hideTipBtn.addEventListener('click', () => {
    tipBar.style.display = 'none';
    chrome.storage.local.set({ tipHidden: true });
  });

  // 手动添加
  addManualBtn.addEventListener('click', () => {
    showModal({
      title: '添加书签',
      message: '请输入网址：',
      input: true,
      defaultValue: 'https://',
      onConfirm: (url) => {
        if (url && /^https?:\/\//.test(url)) {
          addLinkFromUrl(url);
        } else {
          showToast('请输入有效的网址');
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
      
      try {
        showToast('正在读取文件...');
        
        // 读取文件
        const text = await file.text();
        
        // 解密数据
        const decryptedData = await decryptImportData(text);
        
        // 解析JSON
        const importObj = JSON.parse(decryptedData);
        
        // 验证数据
        if (!importObj.links || !importObj.groups) {
          throw new Error('数据格式不正确');
        }
        
        // 确认导入
        showModal({
          title: '确认导入',
          message: `导入将覆盖当前所有数据！\n书签: ${importObj.links.length} 个\n分组: ${importObj.groups.length} 个\n\n确定要继续吗？`,
          onConfirm: async () => {
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
                renderLinks();
              });
            } catch (error) {
              console.error('导入数据失败:', error);
              showToast('导入数据失败: ' + error.message);
            }
          }
        });
      } catch (error) {
        console.error('导入失败:', error);
        showToast('导入失败: ' + (error.message || '文件格式错误或数据已损坏'));
      }
      
      // 清空input
      event.target.value = '';
    });
  }

  // 模态框
  modalCancel.addEventListener('click', closeModal);
  // 移除点击空白关闭的功能
  // modal.addEventListener('click', (e) => {
  //   if (e.target === modal) closeModal();
  // });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  
  // 监听来自后台脚本的消息（右键菜单添加书签）
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showToast') {
      showToast(message.message);
      // 刷新书签列表
      loadData();
    }
  });
  
  // 分组筛选事件委托
  const groupsContainer = document.querySelector('.groups-container');
  if (groupsContainer) {
    groupsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.group-tab');
      if (tab) {
        activeGroupFilter = tab.dataset.group;
        renderGroups();
        renderLinks();
      }
    });
  }
  
  // Tab 切换事件
  const viewTabs = document.querySelectorAll('.view-tab');
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 移除所有active
      viewTabs.forEach(t => t.classList.remove('active'));
      // 添加active
      tab.classList.add('active');
      // 更新当前视图
      currentView = tab.dataset.view;
      // 重新渲染
      renderSections();
    });
  });
  
  // 添加分组按钮
  const addGroupBtn = document.getElementById('addGroupBtn');
  if (addGroupBtn) {
    addGroupBtn.addEventListener('click', () => {
      showModal({
        title: '新建分组',
        message: '输入分组名称：',
        input: true,
        onConfirm: (name) => {
          if (name && name.trim()) {
            const newGroup = {
              id: 'group_' + Date.now(),
              name: name.trim(),
              color: '#4F46E5',
              icon: 'fa-folder',
              createdAt: Date.now()
            };
            groups.push(newGroup);
            save();
            renderGroups();
            showToast('分组已创建');
          }
        }
      });
    });
  }
}

// 绑定空状态按钮事件
function bindEmptyStateEvents() {
  const addManualBtn = document.getElementById('addManualBtn');
  const importEmptyBtn = document.getElementById('importEmptyBtn');
  const importEmptyFileInput = document.getElementById('importEmptyFileInput');
  
  if (addManualBtn) {
    // 移除旧的事件监听（如果有）
    const newAddBtn = addManualBtn.cloneNode(true);
    addManualBtn.parentNode.replaceChild(newAddBtn, addManualBtn);
    
    // 手动添加
    newAddBtn.addEventListener('click', () => {
      showModal({
        title: '添加书签',
        message: '请输入网址：',
        input: true,
        defaultValue: 'https://',
        onConfirm: (url) => {
          if (url && /^https?:\/\//.test(url)) {
            addLinkFromUrl(url);
          } else {
            showToast('请输入有效的网址');
          }
        }
      });
    });
  }
  
  if (importEmptyBtn && importEmptyFileInput) {
    // 移除旧的事件监听
    const newImportBtn = importEmptyBtn.cloneNode(true);
    const newImportInput = importEmptyFileInput.cloneNode(true);
    importEmptyBtn.parentNode.replaceChild(newImportBtn, importEmptyBtn);
    importEmptyFileInput.parentNode.replaceChild(newImportInput, importEmptyFileInput);
    
    newImportBtn.addEventListener('click', () => {
      newImportInput.click();
    });
    
    newImportInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        showToast('正在读取文件...');
        const text = await file.text();
        const decryptedData = await decryptImportData(text);
        const importObj = JSON.parse(decryptedData);
        
        if (!importObj.links || !importObj.groups) {
          throw new Error('数据格式不正确');
        }
        
        showModal({
          title: '确认导入',
          message: `导入将覆盖当前所有数据！\n书签: ${importObj.links.length} 个\n分组: ${importObj.groups.length} 个\n\n确定要继续吗？`,
          onConfirm: async () => {
            try {
              showToast('正在导入数据...');
              links = importObj.links || [];
              groups = importObj.groups || [];
              autoGroupNames = importObj.autoGroupNames || {};
              
              if (importObj.settings) {
                if (importObj.settings.darkMode !== undefined) {
                  chrome.storage.local.set({ darkMode: importObj.settings.darkMode });
                }
                if (importObj.settings.sortBy) {
                  sortBy = importObj.settings.sortBy;
                }
              }
              
              chrome.storage.local.set({ links, groups, autoGroupNames }, () => {
                showToast('数据导入成功！');
                renderLinks();
              });
            } catch (error) {
              console.error('导入数据失败:', error);
              showToast('导入数据失败: ' + error.message);
            }
          }
        });
      } catch (error) {
        console.error('导入失败:', error);
        showToast('导入失败: ' + (error.message || '文件格式错误或数据已损坏'));
      }
      
      event.target.value = '';
    });
  }
}

// ========== 数据操作 ==========
function save() {
  chrome.storage.local.set({ links, groups });
  // 清除域名缓存（数据变化后需要重新解析）
  domainCache.clear();
}

function editGroup(groupId) {
  // 查找分组（包括自动分组和自定义分组）
  let group = groups.find(g => g.id === groupId);
  let isAutoGroup = false;
  
  // 如果是自动分组，从自动分组中查找
  if (!group && groupId.startsWith('auto_')) {
    const autoGroups = generateAutoGroups();
    group = autoGroups.find(g => g.id === groupId);
    isAutoGroup = true;
  }
  
  if (!group) return;
  
  showModal({
    title: isAutoGroup ? '编辑分组名称' : '编辑分组',
    message: isAutoGroup ? '修改显示名称（不影响域名筛选）：' : '修改分组名称：',
    input: true,
    defaultValue: group.name.replace(/ \(\d+\)$/, ''),  // 移除计数
    onConfirm: (name) => {
      if (name && name.trim()) {
        if (isAutoGroup) {
          // 自动分组：存储自定义名称
          autoGroupNames[groupId] = name.trim();
          // 保存到 storage
          chrome.storage.local.set({ autoGroupNames });
          renderGroups();
          showToast('分组名称已更新');
        } else {
          // 自定义分组：正常保存
          group.name = name.trim();
          save();
          renderGroups();
          showToast('分组已更新');
        }
      }
    }
  });
}

function deleteGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  
  showModal({
    title: '确认删除',
    message: `确定要删除分组 "${group.name}" 吗？\n分组内的书签不会被删除。`,
    onConfirm: () => {
      // 从所有书签中移除该分组
      links.forEach(link => {
        link.groups = link.groups.filter(gId => gId !== groupId);
      });
      
      // 删除分组
      groups = groups.filter(g => g.id !== groupId);
      
      // 如果当前正在查看该分组，切换回“全部”
      if (activeGroupFilter === groupId) {
        activeGroupFilter = 'all';
      }
      
      save();
      renderGroups();
      renderLinks();
      showToast('分组已删除');
    }
  });
}

function showGroupContextMenu(group, x, y) {
  // 移除已存在的菜单
  const existingMenu = document.querySelector('.group-select-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // 创建菜单
  const menu = document.createElement('div');
  menu.className = 'group-select-menu';
  
  // 标题
  const title = document.createElement('div');
  title.className = 'group-select-menu-title';
  title.textContent = '分组操作';
  menu.appendChild(title);
  
  // 分隔线
  const divider1 = document.createElement('div');
  divider1.className = 'group-select-divider';
  menu.appendChild(divider1);
  
  // 编辑选项（所有分组都可以编辑）
  const editItem = document.createElement('div');
  editItem.className = 'group-select-item';
  editItem.innerHTML = `
    <i class="fa fa-pencil"></i>
    <span>编辑名称</span>
  `;
  
  editItem.addEventListener('click', () => {
    editGroup(group.id);
    menu.remove();
  });
  
  menu.appendChild(editItem);
  
  // 删除选项（只有自定义分组可以删除）
  if (!group.auto) {
    const deleteItem = document.createElement('div');
    deleteItem.className = 'group-select-item';
    deleteItem.style.color = '#EF4444';
    deleteItem.innerHTML = `
      <i class="fa fa-trash"></i>
      <span>删除分组</span>
    `;
    
    deleteItem.addEventListener('click', () => {
      deleteGroup(group.id);
      menu.remove();
    });
    
    menu.appendChild(deleteItem);
  }
  
  // 定位菜单
  menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  
  document.body.appendChild(menu);
  
  // 点击其他地方关闭菜单
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

function showBookmarkContextMenu(link, x, y) {
  // 移除已存在的菜单
  const existingMenu = document.querySelector('.group-select-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // 创建菜单
  const menu = document.createElement('div');
  menu.className = 'group-select-menu';
  
  // 标题
  const title = document.createElement('div');
  title.className = 'group-select-menu-title';
  title.textContent = '书签操作';
  menu.appendChild(title);
  
  // 分隔线
  const divider1 = document.createElement('div');
  divider1.className = 'group-select-divider';
  menu.appendChild(divider1);
  
  // 置顶/取消置顶选项
  const pinItem = document.createElement('div');
  pinItem.className = 'group-select-item' + (link.pinned ? ' selected' : '');
  pinItem.innerHTML = `
    <i class="fa ${link.pinned ? 'fa-thumb-tack' : 'fa-thumb-tack'}"></i>
    <span>${link.pinned ? '取消置顶' : '置顶'}</span>
  `;
  
  pinItem.addEventListener('click', () => {
    link.pinned = !link.pinned;
    save();
    renderLinks();
    showToast(link.pinned ? '书签已置顶' : '已取消置顶');
    menu.remove();
  });
  
  menu.appendChild(pinItem);
  
  // 编辑选项
  const editItem = document.createElement('div');
  editItem.className = 'group-select-item';
  editItem.innerHTML = `
    <i class="fa fa-pencil"></i>
    <span>编辑名称</span>
  `;
  
  editItem.addEventListener('click', () => {
    editCard(link);
    menu.remove();
  });
  
  menu.appendChild(editItem);
  
  // 删除选项
  const deleteItem = document.createElement('div');
  deleteItem.className = 'group-select-item';
  deleteItem.style.color = '#EF4444';
  deleteItem.innerHTML = `
    <i class="fa fa-trash"></i>
    <span>删除书签</span>
  `;
  
  deleteItem.addEventListener('click', () => {
    deleteCard(link);
    menu.remove();
  });
  
  menu.appendChild(deleteItem);
  
  // 分隔线
  const divider2 = document.createElement('div');
  divider2.className = 'group-select-divider';
  menu.appendChild(divider2);
  
  // 分组标题
  const groupTitle = document.createElement('div');
  groupTitle.className = 'group-select-menu-title';
  groupTitle.textContent = '选择分组';
  menu.appendChild(groupTitle);
  
  // 分隔线
  const divider3 = document.createElement('div');
  divider3.className = 'group-select-divider';
  menu.appendChild(divider3);
  
  // 分组选项
  groups.forEach(group => {
    const item = document.createElement('div');
    item.className = 'group-select-item' + (link.groups.includes(group.id) ? ' selected' : '');
    item.innerHTML = `
      <i class="fa ${link.groups.includes(group.id) ? 'fa-check-circle' : 'fa-circle-o'}"></i>
      <span>${group.name}</span>
    `;
    
    item.addEventListener('click', () => {
      // 切换分组
      if (link.groups.includes(group.id)) {
        link.groups = link.groups.filter(gId => gId !== group.id);
      } else {
        link.groups.push(group.id);
      }
      
      save();
      renderLinks();
      showToast('分组已更新');
      menu.remove();
    });
    
    menu.appendChild(item);
  });
  
  // 如果没有分组，显示提示
  if (groups.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'group-select-item';
    empty.style.color = 'var(--text-muted)';
    empty.style.cursor = 'default';
    empty.textContent = '暂无分组，请先创建';
    menu.appendChild(empty);
  }
  
  // 定位菜单
  menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 400) + 'px';
  
  document.body.appendChild(menu);
  
  // 点击其他地方关闭菜单
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

function addLinkFromUrl(url, draggedTitle = null) {
  // 检查是否已存在
  if (links.some(link => link.url === url)) {
    showToast('该链接已存在');
    return;
  }

  // 提取标题和图标
  let title = '';
  let icon = '';
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    
    if (draggedTitle) {
      // 使用拖拽带来的标题，限制长度
      title = draggedTitle.length > 50 ? draggedTitle.substring(0, 50) + '...' : draggedTitle;
    } else {
      // 没有标题，使用域名
      title = hostname.length > 30 ? hostname.substring(0, 30) + '...' : hostname;
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    // 尝试获取 favicon
    icon = `https://${urlObj.hostname}/favicon.ico`;
  } catch (e) {
    title = url;
    icon = '';
  }

  const newLink = {
    url,
    title,
    icon,
    createdAt: Date.now()
  };

  links.unshift(newLink);
  save();
  renderLinks();
  showToast(`已添加书签: ${title}`);
}

// ========== UI 渲染 ==========
function getFilteredLinks() {
  let filtered = links;
  
  // 按分组筛选
  if (activeGroupFilter !== 'all') {
    // 检查是否是自动分组
    if (activeGroupFilter.startsWith('auto_')) {
      // 自动分组：根据域名筛选
      const domain = activeGroupFilter.replace('auto_', '');
      filtered = filtered.filter(link => getLinkDomain(link) === domain);
    } else {
      // 自定义分组：根据groups数组筛选
      filtered = filtered.filter(link => link.groups && link.groups.includes(activeGroupFilter));
    }
  }
  
  // 智能搜索
  if (filterText) {
    const searchTerms = filterText.toLowerCase().split(' ').filter(t => t.trim());
    
    filtered = filtered.filter(link => {
      // 检查每个搜索词
      return searchTerms.every(term => {
        // #标签搜索：#工作
        if (term.startsWith('#')) {
          const tagName = term.substring(1);
          return link.tags && link.tags.some(tag => 
            tag.toLowerCase().includes(tagName)
          );
        }
        
        // @域名搜索：@github
        if (term.startsWith('@')) {
          const domainPart = term.substring(1);
          return getLinkDomain(link).includes(domainPart);
        }
        
        // !分组搜索：!工作 或 ！工作（兼容中英文）
        if (term.startsWith('!') || term.startsWith('\uff01')) {
          const groupName = term.substring(1);
          return link.groups && link.groups.some(groupId => {
            const group = groups.find(g => g.id === groupId);
            return group && group.name.toLowerCase().includes(groupName);
          });
        }
        
        // 默认搜索：匹配标题、URL、域名
        const domain = getLinkDomain(link);
        return link.title.toLowerCase().includes(term) || 
               link.url.toLowerCase().includes(term) ||
               (domain && domain.includes(term));
      });
    });
  }
  
  // 排序
  filtered = [...filtered].sort((a, b) => {
    // 置顶的始终在最前面
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
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
  const container = document.querySelector('.groups-container');
  if (!container) return;
  
  // 保留“全部”标签，移除其他
  const allTab = container.querySelector('[data-group="all"]');
  container.innerHTML = '';
  if (allTab) {
    container.appendChild(allTab);
  } else {
    // 如果“全部”标签不存在，创建它
    const allTabNew = document.createElement('button');
    allTabNew.className = 'group-tab' + (activeGroupFilter === 'all' ? ' active' : '');
    allTabNew.dataset.group = 'all';
    allTabNew.innerHTML = '<i class="fa fa-th"></i><span>全部</span>';
    container.appendChild(allTabNew);
  }
  
  // 自动生成分组（根据域名）
  const autoGroups = generateAutoGroups();
  
  // 合并自动分组和自定义分组
  const allGroups = [...autoGroups, ...groups];
  
  // 添加分组
  allGroups.forEach(group => {
    const tab = document.createElement('button');
    tab.className = 'group-tab' + (activeGroupFilter === group.id ? ' active' : '');
    tab.dataset.group = group.id;
    
    // 分组内容
    const iconHtml = `<i class="fa ${group.icon || 'fa-folder'}"></i>`;
    
    // 计算分组的书签数量
    let count = 0;
    if (group.auto) {
      // 自动分组：使用已有的count
      count = group.count || 0;
    } else {
      // 自定义分组：计算关联的书签数量
      count = links.filter(link => link.groups && link.groups.includes(group.id)).length;
    }
    
    // 显示名称（如果有自定义名称则使用）
    const displayName = group.name.replace(/ \(\d+\)$/, '');  // 移除自动分组的计数
    const nameHtml = `<span>${displayName}</span>`;
    const countHtml = count > 0 ? `<span class="group-count">${count}</span>` : '';
    
    tab.innerHTML = iconHtml + nameHtml + countHtml;
    
    // 所有分组都添加右键菜单
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showGroupContextMenu(group, e.clientX, e.clientY);
    });
    
    container.appendChild(tab);
  });
  
  // 更新“全部”标签的激活状态
  const currentAllTab = container.querySelector('[data-group="all"]');
  if (currentAllTab) {
    currentAllTab.className = 'group-tab' + (activeGroupFilter === 'all' ? ' active' : '');
  }
}

// 自动生成分组（根据域名）
function generateAutoGroups() {
  const domainMap = {};
  
  links.forEach(link => {
    try {
      const domain = new URL(link.url).hostname.replace(/^www\./, '');
      if (!domainMap[domain]) {
        domainMap[domain] = {
          id: 'auto_' + domain,
          name: domain,
          icon: 'fa-globe',
          auto: true,  // 标记为自动分组
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
      // 如果有自定义名称，使用自定义名称
      const displayName = autoGroupNames[g.id] || g.name;
      return {
        ...g,
        name: displayName  // 不再添加括号计数，由renderGroups统一处理
      };
    });
}

// 添加卡片到指定board
function addCardToBoard(boardEl, link) {
  const gradients = ['card-gradient-1', 'card-gradient-2', 'card-gradient-3', 'card-gradient-4', 'card-gradient-5'];
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  const card = document.createElement('div');
  card.className = 'bookmark-card';
  
  const inner = document.createElement('div');
  inner.className = `card-inner ${randomGradient}`;

  // 置顶标记
  if (link.pinned) {
    const pinBadge = document.createElement('div');
    pinBadge.className = 'pin-badge';
    pinBadge.innerHTML = '<i class="fa fa-thumb-tack"></i>';
    inner.appendChild(pinBadge);
  }

  // 分组标签（右上角）
  if (link.groups && link.groups.length > 0) {
    const groupsDiv = document.createElement('div');
    groupsDiv.className = 'card-tags-container';
    link.groups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const tag = document.createElement('span');
        tag.className = 'card-group-tag-corner';
        tag.textContent = group.name;
        groupsDiv.appendChild(tag);
      }
    });
    inner.appendChild(groupsDiv);
  }

  // 图标
  const iconDiv = document.createElement('div');
  iconDiv.className = 'card-icon';
  
  const img = document.createElement('img');
  img.src = link.icon || 'default-icon.png';
  img.alt = link.title;
  img.addEventListener('error', function() {
    this.onerror = null;
    this.src = 'default-icon.png';
  });
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
  
  // 显示点击统计（始终显示）
  const statsDiv = document.createElement('div');
  statsDiv.className = 'card-stats';
  const clickCount = link.clickCount || 0;
  const lastAccessText = link.lastAccessed ? formatTimeAgo(link.lastAccessed) : '从未查看';
  statsDiv.innerHTML = `
    <span class="stat-item">
      <i class="fa fa-eye"></i> ${clickCount}次
    </span>
    <span class="stat-item">
      <i class="fa fa-clock-o"></i> ${lastAccessText}
    </span>
  `;
  content.appendChild(statsDiv);

  inner.appendChild(iconDiv);
  inner.appendChild(content);
  card.appendChild(inner);

  // 点击事件
  inner.addEventListener('click', () => {
    // 记录点击统计
    link.clickCount = (link.clickCount || 0) + 1;
    link.lastAccessed = Date.now();
    save();
    
    window.open(link.url, '_blank');
  });
  
  // 右键菜单 - 选择分组和置顶
  inner.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showBookmarkContextMenu(link, e.clientX, e.clientY);
  });

  boardEl.appendChild(card);
}

function renderSections() {
  const filteredLinks = getFilteredLinks();
  
  // 统计
  const pinnedLinks = filteredLinks.filter(link => link.pinned);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentLinks = filteredLinks.filter(link => 
    !link.pinned && link.createdAt && link.createdAt > sevenDaysAgo
  );
  
  // 更新计数
  const allCount = document.getElementById('allCount');
  const pinnedCount = document.getElementById('pinnedCount');
  const recentCount = document.getElementById('recentCount');
  
  if (allCount) allCount.textContent = filteredLinks.length;
  if (pinnedCount) pinnedCount.textContent = pinnedLinks.length;
  if (recentCount) recentCount.textContent = recentLinks.length;
  
  // 根据当前视图过滤
  let displayLinks = filteredLinks;
  if (currentView === 'pinned') {
    displayLinks = pinnedLinks;
  } else if (currentView === 'recent') {
    displayLinks = recentLinks;
  }
  
  // 渲染书签
  const boardElement = document.getElementById('board');
  if (boardElement) {
    // 获取其他空状态元素（emptyState已在全局定义）
    const emptyStatePinned = document.getElementById('emptyStatePinned');
    const emptyStateRecent = document.getElementById('emptyStateRecent');
    
    // 恢复emptyState的原始内容（如果被加载状态覆盖）
    if (!emptyState.querySelector('.empty-icon-wrapper')) {
      emptyState.innerHTML = `
        <div class="empty-icon-wrapper">
          <i class="fa fa-bookmark empty-icon"></i>
        </div>
        <h3 class="empty-title">暂无书签</h3>
        <p class="empty-text">将网页链接拖拽到这里保存，或点击下方按钮手动添加</p>
        <div class="empty-actions">
          <button id="addManualBtn" class="btn btn-primary">
            <i class="fa fa-plus"></i>
            <span>手动添加</span>
          </button>
          <button id="importEmptyBtn" class="btn btn-secondary">
            <i class="fa fa-upload"></i>
            <span>导入数据</span>
          </button>
        </div>
        <input type="file" id="importEmptyFileInput" accept=".json" style="display: none;" />
      `;
      // 重新绑定事件
      bindEmptyStateEvents();
    }
    
    // 清空现有卡片（保留所有空状态）
    Array.from(boardElement.children).forEach(child => {
      if (child !== emptyState && child !== emptyStatePinned && child !== emptyStateRecent) {
        child.remove();
      }
    });
    
    // 根据当前视图显示/隐藏对应的空状态
    if (currentView === 'pinned') {
      // 置顶视图
      emptyState.classList.add('hidden');
      emptyStateRecent.classList.add('hidden');
      emptyStatePinned.classList.toggle('hidden', displayLinks.length > 0);
    } else if (currentView === 'recent') {
      // 最近添加视图
      emptyState.classList.add('hidden');
      emptyStatePinned.classList.add('hidden');
      emptyStateRecent.classList.toggle('hidden', displayLinks.length > 0);
    } else {
      // 所有书签视图
      emptyStatePinned.classList.add('hidden');
      emptyStateRecent.classList.add('hidden');
      emptyState.classList.toggle('hidden', displayLinks.length > 0);
    }
    
    // 添加卡片
    displayLinks.forEach(link => addCardToBoard(boardElement, link));
    
    // 添加"手动添加"卡片
    if (displayLinks.length > 0 && !filterText && activeGroupFilter === 'all') {
      addAddCard();
    }
  }
}

function renderLinks() {
  // 更新分区展示
  renderSections();
}

function addCard(link) {
  const gradients = ['card-gradient-1', 'card-gradient-2', 'card-gradient-3', 'card-gradient-4', 'card-gradient-5'];
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  const card = document.createElement('div');
  card.className = 'bookmark-card';
  
  const inner = document.createElement('div');
  inner.className = `card-inner ${randomGradient}`;

  // 置顶标记
  if (link.pinned) {
    const pinBadge = document.createElement('div');
    pinBadge.className = 'pin-badge';
    pinBadge.innerHTML = '<i class="fa fa-thumb-tack"></i>';
    inner.appendChild(pinBadge);
  }

  // 批量模式选择指示器
  if (isBatchMode) {
    const indicator = document.createElement('div');
    indicator.className = `select-indicator ${isSelected ? 'selected' : 'unselected'}`;
    if (isSelected) {
      indicator.innerHTML = '<i class="fa fa-check"></i>';
    }
    inner.appendChild(indicator);
  } else {
    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'card-action-btn';
    editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editCard(link);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn';
    deleteBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(link);
    });
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    inner.appendChild(actions);
  }

  // 图标
  const iconDiv = document.createElement('div');
  iconDiv.className = 'card-icon';
  
  const img = document.createElement('img');
  img.src = link.icon || 'default-icon.png';
  img.alt = link.title;
  img.addEventListener('error', function() {
    this.onerror = null;
    this.src = 'default-icon.png';
  });
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
  
  // 显示点击统计（始终显示）
  const statsDiv = document.createElement('div');
  statsDiv.className = 'card-stats';
  const clickCount = link.clickCount || 0;
  const lastAccessText = link.lastAccessed ? formatTimeAgo(link.lastAccessed) : '从未查看';
  statsDiv.innerHTML = `
    <span class="stat-item">
      <i class="fa fa-eye"></i> ${clickCount}次
    </span>
    <span class="stat-item">
      <i class="fa fa-clock-o"></i> ${lastAccessText}
    </span>
  `;
  content.appendChild(statsDiv);

  inner.appendChild(iconDiv);
  inner.appendChild(content);
  card.appendChild(inner);

  // 点击事件
  if (!isBatchMode) {
    inner.addEventListener('click', () => {
      // 记录点击统计
      link.clickCount = (link.clickCount || 0) + 1;
      link.lastAccessed = Date.now();
      save();
      
      window.open(link.url, '_blank');
    });
    
    // 右键菜单 - 选择分组和置顶
    inner.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showBookmarkContextMenu(link, e.clientX, e.clientY);
    });
  } else {
    inner.addEventListener('click', () => {
      toggleSelection(link.url);
    });
  }

  board.appendChild(card);
}

function addAddCard() {
  const card = document.createElement('div');
  card.className = 'add-card';
  
  const inner = document.createElement('div');
  inner.className = 'add-card-inner';
  inner.addEventListener('click', () => {
    addManualBtn.click();
  });
  
  const icon = document.createElement('i');
  icon.className = 'fa fa-plus add-icon';
  
  const text = document.createElement('span');
  text.className = 'add-text';
  text.textContent = '添加书签';
  
  inner.appendChild(icon);
  inner.appendChild(text);
  card.appendChild(inner);
  board.appendChild(card);
}

function editCard(link) {
  showModal({
    title: '编辑书签',
    message: '修改书签名称：',
    input: true,
    defaultValue: link.title,
    onConfirm: (newTitle) => {
      if (newTitle) {
        link.title = newTitle;
        save();
        renderLinks();
        showToast('已更新书签名称');
      }
    }
  });
}

function deleteCard(link) {
  showModal({
    title: '确认删除',
    message: `确定要删除书签 "${link.title}" 吗？`,
    onConfirm: () => {
      links = links.filter(l => l.url !== link.url);
      chrome.storage.local.set({ links, groups }, () => {
        // 清除域名缓存
        domainCache.clear();
        // 保存完成后再渲染
        renderLinks();
        showToast('书签已删除');
      });
    }
  });
}

// ========== 工具函数 ==========
// ========== 辅助函数 ==========
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years}年前`;
  if (months > 0) return `${months}月前`;
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

function showToast(message) {
  // 移除已存在的 toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  // 创建新 toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fa fa-info-circle toast-icon"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // 3秒后自动消失
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 解密导入数据（与settings.js相同的逻辑）
async function decryptImportData(encryptedText) {
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

function showModal({ title = '提示', message = '', input = false, defaultValue = '', onConfirm, onCancel }) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;

  if (input) {
    modalInput.classList.remove('hidden');
    modalInput.value = defaultValue || '';
    setTimeout(() => modalInput.focus(), 100);
    
    // 回车键确认
    modalInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        modalOk.click();
      }
    };
  } else {
    modalInput.classList.add('hidden');
    modalInput.onkeydown = null;
  }

  modal.classList.add('show');

  modalOk.onclick = () => {
    if (input) {
      onConfirm?.(modalInput.value);
    } else {
      onConfirm?.();
    }
    closeModal();
  };

  modalCancel.onclick = () => {
    onCancel?.();
    closeModal();
  };
}

function closeModal() {
  modal.classList.remove('show');
  modalOk.onclick = null;
  modalCancel.onclick = null;
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
