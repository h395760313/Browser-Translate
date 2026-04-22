(function(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.WordbookSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function normalizeQuery(query) {
    return String(query || '').trim().toLowerCase();
  }

  function filterWordbookEntries(entries, query) {
    const normalizedQuery = normalizeQuery(query);
    const list = Array.isArray(entries) ? entries : [];

    if (!normalizedQuery) {
      return list;
    }

    return list.filter((entry) => {
      const haystack = [
        entry && entry.word,
        entry && entry.displayWord,
        entry && entry.phonetic,
        entry && entry.originalText,
        Array.isArray(entry && entry.meanings)
          ? entry.meanings.map((meaning) => `${meaning.label || ''} ${meaning.text || ''}`).join(' ')
          : ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }

  return {
    normalizeQuery,
    filterWordbookEntries
  };
});
