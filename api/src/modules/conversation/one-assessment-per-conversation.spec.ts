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
import { anAssessmentHolding } from './an-assessment-for-a-spec';
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
    expect(whatTheyAreWaitingOn(stored)).toEqual([{ what: 'the price list', onName: 'Grace', onLabel: null, status: 'WAITING', then: null, triedSaid: null, takenFurther: null, dueSaid: null, sinceDay: null, namedTheThing: true }]);
  });

  /* Assessment test, 2 November: every second session was a missed Thursday, so "last time" was an empty assessment and no run of
     assessments ever formed; and a promise past its day, promised again, was read as still open. */
  it('compares with the last conversation they had, not a missed session, and gives the days a promise and this conversation were on', async () => {
    const answered: any = anAssessmentHolding({ promises: [{ action: 'I will send the two attendance sheets by Monday' }] });
    answered.about = { ...answered.about, checkInId: 'ci-0', sessionNumber: 0, endedAt: '2026-10-26T09:00:00Z' };
    const missed: any = anAssessmentHolding();
    missed.about = { ...missed.about, checkInId: 'ci-1', sessionNumber: 1, howItEnded: 'missed', endedAt: '2026-10-29T21:00:00Z' };
    const w = aWorld({ answers: [FIRST, SECOND], earlier: [
      { id: 'ci-0', sessionNumber: 0, completedAt: new Date('2026-10-26T09:00:00Z'), sessionReport: answered },
      { id: 'ci-1', sessionNumber: 1, completedAt: new Date('2026-10-29T21:00:00Z'), sessionReport: missed },
    ] });
    w.deps.prisma.groundCommitment = { findMany: jest.fn(async () => [{ id: 'k1', text: 'I will send the two attendance sheets', whenSaid: 'by Monday', createdAt: new Date('2026-10-26T09:00:00Z') }]) };
    await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() });
    const material = w.calls[0].content;
    expect(material).toContain("THIS PERSON'S PREVIOUS ASSESSMENT, 2026-10-26");
    expect(material).toContain('The day of the conversation: 2026-11-02.');
    expect(material).toContain('[c:k1] I will send the two attendance sheets (said on 2026-10-26, by Monday)');
    expect(w.calls[0].system).toContain('It is also NOT_DONE when its day has passed and they promise it again for a later day.');
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

  it('keeps every message whole when the model cannot be reached, and leaves the announcing to the caller', async () => {
    const w = aWorld({ answers: [], fail: true });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'closed by the clock', closedAt: new Date() }))!;
    expect(w.emitted).toEqual([]);
    expect(a.measure.modelFailed).toBe(true);
    expect(a.everythingElse.map((i) => i.words)).toEqual(TURNS.filter((t) => t.role === 'PERSON').map((t) => t.content));
  });

  it('makes no call for a conversation where nothing was said (a session closed as missed), and is still announced', async () => {
    const w = aWorld({ answers: [], turns: [] });
    const a = (await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'missed', closedAt: new Date() }))!;
    expect(w.anthropic.extract).not.toHaveBeenCalled();
    expect(a.measure.modelCalls).toBe(0);
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
    /* CHANGED 4 NOVEMBER: the objective is setup's, so it is hers too (Hafsah: setup stays private to whoever runs the check-in). */
    expect(a.setup!.objective[0].whoMaySee).toBe('the lead only');
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
  /* CHANGED 4 NOVEMBER (Hafsah: setup stays private to whoever runs the check-in): every part of setup is the lead's, the objective,
     what success looks like and the rules included. They reach the team only through their own places, never as her words. */
  it('every part of setup, observations, role and focus are the lead\'s only', () => {
    for (const s of ['setup.objective', 'setup.success', 'setup.timing', 'setup.rules', 'setup.strategy', 'setup.notes', 'setup.privateNotes', 'setup.team', 'setup.risks', 'observations', 'roleSignals', 'areas', 'compared.disagreements']) expect(whoMaySee(s)).toBe('the lead only');
    for (const s of ['claims', 'promises', 'blockers', 'numbers', 'targets']) expect(whoMaySee(s)).toBe('the people in this check-in');
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
    const earlierAssessment = { kind: 'assessment', version: 1, claims: [{ id: 'r1.claims.0', words: 'I have not sent the Kilele proof', from: [1], claim: 'The Kilele proof is not sent', proof: 'said' }], interventions: [] } as any;
    const w = aWorld({
      answers: [{ ...FIRST, corrections: [{ words: 'I sent the Kilele proof on Monday', from: [1], recordSaid: 'not sent', shouldSay: 'sent on Monday', backed: true, correctsItem: 'r1.claims.0' }] }, SECOND],
      earlier: [{ id: 'ci-1', sessionNumber: 1, completedAt: new Date('2026-10-26'), sessionReport: earlierAssessment }],
      /* (Changed 1 November: their own promises are compared against the record's open promises, so the earlier item corrected here is a claim.) */
    });
    await assessTheConversation(w.deps, 'ci-2', { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(w.calls[0].content).toContain('[r1.claims.0] Claim (said): The Kilele proof is not sent');
    const earlierWrite = w.writes.find((x) => x.where.id === 'ci-1');
    expect(theAssessmentIn(earlierWrite.data.sessionReport)!.claims[0].history).toEqual([
      expect.objectContaining({ inCheckInId: 'ci-2', said: 'not sent', nowSays: 'sent on Monday', backed: true }),
    ]);
  });
});

