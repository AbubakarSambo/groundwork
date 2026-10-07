import { PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, JUMA, type Setup } from './the-switchboards-sections-harness';
import { theEndOfMonthRead, theMonthIsOver, herFirstWords, herOwnWords, THE_CONTINUE_OPTIONS } from './the-anchor-end-of-month';
import { THE_SHAPES_KEYS } from '../entry/the-anchor-served-shapes';

/**
 * Request 149: the end-of-month read, served on the board to the lead of a check-in started from the anchor link, with
 * the switch on, once the month has run (twenty-eight days of the record's own clock) or the check-in has ended.
 */
const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false };
const PEOPLE = [
  lead,
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
  person('p-zawadi', 'u-zawadi', 'Zawadi', 'Njeri'),
  person('p-ibrahim', 'u-ibrahim', 'Ibrahim', 'Said'),
];
const OPENED = new Date('2026-09-08T08:00:00Z');
const HER_WORDS = 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.';

function anchor(opts: { on?: boolean; startedFrom?: string | null; completedOn?: string; status?: string; words?: string | null } = {}): Setup {
  const { on = true, startedFrom = 'anchor', completedOn = '2026-10-07T10:00:00Z', status, words = HER_WORDS } = opts;
  const checkIns = [
    ...['p-amina', 'p-rukia', 'p-baraka'].map((id) => ({ ...answered(id, 1, completedOn), availableFrom: OPENED })),
    ...['p-zawadi', 'p-ibrahim'].map((id) => ({ id: `c1-${id}`, participantId: id, sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: OPENED })),
  ];
  const commitments = [
    commitment('k1', 'p-rukia', 'I will send the deck to the client.', { status: 'DONE', settledAt: new Date(completedOn) }),
    commitment('k2', 'p-baraka', 'I will call the supplier.'),
  ];
  const dependencies = [
    handoff('d1', 'p-baraka', 'the sales deck', { onParticipantId: 'p-rukia', status: 'WAITING' }),
    handoff('d2', 'p-zawadi', 'the price list', { onParticipantId: 'p-rukia', status: 'CLEARED' }),
  ];
  return {
    people: PEOPLE, checkIns, commitments, dependencies, groundRow: { startedFrom, startsAt: OPENED, ...(status ? { status } : {}) },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
      groundDependency: { findMany: jest.fn(async () => dependencies) },
      recommendation: { findMany: jest.fn(async () => []) },
      conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' && a?.where?.checkIn?.groundId && words ? [{ content: words }] : [])) },
      groundParticipant: {
        findMany: jest.fn(async (a: any) => {
          if (a?.where?.id?.in) return PEOPLE.filter((p) => a.where.id.in.includes(p.id)).map((p) => ({ id: p.id, lastNudgedAt: null }));
          return PEOPLE.map((p) => ({ ...p, checkIns: checkIns.filter((c) => c.participantId === p.id && c.status === 'COMPLETED').map((c) => ({ status: c.status })) }));
        }),
        findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})),
      },
    },
  };
}

