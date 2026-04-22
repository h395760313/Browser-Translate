const { filterWordbookEntries, normalizeQuery } = require('../wordbook-search');

describe('单词本查询', () => {
  const entries = [
    {
      word: 'rad',
      displayWord: 'rad',
      phonetic: '/ræd/',
      meanings: [{ label: 'adj.', text: '棒' }]
    },
    {
      word: 'book',
      displayWord: 'book',
      phonetic: '/bʊk/',
      meanings: [{ label: 'n.', text: '书' }, { label: 'v.', text: '预订' }]
    }
  ];

  test('查询词会被规范化', () => {
    expect(normalizeQuery(' Rad ')).toBe('rad');
  });

  test('支持按单词查询', () => {
    expect(filterWordbookEntries(entries, 'book')).toHaveLength(1);
  });

  test('支持按音标查询', () => {
    expect(filterWordbookEntries(entries, 'ræd')).toHaveLength(1);
  });

  test('支持按释义查询', () => {
    expect(filterWordbookEntries(entries, '预订')).toHaveLength(1);
  });

  test('空查询返回全部单词', () => {
    expect(filterWordbookEntries(entries, '')).toHaveLength(2);
  });
});
