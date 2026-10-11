import { AssistantService } from './assistant.service';
import { whatKindOfThingWasSaid } from './what-kind-of-thing-was-said';
import { proposalFrom } from '../grounds/what-the-context-chat-heard';

/**
 * Found on the first live run of Context in Ask on wip/release (10 October 2026):
 *  - "Miriam is struggling and honestly she is difficult to work with." was answered "I will set this to run until you end it."
 *  - a fact holding a bank number, typed after a say-back had been left waiting on another check-in, was answered
 *    "I cannot answer that one yet", because the waiting say-back was dropped and the words were answered again
 *    without the check-in they were typed on.
 */
describe('a worry about a person', () => {
  const said = 'Miriam is struggling and honestly she is difficult to work with.';
  it('is not kept as a private note when the model reads it as one, because the lead did not ask for a note', async () => {
    const heard = await whatKindOfThingWasSaid({ extract: async () => ({ kind: 'private_note', text: said, about: 'Miriam' }) } as any, said, null);
    expect(heard).toEqual({ kind: 'answer' });
  });
  it('a note the lead asks for is still a note', async () => {
    const m = 'Miriam keeps missing the Friday call and I want to remember that, just for me.';
    const heard = await whatKindOfThingWasSaid({ extract: async () => ({ kind: 'private_note', text: m, about: 'Miriam' }) } as any, m, null);
    expect(heard.kind).toBe('private_note');
  });
  it('is never read as "run until you end it" because the model set that flag', () => {
    const p: any = proposalFrom('timeline', { runsUntilEnded: true } as any, [], said);
    expect(p.kind).toBe('none');
    const q: any = proposalFrom('timeline', { runsUntilEnded: true } as any, [], 'Keep it open, no set length.');
    expect(q).toMatchObject({ kind: 'timeline', untilEnded: true, say: 'I will set this to run until you end it.' });
  });
});

describe('a fact with a bank number, typed on a check-in after a say-back was left waiting on another', () => {
  it('is met on the check-in it was typed on, with the number hidden, and not answered "I cannot answer that one yet"', async () => {
    const parked = { id: 'old', kind: 'context', state: 'PARKED', payload: { groundId: 'other-ground', said: 'x', history: [] } };
    const proposals: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: async () => null },
      person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', displayName: 'Wanjiru' })) },
      user: { findUnique: jest.fn(async () => ({ role: 'LEAD', organizationId: 'org-a' })) },
      ground: { findMany: jest.fn(async () => [{ id: 'g1', label: 'Bank', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'NEW_PROJECT', participants: [] }]), findFirst: jest.fn(async () => ({ id: 'g1', label: 'Bank', initiatorId: 'lead-1', organizationId: 'org-a', participants: [] })) },
      groundParticipant: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => ({ id: 'gp' })) },
      groundDocument: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: {
        findFirst: jest.fn(async () => (proposals.length === 0 && !(prisma as any).__dropped ? parked : null)),
        create: jest.fn(async ({ data }: any) => { const p = { id: `pr${proposals.length + 1}`, state: 'PARKED', ...data }; proposals.push(p); return p; }),
        update: jest.fn(async () => { (prisma as any).__dropped = true; return {}; }),
      },
      subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    };
    const engine: any = {
      respond: jest.fn(async () => { throw new Error('off'); }),
      extract: jest.fn(async () => ({ kind: 'fact', text: 'Suppliers are paid into account number [account number hidden] at Stanbic Bank, every Friday.' })),
    };
    const groundsService: any = { contextChat: jest.fn(), mayOpenSetupChatFor: jest.fn(async () => true), questionsForPeople: jest.fn(async () => []) };
    const truth: any = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
    const service = new AssistantService(
      prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
      { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
      { pendingFor: async () => [], decide: async () => { throw new Error('no'); } } as any, { start: async () => { throw new Error('no'); } } as any,
      truth, { read: async () => ({ read: false, because: 'no' }) } as any, { sendRoundDigest: async () => { throw new Error('no'); } } as any, groundsService,
    );
    const r: any = await service.respond('org-a', 'p1', 'Suppliers are paid into account number 0123456789012 at Stanbic Bank, every Friday, so nobody needs to chase.', 'g1', true);
    const words = (r.blocks ?? []).map((b: any) => b.body ?? b.summary ?? '').join(' / ');
    expect(words).not.toMatch(/cannot answer that one yet/i);
    expect(words).not.toMatch(/0123456789012/);
    expect(words).toMatch(/^Shall I add ".*\[account number hidden\].*" to this check-in's context as a note\?/);
  });
});
