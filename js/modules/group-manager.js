/**
 * 分组管理模块
 * 负责分组的创建、编辑、删除和右键菜单
 */

class GroupManager {
  constructor(dataManager, modalManager, toastManager) {
    this.data = dataManager;
    this.modal = modalManager;
    this.toast = toastManager;
  }

  /**
   * 创建新分组
   * @param {Function} onCreate - 创建后的回调
   */
  createGroup(onCreate) {
    this.modal.show({
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
          this.data.addGroup(newGroup);
          this.data.save();
          onCreate?.();
          this.toast.show('分组已创建');
        }
      }
    });
  }

  /**
   * 编辑分组
   * @param {string} groupId - 分组 ID
   * @param {Function} onUpdate - 更新后的回调
   */
  editGroup(groupId, onUpdate) {
    // 查找分组（包括自动分组和自定义分组）
    let group = this.data.groups.find(g => g.id === groupId);
    let isAutoGroup = false;
    
    // 如果是自动分组，从自动分组中查找
    if (!group && groupId.startsWith('auto_')) {
      const autoGroups = this.data.generateAutoGroups();
      group = autoGroups.find(g => g.id === groupId);
      isAutoGroup = true;
    }
    
    if (!group) return;
    
    this.modal.show({
      title: isAutoGroup ? '编辑分组名称' : '编辑分组',
      message: isAutoGroup ? '修改显示名称（不影响域名筛选）：' : '修改分组名称：',
      input: true,
      defaultValue: group.name.replace(/ \(\d+\)$/, ''),  // 移除计数
      onConfirm: (name) => {
        if (name && name.trim()) {
          if (isAutoGroup) {
            // 自动分组：存储自定义名称
            this.data.autoGroupNames[groupId] = name.trim();
            // 保存到 storage
            this.data.saveAutoGroupNames();
            onUpdate?.();
            this.toast.show('分组名称已更新');
          } else {
            // 自定义分组：正常保存
            group.name = name.trim();
            this.data.save();
            onUpdate?.();
            this.toast.show('分组已更新');
          }
        }
      }
    });
  }

  /**
   * 删除分组
   * @param {string} groupId - 分组 ID
   * @param {string} activeGroupFilter - 当前激活的分组
   * @param {Function} onDelete - 删除后的回调
   * @returns {string} 新的激活分组
   */
  deleteGroup(groupId, activeGroupFilter, onDelete) {
    const group = this.data.groups.find(g => g.id === groupId);
    if (!group) return activeGroupFilter;
    
    this.modal.show({
      title: '确认删除',
      message: `确定要删除分组 "${group.name}" 吗？\n分组内的书签不会被删除。`,
      onConfirm: () => {
        this.data.deleteGroup(groupId);
        
        // 如果当前正在查看该分组，切换回"全部"
        let newActiveGroup = activeGroupFilter;
        if (activeGroupFilter === groupId) {
          newActiveGroup = 'all';
        }
        
        this.data.save();
        onDelete?.();
        this.toast.show('分组已删除');
        
        return newActiveGroup;
      }
    });
    
    return activeGroupFilter;
  }

  /**
   * 显示分组右键菜单
   * @param {Object} group - 分组对象
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {Function} onAction - 操作后的回调
   */
  showGroupContextMenu(group, x, y, onAction) {
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
      this.editGroup(group.id, onAction);
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
        this.deleteGroup(group.id, 'all', onAction);
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

  /**
   * 显示书签右键菜单
   * @param {Object} link - 书签对象
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {Function} onAction - 操作后的回调
   * @param {Function} onAIOptimize - AI 优化回调
   * @param {Object} bookmarkOps - 书签操作模块实例
   */
  showBookmarkContextMenu(link, x, y, onAction, onAIOptimize, bookmarkOps) {
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
      this.data.save();
      onAction?.();
      this.toast.show(link.pinned ? '书签已置顶' : '已取消置顶');
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
      menu.remove();
      // 调用 bookmarkOps.editCard
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
      <span>选择分组</span>
      <i class="fa fa-chevron-right" style="margin-left: auto; font-size: 0.75rem;"></i>
    `;
    
    // 创建二级菜单
    const submenu = document.createElement('div');
    submenu.className = 'group-select-submenu';
    submenu.style.display = 'none';
    
    // 分组选项
    this.data.groups.forEach(group => {
      const item = document.createElement('div');
      item.className = 'group-select-item' + (link.groups.includes(group.id) ? ' selected' : '');
      item.innerHTML = `
        <i class="fa ${link.groups.includes(group.id) ? 'fa-check-circle' : 'fa-circle-o'}"></i>
        <span>${group.name}</span>
      `;
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        // 切换分组
        if (link.groups.includes(group.id)) {
          link.groups = link.groups.filter(gId => gId !== group.id);
        } else {
          link.groups.push(group.id);
        }
        
        this.data.save();
        onAction?.();
        this.toast.show('分组已更新');
        // 更新选中状态
        item.classList.toggle('selected');
        const icon = item.querySelector('i');
        icon.className = link.groups.includes(group.id) ? 'fa fa-check-circle' : 'fa fa-circle-o';
      });
      
      submenu.appendChild(item);
    });
    
    // 如果没有分组，显示提示
    if (this.data.groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'group-select-item';
      empty.style.color = 'var(--text-muted)';
      empty.style.cursor = 'default';
      empty.textContent = '暂无分组，请先创建';
      submenu.appendChild(empty);
    }
    
    // 点击"选择分组"显示/隐藏二级菜单
    groupMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = submenu.style.display === 'block';
      
      if (isVisible) {
        submenu.style.display = 'none';
        groupMenuItem.classList.remove('selected');
      } else {
        // 计算二级菜单位置
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
      <span>AI 优化</span>
    `;
    
    aiItem.addEventListener('click', async () => {
      menu.remove();
      await onAIOptimize?.(link);
    });
    
    menu.appendChild(aiItem);
    
    // 删除选项
    const deleteItem = document.createElement('div');
    deleteItem.className = 'group-select-item';
    deleteItem.style.color = '#EF4444';
    deleteItem.innerHTML = `
      <i class="fa fa-trash"></i>
      <span>删除书签</span>
    `;
    
    deleteItem.addEventListener('click', () => {
      menu.remove();
      // 调用 bookmarkOps.deleteCard
      if (bookmarkOps) {
        bookmarkOps.deleteCard(link, onAction);
      }
    });
    
    menu.appendChild(deleteItem);
    
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
}

// 导出全局实例
const groupManager = new GroupManager(dataManager, modalManager, toastManager);
