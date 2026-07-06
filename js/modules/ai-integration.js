/**
 * AI 功能模块
 * 负责 AI 优化书签相关功能
 */

class AIIntegration {
  constructor(dataManager, toastManager) {
    this.data = dataManager;
    this.toast = toastManager;
  }

  async getAISettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiSettings'], (result) => {
        resolve(result.aiSettings || null);
      });
    });
  }

  async optimizeLinkWithAI(link, aiSettings) {
    if (typeof AIService === 'undefined') {
      console.warn('AIService 未定义，跳过 AI 优化');
      return;
    }
    
    if (!aiSettings || !aiSettings.provider || !aiSettings.config?.apiUrl) {
      return;
    }

    const aiService = new AIService(aiSettings);
    const tasks = [];

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

    if (aiSettings.features?.categorySuggestion?.manual) {
      const groupNames = this.data.groups.map(g => g.name || g).filter(Boolean);
      
      tasks.push(
        aiService.suggestCategory(link.url, link.title, groupNames)
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
              }
              
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

    await Promise.allSettled(tasks);
    this.data.save();
  }

  async aiOptimizeBookmark(link, onOptimize) {
    if (typeof AIService === 'undefined') {
      this.toast.show(I18n.t('toast_ai_no_service'));
      return;
    }
    
    const aiSettings = await this.getAISettings();
    
    if (!aiSettings || !aiSettings.config?.apiUrl) {
      this.toast.show(I18n.t('toast_ai_no_config'));
      return;
    }
    
    const provider = aiSettings.provider || 'custom';
    const requiresApiKey = ['openai', 'anthropic', 'google', 'deepseek', 'moonshot'].includes(provider);
    
    if (requiresApiKey && !aiSettings.config?.apiKey) {
      this.toast.show(I18n.t('toast_ai_no_key', provider));
      return;
    }
    
    const hasManualFeature = 
      aiSettings.features?.titleOptimization?.manual ||
      aiSettings.features?.categorySuggestion?.manual ||
      aiSettings.features?.generateSummary ||
      aiSettings.features?.smartSearch;
    
    if (!hasManualFeature) {
      this.toast.show(I18n.t('toast_ai_no_features'));
      return;
    }

    this.toast.show(I18n.t('toast_ai_optimizing'));

    try {
      const aiService = new AIService(aiSettings);
      
      if (aiSettings.features?.titleOptimization?.manual) {
        const optimizedTitle = await aiService.optimizeTitle(link.title, link.url);
        if (optimizedTitle && optimizedTitle !== link.title) {
          link.title = optimizedTitle;
        }
      }
      
      if (aiSettings.features?.categorySuggestion?.manual) {
        const groupNames = this.data.groups.map(g => g.name || g).filter(Boolean);
        const suggestedGroup = await aiService.suggestCategory(link.url, link.title, groupNames);
        
        if (suggestedGroup && 
            suggestedGroup !== 'undefined' && 
            suggestedGroup !== 'null' &&
            suggestedGroup !== '无重复' &&
            suggestedGroup.trim() !== '') {
          
          const trimmedGroup = suggestedGroup.trim();
          
          let targetGroup = this.data.groups.find(g => g.name === trimmedGroup);
          
          if (!targetGroup) {
            targetGroup = {
              id: 'group_' + Date.now(),
              name: trimmedGroup
            };
            this.data.groups.push(targetGroup);
          }
          
          if (!link.groups) link.groups = [];
          if (!link.groups.includes(targetGroup.id)) {
            link.groups.push(targetGroup.id);
          }
        }
      }
      
      this.data.save();
      onOptimize?.();
      this.toast.show(I18n.t('toast_ai_done'));
    } catch (error) {
      this.toast.show(I18n.t('toast_ai_failed', error.message));
    }
  }

  showAILoading(link, message) {
    const card = document.querySelector(`[data-url="${link.url}"]`);
    if (card) {
      const aiBadge = document.createElement('div');
      aiBadge.className = 'ai-badge';
      aiBadge.innerHTML = `<i class="fa fa-magic"></i> ${message}`;
      
      const cardInner = card.querySelector('.card-inner');
      if (cardInner) {
        cardInner.appendChild(aiBadge);
        
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
