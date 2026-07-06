/**
 * 书签白板 - AI 服务核心
 * 支持多种 AI 供应商
 */

// AI 供应商配置
const AI_PROVIDERS = {
  custom: {
    name: '自定义 API',
    i18nKey: 'ai_provider_custom',
    defaultUrl: 'http://localhost:8000',
    needApiKey: false,
    supportAutoModel: true,
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models'
  },
  lmstudio: {
    name: 'LM Studio',
    i18nKey: 'ai_provider_lmstudio',
    defaultUrl: 'http://localhost:1234',
    needApiKey: false,
    supportAutoModel: true,
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models',
    defaultModel: ''
  },
  openai: {
    name: 'OpenAI',
    i18nKey: 'ai_provider_openai',
    defaultUrl: 'https://api.openai.com/v1',
    needApiKey: true,
    defaultModel: 'gpt-4o',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models'
  },
  anthropic: {
    name: 'Anthropic',
    i18nKey: 'ai_provider_anthropic',
    defaultUrl: 'https://api.anthropic.com',
    needApiKey: true,
    defaultModel: 'claude-3-5-sonnet-20241022',
    chatEndpoint: '/v1/messages',
    modelsEndpoint: null
  },
  aliyun: {
    name: '阿里云',
    i18nKey: 'ai_provider_aliyun',
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    needApiKey: true,
    defaultModel: 'qwen-max',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    supportAutoModel: true
  },
  zhipu: {
    name: '智谱 AI',
    i18nKey: 'ai_provider_zhipu',
    defaultUrl: 'https://open.bigmodel.cn/api/paas/v4',
    needApiKey: true,
    defaultModel: 'glm-4',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: null
  },
  baidu: {
    name: '百度文心',
    i18nKey: 'ai_provider_baidu',
    defaultUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    needApiKey: true,
    defaultModel: 'ernie-bot-4',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: null
  },
  tencent: {
    name: '腾讯混元',
    i18nKey: 'ai_provider_tencent',
    defaultUrl: 'https://hunyuan.tencentcloudapi.com',
    needApiKey: true,
    defaultModel: 'hunyuan-standard',
    chatEndpoint: '/',
    modelsEndpoint: null
  },
  moonshot: {
    name: '月之暗面',
    i18nKey: 'ai_provider_moonshot',
    defaultUrl: 'https://api.moonshot.cn/v1',
    needApiKey: true,
    defaultModel: 'moonshot-v1-8k',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models'
  },
  google: {
    name: 'Google',
    i18nKey: 'ai_provider_google',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',
    needApiKey: true,
    defaultModel: 'gemini-1.5-pro',
    chatEndpoint: '/models/',
    modelsEndpoint: '/models',
    supportAutoModel: true
  }
};

class AIService {
  constructor(settings) {
    this.settings = settings;
    this.provider = settings.provider || 'custom';
    this.config = settings.config || {};
  }

