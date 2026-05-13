/**
 * 书签白板 - AI 服务核心
 * 支持多种 AI 供应商
 */

// AI 供应商配置
const AI_PROVIDERS = {
  custom: {
    name: '自定义 API',
    defaultUrl: 'http://localhost:8000',
    needApiKey: false,
    supportAutoModel: true,  // 支持自动获取模型列表
    chatEndpoint: '/v1/chat/completions',  // 聊天接口路径
    modelsEndpoint: '/v1/models'  // 模型列表接口路径
  },
  lmstudio: {
    name: 'LM Studio',
    defaultUrl: 'http://localhost:1234',
    needApiKey: false,
    supportAutoModel: true,
    chatEndpoint: '/v1/chat/completions',
    modelsEndpoint: '/v1/models',
    defaultModel: ''  // 由用户自行选择
  },
  openai: {
    name: 'OpenAI',
    defaultUrl: 'https://api.openai.com/v1',  // ✅ 官方基础 URL
    needApiKey: true,
    defaultModel: 'gpt-4o',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models'
  },
  anthropic: {
    name: 'Anthropic',
    defaultUrl: 'https://api.anthropic.com',  // ✅ 官方基础 URL（不带 /v1）
    needApiKey: true,
    defaultModel: 'claude-3-5-sonnet-20241022',
    chatEndpoint: '/v1/messages',
    modelsEndpoint: null  // Anthropic 不支持模型列表 API
  },
  aliyun: {
    name: '阿里云',
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',  // ✅ OpenAI 兼容接口
    needApiKey: true,
    defaultModel: 'qwen-max',
    chatEndpoint: '/chat/completions',  // OpenAI 兼容端点
    modelsEndpoint: '/models',  // OpenAI 兼容接口支持获取模型列表
    supportAutoModel: true
  },
  zhipu: {
    name: '智谱 AI',
    defaultUrl: 'https://open.bigmodel.cn/api/paas/v4',  // ✅ 官方基础 URL
    needApiKey: true,
    defaultModel: 'glm-4',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: null
  },
  baidu: {
    name: '百度文心',
    defaultUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',  // ✅ 官方基础 URL
    needApiKey: true,
    defaultModel: 'ernie-bot-4',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: null
  },
  tencent: {
    name: '腾讯混元',
    defaultUrl: 'https://hunyuan.tencentcloudapi.com',  // ✅ 官方基础 URL
    needApiKey: true,
    defaultModel: 'hunyuan-standard',
    chatEndpoint: '/',
    modelsEndpoint: null
  },
  moonshot: {
    name: '月之暗面',
    defaultUrl: 'https://api.moonshot.cn/v1',  // ✅ 官方基础 URL
    needApiKey: true,
    defaultModel: 'moonshot-v1-8k',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models'
  },
  google: {
    name: 'Google',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',  // ✅ 官方基础 URL
    needApiKey: true,
    defaultModel: 'gemini-pro',
    chatEndpoint: '/models/gemini-pro:generateContent',
    modelsEndpoint: '/models'
  }
};

class AIService {
  constructor(settings) {
    this.settings = settings;
    this.provider = settings.provider || 'custom';
    this.config = settings.config || {};
  }

