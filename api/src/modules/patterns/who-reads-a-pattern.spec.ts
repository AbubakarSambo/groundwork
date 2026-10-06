import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from './pattern-library';
import { servedPatterns, whatHappenedIn, periodsSeen, thePersonHasHadTheirTurn, theOnesTheyAreSeeingFirst, whoIsWhoIn, patternRowAsOfSession, runsItForAPattern, type APatternRow } from './who-reads-a-pattern';

/**
 * THE RULES FOR SERVING A PATTERN, READ AS EACH READER. See who-reads-a-pattern.
 *
 * The rows are the ones the capability check found on the live Atlas board, 27 September 2026:
 * Ngozi's B11 and Femi's B3 after three sessions, Femi's R3 after one, and Ngozi's E1 seen once.
 */

const NOW = new Date('2026-09-28T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const on = { on: true, now: NOW, leadName: 'Tunde', firstNameOf: (pid: string) => ({ 'p-ngozi': 'Ngozi', 'p-femi': 'Femi' } as Record<string, string>)[pid] ?? null };
const EVERY_INTERNAL_NAME = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES].map((c) => c.name);

const ROWS: APatternRow[] = [
  { id: 'pd1', participantId: 'p-ngozi', code: 'B11', observationText: 'The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files.', seenInSessions: [1, 2, 4], periodsObserved: 1, readyAt: daysAgo(2), shownToPersonAt: daysAgo(1), personAnswer: 'The committee only meets on the last Friday of the month.', personAnsweredAt: daysAgo(1) },
  { id: 'pd2', participantId: 'p-femi', code: 'B3', observationText: 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.', seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: daysAgo(5), shownToPersonAt: daysAgo(4), evidenceSource: 'both' },
  { id: 'pd3', participantId: 'p-femi', code: 'R3', observationText: 'Femi credited Ngozi by name for the pricing sheet.', seenInSessions: [2], periodsObserved: 1 },
  { id: 'pd4', participantId: 'p-ngozi', code: 'E1', observationText: 'Named the new analyst as the reason the forecast was late.', seenInSessions: [2], periodsObserved: 1 },
  { id: 'pd5', participantId: 'p-ngozi', code: 'E4', observationText: 'Absorbs operational load relative to the other founder.', seenInSessions: [1, 2, 3], periodsObserved: 3 },
  { id: 'pd6', participantId: 'p-ngozi', code: 'k5', observationText: 'Invented by the model.', seenInSessions: [1, 2, 3], periodsObserved: 3 },
];

const LEAD = { participantId: 'p-lead', runsIt: true };
const NGOZI = { participantId: 'p-ngozi', runsIt: false };
const FEMI = { participantId: 'p-femi', runsIt: false };
const ADMIN = { participantId: null, runsIt: true };
const STRANGER = { participantId: null, runsIt: false };

describe('who reads a pattern', () => {
  it('nobody reads one while the switch is off, whoever they are', () => {
    /* PATTERNS_ARE_SERVED is true since decision 52, so `on: false` here stands in for the switch
       being off, the same way the rest of this file passes `on` to stand in for it being on. */
    for (const r of [LEAD, NGOZI, FEMI, ADMIN, STRANGER]) expect(servedPatterns(ROWS, r, { on: false })).toEqual([]);
  });

  it('a participant reads their own and never a colleague’s', () => {
    expect(servedPatterns(ROWS, NGOZI, on).map((p) => p.id)).toEqual(['pd1']);
    expect(servedPatterns(ROWS, FEMI, on).map((p) => p.id)).toEqual(['pd2']);
    expect(servedPatterns(ROWS, STRANGER, on)).toEqual([]);
  });

  it('only after three periods, counted with gaps and never from the detector’s status', () => {
    expect(periodsSeen({ seenInSessions: [1, 2, 4], periodsObserved: 1 })).toBe(3);
    /* R3 is SURFACED after one period in the detector. It is not shown after one. */
    expect(servedPatterns(ROWS, LEAD, on).map((p) => p.id).sort()).toEqual(['pd1', 'pd2']);
  });

  it('never E4, F5 or a code the library does not know', () => {
    const ids = servedPatterns(ROWS, ADMIN, on).map((p) => p.id);
    expect(ids).not.toContain('pd5');
    expect(ids).not.toContain('pd6');
  });

  it('in plain words, with no label, code or name joined to it', () => {
    const [mine] = servedPatterns(ROWS, NGOZI, on);
    expect(mine).toEqual({
      id: 'pd1',
      participantId: 'p-ngozi',
      yours: true,
      kind: 'attention',
      heading: 'Problems are mostly put down to things outside the team',
      whatHappened: 'The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files.',
      sessions: [1, 2, 4],
      howOften: 'This came up in 3 of your check-ins, in sessions 1, 2 and 4.',
      askThem: null,
      theirWords: 'The committee only meets on the last Friday of the month.',
      canAnswer: true,
      whoSeesIt: 'Tunde can see this too, with anything you say about it. Nothing is decided from it.',
      /* Decision 57, item 2: never shown to the person it is about, however the lead marked it. */
      leadMark: null,
      talkedAbout: false,
      /* Decision 57, item 4: never shown to the person it is about, only whoever runs the check-in. */
      secondReadNote: null,
      /* Decision 67: the section it belongs in is the same for every reader; the coaching is the lead's alone. */
      about: 'the work',
      coachTowards: null,
      oneStep: null,
    });
    const served = JSON.stringify(servedPatterns(ROWS, LEAD, on));
    for (const name of EVERY_INTERNAL_NAME) expect(served).not.toContain(name);
    expect(served).not.toMatch(/"(?:code|label|who|name)"|"B11"|"B3"/);
    expect(servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd1')?.askThem).toBe('What was within your control in this situation?');
    expect(servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd2')?.howOften).toBe('This came up in 3 check-ins, in sessions 1, 2 and 3.');
  });

  it('the engine’s sentence is dropped whole when it holds an internal name or a code', () => {
    expect(whatHappenedIn('This is Blame Shifting again.')).toBeNull();
    expect(whatHappenedIn('A B11 signal was seen.')).toBeNull();
    expect(whatHappenedIn('[period=2] The record shows that the quote went out late')).toBe('The quote went out late.');
    expect(whatHappenedIn('   ')).toBeNull();
  });
});

describe('the person sees it first, and can answer, before the lead reads it', () => {
  const row = (o: Partial<APatternRow>): APatternRow => ({
    id: 'x', participantId: 'p-femi', code: 'D1', observationText: 'The Harbor Foods integration was called done and the ops team reopened it.',
    seenInSessions: [1, 2, 3], periodsObserved: 3, ...o,
  });

  it('the person reads it the moment it has three periods, and is told they are seeing it first', () => {
    const fresh = row({ readyAt: daysAgo(0) });
    const [mine] = servedPatterns([fresh], FEMI, on);
    expect(mine.canAnswer).toBe(true);
    expect(mine.whoSeesIt).toBe('You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it.');
    expect(theOnesTheyAreSeeingFirst([fresh], [mine])).toEqual(['x']);
  });

  it('the lead does not read it before the person has been shown it, answered it, or a week has passed', () => {
    expect(servedPatterns([row({ readyAt: daysAgo(6) })], LEAD, on)).toEqual([]);
    expect(servedPatterns([row({ readyAt: daysAgo(6), shownToPersonAt: daysAgo(2) })], LEAD, on)).toEqual([]);
    /* No timestamps at all is never served to the lead: fail closed. */
    expect(servedPatterns([row({})], LEAD, on)).toEqual([]);
    expect(servedPatterns([row({})], ADMIN, on)).toEqual([]);
  });

  it('the lead reads it at once when the person has answered, with their words beside it', () => {
    const [read] = servedPatterns([row({ readyAt: daysAgo(0), shownToPersonAt: daysAgo(0), personAnswer: 'Ops asked for a change after sign-off.', personAnsweredAt: daysAgo(0) })], LEAD, on);
    expect(read.theirWords).toBe('Ops asked for a change after sign-off.');
    expect(read.canAnswer).toBe(false);
    expect(read.whoSeesIt).toBe('Femi saw this first and said what is behind it.');
  });

  it('three days after the person saw it without answering, the lead reads it and is told so', () => {
    const [read] = servedPatterns([row({ readyAt: daysAgo(3), shownToPersonAt: daysAgo(3) })], LEAD, on);
    /* Hafsah, 28 September 2026: it says plainly that the person has not answered yet. */
    expect(read.whoSeesIt).toBe('Femi saw this first and has not answered yet.');
    expect(read.theirWords).toBeNull();
  });

  it('a week after it was ready, the lead reads it even if the person never opened it', () => {
    const [read] = servedPatterns([row({ readyAt: daysAgo(7) })], LEAD, on);
    expect(read.whoSeesIt).toBe('Femi has not seen this yet, and has not answered yet. It is shown to you because a week has passed since it came up for the third time.');
    expect(thePersonHasHadTheirTurn(row({ readyAt: daysAgo(7) }), NOW)).toBe(true);
  });

  it('a colleague never reads it, answered or not', () => {
    expect(servedPatterns([row({ readyAt: daysAgo(30), personAnswer: 'x', personAnsweredAt: daysAgo(20) })], NGOZI, on)).toEqual([]);
  });

  it('the names come from the check-in’s own rows, first names only', () => {
    const who = whoIsWhoIn([
      { id: 'p-lead', userId: 'u-tunde', user: { firstName: 'Tunde' } },
      { id: 'p-femi', userId: 'u-femi', user: { firstName: 'Femi' } },
      { id: 'p-guest', userId: null, nameGiven: 'Amaka Obi' },
    ], 'u-tunde');
    expect(who.leadName).toBe('Tunde');
    expect(who.leadParticipantId).toBe('p-lead');
    expect(who.firstNameOf!('p-femi')).toBe('Femi');
    expect(who.firstNameOf!('p-guest')).toBe('Amaka');
  });

  it('a title is never used as a first name in who sees it', () => {
    /* Hafsah, 29 September 2026, from a live capture: "Dr will see it too" - the lead's own first
       name field held "Dr", with the rest of her name in the last name field. */
    const who = whoIsWhoIn([
      { id: 'p-lead', userId: 'u-amina', user: { firstName: 'Dr', lastName: 'Amina Bello' } },
      { id: 'p-guest', userId: null, nameGiven: 'Madam Okoye' },
    ], 'u-amina');
    expect(who.leadName).toBe('Amina');
    /* "Madam Okoye" has no first name to drop the title for, so it is left as people say it. */
    expect(who.firstNameOf!('p-guest')).toBe('Madam Okoye');
  });

  it('a lead reading a pattern about their own work is never told they will see it too', () => {
    /* Hafsah, 29 September 2026, from a live capture: whoSeesIt was telling the lead "Tunde will
       see it too" about a pattern that is Tunde's own, because leadName is always the lead's name,
       whoever is reading. It must say who else really reads it instead. */
    const leadOnFirst = row({ participantId: 'p-lead', readyAt: daysAgo(0) });
    const [mine] = servedPatterns([leadOnFirst], { participantId: 'p-lead', runsIt: true }, { ...on, leadParticipantId: 'p-lead' });
    expect(mine.whoSeesIt).toBe('Only you see this. Nothing is decided from it.');
    expect(mine.whoSeesIt).not.toContain('Tunde');
  });
});

describe('a session report shows only what had reached three periods by that session', () => {
  /* Reached its third period at session 3. A report for session 1 must not know that yet. */
  const row: APatternRow = {
    id: 'x', participantId: 'p-femi', code: 'B11', observationText: 'Blockages are attributed to customers being slow.',
    seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: new Date('2026-09-03'), shownToPersonAt: null,
  };

  it('leaves it off session 1 and session 2, where it had not reached three periods yet', () => {
    expect(servedPatterns([patternRowAsOfSession(row, 1)], FEMI, on)).toEqual([]);
    expect(servedPatterns([patternRowAsOfSession(row, 2)], FEMI, on)).toEqual([]);
  });

  it('shows it from session 3 on, where it had', () => {
    expect(servedPatterns([patternRowAsOfSession(row, 3)], FEMI, on)).toHaveLength(1);
    expect(servedPatterns([patternRowAsOfSession(row, 30)], FEMI, on)).toHaveLength(1);
  });

  it('never counts a session after the one the report is for', () => {
    const asOf1 = patternRowAsOfSession(row, 1);
    expect(asOf1.seenInSessions).toEqual([1]);
    expect(asOf1.periodsObserved).toBe(1);
    /* The id and everything else about the row is unchanged - only what "as of" trims. */
    expect(asOf1.id).toBe('x');
    expect(asOf1.observationText).toBe(row.observationText);
  });
});

describe('the second-read note (decision 57, item 4): only whoever runs the check-in, and only when both agree', () => {
  it('is told to the lead when the model and the rule both backed the pattern', () => {
    const lead = servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd2');
    expect(lead?.secondReadNote).toBe('Two separate reads of the record found this.');
  });

  it('is never told to the person it is about, whatever backed it', () => {
    const femi = servedPatterns(ROWS, FEMI, on).find((p) => p.id === 'pd2');
    expect(femi?.secondReadNote).toBeNull();
  });

  it('says nothing when only the model backed it, or nobody said', () => {
    const lead = servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd1');
    expect(lead?.secondReadNote).toBeNull();
  });
});

describe('runsItForAPattern (decision 58, screens request 84): only the lead, or the admin who set it up', () => {
  const CHECK_IN = { initiatorId: 'u-lead', createdByUserId: 'u-setup-admin' };

  it('is true for the check-in’s own lead', () => {
    expect(runsItForAPattern(CHECK_IN, 'u-lead')).toBe(true);
  });

  it('is true for the admin who set this particular check-in up for its lead', () => {
    expect(runsItForAPattern(CHECK_IN, 'u-setup-admin')).toBe(true);
  });

  it('is false for any other admin of the organisation, even though the wider runsIt class lets them in elsewhere', () => {
    expect(runsItForAPattern(CHECK_IN, 'u-other-admin')).toBe(false);
  });

  it('is false for the person it is about, a colleague, a guest, or nobody signed in', () => {
    expect(runsItForAPattern(CHECK_IN, 'u-ngozi')).toBe(false);
    expect(runsItForAPattern(CHECK_IN, undefined)).toBe(false);
    expect(runsItForAPattern(CHECK_IN, null)).toBe(false);
  });

  it('is false when nobody set the check-in up (createdByUserId null), for anyone but the lead', () => {
    expect(runsItForAPattern({ initiatorId: 'u-lead', createdByUserId: null }, 'u-other-admin')).toBe(false);
    expect(runsItForAPattern({ initiatorId: 'u-lead', createdByUserId: null }, 'u-lead')).toBe(true);
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. There is no person-only reach any more. Every block above
 * runs under the one reach the code has, with nothing put in force by the test, so the lead reads a
 * pattern after the person has had their turn by default. This block was "with the person-only reach";
 * it now pins that the restriction is gone, and that the person still sees it first.
 */
describe('the lead reads a pattern after the person, with no setting to hold the lead back (decision 86)', () => {
  const mod = require('./who-reads-a-pattern');
  const { patternRowsThisReaderMayRead, readsHowTheLeadingIsLanding } = mod;

  it('there is no setting left: no default reach, no stored key, nothing that reads or sets one', () => {
    for (const gone of ['DEFAULT_PATTERN_REACH', 'PATTERN_REACH_KEY', 'patternReachFrom', 'patternReachInForce', 'setPatternReachInForce', 'readPatternReach']) {
      expect(mod[gone]).toBeUndefined();
    }
  });

  it('each person reads their own; the lead and the admin who set it up read both after each person’s turn; a stranger reads none', () => {
    expect(servedPatterns(ROWS, NGOZI, on).map((p) => p.id)).toEqual(['pd1']);
    expect(servedPatterns(ROWS, FEMI, on).map((p) => p.id)).toEqual(['pd2']);
    for (const r of [LEAD, ADMIN]) {
      expect(servedPatterns(ROWS, r, on).map((p) => p.id).sort()).toEqual(['pd1', 'pd2']);
      expect(patternRowsThisReaderMayRead(ROWS, r, on).map((p: APatternRow) => p.id).sort()).toEqual(['pd1', 'pd2']);
    }
    expect(servedPatterns(ROWS, STRANGER, on)).toEqual([]);
  });

  it('the lead reads Ngozi’s with her answer, and is told she saw it first', () => {
    const ngozis = servedPatterns(ROWS, LEAD, on).find((p) => p.id === 'pd1')!;
    expect(ngozis.whoSeesIt).toBe('Ngozi saw this first and said what is behind it.');
    expect(ngozis.theirWords).toBe('The committee only meets on the last Friday of the month.');
  });

  it('the person is told that Tunde will see it too, never that only they see it, and can still answer it', () => {
    const [mine] = servedPatterns(ROWS, FEMI, on);
    expect(mine.whoSeesIt).toBe('Tunde can see this too, with anything you say about it. Nothing is decided from it.');
    expect(mine.whoSeesIt).not.toContain('Only you see this');
    expect(mine.canAnswer).toBe(true);
    expect(mine.secondReadNote).toBeNull();
    expect(mine.coachTowards).toBeNull();
  });

  it('still not before the person’s turn: a pattern shown yesterday and not answered stays with the person', () => {
    const fresh: APatternRow = { id: 'pd8', participantId: 'p-femi', code: 'B3', observationText: null, seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: daysAgo(1), shownToPersonAt: daysAgo(1) };
    expect(servedPatterns([fresh], LEAD, on)).toEqual([]);
    expect(servedPatterns([fresh], FEMI, on).map((p) => p.id)).toEqual(['pd8']);
  });

  it('"how the leading is landing" reaches the lead and the admin who set the check-in up, never a colleague', () => {
    const checkIn = { initiatorId: 'u-tunde', createdByUserId: 'u-setup-admin' };
    expect(readsHowTheLeadingIsLanding(checkIn, 'u-tunde')).toBe(true);
    expect(readsHowTheLeadingIsLanding(checkIn, 'u-setup-admin')).toBe(true);
    expect(readsHowTheLeadingIsLanding(checkIn, 'u-ngozi')).toBe(false);
  });
});
