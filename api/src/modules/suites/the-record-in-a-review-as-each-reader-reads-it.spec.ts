import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { REVIEW_REFUSED } from './the-reviews.service';
import { aRecordLineSaid, saysNothingOnItsOwn } from './the-record-read-for-a-review';

/**
 * THE REVIEW AS THE RECORD INTERPRETED, AS EACH READER READS IT (decision 85, item 4; build step 12).
 *
 * Baridi Appliances. Reviews are every 6 months, and "Their manager" writes each one. Wairimu leads
 * Sales and manages Aisha. On 1 October 2026 Wairimu starts Aisha's review. In the six months before:
 *   - "Sales team, Q3", which Wairimu runs, and Aisha and Miriam are in. Aisha checked in three times,
 *     owns the goal "New supermarket accounts" (5 against 4), made five commitments there (one done,
 *     one not done, one done after she said it again twice, one dropped, one still open), and said she
 *     was waiting on Operations for the freezers, which cleared. A goal that is a decision about a
 *     person, and a commitment pasted in by the lead, are not hers to read here.
 *   - "Supplier review", which Kamau runs and Wairimu is not in. Aisha checked in once, kept one
 *     commitment, and said she was waiting on Kamau for the delivery dates.
 *   - She owns "Supermarket accounts in Nairobi" in the work plan.
 * Grace is an admin and Juma is another lead in Sales; neither is in either check-in. Miriam is a
 * colleague. Each reader is served only what they may read, in their own words.
 */

import { NOW, setup } from './__fixtures__/aisha-review';

const says = (r: any) => (r.record?.parts ?? []).map((x: any) => [x.heading, x.lines.map((l: any) => l.says)]);
const LABELS = /\b(PIP|performance improvement plan|exit|at[- ]risk|low[- ]performer|underperform\w*|verdict|rating|rated|score)\b/i;

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

