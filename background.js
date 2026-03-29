// 翻译气泡框的HTML模板
const popupTemplate = `
<div id="translate-bubble">
  <div class="bubble-header">
    <span class="bubble-lang"></span>
    <button class="bubble-close" title="关闭">&times;</button>
  </div>
  <div class="bubble-original"></div>
  <div class="bubble-divider"></div>
  <div class="bubble-result"></div>
  <div class="bubble-actions">
    <button class="bubble-tts" title="朗读">🔊</button>
    <button class="bubble-copy" title="复制">📋</button>
    <button class="bubble-swap" title="交换语言">⇄</button>
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
function createBubble(container) {
  if (getBubbleDOM()) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = popupTemplate;
  const bubble = wrapper.firstElementChild;
  container.appendChild(bubble);
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

// 翻译函数 - 使用 MyMemory API
async function translateText(text, fromLang, toLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error(data.responseDetails || '翻译失败');
    }
  } catch (error) {
    console.error('翻译请求失败:', error);
    throw error;
  }
}

// TTS朗读
function speakText(text, lang) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

// 主初始化逻辑
function initTranslator() {
  let currentBubble = null;
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

      // 如果选中文本与上次相同，切换气泡显示/隐藏
      if (selectedText === currentSelection) {
        const bubble = getBubbleDOM();
        if (bubble) {
          if (bubble.classList.contains('show')) {
            bubble.classList.remove('show');
          } else {
            showBubbleAtSelection(bubble, selection);
          }
        }
        return;
      }

      currentSelection = selectedText;
      currentFromLang = detectLanguage(selectedText);
      currentToLang = currentFromLang === 'zh' ? 'en' : 'zh';

      // 创建或获取气泡
      let bubble = getBubbleDOM();
      if (!bubble) {
        bubble = createBubble(document.body);
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

    // TTS按钮
    if (e.target.classList.contains('bubble-tts')) {
      const text = bubble.querySelector('.bubble-result').textContent;
      if (text) {
        speakText(text, currentToLang);
      }
      return;
    }

    // 复制按钮
    if (e.target.classList.contains('bubble-copy')) {
      const text = bubble.querySelector('.bubble-result').textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          e.target.textContent = '✓';
          setTimeout(() => {
            e.target.textContent = '📋';
          }, 1000);
        });
      }
      return;
    }

    // 交换语言按钮
    if (e.target.classList.contains('bubble-swap')) {
      const original = bubble.querySelector('.bubble-original').textContent;
      const result = bubble.querySelector('.bubble-result').textContent;
      if (result) {
        currentFromLang = currentFromLang === 'zh' ? 'en' : 'zh';
        currentToLang = currentFromLang === 'zh' ? 'en' : 'zh';
        currentSelection = result;

        bubble.querySelector('.bubble-original').textContent = result;
        bubble.querySelector('.bubble-lang').textContent =
          `${currentFromLang === 'zh' ? '中文' : '英文'} → ${currentToLang === 'zh' ? '中文' : '英文'}`;
        bubble.querySelector('.bubble-loading').classList.add('show');
        bubble.querySelector('.bubble-result').textContent = '';
        bubble.querySelector('.bubble-error').textContent = '';
        bubble.classList.remove('error');

        translateText(result, currentFromLang, currentToLang)
          .then(translated => {
            bubble.querySelector('.bubble-result').textContent = translated;
            bubble.querySelector('.bubble-loading').classList.remove('show');
          })
          .catch(() => {
            bubble.querySelector('.bubble-loading').classList.remove('show');
            bubble.querySelector('.bubble-error').textContent = '翻译失败，请重试';
            bubble.classList.add('error');
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
}

function showBubbleAtSelection(bubble, selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  showBubble(bubble, rect.right + 5, rect.top);
}

// 启动
initTranslator();
