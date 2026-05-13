# 📌 书签白板 (Bookmark Board)

**隐私优先的本地书签管理工具** - 快速整理你的网络资源，告别浏览器书签栏的混乱！

[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-v3.2.5-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)

## ✨ 核心特性

### 🎯 多场景添加书签
- **拖拽添加** - 从网页、地址栏、书签栏拖拽链接到页面或侧边栏
- **右键菜单** - 在页面或链接上右键快速添加到书签白板
- **手动添加** - 输入URL和标题手动添加书签
- **一键添加** - 侧边栏快速添加当前浏览页面

### 🚀 高效管理体验
- **卡片式布局** - 视觉化展示，图标+标题一目了然
- **实时搜索** - 即时过滤书签标题和URL
- **批量操作** - 支持多选、全选、批量删除
- **快速编辑** - 编辑书签名称，删除不需要的书签
- **智能标题获取** - 自动提取网页标题或域名

### 📱 侧边栏功能
- **快速访问** - 点击扩展图标或右键菜单打开侧边栏
- **移动端样式** - 一行一个卡片，横向布局，方便操作
- **实时同步** - 添加/编辑/删除操作实时同步到所有页面
- **主题切换** - 独立的深色/浅色模式切换

### 🎨 现代化界面
- **深色/浅色主题** - 自动跟随系统偏好，支持手动切换
- **响应式设计** - 完美适配桌面、平板和手机
- **流畅动画** - 优雅的过渡效果提升用户体验
- **渐变卡片** - 随机渐变背景让界面更加生动

### 🔒 隐私保护
- **完全本地存储** - 所有数据保存在 Chrome storage.local
- **无需服务器** - 零依赖，不联网也能使用
- **数据自主** - 清除浏览器数据才会丢失，完全掌控

## 🛠️ 技术架构

| 技术栈 | 用途 | 版本 |
|--------|------|------|
| **Manifest V3** | Chrome 扩展标准 | v3 |
| **HTML5** | 页面结构 | - |
| **原生 CSS** | 样式框架 | CSS Variables |
| **JavaScript ES6+** | 交互逻辑 | - |
| **Font Awesome** | 图标库 | 4.7 |
| **Chrome Storage API** | 数据存储 | local |
| **Chrome Extension APIs** | 扩展功能 | contextMenus, scripting, sidePanel |

## 📦 安装使用

### Chrome 扩展安装（推荐）
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目的根目录
6. 安装完成！

### 使用方式

**方式一：新标签页**
- 打开新标签页，自动显示书签白板
- 所有书签在此管理

**方式二：侧边栏**
- 点击工具栏扩展图标
- 或在任意网页右键 →「打开书签白板侧边栏」
- 快速浏览和管理书签

**方式三：右键菜单**
- 在网页空白处右键 →「添加到书签白板」（添加当前页）
- 在链接上右键 →「添加链接到书签白板」（添加该链接）

## 📖 使用指南

### 添加书签的 5 种方式

1. **拖拽添加**
   - 从地址栏拖拽 URL 到书签区域
   - 从网页拖拽链接到书签区域或侧边栏
   - 从书签栏拖拽书签到书签区域

2. **右键菜单 - 添加页面**
   - 在网页空白处右键
   - 选择「添加到书签白板」
   - 自动保存当前页面

3. **右键菜单 - 添加链接**
   - 在网页链接上右键
   - 选择「添加链接到书签白板」
   - 自动保存该链接

4. **侧边栏一键添加**
   - 打开侧边栏
   - 点击 ➕ 按钮
   - 自动添加当前浏览页面

5. **手动添加**
   - 点击「手动添加书签」按钮
   - 输入 URL 和标题
   - 支持自定义添加任意链接

### 管理书签
- **打开链接** - 点击卡片在新标签页打开
- **编辑名称** - 点击卡片上的编辑按钮
- **删除书签** - 点击卡片上的删除按钮
- **批量操作** - 进入批量模式，多选删除
- **搜索过滤** - 使用搜索框实时过滤书签

### 使用侧边栏
- **打开侧边栏**
  - 点击工具栏扩展图标
  - 或右键菜单选择「打开书签白板侧边栏」
  
- **侧边栏功能**
  - 搜索书签
  - 编辑/删除书签
  - 一键添加当前页面
  - 手动添加书签
  - 切换深色/浅色主题

