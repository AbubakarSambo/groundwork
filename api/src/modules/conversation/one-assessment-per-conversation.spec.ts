/**
 * ONE ASSESSMENT PER CONVERSATION (Hafsah's brief of 31 October 2026, layer 1). What is proved here:
 *   - one call reads the whole conversation, and the completeness check reads again only what it left unmatched;
 *   - every message the person sent ends matched to an item or marked "nothing to record", and whatever no read placed is
 *     kept whole in their words, so nothing they said is lost;
 *   - setup's words are read with the lead's first check-in, numbered first, with her notes on each person;
 *   - it is stored in the check-in's sessionReport with setup's report kept whole inside it, and nobody is served it: the lead
 *     and a person taking part are each served only the report the person read;
 *   - the instructions that ran are recorded, a stored version winning over the file;
 *   - the calls and the time from the close to ready are logged and kept;
 *   - ASSESSMENT_READY is emitted on every path, the read failing included;
 *   - a later correction is kept on the earlier item as its history.
 */
import { assessTheConversation } from './assess-the-conversation';
import {
  THE_ASSESSMENT_PROMPT, theReportTheyRead, theAssessmentIn, theColumnWith, theUnmatched, thePartsFrom, whoMaySee, theFilesPromptVersion,
  whatTheyPromisedThemselves, whatTheyAreWaitingOn, type TheAssessment,
} from './the-assessment';
import { READ_WHAT_THEY_PROMISED } from './what-they-said-they-would-do-next';
import { DEPENDENCY_EXTRACTION_PROMPT } from './prompt-library';
import { theCheckInRowAsServed } from './a-transcript-serves-only-what-is-theirs';
import { GroundworkEvents } from '../../common/events';

const TURNS = [
  { id: 't0', role: 'AI', content: 'How is the Westgate order going?' },
  { id: 't1', role: 'PERSON', content: 'I delivered 40 cartons to Westgate on Monday, the signed note is attached.' },
  { id: 't2', role: 'AI', content: 'Anything you are waiting on?' },
  { id: 't3', role: 'PERSON', content: 'Waiting on Grace for the price list since last week.' },
  { id: 't4', role: 'PERSON', content: 'ok thanks' },
  { id: 't5', role: 'PERSON', content: 'Also the van broke down twice, it cost us a day.' },
];

function aWorld(opts: { answers: any[]; stored?: { id: string; content: string } | null; earlier?: any[]; sessionReport?: unknown; turns?: any[]; fail?: boolean } ) {
  const writes: any[] = [];
  const emitted: any[] = [];
  const logged: string[] = [];
  const calls: { system: string; content: string }[] = [];
  const answers = [...opts.answers];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async ({ where }: any) => (where.id === 'ci-2'
        ? { id: 'ci-2', groundId: 'g', participantId: 'p-amani', sessionNumber: 2, startedAt: new Date('2026-11-02T08:00:00Z'), completedAt: new Date('2026-11-02T08:20:00Z'),
            whatWeHave: { claims: [{ said: 'I delivered 40 cartons', number: '40', measure: 'cartons' }] }, sessionReport: opts.sessionReport ?? null,
            turns: opts.turns ?? TURNS, participant: { partyType: 'PARTICIPANT', nameGiven: null, roleAsDescribed: 'the weak link', user: { firstName: 'Amani', lastName: 'Wekesa', jobTitle: 'Sales rep' } }, ground: { label: 'Sales check-in' } }
        : { sessionReport: (opts.earlier ?? [])[0]?.sessionReport ?? null })),
      findMany: jest.fn(async () => opts.earlier ?? []),
      update: jest.fn(async (a: any) => { writes.push(a); return {}; }),
    },
    groundObjective: { findMany: jest.fn(async () => [{ name: 'Sell 500 cartons this quarter' }]) },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  const anthropic = {
    extract: jest.fn(async (system: string, history: any[]) => {
      calls.push({ system, content: history[0].content });
      if (opts.fail) throw new Error('the model is down');
      return answers.shift() ?? null;
    }),
  };
  const deps = {
    prisma, anthropic: anthropic as any,
    prompts: { getActive: async () => { if (opts.stored) return opts.stored; throw new Error('none stored'); } },
    events: { emit: (e: string, p: unknown) => { emitted.push({ e, p }); } },
    logger: { log: (m: string) => logged.push(m), warn: (m: string) => logged.push(m) },
  };
  return { deps, writes, emitted, logged, calls, anthropic };
}