describe('ASSESSMENT_READY is said once, after the readers, on every path', () => {
  it('after the waits and the promises are written, and even when the assessment could not be written', async () => {
    const order: string[] = [];
    const svc: any = Object.create(require('./conversation.service').ConversationService.prototype);
    Object.assign(svc, {
      prisma: { checkIn: { findUnique: async () => { throw new Error('the database is away'); } } },
      anthropic: { extract: async () => null }, prompts: null,
      events: { emit: (e: string, p: unknown) => order.push(`${e} ${JSON.stringify(p)}`) },
      logger: { log: () => undefined, warn: () => undefined },
      extractDependencies: async () => { order.push('waits'); },
      settleWhatTheySaidTheyWouldDo: async () => { order.push('settle'); return 0; },
      writeWhatTheyPromised: async () => { order.push('promises'); },
    });
    await svc.assessAndThenRead({ id: 'ci-9', participantId: 'p', groundId: 'g', sessionNumber: 4 }, { howItEnded: 'declined', closedAt: new Date() });
    expect(order[order.length - 1]).toBe(`${GroundworkEvents.ASSESSMENT_READY} {"checkInId":"ci-9","groundId":"g","participantId":"p","sessionNumber":4,"howItEnded":"declined"}`);
    expect(order.filter((x) => x.startsWith(GroundworkEvents.ASSESSMENT_READY))).toHaveLength(1);
    expect(order.indexOf('promises')).toBeLessThan(order.length - 1);
  });
});

describe('every path that ends a conversation is assessed, and none waits for it', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const service = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const entry = readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const body = (src: string, from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from) + from.length));

  it('the person finishing and the clock: after the one winning write, not awaited', () => {
    const finish = body(service, 'private async finishTheSession(', 'private async whatChangedOnTheirDealsToday(');
    const won = finish.indexOf('if (won.count === 0)');
    const at = finish.indexOf("this.assessAndThenRead(checkIn, { howItEnded: by === 'the clock' ? 'closed by the clock' : 'finished by the person'");
    expect(won).toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(won);
    expect(finish.slice(at - 20, at)).not.toMatch(/await\s*$/);
    /* The waits and the promises no longer run before the assessment, from calls of their own. */
    expect(finish).not.toContain('this.extractDependencies(');
    expect(finish).not.toContain('this.writeWhatTheyPromised(');
  });

  it('a decline, a session closed as missed, and setup\'s commit', () => {
    expect(body(service, 'async decline(checkInId', 'private async closeTheRoundIfThisWasTheLastAnswer(')).toContain("this.assessAndThenRead(checkIn, { howItEnded: 'declined'");
    const missed = body(service, 'async closeAsMissed(', 'private async finishTheSession(');
    expect(missed).toContain("{ howItEnded: 'missed', closedAt }");
    expect(missed).toContain("theAssessmentIsReady({ events: this.events }, { checkInId: row.id");
    const commit = entry.slice(entry.indexOf('this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED'));
    /* Changed for one source, part 2: setup's commit no longer writes her record first; the assessment writes it. */
    expect(commit).toMatch(/Promise\.resolve\(this\.conversation\?\.assessAndThenRead\?\.\(/);
    expect(commit).not.toMatch(/extractRecordEntries/);
    expect(commit).toContain("howItEnded: 'setup saved'");
  });

  it('the board\'s records and the patterns wait for the assessment, not the completion', () => {
    const board = readFileSync(join(__dirname, '..', 'board', 'board.listener.ts'), 'utf8');
    expect(board).toMatch(/@OnEvent\(GroundworkEvents\.ASSESSMENT_READY\)\s*async onCheckInCompleted\(/);
    const patterns = readFileSync(join(__dirname, '..', 'patterns', 'patterns.listener.ts'), 'utf8');
    expect(patterns).toMatch(/@OnEvent\(GroundworkEvents\.ASSESSMENT_READY\)\s*async onCheckInCompleted\(/);
  });
});
