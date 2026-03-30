// Popup 页面脚本
document.addEventListener('DOMContentLoaded', async () => {
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
  const screenshotBtn = document.getElementById('screenshot-btn');
  const autoTranslateToggle = document.getElementById('auto-translate-toggle');
  const screenshotShortcut = document.getElementById('screenshot-shortcut');
  const shortcutError = document.getElementById('shortcut-error');

  // 读取设置
  const settings = await chrome.storage.sync.get({
    autoTranslate: true,
    screenshotShortcut: 'Ctrl+Shift+X'
  });

  // 初始化开关状态
  if (settings.autoTranslate) {
    autoTranslateToggle.classList.add('active');
  }
  screenshotShortcut.value = settings.screenshotShortcut;

  // 自动翻译开关
  autoTranslateToggle.addEventListener('click', async () => {
    const isActive = autoTranslateToggle.classList.toggle('active');
    await chrome.storage.sync.set({ autoTranslate: isActive });
    // 通知 content script 设置变更
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'settingsChanged',
          autoTranslate: isActive
        });
      }
    });
  });

  // 快捷键设置
  screenshotShortcut.addEventListener('click', async () => {
    screenshotShortcut.placeholder = '按下快捷键...';
    screenshotShortcut.value = '';
    shortcutError.classList.remove('show');

    const onKeyDown = async (e) => {
      e.preventDefault();
      const keys = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');

      const key = e.key.toUpperCase();
      if (!['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) {
        keys.push(key);

        // 检查快捷键是否被占用
        try {
          const commands = await chrome.commands.getAll();
          const existingCmd = commands.find(cmd =>
            cmd.shortcut && cmd.shortcut.includes(key) &&
            cmd.shortcut.includes('Ctrl') === e.ctrlKey &&
            cmd.shortcut.includes('Shift') === e.shiftKey &&
            cmd.shortcut.includes('Alt') === e.altKey
          );

          if (existingCmd) {
            shortcutError.textContent = `快捷键已被 "${existingCmd.name || '其他命令'}" 占用`;
            shortcutError.classList.add('show');
            screenshotShortcut.value = settings.screenshotShortcut;
          } else {
            const shortcutStr = keys.join('+');
            screenshotShortcut.value = shortcutStr;
            await chrome.storage.sync.set({ screenshotShortcut: shortcutStr });
            shortcutError.classList.remove('show');
          }
        } catch (err) {
          // 如果 commands API 出错，直接保存
          const shortcutStr = keys.join('+');
          screenshotShortcut.value = shortcutStr;
          await chrome.storage.sync.set({ screenshotShortcut: shortcutStr });
        }

        screenshotShortcut.placeholder = 'Ctrl+Shift+X';
        document.removeEventListener('keydown', onKeyDown);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // 3秒超时
    setTimeout(() => {
      document.removeEventListener('keydown', onKeyDown);
      if (!screenshotShortcut.value) {
        screenshotShortcut.value = settings.screenshotShortcut;
        screenshotShortcut.placeholder = 'Ctrl+Shift+X';
      }
    }, 3000);
  });

  // 截图按钮
  screenshotBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'startScreenshot' });
        window.close();
      }
    });
  });

  // 语言检测
  function detectLanguage(text) {
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(text) ? 'zh' : 'en';
  }

  // 翻译
  async function translate(text, from, to) {
    if (from === 'auto') {
      from = detectLanguage(text);
    }

    if (from === to) {
      to = from === 'zh' ? 'en' : 'zh';
    }

    // 通过 background script 调用百度翻译
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'translate',
        text: text,
        from: from,
        to: to
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve({ text: response.result, from: from, to: to });
      });
    });
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

  inputText.focus();
});
