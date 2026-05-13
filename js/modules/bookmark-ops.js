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

  /**
   * 从 URL 添加书签
   * @param {string} url - 网址
   * @param {string} draggedTitle - 拖拽带来的标题（可选）
   * @param {Function} onAdd - 添加成功后的回调
   */
  async addLinkFromUrl(url, draggedTitle = null, onAdd) {
    // 检查是否已存在
    if (this.data.linkExists(url)) {
      this.toast.show('该链接已存在');
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
      
      // 获取 favicon
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
      // 检查 AI 服务是否加载
      if (typeof AIService !== 'undefined') {
        const aiService = new AIService(aiSettings);
        const autoTasks = [];
        
        // 自动标题优化
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
        
        // 自动分类建议
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
                  
                  // 查找或创建分组
                  let targetGroup = this.data.groups.find(g => g.name === suggestedGroup);
                  
                  if (!targetGroup) {
                    targetGroup = {
                      id: 'group_' + Date.now(),
                      name: suggestedGroup
                    };
                    this.data.groups.push(targetGroup);
                    console.log('✅ 创建新分组:', suggestedGroup);
                  }
                  
                  // 添加书签到分组
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
        
        // 如果有自动优化任务，等待完成后再保存
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
      this.toast.show(`已添加书签: ${newLink.title} (AI 优化)`);
    } else {
      this.toast.show(`已添加书签: ${title}`);
    }
    
    onAdd?.();
  }

  /**
   * 编辑书签
   * @param {Object} link - 书签对象
   * @param {Function} onUpdate - 更新后的回调
   */
  editCard(link, onUpdate) {
    this.modal.show({
      title: '编辑书签',
      message: '修改书签名称：',
      input: true,
      defaultValue: link.title,
      onConfirm: (newTitle) => {
        if (newTitle) {
          link.title = newTitle;
          this.data.save();
          onUpdate?.();
          this.toast.show('已更新书签名称');
        }
      }
    });
  }

  /**
   * 删除书签
   * @param {Object} link - 书签对象
   * @param {Function} onDelete - 删除后的回调
   */
  deleteCard(link, onDelete) {
    this.modal.show({
      title: '确认删除',
      message: `确定要删除书签 "${link.title}" 吗？`,
      onConfirm: () => {
        this.data.deleteLink(link.url);
        this.data.save(() => {
          onDelete?.();
          this.toast.show('书签已删除');
        });
      }
    });
  }

  /**
   * 获取 AI 设置
   * @returns {Promise<Object|null>}
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
   * @param {File} file - 导入的文件
   * @param {Function} onImport - 导入成功后的回调
   */
  async importData(file, onImport) {
    try {
      this.toast.show('正在读取文件...');
      
      // 读取文件
      const text = await file.text();
      
      // 解密数据
      const decryptedData = await this.decryptImportData(text);
      
      // 解析JSON
      const importObj = JSON.parse(decryptedData);
      
      // 验证数据
      if (!importObj.links || !importObj.groups) {
        throw new Error('数据格式不正确');
      }
      
      // 确认导入
      this.modal.show({
        title: '确认导入',
        message: `导入将覆盖当前所有数据！\n书签: ${importObj.links.length} 个\n分组: ${importObj.groups.length} 个\n\n确定要继续吗？`,
        onConfirm: async () => {
          try {
            this.toast.show('正在导入数据...');
            
            // 导入数据
            this.data.links = importObj.links || [];
            this.data.groups = importObj.groups || [];
            this.data.autoGroupNames = importObj.autoGroupNames || {};
            
            // 导入设置
            if (importObj.settings) {
              if (importObj.settings.darkMode !== undefined) {
                chrome.storage.local.set({ darkMode: importObj.settings.darkMode });
              }
            }
            
            // 保存到本地
            this.data.save(() => {
              this.toast.show('数据导入成功！');
              onImport?.();
            });
          } catch (error) {
            console.error('导入数据失败:', error);
            this.toast.show('导入数据失败: ' + error.message);
          }
        }
      });
    } catch (error) {
      console.error('导入失败:', error);
      this.toast.show('导入失败: ' + (error.message || '文件格式错误或数据已损坏'));
    }
  }

  /**
   * 解密导入数据
   * @param {string} encryptedText - 加密文本
   * @returns {Promise<string>} 解密后的文本
   */
  async decryptImportData(encryptedText) {
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
}

// 导出全局实例
const bookmarkOps = new BookmarkOperations(dataManager, modalManager, toastManager);
