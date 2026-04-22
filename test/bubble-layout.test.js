const { getBubbleLayout } = require('../js/word-details');

describe('气泡布局模式', () => {
  test('气泡顶部不显示语言栏', () => {
    expect(getBubbleLayout(true).showHeaderLang).toBe(false);
    expect(getBubbleLayout(false).showHeaderLang).toBe(false);
  });

  test('单词模式只显示词典卡片', () => {
    expect(getBubbleLayout(true)).toEqual({
      showOriginalColumn: false,
      showDivider: false,
      showResultTts: false,
      showCopyButton: false,
      showSourceTts: false,
      showHeaderLang: false,
      showColumnLabels: false,
      showWordCardTts: true,
      showSentenceWordbookToggle: false
    });
  });

  test('句子模式只显示译文并保留原文朗读入口', () => {
    expect(getBubbleLayout(false)).toEqual({
      showOriginalColumn: false,
      showDivider: false,
      showResultTts: false,
      showCopyButton: false,
      showSourceTts: true,
      showHeaderLang: false,
      showColumnLabels: false,
      showWordCardTts: false,
      showSentenceWordbookToggle: true
    });
  });
});
