document.addEventListener('DOMContentLoaded', async () => {
  const wordbookApi = globalThis.Wordbook || {};
  const wordbookSearchApi = globalThis.WordbookSearch || {};
  const getWordbookEntries = wordbookApi.getWordbookEntries || (async () => []);
  const toggleWordbookEntry = wordbookApi.toggleWordbookEntry || (async () => ({ saved: false, entries: [] }));
  const filterWordbookEntries = wordbookSearchApi.filterWordbookEntries || ((entries) => entries);

  const searchInput = document.getElementById('wordbook-search');
  const wordbookCount = document.getElementById('wordbook-count');
  const resultCount = document.getElementById('wordbook-result-count');
  const list = document.getElementById('wordbook-list');

  let cachedEntries = [];

  function createWordbookItem(entry) {
    const item = document.createElement('div');
    item.className = 'wordbook-item';

    const head = document.createElement('div');
    head.className = 'wordbook-item-head';

    const wordBlock = document.createElement('div');

    const word = document.createElement('div');
    word.className = 'wordbook-word';
    word.textContent = entry.displayWord || entry.word;
    wordBlock.appendChild(word);

    if (entry.phonetic) {
      const phonetic = document.createElement('span');
      phonetic.className = 'wordbook-phonetic';
      phonetic.textContent = entry.phonetic;
      wordBlock.appendChild(phonetic);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'wordbook-remove';
    removeBtn.textContent = '移除';
    removeBtn.addEventListener('click', async () => {
      removeBtn.disabled = true;
      try {
        await toggleWordbookEntry(entry);
        await render();
      } finally {
        removeBtn.disabled = false;
      }
    });

    head.appendChild(wordBlock);
    head.appendChild(removeBtn);
    item.appendChild(head);

    if (Array.isArray(entry.meanings) && entry.meanings.length) {
      const meanings = document.createElement('div');
      meanings.className = 'wordbook-meanings';
      meanings.textContent = entry.meanings
        .map((meaning) => `${meaning.label} ${meaning.text}`)
        .join('\n');
      item.appendChild(meanings);
    }

    return item;
  }

  function renderList(query) {
    const filtered = filterWordbookEntries(cachedEntries, query);
    resultCount.textContent = `${filtered.length} 个结果`;
    list.innerHTML = '';

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'wordbook-empty';
      empty.textContent = query ? '没有找到匹配的单词。' : '暂无单词。';
      list.appendChild(empty);
      return;
    }

    filtered.forEach((entry) => {
      list.appendChild(createWordbookItem(entry));
    });
  }

  async function render() {
    cachedEntries = await getWordbookEntries();
    wordbookCount.textContent = `${cachedEntries.length} 个单词`;
    renderList(searchInput.value);
  }

  searchInput.addEventListener('input', () => {
    renderList(searchInput.value);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[wordbookApi.STORAGE_KEY || 'wordbookEntries']) {
      render();
    }
  });

  await render();
  searchInput.focus();
});
