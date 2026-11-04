import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, THE_BOARDS_CLOCK } from './the-switchboards-sections-harness';

/**
 * DECISION 86, ITEM 1: WHAT KEEPS COMING UP IS IN THE LEAD'S "WHAT TO SETTLE FIRST" AGAIN, ON THE PATTERN'S OWN TIMING.
 *
 * Patterns reach the lead again after the person has had their turn (commit 92e2c434): after the person's answer, or
 * three days after they were shown it, or seven days after it was ready. The questions built from them were still kept
 * out of the lead's "what to settle first". They come back, built from what the lead is served, with the person's own
 * answer beside it where there is one, and never with the engine's own sentence about the work. Nobody else reads the
 * lead's list, as before.
 */
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(THE_BOARDS_CLOCK.getTime() - days * DAY);

const row = (id: string, participantId: string, code: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId, code, observationText: 'Engine sentence that only the pattern section words for its reader.',
  seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: ago(1), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null,
  leadMark: null, talkedAboutAt: null, talkedAboutAtPeriod: null, evidenceSource: 'model', ...more,
});

const DOCUMENT_LINE = 'Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.';
const report = {
  ...A_RELEASED_REPORT,
  overTime: { sessions: 3, commitments: [], dependencies: [], patterns: [], gaps: [], stillOpen: [], cannotTellYou: [], toSettleFirst: [DOCUMENT_LINE] },
};
const checkIns = [1, 2, 3].flatMap((n) => [answered('p-rukia', n), answered('p-baraka', n)]);

/* Rukia answered; Baraka was shown his four days ago and has not answered; a third, Rukia's newest, she was shown an hour ago. */
const patterns = [
  row('pd-rukia', 'p-rukia', 'A2', { shownToPersonAt: ago(2), personAnswer: 'Nobody else was on call that week', personAnsweredAt: ago(1) }),
  row('pd-baraka', 'p-baraka', 'B10', { shownToPersonAt: ago(4) }),
  row('pd-rukia-new', 'p-rukia', 'K3', { shownToPersonAt: ago(0.04) }),
];
const setup = { checkIns, report, patterns };

describe('decision 86: what keeps coming up, in the lead\'s "what to settle first", as each reader reads it', () => {
  it('Amina, who runs it, reads no question built from a stored pattern, even after the person\'s turn', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const board = await boardAs(setup as any, ...AMINA);
    expect(board.overTime.toSettleFirst).toEqual([DOCUMENT_LINE]);
    const all = board.overTime.toSettleFirst.join(' ');
    expect(all).not.toMatch(/Steps in to stop things failing|The work stops until there is another call|Nobody else was on call/);
    /* The one Rukia was shown an hour ago is still hers alone, and the engine's own sentence is never in the list. */
    expect(all).not.toMatch(/The same problem is raised again/);
    expect(all).not.toMatch(/Engine sentence/);
  });

  it('a pattern that came up in fewer than three check-ins, or the lead has talked through, is not a question here', async () => {
    const board = await boardAs({ ...setup, patterns: [
      row('pd-early', 'p-rukia', 'A2', { seenInSessions: [2, 3], periodsObserved: 2, personAnswer: 'Yes', personAnsweredAt: ago(1) }),
      row('pd-talked', 'p-baraka', 'B10', { shownToPersonAt: ago(4), talkedAboutAt: ago(1), talkedAboutAtPeriod: 3 }),
    ] } as any, ...AMINA);
    expect(board.overTime.toSettleFirst).toEqual([DOCUMENT_LINE]);
  });

  it.each([['Rukia, who checks in', RUKIA], ['Baraka, who checks in', BARAKA], ['Juma, an admin who only reads', JUMA], ['the admin who set it up', SETUP_ADMIN]])(
    '%s is not served the lead\'s list, as before', async (_w, reader) => {
      const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
      expect(board.overTime ?? null).toBeNull();
      expect(JSON.stringify(board)).not.toMatch(/keeps coming up in .{1,40}’s check-ins/);
    });
});

describe('a strength is never a question to settle', () => {
  it('Joseph\'s strength is not worded as something he has not answered', () => {
    const { patternQuestionsToSettleFirst } = require('./pattern-questions-to-settle-first');
    const served = [{ id: 'x', participantId: 'p-joseph', yours: false, kind: 'good', heading: 'Keeps promises and shows the proof', whatHappened: null, sessions: [1, 2, 3], howOften: 'It came up in 3 check-ins.', askThem: null, theirWords: null, canAnswer: false, talkedAbout: false }];
    expect(patternQuestionsToSettleFirst(served, () => 'Joseph')).toEqual([]);
  });
});
