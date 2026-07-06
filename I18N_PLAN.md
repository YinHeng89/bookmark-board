# 书签白板 (Bookmark Board) 国际化（中/英）方案

> **版本**: v1.0  
> **日期**: 2026-07-06  
> **目标**: 完整支持中文(zh_CN)和英文(en)双语，所有用户可见文本可切换

---

## 一、现状分析

### 1.1 已有 i18n 基础设施
- `manifest.json` 已设置 `"default_locale": "zh_CN"`
- `_locales/zh_CN/messages.json` — 仅 2 个 key（`appName`, `appDesc`）
- `_locales/en/messages.json` — 仅 2 个 key
- 扩展名称和描述使用了 `__MSG_appName__` / `__MSG_appDesc__`

### 1.2 现有问题

| 问题 | 严重度 | 描述 |
|------|--------|------|
| HTML 硬编码中文 | 🔴 严重 | 3 个 HTML 文件 + 1 个网站页面，所有文本均为硬编码中文 |
| JS 硬编码中文 | 🔴 严重 | 13 个 JS 文件，Toast 消息、弹窗标题、按钮标签、提示文本全部硬编码 |
| 时间格式化硬编码 | 🟡 中等 | `formatTimeAgo()` 返回"X天前""刚刚"等，无英文版本 |
| AI 默认提示词 | 🟡 中等 | 4 组默认提示词全部为中文，要求输出中文 |
| 排序选项硬编码 | 🔴 严重 | `<select>` 的 `<option>` 直接写死 |
| 右键菜单硬编码 | 🔴 严重 | `background.js` 中右键菜单标题写死 |
| `html lang` 写死 | 🟢 低 | 所有页面 `lang="zh"`，需动态切换 |
| 网站独立 i18n | 🟡 中等 | `website/js/main.js` 有自己的翻译字典，需统一 |

### 1.3 涉及文件清单

```
核心 UI 文件（需修改）:
├── new-tab.html           — 主界面，约 60+ 处硬编码文本
├── settings.html          — 设置页，约 120+ 处硬编码文本
├── sidebar.html           — 侧边栏，约 10+ 处硬编码文本
├── website/index.html     — 官网，约 80+ 处硬编码文本

JS 逻辑文件（需修改）:
├── js/background.js        — 右键菜单、通知（~5 处）
├── js/app-refactored.js    — 主逻辑（~10 处）
├── js/settings.js          — 设置逻辑（~80 处）
├── js/sidebar.js           — 侧边栏逻辑（~30 处）
├── js/modules/ui-renderer.js   — 分组标签、时间格式化（~15 处）
├── js/modules/bookmark-ops.js  — 书签操作提示（~10 处）
├── js/modules/group-manager.js — 分组菜单提示（~25 处）
├── js/modules/modal.js         — 弹窗默认标题（1 处）
├── js/modules/toast.js         — Toast 图标（1 处，非文本）
├── js/modules/ai-integration.js — AI 提示消息（~10 处）
├── js/modules/data-manager.js  — 无硬编码中文（✅）
├── js/ai-service.js       — AI 供应商名称（~12 处，需统一）
├── js/app.js              — 旧版主逻辑（~100 处，建议废弃或同步翻译）

配置文件:
├── _locales/zh_CN/messages.json  — 需大幅扩充
├── _locales/en/messages.json     — 需大幅扩充
├── manifest.json                 — 已使用 __MSG__（✅）

网站文件:
├── website/js/main.js    — 已有一套翻译字典，需对齐
├── website/css/style.css — 无需修改
└── website/index.html    — 需改造
```

---

## 二、整体架构设计

### 2.1 方案选型

采用 **Chrome 原生 `chrome.i18n` API** 作为主方案：

- Chrome Extension 有内置的 `chrome.i18n.getMessage(msgName, substitutions)` API
- `_locales/` 目录结构是 Manifest V3 标准
- 不需要额外依赖，天然支持
- 自动跟随 Chrome 浏览器语言，无需手动切换
- 对于非扩展页面（website/），需要从 `_locales/` 读取或维护独立字典

### 2.2 多页面 i18n 使用策略

| 页面类型 | 可用 API | 方案 |
|----------|----------|------|
| `new-tab.html` (chrome_url_overrides) | `chrome.i18n.getMessage()` ✅ | 直接使用 |
| `settings.html` (扩展内页面) | `chrome.i18n.getMessage()` ✅ | 直接使用 |
| `sidebar.html` (sidePanel) | `chrome.i18n.getMessage()` ✅ | 直接使用 |
| `background.js` (Service Worker) | `chrome.i18n.getMessage()` ✅ | 直接使用 |
| `website/index.html` (独立网站) | ❌ 不可用 | 从 `_locales/` JSON 加载，或维护独立翻译字典 |

### 2.3 统一消息 Key 命名规范

```
{模块}_{元素}_{属性}

示例:
bookmark_card_edit_title         — 书签卡片编辑标题
modal_confirm_ok                 — 弹窗确认按钮
toast_link_added_success         — 书签添加成功提示
settings_ai_title                — 设置-AI 标题
footer_text                      — 页脚文本
context_menu_add_page            — 右键菜单-添加页面
```

---

## 三、`_locales/messages.json` 完整 Key 清单

### 3.1 通用/全局

