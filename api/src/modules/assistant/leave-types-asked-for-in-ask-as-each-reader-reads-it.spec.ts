import { AssistantService } from './assistant.service';
import { aLeaveOrganisation, TODAY } from '../suites/a-leave-organisation-for-specs';
import { textOf } from './request-92-harness';
import { sendLeave } from '../suites/leave-said-in-chat';

/**
 * TYPES OF LEAVE ASKED FOR IN ASK (Hafsah, 20 November 2026). The model reads which type is meant; the leave rules count the days by
 * the person's calendar and say it back; nothing is sent before the yes. Aisha Otieno, a member in Sales whose manager is Wairimu,
 * on Monday 5 October 2026, at Baridi Appliances, whose policy has annual leave (21 days a year, two weeks' notice), sick leave
 * (10 days a year, no notice, a sick note after two days), compassionate leave (5 days each time, no notice) and maternity leave
 * (90 days each time, every day counting).
 */

const POLICY = {
  kinds: [
    { name: 'Annual leave', days: 21, noticeDays: 14 },
    { name: 'Sick leave', days: 10, noticeDays: 0, document: 'a sick note', documentAfterDays: 2 },
    { name: 'Compassionate leave', days: 5, per: 'occasion', noticeDays: 0, paid: true },
    { name: 'Maternity leave', days: 90, per: 'occasion', everyDay: true, paid: true, adoptive: true },
  ],
};

/** The model's reading of each message: which type, whether only the first day was said, and what they want. */
const READ: Record<string, { request?: any; means?: any }> = {
  'i need sick leave tomorrow': { request: { kind: 'sick' } },
  'can I take compassionate leave, my uncle passed': { request: { kind: 'compassionate' }, means: { kind: 'wants', guide: 'ask_for_leave' } },
  'I want to start maternity leave on 3 March': { request: { kind: 'maternity', onlyTheStart: true, startsOn: '2027-03-03', endsOn: '2027-03-03' } },
  'how many sick days do I have left': { request: { kind: 'sick' }, means: { kind: 'question', guide: 'how_many_days_left' } },
};

function asAisha() {
  const o = aLeaveOrganisation({ rules: POLICY });
  /* Aisha took two sick days in September, approved. */
  o.rows.push({ id: 'r-sick', organizationId: 'org-baridi', userId: 'u-aisha', startsOn: new Date('2026-09-14T00:00:00Z'), endsOn: new Date('2026-09-15T00:00:00Z'), kind: 'sick', status: 'approved', standInUserId: null, decidedById: 'u-wairimu', decidedAt: TODAY });
  const proposals: any[] = [];
  const p = o.prisma;
  const findPerson = p.person.findFirst;
  /* Ask finds the person by their roster id. */
  p.person.findFirst = jest.fn(async (args: any) => {
    if (args?.where?.id) return { ...(await findPerson({ where: { externalId: `p-${String(args.where.id).slice(4)}` } })), id: args.where.id };
    const found = await findPerson(args);
    return found ? { ...found, id: `pid-${found.linkedUserId.slice(2)}` } : null;
  });
  const findUser = p.user.findUnique;
  p.user.findUnique = jest.fn(async (args: any) => ({ ...((await findUser(args)) ?? {}), role: 'MEMBER', organizationId: 'org-baridi' }));
  Object.assign(p, {
    platformSetting: { findUnique: async () => null },
    ground: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    groundParticipant: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => []) },
    assistantProposal: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => { const r = { id: `pr${proposals.length + 1}`, state: 'PARKED', ...data }; proposals.push(r); return r; }),
      update: jest.fn(async ({ data }: any) => data),
    },
    groundContextItem: { findMany: jest.fn(async () => []) },
    commitment: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    checkIn: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi Appliances' })) },
    companyPicture: { findUnique: jest.fn(async () => null) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  });
  const engine = {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (_prompt: string, h: any[], tool: any) => {
      const content = String(h[0]?.content ?? '');
      const said = Object.keys(READ).find((m) => content.includes(m));
      if (!said) return null;
      if (tool?.name === 'the_request') return READ[said].request ?? null;
      if (tool?.name === 'what_they_mean') return READ[said].means ?? { kind: 'other' };
      return null;
    }),
  };
  const service = new AssistantService(
    p, engine as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any,
    { forPerson: async () => ({ sessions: { value: [] } }) } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendMeThat: async () => { throw new Error('none'); } } as any,
    { list: async () => [] } as any,
    undefined, undefined, o.leave, undefined, undefined, o.suites,
  );
  const says = async (message: string) => textOf(await service.respond('org-baridi', 'pid-aisha', message));
  return { o, says, proposals };
}

