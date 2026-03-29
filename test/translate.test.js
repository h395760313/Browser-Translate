/**
 * 翻译 API 和缓存机制测试
 */

// 模拟 fetch
let translateText;
let cache;

// 在所有测试前重置 fetch mock 和缓存
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();

  // 翻译函数
  translateText = async (text, fromLang, toLang) => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error(data.responseDetails || '翻译失败');
    }
  };

  // 缓存对象
  cache = {};
});

// 辅助函数：从 URL 中提取参数
function extractParams(url) {
  const params = {};
  const queryString = url.split('?')[1];
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[key] = decodeURIComponent(value);
    });
  }
  return params;
}

describe('翻译 API 功能', () => {
  describe('中译英', () => {
    test('成功翻译中文到英文', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: {
            translatedText: 'Hello World'
          }
        })
      });

      const result = await translateText('你好世界', 'zh', 'en');

      expect(result).toBe('Hello World');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 验证请求参数
      const call = global.fetch.mock.calls[0];
      const params = extractParams(call[0]);
      expect(params.q).toBe('你好世界');
      expect(params.langpair).toBe('zh|en');
    });

    test('成功翻译句子', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: {
            translatedText: 'How are you'
          }
        })
      });

      const result = await translateText('你好吗', 'zh', 'en');
      expect(result).toBe('How are you');
    });
  });

  describe('英译中', () => {
    test('成功翻译英文到中文', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: {
            translatedText: '你好'
          }
        })
      });

      const result = await translateText('hello', 'en', 'zh');
      expect(result).toBe('你好');

      // 验证请求参数
      const call = global.fetch.mock.calls[0];
      const params = extractParams(call[0]);
      expect(params.q).toBe('hello');
      expect(params.langpair).toBe('en|zh');
    });
  });

  describe('API 错误处理', () => {
    test('API 返回错误状态时抛出异常', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 403,
          responseDetails: 'QUOTA EXCEEDED'
        })
      });

      await expect(translateText('test', 'en', 'zh')).rejects.toThrow('QUOTA EXCEEDED');
    });

    test('网络请求失败时抛出异常', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network Error'));

      await expect(translateText('test', 'en', 'zh')).rejects.toThrow('Network Error');
    });

    test('处理无效响应格式', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: {}
        })
      });

      const result = await translateText('test', 'en', 'zh');
      expect(result).toBeUndefined();
    });
  });

  describe('URL 编码', () => {
    test('正确编码特殊字符', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'result' }
        })
      });

      await translateText('你好 世界', 'zh', 'en');

      const call = global.fetch.mock.calls[0];
      expect(call[0]).toContain(encodeURIComponent('你好 世界'));
    });

    test('正确编码混合语言文本', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'result' }
        })
      });

      await translateText('Hello 你好', 'en', 'zh');

      const call = global.fetch.mock.calls[0];
      expect(call[0]).toContain('Hello%20%E4%BD%A0%E5%A5%BD');
    });
  });
});

describe('翻译缓存机制', () => {
  // 带缓存的翻译函数
  async function translateWithCache(text, fromLang, toLang) {
    const cacheKey = `${text}|${fromLang}|${toLang}`;

    // 检查缓存
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    const result = await translateText(text, fromLang, toLang);

    // 存入缓存
    cache[cacheKey] = result;

    return result;
  }

  beforeEach(() => {
    // 重置缓存
    cache = {};
    jest.clearAllMocks();
  });

  test('首次翻译发起 API 请求', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        responseStatus: 200,
        responseData: { translatedText: 'Hello' }
      })
    });

    const result = await translateWithCache('你好', 'zh', 'en');

    expect(result).toBe('Hello');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('相同文本使用缓存，不发起新请求', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        responseStatus: 200,
        responseData: { translatedText: 'Hello' }
      })
    });

    // 第一次翻译
    await translateWithCache('你好', 'zh', 'en');

    // 第二次翻译相同文本
    const cachedResult = await translateWithCache('你好', 'zh', 'en');

    expect(cachedResult).toBe('Hello');
    expect(global.fetch).toHaveBeenCalledTimes(1); // 仍然是 1 次请求
  });

  test('不同文本发起新请求', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'Hello' }
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'World' }
        })
      });

    await translateWithCache('你好', 'zh', 'en');
    await translateWithCache('世界', 'zh', 'en');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('不同语言方向使用不同的缓存键', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'Hello' }
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: '你好' }
        })
      });

    await translateWithCache('你好', 'zh', 'en');
    await translateWithCache('hello', 'en', 'zh');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('缓存包含多个不同文本', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'Hello' }
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'World' }
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'Test' }
        })
      });

    await translateWithCache('你好', 'zh', 'en');
    await translateWithCache('世界', 'zh', 'en');
    await translateWithCache('测试', 'zh', 'en');

    // 再次请求相同文本
    await translateWithCache('你好', 'zh', 'en');
    await translateWithCache('世界', 'zh', 'en');

    // 只有 3 次请求（每种文本一次）
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('空格差异视为不同文本', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'a' }
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: { translatedText: 'b' }
        })
      });

    await translateWithCache('hello', 'en', 'zh');
    await translateWithCache(' hello', 'en', 'zh'); // 前面有空格

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
