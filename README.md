# Browser Translate - Chrome 扩展

一个基于 Manifest V3 的 Chrome 翻译插件，支持选中文本自动翻译、词典式单词详情、句子翻译、自动断句朗读和本地单词本管理。

## 功能特性

- **自动检测语言**：智能识别中文、英文和中英混合文本
- **词典单词卡片**：单词模式显示音标、词性和简短释义
- **句子翻译**：句子模式只显示译文结果，保留原文朗读
- **自动断句朗读**：长句按标点和语义从句自动拆分朗读
- **单词本**：支持保存单词和句子，数据保存在本地
- **单词本窗口**：独立窗口支持搜索和管理已保存内容
- **复制功能**：一键复制译文
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
3. 可点击播放按钮朗读、📋 复制译文

### 方式二：Popup 翻译
1. 点击工具栏中的扩展图标
2. 输入或粘贴文本
3. 选择语言方向并翻译

### 方式三：单词本
1. 在单词模式或句子模式中点击“加入单词本”
2. 点击 popup 里的“打开单词本”
3. 在独立窗口中搜索、查看和移除条目

## 项目结构

```
Browser-Translate/
├── manifest.json      # 扩展配置文件（Manifest V3）
├── background.js      # 后台服务脚本
├── content.js         # 内容脚本（页面交互）
├── translation-rules.js # 选词/混合文本处理规则
├── word-details.js    # 单词详情与词典卡片渲染
├── tts-utils.js       # 自动断句朗读工具
├── wordbook.js        # 本地单词本存储
├── wordbook.html      # 单词本窗口页面
├── wordbook-page.js   # 单词本窗口逻辑
├── wordbook-search.js # 单词本查询逻辑
├── styles.css         # 翻译气泡样式
├── popup.html         # 弹出页面
├── popup.js           # 弹出页面逻辑
├── icons/             # 图标文件（16/48/128）
├── test/              # 单元测试
│   ├── setup.js       # 测试环境配置
│   ├── bubble.test.js # 气泡相关测试
│   ├── bubble-layout.test.js
│   ├── language.test.js
│   ├── selection-rules.test.js
│   ├── translate.test.js
│   ├── tts-utils.test.js
│   ├── word-details.test.js
│   ├── wordbook-search.test.js
│   └── wordbook.test.js
├── jest.config.js     # Jest 配置
└── package.json      # 项目依赖
```

## 开发命令

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 语法检查
node --check background.js
node --check content.js
node --check popup.js
```

## 技术栈

- Manifest V3
- 原生 JavaScript
- Jest（单元测试）
- 百度翻译 API（句子翻译）
- dictionaryapi.dev / FreeDictionaryAPI（单词释义和音标）

## API 说明

句子翻译使用百度翻译接口。单词模式会先查 dictionaryapi.dev，缺少音标时再回退到 FreeDictionaryAPI。

## 注意事项

- 翻译气泡会在页面选择文本后自动显示
- 点击页面其他区域可关闭气泡
- TTS 使用 Web Speech API，长句会自动断句后顺序朗读
- 单词本数据保存在 `chrome.storage.local`
