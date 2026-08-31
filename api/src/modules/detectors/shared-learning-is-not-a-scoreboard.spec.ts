import { readFileSync } from 'fs';
import { join } from 'path';
import { whatMightHelp, Offered, CAVEAT, NOT_A_STANDARD, WHY_NAMED } from './what-worked-for-somebody-else';

const offer = (over: Partial<Offered> = {}): Offered => ({
  by: 'Amaka',
  about: 'procurement hold on the council contract',
  what: 'I asked their finance team for the PO number directly instead of chasing the buyer.',
  offeredAt: new Date('2026-08-01'),
  ...over,
});

describe('what one person worked out reaching the next person stuck on it', () => {
  it('matches on the problem, in the reader\'s own words', () => {
    const out = whatMightHelp({ about: 'stuck on a procurement hold with the council' }, [offer()]);
    expect(out).toHaveLength(1);
    expect(out[0].what).toContain('PO number');
  });

  it('does not match on one word in common, which is a coincidence', () => {
    const out = whatMightHelp({ about: 'the council keeps rescheduling' }, [offer()]);
    expect(out).toEqual([]);
  });

  it('keeps their words rather than a summary of their method', () => {
    const out = whatMightHelp({ about: 'procurement hold at the council' }, [offer()]);
    expect(out[0].what).toBe(offer().what);
  });

  it('says what it is not, next to what it is', () => {
    const out = whatMightHelp({ about: 'procurement hold at the council' }, [offer()]);
    expect(out[0].caveat).toBe(CAVEAT);
    expect(CAVEAT).toContain('worked once, for one person');
    expect(NOT_A_STANDARD.join(' ')).toContain('Nobody is being compared');
    expect(NOT_A_STANDARD.join(' ')).toContain('Ignoring it costs you nothing');
  });

  it('names them, because they wrote it for other people to read', () => {
    /* The one place a name attaches to somebody's work by default, and safe for the reason it is
       unsafe elsewhere. A tip from nobody cannot be asked a follow-up. */
    const out = whatMightHelp({ about: 'procurement hold at the council' }, [offer()]);
    expect(out[0].by).toBe('Amaka');
    expect(WHY_NAMED).toContain('Ask them about it');
  });

  it('orders by when it was written, and by nothing that could score anybody', () => {
    const out = whatMightHelp({ about: 'procurement hold at the council' }, [
      offer({ by: 'Old', offeredAt: new Date('2026-01-01') }),
      offer({ by: 'New', offeredAt: new Date('2026-08-20') }),
    ]);
    expect(out.map((o) => o.by)).toEqual(['New', 'Old']);
  });
});

describe('every obvious way to build this is a league table', () => {
  const SRC = readFileSync(join(__dirname, 'what-worked-for-somebody-else.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '');

  it('counts nobody', () => {
    /*
     * The day a number exists for how many notes somebody has offered, or how often theirs matched,
     * is the day it appears in a review. Asserted against the types so a field cannot arrive
     * without this failing.
     */
    /*
     * WHOLE WORDS, because the first version matched substrings and "account of one attempt" - in
     * the sentence saying this is one person's account and not a standard - contains "count". A
     * guard that fails on the prose defending the rule teaches whoever hits it to delete the prose.
     */
    for (const forbidden of ['count', 'counts', 'timesUsed', 'helpful', 'votes', 'score', 'rank', 'rating', 'useful']) {
      expect(SRC).not.toMatch(new RegExp(`\\b${forbidden}\\b`, 'i'));
    }
  });

  it('sorts by nothing but recency', () => {
    /*
     * The comparator, not the first bracket in it. `[^)]*` stopped at the `)` of `(a, b)` and so
     * asserted about the parameter list - which is the same for every comparator ever written.
     */
    const sorts = [...SRC.matchAll(/\.sort\(([\s\S]*?)\);/g)].map((m) => m[1]);
    expect(sorts).toHaveLength(1);
    expect(sorts[0]).toContain('offeredAt');
  });

  it('never harvests a note out of somebody\'s check-in', () => {
    /* Offers arrive as an argument. Nothing in here reads a conversation, a report, or a check-in,
       so a note reaches other people only because its author wrote it for them. */
    for (const reads of ['prisma', 'findMany', 'conversationTurn', 'checkIn', 'report']) {
      expect(SRC).not.toContain(reads);
    }
  });

  it('does not ask a model whose approach is good', () => {
    for (const model of ['gemini', 'generateContent', 'llm', 'prompt']) {
      expect(SRC.toLowerCase()).not.toContain(model);
    }
  });
});
