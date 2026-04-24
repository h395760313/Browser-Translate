const {
  extractMeaningSummaries,
  formatWordMeanings,
  renderWordDetailsCard,
  getBubbleModeClass,
  buildPartOfSpeechPrompt,
  normalizeGlossTranslation,
  normalizeEnglishText,
  normalizeLookupWord,
  pickWordPhonetic
} = require('../js/word-details');

describe('单词详情格式', () => {
  test('每个词性只保留首条简短释义', () => {
    const summaries = extractMeaningSummaries([
      {
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [
              { definition: 'a book that tells a story in prose form' },
              { definition: 'a long written narrative' }
            ]
          },
          {
            partOfSpeech: 'adjective',
            definitions: [
              { definition: 'relating to stories that describe imaginary events' }
            ]
          }
        ]
      }
    ]);

    expect(summaries).toEqual([
      { partOfSpeech: 'noun', label: 'n.', summary: 'book that tells a story in prose form' },
      { partOfSpeech: 'adjective', label: 'adj.', summary: 'relating to stories that describe imaginary events' }
    ]);
  });

  test('相同词性只取第一条定义', () => {
    const summaries = extractMeaningSummaries([
      {
        meanings: [
          {
            partOfSpeech: 'verb',
            definitions: [
              { definition: 'to move quickly from one place to another' },
              { definition: 'to travel rapidly' }
            ]
          }
        ]
      }
    ]);

    expect(summaries).toEqual([
      { partOfSpeech: 'verb', label: 'v.', summary: 'move quickly from one place to another' }
    ]);
  });

  test('不同词性按行展示', () => {
    const formatted = formatWordMeanings([
      { label: 'n.', text: '小说' },
      { label: 'adj.', text: '虚构的' }
    ]);

    expect(formatted).toBe('n. 小说\nadj. 虚构的');
  });

  test('词典卡片按词性渲染清晰列表', () => {
    const html = renderWordDetailsCard({
      word: 'fiction',
      phonetic: '/ˈfɪkʃən/',
      showTts: true,
      meanings: [
        { label: 'n.', text: '小说；虚构作品' },
        { label: 'adj.', text: '虚构的' }
      ]
    });

    expect(html).toContain('word-details-card');
    expect(html).toContain('word-details-headword');
    expect(html).toContain('word-details-list');
    expect(html).toContain('word-details-item');
    expect(html).toContain('n.');
    expect(html).toContain('adj.');
    expect(html).toContain('小说；虚构作品');
    expect(html).toContain('虚构的');
    expect(html).toContain('bubble-tts-original');
    expect(html).toContain('word-details-pronounce');
    expect(html).toContain('word-details-pronunciation');
  });

  test('词典卡片支持单词本按钮', () => {
    const html = renderWordDetailsCard({
      word: 'rad',
      phonetic: '/ræd/',
      showTts: true,
      showWordbookToggle: true,
      isInWordbook: false,
      meanings: [
        { label: 'adj.', text: '棒' }
      ]
    });

    expect(html).toContain('word-details-wordbook-toggle');
    expect(html).toContain('加入单词本');
  });

  test('单词详情使用单卡片布局类名', () => {
    expect(getBubbleModeClass(true)).toBe('bubble-word-mode');
    expect(getBubbleModeClass(false)).toBe('');
  });

  test('rad 的形容词义优先选择俚语短释义', () => {
    const summaries = extractMeaningSummaries([
      {
        meanings: [
          {
            partOfSpeech: 'adjective',
            definitions: [
              { definition: 'Favoring fundamental change, or change at the root cause of a matter.' },
              { definition: '(1980s & 1990s) Excellent; awesome.' }
            ]
          }
        ]
      }
    ]);

    expect(summaries).toEqual([
      { partOfSpeech: 'adjective', label: 'adj.', summary: 'Excellent; awesome.' }
    ]);
  });

  test('按词性构造上下文翻译提示词', () => {
    expect(buildPartOfSpeechPrompt('rad', 'adjective')).toBe('very rad');
    expect(buildPartOfSpeechPrompt('rad', 'noun')).toBe('a rad');
    expect(buildPartOfSpeechPrompt('book', 'verb')).toBe('to book');
    expect(buildPartOfSpeechPrompt('don’t', 'verb')).toBe('to don\'t');
  });

  test('查询前统一规范化弯引号词形', () => {
    expect(normalizeLookupWord(' don’t ')).toBe('don\'t');
  });

  test('整句中的英文弯引号会被统一规范化', () => {
    expect(normalizeEnglishText('don’t do that')).toBe('don\'t do that');
  });

  test('清理百度返回的上下文翻译前缀', () => {
    expect(normalizeGlossTranslation('adjective', '非常棒')).toBe('棒');
    expect(normalizeGlossTranslation('noun', '一本书')).toBe('书');
    expect(normalizeGlossTranslation('noun', '一盏灯')).toBe('灯');
    expect(normalizeGlossTranslation('noun', 'a能力')).toBe('能力');
    expect(normalizeGlossTranslation('verb', '去预订')).toBe('预订');
  });

  test('优先选择带标签的音标', () => {
    const phonetic = pickWordPhonetic([
      {
        phonetics: [
          { text: '/wɪð/', tags: [] },
          { text: '/wɪθ/', tags: ['General American'] }
        ]
      }
    ]);

    expect(phonetic).toBe('/wɪθ/');
  });

  test('支持从备用词典的 pronunciations 中提取音标', () => {
    const phonetic = pickWordPhonetic([
      {
        pronunciations: [
          { type: 'ipa', text: '/wɪð/', tags: [] },
          { type: 'ipa', text: '/wɪθ/', tags: ['General American'] }
        ]
      }
    ]);

    expect(phonetic).toBe('/wɪθ/');
  });
});
