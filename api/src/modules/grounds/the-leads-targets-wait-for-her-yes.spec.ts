import { ConversationService } from '../conversation/conversation.service';
import { EXPECTATION_PROMPT } from '../conversation/prompt-library';
import { APlanIsManyProposalsService } from './a-plan-is-many-proposals.service';
import { FROM_YOUR_CHECK_IN, theTargetAsALine, theWordsItCameFrom } from './the-leads-targets-wait-for-her-yes';
import { PartyType, TurnRole } from '@prisma/client';

/**
 * THE TARGETS FROM THE LEAD'S OWN WORDS WAIT FOR HER YES, AS ONE CARD (Hafsah, 18 October 2026).
 *
 * Grace, who runs Drop Access's sales check-in, says in her check-in: "The team is aiming to sell 120 water dispensers by 30
 * October. Kevin, Mercy and Joseph each sell 40." With Release 1's sales board on, nothing goes on the record from that: each target
 * waits, with her sentence, until she confirms. With it off, the targets are written as before. Kevin's own promises are unchanged.
 */
const GRACE_SAYS = 'The team is aiming to sell 120 water dispensers by 30 October. Kevin, Mercy and Joseph each sell 40.';
const participants = [
  { id: 'p-grace', partyType: PartyType.INITIATOR, managingOnly: false, email: 'grace@dropaccess.test', roleAsDescribed: null, createdAt: new Date('2026-10-12'), user: { firstName: 'Grace', lastName: 'Achieng' } },
  { id: 'p-kevin', partyType: PartyType.PARTICIPANT, managingOnly: false, email: 'kevin@dropaccess.test', roleAsDescribed: null, createdAt: new Date('2026-10-12'), user: { firstName: 'Kevin', lastName: 'Omondi' } },
];

function theWriter(releaseOne: boolean) {
  const held: any[] = [];
  const written: any[] = [];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ participants, peopleWorkTogether: true, kindOfWork: 'sales team', organizationId: 'org1', initiatorId: 'u-grace' })) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: releaseOne })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: GRACE_SAYS }]) },
    groundObjective: { count: jest.fn(async () => 0), findMany: jest.fn(async () => [] as any[]), createMany: jest.fn(async (a: any) => { written.push(...a.data); return { count: a.data.length }; }), update: jest.fn(async () => ({})) },
    planProposal: { findMany: jest.fn(async () => held.map((h) => ({ fields: h.fields }))), create: jest.fn(async (a: any) => { held.push(a.data); return { id: `h${held.length}`, ...a.data }; }) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })), updateMany: jest.fn(async () => ({ count: 0 })) };
      }
      return target[prop];
    },
  });
  const anthropic: any = {
    extract: jest.fn(async (prompt: string) => (prompt === EXPECTATION_PROMPT
      ? {
        expectations: [{ personName: 'Kevin', targetNumber: 40, expectation: 'Kevin sells 40 water dispensers by 30 October.', awareness: 'TOLD', kind: 'TARGET', check: 'A_NUMBER' }],
      }
      : { promises: [] })),
  };
  const svc = new ConversationService(prisma, {} as any, anthropic, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { svc, held, written };
}

/* Her check-in, read: the team's aim as her assessment read it (one source, 2 November 2026), kept by the one writer of the team's
   aims, and what she expects of each person, read as before. */
async function heard(svc: any, checkInId: string) {
  await svc.keepTheTeamsAims('g1', 'p-grace', [{ name: 'Water dispensers sold by 30 October', target: 120 }], [GRACE_SAYS]);
  await svc.extractExpectations(checkInId, 'p-grace', 'g1');
}

describe('Grace\'s targets, read from her check-in', () => {
  it('with Release 1 on, nothing goes on the record: the team\'s 120 and Kevin\'s 40 wait for her yes, each with her own sentence', async () => {
    const { svc, held, written } = theWriter(true);
    await heard(svc, 'c1');
    expect(written).toEqual([]);
    expect(held.map((h) => [h.kind, h.fromDocument, h.fields.what, h.fields.number, h.fields.participantId ?? null])).toEqual([
      ['GOAL', FROM_YOUR_CHECK_IN, 'Water dispensers sold by 30 October', 120, null],
      ['GOAL', FROM_YOUR_CHECK_IN, expect.stringContaining('Kevin sells 40 water dispensers'), 40, 'p-kevin'],
    ]);
    expect(held[0].fromThePlan).toBe('The team is aiming to sell 120 water dispensers by 30 October.');
    expect(held[1].fromThePlan).toBe('Kevin, Mercy and Joseph each sell 40.');
    expect(held[0].says).toBe('The team’s target is 120 water dispensers sold by 30 October.');
    expect(held[1].says).toBe('Kevin sells 40 water dispensers by 30 October. The number is 40.');
  });
  it('and the same targets said again are not held twice', async () => {
    const { svc, held } = theWriter(true);
    await heard(svc, 'c1');
    await heard(svc, 'c2');
    expect(held).toHaveLength(2);
  });
  it('with Release 1 off, they are written as before', async () => {
    const { svc, held, written } = theWriter(false);
    await heard(svc, 'c1');
    expect(held).toEqual([]);
    expect(written.map((w) => w.target)).toEqual(expect.arrayContaining([120, 40]));
  });
});

