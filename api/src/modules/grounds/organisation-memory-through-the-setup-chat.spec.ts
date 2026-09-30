import { aSetupConversation } from './request-92-harness';
import { ForbiddenException } from '@nestjs/common';

/**
 * WEEK 20. THE SETUP CONVERSATION OFFERS TO KEEP WHAT IS TRUE OF THE WHOLE COMPANY, AND LEAVE DATES
 * GO TO THE LEAVE SUITE.
 *
 * Run through the real `GroundsService`, reading what the lead is told and what the tables hold.
 * The lead is `userLead`. A participant is `userBen`. Today is Thursday 1 October 2026.
 */
const RULE = "Every quote over 1 million needs Amina's sign-off";
const SAY_BACK = `Shall I keep "${RULE}" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?`;

function aMemoryTable() {
  const rows: any[] = [];
  let n = 0;
  const match = (r: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => r[k] === v);
  return {
    rows,
    table: {
      deleteMany: async ({ where }: any) => { const keep = rows.filter((r) => !match(r, where)); rows.splice(0, rows.length, ...keep); return { count: 0 }; },
      create: async ({ data }: any) => { const r = { id: `m${++n}`, keptAt: null, status: 'OFFERED', ...data }; rows.push(r); return r; },
      findFirst: async ({ where }: any) => rows.find((r) => match(r, where)) ?? null,
      findMany: async ({ where }: any) => rows.filter((r) => match(r, where)),
      update: async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data),
      delete: async ({ where }: any) => { rows.splice(rows.findIndex((r) => r.id === where.id), 1); },
    },
  };
}

function aLeadTalking(over: { heard?: any; ground?: any; suite?: any } = {}) {
  const memory = aMemoryTable();
  const { service, prisma, writes, anthropic } = aSetupConversation({
    ground: { organizationId: 'org1', ...(over.ground ?? {}) },
    paste: null,
    extract: (_s, _h, tool) => (tool.name === 'company_wide_things' ? (over.heard ?? { items: [{ kind: 'rule', text: RULE }] }) : null),
    seed: {
      organizationMemory: memory.table,
      groundParticipant: { findMany: async () => [{ id: 'pB', email: 'ben@x.test', user: { firstName: 'Ben', lastName: 'Otieno' } }] },
      organizationSuite: { findUnique: async () => over.suite ?? null },
    },
  });
  return { service, prisma, writes, anthropic, memory };
}

const say = (s: string) => [{ role: 'user' as const, content: s }];

describe('a rule the lead states is offered, and kept only on their yes', () => {
  it('is said back as its own question, in the lead\'s own words, and nothing is kept yet', async () => {
    const { service, memory } = aLeadTalking();
    const out: any = await service.contextChat('g1', 'userLead', say(`${RULE}.`), { yesOrNo: true });
    expect(out.proposal.gap).toBe('organisation_memory');
    expect(out.proposal.say).toBe(SAY_BACK);
    expect(memory.rows).toHaveLength(1);
    expect(memory.rows[0]).toMatchObject({ status: 'OFFERED', kind: 'rule', text: RULE, offeredById: 'userLead' });
    expect(memory.rows.filter((r) => r.status === 'KEPT')).toEqual([]);
  });

  it('the yes keeps it, marked with where it came from', async () => {
    const { service, memory } = aLeadTalking();
    const out: any = await service.contextChat('g1', 'userLead', say(`${RULE}.`), { yesOrNo: true });
    const kept: any = await service.applyContextProposal('g1', 'userLead', { said: `${RULE}.`, offerId: out.proposal.offerId });
    expect(kept.say).toBe(`I have kept "${RULE}" as a rule for the whole organisation. Later check-ins and Ask Groundwork can now use it. You can see it on the Company page.`);
    expect(memory.rows[0]).toMatchObject({ status: 'KEPT', keptById: 'userLead' });
    expect(memory.rows[0].sourceLine).toMatch(/^Picked up from your check-in on \d{1,2} [A-Z][a-z]+$/);
  });

  it('the no keeps nothing, and says so', async () => {
    const { service, memory } = aLeadTalking();
    const out: any = await service.contextChat('g1', 'userLead', say(`${RULE}.`), { yesOrNo: true });
    const no: any = await service.declineContextOffer('g1', 'userLead', out.proposal.offerId);
    expect(no.say).toBe('I have not kept that for the organisation. It stays only on this check-in.');
    expect(memory.rows).toEqual([]);
  });

  it('a person on the check-in cannot set it up, offer anything or say yes for the lead', async () => {
    const { service, memory } = aLeadTalking();
    const out: any = await service.contextChat('g1', 'userLead', say(`${RULE}.`), { yesOrNo: true });
    await expect(service.contextChat('g1', 'userBen', say(`${RULE}.`))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.applyContextProposal('g1', 'userBen', { said: 'yes', offerId: out.proposal.offerId })).rejects.toBeInstanceOf(ForbiddenException);
    expect(memory.rows.filter((r) => r.status === 'KEPT')).toEqual([]);
  });
});

