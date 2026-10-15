import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException } from '@nestjs/common';
import { NOW, at, setup } from './__fixtures__/aisha-review';

/**
 * THE MANAGER'S BRIEFING FOR A REVIEW, AS EACH READER READS IT (decision 85, item 4; build step 13).
 *
 * Baridi Appliances, the same record as the-record-in-a-review-as-each-reader-reads-it.spec.ts. Wairimu
 * decided Aisha's previous review on 15 March 2026, and starts this one on 1 October 2026. In "Sales team,
 * Q3", which Wairimu runs, three things about Aisha's work keep coming up:
 *   - "Problems are mostly put down to things outside the team", in sessions 2, 3 and 4. Aisha answered
 *     it, and Wairimu talked it through with her on 25 September; it came up once more after that.
 *   - "Delivers what was agreed, with proof", shown to Aisha on 30 September. Her three days to answer
 *     are not over on 1 October, so Wairimu does not read it until 3 October.
 *   - "Credits somebody else by name", seen once only, which nobody reads (decision 8).
 * In "Supplier review", which Kamau runs and Wairimu is not in, one more pattern, never Wairimu's.
 * Grace is an admin and Juma another lead of Sales; neither runs or is in either check-in.
 *
 * Groundwork gives evidence and patterns and never decides: no verdict, label, score or rating for any
 * reader, and the lead's own mark on a pattern and the coaching lines are not in the briefing.
 */

const patterns = [
  {
    id: 'pt-outside', participantId: 'pa-sales', code: 'B11', observationText: 'Aisha put the missed orders down to the stock arriving late.',
    seenInSessions: [2, 3, 4], periodsObserved: 3, readyAt: at('2026-09-20'), shownToPersonAt: at('2026-09-21'),
    personAnswer: 'The stock came three weeks late, so I could not sell.', personAnsweredAt: at('2026-09-22'),
    leadMark: 'RIGHT', talkedAboutAt: at('2026-09-25'), talkedAboutBy: 'u-wairimu', talkedAboutAtPeriod: 3, evidenceSource: 'both',
  },
  {
    id: 'pt-delivers', participantId: 'pa-sales', code: 'M1', observationText: 'Aisha sent the proof of each order with her check-in.',
    seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: at('2026-09-30'), shownToPersonAt: at('2026-09-30'), personAnswer: null, personAnsweredAt: null,
  },
  { id: 'pt-once', participantId: 'pa-sales', code: 'R3', observationText: 'Aisha credited Miriam by name.', seenInSessions: [3], periodsObserved: 1, readyAt: null },
  {
    id: 'pt-supply', participantId: 'pa-supply', code: 'B3', observationText: 'Kamau described chasing the delivery himself.',
    seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: at('2026-08-01'), shownToPersonAt: at('2026-08-01'), personAnswer: 'We both chased it.', personAnsweredAt: at('2026-08-02'),
  },
];

const LABELS = /\b(PIP|performance improvement plan|exit|at[- ]risk|low[- ]performer|underperform\w*|verdict|rating|rated|score)\b/i;

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

async function started() {
  const x = setup({ earlier: true, patterns });
  const { id } = await x.svc.start(x.as('u-wairimu'), 'd-aisha');
  return { ...x, id };
}