describe('the card, as Grace reads it and answers it', () => {
  const row = (more: Record<string, any> = {}) => ({
    id: 'h1', groundId: 'g1', kind: 'GOAL', says: 'Kevin Omondi’s target is 40 water dispensers sold by 30 October.',
    fields: { what: 'water dispensers sold by 30 October', number: 40, participantId: 'p-kevin', personName: 'Kevin Omondi', personOnTheCheckIn: 'Kevin Omondi' },
    fromThePlan: 'Kevin, Mercy and Joseph each sell 40.', fromDocument: FROM_YOUR_CHECK_IN, status: 'PENDING', editedAt: null, createdAt: new Date('2026-10-12T09:00:00Z'), ...more,
  });
  function thePlans(stored: any) {
    const made: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1', initiatorId: 'u-grace', status: 'ACTIVE', endState: null, scenario: 'OKR_ALIGNMENT', participants: participants.map((p) => ({ ...p, userId: p.id === 'p-grace' ? 'u-grace' : 'u-kevin', nameGiven: null, leftAt: null, managingOnly: p.id === 'p-grace' })) })) },
      planProposal: {
        findMany: jest.fn(async () => [stored]),
        findFirst: jest.fn(async () => stored),
        update: jest.fn(async ({ data }: any) => Object.assign(stored, data)),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    const board = { createObjective: jest.fn(async (_g: string, _u: string, o: any) => { made.push(o); return { id: 'o-new' }; }) };
    const svc = new APlanIsManyProposalsService(prisma, {} as any, { get: () => false } as any, { get: () => board } as any);
    return { svc, made };
  }
  it('Grace reads it as from her check-in, with her sentence and the target as it would go on record', async () => {
    const { svc } = thePlans(row());
    const { proposals } = await svc.waiting('g1', 'u-grace');
    expect(proposals[0]).toMatchObject({ fromYourCheckIn: true, saidOn: '2026-10-12', says: 'Kevin Omondi’s target is 40 water dispensers sold by 30 October.', fromThePlan: 'Kevin, Mercy and Joseph each sell 40.' });
  });
  it('Kevin is never shown it: only the lead reads a waiting card', async () => {
    const { svc } = thePlans(row());
    await expect(svc.waiting('g1', 'u-kevin')).rejects.toThrow('Only the person who runs this check-in');
  });
  it('she corrects the number, and her correction is what it is kept with', async () => {
    const stored = row();
    const { svc } = thePlans(stored);
    const got = await svc.edit('g1', 'u-grace', 'h1', { fields: { what: 'water dispensers sold by 30 October', number: 45 } as any });
    expect(got.says).toBe('Kevin Omondi’s target is 45 water dispensers sold by 30 October.');
    expect(stored.fromThePlan).toBe('Kevin Omondi’s target is 45 water dispensers sold by 30 October.');
  });
  it('her yes puts the target on record, as the board writes one', async () => {
    const { svc, made } = thePlans(row());
    await svc.confirm('g1', 'u-grace', 'h1');
    expect(made).toEqual([expect.objectContaining({ name: 'water dispensers sold by 30 October', target: 40, ownerParticipantId: 'p-kevin' })]);
  });
});

describe('the words underneath', () => {
  it('a target is held with the sentence of hers that holds its number', () => {
    expect(theWordsItCameFrom({ name: 'New leads this week', target: 30, ownerParticipantId: null, personName: null }, ['We open 30 new leads every week. Each rep sells 40.'])).toBe('We open 30 new leads every week.');
    expect(theWordsItCameFrom({ name: 'New leads this week', target: 30, ownerParticipantId: null, personName: null }, ['Each rep sells 40.'])).toBeNull();
  });
  it('a target already said as a sentence keeps the sentence, and says its number', () => {
    expect(theTargetAsALine({ name: 'The team is aiming for each rep to open 10 new leads each week', target: 10, ownerParticipantId: null, personName: null }))
      .toBe('The team is aiming for each rep to open 10 new leads each week. The number is 10.');
  });
  it('a target said as a thing to do reads as what it counts, its number said once (Drop Access re-read, 22 November)', () => {
    expect(theTargetAsALine({ name: 'Sell 8 freezers per week', target: 8, ownerParticipantId: 'p-brian', personName: 'Brian Otieno' })).toBe('Brian Otieno’s target is 8 freezers per week.');
    expect(theTargetAsALine({ name: 'Activate 4 Drop Access points per week', target: 4, ownerParticipantId: 'p-brian', personName: 'Brian Otieno' })).toBe('Brian Otieno’s target is 4 Drop Access points per week.');
  });
});