| key | 中文 | 英文 |
|-----|------|------|
| `app_name` | 书签白板 | Bookmark Board |
| `app_name_full` | 书签白板 - 隐私优先的卡片式书签管理工具 | Bookmark Board - Visual & Privacy-First Manager |
| `app_desc` | 像画板一样管理你的网络资源！隐私优先的本地书签管理工具，支持拖拽添加、卡片式布局与侧边栏快速访问。 | Manage your web bookmarks like a visual canvas! |
| `app_subtitle` | 隐私优先的本地书签管理工具 | Privacy-first local bookmark manager |
| `loading` | 加载中... | Loading... |
| `cancel` | 取消 | Cancel |
| `confirm` | 确定 | Confirm |
| `save` | 保存 | Save |
| `delete` | 删除 | Delete |
| `edit` | 编辑 | Edit |
| `close` | 关闭 | Close |
| `back` | 返回 | Back |
| `search` | 搜索 | Search |
| `add` | 添加 | Add |
| `import` | 导入 | Import |
| `export` | 导出 | Export |
| `unnamed` | 未命名 | Unnamed |
| `coming_soon` | 即将推出 | Coming Soon |
| `not_configured` | 未配置 | Not Configured |

### 3.2 主页面 (new-tab.html)

| key | 中文 | 英文 |
|-----|------|------|
| `header_search_placeholder` | 搜索书签... 支持 #标签 @域名 !分组 | Search bookmarks... Supports #tag @domain !group |
| `header_settings_title` | 设置 | Settings |
| `header_theme_switch_title` | 切换主题 | Toggle Theme |
| `header_mobile_search_title` | 搜索 | Search |
| `group_tab_all` | 全部 | All |
| `group_tab_create` | 新建分组 | New Group |
| `tip_bar_text` | 将浏览器中的链接拖拽到下方区域添加书签，点击卡片打开链接 | Drag links here to add bookmarks, click cards to open |
| `tip_bar_hide` | 隐藏提示 | Hide Tip |
| `view_tab_all` | 所有书签 | All Bookmarks |
| `view_tab_pinned` | 置顶 | Pinned |
| `view_tab_recent` | 最近添加 | Recent |
| `sort_label` | 排序： | Sort: |
| `sort_created_desc` | 添加时间（新→旧） | Date Added (New → Old) |
| `sort_created_asc` | 添加时间（旧→新） | Date Added (Old → New) |
| `sort_title_asc` | 名称（A→Z） | Name (A→Z) |
| `sort_title_desc` | 名称（Z→A） | Name (Z→A) |
| `sort_clicks_desc` | 使用频率（高→低） | Usage (High → Low) |
| `empty_all_title` | 暂无书签 | No Bookmarks Yet |
| `empty_all_text` | 将网页链接拖拽到这里保存，或点击下方按钮手动添加 | Drag links here or click below to add manually |
| `empty_all_add_btn` | 手动添加 | Add Manually |
| `empty_all_import_btn` | 导入数据 | Import Data |
| `empty_pinned_title` | 暂无置顶书签 | No Pinned Bookmarks |
| `empty_pinned_text` | 右键点击书签卡片，选择"置顶此书签"即可在这里看到 | Right-click a card and select "Pin Bookmark" |
| `empty_recent_title` | 暂无最近添加 | No Recent Bookmarks |
| `empty_recent_text` | 最近7天内添加的书签会显示在这里 | Bookmarks added in the last 7 days |
| `footer_text` | 书签白板 - 快速整理你的网络资源 | Bookmark Board - Organize your web resources |
| `footer_storage` | 数据安全存储于本地 | Data stored securely on your device |
| `add_card_text` | 添加书签 | Add Bookmark |
| `modal_default_title` | 提示 | Notice |

### 3.3 设置页 (settings.html)

