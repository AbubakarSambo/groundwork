import { ForbiddenException } from '@nestjs/common';
import { aSetupConversation } from './request-92-harness';

/**
 * DECISION 75, ITEM 29: A COMPANY RULE SAID WHILE A SETUP QUESTION IS WAITING.
 *
 * Before: the lead was asked what doing well looks like and answered "Every quote over 1 million needs
 * Amina's sign-off, and doing well means every quote goes out within two days." The answer was said
 * back, and the rule was never offered for the organisation, because only one thing is said back at a
 * time and the answer took the turn. Now the answer is still said back, and the rule rides with it as
 * `thenOffer`, asked straight after the lead's yes or no. Kept only on a yes; offered once per rule.
 */
const RULE = "Every quote over 1 million needs Amina's sign-off";
const SAID = `${RULE}, and doing well means every quote goes out within two days.`;
const OFFER = `Shall I keep "${RULE}" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?`;

function aMemoryTable(seedRows: any[] = []) {
  const rows: any[] = [...seedRows];
  let n = 0;
  const match = (r: any, where: any) => Object.entries(where ?? {}).every(([k, v]: any) => (v && typeof v === 'object' && Array.isArray(v.in) ? v.in.includes(r[k]) : r[k] === v));
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

function aLeadAnswering(opts: { rows?: any[]; declinedThroughAskGroundwork?: boolean } = {}) {
  const memory = aMemoryTable(opts.rows);
  const { service } = aSetupConversation({
    /* Length and rhythm are set, so the question waiting is what doing well looks like. */
    ground: { organizationId: 'org1', timelineStated: true, cadenceStated: true },
    paste: null,
    extract: (_s, _h, tool) => {
      if (tool.name === 'company_wide_things') return { items: [{ kind: 'rule', text: RULE }] };
      if (tool.name === 'record_what_they_said') return { success: 'every quote goes out within two days' };
      return null;
    },
    seed: {
      organizationMemory: memory.table,
      groundParticipant: { findMany: async () => [{ id: 'pB', email: 'ben@x.test', user: { firstName: 'Ben', lastName: 'Otieno' } }] },
      assistantProposal: { findFirst: async ({ where }: any) => (opts.declinedThroughAskGroundwork && where.state === 'DECLINED' && where.summary === OFFER ? { id: 'ap1' } : null) },
    },
  });
  return { service, memory };
}
const say = (s: string, before: any[] = []) => [...before, { role: 'user' as const, content: s }];

describe('the lead, while the question about doing well is waiting', () => {
  it('reads the answer said back, and the rule is offered next, with nothing kept yet', async () => {
    const { service, memory } = aLeadAnswering();
    const out: any = await service.contextChat('g1', 'userLead', say(SAID), { yesOrNo: true });
    expect(out.proposal.gap).toBe('success');
    expect(out.proposal.say).toMatch(/every quote goes out within two days/);
    expect(out.proposal.thenOffer).toEqual({ gap: 'organisation_memory', say: OFFER, offerId: memory.rows[0].id });
    expect(memory.rows).toHaveLength(1);
    expect(memory.rows[0]).toMatchObject({ status: 'OFFERED', text: RULE });
  });

  it('a yes to the rule keeps it; nothing is kept without one', async () => {
    const { service, memory } = aLeadAnswering();
    const out: any = await service.contextChat('g1', 'userLead', say(SAID), { yesOrNo: true });
    expect(memory.rows.filter((r) => r.status === 'KEPT')).toEqual([]);
    const kept: any = await service.applyContextProposal('g1', 'userLead', { said: '', offerId: out.proposal.thenOffer.offerId });
    expect(kept.say).toBe(`I have kept "${RULE}" as a rule for the whole organisation. Later check-ins and Ask Groundwork can now use it. You can see it on the Company page.`);
    expect(memory.rows[0]).toMatchObject({ status: 'KEPT', keptById: 'userLead' });
  });

  it('a no keeps nothing at all', async () => {
    const { service, memory } = aLeadAnswering();
    const out: any = await service.contextChat('g1', 'userLead', say(SAID), { yesOrNo: true });
    const no: any = await service.declineContextOffer('g1', 'userLead', out.proposal.thenOffer.offerId);
    expect(no.say).toBe('I have not kept that for the organisation. It stays only on this check-in.');
    expect(memory.rows).toEqual([]);
  });
});

describe('offered once per rule', () => {
  it('not again once it was asked earlier in this conversation and declined', async () => {
    const { service, memory } = aLeadAnswering();
    const before = [{ role: 'user' as const, content: SAID }, { role: 'assistant' as const, content: OFFER }, { role: 'assistant' as const, content: 'I have not kept that for the organisation. It stays only on this check-in.' }];
    const out: any = await service.contextChat('g1', 'userLead', say(SAID, before), { yesOrNo: true });
    expect(out.proposal?.thenOffer).toBeUndefined();
    expect(out.proposal?.gap).not.toBe('organisation_memory');
    expect(memory.rows).toEqual([]);
  });

  it('not again after a no through Ask Groundwork, in a later conversation', async () => {
    const { service, memory } = aLeadAnswering({ declinedThroughAskGroundwork: true });
    const out: any = await service.contextChat('g1', 'userLead', say(SAID), { yesOrNo: true });
    expect(out.proposal.gap).toBe('success');
    expect(out.proposal.thenOffer).toBeUndefined();
    expect(memory.rows).toEqual([]);
  });

  it('not again once it is kept for the organisation, or while the offer is still waiting', async () => {
    for (const status of ['KEPT', 'OFFERED']) {
      const { service, memory } = aLeadAnswering({ rows: [{ id: 'k1', organizationId: 'org1', kind: 'rule', text: RULE, status }] });
      const out: any = await service.contextChat('g1', 'userLead', say(SAID), { yesOrNo: true });
      expect(out.proposal.thenOffer).toBeUndefined();
      expect(memory.rows).toHaveLength(1);
    }
  });
});

describe('who else', () => {
  it('a person on the check-in cannot have the setup conversation, or say yes to the rule', async () => {
    const { service, memory } = aLeadAnswering();
    const out: any = await service.contextChat('g1', 'userLead', say(SAID), { yesOrNo: true });
    await expect(service.contextChat('g1', 'userBen', say(SAID))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.applyContextProposal('g1', 'userBen', { said: '', offerId: out.proposal.thenOffer.offerId })).rejects.toBeInstanceOf(ForbiddenException);
    expect(memory.rows.filter((r) => r.status === 'KEPT')).toEqual([]);
  });
});
