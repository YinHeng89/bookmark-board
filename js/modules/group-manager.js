/**
 * 分组管理模块
 * 负责分组的创建、编辑、删除和右键菜单
 */

class GroupManager {
  constructor(dataManager, modalManager, toastManager) {
    this.data = dataManager;
    this.modal = modalManager;
    this.toast = toastManager;
    // 右键菜单状态
    this._currentMenu = null;
    this._closeHandler = null;
  }

  /**
   * 关闭当前菜单并清理所有监听器
   */
  _closeMenu() {
    if (this._closeHandler) {
      document.removeEventListener('click', this._closeHandler, true);
      this._closeHandler = null;
    }
    if (this._currentMenu) {
      this._currentMenu.remove();
      this._currentMenu = null;
    }
  }

  /**
   * 创建新菜单（自动关闭旧菜单并清理监听器）
   * @returns {HTMLElement} menu 元素
   */
  _createMenu() {
    this._closeMenu();
    const menu = document.createElement('div');
    menu.className = 'group-select-menu';
    this._currentMenu = menu;

    // 全局关闭监听器（捕获阶段，避免 stopPropagation 干扰）
    this._closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        this._closeMenu();
      }
    };

    // 延迟绑定，避免当前右键/点击事件立即触发关闭
    setTimeout(() => {
      document.addEventListener('click', this._closeHandler, true);
    }, 0);

    return menu;
  }

  /**
   * 创建新分组
   */
  createGroup(onCreate) {
    this.modal.show({
      title: I18n.t('modal_new_group_title'),
      message: I18n.t('modal_new_group_message'),
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
          this.data.addGroup(newGroup);
          this.data.save();
          onCreate?.();
          this.toast.show(I18n.t('toast_group_created'));
        }
      }
    });
  }

  /**
   * 编辑分组
   */
  editGroup(groupId, onUpdate) {
    let group = this.data.groups.find(g => g.id === groupId);
    let isAutoGroup = false;
    
    if (!group && groupId.startsWith('auto_')) {
      const autoGroups = this.data.generateAutoGroups();
      group = autoGroups.find(g => g.id === groupId);
      isAutoGroup = true;
    }
    
    if (!group) return;
    
    this.modal.show({
      title: isAutoGroup ? I18n.t('modal_edit_auto_group_title') : I18n.t('modal_edit_group_title'),
      message: isAutoGroup ? I18n.t('modal_edit_auto_group_message') : I18n.t('modal_edit_group_message'),
      input: true,
      defaultValue: group.name.replace(/ \(\d+\)$/, ''),
      onConfirm: (name) => {
        if (name && name.trim()) {
          if (isAutoGroup) {
            this.data.autoGroupNames[groupId] = name.trim();
            this.data.saveAutoGroupNames();
            onUpdate?.();
            this.toast.show(I18n.t('toast_group_updated'));
          } else {
            group.name = name.trim();
            this.data.save();
            onUpdate?.();
            this.toast.show(I18n.t('toast_group_updated'));
          }
        }
      }
    });
  }

  /**
   * 删除分组
   */
  deleteGroup(groupId, activeGroupFilter, onDelete) {
    const group = this.data.groups.find(g => g.id === groupId);
    if (!group) return activeGroupFilter;
    
    this.modal.show({
      title: I18n.t('modal_confirm_delete_title'),
      message: I18n.t('settings_confirm_delete_group', group.name),
      onConfirm: () => {
        this.data.deleteGroup(groupId);
        
        let newActiveGroup = activeGroupFilter;
        if (activeGroupFilter === groupId) {
          newActiveGroup = 'all';
        }
        
        this.data.save();
        onDelete?.();
        this.toast.show(I18n.t('toast_group_deleted'));
        
        return newActiveGroup;
      }
    });
    
    return activeGroupFilter;
  }

  /**
   * 显示分组右键菜单
   */
  showGroupContextMenu(group, x, y, onAction) {
    const menu = this._createMenu();
    
    // 标题
    const title = document.createElement('div');
    title.className = 'group-select-menu-title';
    title.textContent = I18n.t('group_menu_title');
    menu.appendChild(title);
    
    const divider1 = document.createElement('div');
    divider1.className = 'group-select-divider';
    menu.appendChild(divider1);
    
    // 编辑选项
    const editItem = document.createElement('div');
    editItem.className = 'group-select-item';
    editItem.innerHTML = `
      <i class="fa fa-pencil"></i>
      <span>${I18n.t('group_menu_edit')}</span>
    `;
    editItem.addEventListener('click', () => {
      this._closeMenu();
      this.editGroup(group.id, onAction);
    });
    menu.appendChild(editItem);
    
    // 删除选项（只有自定义分组可以删除）
    if (!group.auto) {
      const deleteItem = document.createElement('div');
      deleteItem.className = 'group-select-item';
      deleteItem.style.color = '#EF4444';
      deleteItem.innerHTML = `
        <i class="fa fa-trash"></i>
        <span>${I18n.t('group_menu_delete')}</span>
      `;
      deleteItem.addEventListener('click', () => {
        this._closeMenu();
        this.deleteGroup(group.id, 'all', onAction);
      });
      menu.appendChild(deleteItem);
    }
    
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
    
    document.body.appendChild(menu);
  }

  /**
   * 显示书签右键菜单
   */
  showBookmarkContextMenu(link, x, y, onAction, onAIOptimize, bookmarkOps) {
    const menu = this._createMenu();
    
    // 标题
    const title = document.createElement('div');
    title.className = 'group-select-menu-title';
    title.textContent = I18n.t('card_menu_title');
    menu.appendChild(title);
    
    const divider1 = document.createElement('div');
    divider1.className = 'group-select-divider';
    menu.appendChild(divider1);
    
    // 置顶/取消置顶
    const pinItem = document.createElement('div');
    pinItem.className = 'group-select-item' + (link.pinned ? ' selected' : '');
    pinItem.innerHTML = `
      <i class="fa ${link.pinned ? 'fa-thumb-tack' : 'fa-thumb-tack'}"></i>
      <span>${link.pinned ? I18n.t('card_menu_unpin') : I18n.t('card_menu_pin')}</span>
    `;
    pinItem.addEventListener('click', () => {
      link.pinned = !link.pinned;
      this.data.save();
      onAction?.();
      this.toast.show(link.pinned ? I18n.t('card_menu_pinned') : I18n.t('card_menu_unpinned'));
      this._closeMenu();
    });
    menu.appendChild(pinItem);
    
    // 编辑选项
    const editItem = document.createElement('div');
    editItem.className = 'group-select-item';
    editItem.innerHTML = `
      <i class="fa fa-pencil"></i>
      <span>${I18n.t('card_menu_edit')}</span>
    `;
    editItem.addEventListener('click', () => {
      this._closeMenu();
      if (bookmarkOps) {
        bookmarkOps.editCard(link, onAction);
      }
    });
    menu.appendChild(editItem);
    
    // 选择分组（二级菜单）
    const groupMenuItem = document.createElement('div');
    groupMenuItem.className = 'group-select-item group-select-item-has-submenu';
    groupMenuItem.innerHTML = `
      <i class="fa fa-folder"></i>
      <span>${I18n.t('card_menu_select_group')}</span>
      <i class="fa fa-chevron-right" style="margin-left: auto; font-size: 0.75rem;"></i>
    `;
    
    const submenu = document.createElement('div');
    submenu.className = 'group-select-submenu';
    submenu.style.display = 'none';
    
    this.data.groups.forEach(group => {
      const item = document.createElement('div');
      item.className = 'group-select-item' + (link.groups.includes(group.id) ? ' selected' : '');
      item.innerHTML = `
        <i class="fa ${link.groups.includes(group.id) ? 'fa-check-circle' : 'fa-circle-o'}"></i>
        <span>${group.name}</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (link.groups.includes(group.id)) {
          link.groups = link.groups.filter(gId => gId !== group.id);
        } else {
          link.groups.push(group.id);
        }
        this.data.save();
        onAction?.();
        this.toast.show(I18n.t('card_menu_group_updated'));
        this._closeMenu();
      });
      submenu.appendChild(item);
    });
    
    if (this.data.groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'group-select-item';
      empty.style.color = 'var(--text-muted)';
      empty.style.cursor = 'default';
      empty.textContent = I18n.t('card_menu_no_group');
      submenu.appendChild(empty);
    }
    
    groupMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = submenu.style.display === 'block';
      if (isVisible) {
        submenu.style.display = 'none';
        groupMenuItem.classList.remove('selected');
      } else {
        const itemRect = groupMenuItem.getBoundingClientRect();
        submenu.style.display = 'block';
        submenu.style.left = (itemRect.right + 10) + 'px';
        submenu.style.top = itemRect.top + 'px';
        groupMenuItem.classList.add('selected');
      }
    });
    
    menu.appendChild(groupMenuItem);
    menu.appendChild(submenu);
    
    // AI 优化选项
    const aiItem = document.createElement('div');
    aiItem.className = 'group-select-item';
    aiItem.innerHTML = `
      <i class="fa fa-magic"></i>
      <span>${I18n.t('card_menu_ai_optimize')}</span>
    `;
    aiItem.addEventListener('click', async () => {
      this._closeMenu();
      await onAIOptimize?.(link);
    });
    menu.appendChild(aiItem);
    
    // 删除选项
    const deleteItem = document.createElement('div');
    deleteItem.className = 'group-select-item';
    deleteItem.style.color = '#EF4444';
    deleteItem.innerHTML = `
      <i class="fa fa-trash"></i>
      <span>${I18n.t('card_menu_delete')}</span>
    `;
    deleteItem.addEventListener('click', () => {
      this._closeMenu();
      if (bookmarkOps) {
        bookmarkOps.deleteCard(link, onAction);
      }
    });
    menu.appendChild(deleteItem);
    
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 400) + 'px';
    
    document.body.appendChild(menu);
  }
}

// 导出全局实例
const groupManager = new GroupManager(dataManager, modalManager, toastManager);
