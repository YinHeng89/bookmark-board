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
const batchBtn = document.getElementById('batchBtn');
const batchActions = document.getElementById('batchActions');
const batchCount = document.getElementById('batchCount');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const deleteSelectedBtn = document.getElementById('deleteSelected');
const selectedCount = document.getElementById('selectedCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalInput = document.getElementById('modalInput');
const modalCancel = document.getElementById('modalCancel');
const modalOk = document.getElementById('modalOk');

// ========== 状态管理 ==========
let links = [];
let selectedLinks = new Set();
let isBatchMode = false;
let filterText = '';

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
  
  chrome.storage.local.get(['links', 'tipHidden'], (result) => {

    // 恢复提示栏状态
    if (result.tipHidden === true) {
      tipBar.style.display = 'none';
    }

    // 加载书签数据
    links = result.links || [];
    renderLinks();
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

  // 批量操作
  batchBtn.addEventListener('click', () => {
    isBatchMode = !isBatchMode;
    batchActions.classList.toggle('show', isBatchMode);
    renderLinks();
  });

  selectAllBtn.addEventListener('click', () => {
    links.forEach(link => selectedLinks.add(link.url));
    renderLinks();
  });

  deselectAllBtn.addEventListener('click', () => {
    selectedLinks.clear();
    renderLinks();
  });

  deleteSelectedBtn.addEventListener('click', () => {
    if (selectedLinks.size === 0) return;
    
    showModal({
      title: '确认删除',
      message: `确定要删除选中的 ${selectedLinks.size} 个书签吗？`,
      onConfirm: () => {
        links = links.filter(link => !selectedLinks.has(link.url));
        selectedLinks.clear();
        save();
        renderLinks();
        showToast('已删除所选书签');
      }
    });
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

  // 模态框
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

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
}

// ========== 数据操作 ==========
function save() {
  chrome.storage.local.set({ links });
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
  if (!filterText) return links;
  return links.filter(link => 
    link.title.toLowerCase().includes(filterText) || 
    link.url.toLowerCase().includes(filterText)
  );
}

function renderLinks() {
  const filteredLinks = getFilteredLinks();

  // 清空现有卡片（保留空状态）
  Array.from(board.children).forEach(child => {
    if (child !== emptyState) child.remove();
  });

  // 显示/隐藏空状态
  emptyState.classList.toggle('hidden', filteredLinks.length > 0);

  // 添加卡片
  filteredLinks.forEach(link => {
    addCard(link);
  });

  // 只在有书签时才显示"添加书签"卡片
  if (filteredLinks.length > 0) {
    addAddCard();
  }

  // 更新批量操作计数
  if (isBatchMode) {
    batchCount.textContent = selectedLinks.size;
    selectedCount.textContent = selectedLinks.size;
    selectedCount.classList.toggle('show', selectedLinks.size > 0);
  }
}

function addCard(link) {
  const isSelected = selectedLinks.has(link.url);
  const gradients = ['card-gradient-1', 'card-gradient-2', 'card-gradient-3', 'card-gradient-4', 'card-gradient-5'];
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  const card = document.createElement('div');
  card.className = `bookmark-card ${isSelected ? 'selected' : ''}`;
  
  const inner = document.createElement('div');
  inner.className = `card-inner ${randomGradient}`;

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

  inner.appendChild(iconDiv);
  inner.appendChild(content);
  card.appendChild(inner);

  // 点击事件
  if (!isBatchMode) {
    inner.addEventListener('click', () => {
      window.open(link.url, '_blank');
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

function toggleSelection(url) {
  if (selectedLinks.has(url)) {
    selectedLinks.delete(url);
  } else {
    selectedLinks.add(url);
  }
  renderLinks();
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
      selectedLinks.delete(link.url);
      save();
      renderLinks();
      showToast('书签已删除');
    }
  });
}

// ========== 工具函数 ==========
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

function showModal({ title = '提示', message = '', input = false, defaultValue = '', onConfirm, onCancel }) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;

  if (input) {
    modalInput.classList.remove('hidden');
    modalInput.value = defaultValue || '';
    setTimeout(() => modalInput.focus(), 100);
  } else {
    modalInput.classList.add('hidden');
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
