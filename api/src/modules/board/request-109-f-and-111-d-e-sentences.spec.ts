import { aCommitmentSaid, patternsOverTime } from '../reports/what-the-record-shows-over-time';
import { theStoryHasSomeoneToPointTo } from '../reports/the-picture-in-plain-sentences';
import { BECAUSE_YOURS_WOULD_BE_AN_ANSWER } from './a-board-is-not-read-before-you-answer';
import { theWorkPlan } from './the-switchboards-own-sections';

/**
 * SCREENS REQUESTS 109 (f, g) AND 111 (d, e): SENTENCES THE SALES BOARD SERVED, 2 OCTOBER 2026, FIXED WHERE
 * THEY ARE MADE. Each case is the served sentence and what each reader now reads.
 */
describe('the time a person gave is said once', () => {
  const amanis = (who: string) => aCommitmentSaid({
    who, what: 'I will deliver the Tuskys cookers on 9 October.', when: 'on 9 October', statedInSession: 1, restatedIn: [],
    status: 'UNKNOWN', theySaidIt: true, settledBy: null, fromAPaste: false, leadLabel: 'Rukia Otieno',
    saidWordForWord: true, whenSaidWordForWord: true,
  } as any, 1);

  it('Amani reads her own promise with its day once', () => {
    expect(amanis('You')).toBe('In check-in 1, you said, "I will deliver the Tuskys cookers on 9 October." Nobody has said yet whether it happened.');
  });
  it('Rukia, who runs it, reads the same, with Amani\'s name', () => {
    expect(amanis('Amani Wekesa')).toBe('In check-in 1, Amani Wekesa said, "I will deliver the Tuskys cookers on 9 October." Nobody has said yet whether it happened.');
  });
  it('a time the words do not hold is still said', () => {
    const s = aCommitmentSaid({ who: 'You', what: 'I will send the price list.', when: 'by Friday', statedInSession: 1, restatedIn: [], status: 'UNKNOWN', theySaidIt: true, settledBy: null, fromAPaste: false, leadLabel: 'Rukia Otieno', saidWordForWord: true, whenSaidWordForWord: true } as any, 1);
    expect(s).toContain('The time you gave for it was "by Friday".');
  });
});

describe('the work plan counts the sessions the report counts (111 d)', () => {
  it('a session opened early is not a session gone by: "open for 1 session", on the board as in the report', () => {
    const rows = theWorkPlan(
      [{ id: 'k1', participantId: 'p-amani', text: 'I will visit Naivas Karen.', whenSaid: null, statedInSession: 1, saidAgainIn: [], status: 'UNKNOWN', explicit: true, settledBy: null, source: 'CHECK_IN', saidWordForWord: true, whenSaidWordForWord: false } as any],
      [
        { participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-23' },
        { participantId: 'p-amani', sessionNumber: 2, status: 'COMPLETED', completedAt: '2026-09-30' },
        { participantId: 'p-amani', sessionNumber: 3, status: 'NOT_STARTED', completedAt: null },
      ],
      { personMayBeRead: () => true, commitmentMayBeRead: () => true, nameOf: () => 'Amani Wekesa', meId: null, theLeadsId: null } as any,
    );
    expect(rows[0].says).toContain('It has been open for 1 check-in, and nobody has said whether it happened.');
  });
});

describe('the board\'s headline has no colon (109 f)', () => {
  it('"They disagree on one thing: there is no shared understanding ..." is two sentences', () => {
    expect(theStoryHasSomeoneToPointTo('They disagree on one thing: there is no shared understanding of who owns the release.'))
      .toBe('People disagree on one thing. There is no shared understanding of who owns the release.');
  });
});

describe('"Seen in 1 sessions." (109 f)', () => {
  it('one session is one session', () => {
    const [p] = patternsOverTime([{ participantId: 'p-a', code: 'D1', observationText: 'Visits reported without names.', seenInSessions: [1], periodsObserved: 1, lastPeriodNumber: 1, status: 'SURFACED' }], () => 'x', () => 'Amani Wekesa', 2);
    expect(JSON.stringify(p)).not.toMatch(/1 check-ins|check-ins 1 /);
    expect(JSON.stringify(p)).toContain('It was seen in check-in 1 of 2');
  });
});

describe('the withheld board has no dash (109 g)', () => {
  it('Amani, before she has checked in', () => {
    expect(BECAUSE_YOURS_WOULD_BE_AN_ANSWER).toBe('Check in first, then you’ll see the board.');
    expect(BECAUSE_YOURS_WOULD_BE_AN_ANSWER).not.toMatch(/ - /);
  });
});

