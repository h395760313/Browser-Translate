(function(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.TTSUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  let speechSessionId = 0;

  function normalizeSpeechText(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function splitEnglishClauseBoundaries(text) {
    const cleaned = String(text || '').trim();
    if (!cleaned || !/[A-Za-z]/.test(cleaned) || !/\s/.test(cleaned)) {
      return [cleaned].filter(Boolean);
    }

    const boundaryPattern = /\s+(?=(?:that|which|who|whom|whose|where|when|while|because|although|though|if|unless|once|whereas)\b)/gi;
    const parts = cleaned.split(boundaryPattern)
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.length ? parts : [cleaned];
  }

  function splitLongSegment(segment, maxLength) {
    const cleaned = String(segment || '').trim();
    if (!cleaned) {
      return [];
    }

    const punctuationClauses = cleaned.match(/[^,，、:：;；]+[,，、:：;；]*/g) || [cleaned];
    const clauses = punctuationClauses.flatMap((clause) => splitEnglishClauseBoundaries(clause));
    const chunks = [];
    let current = '';

    const joinChunks = (left, right) => {
      if (!left) {
        return right;
      }

      if (!right) {
        return left;
      }

      if (/\s$/.test(left) || /^[,，、:：;；.!?。！？]/.test(right)) {
        return `${left}${right}`;
      }

      return `${left} ${right}`;
    };

    const pushCurrent = () => {
      const value = current.trim();
      if (value) {
        chunks.push(value);
      }
      current = '';
    };

    const splitBySpaces = (text) => {
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length <= 1) {
        return [text];
      }

      const parts = [];
      let buffer = '';

      words.forEach((word, index) => {
        const nextBuffer = buffer ? `${buffer} ${word}` : word;
        if (nextBuffer.length > maxLength && buffer) {
          parts.push(buffer);
          buffer = word;
          return;
        }

        buffer = nextBuffer;

        if (index === words.length - 1 && buffer) {
          parts.push(buffer);
        }
      });

      return parts.length ? parts : [text];
    };

    const splitByLength = (text) => {
      const parts = [];
      let rest = text.trim();

      while (rest.length > maxLength) {
        parts.push(rest.slice(0, maxLength));
        rest = rest.slice(maxLength);
      }

      if (rest) {
        parts.push(rest);
      }

      return parts;
    };

    const splitChunk = (text) => {
      if (text.length <= maxLength) {
        return [text];
      }

      const spaceParts = splitBySpaces(text);
      if (spaceParts.length > 1) {
        return spaceParts.flatMap((part) => splitChunk(part));
      }

      return splitByLength(text);
    };

    if (clauses.length > 1) {
      return clauses.flatMap((clause) => splitChunk(clause.trim())).filter(Boolean);
    }

    clauses.forEach((clause) => {
      const items = splitChunk(clause);
      items.forEach((item) => {
        if (!item) {
          return;
        }

        if (!current) {
          current = item;
          return;
        }

        const merged = joinChunks(current, item);
        if (merged.length <= maxLength) {
          current = merged;
          return;
        }

        pushCurrent();
        current = item;
      });
    });

    pushCurrent();
    return chunks;
  }

  function splitTextIntoChunks(text, maxLength = 120) {
    const normalized = normalizeSpeechText(text);
    if (!normalized) {
      return [];
    }

    const paragraphs = normalized
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const chunks = [];

    paragraphs.forEach((paragraph) => {
      const sentenceParts = paragraph.match(/[^.!?。！？]+[.!?。！？]*/g) || [paragraph];
      sentenceParts.forEach((sentence) => {
        splitLongSegment(sentence, maxLength).forEach((chunk) => {
          if (chunk) {
            chunks.push(chunk);
          }
        });
      });
    });

    return chunks;
  }

  function pickPreferredVoice(voices, lang) {
    const availableVoices = Array.isArray(voices) ? voices : [];
    const normalizedLang = lang === 'zh' ? 'zh' : 'en';
    const matched = availableVoices.filter((voice) => {
      const voiceLang = String(voice && voice.lang || '').toLowerCase();
      return normalizedLang === 'zh'
        ? voiceLang.startsWith('zh')
        : voiceLang.startsWith('en');
    });

    const preferredNamePattern = normalizedLang === 'zh'
      ? /(natural|premium|xiaoxiao|xiaoyi|yunxi|huihui|zh)/i
      : /(natural|premium|google|microsoft|en)/i;

    return matched.find((voice) => preferredNamePattern.test(String(voice && voice.name || '')))
      || matched[0]
      || availableVoices[0]
      || null;
  }

  function getSpeechLangCode(lang) {
    return lang === 'zh' ? 'zh-CN' : 'en-US';
  }

  function speakChunk(chunk, lang, options) {
    const synthesis = options.speechSynthesis;
    const Utterance = options.UtteranceClass;
    const utterance = new Utterance(chunk);

    utterance.lang = getSpeechLangCode(lang);
    utterance.rate = options.rate ?? 0.8;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    const preferredVoice = options.voice || pickPreferredVoice(
      typeof options.getVoices === 'function' ? options.getVoices() : [],
      lang
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        const error = event && event.error;
        if (error === 'canceled' || error === 'interrupted') {
          resolve();
          return;
        }

        reject(new Error(error ? `Speech synthesis failed: ${error}` : 'Speech synthesis failed'));
      };

      synthesis.speak(utterance);
    });
  }

  function cancelSpeechPlayback(speechSynthesis) {
    speechSessionId += 1;

    if (speechSynthesis && typeof speechSynthesis.cancel === 'function') {
      speechSynthesis.cancel();
    }
  }

  async function speakTextSequentially(text, lang, options = {}) {
    const synthesis = options.speechSynthesis;
    const UtteranceClass = options.UtteranceClass;

    if (!synthesis || !UtteranceClass) {
      return false;
    }

    const maxChunkLength = options.maxChunkLength || 120;
    const chunks = splitTextIntoChunks(text, maxChunkLength);

    if (!chunks.length) {
      return false;
    }

    const sessionId = ++speechSessionId;
    if (typeof synthesis.cancel === 'function') {
      synthesis.cancel();
    }

    for (const chunk of chunks) {
      if (sessionId !== speechSessionId) {
        return false;
      }

      await speakChunk(chunk, lang, {
        ...options,
        speechSynthesis: synthesis,
        UtteranceClass,
        getVoices: typeof options.getVoices === 'function' ? options.getVoices : () => (typeof synthesis.getVoices === 'function' ? synthesis.getVoices() : [])
      });
    }

    return sessionId === speechSessionId;
  }

  return {
    normalizeSpeechText,
    splitEnglishClauseBoundaries,
    splitLongSegment,
    splitTextIntoChunks,
    pickPreferredVoice,
    cancelSpeechPlayback,
    speakTextSequentially
  };
});