describe('what is never offered', () => {
  it('a remark the lead asked to keep private', async () => {
    const { service, memory } = aLeadTalking({ heard: { items: [{ kind: 'rule', text: RULE }] } });
    const out: any = await service.contextChat('g1', 'userLead', say(`Keep this between us. ${RULE}.`), { yesOrNo: true });
    expect(out.proposal?.gap).not.toBe('organisation_memory');
    expect(memory.rows).toEqual([]);
  });

  it('a note about how a person on the check-in is doing, even if the model calls it a rule', async () => {
    const note = 'Ben is always late with every quote he sends';
    const { service, memory } = aLeadTalking({ heard: { items: [{ kind: 'rule', text: note }] } });
    const out: any = await service.contextChat('g1', 'userLead', say(`${note}.`), { yesOrNo: true });
    expect(out.proposal?.gap).not.toBe('organisation_memory');
    expect(memory.rows).toEqual([]);
  });

  it('a sentence the lead did not type, tidied by the model', async () => {
    const { service, memory } = aLeadTalking({ heard: { items: [{ kind: 'rule', text: 'Quotes above one million must be approved by Amina' }] } });
    const out: any = await service.contextChat('g1', 'userLead', say(`${RULE}.`), { yesOrNo: true });
    expect(out.proposal?.gap).not.toBe('organisation_memory');
    expect(memory.rows).toEqual([]);
  });

  it('and nothing is asked of the model about a turn that is only about this check-in', async () => {
    const { service, anthropic, memory } = aLeadTalking();
    await service.contextChat('g1', 'userLead', say('About three months, once a week.'), { yesOrNo: true });
    expect(anthropic.extract.mock.calls.some((c: any[]) => c[2]?.name === 'company_wide_things')).toBe(false);
    expect(memory.rows).toEqual([]);
  });
});

describe('leave dates said in the setup conversation go to the leave suite', () => {
  beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
  afterAll(() => jest.useRealTimers());

  const suiteOn = { isOn: true, answers: { days: 21, approver: 'Their manager' } };
  const withTheLeaveSuite = (t: ReturnType<typeof aLeadTalking>) => {
    const ask = jest.fn(async () => ({ id: 'l1' }));
    const leave = { mine: async () => ({ daysLeft: 16 }), ask };
    jest.spyOn(t.service as any, 'leaveSuite').mockReturnValue(leave);
    (t.prisma as any).person; // the Proxy answers null for what it was not given
    return ask;
  };

  it('with the suite on, it is said back and nothing is sent, kept or recorded before the yes', async () => {
    const t = aLeadTalking({ suite: suiteOn });
    const ask = withTheLeaveSuite(t);
    const out: any = await t.service.contextChat('g1', 'userLead', say('I need next Thursday and Friday off'), { yesOrNo: true });
    expect(out.proposal.gap).toBe('leave_request');
    expect(out.proposal.say).toBe('You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 16 days of leave left this year. Shall I send it to an admin to approve?');
    expect(ask).not.toHaveBeenCalled();
    expect(t.writes).toEqual([]);
    expect(t.memory.rows).toEqual([]);
  });

  it('the yes sends it through the leave suite, for those exact days, and keeps nothing else', async () => {
    const t = aLeadTalking({ suite: suiteOn });
    const ask = withTheLeaveSuite(t);
    const out: any = await t.service.applyContextProposal('g1', 'userLead', { said: 'I need next Thursday and Friday off', leave: true });
    expect(ask).toHaveBeenCalledWith('org1', 'userLead', { startsOn: '2026-10-08', endsOn: '2026-10-09' });
    expect(out.say).toBe('I have sent your leave request from Thursday 8 October to Friday 9 October to an admin. It is not approved until they decide, and you will see it under your leave.');
    expect(t.writes).toEqual([]);
    expect(t.memory.rows).toEqual([]);
  });

  it('with the suite off, it says so plainly and keeps nothing', async () => {
    const t = aLeadTalking({ suite: null });
    const ask = withTheLeaveSuite(t);
    const out: any = await t.service.contextChat('g1', 'userLead', say('I need next Thursday and Friday off'), { yesOrNo: true });
    expect(out.reply).toBe('Leave requests are not switched on in your organisation, so I have not sent or kept these dates. An admin can switch them on under Suites.');
    expect(out.proposal).toBeNull();
    expect(ask).not.toHaveBeenCalled();
    expect(t.writes).toEqual([]);
    expect(t.memory.rows).toEqual([]);
  });
});