describe('the record, read once when the review starts', () => {
  it('is kept as facts with ids, never as sentences with names, and never reads hours or leave', async () => {
    const { svc, as, reviews } = setup();
    await svc.start(as('u-wairimu'), 'd-aisha');
    const stored = reviews[0];
    expect(stored.recordFrom.toISOString()).toBe('2026-04-01T09:00:00.000Z');
    expect(stored.recordRead.map((l: any) => l.key)).toEqual([
      'worked:g-sales', 'worked:g-supply', 'goal:o-accounts', 'work-plan:s-nairobi', 'commitments:g-sales', 'commitments:g-supply',
      'commitment:c1', 'commitment:c2', 'commitment:c3', 'commitment:c4', 'commitment:c6', 'blocker:w1', 'blocker:w2',
    ]);
    expect(JSON.stringify(stored.recordRead)).not.toMatch(/Keep Aisha on|Pasted from the plan|Aisha Otieno/);
    const code = readFileSync(join(__dirname, 'the-record-read-for-a-review.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(timeEntry|timeWeek|timeAgreement|leaveRequest|theirApprovedLeave)\b/);
  });
});

describe('the record, as each reader reads it', () => {
  it('Aisha reads every line about her own work, said to her as “you”, and that Wairimu reads her corrections', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    const r: any = await svc.one(as('u-aisha'), id);
    expect(r.record.intro).toBe('This is what Groundwork understands from the record about your work between 1 April 2026 and 1 October 2026. It comes from your check-ins, the goals and work-plan items you own, what you committed to and how each one went, and what you said was holding you up. If a line is wrong, mark it and say what is true. Your correction is kept beside the line, and the record itself is not changed.');
    expect(r.record.whoReads).toBe('Wairimu reads your corrections and your own view before you meet. Lines from check-ins that Wairimu is not in stay with you, and so does anything you say about them. If you want Wairimu to know, put it in your own view.');
    expect(r.record.mayCorrect).toBe(true);
    expect(says(r)).toEqual([
      ['What you worked on', [
        'You checked in 3 times in “Sales team, Q3”, which Wairimu runs, between 6 April 2026 and 28 September 2026.',
        'You checked in once in “Supplier review”, which Kamau runs, on 10 June 2026.',
        'You own the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4.',
        'You own “Supermarket accounts in Nairobi” in the work plan. It is due on 31 December 2026. Its status in the work plan is “In progress”.',
      ]],
      ['What you committed to', [
        'In “Sales team, Q3”, you made 5 commitments between 6 April 2026 and 28 September 2026. Of these, 2 were done, 1 was not done, 1 was dropped and 1 was still open when this review started.',
        'In “Supplier review”, you made 1 commitment on 10 June 2026. It was done.',
      ]],
      ['What you finished', [
        'On 6 April 2026, in “Sales team, Q3”, you said, “I will call Naivas about the freezers.” It was done on 20 April 2026.',
        'On 10 June 2026, in “Supplier review”, you said, “I will chase the freezer delivery.” It was done on 20 June 2026.',
      ]],
      ['What was dropped along the way', [
        'On 1 June 2026, in “Sales team, Q3”, you committed to open a second butchery account. It was dropped later.',
      ]],
      ['What took longer than first said', [
        'On 4 May 2026, in “Sales team, Q3”, you committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.',
        'On 4 May 2026, in “Sales team, Q3”, you committed to visit Quickmart on Ngong Road. You said it again in 2 later check-ins. It was done on 1 June 2026.',
      ]],
      ['What you said was holding you up', [
        'On 6 April 2026, in “Sales team, Q3”, you said you were waiting on Operations for the freezers for the first customers. It cleared on 27 April 2026.',
        'On 10 June 2026, in “Supplier review”, you said you were waiting on Kamau for the delivery dates. It was still open when this review started.',
      ]],
    ]);
  });

  it('Wairimu, who writes it, reads only the lines from the check-in she runs and the work plan, with Aisha’s name', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    const r: any = await svc.one(as('u-wairimu'), id);
    expect(r.record.intro).toBe('This is what Groundwork understands from the record about Aisha’s work between 1 April 2026 and 1 October 2026, from the check-ins you are in. Aisha reads it too, and can mark any line as wrong and say what is true.');
    expect(r.record.whoReads).toBeNull();
    expect(r.record.mayCorrect).toBe(false);
    expect(says(r)).toEqual([
      ['What Aisha worked on', [
        'Aisha checked in 3 times in “Sales team, Q3”, which you run, between 6 April 2026 and 28 September 2026.',
        'Aisha owns the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4.',
        'Aisha owns “Supermarket accounts in Nairobi” in the work plan. It is due on 31 December 2026. Its status in the work plan is “In progress”.',
      ]],
      ['What Aisha committed to', [
        'In “Sales team, Q3”, Aisha made 5 commitments between 6 April 2026 and 28 September 2026. Of these, 2 were done, 1 was not done, 1 was dropped and 1 was still open when this review started.',
      ]],
      ['What Aisha finished', [
        'On 6 April 2026, in “Sales team, Q3”, Aisha said, “I will call Naivas about the freezers.” It was done on 20 April 2026.',
      ]],
      ['What was dropped along the way', [
        'On 1 June 2026, in “Sales team, Q3”, Aisha committed to open a second butchery account. It was dropped later.',
      ]],
      ['What took longer than first said', [
        'On 4 May 2026, in “Sales team, Q3”, Aisha committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.',
        'On 4 May 2026, in “Sales team, Q3”, Aisha committed to visit Quickmart on Ngong Road. Aisha said it again in 2 later check-ins. It was done on 1 June 2026.',
      ]],
      ['What Aisha said was holding the work up', [
        'On 6 April 2026, in “Sales team, Q3”, Aisha said the work was waiting on Operations for the freezers for the first customers. It cleared on 27 April 2026.',
      ]],
    ]);
    expect(JSON.stringify(r.record)).not.toMatch(/Supplier review|Kamau|delivery/);
  });

  it('Grace, an admin, and Juma, another lead of Sales, are in neither check-in, so they read only the work plan', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    for (const u of ['u-grace', 'u-juma']) {
      const r: any = await svc.one(as(u), id);
      expect(says(r)).toEqual([['What Aisha worked on', ['Aisha owns “Supermarket accounts in Nairobi” in the work plan. It is due on 31 December 2026. Its status in the work plan is “In progress”.']]]);
      expect(JSON.stringify(r.record)).not.toMatch(/Sales team|Supplier review|Naivas|Carrefour|freezer/);
    }
  });

  it('Miriam, a colleague in the same check-in, and Kamau, a lead of another team, are refused the review', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    await expect(svc.one(as('u-miriam'), id)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.notYours));
    await expect(svc.one(as('u-kamau'), id)).rejects.toThrow(ForbiddenException);
  });

  it('no reader is served a label, a verdict or a rating', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    for (const u of ['u-aisha', 'u-wairimu', 'u-grace', 'u-juma']) expect(JSON.stringify((await svc.one(as(u), id) as any).record)).not.toMatch(LABELS);
  });
});