| key | 中文 | 英文 |
|-----|------|------|
| `settings_title` | 设置 | Settings |
| `settings_nav_bookmarks` | 书签管理 | Bookmark Management |
| `settings_nav_groups` | 分组管理 | Group Management |
| `settings_nav_appearance` | 外观与主题 | Appearance & Theme |
| `settings_nav_display` | 显示与排序 | Display & Sorting |
| `settings_nav_data` | 数据管理 | Data Management |
| `settings_nav_ai` | AI 助手 | AI Assistant |
| `settings_nav_search` | 搜索与筛选 | Search & Filter |
| `settings_nav_privacy` | 隐私与安全 | Privacy & Security |
| `settings_nav_shortcuts` | 快捷操作 | Shortcuts |
| `settings_nav_about` | 关于 | About |
| `settings_back_btn` | 返回主页 | Back to Home |
| `settings_search_placeholder` | 搜索书签... | Search bookmarks... |
| `settings_batch_manage` | 批量管理 | Batch Manage |
| `settings_batch_selected` | 个书签被选中 | bookmarks selected |
| `settings_batch_select_all` | 全选 | Select All |
| `settings_batch_deselect` | 取消全选 | Deselect All |
| `settings_batch_group` | 分组 | Group |
| `settings_batch_delete` | 删除 | Delete |
| `settings_batch_no_select` | 请先选择要删除的书签 | Select bookmarks first |
| `settings_batch_confirm_delete` | 确定要删除 $COUNT$ 个书签吗？ | Delete $COUNT$ bookmarks? |
| `settings_batch_deleted` | 已删除 $COUNT$ 个书签 | $COUNT$ bookmarks deleted |
| `settings_batch_no_group_select` | 请先选择要添加分组的书签 | Select bookmarks to group |
| `settings_batch_grouped` | 已将 $COUNT$ 个书签添加到分组 | $COUNT$ bookmarks added to group |
| `settings_confirm_delete_title` | 确认删除 | Confirm Delete |
| `settings_confirm_delete_group` | 确定要删除分组 "$NAME" 吗？分组内的书签不会被删除。 | Delete group "$NAME"? Bookmarks in it will not be deleted. |
| `settings_group_deleted` | 分组已删除 | Group deleted |
| `settings_group_created` | 分组已创建 | Group created |
| `settings_group_updated` | 分组名称已更新 | Group name updated |
| `settings_bookmark_updated` | 书签已更新 | Bookmark updated |
| `settings_bookmark_deleted` | 书签已删除 | Bookmark deleted |
| `settings_edit_bookmark` | 编辑书签 | Edit Bookmark |
| `settings_edit_title` | 编辑书签 | Edit Bookmark |
| `settings_edit_group_title` | 编辑分组 | Edit Group |
| `settings_edit_auto_group_title` | 编辑自动分组名称 | Edit Auto Group Name |
| `settings_new_group_title` | 新建分组 | New Group |
| `settings_group_name_label` | 分组名称 | Group Name |
| `settings_group_name_placeholder` | 请输入分组名称 | Enter group name |
| `settings_group_name_input_label` | 请输入分组名称： | Enter group name: |
| `settings_url_label` | URL | URL |
| `settings_title_label` | 标题 | Title |
| `settings_view` | 查看 | View |
| `settings_never_viewed` | 从未查看 | Never viewed |
| `settings_view_count` | $COUNT$次 | $COUNT$ views |
| `settings_no_match` | 没有匹配的书签 | No matching bookmarks |
| `settings_no_bookmarks` | 暂无书签 | No bookmarks |
| `settings_no_groups` | 暂无分组 | No groups |
| `settings_auto_group` | 自动分组 | Auto Group |
| `settings_custom_group` | 自定义分组 | Custom Group |
| `settings_auto_group_cannot_delete` | 自动分组不可删除 | Auto group cannot be deleted |
| `settings_groups_desc` | 管理自定义分组（自动分组不可删除） | Manage custom groups (auto groups cannot be deleted) |
| `settings_groups_create` | 新建分组 | New Group |
| `settings_bookmarks_count` | $COUNT$ 个书签 | $COUNT$ bookmarks |

### 3.4 设置页 - 数据管理

| key | 中文 | 英文 |
|-----|------|------|
| `data_export_title` | 导出数据 | Export Data |
| `data_export_desc` | 导出所有书签数据（包括书签、分组、访问次数、配置等），数据将加密保存。 | Export all data (bookmarks, groups, click counts, settings). Data will be encrypted. |
| `data_export_btn` | 导出数据 | Export Data |
| `data_import_title` | 导入数据 | Import Data |
| `data_import_desc` | 导入加密的备份文件，将覆盖当前所有数据。请谨慎操作！ | Import an encrypted backup. This will overwrite all current data. Use with caution! |
| `data_import_btn` | 导入数据 | Import Data |
| `data_stats_title` | 数据统计 | Statistics |
| `data_stats_total` | 书签总数 | Total Bookmarks |
| `data_stats_groups` | 分组总数 | Total Groups |
| `data_stats_clicks` | 总访问次数 | Total Clicks |
| `data_export_preparing` | 正在准备导出数据... | Preparing export data... |
| `data_export_success` | 数据导出成功！ | Data exported successfully! |
| `data_export_failed` | 导出数据失败: $ERROR$ | Export failed: $ERROR$ |
| `data_import_reading` | 正在读取文件... | Reading file... |
| `data_import_invalid` | 数据格式不正确 | Invalid data format |
| `data_import_overwrite` | 导入将覆盖当前所有数据！书签: $BOOKMARK_COUNT$ 个 分组: $GROUP_COUNT$ 个 确定要继续吗？ | This will overwrite all current data! Bookmarks: $BOOKMARK_COUNT$ Groups: $GROUP_COUNT$ Continue? |
| `data_import_importing` | 正在导入数据... | Importing data... |
| `data_import_success` | 数据导入成功！ | Data imported successfully! |
| `data_import_failed` | 导入失败: $ERROR$ | Import failed: $ERROR$ |
| `data_import_corrupt` | 导入失败: 文件格式错误或数据已损坏 | Import failed: Invalid format or corrupted data |
| `data_decrypt_failed` | 解密失败，文件可能已损坏或格式不正确 | Decryption failed. File may be corrupted or invalid. |
| `data_encrypt_invalid` | 无效的加密数据 | Invalid encrypted data |

### 3.5 设置页 - AI 助手

