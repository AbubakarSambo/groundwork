import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whoseAnswerThisIs, A_ROOM_MAY_START_PER_MINUTE, A_PERSON_MAY_SAY_PER_MINUTE } from './a-room-of-people-is-not-one-person';

/**
 * A hundred people scanning one QR code share one wifi and so one address. Every open-link route
 * was throttled per address at ten a minute, so the eleventh person was turned away - and proven
 * on 23 September 2026 the page then showed them nothing at all.
 */
describe('whose answer a request is', () => {
  it('reads the respondent\'s own key out of the body', () => {
    expect(whoseAnswerThisIs({ body: { key: 'a'.repeat(48) } })).toBe('a'.repeat(48));
  });

  it('and is not fooled into handing everybody one bucket', () => {
    /* A one-character "key" would be a shared tracker, which is the bug this exists to remove. */
    expect(whoseAnswerThisIs({ body: { key: 'x' } })).toBeNull();
    expect(whoseAnswerThisIs({ body: { key: 'not hex at all, but long enough to pass a length check' } })).toBeNull();
    expect(whoseAnswerThisIs({ body: {} })).toBeNull();
    expect(whoseAnswerThisIs({})).toBeNull();
    expect(whoseAnswerThisIs({ body: { key: 42 } as any })).toBeNull();
  });

  it('and trims, because a key pasted from a link carries whitespace', () => {
    expect(whoseAnswerThisIs({ body: { key: `  ${'b'.repeat(48)} ` } })).toBe('b'.repeat(48));
  });
});

describe('the numbers', () => {
  /* A room, not a clicker. The whole point is that a hundred is a normal Tuesday for this link. */
  it('lets a room start at once', () => {
    expect(A_ROOM_MAY_START_PER_MINUTE).toBeGreaterThanOrEqual(100);
  });

  it('and still holds one person answering to a human rate', () => {
    expect(A_PERSON_MAY_SAY_PER_MINUTE).toBeLessThanOrEqual(60);
  });
});

describe('and the guard uses it', () => {
  const GUARD = readFileSync(join(__dirname, 'a-sync-loop-is-not-a-browser.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('tracks a respondent by their own key rather than by their address', () => {
    expect(GUARD).toMatch(/const answering = whoseAnswerThisIs\(req\)/);
    expect(GUARD).toMatch(/getTracker: async \(\) => `answering:\$\{answering\}`/);
  });

  /* Before the machine check, so a respondent's key is never mistaken for a credential, and after
     nothing - this is the first question asked of an anonymous request. */
  it('and asks that before it asks whether this is a machine', () => {
    expect(GUARD.indexOf('whoseAnswerThisIs(req)')).toBeLessThan(GUARD.indexOf('this.whichCredential(req)'));
  });
});

describe('the routes', () => {
  const CTL = readFileSync(join(__dirname, '../../modules/entry/entry.controller.ts'), 'utf8');

  it('start is sized for a room', () => {
    expect(CTL).toMatch(/@Throttle\(\{ global: \{ limit: A_ROOM_MAY_START_PER_MINUTE, ttl: 60000 \} \}\)\s*\n\s*@Post\('open-start'\)/);
  });

  it('and answering is sized for a person', () => {
    expect(CTL).toMatch(/@Throttle\(\{ global: \{ limit: A_PERSON_MAY_SAY_PER_MINUTE, ttl: 60000 \} \}\)\s*\n\s*@Post\('open-say'\)/);
  });

  /* The numbers are named, not typed twice. A literal here and a literal in the guard is how two
     limits drift apart and nobody notices until a room is turned away again. */
  it('and neither number is written as a literal on the route', () => {
    const openRoutes = CTL.slice(CTL.indexOf("@Get('open')"), CTL.indexOf("@Post('open-finish')"));
    expect(openRoutes).not.toMatch(/limit: \d+, ttl: 60000 \} \}\)\s*\n\s*@Post\('open-s/);
  });
});