### 主题切换
- 点击月亮/太阳图标切换主题
- 首次使用自动跟随系统主题
- 手动设置后尊重用户选择
- 系统主题变化时自动同步

## 📁 项目结构

```
bookmark-board/
├── manifest.json           # Chrome 扩展配置（Manifest V3）
├── new-tab.html            # 新标签页主界面
├── sidebar.html            # 侧边栏界面
├── css/
│   ├── main.css            # 主页面样式（CSS Variables）
│   ├── sidebar.css         # 侧边栏样式
│   └── tailwind-full.css   # Tailwind 完整样式（备用）
├── js/
│   ├── app.js              # 主页面逻辑
│   ├── sidebar.js          # 侧边栏逻辑
│   └── background.js       # 后台脚本（右键菜单、消息通信）
├── icons/
│   ├── logo.png            # 扩展图标（16/48/128px）
│   └── icon128.png         # 旧图标（已弃用）
├── fonts/                  # Font Awesome 字体文件
├── default-icon.png        # 默认网站图标
├── font-awesome.min.css    # 图标库样式
└── README.md               # 项目说明文档
```

## 🔧 开发说明

### 扩展权限
```json
{
  "permissions": [
    "storage",      // 本地数据存储
    "contextMenus", // 右键菜单
    "tabs",         // 标签页管理
    "scripting",    // 页面脚本注入（Toast通知）
    "sidePanel"     // 侧边栏功能
  ]
}
```

### 数据存储
- 书签数据存储在 `chrome.storage.local`
- 数据结构：
  ```javascript
  {
    links: [
      {
        id: "1234567890",
        url: "https://example.com",
        title: "Example Site",
        icon: "https://example.com/favicon.ico",
        groups: [],
        createdAt: 1234567890
      }
    ]
  }
  ```

### 消息通信
- `background.js` ↔ `app.js`：通过 `chrome.runtime.onMessage`
- 右键菜单添加书签后，通知所有页面刷新
- 侧边栏通过 `chrome.storage.onChanged` 实时同步

## 🤝 贡献指南

我们欢迎各种形式的贡献！请阅读 [贡献指南](CONTRIBUTING.md) 了解如何参与项目。

### 开发流程
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 版本历史
- **v3.2.5** (当前版本)
  - ✅ 侧边栏功能（移动端样式）
  - ✅ 右键菜单支持链接添加
  - ✅ 自动跟随系统主题
  - ✅ 拖拽获取网页标题
  - ✅ 实时更新同步
  
- **v3.0.x**
  - ✅ 深色/浅色主题
  - ✅ 批量操作
  - ✅ 响应式设计
  - ✅ 拖拽添加书签
  
- **v2.x**
  - ✅ 卡片式布局
  - ✅ 搜索过滤
  - ✅ 手动添加

### 待开发功能
- [ ] 书签分类和分组系统
- [ ] 导入/导出功能（JSON格式）
- [ ] 书签排序选项（时间/字母）
- [ ] 键盘快捷键支持
- [ ] 数据备份到云端
- [ ] 收藏夹同步选项

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🐛 问题反馈

如果你遇到任何问题或有改进建议：
1. 查看 [Issues](https://github.com/YinHeng89/bookmark-board/issues) 是否有相同问题
2. 创建新 Issue，提供：
   - 问题描述
   - 复现步骤
   - 浏览器版本
   - 截图（如有）

📖 **使用文档**：[GUIDE.md](https://github.com/YinHeng89/bookmark-board/blob/main/GUIDE.md)

### 常见问题

**Q: 右键菜单没有显示？**
A: 需要完全重新安装扩展（移除后重新加载）

**Q: 书签丢失了？**
A: 书签数据存储在浏览器本地，清除浏览器数据会导致丢失

**Q: 侧边栏不自动刷新？**
A: 确保使用的是最新版本（v3.2.5+）

## 🌟 致谢

- [书签白板 GitHub](https://github.com/YinHeng89/bookmark-board) - 项目主页
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/) - 强大的扩展能力
- [Font Awesome](https://fontawesome.com/) - 精美的图标库
- CSS Variables - 灵活的主题系统
- 所有用户和贡献者的支持

---

**💡 提示**：书签数据保存在 Chrome storage.local 中，清除浏览器数据会导致书签丢失。建议定期备份重要书签。

**🚀 特性**：完全离线可用，无需网络连接，保护你的隐私！

享受整洁高效的书签管理体验！ 🎉
