import { GroundsService } from '../grounds/grounds.service';
import { AssistantService } from '../assistant/assistant.service';
import { WhatsAppAddOnService } from '../billing/whatsapp-add-on.service';
import { SCENARIO_FAMILY, BoardFamily } from '../board/board-families';
import { KINDS_OFFERED_AT_RELEASE, theBoardKindsOffered, aKindMayBeGiven, contextIsInAskGroundwork, theNewBillingPartsAreShown, theAnchorScenarioIsOn } from './what-is-hidden-at-release';

/**
 * WHAT THE RELEASE HIDES (decisions 78, 88 and 90): a hidden thing is not offered to anything NEW,
 * and a check-in or an organisation that already has it, or already uses the old way, is unchanged.
 */
const settings = (rows: Record<string, unknown>) => ({ platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key in rows ? { value: rows[where.key] } : null)) } });

describe('the anchor scenario switch (piece 0 of docs/anchor-scenario-plan.md)', () => {
  it('is off with no row, and off for any row that is not exactly on', async () => {
    expect(await theAnchorScenarioIsOn(settings({}))).toBe(false);
    for (const bad of ['yes', 1, { on: 'true' }, { on: false }, null, {}]) {
      expect(await theAnchorScenarioIsOn(settings({ 'release.anchorScenario': bad }))).toBe(false);
    }
    expect(await theAnchorScenarioIsOn({ platformSetting: { findUnique: async () => { throw new Error('down'); } } })).toBe(false);
  });
  it('is on only when the row says so', async () => {
    expect(await theAnchorScenarioIsOn(settings({ 'release.anchorScenario': { on: true } }))).toBe(true);
  });
});

describe('the three settings, with no row at all', () => {
  it('offer sales and engineering of the eleven kinds, and keep the context and billing parts off', async () => {
    const p = settings({});
    expect(await theBoardKindsOffered(p)).toEqual(['sales org', 'engineering release']);
    expect(await contextIsInAskGroundwork(p)).toBe(false);
    expect(await theNewBillingPartsAreShown(p)).toBe(false);
  });
  it('read a broken row as the default, never as everything on', async () => {
    const p = settings({ 'release.boardKindsOffered': 'nonsense', 'release.contextInAskGroundwork': 'yes', 'release.planAndBillingNewParts': { on: 'true' } });
    expect(await theBoardKindsOffered(p)).toEqual(['sales org', 'engineering release']);
    expect(await contextIsInAskGroundwork(p)).toBe(false);
    expect(await theNewBillingPartsAreShown(p)).toBe(false);
  });
  it('turn on when the row says so', async () => {
    const p = settings({ 'release.boardKindsOffered': { kinds: ['sales org', 'a law firm matter'] }, 'release.contextInAskGroundwork': { on: true }, 'release.planAndBillingNewParts': { on: true } });
    expect(await theBoardKindsOffered(p)).toEqual(['sales org', 'a law firm matter']);
    expect(await contextIsInAskGroundwork(p)).toBe(true);
    expect(await theNewBillingPartsAreShown(p)).toBe(true);
    expect(await aKindMayBeGiven(settings({}), 'a law firm matter', 'a law firm matter')).toBe(true);
    expect(await aKindMayBeGiven(settings({}), 'a law firm matter', null)).toBe(false);
  });
});

function grounds(ground: Record<string, any>, answer: any) {
  const updates: any[] = [];
  const prisma: any = {
    ...settings({}),
    ground: {
      findUnique: jest.fn(async () => ground),
      updateMany: jest.fn(async (a: any) => { const by = ground.kindOfWorkSetBy ?? null; if (by !== null && by !== 'read') return { count: 0 }; updates.push(a.data); Object.assign(ground, a.data); return { count: 1 }; }),
      update: jest.fn(async (a: any) => { updates.push(a.data); Object.assign(ground, a.data); return { id: 'g1', ...ground }; }),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
  };
  const anthropic: any = { extract: jest.fn(async () => answer) };
  return { svc: new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic), updates, ground };
}
const aCheckIn = (more: Record<string, any> = {}) => ({
  initiatorId: 'lead', organizationId: 'org1', scenario: 'NEW_PROJECT', createdByUserId: 'lead', participants: [],
  label: 'Our matter', brief: 'A dispute with a supplier.', kindOfWork: null, kindOfWorkSetBy: null, workStages: null, ...more,
});