| key | 中文 | 英文 |
|-----|------|------|
| `ai_config_title` | API 配置 | API Configuration |
| `ai_config_summary_not` | 未配置 | Not Configured |
| `ai_config_summary_model_not` | 未选择 | Not Selected |
| `ai_features_title` | AI 功能 | AI Features |
| `ai_label_provider` | AI 供应商 | AI Provider |
| `ai_label_api_url` | API 地址 * | API URL * |
| `ai_label_api_key` | API Key（可选） | API Key (Optional) |
| `ai_label_model` | 模型名称 | Model Name |
| `ai_hint_url` | 自建服务或其他 API 的完整地址 | Full URL of your API service |
| `ai_hint_key` | 部分供应商需要 API Key | Required by some providers |
| `ai_hint_model` | 点击刷新按钮自动获取可用模型，或选择"自定义"手动输入 | Click refresh to fetch available models, or select "Custom" to enter manually |
| `ai_model_custom` | 自定义（手动输入） | Custom (Manual Entry) |
| `ai_model_placeholder` | 手动输入模型名称 | Enter model name manually |
| `ai_model_auto_fetch` | -- 自动获取模型 -- | -- Auto Fetch Models -- |
| `ai_btn_test` | 测试连接 | Test Connection |
| `ai_btn_save` | 保存设置 | Save Settings |
| `ai_btn_save_title` | 请先测试连接通过后保存 | Test connection before saving |
| `ai_btn_save_tested_title` | 保存 AI 配置 | Save AI Configuration |
| `ai_btn_load_models` | 加载模型 | Load Models |
| `ai_testing` | 正在测试连接... | Testing connection... |
| `ai_testing_models` | 正在获取模型列表... | Fetching model list... |
| `ai_need_url` | 请先填写 API 地址 | Please enter API URL first |
| `ai_test_validation` | 请先点击"测试连接"按钮，验证配置无误后再保存 | Please test the connection before saving |
| `ai_save_success_features` | 功能设置已保存！ | Feature settings saved! |
| `ai_save_success` | 设置已保存！ | Settings saved! |
| `ai_save_failed` | 保存失败: $ERROR$ | Save failed: $ERROR$ |
| `ai_model_count` | 获取到 $COUNT$ 个模型 | $COUNT$ models found |
| `ai_model_none` | 未获取到模型列表 | No models found |
| `ai_model_fetch_failed` | 获取模型失败: $ERROR$ | Failed to fetch models: $ERROR$ |
| `ai_test_failed` | 测试失败: $ERROR$ | Test failed: $ERROR$ |

### 3.6 设置页 - AI 功能开关

| key | 中文 | 英文 |
|-----|------|------|
| `ai_feature_title_optimize` | 标题优化 | Title Optimization |
| `ai_feature_title_optimize_desc` | 优化标题，使其更简洁清晰 | Optimize titles to be clearer |
| `ai_feature_title_auto` | 添加时自动优化 | Auto-optimize on add |
| `ai_feature_title_manual` | 手动优化 | Manual Optimize |
| `ai_feature_category` | 智能分组 | Smart Categorization |
| `ai_feature_category_desc` | 根据内容智能推荐分组 | AI-powered group suggestions |
| `ai_feature_category_auto` | 添加时自动分组 | Auto-categorize on add |
| `ai_feature_category_manual` | 手动分组 | Manual Categorize |
| `ai_feature_summary` | 书签摘要生成 | Bookmark Summary |
| `ai_feature_summary_desc` | 生成书签内容摘要 | Generate content summaries |
| `ai_feature_summary_manual` | 手动生成摘要 | Generate Summary Manually |
| `ai_feature_search` | 智能搜索增强 | Smart Search |
| `ai_feature_search_desc` | 理解搜索意图，返回更精准结果 | Understand search intent for better results |
| `ai_feature_search_enable` | 启用智能搜索 | Enable Smart Search |

### 3.7 设置页 - AI 提示词编辑

| key | 中文 | 英文 |
|-----|------|------|
| `ai_prompt_edit_title` | 编辑提示词 | Edit Prompt |
| `ai_prompt_edit_warning` | ⚠️ 修改提示词可能影响 AI 输出质量，建议谨慎修改 | ⚠️ Modifying prompts may affect AI output quality |
| `ai_prompt_function` | 功能：$NAME$ | Function: $NAME$ |
| `ai_prompt_input_placeholder` | 输入提示词... | Enter prompt... |
| `ai_prompt_reset` | 恢复默认 | Reset to Default |
| `ai_prompt_reset_confirm` | 确定要恢复默认提示词吗？这将丢弃您的自定义修改。 | Reset to default prompt? Your changes will be discarded. |
| `ai_prompt_reset_done` | 已恢复默认提示词 | Default prompt restored |
| `ai_prompt_reset_failed` | 恢复失败: $ERROR$ | Reset failed: $ERROR$ |
| `ai_prompt_save_empty` | 提示词不能为空 | Prompt cannot be empty |
| `ai_prompt_save_done` | 提示词已保存 | Prompt saved |
| `ai_prompt_save_failed` | 保存失败: $ERROR$ | Save failed: $ERROR$ |

### 3.8 设置页 - 占位页面

| key | 中文 | 英文 |
|-----|------|------|
| `placeholder_coming_soon` | 即将推出 | Coming Soon |
| `placeholder_appearance` | 主题切换、自定义颜色、布局设置等功能正在开发中... | Theme switching, custom colors, layout settings coming soon... |
| `placeholder_display` | 排序方式、显示选项、卡片密度等功能正在开发中... | Sort options, display settings, card density coming soon... |
| `placeholder_search_config` | 搜索配置、标签管理、搜索建议等功能正在开发中... | Search config, tag management, search suggestions coming soon... |
| `placeholder_privacy` | 加密存储、自动锁定、无痕模式等功能正在开发中... | Encrypted storage, auto-lock, incognito mode coming soon... |
| `placeholder_shortcuts` | 快捷键自定义、鼠标手势、批量操作等功能正在开发中... | Custom shortcuts, mouse gestures, batch ops coming soon... |

