/**
 * WHAT THE LEAD MADE OF A PATTERN (decision 57, items 2 and 3).
 *
 * Item 2: after talking a pattern through, the lead marks it right, wrong or not sure. A route for
 * the person who runs the check-in only - 403 for everyone else, including the person and a
 * colleague - allowed only once the lead may already read the pattern (decision 39's timing). Never
 * shown to the person as a rating of them, and never to a colleague.
 *
 * Item 3: the lead can also mark "we talked about it", which is what the nudge in Today goes away on,
 * and which "seen again after the talk" is derived from.
 */

import { seenAgainAfterTalk, patternTalkNudge, servedPatterns, type ALeadPatternMark } from './who-reads-a-pattern';

const NOW = Date.now();

/* Three periods, so the lead may already read it (decision 39's timing has passed: it is ready and
   was shown to Femi four days ago, past the three-day window). */
const ROW = {
  id: 'pd2', participantId: 'p-femi', code: 'B3',
  observationText: 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.',
  periodsObserved: 3, seenInSessions: [1, 2, 3],
  readyAt: new Date(NOW - 5 * 86400000), shownToPersonAt: new Date(NOW - 4 * 86400000),
  personAnswer: 'I built the deck, Ngozi did the pricing.' as string | null, personAnsweredAt: new Date(NOW - 4 * 86400000) as Date | null,
  leadMark: null as ALeadPatternMark | null, leadMarkedAt: null as Date | null, leadMarkedBy: null as string | null,
  talkedAboutAt: null as Date | null, talkedAboutBy: null as string | null, talkedAboutAtPeriod: null as number | null,
  participant: {
    userId: 'u-femi',
    ground: {
      initiatorId: 'u-tunde',
      participants: [
        { id: 'p-tunde', userId: 'u-tunde', user: { firstName: 'Tunde' } },
        { id: 'p-femi', userId: 'u-femi', user: { firstName: 'Femi' } },
        { id: 'p-ngozi', userId: 'u-ngozi', user: { firstName: 'Ngozi' } },
      ],
    },
  },
};

function serviceWith(row: any = ROW) {
  let Svc: any;
  jest.isolateModules(() => {
    jest.doMock('./patterns-are-served', () => ({ PATTERNS_ARE_SERVED: true }));
    Svc = require('./patterns.service').PatternsService;
  });
  jest.dontMock('./patterns-are-served');
  const update = jest.fn(async (args: any) => ({ ...row, ...args.data }));
  const prisma: any = { patternDetection: { findUnique: jest.fn(async () => (row ? JSON.parse(JSON.stringify(row)) : null)), update } };
  return { svc: new Svc(prisma, {} as any), update };
}

describe('the lead marks a pattern right, wrong or not sure (decision 57, item 2)', () => {
  it('only the lead - 403 for the person it is about and for a colleague', async () => {
    for (const userId of ['u-femi', 'u-ngozi', 'u-someone-else']) {
      const { svc, update } = serviceWith();
      await expect(svc.markAsTheLead('pd2', userId, 'RIGHT')).rejects.toHaveProperty('status', 403);
      expect(update).not.toHaveBeenCalled();
    }
  });

  it('the lead can mark it, and never reads it back as their own rating', async () => {
    const { svc, update } = serviceWith();
    const served = await svc.markAsTheLead('pd2', 'u-tunde', 'WRONG');
    expect(update.mock.calls[0][0].data.leadMark).toBe('WRONG');
    expect(update.mock.calls[0][0].data.leadMarkedAt).toBeInstanceOf(Date);
    expect(update.mock.calls[0][0].data.leadMarkedBy).toBe('u-tunde');
    /* The reader here IS the lead, so the mark comes back to them. */
    expect(served.leadMark).toBe('WRONG');
  });

  it('is refused before the lead may already read the pattern (decision 39’s timing)', async () => {
    const early = serviceWith({ ...ROW, seenInSessions: [1, 2], periodsObserved: 2, readyAt: null });
    await expect(early.svc.markAsTheLead('pd2', 'u-tunde', 'RIGHT')).rejects.toHaveProperty('status', 403);
    expect(early.update).not.toHaveBeenCalled();
  });

  it('is refused while patterns are not served', async () => {
    let Svc: any;
    jest.isolateModules(() => {
      jest.doMock('./patterns-are-served', () => ({ PATTERNS_ARE_SERVED: false }));
      Svc = require('./patterns.service').PatternsService;
    });
    jest.dontMock('./patterns-are-served');
    const svc = new Svc({ patternDetection: { findUnique: jest.fn() } } as any, {} as any);
    await expect(svc.markAsTheLead('pd2', 'u-tunde', 'RIGHT')).rejects.toHaveProperty('status', 403);
  });

  it('never served to the person it is about, or to a colleague, however it was marked', () => {
    const marked = { ...ROW, leadMark: 'WRONG' as ALeadPatternMark };
    const asFemi = servedPatterns([marked], { participantId: 'p-femi', runsIt: false }, { on: true, now: new Date(NOW) });
    expect(asFemi[0].leadMark).toBeNull();
    const asColleague = servedPatterns([marked], { participantId: 'p-ngozi', runsIt: false }, { on: true, now: new Date(NOW) });
    expect(asColleague).toEqual([]); // a colleague never reaches this row at all
    const asLead = servedPatterns([marked], { participantId: 'p-tunde', runsIt: true }, { on: true, now: new Date(NOW) });
    expect(asLead[0].leadMark).toBe('WRONG');
  });
});