const FIRST = {
  summary: 'Amani delivered 40 cartons to Westgate and is waiting on Grace for the price list.',
  claims: [{ words: 'I delivered 40 cartons to Westgate on Monday', from: [1], claim: 'Delivered 40 cartons to Westgate', proof: 'proved', proofIs: 'the signed note' }],
  numbers: [{ words: '40 cartons', from: [1], figure: '40', measures: 'cartons delivered to Westgate', unit: 'cartons', source: 'Amani' }],
  blockers: [{ words: 'Waiting on Grace for the price list since last week.', from: [2], what: 'the price list', onName: 'Grace', status: 'WAITING', namedTheThing: true, since: 'last week' }],
  promises: [{ words: 'I will call Westgate on Friday', from: [1], byThePerson: true, action: 'I will call Westgate on Friday', when: 'on Friday' }],
  observations: [{ words: 'ok thanks', from: [3], observed: 'other', what: 'Said thanks.' }],
  nothingToRecord: [3],
};
const SECOND = { summary: '', observations: [{ words: 'the van broke down twice, it cost us a day', from: [4], observed: 'overload', what: 'The van broke down twice.' }], nothingToRecord: [] };

describe('the assessment of a check-in', () => {
  it('is one call, then a second only for the message the first left unmatched, and every message is accounted for', async () => {
    const w = aWorld({ answers: [FIRST, SECOND] });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date(Date.now() - 5) }))!;
    expect(w.anthropic.extract).toHaveBeenCalledTimes(2);
    /* The second read was given only message 4, the van. */
    expect(w.calls[1].content).toContain('[4] THE PERSON: Also the van broke down twice');
    expect(w.calls[1].content).not.toContain('[1] THE PERSON');
    expect(a.completeness).toEqual({ messages: 4, matchedByTheFirstRead: 3, addedByTheSecondRead: 1, keptWhole: 0, ready: true });
    expect(theUnmatched(a, a.messages)).toEqual([]);
    expect(a.messages.map((m) => m.turnId)).toEqual(['t1', 't3', 't4', 't5']);
    expect(a.measure.modelCalls).toBe(2);
    expect(a.measure.msFromCloseToReady).toBeGreaterThanOrEqual(0);
    expect(w.logged.find((l) => l.startsWith('assessment-measure'))).toMatch(/calls=2 msFromClose=\d+ messages=4 matchedFirst=3 addedSecond=1 keptWhole=0/);
  });

  it('keeps whatever no read placed, whole and in their words, and is still ready', async () => {
    const w = aWorld({ answers: [FIRST, { summary: '', nothingToRecord: [] }] });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() }))!;
    const kept = a.everythingElse.find((i) => i.from.includes(4))!;
    expect(kept.words).toBe('Also the van broke down twice, it cost us a day.');
    expect(a.completeness.keptWhole).toBe(1);
    expect(a.completeness.ready).toBe(true);
  });

  it('carries the person\'s own words, the message, who may see it, and whether the words are word for word', async () => {
    const w = aWorld({ answers: [FIRST, SECOND] });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() }))!;
    expect(a.claims[0]).toMatchObject({ words: 'I delivered 40 cartons to Westgate on Monday', from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, proof: 'proved' });
    expect(a.observations[0].whoMaySee).toBe('the lead only');
    /* A promise the model put in words they never typed is kept, and marked as not their words. */
    expect(a.promises[0].saidWordForWord).toBe(false);
  });

  it('is stored in the check-in\'s own column, and the readers that moved onto it read the promises and waits from it', async () => {
    const w = aWorld({ answers: [FIRST, SECOND] });
    await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() });
    const stored = theAssessmentIn(w.writes[0].data.sessionReport)!;
    expect(stored).toMatchObject({ kind: 'assessment', version: 1, about: { who: 'Amani Wekesa', sessionNumber: 2, howItEnded: 'finished by the person' } });
    expect(whatTheyPromisedThemselves(stored)).toEqual([{ action: 'I will call Westgate on Friday', clear: null, outcome: null, when: 'on Friday' }]);
    expect(whatTheyAreWaitingOn(stored)).toEqual([{ what: 'the price list', onName: 'Grace', onLabel: null, status: 'WAITING', then: null, triedSaid: null, dueSaid: null, namedTheThing: true }]);
  });

  it('never gives the model the lead\'s words about a person: the role given is their own job title', async () => {
    const w = aWorld({ answers: [FIRST, SECOND] });
    await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(w.calls[0].content).toContain('The role they were given: Sales rep.');
    expect(w.calls[0].content).not.toContain('weak link');
    expect(w.calls[0].content).toContain('Sell 500 cartons this quarter');
  });

  it('records the instructions that ran: the file\'s words by their fingerprint, or a stored version by its id', async () => {
    const fromFile = aWorld({ answers: [FIRST, SECOND] });
    const a = (await assessTheConversation(fromFile.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() }))!;
    expect(a.promptVersionId).toBeNull();
    expect(a.promptFromFile).toBe(theFilesPromptVersion());
    expect(fromFile.calls[0].system).toBe(THE_ASSESSMENT_PROMPT);

    const stored = aWorld({ answers: [FIRST, SECOND], stored: { id: 'pv-9', content: 'STORED WORDS' } });
    const b = (await assessTheConversation(stored.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() }))!;
    expect(b.promptVersionId).toBe('pv-9');
    expect(stored.calls[0].system).toBe('STORED WORDS');
  });

  it('is announced when ready, and announced even when the model cannot be reached, with every message kept whole', async () => {
    const w = aWorld({ answers: [], fail: true });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'closed by the clock', closedAt: new Date() }))!;
    expect(w.emitted).toEqual([{ e: GroundworkEvents.ASSESSMENT_READY, p: { checkInId: 'ci-2', groundId: 'g', participantId: 'p-amani', sessionNumber: 2, howItEnded: 'closed by the clock' } }]);
    expect(a.measure.modelFailed).toBe(true);
    expect(a.everythingElse.map((i) => i.words)).toEqual(TURNS.filter((t) => t.role === 'PERSON').map((t) => t.content));
  });

  it('makes no call for a conversation where nothing was said (a session closed as missed), and is still announced', async () => {
    const w = aWorld({ answers: [], turns: [] });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'missed', closedAt: new Date() }))!;
    expect(w.anthropic.extract).not.toHaveBeenCalled();
    expect(a.measure.modelCalls).toBe(0);
    expect(w.emitted).toHaveLength(1);
  });
});

