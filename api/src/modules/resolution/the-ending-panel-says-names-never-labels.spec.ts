import { GroundScenario, GroundStatus, PartyType } from '@prisma/client';
import { ResolutionService } from './resolution.service';

/**
 * THE ENDING PANEL SAID "PARTICIPANT A" (decision 115: names, never labels).
 *
 * `/grounds/:id/resolution` listed each person under their report label, even the reader himself
 * ("Luis reads Participant A for himself"), because the names it swapped in did not take the
 * check-in's setting for whether colleagues see each other. The reader is "You"; a colleague is
 * named where the reader may see the name, and is "a colleague" or "another colleague" where the
 * name is walled or there is none, as the reports say it.
 */
const user = (firstName: string | null, lastName: string | null, email: string) => ({ firstName, lastName, email });
function world(peersVisibleToEachOther: boolean) {
  const mk = (id: string, userId: string, partyType: PartyType, u: any, t: string, extra: any = {}) => ({
    id, userId, partyType, email: u.email, createdAt: new Date(t), roleAsDescribed: null, user: u, ...extra,
  });
  const participants = [
    mk('p-lead', 'u-lead', PartyType.INITIATOR, user('Wairimu', 'Kamau', 'wairimu@baridi.test'), '2026-07-01'),
    mk('p-luis', 'u-luis', PartyType.PARTICIPANT, user('Luis', 'Ortega', 'luis@baridi.test'), '2026-07-02'),
    mk('p-amani', 'u-amani', PartyType.PARTICIPANT, user('Amani', 'Okoro', 'amani@baridi.test'), '2026-07-03'),
    mk('p-none', 'u-none', PartyType.PARTICIPANT, user(null, null, 'x9@baridi.test'), '2026-07-04'),
  ];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1', initiatorId: 'u-lead', scenario: GroundScenario.REALIGN_TEAM, peersVisibleToEachOther, label: 'Sales team', participants, status: GroundStatus.ACTIVE })) },
    resolution: { findUnique: jest.fn(async () => ({ id: 'r1', endState: null, closedAt: null, reason: null, confirmations: [] })) },
    groundParticipant: { findMany: jest.fn(async () => participants) },
  };
  return new ResolutionService(prisma, {} as any, {} as any, {} as any, { get: jest.fn() } as any) as any;
}
const read = async (svc: any, userId: string) => (await svc.buildState('g1', userId)).confirmations.map((c: any) => c.label);

describe('the ending panel names people, and never says Participant A', () => {
  it('where colleagues see each other, Luis reads You for himself and the names of the rest', async () => {
    const labels = await read(world(true), 'u-luis');
    expect(labels).toEqual(['Wairimu Kamau', 'You', 'Amani Okoro', 'A colleague']);
    expect(labels.join(' ')).not.toMatch(/Participant|initiator/i);
  });

  it('where names are walled, Luis reads You, the lead by name, and colleagues as colleagues', async () => {
    const labels = await read(world(false), 'u-luis');
    expect(labels).toEqual(['Wairimu Kamau', 'You', 'One colleague', 'Another colleague']);
    expect(labels.join(' ')).not.toMatch(/Participant|Amani|initiator/i);
  });

  it('the lead reads every name, and You for herself', async () => {
    const labels = await read(world(false), 'u-lead');
    expect(labels).toEqual(['You', 'Luis Ortega', 'Amani Okoro', 'A colleague']);
  });

  it('an admin who is not in it reads the names, never a label', async () => {
    const labels = await read(world(false), 'u-admin');
    expect(labels.join(' ')).not.toMatch(/Participant|initiator/i);
  });
});
