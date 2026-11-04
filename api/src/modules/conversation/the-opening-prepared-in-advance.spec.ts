import { theNightRunsDatabase, N, type AGroundOfTheRun } from '../engagement/the-night-run-bed';
import { ConversationService } from './conversation.service';
import { withTheOpeningLine } from './the-opening-line';
import { aTeamMembersOpeningFor } from './the-one-thing-today';
import { theFactLine, theOpeningAsRead, nothingChangedSince, thePreparedOpeningIn, KEPT_IN_THE_PLAN_AS, type APreparedOpening } from './the-opening-prepared-in-advance';

/**
 * EACH PERSON'S OPENER AND FIRST QUESTION, PREPARED IN ADVANCE (Hafsah, 3 November 2026 night; fix plan, batch 1, group 7, item 1).
 *
 * Read on the second night run's record (Drop Access, "Sales team, Q4", Tuesday 20 October in the morning). Since batch 1 the direct
 * morning has no switch, and this is its one opener: the morning email and WhatsApp message read the same draft. The model is a fixture that says which instruction it was given; everything else is the
 * product: what is prepared, what is kept on the row, what the person reads first, and how many model calls the opening makes.
 *
 * Before: opening a check-in made two model calls while the person waited, the session plan (about 4.3 seconds) and the opener (about
 * 2.7 seconds), and the person read only "Groundwork is writing…" until both were done.
 */
const NOW = new Date('2026-10-20T05:30:00.000Z');
const person = (g: AGroundOfTheRun, first: string) => N[g].participants.find((p: any) => p.user?.firstName === first);
const today = (g: AGroundOfTheRun, first: string) => N[g].checkIns.find((c: any) => c.participantId === person(g, first).id && c.status === 'NOT_STARTED');

const THE_QUESTION = 'Is the delivery set for tomorrow, and who is taking it?';
const KEVINS_LINE = 'Kevin, Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow.';

function aCheckInOver(g: AGroundOfTheRun, first: string) {
  const db: any = theNightRunsDatabase(g, { directMorning: false });
  const p = person(g, first);
  const ci = today(g, first) ?? N[g].checkIns.filter((c: any) => c.participantId === p.id).sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)[0];
  const row: any = { ...ci, sessionPlan: null };
  const saved: any[] = [];
  db.conversationTurn.create = jest.fn(async ({ data }: any) => { const t = { id: `t${saved.length + 1}`, createdAt: new Date(), ...data }; saved.push(t); return t; });
  db.conversationTurn.findFirst = jest.fn(async (q: any) => (q?.where?.checkInId === ci.id ? saved.find((t) => t.role === q.where.role) ?? null : { id: 'another-round' }));
  db.checkIn.findUnique = jest.fn(async (q: any) => (q?.where?.id === ci.id ? structuredClone(row) : null));
  const theRun = db.checkIn.findFirst;
  db.checkIn.findFirst = jest.fn(async (q: any) => (q?.where?.participantId === row.participantId && q?.where?.status === 'NOT_STARTED' ? (row.status === 'NOT_STARTED' ? structuredClone(row) : null) : theRun(q)));
  db.checkIn.update = jest.fn(async ({ data }: any) => { Object.assign(row, data); return row; });
  db.checkIn.updateMany = jest.fn(async ({ where, data }: any) => { if (where.id !== ci.id || row.status !== where.status) return { count: 0 }; Object.assign(row, data); return { count: 1 }; });
  db.ground.updateMany = jest.fn(async () => ({ count: 1 }));
  const anthropic: any = {
    respond: jest.fn(async (system: string) => (system.includes('THE OPENING LINE IS ALREADY WRITTEN') ? THE_QUESTION : 'What moved on your deals since yesterday?')),
    extract: jest.fn(async () => ({})),
  };
  const service = new ConversationService(
    db, {} as any, anthropic, { getActive: jest.fn(async () => ({ id: 'v1' })) } as any, { emit: jest.fn() } as any, {} as any,
    { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: -1 })) } as any, {} as any, { emit: jest.fn(() => Promise.resolve()) } as any, {} as any,
  );
  (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const theCheckIn = { ...ci, isSelfCorrection: false, isFinal: false, participant: { ...p, userId: p.userId } };
  jest.spyOn(service as any, 'openTheDoor').mockResolvedValue(theCheckIn);
  jest.spyOn(service as any, 'loadOwnedCheckIn').mockResolvedValue(theCheckIn);
  jest.spyOn(service as any, 'closeAsMissed').mockResolvedValue(false);
  jest.spyOn(service as any, 'composeSystemPrompt').mockResolvedValue('SYSTEM');
  jest.spyOn(service as any, 'theContextNotYetSaid').mockResolvedValue('');
  jest.spyOn(service as any, 'provisionalFunctionFromTheStatedRole').mockResolvedValue(undefined);
  jest.spyOn(service as any, 'theSubjectsToCover').mockResolvedValue(null);
  jest.spyOn(service as any, 'theFrameFor').mockResolvedValue(null);
  jest.spyOn(service as any, 'untoldGoalsOn').mockResolvedValue([]);
  jest.spyOn(service as any, 'theTurnAsItIsSaved').mockImplementation(async (_c: any, t: any) => t);
  jest.spyOn(service as any, 'withTheNewsTheyWaitOn').mockImplementation(async (_c: any, t: any) => t);
  jest.spyOn(service as any, 'theDocumentQuestionItRaised').mockResolvedValue(null);
  jest.spyOn(service as any, 'theOpenerIsHeldToTheSameBar').mockImplementation(async (_i: any, _s: any, _b: any, t: any) => t);
  return { service, anthropic, saved, ci, row, db, userId: p.userId };
}