### 3.9 设置页 - 关于

| key | 中文 | 英文 |
|-----|------|------|
| `about_title` | 书签白板 | Bookmark Board |
| `about_desc` | 隐私优先的本地书签管理工具 | Privacy-first local bookmark manager |
| `about_version` | 版本 v$VERSION$ | Version v$VERSION$ |
| `about_github` | GitHub | GitHub |
| `about_docs` | 使用文档 | Documentation |
| `about_feedback` | 反馈问题 | Report Issue |

### 3.10 设置页 - 书签列表 & 弹窗

| key | 中文 | 英文 |
|-----|------|------|
| `bookmark_edit_title` | 编辑书签 | Edit Bookmark |
| `bookmark_edit_message` | 修改书签名称： | Edit bookmark name: |
| `bookmark_delete_title` | 确认删除 | Confirm Delete |
| `bookmark_delete_message` | 确定要删除"$TITLE$"吗？ | Delete "$TITLE"? |
| `bookmark_deleted` | 书签已删除 | Bookmark deleted |
| `bookmark_updated_name` | 已更新书签名称 | Bookmark name updated |
| `bookmark_updated` | 书签已更新 | Bookmark updated |
| `group_selection_title` | 选择分组 | Select Group |
| `group_selection_no_groups` | 暂无分组，请先创建分组 | No groups. Create one first. |
| `input_name_required` | 请输入名称 | Please enter a name |
| `input_valid_url` | 请输入有效的网址 | Please enter a valid URL |

### 3.11 侧边栏 (sidebar)

| key | 中文 | 英文 |
|-----|------|------|
| `sidebar_title` | 书签白板 | Bookmark Board |
| `sidebar_search_placeholder` | 搜索书签... | Search bookmarks... |
| `sidebar_add_current` | 添加当前页面到书签 | Add current page |
| `sidebar_theme_toggle` | 切换主题 | Toggle Theme |
| `sidebar_add_manual_btn` | 手动添加书签 | Add Bookmark Manually |
| `sidebar_empty_title` | 暂无书签 | No Bookmarks |
| `sidebar_empty_hint` | 拖拽链接到此处添加书签 | Drag links here to add bookmarks |
| `sidebar_display_limit` | 显示 $CURRENT$/$TOTAL$ 个书签，请使用搜索筛选 | Showing $CURRENT$/$TOTAL$ bookmarks. Use search to filter. |
| `sidebar_edit_title` | 修改书签名称： | Edit bookmark name: |
| `sidebar_delete_confirm` | 确定删除 "$TITLE$" 吗？ | Delete "$TITLE$"? |
| `sidebar_added` | 书签已添加！ | Bookmark added! |
| `sidebar_exists` | 该书签已存在！ | Bookmark already exists! |
| `sidebar_cannot_get_url` | 无法获取链接地址 | Cannot get link URL |
| `sidebar_invalid_url` | URL 格式不正确 | Invalid URL format |
| `sidebar_manual_title` | 手动添加书签 | Add Bookmark Manually |
| `sidebar_manual_url_label` | 网站地址 * | Website URL * |
| `sidebar_manual_url_placeholder` | https://example.com | https://example.com |
| `sidebar_manual_name_label` | 书签名称 | Bookmark Name |
| `sidebar_manual_name_placeholder` | 留空则自动获取 | Leave empty to auto-detect |
| `sidebar_manual_add_btn` | 添加 | Add |
| `sidebar_manual_cancel_btn` | 取消 | Cancel |
| `sidebar_manual_url_required` | 请输入网站地址 | Please enter a URL |
| `sidebar_loading` | 加载中... | Loading... |
| `sidebar_ai_optimized_title` | AI 已优化标题 | AI optimized title |
| `sidebar_ai_categorized` | AI 已分类到: $GROUP$ | AI categorized as: $GROUP$ |

### 3.12 右键菜单 (background.js)

| key | 中文 | 英文 |
|-----|------|------|
| `context_menu_add_page` | 添加到书签白板 | Add to Bookmark Board |
| `context_menu_add_link` | 添加链接到书签白板 | Add Link to Bookmark Board |
| `context_menu_open_sidebar` | 打开书签白板侧边栏 | Open Bookmark Board Sidebar |
| `context_menu_notification_exists` | 该链接已存在 | Link already exists |
| `context_menu_notification_added` | 已添加书签: $TITLE$ | Bookmark added: $TITLE$ |
| `context_menu_notification_added_ai` | 已添加书签: $TITLE$ (AI 优化) | Bookmark added: $TITLE$ (AI Optimized) |

### 3.13 书签卡片右键菜单

| key | 中文 | 英文 |
|-----|------|------|
| `card_menu_title` | 书签操作 | Bookmark Options |
| `card_menu_pin` | 置顶 | Pin |
| `card_menu_unpin` | 取消置顶 | Unpin |
| `card_menu_edit` | 编辑名称 | Edit Name |
| `card_menu_select_group` | 选择分组 | Select Group |
| `card_menu_ai_optimize` | AI 优化 | AI Optimize |
| `card_menu_delete` | 删除书签 | Delete Bookmark |
| `card_menu_group_updated` | 分组已更新 | Group Updated |
| `card_menu_pinned` | 书签已置顶 | Bookmark Pinned |
| `card_menu_unpinned` | 已取消置顶 | Bookmark Unpinned |
| `card_menu_no_group` | 暂无分组，请先创建 | No groups. Create one first. |
| `card_menu_group_empty` | 暂无分组，请先创建 | No groups available. Create one first. |

