import { ReportsService } from './reports.service';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';

/**
 * A REPORT HOLDS NO CLAIM THE RECORD DOES NOT (decision 138, part 1: "a check is added that catches made-up claims in reports"; decision
 * 139, must-fix 3; final evaluation, profile 5, problems 7 and 10).
 *
 * End to end, through the service: the record goes in, the synthesis runs with a stand-in model that writes what the models wrote in
 * Kevin's month, the report is stored, and the stored row is served through the door every report read goes through, to Wairimu (the
 * lead), to Kevin, and to a reader who is neither (an admin who only reads). What is checked is what each of them reads.
 *
 * Wairimu's setup names 40 pilot shops and "10 test orders from 5 shops". Nobody set ten shops. Kevin said he was waiting on Fatuma for
 * the final prices; nobody said they took it higher.
 */
const BRIEF = 'We are piloting ordering by WhatsApp with 40 of our shops in Eastlands and Westlands, live by Friday 20 November. Kevin Odhiambo runs the pilot day to day and owns the list of 40 pilot shops and 10 test orders from 5 shops by Friday 30 October.';
const KEVIN_SAID = 'I am waiting for the final prices from Fatuma before I can finish the catalogue.';
const WAIRIMU_SAID = 'We agreed his parts and dates in the kick-off on Monday 5 October.';

const PARTICIPANTS = [
  {
    id: 'pid-1', partyType: 'INITIATOR', createdAt: new Date('2026-10-01'), userId: 'uid-1', email: 'wairimu@msingi.test',
    roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Wairimu', lastName: 'Njoroge', email: 'wairimu@msingi.test' },
  },
  {
    id: 'pid-2', partyType: 'PARTICIPANT', createdAt: new Date('2026-10-02'), userId: 'uid-2', email: 'kevin@msingi.test',
    roleAsDescribed: 'Sales operations coordinator. Runs the WhatsApp pilot day to day.', remitAsGiven: 'Sales operations coordinator. Runs the WhatsApp pilot day to day.',
    managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Kevin', lastName: 'Odhiambo', email: 'kevin@msingi.test' },
  },
];
const KEVINS_LABEL = 'Participant A';

