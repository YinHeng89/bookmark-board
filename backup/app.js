// DOM元素
const board = document.getElementById("board");
const emptyState = document.getElementById("emptyState");
const searchInput = document.querySelector(
  "#search, #mobileSearch input"
);
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const mobileSearch = document.getElementById("mobileSearch");
const themeToggle = document.getElementById("themeToggle");
const hideTipBtn = document.getElementById("hideTip");
const tipBar = document.getElementById("tipBar");
const footer = document.getElementById("footer");
const addManualBtn = document.getElementById("addManualBtn");
const batchBtn = document.getElementById("batchBtn");
const batchActions = document.getElementById("batchActions");
const batchCount = document.getElementById("batchCount");
const selectAllBtn = document.getElementById("selectAll");
const deselectAllBtn = document.getElementById("deselectAll");
const deleteSelectedBtn = document.getElementById("deleteSelected");
const selectedCount = document.getElementById("selectedCount");

// 状态管理
let links = [];
let selectedLinks = new Set();
let isBatchMode = false;
let filterText = "";

// 初始化 - 先注册事件监听器，再异步加载数据
setupEventListeners();
loadData();

function loadData() {
  // 检查深色模式偏好
  chrome.storage.local.get(["darkMode", "links", "tipHidden"], (result) => {
    // 深色模式
    if (
      result.darkMode === true ||
      (result.darkMode === undefined &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    }

    // 恢复提示栏状态
    if (result.tipHidden === true) {
      tipBar.style.display = "none";
    }

    // 加载书签数据
    links = result.links || [];
    renderLinks();

    // 显示 footer
    footer.classList.remove("hidden");
  });
}

function setupEventListeners() {
  // 拖拽事件
  board.addEventListener("dragover", (e) => {
    e.preventDefault();
    board.classList.add("ring-2", "ring-dashed", "ring-primary");
  });

  board.addEventListener("dragleave", () => {
    board.classList.remove("ring-2", "ring-dashed", "ring-primary");
  });

  board.addEventListener("drop", (e) => {
    e.preventDefault();
    board.classList.remove("ring-2", "ring-dashed", "ring-primary");

    const url =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (url && /^https?:\/\//.test(url)) {
      addLinkFromUrl(url);
    }
  });

  // 搜索事件
  searchInput.addEventListener("input", (e) => {
    filterText = e.target.value.toLowerCase();
    renderLinks();
  });

  // 移动端搜索按钮
  mobileSearchBtn.addEventListener("click", () => {
    mobileSearch.classList.toggle("hidden");
    if (!mobileSearch.classList.contains("hidden")) {
      mobileSearch.querySelector("input").focus();
    }
  });

  // 主题切换
  themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    chrome.storage.local.set({
      darkMode: document.documentElement.classList.contains("dark"),
    });
  });

  // 隐藏提示栏
  hideTipBtn.addEventListener("click", () => {
    tipBar.style.display = "none";
    chrome.storage.local.set({ tipHidden: true });
  });

  // 手动添加
  addManualBtn.addEventListener("click", () => {
    showModal({
      title: "添加书签",
      message: "请输入网址（需包含 http:// 或 https://）：",
      input: true,
      defaultValue: "https://", // 默认值
      onConfirm: (url) => {
        if (url) addLinkFromUrl(url);
      },
    });
  });

  // 批量操作按钮
  batchBtn.addEventListener("click", () => {
    isBatchMode = !isBatchMode;
    batchActions.classList.toggle("hidden", !isBatchMode);
    selectedLinks.clear();
    updateSelectedCount();
    renderLinks();

    // 按钮状态变化
    batchBtn.classList.toggle("bg-slate-100", isBatchMode);
    batchBtn.classList.toggle("dark:bg-slate-700", isBatchMode);
  });

  // 全选
  selectAllBtn.addEventListener("click", () => {
    const filteredLinks = getFilteredLinks();
    filteredLinks.forEach((link) => selectedLinks.add(link.url));
    updateSelectedCount();
    renderLinks();
  });

  // 取消选择
  deselectAllBtn.addEventListener("click", () => {
    selectedLinks.clear();
    updateSelectedCount();
    renderLinks();
  });

  // 删除所选
  deleteSelectedBtn.addEventListener("click", () => {
    if (selectedLinks.size === 0) return;

    showModal({
      title: "批量删除",
      message: `确定要删除选中的 ${selectedLinks.size} 个书签吗？`,
      onConfirm: () => {
        links = links.filter((link) => !selectedLinks.has(link.url));
        selectedLinks.clear();
        save();
        renderLinks();
        showToast("已删除所选书签");
      },
    });
  });
}