describe('the assessment of a setup', () => {
  it('reads setup\'s words first, numbered, with the lead\'s notes on each person, and keeps her report whole inside it', async () => {
    const report = { alignmentStatus: 'Clear', whatGroundworkSaw: 'A law firm with four people.' };
    const w = aWorld({
      answers: [{ summary: 'Setup.', setup: { privateNotes: [{ words: 'Wanjiru is new and needs support', from: [1], about: 'Wanjiru', note: 'new, needs support' }], objective: [{ words: 'clear the backlog of 30 files', from: [2], objective: 'Clear the backlog of 30 files' }] }, nothingToRecord: [3, 4, 5, 6] }],
      sessionReport: report,
    });
    const a = (await assessTheConversation(w.deps, 'ci-2', {
      howItEnded: 'setup saved', closedAt: new Date(),
      setup: { words: ['Wanjiru is new and needs support', 'We need to clear the backlog of 30 files by December'], given: ['Wanjiru: new, needs support'] },
    }))!;
    expect(w.calls[0].content).toContain('[1] THE LEAD, IN SETUP: Wanjiru is new and needs support');
    expect(w.calls[0].content).toContain('[3] THE PERSON: I delivered 40 cartons');
    expect(w.calls[0].content).toContain('  - Wanjiru: new, needs support');
    expect(a.setup!.privateNotes[0].whoMaySee).toBe('the lead only');
    expect(a.setup!.objective[0].whoMaySee).toBe('the people in this check-in');
    expect(a.messages.slice(0, 2).map((m) => m.where)).toEqual(['setup', 'setup']);
    expect(a.about.channel).toBe('setup');
    /* Her report, as she read it, is inside the column whole. */
    expect(theReportTheyRead(w.writes[0].data.sessionReport)).toEqual(report);
  });
});

