import { ReportsService } from './reports.service';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';

/**
 * A DIFFERENCE IS ONLY EVER WITHIN ONE WEEK, END TO END (Hafsah, 12 October 2026; night quality run 2).
 *
 * The record goes in with the weeks Collins said each figure in, the stand-in model writes what the
 * models wrote on the lead's board ("first reporting nine or ten and later saying it was four or
 * five": four or five was the week of 12 October, nine or ten the week of 19 October), and the stored
 * report is served to Esther (the lead), to Collins, and to an admin. What each of them reads is checked.
 */
const BRIEF = 'Kit sales in Kisumu, Kisii and Homa Bay this quarter.';
const WEEK_3 = new Date('2026-10-14T15:00:00Z');
const WEEK_4 = new Date('2026-10-21T15:00:00Z');
const PARTICIPANTS = [
  {
    id: 'pid-1', partyType: 'INITIATOR', createdAt: new Date('2026-09-20'), userId: 'uid-1', email: 'esther@kits.test',
    roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Esther', lastName: 'Wanjiku', email: 'esther@kits.test' },
  },
  {
    id: 'pid-2', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-21'), userId: 'uid-2', email: 'collins@kits.test',
    roleAsDescribed: 'Field sales.', remitAsGiven: 'Field sales.', managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Collins', lastName: 'Odhiambo', email: 'collins@kits.test' },
  },
];
const COLLINS = 'Participant A';
const FOUR_OR_FIVE = 'Honestly eleven was rounding up, it is lower, maybe four or five.';
const NINE_OR_TEN = 'Last week I did nine, maybe ten, so I know it works.';
const RECORD_ROWS = [
  { id: 'r1', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 3, completedAt: WEEK_3 }, type: 'PROGRESS', text: FOUR_OR_FIVE, disputedAt: null, saidWordForWord: true, createdAt: WEEK_3 },
  { id: 'r2', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 4, completedAt: WEEK_4 }, type: 'PROGRESS', text: NINE_OR_TEN, disputedAt: null, saidWordForWord: true, createdAt: WEEK_4 },
];

function harness() {
  const upserts: any[] = [];
  const any = () => jest.fn(async () => [] as any[]);
  const prisma: any = new Proxy({
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: any() },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g-kits', initiatorId: 'uid-1', organizationId: 'o1', scenario: 'DRIFT', label: 'WhatsApp ordering pilot',
        brief: BRIEF, peopleWorkTogether: true, participants: PARTICIPANTS, leadContextNotes: [],
      })),
      update: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o1' })) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => (args?.select?.checkIns ? PARTICIPANTS.map((p) => ({ ...p, checkIns: [] })) : PARTICIPANTS)),
      findFirst: jest.fn(async () => null),
    },
    recordEntry: {
      findMany: jest.fn(async (args: any) => RECORD_ROWS.filter((r) => !(args?.where?.disputedAt === null && r.disputedAt))),
      count: jest.fn(async () => RECORD_ROWS.length),
    },
    groundDependency: { findMany: jest.fn(async () => [{ triedSaid: null, what: 'the final prices', fromParticipantId: 'pid-2', onParticipantId: null, onLabel: 'Fatuma', status: 'WAITING', createdAt: new Date('2026-10-11'), escalatedAt: new Date('2026-10-25') }]), count: jest.fn(async () => 1) },
    checkIn: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async () => [
        { participantId: 'pid-1', sessionNumber: 2, status: 'COMPLETED', turns: [] },
        { participantId: 'pid-2', sessionNumber: 2, status: 'COMPLETED', turns: [] },
      ]),
      findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 2 })),
    },
    groundDocument: { count: jest.fn(async () => 0), groupBy: any(), findMany: any() },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    report: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1', groundId: 'g-kits', ...a.create }; }),
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

  /* What the models wrote on the lead's board in night run 2. */
  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (_system: string, _history: any[], schema: any) => {
      if (schema === THE_PICTURE_SCHEMA) {
        return {
          opening: 'Two of two people have answered.',
          perPerson: [
            { participantId: 'pid-2', text: `${COLLINS} has given different numbers for last week's sales, first reporting nine or ten and later saying it was four or five. ${COLLINS} has set a target of twelve kits for this week.`, headline: null },
          ],
        };
      }
      if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) {
        return { theGap: '', whatTheNumbersSay: [], whatToDo: [], whatThisCannotTellYou: [], whatWeFailedToAsk: [] };
      }
      return {
        sharedPicture: 'Kits are selling in Kisii town.',
        agreements: [],
        divergences: [{ topic: `${COLLINS} first reported nine or ten kits, but later said it was four or five.`, positions: [] }],
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

describe('a difference is only ever within one week, as each reader reads it', () => {
  let stored: any;
  let served: Record<'esther' | 'collins' | 'admin', any>;

  beforeAll(async () => {
    const h = harness();
    await h.service.synthesize('g-kits');
    expect(h.upserts.length).toBe(1);
    stored = h.upserts[0].create;
    const ground = { scenario: 'DRIFT', peersVisibleToEachOther: true, participants: PARTICIPANTS, report: { ...stored, sharedAs: null } };
    served = {
      esther: h.service.theReportAsItWasShared(ground, 'pid-1', true),
      collins: h.service.theReportAsItWasShared(ground, 'pid-2', false),
      admin: h.service.theReportAsItWasShared(ground, null, false),
    };
  });

  for (const who of ['esther', 'collins', 'admin'] as const) {
    it(`${who} never reads the two weeks merged into one contradiction`, () => {
      const all = everyString(served[who]).join('\n');
      expect(all).not.toMatch(/different numbers|first reporting|later saying|later said/);
    });
  }

  it('Esther reads the change over time, each week named, the earlier week first', () => {
    const all = everyString(served.esther).join('\n');
    expect(all).toContain('In the week of 12 October, Collins Odhiambo said, “Honestly eleven was rounding up, it is lower, maybe four or five”. In the week of 19 October, Collins said, “Last week I did nine, maybe ten, so I know it works”.');
  });

  it('Collins reads it about himself', () => {
    const all = everyString(served.collins).join('\n');
    expect(all).toMatch(/In the week of 12 October, you said, “Honestly eleven was rounding up/i);
  });

  it('the stored report holds no difference across two weeks, so no other read can serve one', () => {
    expect(stored.divergences ?? []).toEqual([]);
    expect(everyString(stored).join('\n')).not.toMatch(/first reporting|later saying|later said/);
  });
});