### 3.14 分组右键菜单

| key | 中文 | 英文 |
|-----|------|------|
| `group_menu_title` | 分组操作 | Group Options |
| `group_menu_edit` | 编辑名称 | Edit Name |
| `group_menu_delete` | 删除分组 | Delete Group |

### 3.15 Toast / 通知消息

| key | 中文 | 英文 |
|-----|------|------|
| `toast_link_exists` | 该链接已存在 | Link already exists |
| `toast_link_added` | 已添加书签: $TITLE$ | Bookmark added: $TITLE$ |
| `toast_link_added_ai` | 已添加书签: $TITLE$ (AI 优化) | Bookmark added: $TITLE$ (AI Optimized) |
| `toast_bookmark_deleted` | 书签已删除 | Bookmark deleted |
| `toast_bookmark_updated` | 书签已更新 | Bookmark updated |
| `toast_group_created` | 分组已创建 | Group created |
| `toast_group_deleted` | 分组已删除 | Group deleted |
| `toast_group_updated` | 分组名称已更新 | Group name updated |
| `toast_ai_no_service` | AI 服务未加载，请刷新页面 | AI service not loaded. Please refresh. |
| `toast_ai_no_config` | 请先在设置中配置 AI API 信息 | Please configure AI API in Settings first. |
| `toast_ai_no_key` | 请先在设置中填写 $PROVIDER$ 的 API Key | Please enter $PROVIDER$ API Key in Settings. |
| `toast_ai_no_features` | 请先在设置中开启 AI 功能（手动优化/手动分组等） | Please enable AI features in Settings. |
| `toast_ai_optimizing` | 正在 AI 优化...（请勿刷新页面） | AI optimizing... (Do not refresh) |
| `toast_ai_done` | AI 优化完成！ | AI optimization complete! |
| `toast_ai_failed` | AI 优化失败: $ERROR$ | AI optimization failed: $ERROR$ |

### 3.16 时间格式化

| key | 中文 | 英文 |
|-----|------|------|
| `time_just_now` | 刚刚 | Just now |
| `time_minutes_ago` | $N$分钟前 | $N$ min ago |
| `time_hours_ago` | $N$小时前 | $N$ hr ago |
| `time_days_ago` | $N$天前 | $N$ days ago |
| `time_months_ago` | $N$月前 | $N$ months ago |
| `time_years_ago` | $N$年前 | $N$ years ago |
| `time_never` | 从未查看 | Never viewed |

### 3.17 弹窗通用

| key | 中文 | 英文 |
|-----|------|------|
| `modal_add_bookmark_title` | 添加书签 | Add Bookmark |
| `modal_add_bookmark_message` | 请输入网址： | Enter the URL: |
| `modal_default_url` | https:// | https:// |
| `modal_new_group_title` | 新建分组 | New Group |
| `modal_new_group_message` | 输入分组名称： | Enter group name: |
| `modal_edit_group_title` | 编辑分组 | Edit Group |
| `modal_edit_group_message` | 修改分组名称： | Edit group name: |
| `modal_edit_auto_group_title` | 编辑分组名称 | Edit Group Name |
| `modal_edit_auto_group_message` | 修改显示名称（不影响域名筛选）： | Edit display name (does not affect domain filter): |
| `modal_bookmark_view_count` | $COUNT$次 | $COUNT$ views |

### 3.18 AI 供应商名称（ai-service.js）

| key | 中文 | 英文 |
|-----|------|------|
| `ai_provider_lmstudio` | LM Studio（推荐） | LM Studio (Recommended) |
| `ai_provider_openai` | OpenAI (GPT) | OpenAI (GPT) |
| `ai_provider_anthropic` | Anthropic (Claude) | Anthropic (Claude) |
| `ai_provider_aliyun` | 阿里云 (通义千问) | Alibaba Cloud (Qwen) |
| `ai_provider_zhipu` | 智谱 AI (ChatGLM) | Zhipu AI (ChatGLM) |
| `ai_provider_baidu` | 百度文心一言 | Baidu ERNIE Bot |
| `ai_provider_tencent` | 腾讯混元 | Tencent Hunyuan |
| `ai_provider_moonshot` | 月之暗面 (Kimi) | Moonshot (Kimi) |
| `ai_provider_google` | Google Gemini | Google Gemini |
| `ai_provider_custom` | 自定义 API | Custom API |

### 3.19 AI 默认提示词（双语）

AI 提示词是用户可编辑的，但默认值也应提供双语版本。根据浏览器语言加载对应的默认提示词。

---
**中文默认提示词** → 现有代码不变

**英文默认提示词** → 新增英文版本：

- `titleOptimization`: Prompt in English, output English titles
- `categorySuggestion`: Prompt in English, output English group names  
- `generateSummary`: Prompt in English, output English summary
- `smartSearch`: Prompt in English, output English keywords

