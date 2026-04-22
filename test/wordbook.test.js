describe('单词本存储', () => {
  let store;
  let wordbook;

  beforeEach(() => {
    store = {};
    global.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: jest.fn((defaults, callback) => {
            callback({
              ...defaults,
              ...store
            });
          }),
          set: jest.fn((payload, callback) => {
            store = {
              ...store,
              ...payload
            };
            if (callback) {
              callback();
            }
          })
        }
      }
    };

    jest.resetModules();
    wordbook = require('../wordbook');
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('保存后可读取并按单词归一化', async () => {
    await wordbook.setWordbookEntry({
      word: 'Rad',
      displayWord: 'Rad',
      phonetic: '/ræd/',
      meanings: [{ label: 'adj.', text: '棒' }]
    });

    expect(wordbook.normalizeWord(' Rad ')).toBe('rad');

    const entry = await wordbook.getWordbookEntry('rad');
    expect(entry.word).toBe('rad');
    expect(entry.displayWord).toBe('Rad');
    expect(entry.phonetic).toBe('/ræd/');
    expect(entry.meanings).toEqual([{ label: 'adj.', text: '棒' }]);
  });

  test('重复保存同一单词会更新内容而不是新增重复项', async () => {
    await wordbook.setWordbookEntry({
      word: 'book',
      displayWord: 'book',
      meanings: [{ label: 'n.', text: '书' }]
    });

    const first = await wordbook.getWordbookEntry('book');

    await wordbook.setWordbookEntry({
      word: 'BOOK',
      displayWord: 'BOOK',
      meanings: [{ label: 'v.', text: '预订' }]
    });

    const entries = await wordbook.getWordbookEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].word).toBe('book');
    expect(entries[0].displayWord).toBe('BOOK');
    expect(entries[0].meanings).toEqual([{ label: 'v.', text: '预订' }]);
    expect(entries[0].createdAt).toBe(first.createdAt);
  });

  test('切换保存状态会在添加和移除之间切换', async () => {
    const payload = {
      word: 'light',
      displayWord: 'light',
      meanings: [{ label: 'adj.', text: '轻的' }]
    };

    const addResult = await wordbook.toggleWordbookEntry(payload);
    expect(addResult.saved).toBe(true);
    expect(await wordbook.getWordbookEntry('light')).toBeTruthy();

    const removeResult = await wordbook.toggleWordbookEntry(payload);
    expect(removeResult.saved).toBe(false);
    expect(await wordbook.getWordbookEntry('light')).toBeNull();
  });

  test('句子也可以保存到单词本', async () => {
    const sentence = {
      word: 'It encompasses a wide range of skills and techniques.',
      displayWord: 'It encompasses a wide range of skills and techniques.',
      meanings: [{ label: '译文', text: '它涵盖了广泛的技能和技术。' }],
      originalText: 'It encompasses a wide range of skills and techniques.'
    };

    const addResult = await wordbook.toggleWordbookEntry(sentence);
    expect(addResult.saved).toBe(true);

    const entry = await wordbook.getWordbookEntry('It encompasses a wide range of skills and techniques.');
    expect(entry).toBeTruthy();
    expect(entry.displayWord).toBe(sentence.displayWord);
    expect(entry.meanings).toEqual([{ label: '译文', text: '它涵盖了广泛的技能和技术。' }]);
  });
});