describe('the opener, in its parts', () => {
  it('is one plain fact by name, or "nothing is open from last time", and always has its question after it', () => {
    expect(theFactLine({ firstName: 'Joseph', things: [{ says: 'Juja Hardware is waiting on the KES 4,500 price for 5 units.' } as any] })).toBe('Joseph, Juja Hardware is waiting on the KES 4,500 price for 5 units.');
    expect(theFactLine({ firstName: 'Joseph', things: [] })).toBe('Joseph, nothing is open from last time.');
    expect(theOpeningAsRead('Joseph, nothing is open from last time.', 'What did you get done this week?')).toBe('Joseph, nothing is open from last time. What did you get done this week?');
  });

  it('a draft is fresh only while the line, the things, their updates, the lead\'s decisions and their waits are all as they were', () => {
    const restsOn = { line: 'L', things: ['deal:1'], lastOwnUpdateAt: '2026-10-19T10:00:00.000Z', lastLeadDecisionAt: null, lastWaitChangeAt: null };
    const draft = { line: 'L', question: 'Q?', preparedAt: '', basedOn: '', restsOn } as APreparedOpening;
    expect(nothingChangedSince(draft, { ...restsOn })).toBe(true);
    expect(nothingChangedSince(draft, { ...restsOn, lastOwnUpdateAt: '2026-10-20T08:00:00.000Z' })).toBe(false);
    expect(nothingChangedSince(draft, { ...restsOn, lastLeadDecisionAt: '2026-10-20T08:00:00.000Z' })).toBe(false);
    expect(nothingChangedSince(draft, { ...restsOn, line: 'M' })).toBe(false);
    expect(thePreparedOpeningIn({ [KEPT_IN_THE_PLAN_AS]: draft })).toEqual(draft);
    expect(thePreparedOpeningIn({ mustEstablish: 'x' })).toBeNull();
  });
});