注意：提示词中有特殊的约束（如"分组名称2-6个中文字"），英文版需要调整为相应的英文约束（如"Group name 2-4 English words"）。

---

## 四、实现步骤

### 阶段 1：基础设施搭建（预计 1 天）

**Step 1.1** — 创建共享 i18n 工具模块 `js/modules/i18n.js`

```javascript
/**
 * i18n 国际化工具模块
 * 统一封装 chrome.i18n.getMessage，提供便捷的翻译方法
 */
class I18n {
  /**
   * 获取翻译文本
   * @param {string} key - 消息 key
   * @param {string|string[]} substitutions - 替换参数
   * @returns {string}
   */
  static t(key, ...substitutions) {
    // 降级处理：如果 chrome.i18n 不可用（如 website 页面）
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      return chrome.i18n.getMessage(key, substitutions) || key;
    }
    return key;
  }

  /** 格式化时间 */
  static formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return I18n.t('time_years_ago', [String(years)]);
    if (months > 0) return I18n.t('time_months_ago', [String(months)]);
    if (days > 0) return I18n.t('time_days_ago', [String(days)]);
    if (hours > 0) return I18n.t('time_hours_ago', [String(hours)]);
    if (minutes > 0) return I18n.t('time_minutes_ago', [String(minutes)]);
    return I18n.t('time_just_now');
  }
}
```

**Step 1.2** — 扩充 `_locales/zh_CN/messages.json`（添加上述所有 key）

**Step 1.3** — 扩充 `_locales/en/messages.json`（添加上述所有 key，英文翻译）

### 阶段 2：HTML 页面改造（预计 1 天）

**Step 2.1** — 改造 `new-tab.html`
- 所有硬编码中文文本替换为 `<span data-i18n="key">默认中文</span>`
- 页面加载后通过 JS 批量替换 `data-i18n` 元素
- `placeholder`、`title`、`alt` 属性使用 `data-i18n-attr` 标记

**Step 2.2** — 改造 `settings.html`
- 同上方法
- `<select>` 的 `<option>` 通过 JS 动态生成

**Step 2.3** — 改造 `sidebar.html`
- 同上方法

**Step 2.4** — 创建 `js/modules/i18n-bind.js`（DOM 绑定工具）
```javascript
// 页面加载后自动将 data-i18n 属性替换为翻译文本
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.dataset.i18n;
  el.textContent = I18n.t(key);
});
document.querySelectorAll('[data-i18n-attr]').forEach(el => {
  const attrs = el.dataset.i18nAttr.split(',');
  attrs.forEach(attr => {
    const [attrName, key] = attr.split(':');
    el.setAttribute(attrName.trim(), I18n.t(key.trim()));
  });
});
```

### 阶段 3：JS 逻辑改造（预计 1-2 天）

**Step 3.1** — `js/background.js`
- 右键菜单 `title` 使用 `chrome.i18n.getMessage()`
- 通知消息使用 `I18n.t()`（Service Worker 中直接使用 `chrome.i18n.getMessage()`）
- 注意：Service Worker 不加载页面 JS，需独立使用 `chrome.i18n.getMessage()`

```javascript
// Before
title: '添加到书签白板'

// After
title: chrome.i18n.getMessage('context_menu_add_page')
```

**Step 3.2** — `js/app-refactored.js`
- Toast 消息、弹窗标题全部改用 `I18n.t()`

**Step 3.3** — `js/settings.js`
- 所有 `showToast()`、`showConfirmModal()`、`showEditModal()` 的字符串参数改用 `I18n.t()`
- 排序 `formatTimeAgo()` 改用 `I18n.formatTimeAgo()`
- 动态生成的 HTML 内文本改用翻译函数

**Step 3.4** — `js/sidebar.js`
- 同上

**Step 3.5** — 所有模块文件
- `js/modules/ui-renderer.js` — `formatTimeAgo()` 改用 `I18n.formatTimeAgo()`
- `js/modules/bookmark-ops.js` — 所有消息改用 `I18n.t()`
- `js/modules/group-manager.js` — 所有菜单/提示改用 `I18n.t()`
- `js/modules/ai-integration.js` — 所有提示改用 `I18n.t()`
- `js/modules/modal.js` — 默认标题改用 `I18n.t()`

**Step 3.6** — `js/ai-service.js`
- AI 供应商配置映射中 name 字段改用 `I18n.t()` 或 key 映射

### 阶段 4：AI 默认提示词双语化（预计 0.5 天）

- 在 `DEFAULT_PROMPTS` 中新增英文版本
- `js/settings.js` 中 `resetToDefaultPrompt()` 根据当前语言加载对应的默认提示词
- 检测语言方法：`chrome.i18n.getUILanguage()` 判断是否以 `zh` 开头

### 阶段 5：Website 独立页面（预计 0.5 天）

- Website 页面无法使用 `chrome.i18n` API
- 方案：从 `_locales/` JSON 文件加载翻译字典
- 或者：将现有 `website/js/main.js` 的翻译字典与 `_locales/` 对齐

### 阶段 6：测试 & 完善（预计 1 天）

