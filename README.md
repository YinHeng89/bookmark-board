# 📌 Bookmark Board - 现代化书签管理工具

**一个优雅、高效的本地书签管理解决方案** - 告别浏览器书签栏的混乱，用卡片式布局重新组织你的网络资源。

[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-blue?logo=github)](https://github.com/yourusername/bookmark-board)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## ✨ 核心特性

### 🎯 直观的视觉管理
- **卡片式布局** - 以视觉化的方式展示所有书签
- **自动图标获取** - 智能抓取网站 favicon，增强识别度
- **多彩背景** - 随机渐变背景让界面更加生动

### 🚀 高效操作体验
- **拖拽添加** - 直接从浏览器地址栏拖拽链接到页面
- **批量管理** - 支持多选、全选、批量删除操作
- **实时搜索** - 即时过滤书签标题和URL
- **快速编辑** - 点击即可修改书签名称

### 🎨 现代化界面
- **深色/浅色主题** - 支持系统偏好和手动切换
- **响应式设计** - 完美适配桌面、平板和手机
- **流畅动画** - 优雅的过渡效果提升用户体验
- **玻璃拟态设计** - 现代化的毛玻璃视觉效果

### 🔒 隐私保护
- **完全本地存储** - 所有数据保存在浏览器本地
- **无需服务器** - 零依赖，打开即用
- **离线可用** - 不依赖网络连接

## 🛠️ 技术架构

| 技术栈 | 用途 | 版本 |
|--------|------|------|
| **HTML5** | 页面结构 | - |
| **TailwindCSS** | 样式框架 | 3.x |
| **JavaScript ES6+** | 交互逻辑 | - |
| **Font Awesome** | 图标库 | 4.7 |
| **LocalStorage API** | 数据存储 | - |

## 📦 快速开始

### 方式一：直接使用（推荐）
1. 下载项目文件
2. 双击打开 `index.html` 即可使用

### 方式二：本地开发
```bash
# 克隆项目
git clone https://github.com/yourusername/bookmark-board.git

# 进入目录
cd bookmark-board

# 在浏览器中打开
# 或者使用本地服务器（可选）
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 📖 使用指南

### 添加书签
1. **拖拽添加**：从浏览器地址栏拖拽链接到书签区域
2. **手动添加**：点击"手动添加"按钮，输入完整URL

### 管理书签
- **打开链接**：点击卡片在新标签页打开
- **编辑名称**：点击卡片上的铅笔图标
- **删除书签**：点击卡片上的垃圾桶图标
- **批量操作**：点击右上角设置图标进入批量模式

### 搜索与过滤
- 使用顶部搜索框实时过滤书签
- 支持标题和URL的关键词搜索

### 主题切换
- 点击右上角月亮/太阳图标切换深色/浅色模式
- 自动跟随系统主题偏好

## 📁 项目结构

```
bookmark-board/
├── index.html              # 主页面文件
├── font-awesome.min.css    # 图标库样式
├── fonts/                  # 图标字体文件
│   ├── fontawesome-webfont.eot
│   ├── fontawesome-webfont.svg
│   ├── fontawesome-webfont.ttf
│   ├── fontawesome-webfont.woff
│   └── fontawesome-webfont.woff2
├── default-icon.png        # 默认网站图标
└── README.md              # 项目说明文档
```

## 🔧 自定义配置

### 修改主题颜色
在 `index.html` 中的 TailwindCSS 配置部分修改颜色变量：

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",    // 主色调
        secondary: "#10B981",  // 辅助色
        accent: "#F59E0B",     // 强调色
      }
    }
  }
}
```

### 添加新功能
项目采用模块化设计，主要功能模块：
- `init()` - 初始化应用
- `renderLinks()` - 渲染书签卡片
- `addLinkFromUrl()` - 添加新书签
- `showModal()` - 显示模态框
- `showToast()` - 显示提示消息

## 🤝 贡献指南

我们欢迎各种形式的贡献！请阅读 [贡献指南](CONTRIBUTING.md) 了解如何参与项目。

### 开发流程
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 待开发功能
- [ ] 书签分类和标签系统
- [ ] 导入/导出功能
- [ ] 书签排序选项
- [ ] 键盘快捷键支持
- [ ] 数据备份到云端

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🐛 问题反馈

如果你遇到任何问题或有改进建议，请：
1. 查看 [常见问题解答](#)
2. 搜索现有的 [Issues](https://github.com/yourusername/bookmark-board/issues)
3. 创建新的 Issue，并提供详细描述和重现步骤

## 🌟 致谢

- [TailwindCSS](https://tailwindcss.com/) - 优秀的CSS框架
- [Font Awesome](https://fontawesome.com/) - 精美的图标库
- 所有贡献者和用户的支持

---

**💡 提示**：书签数据保存在浏览器本地存储中，清除浏览器数据会导致书签丢失。建议定期导出备份重要书签。

享受整洁的书签管理体验！ 🎉
