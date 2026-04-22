(function(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.Wordbook = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const STORAGE_KEY = 'wordbookEntries';

  function normalizeWord(word) {
    return String(word || '').trim().toLowerCase();
  }

  function normalizeMeaning(meaning) {
    if (!meaning || typeof meaning !== 'object') {
      return null;
    }

    const label = String(meaning.label || '').trim();
    const text = String(meaning.text || '').trim();

    if (!label || !text) {
      return null;
    }

    return { label, text };
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const word = normalizeWord(entry.word || entry.originalText);
    if (!word) {
      return null;
    }

    const meanings = Array.isArray(entry.meanings)
      ? entry.meanings.map(normalizeMeaning).filter(Boolean)
      : [];

    return {
      word,
      displayWord: String(entry.displayWord || entry.word || word).trim() || word,
      phonetic: String(entry.phonetic || '').trim(),
      meanings,
      originalText: String(entry.originalText || '').trim(),
      createdAt: String(entry.createdAt || ''),
      updatedAt: String(entry.updatedAt || entry.createdAt || '')
    };
  }

  function readStorage() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve([]);
        return;
      }

      chrome.storage.local.get({ [STORAGE_KEY]: [] }, (result) => {
        const entries = Array.isArray(result && result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
        resolve(entries.map(normalizeEntry).filter(Boolean));
      });
    });
  }

  function writeStorage(entries) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        reject(new Error('storage unavailable'));
        return;
      }

      chrome.storage.local.set({ [STORAGE_KEY]: entries }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(entries);
      });
    });
  }

  async function getWordbookEntries() {
    const entries = await readStorage();
    return entries.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async function getWordbookEntry(word) {
    const normalizedWord = normalizeWord(word);
    if (!normalizedWord) {
      return null;
    }

    const entries = await readStorage();
    return entries.find((entry) => entry.word === normalizedWord) || null;
  }

  async function setWordbookEntry(inputEntry) {
    const entry = normalizeEntry(inputEntry);
    if (!entry) {
      throw new Error('invalid wordbook entry');
    }

    const entries = await readStorage();
    const existingIndex = entries.findIndex((item) => item.word === entry.word);
    const timestamp = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = entries[existingIndex];
      entries[existingIndex] = {
        ...existing,
        ...entry,
        createdAt: existing.createdAt || entry.createdAt,
        updatedAt: timestamp
      };
    } else {
      entries.unshift({
        ...entry,
        createdAt: entry.createdAt || timestamp,
        updatedAt: timestamp
      });
    }

    await writeStorage(entries);
    return entries;
  }

  async function removeWordbookEntry(word) {
    const normalizedWord = normalizeWord(word);
    if (!normalizedWord) {
      return [];
    }

    const entries = await readStorage();
    const nextEntries = entries.filter((entry) => entry.word !== normalizedWord);
    await writeStorage(nextEntries);
    return nextEntries;
  }

  async function toggleWordbookEntry(inputEntry) {
    const entry = normalizeEntry(inputEntry);
    if (!entry) {
      throw new Error('invalid wordbook entry');
    }

    const existing = await getWordbookEntry(entry.word);
    if (existing) {
      const entries = await removeWordbookEntry(entry.word);
      return { saved: false, entry: existing, entries };
    }

    const entries = await setWordbookEntry(entry);
    return { saved: true, entry: await getWordbookEntry(entry.word), entries };
  }

  return {
    STORAGE_KEY,
    normalizeWord,
    normalizeEntry,
    getWordbookEntries,
    getWordbookEntry,
    setWordbookEntry,
    removeWordbookEntry,
    toggleWordbookEntry
  };
});