**测试清单：**
- [ ] Chrome 语言切换为英文 → 扩展所有页面显示英文
- [ ] Chrome 语言切换为中文 → 扩展所有页面显示中文
- [ ] 右键菜单标题随语言切换
- [ ] 时间格式化正确（中文：X天前，英文：X days ago）
- [ ] AI 默认提示词按语言加载
- [ ] Toast 消息正确翻译
- [ ] 弹窗按钮和文本正确翻译
- [ ] 排序选项正确翻译
- [ ] 空状态提示正确翻译
- [ ] 分组标签正确翻译
- [ ] 侧边栏所有文本正确翻译
- [ ] 网站页面正确翻译
- [ ] `$COUNT$` 等替换参数正确替换
- [ ] 长文本在英文下的布局适配（英文通常比中文长 30-50%）

---

## 五、文件加载顺序调整

改造后需要在所有页面最前面加载 i18n 工具模块：

```
new-tab.html:
  <script src="js/modules/i18n.js"></script>     ← 新增，最先加载
  <script src="js/ai-service.js"></script>
  <script src="js/modules/modal.js"></script>
  ...

settings.html:
  <script src="js/modules/i18n.js"></script>     ← 新增
  <script src="js/ai-service.js"></script>
  <script src="js/settings.js"></script>

sidebar.html:
  <script src="js/modules/i18n.js"></script>     ← 新增
  <script src="js/ai-service.js"></script>
  <script src="js/sidebar.js"></script>
```

---

## 六、关键技术细节

### 6.1 `chrome.i18n.getMessage` 的 substitutions

Chrome i18n API 支持 `$PLACEHOLDER$` 替换：

```json
// messages.json
{
  "toast_link_added": {
    "message": "已添加书签: $TITLE$",
    "placeholders": {
      "title": { "content": "$1" }
    }
  }
}
```

```javascript
// 调用
I18n.t('toast_link_added', link.title)
```

为了简化，`I18n.t()` 封装使用 `String.replace()` 实现：

```javascript
static t(key, ...substitutions) {
  let msg = chrome.i18n.getMessage(key) || key;
  substitutions.forEach((sub, i) => {
    msg = msg.replace(`$${i + 1}`, sub);  // $1, $2, ...
  });
  return msg;
}
```

### 6.2 HTML 属性翻译

对于 `placeholder`、`title`、`alt` 等属性：

```html
<!-- Before -->
<input placeholder="搜索书签..." title="搜索" />

<!-- After -->
<input data-i18n-attr="placeholder:header_search_placeholder,title:search" placeholder="搜索书签..." />
```

### 6.3 排序下拉框翻译

```html
<!-- 动态生成，避免硬编码 -->
<select id="sortSelect" class="sort-select"></select>
```

```javascript
const sortOptions = [
  { value: 'createdAt-desc',  key: 'sort_created_desc' },
  { value: 'createdAt-asc',   key: 'sort_created_asc' },
  { value: 'title-asc',       key: 'sort_title_asc' },
  { value: 'title-desc',      key: 'sort_title_desc' },
  { value: 'clickCount-desc', key: 'sort_clicks_desc' },
];
sortOptions.forEach(opt => {
  const option = document.createElement('option');
  option.value = opt.value;
  option.textContent = I18n.t(opt.key);
  sortSelect.appendChild(option);
});
```

### 6.4 日期时间格式化

```javascript
// 集中使用 I18n.formatTimeAgo()
// 根据 chrome.i18n.getUILanguage() 判断语言
// zh-CN → "3天前", en → "3 days ago"
```

---

## 七、工作量估算

| 阶段 | 内容 | 预估工时 |
|------|------|----------|
| 阶段1 | 基础搭建（i18n.js + messages.json 扩充） | 3-4 小时 |
| 阶段2 | HTML 页面改造（3个页面） | 3-4 小时 |
| 阶段3 | JS 逻辑改造（10+ 文件） | 6-8 小时 |
| 阶段4 | AI 提示词双语化 | 2-3 小时 |
| 阶段5 | Website 独立页面 | 2-3 小时 |
| 阶段6 | 测试 & 完善 | 3-4 小时 |
| **总计** | | **约 3-4 个工作日** |

---

## 八、注意事项

1. **`background.js` 特殊性**：Service Worker 中不能加载页面的 JS 模块，需直接使用 `chrome.i18n.getMessage()`
2. **Website 独立性**：`website/index.html` 是独立网站，无法使用 Chrome API，需加载 `_locales/` JSON
3. **英文布局适配**：英文文本通常比中文长 30-50%，需注意 CSS 弹性布局，避免文字溢出
4. **时间格式化**：中文用"天前/小时前"，英文用"days ago/hours ago"，单复数也需处理
5. **AI 输出语言**：用户的 AI 提示词可自定义，默认提示词需提供双语版本
6. **旧代码兼容**：`js/app.js`（1850行旧版代码）如果仍在使用，也需翻译；建议先确认是否已废弃
7. **FAQ/GUIDE 文档**：`GUIDE.md`、`README.md` 等 Markdown 文档建议也提供英文版本
8. **版本号**：`v3.2.7` 在多处硬编码，建议集中管理

---

## 九、后续优化建议

1. **语言切换功能**：当前方案依赖 Chrome 浏览器语言，可增加手动切换开关（覆盖浏览器设置）
2. **更多语言**：架构支持后，添加日语(ja)、韩语(ko) 等只需新增 `_locales/xx/messages.json`
3. **README/GUIDE 双语**：提供英文版使用文档，方便国际用户
4. **Chrome Web Store**：发布英文版商店描述，拓展海外用户