describe('the end of the month, as the lead reads it', () => {
  it('begins with her own words and holds the eight parts, the counts and the four options', async () => {
    const e = (await boardAs(anchor(), ...AMINA)).theEndOfMonthRead;
    expect(Object.keys(e).sort()).toEqual([...THE_SHAPES_KEYS.endOfMonth].sort());
    expect(e.yourOwnWords).toBe(HER_WORDS);
    expect(e.whatWeFound).toEqual(['Groundwork heard from three of five people over the month.']);
    expect(e.whatTheyNowUnderstandDifferently).toEqual(['Groundwork does not yet keep how each person saw things at the start, so it cannot say what changed in what they understand.']);
    expect(e.whatTheyAreDoingDifferently).toEqual([
      'Two people said what they would do themselves.',
      'One of the things people said they would do was done.',
      'One handoff that was waiting on someone was cleared.',
    ]);
    expect(e.whatYourTeamContributed).toEqual(['No idea from your team has been captured yet.']);
    /* Changed with piece 32: the same people and sentences as the month board's (piece 22). */
    expect(e.peopleWhoHelpedMoveTheThinking).toEqual([{ name: 'Rukia', sentence: 'Rukia committed to send the deck to the client, and Rukia says it is done.' }]);
    expect(e.whatYouChangedAsALead).toEqual(['Groundwork does not yet keep what changed in how you lead, so it has nothing to say here.']);
    expect(e.whatIsStillStuck).toEqual(['Baraka is waiting on Rukia for the sales deck.']);
    expect(e.whatShouldHappenNext).toEqual(['One of the things people said they would do is still open.']);
    expect(e.reveal).toEqual({ projectsThatCouldHaveTheirOwnGround: 0, sharedObjectivesWorthTracking: 0, workingRelationshipsNeedingAlignment: 0, activeCommitments: 1, teamGeneratedIdeas: 0, suitesRelevantToWorkAlreadyBeingDone: 0 });
    expect(e.continueOptions).toEqual([
      { key: 'keepThisGroundRunning', label: 'Keep this check-in running' },
      { key: 'startRecommendedGrounds', label: 'Start the recommended check-ins' },
            { key: 'continueGroundworkForTheTeam', label: 'Continue Groundwork for the team' },
    ]);
  });

  it('is built once from the record: two reads give the same bytes, and it is not served before the month has run', async () => {
    const a = (await boardAs(anchor(), ...AMINA)).theEndOfMonthRead;
    expect((await boardAs(anchor(), ...AMINA)).theEndOfMonthRead).toEqual(a);
    expect('theEndOfMonthRead' in (await boardAs(anchor({ completedOn: '2026-09-15T10:00:00Z' }), ...AMINA))).toBe(false);
  });

  it('is served early when the check-in has ended', async () => {
    expect((await boardAs(anchor({ completedOn: '2026-09-15T10:00:00Z', status: 'RESOLVED' }), ...AMINA)).theEndOfMonthRead.yourOwnWords).toBe(HER_WORDS);
  });

  it('is the lead\'s alone: a participant and an admin are served none', async () => {
    expect('theEndOfMonthRead' in (await boardAs(anchor(), ...RUKIA))).toBe(false);
    expect('theEndOfMonthRead' in (await boardAs(anchor(), ...JUMA))).toBe(false);
  });

  it('serves nothing with the switch off, not started from the anchor, or with no words of hers to begin with', async () => {
    expect('theEndOfMonthRead' in (await boardAs(anchor({ on: false }), ...AMINA))).toBe(false);
    expect('theEndOfMonthRead' in (await boardAs(anchor({ startedFrom: null }), ...AMINA))).toBe(false);
    expect('theEndOfMonthRead' in (await boardAs(anchor({ words: null }), ...AMINA))).toBe(false);
  });
});

describe('the pieces', () => {
  it('knows the month is over at twenty-eight days or when it has ended', () => {
    const start = new Date('2026-09-01T00:00:00Z');
    expect(theMonthIsOver(start, new Date('2026-09-28T23:00:00Z'), false)).toBe(false);
    expect(theMonthIsOver(start, new Date('2026-09-29T00:00:00Z'), false)).toBe(true);
    expect(theMonthIsOver(start, null, true)).toBe(true);
  });
  it('keeps her words, and cuts a long first message at a sentence end', () => {
    expect(herFirstWords('  one   two ')).toBe('one two');
    expect(herFirstWords('A short sentence. ' + 'word '.repeat(100))).toBe('A short sentence.');
    expect(herFirstWords(null)).toBeNull();
  });
  it('says plainly when nobody answered, and holds exactly four options', () => {
    const e = theEndOfMonthRead({ herWords: 'x', record: { ofHowMany: 3, checkedIn: 0, notYetThisRound: 3, saidWhatTheyWillDo: 0, commitmentsDone: 0, commitmentsOpen: 0, waiting: [], handoffsCleared: 0, offers: { pair: 1, project: 0, aim: 0 }, startedOn: null }, differences: [], patterns: [] });
    expect(e.whatWeFound).toEqual(['Groundwork did not hear from anyone over the month.']);
    expect(e.whatTheyAreDoingDifferently).toEqual(['Nothing has been recorded yet that people are doing differently.']);
    expect(e.whatShouldHappenNext).toEqual(['Groundwork found one piece of work that could have a check-in of its own.']);
    expect(THE_CONTINUE_OPTIONS).toHaveLength(4);
  });
});

describe('her own words, where she said them first', () => {
  const stub = (turns: string[], entries: string[], brief: string | null) => ({
    conversationTurn: { findMany: jest.fn(async () => turns.map((content) => ({ content }))) },
    recordEntry: { findMany: jest.fn(async (q: any) => (q.where.disputedAt === null && q.where.participant.userId === 'u-amina' ? entries.map((text) => ({ text })) : [])) },
    ground: { findUnique: jest.fn(async () => ({ brief })) },
  });

  it('reads her first line on the record when she typed nothing in a turn and the brief is empty', async () => {
    expect(await herOwnWords(stub([], [HER_WORDS], null), 'g-1', 'u-amina')).toBe(HER_WORDS);
  });

  it('still reads her first typed words before the record, and the brief only when neither has anything', async () => {
    expect(await herOwnWords(stub(['I want the team to stop waiting on each other.'], [HER_WORDS], 'The brief.'), 'g-1', 'u-amina')).toBe('I want the team to stop waiting on each other.');
    expect(await herOwnWords(stub([], [], 'The brief.'), 'g-1', 'u-amina')).toBe('The brief.');
    expect(await herOwnWords(stub([], [], null), 'g-1', 'u-amina')).toBeNull();
  });
});

