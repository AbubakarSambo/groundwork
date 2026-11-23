import { THE_LINES_REWRITTEN } from './every-line-is-read-before-it-is-kept';
import { ReportsService } from './reports.service';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';

/**
 * THE COUNT IN A TEAM REPORT IS TAKEN FROM THE RECORD AT THE MOMENT IT IS WRITTEN (4 October 2026, the
 * user journeys). Wairimu, Amani and Baraka all finished their first check-in, and each had the next
 * round's check-in already waiting (not started, session 2). The report took "this round" from the
 * highest session number of any row, started or not, so it counted round 2, where nobody had answered,
 * and read "Two of the three people have answered so far" and "Only Amani has contributed". The round
 * is the highest session somebody has finished.
 */
const person = (n: number, id: string, type: string, first: string) => ({
  id: `pid-${n}`, partyType: type, createdAt: new Date(`2026-09-0${n}`), userId: `uid-${n}`, email: `${id}@kito.test`,
  roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
  user: { firstName: first, lastName: 'Test', email: `${id}@kito.test` },
});
const PARTICIPANTS = [person(1, 'wairimu', 'INITIATOR', 'Wairimu'), person(2, 'amani', 'PARTICIPANT', 'Amani'), person(3, 'baraka', 'PARTICIPANT', 'Baraka')];
const BASE = [
  ...PARTICIPANTS.map((p) => ({ participantId: p.id, sessionNumber: 1, status: 'COMPLETED', isSetup: false, turns: [] as any[] })),
  ...PARTICIPANTS.map((p) => ({ participantId: p.id, sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, turns: [] as any[] })),
];
const RECORD = PARTICIPANTS.map((p, i) => ({ id: `r${i}`, participantId: p.id, participant: { id: p.id }, checkIn: { sessionNumber: 1 }, type: 'PROGRESS', text: `Said number ${i} about the renewals.`, disputedAt: null, saidWordForWord: true, createdAt: new Date() }));

function harness(leadFinishesWhileItIsWritten = false, nobodyAnswered = false) {
  const ROWS = BASE.map((r) => ({ ...r, ...(nobodyAnswered ? { status: 'NOT_STARTED' } : {}) }));
  if (leadFinishesWhileItIsWritten) ROWS.find((r) => r.participantId === 'pid-1' && r.sessionNumber === 1)!.status = 'IN_PROGRESS';
  let first = true;
  const upserts: any[] = [];
  const matches = (r: any, where: any = {}) =>
    (where.sessionNumber === undefined || r.sessionNumber === where.sessionNumber) &&
    (where.status === undefined || (where.status.in ? where.status.in.includes(r.status) : r.status === where.status));
  const prisma: any = new Proxy({
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', initiatorId: 'uid-1', organizationId: 'o1', scenario: 'DRIFT', label: 'Renewals', brief: 'The renewals.', peopleWorkTogether: true, participants: PARTICIPANTS })), update: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o1' })) },
    /* Each person's own check-ins, as the relation reads them: the report counts the round through the one count (howManyHaveAnswered). */
    groundParticipant: { findMany: jest.fn(async (a: any) => (a?.select?.checkIns ? PARTICIPANTS.map((p) => ({ ...p, checkIns: ROWS.filter((r) => r.participantId === p.id && matches(r, a.select.checkIns.where)) })) : PARTICIPANTS)), findFirst: jest.fn(async () => null) },
    recordEntry: { findMany: jest.fn(async () => RECORD), count: jest.fn(async () => RECORD.length) },
    checkIn: {
      count: jest.fn(async () => 3),
      findMany: jest.fn(async (a: any) => ROWS.filter((r) => matches(r, a?.where))),
      aggregate: jest.fn(async (a: any) => ({ _max: { sessionNumber: Math.max(0, ...ROWS.filter((r) => matches(r, a?.where)).map((r) => r.sessionNumber)) || null } })),
      findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 1 })),
    },
    groundDocument: { count: jest.fn(async () => 0), groupBy: jest.fn(async () => []), findMany: jest.fn(async () => []) },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    report: { findUnique: jest.fn(async () => null), upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1', groundId: 'g1', ...a.create }; }), update: jest.fn(async () => ({})) },
  } as any, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      target[prop] = new Proxy({}, { get: (_t, m: string) => (m === 'count' ? jest.fn(async () => 0) : /^find(First|Unique)$/.test(m) ? jest.fn(async () => null) : jest.fn(async () => [])) });
      return target[prop];
    },
  });
  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (_s: string, _h: any[], schema: any) => {
      /* Wairimu finishes while the first run is waiting for the model. */
      if (first && leadFinishesWhileItIsWritten) { first = false; ROWS.find((r) => r.participantId === 'pid-1' && r.sessionNumber === 1)!.status = 'COMPLETED'; }
      if (schema === THE_LINES_REWRITTEN) return { lines: [] };
      if (schema?.name === 'emit_at_stake') return { atStake: 'If this holds, the renewals stay open.' };
      if (schema === THE_PICTURE_SCHEMA) return { opening: 'Two of the three people have answered so far.', perPerson: PARTICIPANTS.map((p) => ({ participantId: p.id, text: 'Said something about the renewals.', headline: null })) };
      if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) return { theGap: 'The renewals have not moved.', whatTheNumbersSay: [], whatToDo: [], whatThisCannotTellYou: [], whatWeFailedToAsk: [] };
      return { sharedPicture: 'The renewals are open.', agreements: [], divergences: [], centralQuestion: 'Who owns the renewals?' };
    }),
  };
  const service = new ReportsService(prisma, { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) } as any, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  return { service, upserts, anthropic };
}

describe('a report written after all three finished counts all three', () => {
  it('opens "All three people have answered.", not "Two of the three", and asks the picture to say so', async () => {
    const { service, upserts, anthropic } = harness();
    await service.synthesize('g1');
    const stored = JSON.stringify(upserts[0].create);
    expect(stored).toContain('All three people have answered.');
    expect(stored).not.toMatch(/answered so far/);
    const pictureCall = anthropic.extract.mock.calls.find((c: any[]) => c[2] === THE_PICTURE_SCHEMA);
    expect(String(pictureCall[0])).toContain('Open with this sentence, exactly as it is: "All three people have answered."');
  });

  it('and when the last person finishes while it is being written, it is written again and the stored one counts them', async () => {
    const { service, upserts } = harness(true);
    await service.synthesize('g1');
    expect(upserts.length).toBeGreaterThanOrEqual(2);
    const stored = JSON.stringify(upserts[upserts.length - 1].create);
    expect(stored).toContain('All three people have answered.');
    expect(stored).not.toMatch(/Two of the three|answered so far/);
  });
});

describe('a report before anybody has answered (B-009)', () => {
  it('says nobody has checked in, with the count of people, and never calls it a ground or the lead the only one invited', async () => {
    const { service, upserts } = harness(false, true);
    await service.synthesize('g1');
    const stored = upserts[upserts.length - 1]?.create;
    /* Change 5: the lead's own sessions are optional, so a lead who has not checked in is not in the count. */
    expect(stored?.sharedPicture).toBe('Nobody has checked in yet, out of two people. The shared picture is made once people have answered.');
    expect(stored?.sharedPicture).not.toMatch(/ground|only person invited/);
  });
});
