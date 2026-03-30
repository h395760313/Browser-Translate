// 翻译气泡框的HTML模板 - 左右布局
const popupTemplate = `
<div id="translate-bubble">
  <div class="bubble-header">
    <span class="bubble-lang"></span>
    <button class="bubble-close" title="关闭">&times;</button>
  </div>
  <div class="bubble-content">
    <div class="bubble-column bubble-original-col">
      <div class="bubble-col-header">
        <span class="bubble-col-label">原文</span>
        <div class="bubble-col-actions">
          <button class="bubble-tts bubble-tts-original" title="朗读原文">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>
      <div class="bubble-original"></div>
    </div>
    <div class="bubble-divider"></div>
    <div class="bubble-column bubble-result-col">
      <div class="bubble-col-header">
        <span class="bubble-col-label">译文</span>
        <div class="bubble-col-actions">
          <button class="bubble-tts bubble-tts-result" title="朗读译文">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="bubble-copy" title="复制译文">📋</button>
        </div>
      </div>
      <div class="bubble-result"></div>
    </div>
  </div>
  <div class="bubble-loading">
    <span class="bubble-loading-text">翻译中...</span>
  </div>
  <div class="bubble-error"></div>
</div>
`;

// 获取DOM结构中的气泡
function getBubbleDOM() {
  return document.getElementById('translate-bubble');
}

// 创建气泡并注入到页面
function createBubble() {
  if (getBubbleDOM()) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = popupTemplate;
  const bubble = wrapper.firstElementChild;
  document.body.appendChild(bubble);
  return bubble;
}

// 显示气泡
function showBubble(bubble, x, y) {
  bubble.classList.add('show');
  bubble.style.left = x + 'px';
  bubble.style.top = y + 'px';

  // 调整位置确保在视口内
  const rect = bubble.getBoundingClientRect();
  const padding = 10;

  // 右边界超限
  if (rect.right > window.innerWidth - padding) {
    bubble.style.left = (window.innerWidth - rect.width - padding) + 'px';
  }
  // 左边界超限
  if (rect.left < padding) {
    bubble.style.left = padding + 'px';
  }
  // 下边界超限
  if (rect.bottom > window.innerHeight - padding) {
    bubble.style.top = (window.innerHeight - rect.height - padding) + 'px';
  }
  // 上边界超限
  if (rect.top < padding) {
    bubble.style.top = padding + 'px';
  }
}

// 隐藏气泡
function hideBubble(bubble) {
  if (bubble) {
    bubble.classList.remove('show');
  }
}

// 语言检测
function detectLanguage(text) {
  // 简单检测：检查是否包含中文字符
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(text)) {
    return 'zh';
  }
  return 'en';
}

// 翻译缓存 - 使用 Map 存储已翻译的文本
const translationCache = new Map();

// 缓存配置
const CACHE_MAX_SIZE = 500; // 最大缓存条目数
const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）

// 生成缓存键
function getCacheKey(text, fromLang, toLang) {
  return `${fromLang}|${toLang}|${text}`;
}

// 翻译函数 - 通过 background script 调用百度 API
const MAX_TRANSLATE_LENGTH = 1000; // 单次翻译最大字符数

async function translateText(text, fromLang, toLang) {
  // 截断超长文本
  const truncatedText = text.length > MAX_TRANSLATE_LENGTH
    ? text.substring(0, MAX_TRANSLATE_LENGTH)
    : text;
  const cacheKey = getCacheKey(truncatedText, fromLang, toLang);

  // 检查缓存
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // 通过 background script 翻译
  return new Promise((resolve, reject) => {
    console.log('发送翻译请求:', { text: truncatedText, from: fromLang, to: toLang });
    chrome.runtime.sendMessage({
      type: 'translate',
      text: truncatedText,
      from: fromLang,
      to: toLang
    }, (response) => {
      console.log('收到响应:', response);
      if (chrome.runtime.lastError) {
        console.error('runtime.lastError:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.result);
    });
  }).then(result => {
    // 存入缓存
    if (translationCache.size >= CACHE_MAX_SIZE) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, result);
    return result;
  });
}

// 将文本分chunk，确保在句子/段落边界分割
function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // 如果单个句子超过限制，按单词/字符强制分割
      if (sentence.length > maxLength) {
        currentChunk = sentence;
        while (currentChunk.length > maxLength) {
          chunks.push(currentChunk.slice(0, maxLength));
          currentChunk = currentChunk.slice(maxLength);
        }
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// TTS朗读 - 使用更自然的语音
function speakText(text, lang) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = 0.8;           // 稍慢的语速
    utterance.pitch = 1.0;         // 正常音调
    utterance.volume = 1.0;        // 最大音量

    // 尝试选择更自然的语音
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => {
      if (lang === 'zh') {
        return v.lang.includes('zh') && v.name.includes('Natural') || v.name.includes('Premium');
      } else {
        return v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Google'));
      }
    });

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

// 预加载语音列表（部分浏览器需要）
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// 状态变量
let currentSelection = '';
let currentFromLang = '';
let currentToLang = '';

// 自动翻译设置
let autoTranslateEnabled = true;

// 初始化：读取设置
async function initSettings() {
  try {
    const settings = await chrome.storage.sync.get({ autoTranslate: true });
    autoTranslateEnabled = settings.autoTranslate;
  } catch (e) {
    console.error('读取设置失败:', e);
  }
}

// 消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsChanged') {
    autoTranslateEnabled = message.autoTranslate;
  }
  if (message.type === 'startScreenshot') {
    startScreenshotMode();
  }
});

