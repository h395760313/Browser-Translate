const {
  analyzeSelection,
  splitMixedText,
  mergeMixedTranslation
} = require('../translation-rules');

describe('选词翻译规则', () => {
  test('纯中文文本直接跳过翻译', () => {
    expect(analyzeSelection('这是一个中文句子').mode).toBe('skip');
  });

  test('单个英文单词进入单词详情模式', () => {
    const analysis = analyzeSelection('translation');

    expect(analysis.mode).toBe('single-word');
    expect(analysis.isSingleEnglishWord).toBe(true);
  });

  test('带首尾空白的单个英文单词仍进入单词详情模式', () => {
    const analysis = analyzeSelection('  translation  ');

    expect(analysis.mode).toBe('single-word');
    expect(analysis.normalizedText).toBe('translation');
  });

  test('带不可见空白的单个英文单词仍进入单词详情模式', () => {
    const analysis = analyzeSelection('\u200Btranslation\u200B');

    expect(analysis.mode).toBe('single-word');
    expect(analysis.normalizedText).toBe('translation');
  });

  test('英文句子仍然走普通整句翻译', () => {
    expect(analyzeSelection('This is a test sentence.').mode).toBe('translate');
  });

  test('中英混合文本只拆分英文片段', () => {
    expect(splitMixedText('今天学习 English grammar 很重要')).toEqual([
      { type: 'static', text: '今天学习 ' },
      { type: 'english', text: 'English grammar' },
      { type: 'static', text: ' 很重要' }
    ]);
  });

  test('中英混合文本保留中文并拼接英文翻译结果', () => {
    const segments = [
      { type: 'static', text: '今天学习 ' },
      { type: 'english', text: 'English grammar' },
      { type: 'static', text: ' 很重要' }
    ];

    expect(mergeMixedTranslation(segments, ['英语语法'])).toBe('今天学习 英语语法 很重要');
  });
});
