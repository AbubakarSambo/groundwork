import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

/**
 * #6: GET /admin/grounds/:groundId gives platform support a real screen for
 * an individual ground when a customer reports a problem - state, billing,
 * roster, check-in status, report state. The privacy boundary is the whole
 * point of this feature: it must NEVER return conversation content,
 * record-entry text, report content (not even "anonymized" synthesis),
 * lead notes, documents, or participant-request reason text. This spec
 * builds a mock ground row that DELIBERATELY includes every excluded field
 * (as if a careless future edit added `select: { text: true }` somewhere)
 * and asserts none of that content ever appears in the returned shape -
 * only counts/status/state.
 */

const GROUND_ROW = {
  id: 'g1',
  label: 'Test Ground',
  scenario: 'NEW_PROJECT',
  moment: 'STARTING',
  status: 'ACTIVE',
  cadence: 'FORTNIGHTLY',
  timelineDays: 90,
  startsAt: null,
  endsAt: null,
  createdAt: new Date('2026-01-01'),
  isFreeGround: true,
  freeReason: 'FREE_TIER',
  sessionsBalance: 1,
  billingActivatedAt: null,
  billingEnabled: false,
  paymentConfirmed: false,
  organization: {
    id: 'org1',
    name: 'Acme',
    subscriptionPlan: null,
    subscriptionStatus: null,
    careFeeStatus: 'NONE',
  },
  participants: [
    {
      id: 'p1',
      email: 'p1@test.com',
      partyType: 'INITIATOR',
      userId: 'user-1',
      managingOnly: false,
      invitedAt: null,
      notifiedAt: null,
      inviteDeliveryStatus: null,
      _count: { recordEntries: 6 },
      checkIns: [
        { id: 'ci1', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, completedAt: new Date('2026-01-05') },
      ],
      reportActivations: [{ status: 'ACTIVATED' }],
    },
  ],
  report: { id: 'r1', releasedAt: new Date('2026-01-06'), createdAt: new Date('2026-01-05') },
};

function makeService() {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => GROUND_ROW) },
    participantRequest: { count: jest.fn(async () => 2) },
  };
  return new AdminService(prisma, {} as any, {} as any);
}

describe('#6 admin ground support view: content and shape', () => {
  it('returns state/billing/roster/check-in-status/report-state', async () => {
    const service = makeService();
    const result = await service.getGroundSupportView('g1');

    expect(result.label).toBe('Test Ground');
    expect(result.status).toBe('ACTIVE');
    expect(result.billing.organizationName).toBe('Acme');
    expect(result.roster).toHaveLength(1);
    expect(result.roster[0].email).toBe('p1@test.com');
    expect(result.roster[0].accepted).toBe(true);
    expect(result.roster[0].recordEntryCount).toBe(6);
    expect(result.roster[0].checkIns[0]).toEqual({ sessionNumber: 1, status: 'COMPLETED', availableFrom: null, completedAt: new Date('2026-01-05') });
    expect(result.roster[0].activationStatus).toBe('ACTIVATED');
    expect(result.report).toEqual({ exists: true, releasedAt: new Date('2026-01-06'), createdAt: new Date('2026-01-05') });
    expect(result.pendingParticipantRequests).toBe(2);
  });

  it('throws NotFoundException for a nonexistent ground', async () => {
    const prisma: any = { ground: { findUnique: jest.fn(async () => null) } };
    const service = new AdminService(prisma, {} as any, {} as any);
    await expect(service.getGroundSupportView('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('never returns any excluded content field, even if present on the raw row', async () => {
    // Deliberately poison the mock row with every field the boundary excludes -
    // as if a future edit widened the Prisma `select`. The service must not
    // surface any of it regardless of what the query returns.
    const poisoned = {
      ...GROUND_ROW,
      participants: [
        {
          ...GROUND_ROW.participants[0],
          recordEntries: [{ text: 'PRIVATE: this should never leak' }],
          soloArtifact: 'PRIVATE: your private record shows...',
          leadContextNotes: [{ text: 'PRIVATE: admin note about this person' }],
          checkIns: [
            {
              ...GROUND_ROW.participants[0].checkIns[0],
              turns: [{ content: 'PRIVATE: raw conversation turn' }],
            },
          ],
        },
      ],
      report: {
        ...GROUND_ROW.report,
        sharedPicture: 'PRIVATE: synthesized shared picture',
        agreements: ['PRIVATE agreement'],
        divergences: [{ topic: 'PRIVATE divergence' }],
        centralQuestion: 'PRIVATE central question',
        hiddenContributors: [{ label: 'PRIVATE hidden contributor' }],
        arcSignals: { p1: { fired: true } },
        finalSynthesis: { note: 'PRIVATE final synthesis' },
      },
      documents: [{ content: 'PRIVATE document content' }],
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => poisoned) },
      participantRequest: { count: jest.fn(async () => 1) },
    };
    const service = new AdminService(prisma, {} as any, {} as any);
    const result = await service.getGroundSupportView('g1');

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/PRIVATE/);
    // Confirm the excluded top-level keys don't exist on the response at all.
    expect(result).not.toHaveProperty('sharedPicture');
    expect((result as any).roster[0]).not.toHaveProperty('recordEntries');
    expect((result as any).roster[0]).not.toHaveProperty('soloArtifact');
    expect((result as any).roster[0]).not.toHaveProperty('leadContextNotes');
    expect((result as any).roster[0].checkIns[0]).not.toHaveProperty('turns');
    expect((result as any).report).not.toHaveProperty('sharedPicture');
    expect((result as any).report).not.toHaveProperty('agreements');
    expect((result as any).report).not.toHaveProperty('divergences');
    expect((result as any).report).not.toHaveProperty('centralQuestion');
    expect((result as any).report).not.toHaveProperty('hiddenContributors');
    expect((result as any)).not.toHaveProperty('documents');
  });

  it('returns only a pending-request count, never any reason text', async () => {
    const service = makeService();
    const result = await service.getGroundSupportView('g1');
    expect(typeof result.pendingParticipantRequests).toBe('number');
    // "reason" as a JSON key (participantRequest.reason) must never appear -
    // freeReason is a distinct, safe enum field and is not what this guards.
    expect(JSON.stringify(result)).not.toMatch(/"reason"\s*:/);
  });
});
