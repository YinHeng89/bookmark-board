/**
 * UI 渲染模块
 * 负责书签卡片、分组标签等 UI 元素的渲染
 */

class UIRenderer {
  constructor(dataManager) {
    this.data = dataManager;
  }

  /**
   * 渲染分组标签
   */
  renderGroups(containerSelector, activeGroupFilter, onGroupClick, onGroupContextMenu) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // 保留"全部"标签，移除其他
    const allTab = container.querySelector('[data-group="all"]');
    container.innerHTML = '';
    if (allTab) {
      container.appendChild(allTab);
    } else {
      // 如果"全部"标签不存在，创建它
      const allTabNew = document.createElement('button');
      allTabNew.className = 'group-tab' + (activeGroupFilter === 'all' ? ' active' : '');
      allTabNew.dataset.group = 'all';
      allTabNew.innerHTML = '<i class="fa fa-th"></i><span>' + I18n.t('group_tab_all') + '</span>';
      container.appendChild(allTabNew);
    }
    
    // 自动生成分组
    const autoGroups = this.data.generateAutoGroups();
    
    // 合并自动分组和自定义分组
    const allGroups = [...autoGroups, ...this.data.groups];
    
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
        count = group.count || 0;
      } else {
        count = this.data.links.filter(link => link.groups && link.groups.includes(group.id)).length;
      }
      
      // 显示名称
      const displayName = (group.name || I18n.t('unnamed')).replace(/ \(\d+\)$/, '');
      const nameHtml = `<span>${displayName}</span>`;
      const countHtml = count > 0 ? `<span class="group-count">${count}</span>` : '';
      
      tab.innerHTML = iconHtml + nameHtml + countHtml;
      
      // 右键菜单
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onGroupContextMenu?.(group, e.clientX, e.clientY);
      });
      
      container.appendChild(tab);
    });
    
    // 添加"+"按钮
    const addGroupBtn = document.createElement('button');
    addGroupBtn.id = 'addGroupBtn';
    addGroupBtn.className = 'add-group-btn';
    addGroupBtn.title = I18n.t('group_tab_create');
    addGroupBtn.innerHTML = '<i class="fa fa-plus"></i>';
    container.appendChild(addGroupBtn);
    
    // 更新"全部"标签的激活状态
    const currentAllTab = container.querySelector('[data-group="all"]');
    if (currentAllTab) {
      currentAllTab.className = 'group-tab' + (activeGroupFilter === 'all' ? ' active' : '');
    }
  }

  /**
   * 渲染书签卡片到指定容器
   */
  renderBookmarkCards(boardEl, links, options = {}) {
    const { 
      onCardClick, 
      onCardContextMenu,
      emptyStateElement,
      emptyStatePinnedElement,
      emptyStateRecentElement,
      currentView = 'all'
    } = options;

    // 统计
    const pinnedLinks = links.filter(link => link.pinned);
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentLinks = links.filter(link => 
      !link.pinned && link.createdAt && link.createdAt > sevenDaysAgo
    );
    
    // 更新计数
    const allCount = document.getElementById('allCount');
    const pinnedCount = document.getElementById('pinnedCount');
    const recentCount = document.getElementById('recentCount');
    
    if (allCount) allCount.textContent = links.length;
    if (pinnedCount) pinnedCount.textContent = pinnedLinks.length;
    if (recentCount) recentCount.textContent = recentLinks.length;
    
    // 根据当前视图过滤
    let displayLinks = links;
    if (currentView === 'pinned') {
      displayLinks = pinnedLinks;
    } else if (currentView === 'recent') {
      displayLinks = recentLinks;
    }
    
    // 清空现有卡片（保留所有空状态）
    Array.from(boardEl.children).forEach(child => {
      if (child !== emptyStateElement && 
          child !== emptyStatePinnedElement && 
          child !== emptyStateRecentElement) {
        child.remove();
      }
    });
    
    // 根据当前视图显示/隐藏对应的空状态
    if (currentView === 'pinned') {
      emptyStateElement?.classList.add('hidden');
      emptyStateRecentElement?.classList.add('hidden');
      emptyStatePinnedElement?.classList.toggle('hidden', displayLinks.length > 0);
    } else if (currentView === 'recent') {
      emptyStateElement?.classList.add('hidden');
      emptyStatePinnedElement?.classList.add('hidden');
      emptyStateRecentElement?.classList.toggle('hidden', displayLinks.length > 0);
    } else {
      emptyStatePinnedElement?.classList.add('hidden');
      emptyStateRecentElement?.classList.add('hidden');
      emptyStateElement?.classList.toggle('hidden', displayLinks.length > 0);
    }
    
    // 添加卡片
    displayLinks.forEach(link => {
      const card = this.createBookmarkCard(link, {
        onCardClick,
        onCardContextMenu
      });
      boardEl.appendChild(card);
    });
  }

  /**
   * 创建书签卡片
   */
  createBookmarkCard(link, options = {}) {
    const { onCardClick, onCardContextMenu } = options;
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
        const group = this.data.groups.find(g => g.id === groupId);
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
    
    // 显示点击统计
    const statsDiv = document.createElement('div');
    statsDiv.className = 'card-stats';
    const clickCount = link.clickCount || 0;
    const lastAccessText = link.lastAccessed ? I18n.formatTimeAgo(link.lastAccessed) : I18n.t('time_never');
    statsDiv.innerHTML = `
      <span class="stat-item">
        <i class="fa fa-eye"></i> ${I18n.t('settings_view_count', String(clickCount))}
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
      onCardClick?.(link);
    });
    
    // 右键菜单
    inner.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onCardContextMenu?.(link, e.clientX, e.clientY);
    });

    return card;
  }

  /**
   * 添加"手动添加"卡片
   */
  addAddCard(boardEl, onClick) {
    const card = document.createElement('div');
    card.className = 'add-card';
    
    const inner = document.createElement('div');
    inner.className = 'add-card-inner';
    inner.addEventListener('click', onClick);
    
    const icon = document.createElement('i');
    icon.className = 'fa fa-plus add-icon';
    
    const text = document.createElement('span');
    text.className = 'add-text';
    text.textContent = I18n.t('add_card_text');
    
    inner.appendChild(icon);
    inner.appendChild(text);
    card.appendChild(inner);
    boardEl.appendChild(card);
  }

  /**
   * 显示默认 SVG 图标
   */
  showDefaultIcon(container, title) {
    const initial = title ? title.charAt(0).toUpperCase() : '?';
    
    const svgIcon = document.createElement('div');
    svgIcon.className = 'default-svg-icon';
    svgIcon.innerHTML = `
      <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-${initial}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r="28" fill="url(#grad-${initial})" />
        <text x="30" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
      </svg>
    `;
    
    container.appendChild(svgIcon);
  }

  /**
   * 格式化时间（委托给 I18n）
   */
  formatTimeAgo(timestamp) {
    return I18n.formatTimeAgo(timestamp);
  }
}

// 导出全局实例（依赖 dataManager）
const uiRenderer = new UIRenderer(dataManager);
