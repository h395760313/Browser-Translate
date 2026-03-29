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
        <button class="bubble-tts bubble-tts-original" title="朗读原文">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <div class="bubble-original"></div>
    </div>
    <div class="bubble-divider"></div>
    <div class="bubble-column bubble-result-col">
      <div class="bubble-col-header">
        <span class="bubble-col-label">译文</span>
        <button class="bubble-tts bubble-tts-result" title="朗读译文">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <div class="bubble-result"></div>
    </div>
  </div>
  <div class="bubble-actions">
    <button class="bubble-copy" title="复制译文">📋</button>
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
  if (rect.right > window.innerWidth) {
    bubble.style.left = (x - rect.width) + 'px';
  }
  if (rect.bottom > window.innerHeight) {
    bubble.style.top = (y - rect.height - 10) + 'px';
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
const REQUEST_TIMEOUT = 5000; // 请求超时时间（毫秒）

// 生成缓存键
function getCacheKey(text, fromLang, toLang) {
  return `${fromLang}|${toLang}|${text}`;
}

// 翻译函数 - 使用 MyMemory API，带缓存和超时，支持长文本分chunk翻译
const MAX_TEXT_LENGTH = 450; // API限制500字符，留出余量

async function translateText(text, fromLang, toLang) {
  const cacheKey = getCacheKey(text, fromLang, toLang);

  // 检查缓存
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  let result;
  if (text.length > MAX_TEXT_LENGTH) {
    // 长文本分chunk翻译
    result = await translateLongText(text, fromLang, toLang);
  } else {
    result = await translateSingle(text, fromLang, toLang);
  }

  // 存入缓存
  if (translationCache.size >= CACHE_MAX_SIZE) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(cacheKey, result);

  return result;
}

// 单次翻译请求
async function translateSingle(text, fromLang, toLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.responseStatus === 200) {
      let text = data.responseData.translatedText;
      // 如果是英文译文，规范化大小写（首字母大写，其余小写）
      if (toLang === 'en') {
        text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      }
      return text;
    } else {
      throw new Error(data.responseDetails || '翻译失败');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('翻译请求超时，请检查网络连接');
    }
    console.error('翻译请求失败:', error);
    throw error;
  }
}

// 长文本分chunk翻译
async function translateLongText(text, fromLang, toLang) {
  const chunks = splitTextIntoChunks(text, MAX_TEXT_LENGTH);
  const translatedChunks = [];

  for (const chunk of chunks) {
    const translated = await translateSingle(chunk, fromLang, toLang);
    translatedChunks.push(translated);
  }

  return translatedChunks.join('');
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

// 监听文本选择事件
document.addEventListener('mouseup', async (e) => {
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

  // 关闭按钮
  if (e.target.classList.contains('bubble-close')) {
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
});

// 点击页面其他地方隐藏气泡
document.addEventListener('mousedown', (e) => {
  const bubble = getBubbleDOM();
  if (bubble && !bubble.contains(e.target)) {
    bubble.classList.remove('show');
  }
});
