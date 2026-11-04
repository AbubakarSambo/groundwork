import { ConfigService } from '@nestjs/config';
import { AnthropicService } from './anthropic.service';
import { MODEL_STAND_IN_ENV, THE_STAND_IN_QUESTIONS, THE_STAND_IN_READ_NO_FILE, theModelStandInIsOn } from './a-stand-in-for-the-model';

/**
 * The model stand-in for a local browser test: on only when asked for by name, never in production, and with it on
 * no model is called and a person reads plain fixed questions.
 */
describe('the stand-in for the model (a local browser test only)', () => {
  const was = { ...process.env };
  afterEach(() => { process.env = { ...was }; });

  it('is off when the variable is not set, so nothing changes', () => {
    expect(theModelStandInIsOn({ NODE_ENV: 'development' } as any)).toBe(false);
    expect(theModelStandInIsOn({ NODE_ENV: 'production' } as any)).toBe(false);
  });

  it('refuses to start in production', () => {
    expect(() => theModelStandInIsOn({ NODE_ENV: 'production', [MODEL_STAND_IN_ENV]: 'fixed-questions' } as any)).toThrow(/Refusing to start.*production/);
  });

  it('refuses a value it does not know, so a typo cannot quietly turn the model off', () => {
    expect(() => theModelStandInIsOn({ NODE_ENV: 'development', [MODEL_STAND_IN_ENV]: 'yes' } as any)).toThrow(/only value it takes is "fixed-questions"/);
  });

  it('the API refuses to start in production with it set', () => {
    process.env = { ...was, NODE_ENV: 'production', [MODEL_STAND_IN_ENV]: 'fixed-questions' };
    expect(() => new AnthropicService(new ConfigService({}))).toThrow(/Refusing to start/);
  });

  describe('when it is on', () => {
    let svc: AnthropicService;
    let calls: number;
    beforeEach(() => {
      process.env = { ...was, NODE_ENV: 'development', [MODEL_STAND_IN_ENV]: 'fixed-questions' };
      svc = new AnthropicService(new ConfigService({}));
      calls = 0;
      const counted = () => { calls += 1; throw new Error('the model was called'); };
      (svc as any).client = { models: { generateContent: counted, generateContentStream: counted } };
    });

    it('a person reads the fixed plain questions in order, and no model is called', async () => {
      const said: string[] = [];
      const history: any[] = [{ role: 'user', content: 'Begin.' }];
      for (let i = 0; i < 5; i++) {
        const reply = await svc.respond('system', history);
        said.push(reply);
        history.push({ role: 'assistant', content: reply }, { role: 'user', content: 'An answer.' });
      }
      expect(said).toEqual([...THE_STAND_IN_QUESTIONS, THE_STAND_IN_QUESTIONS[3]]);
      expect(calls).toBe(0);
    });

    it('the streamed reply is the same question', async () => {
      const parts: string[] = [];
      for await (const p of svc.respondStream('system', [{ role: 'user', content: 'Begin.' }])) parts.push(p);
      expect(parts.join('')).toBe('What did you get done since your last check-in?');
      expect(calls).toBe(0);
    });

    it('a request for structured output finds nothing, and a file is kept but not read', async () => {
      expect(await svc.extract('system', [{ role: 'user', content: 'x' }], { name: 't', description: 'd', input_schema: { type: 'object', properties: {} } })).toBeNull();
      expect(await svc.respondWithMedia('s', 'p', { mimeType: 'image/png', base64: '' })).toBe(THE_STAND_IN_READ_NO_FILE);
      expect(calls).toBe(0);
    });
  });
});
