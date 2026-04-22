const {
  splitEnglishClauseBoundaries,
  splitTextIntoChunks,
  speakTextSequentially
} = require('../js/tts-utils');

describe('TTS 自动断句', () => {
  test('按中英文标点拆分句子', () => {
    expect(splitTextIntoChunks('Hello world. How are you? 我很好！谢谢。')).toEqual([
      'Hello world.',
      'How are you?',
      '我很好！',
      '谢谢。'
    ]);
  });

  test('长句按长度继续拆分', () => {
    const chunks = splitTextIntoChunks(
      'This is a very long sentence without punctuation that should be split into smaller pieces for speech synthesis',
      25
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 25)).toBe(true);
  });

  test('英文长句优先按从句边界拆分', () => {
    expect(splitEnglishClauseBoundaries(
      'It encompasses a wide range of skills and techniques that are useful for interacting and developing with LLMs'
    )).toEqual([
      'It encompasses a wide range of skills and techniques',
      'that are useful for interacting and developing with LLMs'
    ]);
  });

  test('语义边界拆分会参与最终朗读分块', () => {
    expect(splitTextIntoChunks(
      'It encompasses a wide range of skills and techniques that are useful for interacting and developing with LLMs',
      120
    )).toEqual([
      'It encompasses a wide range of skills and techniques',
      'that are useful for interacting and developing with LLMs'
    ]);
  });

  test('按顺序逐段朗读', async () => {
    const spoken = [];
    const synth = {
      cancel: jest.fn(),
      getVoices: jest.fn(() => [{ lang: 'en-US', name: 'Google US English' }]),
      speak: jest.fn((utterance) => {
        spoken.push(utterance.text);
        if (utterance.onend) {
          utterance.onend();
        }
      })
    };

    function MockUtterance(text) {
      this.text = text;
    }

    await speakTextSequentially('First sentence. Second sentence.', 'en', {
      speechSynthesis: synth,
      UtteranceClass: MockUtterance,
      getVoices: synth.getVoices,
      maxChunkLength: 20
    });

    expect(spoken).toEqual(['First sentence.', 'Second sentence.']);
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });
});