describe('Wairimu, who writes the review, reads her briefing', () => {
  it('with the counts from the check-in she runs, Aisha’s answered pattern, what changed after earlier conversations, and that she decides', async () => {
    const { svc, as, id } = await started();
    const r: any = await svc.one(as('u-wairimu'), id);
    expect(r.briefing).toEqual({
      heading: 'Your briefing for Aisha’s review',
      counts: 'In the check-ins you are in with Aisha, Aisha made 5 commitments between 6 April 2026 and 28 September 2026. Aisha kept 2 of them, 1 was not done, 1 was dropped and 1 was still open when this review started. Of them, 2 took longer than first said, because they were not done, or Aisha said them again in a later check-in.',
      patterns: [{
        heading: 'Problems are mostly put down to things outside the team',
        whatHappened: 'Aisha put the missed orders down to the stock arriving late.',
        howOften: 'This came up in 3 check-ins, in sessions 2, 3 and 4.',
        checkIn: 'Sales team, Q3',
        theirAnswer: 'Aisha’s answer: “The stock came three weeks late, so I could not sell.”',
      }],
      patternsNote: 'These only appear after three check-ins. Aisha sees them first and can answer, and they never go anywhere on their own.',
      changedAfterEarlierConversations: [
        'You talked with Aisha about “Problems are mostly put down to things outside the team” on 25 September 2026. It came up again in 1 check-in after that.',
        'You decided Aisha’s review on 15 March 2026. The decision was “Aisha leads the butchery accounts.” The reason given was “She closed every butchery sale she was given.”',
      ],
      corrections: [],
      whoDecides: 'There are no scores. Groundwork gives you the evidence and the patterns, and you decide. Aisha sees your reasons.',
    });
    /* "Groundwork suggests recognising" stays behind its setting, which is off. */
    expect(r.recognise).toBeNull();
  });

  it('reads a pattern Aisha has not answered once her three days are over, saying she has not answered', async () => {
    const { svc, as, id } = await started();
    jest.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    const r: any = await svc.one(as('u-wairimu'), id);
    expect(r.briefing.patterns.map((p: any) => [p.heading, p.theirAnswer])).toEqual([
      ['Problems are mostly put down to things outside the team', 'Aisha’s answer: “The stock came three weeks late, so I could not sell.”'],
      ['Delivers what was agreed, with proof', 'Aisha hasn’t answered this yet.'],
    ]);
  });

  it('reads Aisha’s corrections beside the line they correct, and never one about a check-in she is not in', async () => {
    const { svc, as, id } = await started();
    await svc.correct(as('u-aisha'), id, 'commitment:c2', 'Carrefour asked us to wait until their new buyer started in June.');
    await svc.correct(as('u-aisha'), id, 'blocker:w2', 'Kamau sent the dates the next day.');
    const r: any = await svc.one(as('u-wairimu'), id);
    expect(r.briefing.corrections).toEqual([{
      line: 'On 4 May 2026, in “Sales team, Q3”, Aisha committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.',
      said: 'Aisha marked this as wrong on 1 October 2026, and said what is true.',
      whatIsTrue: 'Carrefour asked us to wait until their new buyer started in June.',
    }]);
  });

  it('never reads a pattern from the check-in Kamau runs, one seen fewer than three times, the lead’s own mark or the coaching lines', async () => {
    const { svc, as, id } = await started();
    jest.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    const text = JSON.stringify((await svc.one(as('u-wairimu'), id) as any).briefing);
    expect(text).not.toMatch(/Others describe doing work|We both chased it|Credits somebody else|RIGHT|leadMark|coachTowards|oneStep|Two separate reads/);
  });
});

describe('everybody else who may open the review', () => {
  it('Grace, an admin, and Juma, another lead of Sales, read only what they may already read: no counts, no patterns, the earlier review, and that Wairimu decides', async () => {
    const { svc, as, id } = await started();
    await svc.correct(as('u-aisha'), id, 'commitment:c2', 'Carrefour asked us to wait.');
    for (const u of ['u-grace', 'u-juma']) {
      expect((await svc.one(as(u), id) as any).briefing).toEqual({
        heading: 'The briefing for Aisha’s review',
        counts: null,
        patterns: [],
        patternsNote: null,
        changedAfterEarlierConversations: [
          'Wairimu decided Aisha’s review on 15 March 2026. The decision was “Aisha leads the butchery accounts.” The reason given was “She closed every butchery sale she was given.”',
        ],
        corrections: [],
        whoDecides: 'There are no scores. Groundwork gives the evidence and the patterns, and Wairimu decides. Aisha sees the reasons.',
      });
    }
  });

  it('Aisha reads the record and her own answers, and is not served the briefing', async () => {
    const { svc, as, id } = await started();
    const r: any = await svc.one(as('u-aisha'), id);
    expect(r.reader).toBe('person');
    expect(r).not.toHaveProperty('briefing');
  });

  it('Miriam, a colleague, and Kamau, a lead of another team, are refused the review', async () => {
    const { svc, as, id } = await started();
    await expect(svc.one(as('u-miriam'), id)).rejects.toThrow(ForbiddenException);
    await expect(svc.one(as('u-kamau'), id)).rejects.toThrow(ForbiddenException);
  });
});

describe('Groundwork never makes the decision', () => {
  it('no reader’s briefing carries a verdict, a label, a score or a rating', async () => {
    const { svc, as, id } = await started();
    jest.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    for (const u of ['u-wairimu', 'u-grace', 'u-juma']) expect(JSON.stringify((await svc.one(as(u), id) as any).briefing)).not.toMatch(LABELS);
  });

  it('the briefing reads patterns only through the one place that decides who reads them, and reads no hours or leave', () => {
    const code = readFileSync(join(__dirname, 'a-review-briefing.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/servedPatterns\(/);
    expect(code).not.toMatch(/\b(timeEntry|timeWeek|leaveRequest|theirApprovedLeave|leadMark|coachingForAPattern)\b/);
  });
});
