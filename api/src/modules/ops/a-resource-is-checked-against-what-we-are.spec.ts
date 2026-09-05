/**
 * The register's rules, and the one thing about it that must not become a score.
 */
import {
  distinctiveWordsIn,
  howItStands,
  whatTheWordsAlreadyShow,
  whyThisResourceIsNotReady,
  whyThisSignOffIsStale,
  type OneCheck,
} from './what-a-resource-must-not-claim';
import { readWhatItAnswered, thePrompt } from './what-a-reading-of-it-says';

const statement = {
  version: 3,
  headline: 'A record of what a team agreed and whether it happened.',
  isIt: ['A record several people can check'],
  isNotIt: ['A coaching tool', 'A performance management system'],
};

describe('the words pass', () => {
  it('flags a claim we have decided we are not, and quotes the word', () => {
    const [first] = whatTheWordsAlreadyShow(
      { title: 'Sales deck', content: 'Groundwork is a coaching platform for busy managers.' },
      statement,
    );
    expect(first.verdict).toBe('SAYS_WHAT_WE_ARE_NOT');
    expect(first.says).toContain('coaching');
  });

  it('matches the word however it is inflected', () => {
    const [first] = whatTheWordsAlreadyShow(
      { title: 'Deck', content: 'We coach your managers.' },
      statement,
    );
    expect(first.verdict).toBe('SAYS_WHAT_WE_ARE_NOT');
  });

  it('and never reports CLEAR, because a word not appearing proves nothing', () => {
    /* "Does not contain the word coaching" says nothing about whether the deck
       describes coaching. Only the reading pass can say CLEAR. */
    const checks = whatTheWordsAlreadyShow(
      { title: 'Deck', content: 'A record several people can check.' },
      statement,
    );
    expect(checks.every((c) => c.verdict !== 'CLEAR')).toBe(true);
    expect(checks.every((c) => c.verdict === 'NEEDS_A_LOOK')).toBe(true);
  });

  it('and ignores ordinary words, so it does not fire on every document', () => {
    /* Matching on "tool" or "system" would flag everything, and a check that
       fires on everything is ignored within a week. */
    expect(distinctiveWordsIn('A performance management system')).toEqual([
      'performance',
      'management',
    ]);
  });

  it('runs with no model, no key and no network', async () => {
    expect(typeof whatTheWordsAlreadyShow).toBe('function');
    expect(whatTheWordsAlreadyShow({ title: '', content: '' }, statement).length).toBe(2);
  });
});

describe('how a resource stands', () => {
  const clear = (claim: string): OneCheck => ({ claim, kind: 'IS_NOT', verdict: 'CLEAR', says: 'x' });

  it('is a count out of a count, never a percentage', () => {
    const stands = howItStands([clear('a'), clear('b')]);
    expect(stands.says).toContain('2 of 2');
    expect(stands.says).not.toMatch(/%/);
  });

  it('and unchecked is not zero, because those are opposite facts', () => {
    const stands = howItStands(null);
    expect(stands.checked).toBe(0);
    expect(stands.says).toContain('not the same as failing');
  });

  it('and names what was flagged rather than only counting it', () => {
    const stands = howItStands([
      { claim: 'A coaching tool', kind: 'IS_NOT', verdict: 'SAYS_WHAT_WE_ARE_NOT', says: 'x' },
    ]);
    expect(stands.flagged).toEqual(['A coaching tool']);
  });
});

describe('entering a resource', () => {
  const good = { category: 'SALES_DECK', content: 'x'.repeat(60), risks: ['a', 'b', 'c'] };

  it('needs the words themselves, not a link', () => {
    expect(whyThisResourceIsNotReady({ ...good, content: 'see the drive' })).toContain('Paste the words');
  });

  it('needs three risks, and says how far off it is', () => {
    expect(whyThisResourceIsNotReady({ ...good, risks: ['a'] })).toContain('1 so far');
  });

  it('and an OTHER category has to say what it is', () => {
    expect(whyThisResourceIsNotReady({ ...good, category: 'OTHER' })).toContain('drawer');
    expect(whyThisResourceIsNotReady({ ...good, category: 'OTHER', categoryDetail: 'Podcast script' })).toBeNull();
  });
});

