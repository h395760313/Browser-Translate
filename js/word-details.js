(function(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.WordDetails = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function getPartOfSpeechLabel(partOfSpeech) {
    const labelMap = {
      noun: 'n.',
      verb: 'v.',
      adjective: 'adj.',
      adverb: 'adv.',
      pronoun: 'pron.',
      preposition: 'prep.',
      conjunction: 'conj.',
      interjection: 'int.',
      article: 'art.',
      determiner: 'det.',
      exclamation: 'excl.',
      abbreviation: 'abbr.',
      'auxiliary verb': 'aux.',
      'modal verb': 'modal.'
    };

    return labelMap[partOfSpeech] || partOfSpeech;
  }

  function compactDefinition(definition) {
    return (definition || '')
      .trim()
      .replace(/^(?:\([^)]*\)\s*)+/g, '')
      .replace(/^(a|an|the)\s+/i, '')
      .replace(/^to\s+/i, '')
      .replace(/\s+/g, ' ');
  }

  function normalizePhoneticText(text) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) {
      return '';
    }

    if (/^[\[/].*[\]/]$/.test(normalizedText)) {
      return normalizedText;
    }

    return `/${normalizedText.replace(/^\/+|\/+$/g, '')}/`;
  }

  function scorePhoneticCandidate(candidate) {
    const tags = Array.isArray(candidate && candidate.tags)
      ? candidate.tags.map((tag) => String(tag || '').toLowerCase())
      : [];
    let score = 0;

    if (tags.includes('general american') || tags.includes('us')) {
      score += 20;
    }

    if (tags.includes('standard')) {
      score += 16;
    }

    if (tags.includes('general australian') || tags.includes('british') || tags.includes('uk')) {
      score += 10;
    }

    if (tags.includes('informal') || tags.includes('regional')) {
      score -= 2;
    }

    return score;
  }

  function pickWordPhonetic(entries) {
    const candidates = [];

    (entries || []).forEach((entry) => {
      if (entry && entry.phonetic) {
        candidates.push({
          text: entry.phonetic,
          tags: entry.tags || []
        });
      }

      if (Array.isArray(entry && entry.phonetics)) {
        entry.phonetics.forEach((phonetic) => {
          if (phonetic && phonetic.text) {
            candidates.push({
              text: phonetic.text,
              tags: phonetic.tags || []
            });
          }
        });
      }

      if (Array.isArray(entry && entry.pronunciations)) {
        entry.pronunciations.forEach((pronunciation) => {
          if (pronunciation && pronunciation.type === 'ipa' && pronunciation.text) {
            candidates.push({
              text: pronunciation.text,
              tags: pronunciation.tags || []
            });
          }
        });
      }
    });

    const bestCandidate = candidates
      .map((candidate, index) => ({
        ...candidate,
        index,
        score: scorePhoneticCandidate(candidate)
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0];

    return normalizePhoneticText(bestCandidate && bestCandidate.text);
  }

  function scoreDefinition(partOfSpeech, definition) {
    const rawDefinition = (definition || '').trim();
    const normalizedDefinition = compactDefinition(rawDefinition);
    const wordCount = normalizedDefinition ? normalizedDefinition.split(/\s+/).length : 0;
    let score = 0;

    if (/^\((?:[^)]*slang[^)]*|[^)]*informal[^)]*|[^)]*colloquial[^)]*|[^)]*\d{4}s?[^)]*)\)/i.test(rawDefinition)) {
      score += 30;
    }

    if (normalizedDefinition.includes(';')) {
      score += 18;
    }

    if (wordCount <= 2) {
      score -= 6;
    } else if (wordCount <= 4) {
      score += 4;
    } else if (wordCount <= 8) {
      score += 8;
    } else if (wordCount <= 12) {
      score += 3;
    } else if (wordCount >= 18) {
      score -= 14;
    }

    if (/\b(excellent|awesome|great|cool|fantastic|wonderful|brilliant)\b/i.test(normalizedDefinition)) {
      score += 22;
    }

    if (/\b(non-SI|International System|absorbed dose|radiation|engine coolant|firearm|mathematical|antenna|angular measure|radix|free radicals?)\b/i.test(rawDefinition)) {
      score -= 40;
    }

    if (/^(relating to|pertaining to|involving|of or pertaining to)\b/i.test(normalizedDefinition)) {
      score -= 12;
    }

    if (/^(anything|device|distance|type|kind|system|unit)\b/i.test(normalizedDefinition)) {
      score -= 8;
    }

    if (partOfSpeech === 'adjective' && /\b(change|fundamental)\b/i.test(normalizedDefinition)) {
      score -= 6;
    }

    return score;
  }

  function extractMeaningSummaries(entries) {
    const bestByPartOfSpeech = new Map();

    entries.forEach((entry) => {
      (entry.meanings || []).forEach((meaning) => {
        const partOfSpeech = meaning.partOfSpeech || 'other';
        (meaning.definitions || []).forEach((definition, definitionIndex) => {
          const summary = compactDefinition(definition.definition);
          if (!summary) {
            return;
          }

          const orderBoost = Math.max(0, 6 - definitionIndex);
          const candidate = {
            partOfSpeech,
            label: getPartOfSpeechLabel(partOfSpeech),
            summary,
            score: scoreDefinition(partOfSpeech, definition.definition) + orderBoost
          };

          const currentBest = bestByPartOfSpeech.get(partOfSpeech);
          if (!currentBest || candidate.score > currentBest.score) {
            bestByPartOfSpeech.set(partOfSpeech, candidate);
          }
        });
      });
    });

    return [...bestByPartOfSpeech.values()]
      .map(({ score, ...meaning }) => meaning);
  }

  function formatWordMeanings(meanings) {
    if (!Array.isArray(meanings) || !meanings.length) {
      return '';
    }

    return meanings
      .filter((meaning) => meaning && meaning.label && meaning.text)
      .map((meaning) => `${meaning.label} ${meaning.text}`)
      .join('\n');
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderWordDetailsCard(wordDetails) {
    const meanings = Array.isArray(wordDetails && wordDetails.meanings)
      ? wordDetails.meanings.filter((meaning) => meaning && meaning.label && meaning.text)
      : [];

    if (!meanings.length) {
      return '';
    }

    const headword = escapeHtml(wordDetails.word || '');
    const phonetic = wordDetails.phonetic ? `<span class="word-details-phonetic">${escapeHtml(wordDetails.phonetic)}</span>` : '';
    const pronounceButton = wordDetails.showTts ? `
      <button class="bubble-tts bubble-tts-original word-details-pronounce" title="朗读原文" aria-label="朗读原文">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M14 3.23v17.54a1 1 0 0 1-1.64.77L7.91 18H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3.91l4.45-3.54A1 1 0 0 1 14 3.23Zm4.72 2.64a1 1 0 0 1 1.41.08 8 8 0 0 1 0 11.1 1 1 0 1 1-1.49-1.34 6 6 0 0 0 0-8.42 1 1 0 0 1 .08-1.42Zm-2.61 2.25a1 1 0 0 1 1.42.06 4 4 0 0 1 0 5.64 1 1 0 1 1-1.48-1.34 2 2 0 0 0 0-2.96 1 1 0 0 1 .06-1.4Z"/></svg>
      </button>
    ` : '';
    const wordbookButton = wordDetails.showWordbookToggle ? `
      <button
        class="word-details-wordbook-toggle${wordDetails.isInWordbook ? ' is-saved' : ''}"
        data-word="${escapeHtml(wordDetails.word || '')}"
        title="${escapeHtml(wordDetails.isInWordbook ? '从单词本移除' : '加入单词本')}"
        aria-label="${escapeHtml(wordDetails.isInWordbook ? '从单词本移除' : '加入单词本')}"
      >${escapeHtml(wordDetails.isInWordbook ? '从单词本移除' : '加入单词本')}</button>
    ` : '';
    const items = meanings.map((meaning) => `
      <li class="word-details-item">
        <span class="word-details-tag">${escapeHtml(meaning.label)}</span>
        <span class="word-details-meaning">${escapeHtml(meaning.text)}</span>
      </li>
    `).join('');

    return `
      <div class="word-details-card">
        <div class="word-details-header">
          <span class="word-details-headword">${headword}</span>
          <span class="word-details-pronunciation">${phonetic}${pronounceButton}${wordbookButton}</span>
        </div>
        <ul class="word-details-list">${items}</ul>
      </div>
    `.trim();
  }

  function getBubbleModeClass(isWordDetails) {
    return isWordDetails ? 'bubble-word-mode' : '';
  }

  function getBubbleLayout(isWordDetails) {
    return {
      showOriginalColumn: false,
      showDivider: false,
      showResultTts: false,
      showCopyButton: false,
      showSourceTts: !isWordDetails,
      showHeaderLang: false,
      showColumnLabels: false,
      showWordCardTts: isWordDetails,
      showSentenceWordbookToggle: !isWordDetails
    };
  }

  function buildPartOfSpeechPrompt(word, partOfSpeech) {
    const normalizedWord = (word || '').trim();

    if (partOfSpeech === 'noun') {
      return `a ${normalizedWord}`;
    }

    if (partOfSpeech === 'verb') {
      return `to ${normalizedWord}`;
    }

    if (partOfSpeech === 'adjective') {
      return `very ${normalizedWord}`;
    }

    return normalizedWord;
  }

  function normalizeGlossTranslation(partOfSpeech, translatedText) {
    const normalizedText = String(translatedText || '').trim().replace(/[。；;，,]+$/g, '');

    if (!normalizedText) {
      return '';
    }

    const stripLeadingEnglishArticle = (text) => text.replace(/^(?:a|an|the)\s*/i, '');

    if (partOfSpeech === 'adjective') {
      return stripLeadingEnglishArticle(normalizedText.replace(/^(非常|很|十分|挺|太|极其|格外|尤其)/, '')) || normalizedText;
    }

    if (partOfSpeech === 'noun') {
      return stripLeadingEnglishArticle(normalizedText
        .replace(/^一(?:个|本|只|条|台|盏|张|位|名|间|件|项|把|块|片|份|种|门|辆|棵|枚|支|首|场|座|册|页|双|则|笔|封|套|盒|滴|线|头|次)?/, '')
      ) || normalizedText;
    }

    if (partOfSpeech === 'verb') {
      return normalizedText.replace(/^(去|来)/, '') || normalizedText;
    }

    return normalizedText;
  }

  return {
    getPartOfSpeechLabel,
    extractMeaningSummaries,
    formatWordMeanings,
    pickWordPhonetic,
    renderWordDetailsCard,
    getBubbleModeClass,
    getBubbleLayout,
    buildPartOfSpeechPrompt,
    normalizeGlossTranslation
  };
});