// 初始化
initSettings();

// 监听文本选择事件
document.addEventListener('mouseup', async (e) => {
  // 如果点击在气泡内，不处理（让 click 事件处理）
  const bubble = getBubbleDOM();
  if (bubble && bubble.contains(e.target)) {
    return;
  }

  // 延迟获取选中文本，确保选择完成
  setTimeout(async () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // 如果没有选中文本或选中内容太少，隐藏气泡
    if (!selectedText || selectedText.length < 2) {
      const bubble = getBubbleDOM();
      if (bubble) {
        bubble.classList.remove('show');
      }
      return;
    }

    // 如果自动翻译关闭，不显示气泡
    if (!autoTranslateEnabled) {
      return;
    }

    currentSelection = selectedText;
    currentFromLang = detectLanguage(selectedText);
    currentToLang = currentFromLang === 'zh' ? 'en' : 'zh';

    // 创建或获取气泡
    let bubble = getBubbleDOM();
    if (!bubble) {
      bubble = createBubble();
      if (!bubble) return;
    }

    // 显示气泡并设置原始文本
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    bubble.querySelector('.bubble-original').textContent = selectedText;
    bubble.querySelector('.bubble-result').textContent = '';
    bubble.querySelector('.bubble-lang').textContent =
      `${currentFromLang === 'zh' ? '中文' : '英文'} → ${currentToLang === 'zh' ? '中文' : '英文'}`;
    bubble.classList.remove('show', 'error');
    bubble.querySelector('.bubble-loading').classList.add('show');

    showBubble(bubble, rect.right + 5, rect.top);

    // 执行翻译
    try {
      const result = await translateText(selectedText, currentFromLang, currentToLang);
      bubble.querySelector('.bubble-result').textContent = result;
      bubble.querySelector('.bubble-loading').classList.remove('show');
    } catch (error) {
      bubble.querySelector('.bubble-loading').classList.remove('show');
      bubble.querySelector('.bubble-error').textContent = '翻译失败，请重试';
      bubble.classList.add('error');
    }
  }, 10);
});

// 气泡内按钮事件
document.addEventListener('click', (e) => {
  const bubble = getBubbleDOM();
  if (!bubble) return;

  // 点击对话框内部，不关闭
  if (bubble.contains(e.target)) {
    // 关闭按钮
    if (e.target.classList.contains('bubble-close')) {
      window.speechSynthesis.cancel(); // 停止朗读
      bubble.classList.remove('show');
      currentSelection = '';
      return;
    }

    // 朗读原文按钮
    if (e.target.classList.contains('bubble-tts-original') || e.target.closest('.bubble-tts-original')) {
      const text = bubble.querySelector('.bubble-original').textContent;
      if (text) {
        speakText(text, currentFromLang);
      }
      return;
    }

    // 朗读译文按钮
    if (e.target.classList.contains('bubble-tts-result') || e.target.closest('.bubble-tts-result')) {
      const text = bubble.querySelector('.bubble-result').textContent;
      if (text) {
        speakText(text, currentToLang);
      }
      return;
    }

    // 复制译文按钮
    if (e.target.classList.contains('bubble-copy') || e.target.closest('.bubble-copy')) {
      const text = bubble.querySelector('.bubble-result').textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          const btn = bubble.querySelector('.bubble-copy');
          btn.textContent = '✓';
          setTimeout(() => {
            btn.textContent = '📋';
          }, 1000);
        });
      }
      return;
    }

    return;
  }

  // 点击对话框外部，关闭
  bubble.classList.remove('show');
});

// 截图翻译功能
let isScreenshotMode = false;
let selectionStartX = 0;
let selectionStartY = 0;

function createScreenshotOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'screenshot-overlay';
  overlay.innerHTML = '<div class="selection-box" style="display:none;"></div><div class="screenshot-hint">拖动选择区域，按 ESC 取消</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function removeScreenshotOverlay() {
  const overlay = document.getElementById('screenshot-overlay');
  if (overlay) {
    overlay.remove();
  }
}