describe('a sign-off against words that have since changed', () => {
  it('goes stale, and says which version it was checked against', () => {
    const said = whyThisSignOffIsStale({ checkedAgainstVersion: 2, currentVersion: 3 });
    expect(said).toContain('version 2');
    expect(said).toContain('now on 3');
  });

  it('and holds while the statement has not moved', () => {
    expect(whyThisSignOffIsStale({ checkedAgainstVersion: 3, currentVersion: 3 })).toBeNull();
  });
});

describe('the reading pass', () => {
  it('is given our words and never asked what the product is', () => {
    const prompt = thePrompt({ title: 'Deck', content: 'x' }, statement);
    expect(prompt).toContain('Judge ONLY against the statements given below');
    expect(prompt).toContain('A coaching tool');
    expect(prompt).not.toMatch(/what is this product|describe the product/i);
  });

  it('maps an answer back onto OUR claims rather than trusting its text', () => {
    /* A check whose claim is whatever the model typed is a check about nothing,
       and it would look identical to a real one on the page. */
    const read = readWhatItAnswered(
      JSON.stringify({
        checks: [
          { id: 'ISNOT-0', verdict: 'CLEAR', says: 'No coaching claim.' },
          { id: 'ISNOT-9', verdict: 'CLEAR', says: 'A claim that does not exist.' },
        ],
        says: 'Reads clean.',
      }),
      statement,
    );
    expect(read!.checks.length).toBe(1);
    expect(read!.checks[0].claim).toBe('A coaching tool');
  });

  it('and returns null rather than a guess when the answer is not usable', () => {
    expect(readWhatItAnswered('I think it looks fine!', statement)).toBeNull();
    expect(readWhatItAnswered(JSON.stringify({ checks: [] }), statement)).toBeNull();
  });

  it('and an unrecognised verdict becomes unsure rather than clear', () => {
    const read = readWhatItAnswered(
      JSON.stringify({ checks: [{ id: 'ISNOT-0', verdict: 'FINE', says: 'ok' }] }),
      statement,
    );
    expect(read!.checks[0].verdict).toBe('NEEDS_A_LOOK');
  });
});

describe('what happens when the two passes disagree', () => {
  const { OpsResourcesService } = require('./ops-resources.service');

  const resource = {
    id: 'r1',
    title: 'Sales deck',
    content: 'Groundwork is a coaching platform.',
    category: 'SALES_DECK',
    categoryDetail: null,
    url: null,
    risks: ['a', 'b', 'c'],
    checks: null,
    checkedAgainstVersion: null,
    checkedAt: null,
    checkSays: null,
    addedAt: new Date(),
  };

  const build = (read: unknown) => {
    let written: Record<string, unknown> = {};
    const prisma = {
      opsResource: {
        findUnique: async () => resource,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          written = data;
          return resource;
        },
      },
    };
    const service = new OpsResourcesService(
      prisma as never,
      { current: async () => statement } as never,
      { read: async () => read } as never,
    );
    return { service, written: () => written };
  };

  it('keeps a word-level flag even when the model says it is clear', async () => {
    /**
     * The model talking somebody out of a word we decided not to use is exactly
     * the argument nobody should be having at eleven at night before a deck
     * goes out. The reading can clear an unsure claim; it cannot clear a flagged
     * one.
     */
    const { service, written } = build({
      checks: [{ claim: 'A coaching tool', kind: 'IS_NOT', verdict: 'CLEAR', says: 'Reads fine.' }],
      says: 'Fine.',
    });
    await service.check('r1');

    const stored = written().checks as OneCheck[];
    expect(stored.find((c) => c.claim === 'A coaching tool')!.verdict).toBe('SAYS_WHAT_WE_ARE_NOT');
  });

  it('and takes the reading on a claim the words could say nothing about', async () => {
    const { service, written } = build({
      checks: [
        { claim: 'A performance management system', kind: 'IS_NOT', verdict: 'CLEAR', says: 'No.' },
      ],
      says: 'Fine.',
    });
    await service.check('r1');

    const stored = written().checks as OneCheck[];
    expect(stored.find((c) => c.claim === 'A performance management system')!.verdict).toBe('CLEAR');
  });

  it('and says so plainly when nothing read it at all', async () => {
    const { service, written } = build(null);
    await service.check('r1');
    expect(written().checkSays).toContain('nothing read it');
    expect(written().checkedAgainstVersion).toBe(3);
  });
});
