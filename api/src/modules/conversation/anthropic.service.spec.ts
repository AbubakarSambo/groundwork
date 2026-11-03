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

/**
 * STEADINESS PLUMBING (Hafsah, 30 September 2026, step 2): the pattern detector needs a way to ask
 * both its calls for the model's steadiest setting - temperature 0 and a fixed seed - without
 * changing what every other caller of respond()/extract() gets, since neither took an options
 * argument before. Nobody sets these by default; see the long comment above `temperature` in
 * extract() and PATTERN_DETECTION_STEADY_OPTIONS in patterns.service.ts for why.
 */
describe('respond() and extract() forward temperature and seed only when a caller asks for them', () => {
  function generateContentSpy(fnCall?: { name: string; args: any }) {
    return jest.fn(async () => ({
      candidates: [{
        content: {
          parts: fnCall
            ? [{ functionCall: { name: fnCall.name, args: fnCall.args } }]
            : [{ text: 'a plain reply' }],
        },
      }],
    }));
  }

  it('respond() sends no temperature or seed when the caller passes none (every existing caller)', async () => {
    const svc = new AnthropicService({ get: () => undefined } as any);
    const generateContent = generateContentSpy();
    (svc as any).client = { models: { generateContent } };

    await svc.respond('sys', [{ role: 'user', content: 'hi' } as ChatTurn]);

    const config = (generateContent.mock.calls[0] as any[])[0].config;
    expect(config.temperature).toBeUndefined();
    expect(config.seed).toBeUndefined();
  });

  it('respond() forwards temperature and seed straight into the Gemini call when a caller passes them', async () => {
    const svc = new AnthropicService({ get: () => undefined } as any);
    const generateContent = generateContentSpy();
    (svc as any).client = { models: { generateContent } };

    await svc.respond('sys', [{ role: 'user', content: 'hi' } as ChatTurn], { temperature: 0, seed: 20260930 });

    const config = (generateContent.mock.calls[0] as any[])[0].config;
    expect(config.temperature).toBe(0);
    expect(config.seed).toBe(20260930);
  });

  it('extract() sends no temperature or seed when the caller passes none', async () => {
    const svc = new AnthropicService({ get: () => undefined } as any);
    const generateContent = generateContentSpy({ name: 'a_tool', args: { ok: true } });
    (svc as any).client = { models: { generateContent } };

    await svc.extract('sys', [{ role: 'user', content: 'hi' } as ChatTurn], { name: 'a_tool', description: 'd', input_schema: {} });

    const config = (generateContent.mock.calls[0] as any[])[0].config;
    expect(config.temperature).toBeUndefined();
    expect(config.seed).toBeUndefined();
  });

  it('extract() forwards temperature and seed straight into the Gemini call when a caller passes them', async () => {
    const svc = new AnthropicService({ get: () => undefined } as any);
    const generateContent = generateContentSpy({ name: 'a_tool', args: { ok: true } });
    (svc as any).client = { models: { generateContent } };

    await svc.extract(
      'sys', [{ role: 'user', content: 'hi' } as ChatTurn], { name: 'a_tool', description: 'd', input_schema: {} },
      { temperature: 0, seed: 20260930 },
    );

    const config = (generateContent.mock.calls[0] as any[])[0].config;
    expect(config.temperature).toBe(0);
    expect(config.seed).toBe(20260930);
  });
});

/*
 * A FAST READ THINKS AS LITTLE AS A CONVERSATION TURN (3 November 2026). The suggested answers, the
 * session plan and Ask's reading of a question ran on the fast model with its own default thinking and
 * took 2 to 12 seconds while a person waited. The default is set once, here, for every fast caller.
 */
describe('extract() on the fast model', () => {
  const tool = { name: 'a_tool', description: 'd', input_schema: {} };
  function svcWith() {
    const svc = new AnthropicService({ get: () => undefined } as any);
    const generateContent = jest.fn(async () => ({ candidates: [{ content: { parts: [{ functionCall: { name: 'a_tool', args: { ok: true } } }] } }] }));
    (svc as any).client = { models: { generateContent } };
    return { svc, config: () => (generateContent.mock.calls[0] as any[])[0] };
  }

  it('thinks no more than a conversation turn when the caller names no budget', async () => {
    const { svc, config } = svcWith();
    await svc.extract('sys', [{ role: 'user', content: 'hi' } as ChatTurn], tool, { fast: true });
    expect(config().model).toBe('gemini-2.5-flash');
    expect(config().config.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('keeps a budget its caller names', async () => {
    const { svc, config } = svcWith();
    await svc.extract('sys', [{ role: 'user', content: 'hi' } as ChatTurn], tool, { fast: true, thinkingBudget: 256 });
    expect(config().config.thinkingConfig).toEqual({ thinkingBudget: 256 });
  });

  it('and a report read, which is not fast, keeps the model its own thinking', async () => {
    const { svc, config } = svcWith();
    await svc.extract('sys', [{ role: 'user', content: 'hi' } as ChatTurn], tool);
    expect(config().model).toBe('gemini-2.5-pro');
    expect(config().config.thinkingConfig).toBeUndefined();
  });
});
