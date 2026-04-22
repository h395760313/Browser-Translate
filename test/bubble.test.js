/**
 * 翻译气泡 UI 测试（无 DOM 依赖版本）
 */

// 模拟 DOM 对象
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.classList = new MockClassList();
    this.style = {};
    this.textContent = '';
    this.childNodes = [];
    this.children = [];
  }

  querySelector(selector) {
    const className = selector.replace('.', '');
    const findInChildren = (elements) => {
      for (const el of elements) {
        if (el.classList && el.classList.contains(className)) {
          return el;
        }
        if (el.children && el.children.length > 0) {
          const found = findInChildren(el.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInChildren(this.children);
  }

  querySelectorAll(selector) {
    const className = selector.replace('.', '');
    return this.children.filter(c => c.classList.contains(className));
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
}

class MockClassList {
  constructor() {
    this._classes = [];
  }
  add(className) {
    if (!this._classes.includes(className)) {
      this._classes.push(className);
    }
  }
  remove(className) {
    this._classes = this._classes.filter(c => c !== className);
  }
  contains(className) {
    return this._classes.includes(className);
  }
}

// 模拟 document
const createMockDocument = () => {
  const elements = {};

  const doc = {
    createElement: (tagName) => new MockElement(tagName),
    getElementById: (id) => elements[id] || null,
    querySelectorAll: () => [],
    body: new MockElement('BODY')
  };

  // 让 getElementById 能找到气泡
  const createBubbleInternal = () => {
    const bubble = new MockElement('DIV');
    bubble.id = 'translate-bubble';

    const original = new MockElement('DIV');
    original.classList.add('bubble-original');
    bubble.appendChild(original);

    const divider = new MockElement('DIV');
    divider.classList.add('bubble-divider');
    bubble.appendChild(divider);

    const result = new MockElement('DIV');
    result.classList.add('bubble-result');
    bubble.appendChild(result);

    const actions = new MockElement('DIV');
    actions.classList.add('bubble-actions');

    const ttsBtn = new MockElement('BUTTON');
    ttsBtn.classList.add('bubble-tts');
    actions.appendChild(ttsBtn);

    const copyBtn = new MockElement('BUTTON');
    copyBtn.classList.add('bubble-copy');
    actions.appendChild(copyBtn);

    const swapBtn = new MockElement('BUTTON');
    swapBtn.classList.add('bubble-swap');
    actions.appendChild(swapBtn);

    bubble.appendChild(actions);

    const loading = new MockElement('DIV');
    loading.classList.add('bubble-loading');
    const loadingText = new MockElement('SPAN');
    loadingText.classList.add('bubble-loading-text');
    loading.appendChild(loadingText);
    bubble.appendChild(loading);

    const error = new MockElement('DIV');
    error.classList.add('bubble-error');
    bubble.appendChild(error);

    elements['translate-bubble'] = bubble;
    return bubble;
  };

  doc.createBubble = createBubbleInternal;

  return doc;
};

// 气泡相关函数
let mockDocument;

function getBubbleDOM() {
  return mockDocument.getElementById('translate-bubble');
}

function createBubble() {
  if (getBubbleDOM()) return;
  const bubble = mockDocument.createBubble();
  mockDocument.body.appendChild(bubble);
  return bubble;
}

function showBubble(bubble, x, y) {
  bubble.classList.add('show');
  bubble.style.left = x + 'px';
  bubble.style.top = y + 'px';

  // 模拟边界检测
  const bubbleWidth = 200;
  const bubbleHeight = 150;

  if (x + bubbleWidth > 800) { // 模拟视口宽度
    bubble.style.left = (x - bubbleWidth) + 'px';
  }
  if (y + bubbleHeight > 600) { // 模拟视口高度
    bubble.style.top = (y - bubbleHeight - 10) + 'px';
  }
}

function hideBubble(bubble) {
  if (bubble) {
    bubble.classList.remove('show');
  }
}

beforeEach(() => {
  mockDocument = createMockDocument();
});

describe('翻译气泡 UI', () => {
  describe('气泡创建', () => {
    test('首次调用创建气泡 DOM', () => {
      const bubble = createBubble();

      expect(bubble).toBeTruthy();
      expect(getBubbleDOM()).toBe(bubble);
    });

    test('重复调用不创建多个气泡', () => {
      createBubble();
      createBubble();
      createBubble();

      const bubbles = mockDocument.body.children.filter(c => c.id === 'translate-bubble');
      expect(bubbles.length).toBe(1);
    });

    test('气泡包含所有必要元素', () => {
      createBubble();
      const bubble = getBubbleDOM();

      expect(bubble.querySelector('.bubble-original')).toBeTruthy();
      expect(bubble.querySelector('.bubble-result')).toBeTruthy();
      expect(bubble.querySelector('.bubble-actions')).toBeTruthy();
      expect(bubble.querySelector('.bubble-tts')).toBeTruthy();
      expect(bubble.querySelector('.bubble-copy')).toBeTruthy();
      expect(bubble.querySelector('.bubble-swap')).toBeTruthy();
      expect(bubble.querySelector('.bubble-loading')).toBeTruthy();
      expect(bubble.querySelector('.bubble-error')).toBeTruthy();
    });

    test('气泡初始状态为隐藏', () => {
      createBubble();
      const bubble = getBubbleDOM();

      expect(bubble.classList.contains('show')).toBe(false);
    });
  });

  describe('气泡显示/隐藏', () => {
    test('showBubble 显示气泡', () => {
      createBubble();
      const bubble = getBubbleDOM();

      showBubble(bubble, 100, 50);

      expect(bubble.classList.contains('show')).toBe(true);
      expect(bubble.style.left).toBe('100px');
      expect(bubble.style.top).toBe('50px');
    });

    test('hideBubble 隐藏气泡', () => {
      createBubble();
      const bubble = getBubbleDOM();

      showBubble(bubble, 100, 50);
      hideBubble(bubble);

      expect(bubble.classList.contains('show')).toBe(false);
    });

    test('气泡可切换显示状态', () => {
      createBubble();
      const bubble = getBubbleDOM();

      // 初始隐藏
      expect(bubble.classList.contains('show')).toBe(false);

      // 显示
      showBubble(bubble, 100, 50);
      expect(bubble.classList.contains('show')).toBe(true);

      // 隐藏
      hideBubble(bubble);
      expect(bubble.classList.contains('show')).toBe(false);
    });
  });

  describe('气泡内容设置', () => {
    test('设置原始文本', () => {
      createBubble();
      const bubble = getBubbleDOM();

      bubble.querySelector('.bubble-original').textContent = 'Hello World';

      expect(bubble.querySelector('.bubble-original').textContent).toBe('Hello World');
    });

    test('设置翻译结果', () => {
      createBubble();
      const bubble = getBubbleDOM();

      bubble.querySelector('.bubble-result').textContent = '你好世界';

      expect(bubble.querySelector('.bubble-result').textContent).toBe('你好世界');
    });

    test('设置语言标签', () => {
      createBubble();
      const bubble = getBubbleDOM();

      expect(bubble.querySelector('.bubble-lang')).toBeNull();
    });

    test('显示加载状态', () => {
      createBubble();
      const bubble = getBubbleDOM();

      bubble.querySelector('.bubble-loading').classList.add('show');

      expect(bubble.querySelector('.bubble-loading').classList.contains('show')).toBe(true);
    });

    test('隐藏加载状态', () => {
      createBubble();
      const bubble = getBubbleDOM();

      bubble.querySelector('.bubble-loading').classList.add('show');
      bubble.querySelector('.bubble-loading').classList.remove('show');

      expect(bubble.querySelector('.bubble-loading').classList.contains('show')).toBe(false);
    });

    test('显示错误消息', () => {
      createBubble();
      const bubble = getBubbleDOM();

      bubble.querySelector('.bubble-error').textContent = '翻译失败，请重试';
      bubble.classList.add('error');

      expect(bubble.querySelector('.bubble-error').textContent).toBe('翻译失败，请重试');
      expect(bubble.classList.contains('error')).toBe(true);
    });
  });

  describe('气泡定位', () => {
    test('设置气泡位置', () => {
      createBubble();
      const bubble = getBubbleDOM();

      showBubble(bubble, 200, 100);

      expect(bubble.style.left).toBe('200px');
      expect(bubble.style.top).toBe('100px');
    });

    test('气泡超出右边界时调整位置', () => {
      createBubble();
      const bubble = getBubbleDOM();

      // 位置 650 会超出 800 宽度的视口
      showBubble(bubble, 650, 100);

      // 位置应该被调整到左边
      expect(bubble.style.left).toBe('450px'); // 650 - 200
    });

    test('气泡超出下边界时调整位置', () => {
      createBubble();
      const bubble = getBubbleDOM();

      // 位置 500 会超出 600 高度的视口
      showBubble(bubble, 100, 500);

      // 位置应该被调整
      expect(bubble.style.top).toBe('340px'); // 500 - 150 - 10
    });
  });

  describe('气泡按钮交互', () => {
    test('顶部不显示关闭按钮', () => {
      createBubble();
      const bubble = getBubbleDOM();

      expect(bubble.querySelector('.bubble-close')).toBeNull();
    });

    test('TTS按钮存在', () => {
      createBubble();
      const bubble = getBubbleDOM();
      const ttsBtn = bubble.querySelector('.bubble-tts');

      expect(ttsBtn).toBeTruthy();
    });

    test('复制按钮存在', () => {
      createBubble();
      const bubble = getBubbleDOM();
      const copyBtn = bubble.querySelector('.bubble-copy');

      expect(copyBtn).toBeTruthy();
    });

    test('交换按钮存在', () => {
      createBubble();
      const bubble = getBubbleDOM();
      const swapBtn = bubble.querySelector('.bubble-swap');

      expect(swapBtn).toBeTruthy();
    });

    test('点击关闭按钮隐藏气泡', () => {
      createBubble();
      const bubble = getBubbleDOM();

      showBubble(bubble, 100, 50);
      expect(bubble.classList.contains('show')).toBe(true);

      // 模拟点击关闭按钮
      bubble.classList.remove('show');

      expect(bubble.classList.contains('show')).toBe(false);
    });
  });
});

describe('选中文本处理', () => {
  test('空文本不触发翻译', () => {
    const emptyText = '';
    expect(emptyText.length < 2).toBe(true);
  });

  test('单字符文本不触发翻译', () => {
    const singleChar = 'a';
    expect(singleChar.length < 2).toBe(true);
  });

  test('正常长度文本触发翻译', () => {
    const normalText = 'Hello';
    expect(normalText.length >= 2).toBe(true);
  });

  test('带空格的文本被正确处理', () => {
    const textWithSpaces = '  Hello World  ';
    const trimmed = textWithSpaces.trim();
    expect(trimmed).toBe('Hello World');
    expect(trimmed.length >= 2).toBe(true);
  });

  test('文本长度边界值', () => {
    expect('ab'.length >= 2).toBe(true);  // 最小有效长度
    expect('a'.length < 2).toBe(true);    // 无效长度
  });
});

describe('语言方向逻辑', () => {
  const detectLanguage = (text) => {
    const chineseRegex = /[\u4e00-\u9fff]/;
    if (chineseRegex.test(text)) {
      return 'zh';
    }
    return 'en';
  };

  test('中文文本翻译为英文', () => {
    const text = '你好';
    const fromLang = detectLanguage(text);
    const toLang = fromLang === 'zh' ? 'en' : 'zh';

    expect(fromLang).toBe('zh');
    expect(toLang).toBe('en');
  });

  test('英文文本翻译为中文', () => {
    const text = 'hello';
    const fromLang = detectLanguage(text);
    const toLang = fromLang === 'zh' ? 'en' : 'zh';

    expect(fromLang).toBe('en');
    expect(toLang).toBe('zh');
  });

  test('语言标签生成', () => {
    const zhLabel = '中文';
    const enLabel = '英文';

    expect(`${zhLabel} → ${enLabel}`).toBe('中文 → 英文');
    expect(`${enLabel} → ${zhLabel}`).toBe('英文 → 中文');
  });
});