const RECORD_ROWS = [
  { id: 'r1', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 2 }, type: 'BLOCKER', text: KEVIN_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
  { id: 'r2', participantId: 'pid-1', participant: { id: 'pid-1' }, checkIn: { sessionNumber: 2 }, type: 'PROGRESS', text: WAIRIMU_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
];

const CHECK_INS = [
  { participantId: 'pid-1', sessionNumber: 2, status: 'COMPLETED', closedReason: null, turns: [] as any[] },
  { participantId: 'pid-2', sessionNumber: 2, status: 'COMPLETED', closedReason: null, turns: [] as any[] },
];

function harness() {
  const upserts: any[] = [];
  const any = () => jest.fn(async () => [] as any[]);
  const prisma: any = new Proxy({
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: any() },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g-pilot', initiatorId: 'uid-1', organizationId: 'o1', scenario: 'DRIFT', label: 'WhatsApp ordering pilot',
        brief: BRIEF, peopleWorkTogether: true, participants: PARTICIPANTS, leadContextNotes: [],
      })),
      update: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o1' })) },
    groundParticipant: {
      /* Each person's own check-ins on the relation, as the database returns them: the report counts the round through the one count (howManyHaveAnswered). */
      findMany: jest.fn(async (args: any) => (args?.select?.checkIns
        ? PARTICIPANTS.map((p) => ({ ...p, checkIns: CHECK_INS.filter((c) => c.participantId === p.id && (args.select.checkIns.where?.sessionNumber === undefined || c.sessionNumber === args.select.checkIns.where.sessionNumber)) }))
        : PARTICIPANTS)),
      findFirst: jest.fn(async () => null),
    },
    recordEntry: {
      findMany: jest.fn(async (args: any) => RECORD_ROWS.filter((r) => !(args?.where?.disputedAt === null && r.disputedAt))),
      count: jest.fn(async () => RECORD_ROWS.length),
    },
    groundDependency: { findMany: jest.fn(async () => [{ triedSaid: null, what: 'the final prices', fromParticipantId: 'pid-2', onParticipantId: null, onLabel: 'Fatuma', status: 'WAITING', createdAt: new Date('2026-10-11'), escalatedAt: new Date('2026-10-25') }]), count: jest.fn(async () => 1) },
    checkIn: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async () => CHECK_INS),
      /* The round is the highest session somebody has finished, as the database works it out. */
      aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })),
      findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 2 })),
    },
    groundDocument: { count: jest.fn(async () => 0), groupBy: any(), findMany: any() },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    report: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1', groundId: 'g-pilot', ...a.create }; }),
      update: jest.fn(async () => ({})),
    },
  } as any, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      target[prop] = new Proxy({}, {
        get: (_t, method: string) => (method === 'count' ? jest.fn(async () => 0) : /^find(First|Unique)$/.test(method) ? jest.fn(async () => null) : jest.fn(async () => [])),
      });
      return target[prop];
    },
  });

  /* What the models wrote in Kevin's month (docs/final-evaluation/test1-05-excuse-maker.md, problems 7 and 10). */
  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (_system: string, _history: any[], schema: any) => {
      if (schema === THE_PICTURE_SCHEMA) {
        return {
          opening: 'Two of two people have answered.',
          perPerson: [
            { participantId: 'pid-1', text: 'The initiator agreed the pilot\'s parts and dates in the kick-off on Monday 5 October. The objective for the pilot is 10 shops.', headline: null },
            { participantId: 'pid-2', text: `${KEVINS_LABEL} is waiting for the final prices, and has raised it higher. ${KEVINS_LABEL} has not finished the catalogue.`, headline: null },
          ],
        };
      }
      if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) {
        return {
          theGap: `The objective for the pilot is 10 shops. ${KEVINS_LABEL} has not finished the catalogue that was due on 16 October.`,
          whatTheNumbersSay: [],
          whatToDo: [{ move: `Ask ${KEVINS_LABEL} when the catalogue will be finished.`, because: 'It was due on 16 October.', startWith: KEVINS_LABEL }],
          whatThisCannotTellYou: [],
          whatWeFailedToAsk: [],
        };
      }
      return {
        sharedPicture: 'The pilot goes live on 20 November. If the plan for 24 shops holds, the work could meet the 10-shop objective.',
        agreements: [],
        divergences: [],
        centralQuestion: 'What should come first now?',
      };
    }),
  };

  const service = new ReportsService(prisma, { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) } as any, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  return { service, upserts };
}

function everyString(v: any, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
}

describe('a report holds no claim the record does not, for every reader', () => {
  let stored: any;
  let served: Record<'wairimu' | 'kevin' | 'admin', any>;

  beforeAll(async () => {
    const h = harness();
    await h.service.synthesize('g-pilot');
    expect(h.upserts.length).toBe(1);
    stored = h.upserts[0].create;
    const ground = { scenario: 'DRIFT', peersVisibleToEachOther: true, participants: PARTICIPANTS, report: { ...stored, sharedAs: null } };
    served = {
      wairimu: h.service.theReportAsItWasShared(ground, 'pid-1', true),
      kevin: h.service.theReportAsItWasShared(ground, 'pid-2', false),
      admin: h.service.theReportAsItWasShared(ground, null, false),
    };
  });

  for (const who of ['wairimu', 'kevin', 'admin'] as const) {
    it(`${who} reads no ten-shop objective and no escalation nobody made`, () => {
      const all = everyString(served[who]).join('\n');
      expect(all).not.toMatch(/10[- ]shop|10 shops/);
      expect(all).not.toMatch(/raised it higher/);
    });
  }

  it('what the record does hold is still there, for every reader', () => {
    expect(stored.sharedPicture).toContain('The pilot goes live on 20 November.');
    for (const who of ['wairimu', 'kevin', 'admin'] as const) {
      expect(everyString(served[who]).join('\n')).toContain('The pilot goes live on 20 November.');
    }
    expect(everyString(served.wairimu).join('\n')).toMatch(/Kevin Odhiambo has not finished the catalogue/);
    expect(everyString(served.kevin).join('\n')).toMatch(/You have not finished the catalogue/);
  });

  it('the stored report holds neither claim, so no other read of it can serve one', () => {
    const all = everyString(stored).join('\n');
    expect(all).not.toMatch(/10[- ]shop|10 shops|raised it higher/);
  });
});