describe('the end of the month reads in plain sentences, and an ended check-in does not say it is still week four (6 October)', () => {
  const everyString = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(everyString) : v && typeof v === 'object' ? Object.values(v).flatMap(everyString) : []);

  it('says what it found under "This started as one check-in.", with no "Ground" and no bare "0"', async () => {
    const e = (await boardAs(anchor(), ...AMINA)).theEndOfMonthRead;
    expect(e.revealSaid.heading).toBe('This started as one check-in.');
    expect(e.revealSaid.intro).toBe('During the month, Groundwork also found this.');
    expect(e.revealSaid.closing).toBe('Your team has already started building its Groundwork.');
    expect(e.revealSaid.lines).toEqual([
      'Groundwork did not find a project that could have a check-in of its own.',
      'Groundwork did not find a shared objective worth tracking.',
      'Groundwork did not find a working relationship that needs aligning.',
      'One thing somebody said they would do is still open.',
      'No idea from your team was captured.',
    ]);
    const read = everyString(e);
    expect(read.filter((s) => /\bGrounds?\b/.test(s))).toEqual([]);
    expect(read.filter((s) => /(^|\s)0(\s|\.|$)/.test(s))).toEqual([]);
  });

  it('says counts of more than nothing as sentences, in words up to ten', async () => {
    const { theRevealSaid } = await import('./the-anchor-reveal-said');
    const said = theRevealSaid({ projectsThatCouldHaveTheirOwnGround: 3, sharedObjectivesWorthTracking: 2, workingRelationshipsNeedingAlignment: 4, activeCommitments: 17, teamGeneratedIdeas: 7, suitesRelevantToWorkAlreadyBeingDone: 1 });
    expect(said.lines).toEqual([
      'Groundwork found three projects that could have a check-in of their own.',
      'Groundwork found two shared objectives worth tracking.',
      'Groundwork found four working relationships that need aligning.',
      '17 things people said they would do are still open.',
      'Seven ideas from your team were captured.',
    ]);
    const one = theRevealSaid({ projectsThatCouldHaveTheirOwnGround: 1, sharedObjectivesWorthTracking: 1, workingRelationshipsNeedingAlignment: 1, activeCommitments: 1, teamGeneratedIdeas: 1, suitesRelevantToWorkAlreadyBeingDone: 0 });
    expect(one.lines.slice(0, 5)).toEqual([
      'Groundwork found one project that could have a check-in of its own.',
      'Groundwork found one shared objective worth tracking.',
      'Groundwork found one working relationship that needs aligning.',
      'One thing somebody said they would do is still open.',
      'One idea from your team was captured.',
    ]);
  });

  it('names the four ways on without the word "Ground"', async () => {
    const e = (await boardAs(anchor(), ...AMINA)).theEndOfMonthRead;
    expect(e.continueOptions.map((o: any) => o.label)).toEqual(['Keep this check-in running', 'Start the recommended check-ins', 'Continue Groundwork for the team']);
  });

  it('while the check-in is still running, the board says which week of the month it is', async () => {
    const b = (await boardAs(anchor(), ...AMINA)).theMonthBoard;
    expect(b.weekSaid).toBe('Week 4 of the month');
    expect(b.whatGroundworkIsWorkingOnNext.join(' ')).toContain('Groundwork is checking in with');
  });

  it('once the check-in has ended, the board says it has ended and nobody is being chased', async () => {
    const b = (await boardAs(anchor({ status: 'RESOLVED' }), ...AMINA)).theMonthBoard;
    expect(b.weekSaid).toBe('This check-in has ended.');
    expect(b.whatGroundworkIsWorkingOnNext).toEqual(['Groundwork is not asking anyone for more.']);
    expect(everyString(b).join(' ')).not.toMatch(/Week 4 of the month|checking in with the/);
  });
});

describe('an ended check-in has no line about who is active', () => {
  it('serves the active line while it runs, and not once it has ended', async () => {
    expect((await boardAs(anchor(), ...AMINA)).activeLine?.line).toMatch(/active/);
    expect((await boardAs(anchor({ status: 'RESOLVED' }), ...AMINA)).activeLine).toBeUndefined();
  });
});

describe('the suites are not claimed until they are counted (6 October)', () => {
  it('leaves the suites line out and does not offer to turn suites on while the count is nothing', async () => {
    const e = (await boardAs(anchor(), ...AMINA)).theEndOfMonthRead;
    expect(e.revealSaid.lines.join(' ')).not.toMatch(/suite/);
    expect(e.continueOptions.map((o: any) => o.key)).not.toContain('turnOnRelevantSuites');
  });
  it('says wording with no "account" on the month board', async () => {
    const b = (await boardAs(anchor(), ...AMINA)).theMonthBoard;
    expect(JSON.stringify(b)).not.toMatch(/\baccounts?\b/i);
  });
});
