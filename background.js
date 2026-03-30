// Background Service Worker - 处理快捷键和截图请求

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'startScreenshot' });
      }
    });
  }
});

// 处理 content script 的截图请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'captureTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true; // 异步响应
  }
});