  extractFinalAnswer(reasoning) {
    if (!reasoning) return '';
    
    const conclusionMarkers = [
      /最终答案[：:](.+)$/m,
      /结论[：:](.+)$/m,
      /结果[：:](.+)$/m,
      /答案[：:](.+)$/m,
      /推荐[：:](.+)$/m,
      /建议[：:](.+)$/m
    ];
    
    for (const marker of conclusionMarkers) {
      const match = reasoning.match(marker);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    const quoteMatch = reasoning.match(/["'""']['"]([^"'""']+)["'""']/g);
    if (quoteMatch && quoteMatch.length > 0) {
      const lastQuote = quoteMatch[quoteMatch.length - 1];
      return lastQuote.replace(/["'"""']/g, '').trim();
    }
    
    const sentences = reasoning.split(/[。！？\n]+/).filter(s => s.trim());
    if (sentences.length > 0) {
      return sentences.slice(-2).join('。').trim();
    }
    
    return reasoning.trim();
  }
  
  cleanAIOutput(content) {
    if (!content) return '';
    
    const thinkPatterns = [
      /<think>.*?<\/think>/gs,
      /<thinking>.*?<\/thinking>/gs,
      /<reasoning>.*?<\/reasoning>/gs,
      /思考过程[：:]?[^\n]*/g,
      /推理过程[：:]?[^\n]*/g,
      /分析过程[：:]?[^\n]*/g
    ];
    
    for (const pattern of thinkPatterns) {
      content = content.replace(pattern, '');
    }
    
    content = content.replace(/\s+/g, ' ').trim();
    content = content.replace(/^[，。！？、；："'"""'\s]+/, '');
    content = content.replace(/[，。！？、；："'"""'\s]+$/, '');
    
    if (content.length > 50) {
      content = content.substring(0, 50).trim();
      const lastSpace = content.lastIndexOf(' ');
      if (lastSpace > 30) {
        content = content.substring(0, lastSpace);
      }
    }
    
    return content;
  }

  async testConnection() {
    try {
      const provider = AI_PROVIDERS[this.provider];
      
      const response = await this.callAPI('你好，请回复"连接成功"');
      
      if (response && response.content) {
        return {
          success: true,
          message: `连接成功！模型: ${this.config.model || provider.defaultModel || 'default'}`,
          latency: response.latency
        };
      }
      
      return {
        success: false,
        message: 'API 返回格式不正确'
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error.message}`
      };
    }
  }

  async fetchModels() {
    try {
      const provider = AI_PROVIDERS[this.provider];
      const baseUrl = this.config.apiUrl || provider.defaultUrl;
      
      if (!baseUrl) {
        console.warn('API 地址未配置');
        return [];
      }
      
      if (!provider.supportAutoModel || !provider.modelsEndpoint) {
        console.warn('该供应商不支持自动获取模型列表');
        return [];
      }
      
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      let modelsUrl = `${cleanBaseUrl}${provider.modelsEndpoint}`;
      
      if (this.provider === 'google' && this.config.apiKey) {
        modelsUrl += `?key=${encodeURIComponent(this.config.apiKey)}`;
      }
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.provider !== 'google' && this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.warn('获取模型列表失败:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (this.provider === 'google' && data.models && Array.isArray(data.models)) {
        return data.models
          .map(model => model.name ? model.name.replace(/^models\//, '') : null)
          .filter(name => name && !name.includes('/versions/'));
      }
      
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(model => model.id);
      } else if (Array.isArray(data)) {
        return data;
      } else if (data.models && Array.isArray(data.models)) {
        return data.models;
      }
      
      return [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  async callAPI(prompt) {
    const startTime = Date.now();
    
    let response;
    
    switch(this.provider) {
      case 'custom':
      case 'lmstudio':
        response = await this.callCustomAPI(prompt);
        break;
      case 'openai':
        response = await this.callOpenAI(prompt);
        break;
      case 'anthropic':
        response = await this.callAnthropic(prompt);
        break;
      case 'google':
        response = await this.callGoogleAPI(prompt);
        break;
      default:
        response = await this.callGenericAPI(prompt);
    }
    
    const latency = Date.now() - startTime;
    
    return {
      ...response,
      latency
    };
  }

  async callCustomAPI(prompt) {
    const provider = AI_PROVIDERS[this.provider];
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    
    if (!baseUrl) {
      throw new Error('API 地址未配置');
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const chatEndpoint = provider.chatEndpoint || '/v1/chat/completions';
    const apiUrl = `${cleanBaseUrl}${chatEndpoint}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        max_tokens: 100,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const choice = data.choices?.[0];
    const message = choice?.message || {};
    
    let content = message.content || '';
    
    if (!content) {
      const reasoning = message.reasoning_content || message.reasoning || '';
      if (reasoning) {
        content = this.extractFinalAnswer(reasoning);
      }
    }
    
    if (!content) {
      content = data.content || data.text || data.response || JSON.stringify(data);
    }
    
    content = this.cleanAIOutput(content);
    
    return {
      content: content
    };
  }

  async callOpenAI(prompt) {
    const provider = AI_PROVIDERS.openai;
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    const apiKey = this.config.apiKey;
    const model = this.config.model || provider.defaultModel;
    
    if (!apiKey) {
      throw new Error('OpenAI 需要 API Key');
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = `${cleanBaseUrl}${provider.chatEndpoint}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || ''
    };
  }

  async callAnthropic(prompt) {
    const provider = AI_PROVIDERS.anthropic;
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    const apiKey = this.config.apiKey;
    const model = this.config.model || provider.defaultModel;
    
    if (!apiKey) {
      throw new Error('Anthropic 需要 API Key');
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = `${cleanBaseUrl}${provider.chatEndpoint}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || ''
    };
  }

  async callGoogleAPI(prompt) {
    const provider = AI_PROVIDERS.google;
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    const apiKey = this.config.apiKey;
    const model = this.config.model || provider.defaultModel;

    if (!apiKey) {
      throw new Error('Google Gemini 需要 API Key');
    }

    if (!baseUrl) {
      throw new Error('API 地址未配置');
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const chatEndpoint = `/models/${model}:generateContent`;
    const apiUrl = `${cleanBaseUrl}${chatEndpoint}?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = `HTTP ${response.status}: ${errorData.error.message}`;
        }
      } catch (e) {
        // JSON 解析失败，使用默认错误消息
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    let content = '';
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content?.parts && candidate.content.parts.length > 0) {
        content = candidate.content.parts.map(part => part.text || '').join('\n');
      }
    }

    content = this.cleanAIOutput(content);

    return {
      content: content
    };
  }

  async callGenericAPI(prompt) {
    const provider = AI_PROVIDERS[this.provider];
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    const apiKey = this.config.apiKey;
    const model = this.config.model || provider.defaultModel;
    
    if (provider.needApiKey && !apiKey) {
      throw new Error(`${provider.name} 需要 API Key`);
    }
    
    if (!baseUrl) {
      throw new Error('API 地址未配置');
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const chatEndpoint = provider.chatEndpoint || '/v1/chat/completions';
    const apiUrl = `${cleanBaseUrl}${chatEndpoint}`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || 
               data.content?.[0]?.text ||
               data.result ||
               data.response ||
               JSON.stringify(data)
    };
  }

  async optimizeTitle(title, url) {
    let prompt = this.settings.prompts?.titleOptimization ||
      `<task>
优化标题
:</task>

<input>
<title>{title}</title>
<url>{url}</url>
</input>

<rules>
- 只输出最终标题
- 禁止输出解释
- 保持核心含义不变
- 去除冗余信息（如"官网"、"首页"、"| 网站名"、"- 网站名"、促销信息、标签、标题等）
- 禁止输出多行
- 格式规范：主要关键词 - 次要描述
- 删除官网首页等无意义文本
- 删除重复网站名
- 长度限制15-25字符
- 只允许输出中文
</rules>

<output></output>`;
    
    prompt = prompt
      .replace(/{title}/g, title)
      .replace(/{url}/g, url)
      .replace(/{domain}/g, new URL(url).hostname)
      .replace(/{groupsText}/g, '');

    const response = await this.callAPI(prompt);
    return response.content.trim();
  }

  async suggestCategory(url, title, existingGroups = []) {
    const domain = new URL(url).hostname.replace('www.', '');
    const groupsText = existingGroups.length > 0 
      ? `现有分组：${existingGroups.join('、')}`
      : '当前没有分组，请推荐一个新的分组名称。';
    
    let prompt = this.settings.prompts?.categorySuggestion ||
      `<task>
智能书签分类
:</task>

<input>
<title>{title}</title>
<url>{url}</url>
<domain>{domain}</domain>
<existingGroups>{groupsText}</existingGroups>
</input>

<rules>
- 只输出分组名称
- 禁止输出解释
- 禁止输出推理
- 禁止输出分析
- 禁止输出多行
- 禁止输出引号
- 优先匹配现有分组
- 无匹配时创建新分组
- 分组名称2-6个中文字
</rules>

<output></output>`;
    
    prompt = prompt
      .replace(/{title}/g, title)
      .replace(/{url}/g, url)
      .replace(/{domain}/g, domain)
      .replace(/{groupsText}/g, groupsText);
    
    const response = await this.callAPI(prompt);
    return response.content.trim();
  }

  async generateTags(url, title) {
    const prompt = `你是一个标签生成专家。请为以下书签生成相关标签。

标题：${title}
网址：${url}

要求：
1. 生成 3-5 个标签
2. 使用中文
3. 用逗号分隔
4. 标签要准确描述内容
5. 只返回标签，不要任何其他内容

示例：前端,CSS,工具,教程,开源`;

    const response = await this.callAPI(prompt);
    return response.content.trim();
  }

  async generateSummary(url, title) {
    const prompt = `你是一个内容摘要专家。请为以下书签生成简短摘要。

标题：${title}
网址：${url}

要求：
1. 摘要长度控制在 30-50 字
2. 使用中文
3. 概括核心内容
4. 只返回摘要内容，不要任何其他内容`;

    const response = await this.callAPI(prompt);
    return response.content.trim();
  }

  async detectDuplicates(newBookmark, existingBookmarks) {
    const prompt = `你是一个数据质量检测专家。请检测以下书签是否与现有书签重复。

新书签：
- 标题：${newBookmark.title}
- 网址：${newBookmark.url}

现有书签（前10个）：
${existingBookmarks.slice(0, 10).map(b => `- ${b.title} (${b.url})`).join('\n')}

要求：
1. 检测网址是否相同或相似
2. 检测标题是否高度相似
3. 如果找到重复，返回重复的书签信息
4. 如果没有重复，返回"无重复"
5. 只返回结果，不要任何其他内容

格式：
- 有重复：重复：{书签标题} ({网址})
- 无重复：无重复`;

    const response = await this.callAPI(prompt);
    return response.content.trim();
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIService, AI_PROVIDERS };
}
