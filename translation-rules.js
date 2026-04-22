(function(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.TranslationRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;
  const ENGLISH_LETTER_REGEX = /[A-Za-z]/;
  const SINGLE_ENGLISH_WORD_REGEX = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;
  const MIXED_ENGLISH_SEGMENT_REGEX = /[A-Za-z][A-Za-z0-9'’-]*(?:\s+[A-Za-z][A-Za-z0-9'’-]*)*/g;
  const ZERO_WIDTH_CHAR_REGEX = /[\u200B-\u200D\uFEFF]/g;

  function hasChineseChars(text) {
    return CHINESE_CHAR_REGEX.test(text || '');
  }

  function hasEnglishLetters(text) {
    return ENGLISH_LETTER_REGEX.test(text || '');
  }

  function normalizeSelectionText(text) {
    return (text || '')
      .replace(ZERO_WIDTH_CHAR_REGEX, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSingleEnglishWord(text) {
    const normalizedText = normalizeSelectionText(text);
    if (!normalizedText) {
      return false;
    }

    if (SINGLE_ENGLISH_WORD_REGEX.test(normalizedText)) {
      return true;
    }

    const englishTokens = normalizedText.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || [];
    if (englishTokens.length !== 1) {
      return false;
    }

    return normalizedText.replace(englishTokens[0], '').trim().length === 0;
  }

  function analyzeSelection(text) {
    const normalizedText = normalizeSelectionText(text);
    const containsChinese = hasChineseChars(normalizedText);
    const containsEnglish = hasEnglishLetters(normalizedText);
    const singleEnglishWord = isSingleEnglishWord(normalizedText);

    let mode = 'translate';

    if (!containsEnglish) {
      mode = 'skip';
    } else if (singleEnglishWord) {
      mode = 'single-word';
    } else if (containsChinese) {
      mode = 'mixed';
    }

    return {
      normalizedText,
      hasChinese: containsChinese,
      hasEnglish: containsEnglish,
      isSingleEnglishWord: singleEnglishWord,
      mode
    };
  }

  function splitMixedText(text) {
    const normalizedText = (text || '').trim();
    const segments = [];
    let lastIndex = 0;

    normalizedText.replace(MIXED_ENGLISH_SEGMENT_REGEX, (match, offset) => {
      if (offset > lastIndex) {
        segments.push({
          type: 'static',
          text: normalizedText.slice(lastIndex, offset)
        });
      }

      segments.push({
        type: 'english',
        text: match
      });

      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < normalizedText.length) {
      segments.push({
        type: 'static',
        text: normalizedText.slice(lastIndex)
      });
    }

    return segments.length ? segments : [{
      type: 'static',
      text: normalizedText
    }];
  }

  function mergeMixedTranslation(segments, translatedParts) {
    let translationIndex = 0;

    return segments.map((segment) => {
      if (segment.type !== 'english') {
        return segment.text;
      }

      const translatedText = translatedParts[translationIndex] || segment.text;
      translationIndex += 1;
      return translatedText;
    }).join('');
  }

  return {
    analyzeSelection,
    hasChineseChars,
    hasEnglishLetters,
    normalizeSelectionText,
    isSingleEnglishWord,
    splitMixedText,
    mergeMixedTranslation
  };
});