describe('Aisha corrects a line', () => {
  it('the correction is kept beside the line, the record is not changed, and Wairimu reads it', async () => {
    const { svc, as, reviews } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    const before = JSON.stringify(reviews[0].recordRead);
    const mine: any = await svc.correct(as('u-aisha'), id, 'commitment:c2', ' Carrefour asked us to wait until their new buyer started in June. ');
    expect(JSON.stringify(reviews[0].recordRead)).toBe(before);
    const line = (r: any, key: string) => r.record.parts.flatMap((x: any) => x.lines).find((l: any) => l.key === key);
    expect(line(mine, 'commitment:c2')).toEqual({
      key: 'commitment:c2',
      says: 'On 4 May 2026, in “Sales team, Q3”, you committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.',
      correction: { said: 'You marked this as wrong on 1 October 2026, and said what is true.', whatIsTrue: 'Carrefour asked us to wait until their new buyer started in June.' },
    });
    expect(line(await svc.one(as('u-wairimu'), id), 'commitment:c2').correction).toEqual({
      said: 'Aisha marked this as wrong on 1 October 2026, and said what is true.', whatIsTrue: 'Carrefour asked us to wait until their new buyer started in June.',
    });
  });

  it('a correction of a line from a check-in Wairimu is not in stays with Aisha', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    await svc.correct(as('u-aisha'), id, 'blocker:w2', 'Kamau sent the dates the next day. I forgot to say so.');
    expect(JSON.stringify(await svc.one(as('u-wairimu'), id))).not.toMatch(/sent the dates/);
    expect(JSON.stringify(await svc.one(as('u-grace'), id))).not.toMatch(/sent the dates/);
  });

  it('only Aisha corrects, only a line in her review, and only with something said', async () => {
    const { svc, as } = setup();
    const { id } = await svc.start(as('u-wairimu'), 'd-aisha');
    await expect(svc.correct(as('u-wairimu'), id, 'commitment:c2', 'x')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyThePersonCorrects));
    await expect(svc.correct(as('u-grace'), id, 'commitment:c2', 'x')).rejects.toThrow(ForbiddenException);
    await expect(svc.correct(as('u-aisha'), id, 'commitment:c7', 'x')).rejects.toThrow(new NotFoundException(REVIEW_REFUSED.noSuchLine));
    await expect(svc.correct(as('u-aisha'), id, 'commitment:c2', '   ')).rejects.toThrow(new BadRequestException(REVIEW_REFUSED.sayWhatIsTrue));
  });
});

describe('lines read from the local test database, as a person reads them', () => {
  const you = { isThePerson: true, userId: 'u-x', personFirst: 'Bola' };
  it('a big target is written with commas, and a goal’s own full stop is not put inside the sentence', () => {
    expect(aRecordLineSaid({ key: 'goal:o', kind: 'goal', groundId: 'g', label: 'Credit sales against this quarter target', name: 'Disburse N36 million', count: 0, target: 36000000, at: '2026-09-30', dueOn: null }, you))
      .toBe('You own the goal “Disburse N36 million” in “Credit sales against this quarter target”. On 30 September 2026, it stood at 0, against a target of 36,000,000.');
  });
  it('commitments that all stood the same way are said once', () => {
    expect(aRecordLineSaid({ key: 'commitments:g', kind: 'commitments', groundId: 'g', label: 'Credit sales', first: '2026-09-29', last: '2026-09-30', made: 11, done: 0, notDone: 0, dropped: 0, open: 11, delayed: 0 }, you))
      .toBe('In “Credit sales”, you made 11 commitments between 29 September 2026 and 30 September 2026. All of them were still open when this review started.');
  });
  it('the person waited on is not named twice', () => {
    expect(aRecordLineSaid({ key: 'blocker:w', kind: 'blocker', groundId: 'g', label: 'Engagement Director, first 90 days', what: 'a meeting with Amina', onUserId: 'u-amina', onFirst: 'Amina', onLabel: null, saidOn: '2026-10-01', clearedOn: null }, you))
      .toBe('On 1 October 2026, in “Engagement Director, first 90 days”, you said you were waiting for a meeting with Amina. It was still open when this review started.');
  });
  it('a promise that means nothing out of its check-in is left out', () => {
    expect(saysNothingOnItsOwn('I will do that.')).toBe(true);
    expect(saysNothingOnItsOwn('I will ask Amina to clarify my role.')).toBe(false);
  });
});
