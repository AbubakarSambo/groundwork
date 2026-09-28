import { readFileSync } from 'fs';
import { join } from 'path';
import { ConversationService } from './conversation.service';
import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';

const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * THE STREAMED ROUTE HAS THE SAME SAFETY NET AS THE PLAIN ROUTE. Hafsah, 28 September 2026.
 *
 * Before this, a banned word, a management word, or two questions the save could not split went
 * out on the stream as the model wrote them, because the stream was a copy of the plain route that
 * never got the second tries. The runs measured the plain route; people used the stream.
 */
describe('the streamed route is the plain route', () => {
  it('runs sendMessage itself, and has no model call or write of its own', () => {
    expect(theStreamedRouteRunsThePlainRoute(SRC)).toBe(true);
  });

  it('and every second try lives in sendMessage, where both routes run it', () => {
    const plain = SRC.slice(SRC.indexOf('async sendMessage(checkInId'), SRC.indexOf('async *sendMessageStream('));
    for (const guard of ['wouldLeaveAQuestionOut(screened.text)', 'managementWordsIn(screened.text, theirWords)', 'wordsWeDoNotUse(screened.text, theirWords)']) {
      expect(plain).toContain(guard);
    }
  });

  const serviceWith = (reply: any, draft: string[]) => {
    const svc = Object.create(ConversationService.prototype) as any;
    svc.logger = { debug: () => undefined, warn: () => undefined, log: () => undefined };
    svc.aSessionUnderway = async () => ({ id: 'c-1' });
    svc.sendMessage = async (_id: string, _who: string, _msg: string, how: any) => {
      for (const d of draft) how?.streamDraft?.(d);
      return reply;
    };
    return svc as ConversationService;
  };

  const run = async (svc: ConversationService) => {
    const events: any[] = [];
    for await (const e of svc.sendMessageStream('c-1', 'u-1', 'We sold three.')) events.push(e);
    return events;
  };

  it('ends with exactly what the plain route returns, after showing the draft as it came', async () => {
    const plain = { reply: 'Thank you. Which shop placed the order?', sessionComplete: false, suggestedAnswers: ['Kariuki Butchery.', 'Not sure yet.'] };
    const events = await run(serviceWith(plain, ['Thank you. ', 'Which shop, ', 'and when?']));
    expect(events.filter((e) => e.type === 'delta').map((e) => e.text)).toEqual(['Thank you. ', 'Which shop, ', 'and when?']);
    /* The draft asked two things; the plain route's rewrite asked one. What stays on screen is the rewrite. */
    expect(events[events.length - 1]).toEqual({ type: 'done', reply: plain.reply, sessionComplete: false, suggestedAnswers: plain.suggestedAnswers });
  });

  it('closes when the plain route closes', async () => {
    const events = await run(serviceWith({ reply: 'Your report is ready now. Speak soon.', sessionComplete: true }, []));
    expect(events).toEqual([{ type: 'done', reply: 'Your report is ready now. Speak soon.', sessionComplete: true }]);
  });

  it('and fails when the plain route fails, before any done', async () => {
    const svc = serviceWith(null, []) as any;
    svc.sendMessage = async () => { throw new Error('refused'); };
    await expect(run(svc)).rejects.toThrow('refused');
  });

  it('shows the draft through the same sentence gate, with the close marker held back', async () => {
    const svc = Object.create(ConversationService.prototype) as any;
    svc.anthropic = { respondStream: async function* () { yield 'What moved '; yield 'this week?'; } };
    svc._knownForThisTurn = new Map(); svc._theirEarlierWordsForThisTurn = new Map();
    const shown: string[] = [];
    const raw = await svc.streamTheDraft({ id: 'c-1' }, 'system', [], [], 'hi', (t: string) => shown.push(t));
    expect(raw).toBe('What moved this week?');
    expect(shown.join('')).toBe('What moved this week?');
  });
});

describe('a stream that fails is asked for again the plain way', () => {
  it('falls back to respond(), with its retries, and shows the reply whole', async () => {
    const svc = Object.create(ConversationService.prototype) as any;
    svc.logger = { warn: () => undefined };
    svc.anthropic = {
      respondStream: async function* () { throw new Error('Gemini respondStream() did not open after 20s'); },
      respond: async () => 'What moved this week?',
    };
    svc._knownForThisTurn = new Map(); svc._theirEarlierWordsForThisTurn = new Map();
    const shown: string[] = [];
    const raw = await svc.streamTheDraft({ id: 'c-1' }, 'system', [], [], 'hi', (t: string) => shown.push(t));
    expect(raw).toBe('What moved this week?');
    expect(shown.join('')).toBe('What moved this week?');
  });

  it('and only if that fails too does the person see the error', async () => {
    const svc = Object.create(ConversationService.prototype) as any;
    svc.logger = { warn: () => undefined };
    svc.anthropic = {
      respondStream: async function* () { throw new Error('fetch failed'); },
      respond: async () => { throw new Error('busy'); },
    };
    svc._knownForThisTurn = new Map(); svc._theirEarlierWordsForThisTurn = new Map();
    await expect(svc.streamTheDraft({ id: 'c-1' }, 'system', [], [], 'hi', () => undefined)).rejects.toThrow('busy');
  });
});