describe('Kevin\'s check-in', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] }));
  afterEach(() => jest.useRealTimers());

  it('prepared in advance: the draft is kept on his next session\'s row with what it was based on, and nothing starts', async () => {
    const { service, row, saved } = aCheckInOver('drop', 'Kevin');
    const draft = await service.prepareTheOpening(row.id);
    expect(draft).toMatchObject({ line: KEVINS_LINE, question: THE_QUESTION });
    expect(draft!.basedOn).toMatch(/^Prepared on 2026-10-20T05:30:00\.000Z from the record's /);
    expect(thePreparedOpeningIn(row.sessionPlan)).toMatchObject({ line: KEVINS_LINE, question: THE_QUESTION });
    expect(row.status).toBe('NOT_STARTED');
    expect(saved).toHaveLength(0);
  });

  it('opened with nothing changed: his opener and first question straight away, with no model call', async () => {
    const { service, anthropic, row, ci, userId } = aCheckInOver('drop', 'Kevin');
    await service.prepareTheOpening(row.id);
    anthropic.respond.mockClear();
    const line = await service.theOpeningLine(ci.id, userId);
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).not.toHaveBeenCalled();
    expect(r.reply).toBe(withTheOpeningLine(`${KEVINS_LINE} ${THE_QUESTION}`));
    expect(line.line).toBe(r.reply);
  });

  it('the morning email and WhatsApp message carry the same draft, word for word, and the record\'s own words only while there is none', async () => {
    const { service, row, db } = aCheckInOver('drop', 'Kevin');
    const who = { groundId: row.groundId, participantId: row.participantId, sessionNumber: row.sessionNumber, now: NOW };
    expect((await aTeamMembersOpeningFor(db, who))?.text).toBe(`${KEVINS_LINE} Is the delivery set for tomorrow?`);
    await service.prepareTheOpening(row.id);
    expect((await aTeamMembersOpeningFor(db, who))?.text).toBe(`${KEVINS_LINE} ${THE_QUESTION}`);
  });

  it('opened after something changed: the fact line straight away, and only the question written fresh, in one model call', async () => {
    const { service, anthropic, row, ci, db, userId } = aCheckInOver('drop', 'Kevin');
    await service.prepareTheOpening(row.id);
    /* Something relevant changes before the session: Kevin adds an update. */
    db.recordEntry.findFirst = jest.fn(async () => ({ createdAt: new Date('2026-10-20T06:00:00.000Z') }));
    anthropic.respond.mockClear();
    const line = await service.theOpeningLine(ci.id, userId);
    expect(line.line).toBe(withTheOpeningLine(KEVINS_LINE));
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    expect(anthropic.respond.mock.calls[0][0]).toContain(`"${KEVINS_LINE}"`);
    expect(r.reply.startsWith(line.line!)).toBe(true);
    expect(r.reply).toBe(withTheOpeningLine(`${KEVINS_LINE} ${THE_QUESTION}`));
  });

  it('opened with no draft at all: the fact line and a question, never the line alone', async () => {
    const { service, anthropic, ci, userId } = aCheckInOver('drop', 'Kevin');
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    expect(r.reply).toBe(withTheOpeningLine(`${KEVINS_LINE} ${THE_QUESTION}`));
  });
});

describe('the other readers', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] }));
  afterEach(() => jest.useRealTimers());

  it('Peter, with nothing open on record: "Peter, nothing is open from last time." and the question', async () => {
    const { service, ci, userId } = aCheckInOver('drop', 'Peter');
    const r: any = await service.open(ci.id, userId);
    expect(r.reply).toBe(withTheOpeningLine(`Peter, nothing is open from last time. ${THE_QUESTION}`));
  });

  it('the lead: nothing is prepared, and her opening is the model\'s, as before', async () => {
    const { service, anthropic, row, ci, userId } = aCheckInOver('drop', 'Grace');
    expect(await service.prepareTheOpening(row.id)).toBeNull();
    expect(await service.theOpeningLine(ci.id, userId)).toEqual({ line: null });
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    expect(r.reply).toBe(withTheOpeningLine('What moved on your deals since yesterday?'));
  });
});
