// Popup 页面脚本
document.addEventListener('DOMContentLoaded', () => {
  const inputText = document.getElementById('input-text');
  const fromLang = document.getElementById('from-lang');
  const toLang = document.getElementById('to-lang');
  const translateBtn = document.getElementById('translate-btn');
  const loading = document.getElementById('loading');
  const errorMsg = document.getElementById('error-msg');
  const resultSection = document.getElementById('result-section');
  const resultText = document.getElementById('result-text');
  const btnTts = document.getElementById('btn-tts');
  const btnCopy = document.getElementById('btn-copy');

  // 语言检测
  function detectLanguage(text) {
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(text) ? 'zh' : 'en';
  }

  // 翻译
  async function translate(text, from, to) {
    // 如果选择自动检测，先检测语言
    if (from === 'auto') {
      from = detectLanguage(text);
    }

    // 如果源语言和目标语言相同，交换
    if (from === to) {
      to = from === 'zh' ? 'en' : 'zh';
    }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      let text = data.responseData.translatedText;
      // 如果是英文译文，规范化大小写（首字母大写，其余小写）
      if (to === 'en') {
        text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      }
      return {
        text: text,
        from: from,
        to: to
      };
    } else {
      throw new Error(data.responseDetails || '翻译失败');
    }
  }

  // 朗读
  function speak(text, lang) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  // 翻译按钮点击
  translateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) {
      showError('请输入要翻译的文本');
      return;
    }

    hideError();
    showLoading(true);
    resultSection.style.display = 'none';

    try {
      const result = await translate(text, fromLang.value, toLang.value);
      resultText.textContent = result.text;
      resultSection.style.display = 'block';

      // 保存当前翻译的语言对用于TTS
      resultSection.dataset.lang = result.to;
    } catch (error) {
      showError('翻译失败，请检查网络连接');
    } finally {
      showLoading(false);
    }
  });

  // TTS按钮
  btnTts.addEventListener('click', () => {
    const text = resultText.textContent;
    if (text) {
      speak(text, resultSection.dataset.lang || 'en');
    }
  });

  // 复制按钮
  btnCopy.addEventListener('click', () => {
    const text = resultText.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        btnCopy.textContent = '✓ 已复制';
        setTimeout(() => {
          btnCopy.textContent = '📋 复制';
        }, 1500);
      });
    }
  });

  // 语言切换
  fromLang.addEventListener('change', () => {
    if (fromLang.value === 'zh') {
      toLang.value = 'en';
    } else if (fromLang.value === 'en') {
      toLang.value = 'zh';
    }
  });

  // 辅助函数
  function showLoading(show) {
    loading.classList.toggle('show', show);
    translateBtn.disabled = show;
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('show');
  }

  function hideError() {
    errorMsg.classList.remove('show');
  }

  // 自动聚焦输入框
  inputText.focus();
});
