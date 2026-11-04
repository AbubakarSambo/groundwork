import { TheFixedInstructions, asACachedAsk, THE_REST_OF_THE_INSTRUCTIONS, WORTH_CACHING_FROM_CHARS, A_CACHE_LIVES_S } from './the-fixed-instructions-are-cached';

/**
 * THE FIXED INSTRUCTIONS ARE SENT ONCE (Hafsah, 3 November evening). The engine's rules go to Gemini once, in a cache, and each reply
 * sends only what follows them. Nothing is cut: the cached rules and what each reply sends are, together, the whole prompt.
 */
const RULES = 'You are Groundwork. '.repeat(Math.ceil(WORTH_CACHING_FROM_CHARS / 20) + 5);
const THIS_ONE = 'BRIAN\'S RECORD. On Monday 9 November Brian said he would file the Kasarani appeal by Friday.';
const PROMPT = `${RULES}\n\n${THIS_ONE}`;

function aCache(now = { t: 1_000_000 }) {
  const made: any[] = []; const kept: any[] = [];
  let fail = false;
  const caches = {
    create: jest.fn(async (a: any) => { if (fail) throw new Error('quota'); made.push(a); return { name: `cachedContents/${made.length}`, expireTime: new Date(now.t + A_CACHE_LIVES_S * 1000).toISOString() }; }),
    update: jest.fn(async (a: any) => { kept.push(a); return {}; }),
  };
  const fixed = new TheFixedInstructions(() => caches, () => 'gemini-2.5-flash', () => undefined, () => now.t);
  return { fixed, caches, made, kept, now, failNext: () => { fail = true; } };
}

describe('the fixed instructions, cached', () => {
  it('a reply sends what follows the rules in front of the conversation, and the two together are the whole prompt', () => {
    const contents = [{ role: 'model', parts: [{ text: 'What is the status of the Kasarani appeal?' }] }, { role: 'user', parts: [{ text: 'Filed on Thursday.' }] }];
    const asked = asACachedAsk(PROMPT, RULES, contents);
    expect(asked[0]).toEqual({ role: 'user', parts: [{ text: `${THE_REST_OF_THE_INSTRUCTIONS}\n\n${THIS_ONE}` }] });
    expect(asked.slice(1)).toEqual(contents);
    expect(`${RULES}\n\n${asked[0].parts[0].text.slice(THE_REST_OF_THE_INSTRUCTIONS.length + 2)}`).toBe(PROMPT);
  });

  it('joins the person\'s first message rather than putting two of theirs in a row', () => {
    const asked = asACachedAsk(PROMPT, RULES, [{ role: 'user', parts: [{ text: '<<BEGIN_CHECK_IN>>' }] }]);
    expect(asked).toHaveLength(1);
    expect(asked[0].parts.map((p) => p.text)).toEqual([`${THE_REST_OF_THE_INSTRUCTIONS}\n\n${THIS_ONE}`, '<<BEGIN_CHECK_IN>>']);
  });

  it('is made once for the same rules, and only a ready cache is used', async () => {
    const c = aCache();
    c.fixed.keep(RULES);
    c.fixed.keep(RULES);
    expect(c.fixed.for(PROMPT)).toBeNull();
    await new Promise((r) => setImmediate(r));
    expect(c.caches.create).toHaveBeenCalledTimes(1);
    expect(c.made[0].config.systemInstruction).toBe(RULES);
    expect(c.fixed.for(PROMPT)).toEqual({ name: 'cachedContents/1', fixed: RULES });
  });

  it('a prompt with other rules, or rules too short to be worth it, sends everything as before', async () => {
    const c = aCache();
    c.fixed.keep(RULES);
    c.fixed.keep('Short rules.');
    await new Promise((r) => setImmediate(r));
    expect(c.caches.create).toHaveBeenCalledTimes(1);
    expect(c.fixed.for(`Other rules entirely. ${THIS_ONE}`)).toBeNull();
  });

  it('is kept alive while it is used, forgotten when Gemini no longer has it, and made again', async () => {
    const c = aCache();
    c.fixed.keep(RULES);
    await new Promise((r) => setImmediate(r));
    c.now.t += (A_CACHE_LIVES_S - 60) * 1000;
    expect(c.fixed.for(PROMPT)?.name).toBe('cachedContents/1');
    expect(c.caches.update).toHaveBeenCalledWith({ name: 'cachedContents/1', config: { ttl: `${A_CACHE_LIVES_S}s` } });
    c.fixed.forget('cachedContents/1');
    expect(c.fixed.for(PROMPT)).toBeNull();
    c.fixed.keep(RULES);
    await new Promise((r) => setImmediate(r));
    expect(c.fixed.for(PROMPT)?.name).toBe('cachedContents/2');
  });

  it('a cache that cannot be made leaves every reply as it was, and is not asked for again on every reply', async () => {
    const c = aCache();
    c.failNext();
    c.fixed.keep(RULES);
    await new Promise((r) => setImmediate(r));
    c.fixed.keep(RULES);
    expect(c.caches.create).toHaveBeenCalledTimes(1);
    expect(c.fixed.for(PROMPT)).toBeNull();
  });
});
