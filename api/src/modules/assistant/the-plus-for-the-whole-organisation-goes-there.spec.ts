import { AssistantService } from './assistant.service';

/**
 * Local test of staging, 15 October. Hafsah, an admin of Drop Access who runs "Sales check-in", pressed Ask's "+" while
 * that check-in's setup conversation was waiting on her. Ask sent "I want to add a document for the whole organisation."
 * and she read "It will go on "Sales check-in", and only you will be able to see it until you say otherwise." What it says
 * must match where it goes: an admin who says it is for the whole organisation is offered the organisation's own document.
 */
function svc(extract: (message: string) => any, opts: { parked?: any; admin?: boolean } = {}) {
  const proposals: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', displayName: 'Tendai' })) },
    user: { findUnique: jest.fn(async () => ({ role: opts.admin ? 'ADMIN' : 'LEAD', organizationId: 'org-a' })) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: opts.admin ? 'ADMIN' : 'LEAD' })), findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Drop Access' })) },
    ground: {
      findMany: jest.fn(async () => [{ id: 'g1', label: 'Kijani deliveries', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'NEW_PROJECT', participants: [] }]),
      findFirst: jest.fn(async () => ({ id: 'g1', label: 'Kijani deliveries', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'NEW_PROJECT', participants: [] })),
    },
    groundParticipant: {
      findMany: jest.fn(async () => [{ id: 'gp1', nameGiven: 'Amani', user: { firstName: 'Amani', lastName: 'Wekesa' } }]),
      findFirst: jest.fn(async () => ({ id: 'gp-lead' })),
    },
    groundDocument: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr${proposals.length + 1}`, state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async () => ({})),
    },
    commitment: { create: jest.fn(), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const engine: any = {
    respond: jest.fn(async () => { throw new Error('model off for these tests'); }),
    extract: jest.fn(async (_s: string, history: any[]) => extract(String(history[0]?.content ?? ''))),
  };
  const contextChat = jest.fn(async () => ({ reply: 'How long should this run?', gaps: ['timeline'], done: false, proposal: null, openQuestion: 'How long should this run?' }));
  const addContextLine = jest.fn(async () => ({}));
  const groundsService: any = { contextChat, addContextLine, applyContextProposal: jest.fn(), mayOpenSetupChatFor: jest.fn(async () => true), questionsForPeople: jest.fn(async () => []), addLeadContext: jest.fn(async () => ({})) };
  const truth: any = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('no'); } } as any, { start: async () => { throw new Error('no'); } } as any,
    truth, { read: async () => ({ read: false, because: 'no' }) } as any, { sendRoundDigest: async () => { throw new Error('no'); } } as any, groundsService,
  );
  return { service, proposals, engine, contextChat, addContextLine, groundsService };
}
const said = (r: any) => (r.blocks ?? []).filter((b: any) => b.type !== 'proposal').map((b: any) => b.body ?? b.label ?? '').filter(Boolean).join(' / ');
const parkedTurn = { id: 'pt', kind: 'context_turn', state: 'PARKED', payload: { groundId: 'g1', history: [{ role: 'assistant', content: 'How long should this run?' }] } };
const FOR_EVERYONE = 'I want to add a document for the whole organisation.';

describe('the "+" for the whole organisation, with a check-in\'s setup conversation waiting', () => {
  it('an admin is offered the organisation\'s own document, never a check-in', async () => {
    const { service } = svc(() => ({ kind: 'answer' }), { parked: parkedTurn, admin: true });
    const r: any = await service.respond('org-a', 'p1', FOR_EVERYONE);
    console.log(`HAFSAH READS: ${said(r)}`);
    expect(said(r)).not.toMatch(/It will go on/);
    const step = r.blocks.find((b: any) => b.type === 'next_step');
    expect(step).toMatchObject({ label: 'Choose a file', id: 'organisation' });
    expect(said(r)).toMatch(/Drop Access/);
  });

  it('a lead who is not an admin still puts it on the check-in she runs, and is told so', async () => {
    const { service } = svc(() => ({ kind: 'answer' }), { parked: parkedTurn, admin: false });
    const r: any = await service.respond('org-a', 'p1', FOR_EVERYONE);
    expect(said(r)).toMatch(/It will go on "Kijani deliveries"/);
  });

  it('"I want to add a document" alone, from an admin, still goes on the check-in being set up', async () => {
    const { service } = svc(() => ({ kind: 'answer' }), { parked: parkedTurn, admin: true });
    const r: any = await service.respond('org-a', 'p1', 'I want to add a document.');
    expect(said(r)).toMatch(/It will go on "Kijani deliveries"/);
  });
});