// 从URL添加链接
function addLinkFromUrl(url) {
  // 检查是否已存在
  if (links.some((link) => link.url === url)) {
    showToast("该链接已存在");
    return;
  }

  // 获取域名作为默认标题
  let title = "";
  try {
    const urlObj = new URL(url);
    title = urlObj.hostname.replace(/^www\./, "");
  } catch (e) {
    title = url;
  }

  const link = { url, title, added: new Date().toISOString() };
  links.push(link);
  save();
  renderLinks();
  showToast(`已添加书签: ${title}`);
}

// 获取过滤后的链接
function getFilteredLinks() {
  if (!filterText) return [...links];
  return links.filter(
    (link) =>
      link.title.toLowerCase().includes(filterText) ||
      link.url.toLowerCase().includes(filterText)
  );
}

// 渲染链接
function renderLinks() {
  const filteredLinks = getFilteredLinks();

  // 清空现有卡片（保留空状态）
  Array.from(board.children).forEach((child) => {
    if (child !== emptyState) child.remove();
  });

  // 显示/隐藏空状态
  emptyState.classList.toggle("hidden", filteredLinks.length > 0);

  // 添加卡片
  filteredLinks.forEach((link) => {
    addCard(link);
  });

  // 添加手动添加按钮（始终显示）
  addAddCard();

  // 更新批量操作计数
  if (isBatchMode) {
    batchCount.textContent = selectedLinks.size;
  }
}

// 添加卡片
function addCard(link) {
  const isSelected = selectedLinks.has(link.url);

  const card = document.createElement("div");
  card.className = `group relative rounded-xl overflow-hidden transition-all duration-300 animate-fade-in animate-slide-up ${
    isSelected ? "ring-2 ring-primary dark:ring-primary" : ""
  }`;

  // 随机背景色
  const gradients = [
    "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
    "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
    "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
    "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
    "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20",
  ];
  const randomGradient =
    gradients[Math.floor(Math.random() * gradients.length)];

  // 使用createElement代替innerHTML以避免CSP内联事件问题
  const inner = document.createElement("div");
  inner.className = `card-gradient ${randomGradient} h-full p-4 flex flex-col items-center justify-between cursor-pointer mobile-card-inner`;

  // 批量模式选择指示器
  if (isBatchMode) {
    const indicator = document.createElement("div");
    indicator.className = `absolute top-2 right-2 w-5 h-5 rounded-full ${
      isSelected
        ? "bg-primary text-white flex items-center justify-center"
        : "bg-white/70 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600"
    }`;
    if (isSelected) {
      const checkIcon = document.createElement("i");
      checkIcon.className = "fa fa-check text-xs";
      indicator.appendChild(checkIcon);
    }
    inner.appendChild(indicator);
  }

  // 内容区域
  const contentDiv = document.createElement("div");
  contentDiv.className = "flex flex-col items-center w-full mobile-card-content";

  // 图标容器
  const iconDiv = document.createElement("div");
  iconDiv.className = "w-[60px] h-[60px] rounded-md bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-3 overflow-hidden mobile-card-icon";

  const img = document.createElement("img");
  let iconSrc;
  try {
    iconSrc = link.icon || `https://${new URL(link.url).hostname}/favicon.ico`;
  } catch (e) {
    iconSrc = "default-icon.png";
  }
  img.src = iconSrc;
  img.alt = `${link.title}的图标`;
  img.className = "w-[50px] h-[50px] object-contain";
  img.addEventListener("error", function () {
    this.onerror = null;
    this.src = "default-icon.png";
  });
  iconDiv.appendChild(img);
  contentDiv.appendChild(iconDiv);

  // 标题
  const h3 = document.createElement("h3");
  h3.className = "text-sm font-medium text-center line-clamp-2 mb-1 w-full break-all";
  h3.textContent = link.title;
  contentDiv.appendChild(h3);

  // 域名
  const domainDiv = document.createElement("div");
  domainDiv.className = "text-xs text-slate-500 dark:text-slate-400 truncate w-full text-center";
  try {
    domainDiv.textContent = new URL(link.url).hostname.replace(/^www\./, "");
  } catch (e) {
    domainDiv.textContent = link.url;
  }
  contentDiv.appendChild(domainDiv);

  inner.appendChild(contentDiv);

  // 操作按钮区域
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity";

  // 编辑按钮
  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn p-1.5 rounded-md bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors";
  const editIcon = document.createElement("i");
  editIcon.className = "fa fa-pencil text-xs";
  editBtn.appendChild(editIcon);
  actionsDiv.appendChild(editBtn);

  // 删除按钮
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn p-1.5 rounded-md bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors";
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "fa fa-trash-o text-xs";
  deleteBtn.appendChild(deleteIcon);
  actionsDiv.appendChild(deleteBtn);

  inner.appendChild(actionsDiv);
  card.appendChild(inner);

  // 点击卡片
  card.addEventListener("click", (e) => {
    // 如果点击的是按钮，不触发卡片点击
    if (e.target.closest("button")) return;

    if (isBatchMode) {
      // 批量模式下点击切换选择状态
      if (isSelected) {
        selectedLinks.delete(link.url);
      } else {
        selectedLinks.add(link.url);
      }
      updateSelectedCount();
      renderLinks();
    } else {
      // 非批量模式下打开链接
      window.open(link.url, "_blank");
    }
  });

  // 编辑按钮
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showModal({
      title: "编辑书签",
      message: "请输入新的名称：",
      input: true,
      defaultValue: link.title,
      onConfirm: (newName) => {
        if (newName) {
          link.title = newName;
          save();
          renderLinks();
          showToast("已更新书签名称");
        }
      },
    });
  });

  // 删除按钮
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showModal({
      title: "删除确认",
      message: `确定要删除 "${link.title}" 吗？`,
      onConfirm: () => {
        links = links.filter((l) => l.url !== link.url);
        selectedLinks.delete(link.url);
        save();
        renderLinks();
        showToast("书签已删除");
      },
    });
  });

  board.appendChild(card);
}

