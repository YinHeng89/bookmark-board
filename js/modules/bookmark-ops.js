/**
 * 书签操作模块
 * 负责书签的添加、编辑、删除等操作
 */

class BookmarkOperations {
  constructor(dataManager, modalManager, toastManager) {
    this.data = dataManager;
    this.modal = modalManager;
    this.toast = toastManager;
  }

  async addLinkFromUrl(url, draggedTitle = null, onAdd) {
    // 检查是否已存在
    if (this.data.linkExists(url)) {
      this.toast.show(I18n.t('toast_link_exists'));
      return;
    }

    // 提取标题和图标
    let title = '';
    let icon = '';
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      
      if (draggedTitle) {
        title = draggedTitle.length > 50 ? draggedTitle.substring(0, 50) + '...' : draggedTitle;
      } else {
        title = hostname.length > 30 ? hostname.substring(0, 30) + '...' : hostname;
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      
      const domain = urlObj.hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
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

    // 如果开启了 AI 自动优化功能，异步调用 AI 优化
    const aiSettings = await this.getAISettings();
    let shouldWaitForAI = false;
    
    if (aiSettings && aiSettings.features && aiSettings.config?.apiUrl) {
      if (typeof AIService !== 'undefined') {
        const aiService = new AIService(aiSettings);
        const autoTasks = [];
        
        if (aiSettings.features.titleOptimization?.auto) {
          shouldWaitForAI = true;
          autoTasks.push(
            aiService.optimizeTitle(newLink.title, newLink.url)
              .then(optimizedTitle => {
                if (optimizedTitle && optimizedTitle !== newLink.title) {
                  newLink.title = optimizedTitle;
                  console.log('✅ 自动标题优化成功:', optimizedTitle);
                }
              })
              .catch(err => console.error('自动标题优化失败:', err))
          );
        }
        
        if (aiSettings.features.categorySuggestion?.auto) {
          shouldWaitForAI = true;
          const groupNames = this.data.groups.map(g => g.name || g).filter(Boolean);
          autoTasks.push(
            aiService.suggestCategory(newLink.url, newLink.title, groupNames)
              .then(suggestedGroup => {
                if (suggestedGroup && 
                    suggestedGroup !== 'undefined' && 
                    suggestedGroup !== 'null' &&
                    suggestedGroup !== '无重复' &&
                    suggestedGroup.trim() !== '') {
                  
                  suggestedGroup = suggestedGroup.trim();
                  
                  let targetGroup = this.data.groups.find(g => g.name === suggestedGroup);
                  
                  if (!targetGroup) {
                    targetGroup = {
                      id: 'group_' + Date.now(),
                      name: suggestedGroup
                    };
                    this.data.groups.push(targetGroup);
                    console.log('✅ 创建新分组:', suggestedGroup);
                  }
                  
                  if (!newLink.groups) newLink.groups = [];
                  if (!newLink.groups.includes(targetGroup.id)) {
                    newLink.groups.push(targetGroup.id);
                    console.log('✅ 自动分类成功:', suggestedGroup);
                  }
                }
              })
              .catch(err => console.error('自动分类建议失败:', err))
          );
        }
        
        if (autoTasks.length > 0) {
          await Promise.allSettled(autoTasks);
          console.log('✅ AI 自动优化完成');
        }
      }
    }

    // 添加书签并保存
    this.data.addLink(newLink);
    this.data.save();
    
    if (shouldWaitForAI) {
      this.toast.show(I18n.t('toast_link_added_ai', newLink.title));
    } else {
      this.toast.show(I18n.t('toast_link_added', title));
    }
    
    onAdd?.();
  }

  /**
   * 编辑书签
   */
  editCard(link, onUpdate) {
    this.modal.show({
      title: I18n.t('modal_edit_bookmark_title'),
      message: I18n.t('modal_edit_bookmark_message'),
      input: true,
      defaultValue: link.title,
      onConfirm: (newTitle) => {
        if (newTitle) {
          link.title = newTitle;
          this.data.save();
          onUpdate?.();
          this.toast.show(I18n.t('toast_bookmark_updated'));
        }
      }
    });
  }

  /**
   * 删除书签
   */
  deleteCard(link, onDelete) {
    this.modal.show({
      title: I18n.t('modal_confirm_delete_title'),
      message: I18n.t('modal_confirm_delete_bookmark', link.title),
      onConfirm: () => {
        this.data.deleteLink(link.url);
        this.data.save(() => {
          onDelete?.();
          this.toast.show(I18n.t('toast_bookmark_deleted'));
        });
      }
    });
  }

  /**
   * 获取 AI 设置
   */
  async getAISettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiSettings'], (result) => {
        resolve(result.aiSettings || null);
      });
    });
  }

  /**
   * 导入数据
   */
  async importData(file, onImport) {
    try {
      this.toast.show(I18n.t('data_import_reading'));
      
      const text = await file.text();
      const decryptedData = await this.decryptImportData(text);
      const importObj = JSON.parse(decryptedData);
      
      if (!importObj.links || !importObj.groups) {
        throw new Error(I18n.t('data_import_invalid'));
      }
      
      this.modal.show({
        title: I18n.t('modal_confirm_import_title'),
        message: I18n.t('data_import_overwrite', String(importObj.links.length), String(importObj.groups.length)),
        onConfirm: async () => {
          try {
            this.toast.show(I18n.t('data_import_importing'));
            
            this.data.links = importObj.links || [];
            this.data.groups = importObj.groups || [];
            this.data.autoGroupNames = importObj.autoGroupNames || {};
            
            if (importObj.settings) {
              if (importObj.settings.darkMode !== undefined) {
                chrome.storage.local.set({ darkMode: importObj.settings.darkMode });
              }
            }
            
            this.data.save(() => {
              this.toast.show(I18n.t('data_import_success'));
              onImport?.();
            });
          } catch (error) {
            console.error('导入数据失败:', error);
            this.toast.show(I18n.t('data_import_failed', error.message));
          }
        }
      });
    } catch (error) {
      console.error('导入失败:', error);
      this.toast.show(I18n.t('data_import_corrupt'));
    }
  }

  /**
   * 解密导入数据
   */
  async decryptImportData(encryptedText) {
    try {
      const encrypted = JSON.parse(encryptedText);
      if (!encrypted.v || !encrypted.d) {
        throw new Error(I18n.t('data_encrypt_invalid'));
      }
      
      const key = 'bookmark-board-2026';
      
      const xorLatin1 = atob(encrypted.d);
      const xorBytes = new Uint8Array(xorLatin1.length);
      for (let i = 0; i < xorLatin1.length; i++) {
        xorBytes[i] = xorLatin1.charCodeAt(i);
      }
      const xorResult = new TextDecoder().decode(xorBytes);
      
      const base64Str = xorResult.split('').map((char, i) => {
        return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
      }).join('');
      
      const latin1Str = atob(base64Str);
      
      const utf8Bytes = new Uint8Array(latin1Str.length);
      for (let i = 0; i < latin1Str.length; i++) {
        utf8Bytes[i] = latin1Str.charCodeAt(i);
      }
      
      return new TextDecoder().decode(utf8Bytes);
    } catch (error) {
      throw new Error(I18n.t('data_decrypt_failed'));
    }
  }
}

// 导出全局实例
const bookmarkOps = new BookmarkOperations(dataManager, modalManager, toastManager);
