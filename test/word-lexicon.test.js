const { getLocalWordDetail, normalizeWordKey } = require('../js/word-lexicon');

describe('本地单词词库', () => {
  test('查询词会被规范化后命中本地词库', () => {
    expect(normalizeWordKey(' don’t ')).toBe('dont');
    expect(getLocalWordDetail('Capabilities')).toEqual({
      word: 'capabilities',
      phonetic: '/ˌkeɪpəˈbɪlətiz/',
      meanings: [
        {
          partOfSpeech: '',
          label: '',
          text: '能力'
        }
      ]
    });
  });

  test('常见缩写否定词可直接命中本地词库', () => {
    expect(getLocalWordDetail('don’t')).toEqual({
      word: 'don\'t',
      phonetic: '/dəʊnt/',
      meanings: [
        {
          partOfSpeech: '',
          label: '',
          text: '不要'
        }
      ]
    });
  });

  test('常见英文缩写词会按带撇号的精确形式命中', () => {
    expect(getLocalWordDetail('aren\'t')).toEqual({
      word: 'aren\'t',
      phonetic: '/ɑːnt/',
      meanings: [
        {
          partOfSpeech: '',
          label: '',
          text: '不是'
        }
      ]
    });

    expect(getLocalWordDetail('it’s')).toEqual({
      word: 'it\'s',
      phonetic: '/ɪts/',
      meanings: [
        {
          partOfSpeech: '',
          label: '',
          text: '它是'
        }
      ]
    });
  });
});