describe('nobody is served the assessment', () => {
  const report = { whatGroundworkSaw: 'What she read at the end of setup.' };
  const assessment = { kind: 'assessment', version: 1, observations: [{ words: 'avoided the question', whoMaySee: 'the lead only' }] } as unknown as TheAssessment;
  const row = { id: 'ci-1', groundId: 'g', participantId: 'p', sessionNumber: 1, status: 'COMPLETED', whatWeHave: { claims: [] }, sessionReport: theColumnWith(assessment, report) };

  it('the lead, who reads her own row whole, is served the report she read and not the assessment around it', () => {
    const served: any = theCheckInRowAsServed(row, true);
    expect(served.sessionReport).toEqual(report);
    expect(JSON.stringify(served)).not.toContain('avoided the question');
  });

  it('a person taking part is served the same, and nothing of the assessment', () => {
    const served: any = theCheckInRowAsServed(row, false);
    expect(served.sessionReport).toEqual(report);
    expect(JSON.stringify(served)).not.toContain('assessment');
  });

  it('a check-in with an assessment and no report of its own serves no report, exactly as before', () => {
    expect(theReportTheyRead(theColumnWith(assessment, null))).toBeNull();
    expect(theReportTheyRead(report)).toEqual(report);
    expect(theReportTheyRead(null)).toBeNull();
  });

  it('getSessionReport reads the column only through the report they read', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8');
    const at = src.indexOf('async getSessionReport(');
    expect(src.slice(at, at + 1500)).toContain('theReportTheyRead(row?.sessionReport)');
  });
});

describe('who may see each part, decided in code', () => {
  it('the lead\'s private notes, the team as she described it, risks, observations, role and focus are hers only', () => {
    for (const s of ['setup.privateNotes', 'setup.team', 'setup.risks', 'observations', 'roleSignals', 'areas', 'compared.disagreements']) expect(whoMaySee(s)).toBe('the lead only');
    for (const s of ['claims', 'promises', 'blockers', 'numbers', 'setup.objective']) expect(whoMaySee(s)).toBe('the people in this check-in');
  });
});

describe('the instructions', () => {
  it('quote the promise and wait rules whole, so those rules have one home', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain(READ_WHAT_THEY_PROMISED);
    expect(THE_ASSESSMENT_PROMPT).toContain(DEPENDENCY_EXTRACTION_PROMPT);
    expect(THE_ASSESSMENT_PROMPT).toContain('nothingToRecord');
  });

  it('a message number the model made up is dropped, so every item points at something they said', () => {
    const said = new Map([[1, 'I delivered 40 cartons']]);
    const parts = thePartsFrom({ claims: [{ words: 'I delivered 40 cartons', from: [1, 9] }] }, said, { hasSetup: false, previous: null, givenRole: null, read: 1 });
    expect(parts.claims[0].from).toEqual([1]);
  });
});

describe('a correction is kept on the earlier item, as its history', () => {
  it('names the item, what it said and what it says now', async () => {
    const earlierAssessment = { kind: 'assessment', version: 1, promises: [{ id: 'r1.promises.0', words: 'I will send the Kilele proof on Monday', from: [1] }], interventions: [] } as any;
    const w = aWorld({
      answers: [{ ...FIRST, corrections: [{ words: 'I sent the Kilele proof on Monday', from: [1], recordSaid: 'not sent', shouldSay: 'sent on Monday', backed: true, correctsItem: 'r1.promises.0' }] }, SECOND],
      earlier: [{ id: 'ci-1', sessionNumber: 1, completedAt: new Date('2026-10-26'), sessionReport: earlierAssessment }],
    });
    await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(w.calls[0].content).toContain('[r1.promises.0] Promise: I will send the Kilele proof on Monday');
    const earlierWrite = w.writes.find((x) => x.where.id === 'ci-1');
    expect(theAssessmentIn(earlierWrite.data.sessionReport)!.promises[0].history).toEqual([
      expect.objectContaining({ inCheckInId: 'ci-2', said: 'not sent', nowSays: 'sent on Monday', backed: true }),
    ]);
  });
});