  /**
   * 从推理内容中提取最终答案
   */
  extractFinalAnswer(reasoning) {
    if (!reasoning) return '';
    
    // 1. 尝试找最后的结论标记
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
    
    // 2. 尝试找引号中的内容
    const quoteMatch = reasoning.match(/["'""']['"]([^"'""']+)["'""']/g);
    if (quoteMatch && quoteMatch.length > 0) {
      // 取最后一个引号内容
      const lastQuote = quoteMatch[quoteMatch.length - 1];
      return lastQuote.replace(/["'"""']/g, '').trim();
    }
    
    // 3. 按句子分割，取最后 1-2 句
    const sentences = reasoning.split(/[。！？\n]+/).filter(s => s.trim());
    if (sentences.length > 0) {
      // 取最后 1-2 句
      return sentences.slice(-2).join('。').trim();
    }
    
    return reasoning.trim();
  }
  
  /**
   * 清理 AI 输出内容
   */
  cleanAIOutput(content) {
    if (!content) return '';
    
    // 1. 移除常见的思考标签
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
    
    // 2. 移除多余的空格和换行
    content = content.replace(/\s+/g, ' ').trim();
    
    // 3. 移除开头和结尾的标点符号
    content = content.replace(/^[，。！？、；："'"""'\s]+/, '');
    content = content.replace(/[，。！？、；："'"""'\s]+$/, '');
    
    // 4. 对于标题优化，限制长度（最多 50 字）
    // 对于分组建议，限制长度（最多 10 字）
    // 这里做通用处理：如果超过 50 字，取前 50 字
    if (content.length > 50) {
      content = content.substring(0, 50).trim();
      // 确保不在单词中间截断
      const lastSpace = content.lastIndexOf(' ');
      if (lastSpace > 30) {
        content = content.substring(0, lastSpace);
      }
    }
    
    return content;
  }

  /**
   * 测试 API 连接
   */
  async testConnection() {
    try {
      const provider = AI_PROVIDERS[this.provider];
      
      // 简单测试：发送一个测试请求
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

  /**
   * 获取可用模型列表
   */
  async fetchModels() {
    try {
      const provider = AI_PROVIDERS[this.provider];
      const baseUrl = this.config.apiUrl || provider.defaultUrl;
      
      if (!baseUrl) {
        console.warn('API 地址未配置');
        return [];
      }
      
      // 检查是否支持自动获取模型
      if (!provider.supportAutoModel || !provider.modelsEndpoint) {
        console.warn('该供应商不支持自动获取模型列表');
        return [];
      }
      
      // 移除末尾的斜杠
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      
      // 构建模型列表接口 URL
      const modelsUrl = `${cleanBaseUrl}${provider.modelsEndpoint}`;
      
      console.log('获取模型列表:', modelsUrl);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.config.apiKey) {
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
      
      // 解析模型列表
      if (data.data && Array.isArray(data.data)) {
        // OpenAI 格式
        return data.data.map(model => model.id);
      } else if (Array.isArray(data)) {
        // 直接是数组
        return data;
      } else if (data.models && Array.isArray(data.models)) {
        // models 字段
        return data.models;
      }
      
      return [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  /**
   * 统一 API 调用接口
   */
  async callAPI(prompt) {
    const startTime = Date.now();
    const provider = AI_PROVIDERS[this.provider];
    
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
      default:
        // 其他供应商使用通用格式
        response = await this.callGenericAPI(prompt);
    }
    
    const latency = Date.now() - startTime;
    
    return {
      ...response,
      latency
    };
  }

  /**
   * 自定义 API（自建服务）
   */
  async callCustomAPI(prompt) {
    const provider = AI_PROVIDERS[this.provider];
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    
    if (!baseUrl) {
      throw new Error('API 地址未配置');
    }
    
    // 移除末尾的斜杠
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // 拼接聊天完成接口路径
    const chatEndpoint = provider.chatEndpoint || '/v1/chat/completions';
    const apiUrl = `${cleanBaseUrl}${chatEndpoint}`;
    
    console.log('调用 AI API:', apiUrl);
    console.log('请求参数:', {
      model: this.config.model,
      messages: [{ role: 'user', content: prompt.substring(0, 100) + '...' }],
      stream: false
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,  // 禁用流式响应，等待完整响应
        max_tokens: 100,  // 限制最大生成 token 数，加快响应
        temperature: 0.3  // 降低随机性，使输出更稳定
      })
    });
    
    console.log('API 响应状态:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 调试：打印返回数据
    console.log('AI 响应数据:', data);
    
    // 适配不同的返回格式
    const choice = data.choices?.[0];
    const message = choice?.message || {};
    
    // 只使用 content，不使用 reasoning_content（那是思考过程）
    let content = message.content || '';
    
    // 如果 content 为空，尝试使用 reasoning_content 并提取最后一句
    if (!content) {
      const reasoning = message.reasoning_content || message.reasoning || '';
      if (reasoning) {
        // 尝试从推理内容中提取最终答案
        content = this.extractFinalAnswer(reasoning);
        console.log('从 reasoning_content 提取:', content);
      }
    }
    
    // 如果没有 content，尝试其他格式
    if (!content) {
      content = data.content || data.text || data.response || JSON.stringify(data);
    }
    
    // 清理内容：移除思考标签、多余空格、截断过长内容
    content = this.cleanAIOutput(content);
    
    console.log('提取的内容:', content);
    
    return {
      content: content
    };
  }

  /**
   * OpenAI API
   */
  async callOpenAI(prompt) {
    const provider = AI_PROVIDERS.openai;
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    const apiKey = this.config.apiKey;
    const model = this.config.model || provider.defaultModel;
    
    if (!apiKey) {
      throw new Error('OpenAI 需要 API Key');
    }
    
    // 移除末尾的斜杠，拼接聊天端点
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = `${cleanBaseUrl}${provider.chatEndpoint}`;
    
    console.log('调用 OpenAI API:', apiUrl);
    
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

  /**
   * Anthropic API
   */
  async callAnthropic(prompt) {
    const provider = AI_PROVIDERS.anthropic;
    const baseUrl = this.config.apiUrl || provider.defaultUrl;
    const apiKey = this.config.apiKey;
    const model = this.config.model || provider.defaultModel;
    
    if (!apiKey) {
      throw new Error('Anthropic 需要 API Key');
    }
    
    // 移除末尾的斜杠，拼接聊天端点
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = `${cleanBaseUrl}${provider.chatEndpoint}`;
    
    console.log('调用 Anthropic API:', apiUrl);
    
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

  /**
   * 通用 API 调用（其他供应商）
   */
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
    
    // 移除末尾的斜杠，拼接聊天端点
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const chatEndpoint = provider.chatEndpoint || '/v1/chat/completions';
    const apiUrl = `${cleanBaseUrl}${chatEndpoint}`;
    
    console.log(`调用 ${provider.name} API:`, apiUrl);
    
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
        stream: false  // 禁用流式响应
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 尝试多种返回格式
    return {
      content: data.choices?.[0]?.message?.content || 
               data.content?.[0]?.text ||
               data.result ||
               data.response ||
               JSON.stringify(data)
    };
  }

  /**
   * 智能标题优化
   */
  async optimizeTitle(title, url) {
    // 使用配置的提示词或默认提示词
    let prompt = this.settings.prompts?.titleOptimization ||
      `<task>
优化标题
</task>

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
    
    // 替换模板变量
    prompt = prompt
      .replace(/{title}/g, title)
      .replace(/{url}/g, url)
      .replace(/{domain}/g, new URL(url).hostname)
      .replace(/{groupsText}/g, '');

    const response = await this.callAPI(prompt);
    return response.content.trim();
  }

  /**
   * 智能分组建议
   */
  async suggestCategory(url, title, existingGroups = []) {
    const domain = new URL(url).hostname.replace('www.', '');
    const groupsText = existingGroups.length > 0 
      ? `现有分组：${existingGroups.join('、')}`
      : '当前没有分组，请推荐一个新的分组名称。';
    
    // 使用配置的提示词或默认提示词
    let prompt = this.settings.prompts?.categorySuggestion ||
      `<task>
智能书签分类
</task>

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
    
    // 替换模板变量
    prompt = prompt
      .replace(/{title}/g, title)
      .replace(/{url}/g, url)
      .replace(/{domain}/g, domain)
      .replace(/{groupsText}/g, groupsText);
    
    const response = await this.callAPI(prompt);
    return response.content.trim();
  }

  /**
   * 智能标签生成
   */
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

  /**
   * 生成书签摘要
   */
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

  /**
   * 检测重复书签
   */
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
