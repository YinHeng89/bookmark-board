/**
 * AI 功能模块
 * 负责 AI 优化书签相关功能
 */

class AIIntegration {
  constructor(dataManager, toastManager) {
    this.data = dataManager;
    this.toast = toastManager;
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
   * 使用 AI 优化书签
   * @param {Object} link - 书签对象
   * @param {Object} aiSettings - AI 设置
   */
  async optimizeLinkWithAI(link, aiSettings) {
    // 检查 AI 服务是否加载
    if (typeof AIService === 'undefined') {
      console.warn('AIService 未定义，跳过 AI 优化');
      return;
    }
    
    // 检查 AI 是否启用
    if (!aiSettings || !aiSettings.provider || !aiSettings.config?.apiUrl) {
      return;
    }

    // 创建 AI 服务实例
    const aiService = new AIService(aiSettings);

    // 并行执行多个 AI 任务
    const tasks = [];

    // 1. 智能标题优化
    if (aiSettings.features?.titleOptimization?.manual) {
      tasks.push(
        aiService.optimizeTitle(link.title, link.url)
          .then(optimizedTitle => {
            if (optimizedTitle && optimizedTitle !== link.title) {
              link.title = optimizedTitle;
              this.showAILoading(link, '标题已优化');
            }
          })
          .catch(err => console.error('标题优化失败:', err))
      );
    }

    // 2. 智能分组建议
    if (aiSettings.features?.categorySuggestion?.manual) {
      // 提取分组名称列表
      const groupNames = this.data.groups.map(g => g.name || g).filter(Boolean);
      
      tasks.push(
        aiService.suggestCategory(link.url, link.title, groupNames)
          .then(suggestedGroup => {
            // 严格检查：必须是有效字符串
            if (suggestedGroup && 
                suggestedGroup !== 'undefined' && 
                suggestedGroup !== 'null' &&
                suggestedGroup !== '无重复' &&
                suggestedGroup.trim() !== '') {
              
              suggestedGroup = suggestedGroup.trim();
              
              // 查找或创建分组
              let targetGroup = this.data.groups.find(g => g.name === suggestedGroup);
              
              if (!targetGroup) {
                // 分组不存在，创建新分组
                targetGroup = {
                  id: 'group_' + Date.now(),
                  name: suggestedGroup
                };
                this.data.groups.push(targetGroup);
              }
              
              // 添加书签到分组（使用分组 ID，而不是名称）
              if (!link.groups) link.groups = [];
              if (!link.groups.includes(targetGroup.id)) {
                link.groups.push(targetGroup.id);
              }
              
              this.showAILoading(link, `已分类到: ${suggestedGroup}`);
            }
          })
          .catch(err => console.error('分类建议失败:', err))
      );
    }

    // 等待所有任务完成
    await Promise.allSettled(tasks);

    // 保存并重新渲染
    this.data.save();
  }

  /**
   * 手动 AI 优化书签
   * @param {Object} link - 书签对象
   * @param {Function} onOptimize - 优化后的回调
   */
  async aiOptimizeBookmark(link, onOptimize) {
    // 检查 AI 服务是否加载
    if (typeof AIService === 'undefined') {
      this.toast.show('AI 服务未加载，请刷新页面');
      return;
    }
    
    const aiSettings = await this.getAISettings();
    
    // 校验：检查 API 配置是否完整
    if (!aiSettings || !aiSettings.config?.apiUrl) {
      this.toast.show('请先在设置中配置 AI API 信息');
      return;
    }
    
    // 如果使用需要认证的供应商，检查 API Key
    const provider = aiSettings.provider || 'custom';
    const requiresApiKey = ['openai', 'anthropic', 'google', 'deepseek', 'moonshot'].includes(provider);
    
    if (requiresApiKey && !aiSettings.config?.apiKey) {
      this.toast.show(`请先在设置中填写 ${provider} 的 API Key`);
      return;
    }
    
    // 校验2：检查是否至少开启了一个手动功能
    const hasManualFeature = 
      aiSettings.features?.titleOptimization?.manual ||
      aiSettings.features?.categorySuggestion?.manual ||
      aiSettings.features?.generateSummary ||
      aiSettings.features?.smartSearch;
    
    if (!hasManualFeature) {
      this.toast.show('请先在设置中开启 AI 功能（手动优化/手动分组等）');
      return;
    }

    this.toast.show('正在 AI 优化...（请勿刷新页面）');

    try {
      const aiService = new AIService(aiSettings);
      
      // 优化标题（手动）
      if (aiSettings.features?.titleOptimization?.manual) {
        const optimizedTitle = await aiService.optimizeTitle(link.title, link.url);
        if (optimizedTitle && optimizedTitle !== link.title) {
          link.title = optimizedTitle;
        }
      }
      
      // 分类建议（手动）
      if (aiSettings.features?.categorySuggestion?.manual) {
        // 提取分组名称列表
        const groupNames = this.data.groups.map(g => g.name || g).filter(Boolean);
        
        const suggestedGroup = await aiService.suggestCategory(link.url, link.title, groupNames);
        
        // 严格检查
        if (suggestedGroup && 
            suggestedGroup !== 'undefined' && 
            suggestedGroup !== 'null' &&
            suggestedGroup !== '无重复' &&
            suggestedGroup.trim() !== '') {
          
          const trimmedGroup = suggestedGroup.trim();
          
          // 查找或创建分组
          let targetGroup = this.data.groups.find(g => g.name === trimmedGroup);
          
          if (!targetGroup) {
            targetGroup = {
              id: 'group_' + Date.now(),
              name: trimmedGroup
            };
            this.data.groups.push(targetGroup);
          }
          
          // 添加书签到分组（使用分组 ID）
          if (!link.groups) link.groups = [];
          if (!link.groups.includes(targetGroup.id)) {
            link.groups.push(targetGroup.id);
          }
        }
      }
      
      this.data.save();
      onOptimize?.();
      this.toast.show('AI 优化完成！');
    } catch (error) {
      this.toast.show('AI 优化失败: ' + error.message);
    }
  }

  /**
   * 显示 AI 加载状态
   * @param {Object} link - 书签对象
   * @param {string} message - 提示消息
   */
  showAILoading(link, message) {
    // 在书签卡片上显示 AI 优化提示
    const card = document.querySelector(`[data-url="${link.url}"]`);
    if (card) {
      // 创建 AI 提示标签
      const aiBadge = document.createElement('div');
      aiBadge.className = 'ai-badge';
      aiBadge.innerHTML = `<i class="fa fa-magic"></i> ${message}`;
      
      // 添加到卡片
      const cardInner = card.querySelector('.card-inner');
      if (cardInner) {
        cardInner.appendChild(aiBadge);
        
        // 3秒后自动消失
        setTimeout(() => {
          aiBadge.style.opacity = '0';
          setTimeout(() => aiBadge.remove(), 300);
        }, 3000);
      }
    }
  }
}

// 导出全局实例
const aiIntegration = new AIIntegration(dataManager, toastManager);
