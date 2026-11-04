/**
 * THE RECORD IS WRITTEN FROM THE CONVERSATION'S ASSESSMENT, BY ONE WRITER (one source, part 2).
 *
 * What is proved here, against what a person reads on the record:
 *   - each part of the assessment becomes the kind of line it always was (a promise of their own a COMMITMENT, work and claims
 *     PROGRESS, a wait a WORRY, an aim SUCCESS_DEFINITION, a date TIMEFRAME, a decision INTENT), one line per thing said;
 *   - the lead's private notes, the team, the risks, setup's words and anything only the lead may see never become a line;
 *   - the filters every line was held to still hold: a non-answer, a remark about Groundwork, words they never said;
 *   - a line already on the check-in's record is never written twice, so a retry or a second press adds nothing;
 *   - the close itself writes nothing to the record, and every path that ended a conversation writes it from the assessment.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConversationService } from './conversation.service';
import { theRecordLinesIn } from './the-record-from-the-assessment';
import { anAssessmentHolding } from './an-assessment-for-a-spec';

const AMANI_SAID = [
  'I delivered 40 cartons to Westgate on Monday, the signed note is attached.',
  'I will call Westgate on Friday to confirm the next order.',
  'Waiting on Grace for the price list since last week.',
  'We decided to stop selling to Kilele until they pay.',
  'you are repeating yourself',
];

const item = (section: string, i: number, x: object) => ({ id: `r1.${section}.${i}`, from: [i + 1], whoMaySee: 'the people in this check-in', saidWordForWord: true, ...x });

function amanisAssessment() {
  const a: any = anAssessmentHolding();
  a.messages = [
    { n: 1, turnId: 't1', where: 'check-in', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null },
    { n: 3, turnId: 't3', where: 'check-in', at: null }, { n: 4, turnId: 't4', where: 'check-in', at: null },
    { n: 5, turnId: 't5', where: 'check-in', at: null }, { n: 6, turnId: null, where: 'setup', at: null },
  ];
  a.claims = [item('claims', 0, { words: 'I delivered 40 cartons to Westgate on Monday', proof: 'proved', claim: 'Delivered 40 cartons' })];
  /* The same words as the claim: one line, not two. */
  a.workUpdates = [item('workUpdates', 0, { words: 'I delivered 40 cartons to Westgate on Monday', area: 'Westgate' })];
  a.numbers = [item('numbers', 0, { words: '40 cartons', figure: '40' })];
  a.promises = [item('promises', 1, { words: 'I will call Westgate on Friday to confirm the next order', byThePerson: true })];
  a.dates = [item('dates', 1, { words: 'on Friday', when: 'Friday' })];
  a.blockers = [item('blockers', 2, { words: 'Waiting on Grace for the price list since last week.', what: 'the price list' })];
  a.decisions = [item('decisions', 3, { words: 'We decided to stop selling to Kilele until they pay.', decision: 'Stop selling to Kilele' })];
  a.everythingElse = [item('everythingElse', 4, { words: 'you are repeating yourself' })];
  /* What only the lead may read, and setup's own words, never reach the record. */
  a.observations = [{ ...item('observations', 0, { words: 'I delivered 40 cartons to Westgate on Monday, the signed note is attached', observed: 'other' }), whoMaySee: 'the lead only' }];
  a.setup = {
    objective: [], success: [{ ...item('setup.success', 5, { words: 'Every shop restocked weekly by Friday.' }) }], team: [], timing: [], rules: [],
    risks: [{ ...item('setup.risks', 5, { words: 'Amani may leave in March for a better offer.' }), whoMaySee: 'the lead only' }],
    privateNotes: [{ ...item('setup.privateNotes', 5, { words: 'Amani is slow to send proof, watch him.' }), whoMaySee: 'the lead only' }],
  };
  return a;
}

function aWorld(onRecord: { text: string }[] = []) {
  const written: any[] = [];
  const prisma: any = new Proxy({
    conversationTurn: { findMany: jest.fn(async () => AMANI_SAID.map((content) => ({ content }))) },
    groundParticipant: { findMany: jest.fn(async () => [{ nameGiven: null, user: { firstName: 'Amani', lastName: 'Wekesa' } }, { nameGiven: null, user: { firstName: 'Grace', lastName: 'Achieng' } }]) },
    recordEntry: {
      findMany: jest.fn(async () => onRecord),
      createMany: jest.fn(async (a: any) => { written.push(...a.data); return { count: a.data.length }; }),
    },
    checkIn: { findUnique: jest.fn(async () => ({ completedAt: new Date('2026-11-02T09:00:00Z'), startedAt: new Date('2026-11-02T08:40:00Z') })) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), update: jest.fn(async (a: any) => a), updateMany: jest.fn(async () => ({ count: 0 })), createMany: jest.fn(async () => ({ count: 0 })) };
      }
      return target[prop];
    },
  });
  const svc = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any) as any;
  return { svc, written };
}