describe('the lead marks that they talked a pattern through (decision 57, item 3)', () => {
  it('only the lead can mark it, 403 for anybody else', async () => {
    const { svc, update } = serviceWith();
    await expect(svc.markTalkedAbout('pd2', 'u-femi')).rejects.toHaveProperty('status', 403);
    expect(update).not.toHaveBeenCalled();
  });

  it('sets talkedAboutAt and an anchor period, which both readers may see as a plain fact', async () => {
    const { svc, update } = serviceWith();
    const served = await svc.markTalkedAbout('pd2', 'u-tunde');
    expect(update.mock.calls[0][0].data.talkedAboutAt).toBeInstanceOf(Date);
    expect(update.mock.calls[0][0].data.talkedAboutBy).toBe('u-tunde');
    expect(update.mock.calls[0][0].data.talkedAboutAtPeriod).toBe(3);
    expect(served.talkedAbout).toBe(true);
    const asFemi = servedPatterns([{ ...ROW, talkedAboutAt: new Date(NOW) }], { participantId: 'p-femi', runsIt: false }, { on: true, now: new Date(NOW) });
    expect(asFemi[0].talkedAbout).toBe(true);
    /* The fact, never the verdict behind it. */
    expect(asFemi[0].leadMark).toBeNull();
  });

  it('a second mark is a no-op, not an error', async () => {
    const already = { ...ROW, talkedAboutAt: new Date(NOW - 86400000), talkedAboutBy: 'u-tunde', talkedAboutAtPeriod: 3 };
    const { svc, update } = serviceWith(already);
    await svc.markTalkedAbout('pd2', 'u-tunde');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('"seen again after the talk", derived from the honest history (decision 57, item 3)', () => {
  it('is null before there has been any talk to derive it from', () => {
    expect(seenAgainAfterTalk({ seenInSessions: [1, 2, 3], talkedAboutAt: null, talkedAboutAtPeriod: null })).toBeNull();
  });

  it('counts only the periods seen after the anchor written when the talk was marked', () => {
    expect(seenAgainAfterTalk({ seenInSessions: [1, 2, 3], talkedAboutAt: new Date(), talkedAboutAtPeriod: 3 })).toBe(0);
    expect(seenAgainAfterTalk({ seenInSessions: [1, 2, 3, 4], talkedAboutAt: new Date(), talkedAboutAtPeriod: 3 })).toBe(1);
    expect(seenAgainAfterTalk({ seenInSessions: [1, 2, 3, 4, 6], talkedAboutAt: new Date(), talkedAboutAtPeriod: 3 })).toBe(2);
  });
});

describe('the nudge to talk it through, once, in plain words (decision 57, item 3)', () => {
  it('quotes the person’s own words when they have answered', () => {
    const [served] = servedPatterns([ROW], { participantId: 'p-tunde', runsIt: true }, { on: true, now: new Date(NOW) });
    const nudge = patternTalkNudge(served, 'Femi');
    expect(nudge.decide).toBe('Talk with Femi about “Others describe doing work they described as theirs”.');
    expect(nudge.why).toBe('Femi has seen it. Femi said, “I built the deck, Ngozi did the pricing.”');
  });

  it('adds a single full stop when the person’s own words did not end with one', () => {
    const noStop = { ...ROW, personAnswer: 'I built the deck, Ngozi did the pricing' };
    const [served] = servedPatterns([noStop], { participantId: 'p-tunde', runsIt: true }, { on: true, now: new Date(NOW) });
    const nudge = patternTalkNudge(served, 'Femi');
    expect(nudge.why).toBe('Femi has seen it. Femi said, “I built the deck, Ngozi did the pricing”.');
  });

  it('says plainly when the person has not answered, without inventing anything', () => {
    const unanswered = { ...ROW, personAnswer: null, personAnsweredAt: null };
    const [served] = servedPatterns([unanswered], { participantId: 'p-tunde', runsIt: true }, { on: true, now: new Date(NOW) });
    const nudge = patternTalkNudge(served, 'Femi');
    expect(nudge.why).toBe('Femi has seen this and has not answered yet.');
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, the lead
 * cannot mark a pattern they do not read". There is no such reach now: with nothing put in force, the
 * lead reads Femi's pattern after his turn, and can mark it and say they talked it through.
 */
describe('with no setting at all, the lead reads the pattern after Femi’s turn and can mark it (decision 86)', () => {
  it('marking it right, wrong or not sure is accepted and written', async () => {
    const { svc, update } = serviceWith();
    await svc.markAsTheLead('pd2', 'u-tunde', 'RIGHT');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('marking that they talked it through is accepted and written', async () => {
    const { svc, update } = serviceWith();
    await svc.markTalkedAbout('pd2', 'u-tunde');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('the lead is served it with the mark, and Femi is served his own without any mark, told Tunde reads it too', () => {
    const marked = { ...ROW, leadMark: 'WRONG' as ALeadPatternMark };
    const asTunde = servedPatterns([marked], { participantId: 'p-tunde', runsIt: true }, { on: true, now: new Date(NOW) });
    expect(asTunde).toHaveLength(1);
    expect(asTunde[0].leadMark).toBe('WRONG');
    const asFemi = servedPatterns([marked], { participantId: 'p-femi', runsIt: false }, { on: true, now: new Date(NOW) });
    expect(asFemi).toHaveLength(1);
    expect(asFemi[0].leadMark).toBeNull();
    expect(asFemi[0].whoSeesIt).not.toContain('Only you see this');
  });
});
