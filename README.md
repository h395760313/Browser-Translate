# 智能翻译助手 - Chrome 扩展

一个基于 Manifest V3 的 Chrome 翻译插件，支持选中文本自动翻译、TTS 朗读等功能。

## 功能特性

- **自动检测语言**：智能识别中文/英文
- **即时翻译**：选中文本后自动弹出翻译气泡
- **TTS 朗读**：支持翻译结果的语音朗读
- **双向翻译**：支持中译英、英译中
- **复制功能**：一键复制翻译结果
- **语言交换**：快速切换翻译方向
- **暗色模式**：自动适配系统深色/浅色主题

## 安装方法

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目文件夹

## 使用方法

### 方式一：选中文本翻译
1. 在任意网页选中文本
2. 自动弹出翻译气泡
3. 可点击 🔊 朗读、📋 复制、⇄ 交换语言

### 方式二：Popup 翻译
1. 点击工具栏中的扩展图标
2. 输入或粘贴文本
3. 选择语言方向并翻译

## 项目结构

```
chrome-translate-plugin/
├── manifest.json      # 扩展配置文件
├── background.js      # 后台脚本
├── content.js         # 内容脚本（页面交互）
├── styles.css         # 翻译气泡样式
├── popup.html         # 弹出页面
├── popup.js           # 弹出页面逻辑
└── icons/             # 图标文件
```

## 技术栈

- Manifest V3
- 原生 JavaScript
- MyMemory Translation API（免费翻译接口）

## API 说明

使用 [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php)，每天免费翻译 5000 字符。

## 注意事项

- 翻译气泡会在页面选择文本后自动显示
- 点击页面其他区域可关闭气泡
- TTS 使用 Web Speech API，浏览器兼容性良好
