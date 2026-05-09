(function(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.WordLexicon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const EXACT_ENTRIES = {
    'aren\'t': { phonetic: '/ɑːnt/', translation: '不是' },
    'can\'t': { phonetic: '/kɑːnt/', translation: '不能' },
    'couldn\'t': { phonetic: '/ˈkʊd(ə)nt/', translation: '不能' },
    'didn\'t': { phonetic: '/ˈdɪd(ə)nt/', translation: '没有' },
    'doesn\'t': { phonetic: '/ˈdʌz(ə)nt/', translation: '不' },
    'don\'t': { phonetic: '/dəʊnt/', translation: '不要' },
    'hadn\'t': { phonetic: '/ˈhæd(ə)nt/', translation: '没有' },
    'hasn\'t': { phonetic: '/ˈhæz(ə)nt/', translation: '没有' },
    'haven\'t': { phonetic: '/ˈhæv(ə)nt/', translation: '没有' },
    'isn\'t': { phonetic: '/ˈɪzənt/', translation: '不是' },
    'it\'ll': { phonetic: '/ɪtəl/', translation: '它将' },
    'it\'s': { phonetic: '/ɪts/', translation: '它是' },
    'i\'ve': { phonetic: '/aɪv/', translation: '我已经' },
    'she\'s': { phonetic: '/ʃiːz/', translation: '她是' },
    'that\'s': { phonetic: '/ðæts/', translation: '那是' },
    'there\'s': { phonetic: '/ðeəz/', translation: '有' },
    'they\'re': { phonetic: '/ðeə(r)/', translation: '他们是' },
    'wasn\'t': { phonetic: '/ˈwɒz(ə)nt/', translation: '不是' },
    'weren\'t': { phonetic: '/wɜːnt/', translation: '不是' },
    'won\'t': { phonetic: '/wəʊnt/', translation: '不会' }
  };

  const ENTRIES = {
    ability: { phonetic: '/əˈbɪləti/', translation: '能力' },
    abilities: { phonetic: '/əˈbɪlətiz/', translation: '能力' },
    adopt: { phonetic: '/əˈdɒpt/', translation: '采用' },
    adopted: { phonetic: '/əˈdɒptɪd/', translation: '采用的' },
    analysis: { phonetic: '/əˈnæləsɪs/', translation: '分析' },
    approach: { phonetic: '/əˈprəʊtʃ/', translation: '方法' },
    capability: { phonetic: '/ˌkeɪpəˈbɪləti/', translation: '能力' },
    capabilities: { phonetic: '/ˌkeɪpəˈbɪlətiz/', translation: '能力' },
    cool: { phonetic: '/kuːl/', translation: '很棒' },
    develop: { phonetic: '/dɪˈveləp/', translation: '开发' },
    developing: { phonetic: '/dɪˈveləpɪŋ/', translation: '开发' },
    effective: { phonetic: '/ɪˈfektɪv/', translation: '有效的' },
    efficiently: { phonetic: '/ɪˈfɪʃəntli/', translation: '高效地' },
    engineering: { phonetic: '/ˌendʒɪˈnɪərɪŋ/', translation: '工程' },
    interact: { phonetic: '/ˌɪntərˈækt/', translation: '交互' },
    interacting: { phonetic: '/ˌɪntərˈæktɪŋ/', translation: '交互' },
    language: { phonetic: '/ˈlæŋɡwɪdʒ/', translation: '语言' },
    languages: { phonetic: '/ˈlæŋɡwɪdʒɪz/', translation: '语言' },
    limitation: { phonetic: '/ˌlɪmɪˈteɪʃən/', translation: '局限' },
    limitations: { phonetic: '/ˌlɪmɪˈteɪʃənz/', translation: '局限' },
    llm: { phonetic: '/ˌel el ˈem/', translation: '大语言模型' },
    llms: { phonetic: '/ˌel el ˈemz/', translation: '大语言模型' },
    mean: { phonetic: '/miːn/', translation: '意思是' },
    model: { phonetic: '/ˈmɒdəl/', translation: '模型' },
    models: { phonetic: '/ˈmɒdəlz/', translation: '模型' },
    optimize: { phonetic: '/ˈɒptɪmaɪz/', translation: '优化' },
    optimizing: { phonetic: '/ˈɒptɪmaɪzɪŋ/', translation: '优化' },
    prompt: { phonetic: '/prɒmpt/', translation: '提示词' },
    prompts: { phonetic: '/prɒmpts/', translation: '提示词' },
    rad: { phonetic: '/ræd/', translation: '很棒' },
    right: { phonetic: '/raɪt/', translation: '正确的' },
    skill: { phonetic: '/skɪl/', translation: '技能' },
    skills: { phonetic: '/skɪlz/', translation: '技能' },
    technique: { phonetic: '/tekˈniːk/', translation: '技巧' },
    techniques: { phonetic: '/tekˈniːks/', translation: '技巧' },
    understanding: { phonetic: '/ˌʌndəˈstændɪŋ/', translation: '理解' },
    use: { phonetic: '/juːz/', translation: '使用' },
    useful: { phonetic: '/ˈjuːsfəl/', translation: '有用的' },
    using: { phonetic: '/ˈjuːzɪŋ/', translation: '使用' },
    with: { phonetic: '/wɪð/', translation: '随着' },
    without: { phonetic: '/wɪˈðaʊt/', translation: '没有' },
    book: { phonetic: '/bʊk/', translation: '书' },
    light: { phonetic: '/laɪt/', translation: '光' },
    cannot: { phonetic: '/ˈkænɒt/', translation: '不能' },
    mean: { phonetic: '/miːn/', translation: '意思是' }
  };

  function normalizeWordKey(word) {
    return String(word || '')
      .trim()
      .toLowerCase()
      .replace(/[\u2018\u2019']/g, '')
      .replace(/[^a-z]/g, '');
  }

  function getLocalWordDetail(word) {
    const normalizedWord = String(word || '')
      .trim()
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, '\'');
    const entry = EXACT_ENTRIES[normalizedWord] || ENTRIES[normalizeWordKey(normalizedWord)];

    if (!entry) {
      return null;
    }

    return {
      word: normalizedWord,
      phonetic: entry.phonetic || '',
      meanings: [
        {
          partOfSpeech: '',
          label: '',
          text: entry.translation
        }
      ]
    };
  }

  return {
    getLocalWordDetail,
    normalizeWordKey
  };
});