describe('types of leave asked for in Ask, as Aisha reads the reply', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: TODAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'clearImmediate', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  it('"i need sick leave tomorrow" is said back as sick leave, one working day, from her sick days, with no notice asked', async () => {
    const { says, proposals } = asAisha();
    expect(await says('i need sick leave tomorrow')).toBe(
      'You asked for sick leave on Tuesday 6 October, which is 1 working day. You have 8 days of sick leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    );
    expect(proposals.map((x) => x.payload)).toEqual([{ startsOn: '2026-10-06', endsOn: '2026-10-06', kind: 'sick' }]);
  });

  it('"can I take compassionate leave, my uncle passed" is told what compassionate leave is, and asked for the days', async () => {
    const { says, proposals } = asAisha();
    expect(await says('can I take compassionate leave, my uncle passed')).toBe(
      'You can take compassionate leave. Compassionate leave is up to 5 days each time it is taken. Compassionate leave is paid. Compassionate leave needs no notice. Tell me the first day and the last day you want off in one sentence, for example "I want leave from next Monday to next Wednesday". I will say it back to you, and send it only when you say yes.',
    );
    expect(proposals).toEqual([]);
  });

  it('"I want to start maternity leave on 3 March" runs the 90 days from that day, every day counting', async () => {
    const { says, proposals } = asAisha();
    expect(await says('I want to start maternity leave on 3 March')).toBe(
      'You asked for maternity leave from Wednesday 3 March to Monday 31 May, which is 90 days of leave. Nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    );
    expect(proposals.map((x) => x.payload)).toEqual([{ startsOn: '2027-03-03', endsOn: '2027-05-31', kind: 'maternity' }]);
  });

  it('"how many sick days do I have left" is answered for sick leave alone', async () => {
    const { says } = asAisha();
    expect(await says('how many sick days do I have left')).toBe('You have 8 days of sick leave left this year, out of 10.');
  });
});

describe('notice that is too short, as Aisha and then as Wairimu read it', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: TODAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'clearImmediate', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  it('is said plainly in the say-back, does not stop the request, and the approver reads the type and the notice', async () => {
    const o = aLeaveOrganisation({ rules: POLICY });
    /* Annual leave on Thursday 8 October, asked on Monday 5 October. */
    const said = await o.ask('u-aisha', '2026-10-08', '2026-10-08');
    expect(said.say).toBe('You asked for annual leave on Thursday 8 October, which is 1 working day. You have 21 days of annual leave left this year, and nobody else in Sales is off then. Annual leave needs two weeks’ notice, and this starts in three days. Shall I still send it to Wairimu?');
    /* The yes sends it with the type the say-back named, as Ask does with the parked say-back. */
    const told = await sendLeave(o.leave, o.prisma, o.as('u-aisha'), { startsOn: '2026-10-08', endsOn: '2026-10-08', kind: 'annual' });
    const row = o.rows[o.rows.length - 1];
    expect(told).toBe('I have sent your request for annual leave on Thursday 8 October to Wairimu. It is not approved until they decide, and you will see it under your leave.');
    expect(row).toMatchObject({ kind: 'annual', status: 'waiting' });
    const board = await o.leave.board(o.as('u-wairimu'), TODAY);
    const w = board.waiting.find((x) => x.id === row.id)!;
    expect(w.leaveKind).toBe('Annual leave');
    expect(w.said).toEqual(expect.arrayContaining([
      'Aisha asked for annual leave on Thursday 8 October, which is 1 working day.',
      'Aisha has 21 days of annual leave left.',
      'Annual leave needs two weeks’ notice, and Aisha asked three days before it starts.',
    ]));
  });
});