async function captureAndCropImage(rect) {
  return new Promise((resolve, reject) => {
    // 通过 background script 截图
    chrome.runtime.sendMessage({ type: 'captureTab' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const dataUrl = response.dataUrl;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = img.width / window.innerWidth;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          rect.left * scale, rect.top * scale,
          rect.width * scale, rect.height * scale,
          0, 0,
          canvas.width, canvas.height
        );
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  });
}

async function ocrImage(imageData) {
  const url = 'https://api.ocr.space/parse/image';
  const formData = new FormData();
  formData.append('base64Image', 'data:image/png;base64,' + imageData);
  formData.append('language', 'eng'); // 英文
  formData.append('isOverlayRequired', 'false');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': '28be42b38f88957'
    },
    body: formData
  });

  const data = await response.json();

  if (data.ParsedResults && data.ParsedResults.length > 0) {
    return data.ParsedResults.map(r => r.ParsedText).join('\n');
  }

  if (data.ErrorMessage) {
    throw new Error(data.ErrorMessage);
  }

  throw new Error('OCR 识别失败');
}

function startScreenshotMode() {
  const bubble = getBubbleDOM();
  if (bubble) {
    bubble.classList.remove('show');
  }

  const overlay = createScreenshotOverlay();
  const selectionBox = overlay.querySelector('.selection-box');

  let isSelecting = false;
  let currentRect = { left: 0, top: 0, width: 0, height: 0 };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    isSelecting = true;
    selectionStartX = e.clientX;
    selectionStartY = e.clientY;
    currentRect = { left: e.clientX, top: e.clientY, width: 0, height: 0 };
    selectionBox.style.display = 'none';
  };

  const onMouseMove = (e) => {
    if (!isSelecting) return;

    const left = Math.min(selectionStartX, e.clientX);
    const top = Math.min(selectionStartY, e.clientY);
    const width = Math.abs(e.clientX - selectionStartX);
    const height = Math.abs(e.clientY - selectionStartY);

    currentRect = { left, top, width, height };

    if (width > 5 && height > 5) {
      selectionBox.style.display = 'block';
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    } else {
      selectionBox.style.display = 'none';
    }
  };

  const onMouseUp = async (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (currentRect.width < 10 || currentRect.height < 10) {
      removeScreenshotOverlay();
      return;
    }

    // 显示加载状态
    const hint = overlay.querySelector('.screenshot-hint');
    hint.textContent = '正在识别文字...';
    hint.className = 'screenshot-loading';

    try {
      const imageData = await captureAndCropImage(currentRect);
      const text = await ocrImage(imageData);

      removeScreenshotOverlay();

      // 清理 OCR 识别的文本
      let cleanedText = text || '';
      cleanedText = cleanedText
        .replace(/•/g, '·')  // 替换 bullet point
        .replace(/[\u2018\u2019]/g, "'")  // 替换特殊引号
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\r\n/g, '\n')  // 统一换行符
        .trim();

      const trimmedText = cleanedText;

      // 显示翻译气泡（无论是否识别到文字都显示）
      let bubble = getBubbleDOM();
      if (!bubble) {
        bubble = createBubble();
      }

      currentFromLang = detectLanguage(trimmedText || 'en');
      currentToLang = currentFromLang === 'zh' ? 'en' : 'zh';

      bubble.querySelector('.bubble-original').textContent = trimmedText || '（未识别到文字）';
      bubble.querySelector('.bubble-lang').textContent =
        `${currentFromLang === 'zh' ? '中文' : '英文'} → ${currentToLang === 'zh' ? '中文' : '英文'}`;
      bubble.classList.remove('error');
      bubble.querySelector('.bubble-loading').classList.remove('show');

      if (!trimmedText) {
        // 未识别到文字，显示提示后自动隐藏
        bubble.querySelector('.bubble-result').textContent = '';
        bubble.querySelector('.bubble-error').textContent = '未识别到文字，请重试';
        bubble.classList.add('error');
        showBubble(bubble, currentRect.left, currentRect.top + currentRect.height + 5);
        setTimeout(() => {
          const b = getBubbleDOM();
          if (b) b.classList.remove('show');
        }, 2000);
        return;
      }

      bubble.querySelector('.bubble-result').textContent = '';
      bubble.querySelector('.bubble-error').textContent = '';
      bubble.classList.add('show');
      bubble.querySelector('.bubble-loading').classList.add('show');

      showBubble(bubble, currentRect.left, currentRect.top + currentRect.height + 5);

      // 执行翻译
      currentSelection = trimmedText;
      try {
        console.log('开始翻译:', { trimmedText, currentFromLang, currentToLang });
        const result = await translateText(trimmedText, currentFromLang, currentToLang);
        console.log('翻译结果:', result);
        bubble.querySelector('.bubble-result').textContent = result;
        bubble.querySelector('.bubble-loading').classList.remove('show');
      } catch (error) {
        console.error('翻译失败:', error);
        bubble.querySelector('.bubble-loading').classList.remove('show');
        bubble.querySelector('.bubble-error').textContent = '翻译失败，请重试';
        bubble.classList.add('error');
      }
    } catch (error) {
      console.error('截图识别失败:', error);
      removeScreenshotOverlay();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      isSelecting = false;
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      removeScreenshotOverlay();
    }
  };

  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);
}