describe('the record, written from the conversation\'s assessment', () => {
  it('writes one line per thing said, each the kind it always was, in their own words', async () => {
    const w = aWorld();
    const n = await w.svc.writeTheRecordFromTheAssessment({ id: 'ci', participantId: 'p-amani', groundId: 'g' }, amanisAssessment());
    expect(w.written.map((r) => [r.type, r.text])).toEqual([
      ['COMMITMENT', 'I will call Westgate on Friday to confirm the next order'],
      ['WORRY', 'Waiting on Grace for the price list since last week.'],
      ['INTENT', 'We decided to stop selling to Kilele until they pay.'],
      ['PROGRESS', 'I delivered 40 cartons to Westgate on Monday'],
    ]);
    expect(n).toBe(4);
    expect(w.written.every((r) => r.checkInId === 'ci' && r.participantId === 'p-amani' && r.saidWordForWord === true)).toBe(true);
    expect(w.written.find((r) => r.type === 'PROGRESS')).toMatchObject({ verifiability: 'HIGH' });
  });

  it('never writes what only the lead may read, setup\'s words, her notes on a person, or a remark about Groundwork', async () => {
    const w = aWorld();
    await w.svc.writeTheRecordFromTheAssessment({ id: 'ci', participantId: 'p-amani', groundId: 'g' }, amanisAssessment());
    const all = w.written.map((r) => r.text).join('\n');
    expect(all).not.toMatch(/signed note is attached/);
    expect(all).not.toMatch(/better offer|slow to send proof|restocked weekly/);
    expect(all).not.toMatch(/repeating yourself/);
  });

  it('writes nothing already on the check-in\'s record, so a retry or a second press adds no line twice', async () => {
    const w = aWorld([{ text: 'I will call Westgate on Friday to confirm the next order' }, { text: 'Waiting on Grace for the price list since last week.' }]);
    await w.svc.writeTheRecordFromTheAssessment({ id: 'ci', participantId: 'p-amani', groundId: 'g' }, amanisAssessment());
    expect(w.written.map((r) => r.type)).toEqual(['INTENT', 'PROGRESS']);
  });

  it('carries a document, what they said about their work and the people in it, and anything else they said (assessment test, 2 November)', () => {
    /* Brian's role, Aisha's attached letter and Ruth's asides were in the assessment and never reached the record, so the session
       report, which reads the record, never saw them. */
    const a: any = anAssessmentHolding();
    a.messages = [{ n: 1, turnId: 't1', where: 'check-in', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null }, { n: 3, turnId: 't3', where: 'check-in', at: null }];
    a.claims = [item('claims', 0, { words: 'The draft is 80 percent done' })];
    a.documents = [item('documents', 1, { words: 'I attached the signed engagement letter from Kilele Holdings' })];
    a.people = [item('people', 2, { words: 'Wanjiru signs off every write-off' })];
    a.everythingElse = [
      item('everythingElse', 2, { words: "My main role in the Kasarani Foods case is drafting the written submissions" }),
      /* A message kept whole holds the short line already read out of it: it is that line, not a second one. */
      item('everythingElse', 0, { words: 'The draft is 80 percent done and I will finish it this week' }),
    ];
    /* Lead-only parts never become lines, whatever words they hold. */
    a.roleSignals = [{ ...item('roleSignals', 0, { words: 'Chasing pending items as well as drafting' }), whoMaySee: 'the lead only' }];
    a.observations = [{ ...item('observations', 0, { words: 'Avoided the question about the lawyer' }), whoMaySee: 'the lead only' }];
    expect(theRecordLinesIn(a, () => true).map((l) => [l.type, l.text])).toEqual([
      ['PROGRESS', 'The draft is 80 percent done'],
      ['PROGRESS', 'I attached the signed engagement letter from Kilele Holdings'],
      ['PROGRESS', 'Wanjiru signs off every write-off'],
      ['PROGRESS', 'My main role in the Kasarani Foods case is drafting the written submissions'],
    ]);
  });

  it('keeps the old filters: a non-answer and words the person never said are not lines', () => {
    const a: any = anAssessmentHolding();
    a.workUpdates = [item('workUpdates', 0, { words: 'Nothing new to add' }), item('workUpdates', 0, { words: 'Signed 12 shops in Nairobi' })];
    const lines = theRecordLinesIn(a, () => true);
    /* The mapping keeps both; the writer's filters (isANonAnswer, isTheirs) decide, as they always did. */
    expect(lines.map((l) => l.text)).toEqual(['Nothing new to add', 'Signed 12 shops in Nairobi']);
  });

  it('the close writes nothing to the record, and every path that ends a conversation writes it from the assessment', () => {
    const service = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(service.match(/recordEntry\.createMany/g)?.length).toBe(1);
    expect(service).not.toMatch(/extractRecordEntries|writeTheRecordAtTheEnd/);
    const assessAndThenRead = service.slice(service.indexOf('async assessAndThenRead('), service.indexOf('WHAT READS A FINISHED CHECK-IN\'S LINES'));
    expect(assessAndThenRead).toMatch(/'the record', async \(\) => \{ await this\.writeTheRecordFromTheAssessment\(checkIn, assessed\)/);
    const entry = readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8');
    expect(entry).not.toMatch(/extractRecordEntries/);
  });
});
