# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Chrome 浏览器翻译插件（Manifest V3），支持选中文本自动检测语言并翻译为中/英文，提供 TTS 朗读功能。

## 开发命令

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 安装扩展
# 1. 打开 chrome://extensions/
# 2. 开启"开发者模式"
# 3. 点击"加载已解压的扩展程序"
# 4. 选择本项目文件夹

# Node 语法检查（如需要）
node --check background.js
node --check content.js
node --check popup.js
```

## 架构

```
├── manifest.json       # 扩展配置（Manifest V3）
├── content.js          # 内容脚本：监听选中文本、显示翻译气泡
├── background.js       # 后台服务脚本：处理消息通信
├── popup.html/js       # 插件 popup 页面
├── styles.css          # 翻译气泡样式（含暗色模式）
├── icons/              # 扩展图标（16/48/128.png）
├── test/               # 单元测试
│   ├── setup.js        # Jest 测试环境配置
│   ├── bubble.test.js  # 气泡组件测试
│   ├── language.test.js # 语言检测测试
│   └── translate.test.js # 翻译功能测试
└── jest.config.js      # Jest 测试框架配置
```

## 核心功能

| 功能 | 实现方式 |
|------|---------|
| 划词翻译 | `mouseup` 事件 + `window.getSelection()` |
| 语言检测 | Unicode 中文字符范围判断 |
| 翻译 API | MyMemory 免费 API（`api.mymemory.translated.net`） |
| TTS 朗读 | Web Speech API（`speechSynthesis`） |
| 暗色模式 | CSS `@media (prefers-color-scheme: dark)` |

## 技术要点

- **翻译气泡定位**：使用 `Range.getBoundingClientRect()` 获取选中区域坐标
- **语言方向**：中文→英文，英文→中文（自动切换）
- **权限**：仅需 `storage`、`activeTab`、`scripting`，主机权限仅 `api.mymemory.translated.net`
- **Popup**：通过 `chrome.storage.sync` 存储用户设置

## 测试

项目使用 Jest 进行单元测试，测试文件位于 `test/` 目录：
- `bubble.test.js` - 翻译气泡相关功能
- `language.test.js` - 语言检测逻辑
- `translate.test.js` - 翻译 API 调用

## 文件说明

- `content.js` 负责所有前端交互（选词检测、翻译气泡渲染、用户操作）
- `background.js` 作为中转（接收来自 content script 的翻译请求并返回结果）
- 翻译气泡直接注入页面 DOM，使用 CSS 变量支持主题适配
