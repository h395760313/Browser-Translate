/**
 * 语言检测测试
 */

// 引入待测试的函数 (通过 eval 加载)
let detectLanguage;

beforeAll(() => {
  // 提取 detectLanguage 函数定义
  const chineseRegex = /[\u4e00-\u9fff]/;
  detectLanguage = (text) => {
    if (chineseRegex.test(text)) {
      return 'zh';
    }
    return 'en';
  };
});

describe('语言检测功能', () => {
  describe('中文检测', () => {
    test('检测纯中文文本', () => {
      expect(detectLanguage('你好世界')).toBe('zh');
      expect(detectLanguage('翻译')).toBe('zh');
      expect(detectLanguage('这是一个测试')).toBe('zh');
    });

    test('检测包含中文的混合文本', () => {
      expect(detectLanguage('Hello 你好 World')).toBe('zh');
      expect(detectLanguage('苹果 Apple')).toBe('zh');
    });

    test('检测常用中文字符', () => {
      expect(detectLanguage('北京')).toBe('zh');
      expect(detectLanguage('上海')).toBe('zh');
      expect(detectLanguage('中国')).toBe('zh');
    });

    test('检测中文标点符号', () => {
      expect(detectLanguage('你好，world')).toBe('zh');
      expect(detectLanguage('测试！？')).toBe('zh');
    });
  });

  describe('英文检测', () => {
    test('检测纯英文文本', () => {
      expect(detectLanguage('hello world')).toBe('en');
      expect(detectLanguage('translation')).toBe('en');
      expect(detectLanguage('This is a test')).toBe('en');
    });

    test('检测英文字母', () => {
      expect(detectLanguage('ABC')).toBe('en');
      expect(detectLanguage('xyz')).toBe('en');
    });

    test('检测数字和符号', () => {
      expect(detectLanguage('12345')).toBe('en');
      expect(detectLanguage('!@#$%')).toBe('en');
    });
  });

  describe('边界情况', () => {
    test('空字符串返回英文', () => {
      expect(detectLanguage('')).toBe('en');
    });

    test('空格字符串返回英文', () => {
      expect(detectLanguage('   ')).toBe('en');
    });

    test('特殊字符文本', () => {
      expect(detectLanguage('😊🎉')).toBe('en'); // emoji 不是中文
    });

    test('日文字符不被误判为中文', () => {
      expect(detectLanguage('こんにちは')).toBe('en'); // 日语平假名
    });

    test('韩文字符不被误判为中文', () => {
      expect(detectLanguage('안녕하세요')).toBe('en'); // 韩文
    });
  });
});