// 添加手动添加按钮卡片
function addAddCard() {
  const addCard = document.createElement("div");
  addCard.className = "group relative rounded-xl overflow-hidden transition-all duration-300 animate-fade-in";
  
  const inner = document.createElement("div");
  inner.className = "h-full p-4 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors";
  inner.addEventListener("click", () => {
    addManualBtn.click();
  });
  
  const icon = document.createElement("i");
  icon.className = "fa fa-plus text-3xl text-slate-400 dark:text-slate-500 mb-2";
  inner.appendChild(icon);
  
  const text = document.createElement("p");
  text.className = "text-sm text-slate-500 dark:text-slate-400";
  text.textContent = "添加书签";
  inner.appendChild(text);
  
  addCard.appendChild(inner);
  board.appendChild(addCard);
}

// 更新选中计数
function updateSelectedCount() {
  const count = selectedLinks.size;
  selectedCount.textContent = count;
  selectedCount.style.opacity = count > 0 ? "1" : "0";
  batchCount.textContent = count;
}

// 保存到chrome.storage
function save() {
  chrome.storage.local.set({ links: links });
}

// 显示提示消息
function showToast(message) {
  // 检查是否已有toast
  let toast = document.querySelector(".toast");
  if (toast) {
    toast.remove();
  }

  // 创建新toast - 使用createElement代替innerHTML以避免CSP问题
  toast = document.createElement("div");
  toast.className = "toast fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-8 py-3 rounded-lg shadow-lg z-50 animate-fade-in flex items-center gap-2";

  const icon = document.createElement("i");
  icon.className = "fa fa-info-circle";
  toast.appendChild(icon);

  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);

  document.body.appendChild(toast);

  // 3秒后自动消失
  setTimeout(() => {
    toast.classList.add(
      "opacity-0",
      "transition-opacity",
      "duration-300"
    );
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModal({
  title = "提示",
  message = "",
  input = false,
  defaultValue = "",
  onConfirm,
  onCancel,
}) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const modalInput = document.getElementById("modalInput");
  const modalCancel = document.getElementById("modalCancel");
  const modalOk = document.getElementById("modalOk");

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  if (input) {
    modalInput.classList.remove("hidden");
    modalInput.value = defaultValue || "";
    modalInput.focus();
  } else {
    modalInput.classList.add("hidden");
  }

  modal.classList.remove("hidden");

  // 清理旧事件
  modalOk.onclick = null;
  modalCancel.onclick = null;

  // 确认
  modalOk.onclick = () => {
    if (input) {
      onConfirm?.(modalInput.value);
    } else {
      onConfirm?.();
    }
    closeModal();
  };

  // 取消
  modalCancel.onclick = () => {
    onCancel?.();
    closeModal();
  };

  // 绑定 ESC 关闭
  const escHandler = (e) => {
    if (e.key === "Escape") {
      onCancel?.();
      closeModal();
    }
  };
  document.addEventListener("keydown", escHandler);

  // 关闭函数
  function closeModal() {
    modal.classList.add("hidden");
    document.removeEventListener("keydown", escHandler);
  }
}
