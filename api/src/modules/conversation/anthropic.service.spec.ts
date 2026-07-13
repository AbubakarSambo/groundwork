import { AnthropicService, houseStyle, ChatTurn } from './anthropic.service';

// Avoid constructing the real Vertex client / touching credentials in unit tests.
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({ models: {} })),
}));

describe('houseStyle (typography normalizer)', () => {
  it('normalizes every banned house-style character to its plain form', () => {
    expect(houseStyle('call logs—CRM')).toBe('call logs-CRM'); // em dash
    expect(houseStyle('3–5 sentences')).toBe('3-5 sentences'); // en dash
    expect(houseStyle('“quote”')).toBe('"quote"'); // curly double quotes
    expect(houseStyle("it’s")).toBe("it's"); // curly apostrophe
    expect(houseStyle('wait… more')).toBe('wait... more'); // ellipsis char
    expect(houseStyle('a b')).toBe('a b'); // non-breaking space
    expect(houseStyle('a--b')).toBe('a-b'); // double hyphen collapse
  });
});

describe('AnthropicService.respondStream — streamed deltas are normalized (boundary guard)', () => {
  function streamOf(...deltas: string[]) {
    return {
      models: {
        generateContentStream: async () => ({
          async *[Symbol.asyncIterator]() {
            for (const text of deltas) {
              yield { candidates: [{ content: { parts: [{ text }] } }] };
            }
          },
        }),
      },
    };
  }

  it('passes each streamed delta through houseStyle before yielding', async () => {
    const svc = new AnthropicService({ get: () => undefined } as any);
    // Real fragments seen in stored AI output that carried banned typography:
    (svc as any).client = streamOf('the data you have—call logs', ', pipeline reviews… and “more”');

    const deltas: string[] = [];
    for await (const d of svc.respondStream('sys', [{ role: 'user', content: 'hi' } as ChatTurn])) {
      deltas.push(d);
    }
    const streamed = deltas.join('');

    // No banned character survives to the user, live.
    expect(streamed).not.toMatch(/[—–“”‘’… ]/);
    expect(streamed).toContain('the data you have-call logs');
    expect(streamed).toContain('pipeline reviews... and "more"');
  });
});