describe('boards for kinds of work nobody uses yet', () => {
  it('does not let a lead give a NEW check-in a kind that is not offered, and says so in a sentence', async () => {
    const { svc, updates } = grounds(aCheckIn(), {});
    await expect(svc.setKindOfWork('g1', 'lead', { kind: 'a law firm matter' })).rejects.toThrow(
      'Groundwork does not offer that kind of work yet. Choose one of these: sales org, engineering release.',
    );
    expect(updates).toEqual([]);
  });
  it('lets a lead give a new check-in a kind that is offered', async () => {
    const { svc, updates } = grounds(aCheckIn(), {});
    await svc.setKindOfWork('g1', 'lead', { kind: 'sales org' });
    expect(updates).toEqual([{ kindOfWork: 'sales org', kindOfWorkSetBy: 'lead' }]);
  });
  it('lets a lead give a new check-in the engineering kind, which the project board uses', async () => {
    const { svc, updates } = grounds(aCheckIn(), {});
    await svc.setKindOfWork('g1', 'lead', { kind: 'engineering release' });
    expect(updates).toEqual([{ kindOfWork: 'engineering release', kindOfWorkSetBy: 'lead' }]);
  });
  it('lets the read at setup give a new project check-in the engineering kind', async () => {
    const { svc, updates } = grounds(aCheckIn({ label: 'Release by 30 September' }), { kind: 'engineering release' });
    await svc.readTheKindOfWork('g1');
    expect(updates).toEqual([{ kindOfWork: 'engineering release', kindOfWorkSetBy: 'read' }]);
  });
  it('does not let the read at setup pick a kind that is not offered', async () => {
    const { svc, updates } = grounds(aCheckIn(), { kind: 'a law firm matter' });
    await svc.readTheKindOfWork('g1');
    expect(updates).toEqual([{ kindOfWork: null, kindOfWorkSetBy: null }]);
  });
  it('leaves a check-in that already has a hidden kind exactly as it is, on a read and on a save of the same kind', async () => {
    const held = grounds(aCheckIn({ kindOfWork: 'a law firm matter', kindOfWorkSetBy: 'read' }), { kind: 'MarketView Q4' });
    await held.svc.readTheKindOfWork('g1');
    expect(held.updates).toEqual([]);
    expect(held.ground.kindOfWork).toBe('a law firm matter');
    const saved = grounds(aCheckIn({ kindOfWork: 'a law firm matter', kindOfWorkSetBy: 'lead' }), {});
    await saved.svc.setKindOfWork('g1', 'lead', { kind: 'a law firm matter', stages: ['Opened', 'Closed'] });
    expect(saved.ground.kindOfWork).toBe('a law firm matter');
  });
});

describe('the Context tab\'s move to Ask Groundwork', () => {
  function assistant(on: boolean) {
    const contextChat = jest.fn(async () => ({ reply: 'How long does this check-in run for?', gaps: ['duration'], done: false, proposal: null }));
    const prisma: any = {
      ...settings(on ? { 'release.contextInAskGroundwork': { on: true } } : {}),
      person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1' })) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-a' })) },
      ground: { findMany: jest.fn(async () => [{ id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'NEW_PROJECT' }]) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(), update: jest.fn() },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const grounds: any = { contextChat, applyContextProposal: jest.fn(), mayOpenSetupChatFor: jest.fn(async () => true), questionsForPeople: jest.fn(async () => []) };
    const service = new AssistantService(
      prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any,
      { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('x'); } } as any,
      { start: async () => { throw new Error('x'); } } as any,
      { forPerson: async () => { throw new Error('x'); } } as any,
      { read: async () => ({ read: false, because: 'x' }) } as any,
      { sendRoundDigest: async () => { throw new Error('x'); } } as any,
      grounds,
    );
    return { service, contextChat };
  }
  it('is not taken while hidden, even when the screen says it was opened from setup', async () => {
    const { service, contextChat } = assistant(false);
    const typed = await service.respond('org-a', 'p1', 'add this as context', 'g1');
    const fromSetup = await service.respond('org-a', 'p1', 'twelve weeks', 'g1', true);
    expect(typed.lane).toBe('unplaced');
    expect(fromSetup.lane).not.toBe('add_context');
    expect(contextChat).not.toHaveBeenCalled();
  });
  it('is taken when Hafsah turns it on', async () => {
    const { service, contextChat } = assistant(true);
    const r = await service.respond('org-a', 'p1', 'add this as context', 'g1');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalled();
  });
});

describe('plan and billing\'s new parts', () => {
  async function read(on: boolean, isAdmin: boolean) {
    const prisma: any = settings(on ? { 'release.planAndBillingNewParts': { on: true } } : {});
    const svc = new WhatsAppAddOnService(prisma, {} as any, {} as any);
    (svc as any).standing = async () => ({
      /* An organisation that pays for Starter: a free one is never told a plan's price (release blocker, 5 October). */
      sending: true, heldBecause: null, addOnOn: false, plan: 'STARTER', addOnCents: 2000, switchOn: false, onTheFreePlan: false,
      inAFreeRun: false, freeTrial: null, charged: false, limit: 100, sent: 3, month: '2026-10',
    });
    return svc.whatTheyRead('org1', isAdmin);
  }
  it('shows an admin the price, the use and the limit only when turned on', async () => {
    const hidden = await read(false, true);
    /* Whether WhatsApp is on, and why no reminder comes while it is off, is everybody's to read (screens gap, 5 October). */
    expect(hidden).toEqual({ on: false, sending: true, says: 'Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.' });
    expect(JSON.stringify(hidden)).not.toContain('costs');
    const shown = await read(true, true);
    expect((shown as any).says?.price).toContain('WhatsApp costs');
  });
  it('reads the same to everybody else, hidden or not', async () => {
    expect(await read(false, false)).toEqual(await read(true, false));
  });
});

describe('onboarding and project check-ins get their board without a kind', () => {
  it('puts a new hire, a new manager, a new advisor and a new project on their own boards', () => {
    expect(SCENARIO_FAMILY.NEW_HIRE).toBe(BoardFamily.ONBOARDING);
    expect(SCENARIO_FAMILY.NEW_MANAGER).toBe(BoardFamily.ONBOARDING);
    expect(SCENARIO_FAMILY.NEW_ADVISOR).toBe(BoardFamily.ONBOARDING);
    expect(SCENARIO_FAMILY.NEW_PROJECT).toBe(BoardFamily.DELIVERY);
  });
  it('offers nothing but the two kinds the paid client needs', () => {
    expect([...KINDS_OFFERED_AT_RELEASE]).toEqual(['sales org', 'engineering release']);
  });
});
