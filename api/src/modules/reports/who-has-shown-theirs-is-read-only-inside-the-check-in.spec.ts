import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';

/**
 * WHO HAS SHOWN THEIRS IS READ ONLY INSIDE THE CHECK-IN.
 *
 * `GET /grounds/:id/report/activation-status` answered anybody signed in, from any organisation,
 * with every participant id on the check-in and whether each had shown theirs. These tests read
 * what the route hands each kind of reader: the lead, a participant, an admin of the check-in's
 * organisation, an admin of another organisation, and a member of the same organisation who is
 * not in the check-in. On a check-in that hides people from each other, a participant reads only
 * their own row.
 */

const USERS: Record<string, { role: string; organizationId: string }> = {
  'lead-user': { role: 'MEMBER', organizationId: 'org1' },
  'amani-user': { role: 'MEMBER', organizationId: 'org1' },
  'juma-user': { role: 'MEMBER', organizationId: 'org1' },
  'org1-admin': { role: 'ADMIN', organizationId: 'org1' },
  'org2-admin': { role: 'ADMIN', organizationId: 'org2' },
  'org1-member': { role: 'MEMBER', organizationId: 'org1' },
};

function serviceFor(peersVisibleToEachOther: boolean) {
  const ground = {
    id: 'g1',
    scenario: 'NEW_PROJECT',
    initiatorId: 'lead-user',
    organizationId: 'org1',
    peersVisibleToEachOther,
    report: { releasedAt: new Date() },
    participants: [
      { id: 'p-lead', userId: 'lead-user' },
      { id: 'p-amani', userId: 'amani-user' },
      { id: 'p-juma', userId: 'juma-user' },
    ],
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => ({ ...USERS[where.id], awaitingOrgApproval: false })),
    },
    reportActivation: {
      findMany: jest.fn(async () => [{ participantId: 'p-amani', status: 'ACTIVATED' }]),
      upsert: jest.fn(async () => ({})),
    },
  };
  return new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => false } as any, {} as any, {} as any, { tell: async () => [] } as any);
}

const read = (s: ReportsService, userId: string) => s.getActivationStatusForUser('g1', userId, USERS[userId].organizationId);

describe('who may read who has shown theirs', () => {
  it('an admin of another organisation is told the check-in does not exist, and reads no participant id', async () => {
    const refused = await read(serviceFor(true), 'org2-admin').catch((e) => e);
    expect(refused).toBeInstanceOf(NotFoundException);
    expect(JSON.stringify(refused.message)).not.toMatch(/p-amani|p-juma|p-lead/);
  });

  it('a member of the same organisation who is not in the check-in is refused too', async () => {
    await expect(read(serviceFor(true), 'org1-member')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the lead reads every row', async () => {
    const served = await read(serviceFor(true), 'lead-user');
    expect(served.parties).toEqual([
      { participantId: 'p-lead', activated: false },
      { participantId: 'p-amani', activated: true },
      { participantId: 'p-juma', activated: false },
    ]);
  });

  it('an admin of the check-in\'s organisation reads every row', async () => {
    const served = await read(serviceFor(false), 'org1-admin');
    expect(served.parties.map((p) => p.participantId)).toEqual(['p-lead', 'p-amani', 'p-juma']);
  });

  it('a participant on a check-in where people see each other reads every row', async () => {
    const served = await read(serviceFor(true), 'juma-user');
    expect(served.parties.map((p) => p.participantId)).toEqual(['p-lead', 'p-amani', 'p-juma']);
  });

  it('a participant on a check-in that hides people from each other reads only their own row', async () => {
    const served = await read(serviceFor(false), 'juma-user');
    expect(JSON.stringify(served)).not.toMatch(/p-amani|p-lead/);
    expect(served.parties).toEqual([{ participantId: 'p-juma', activated: false }]);
  });

  it('showing your own on a hidden check-in hands back only your own row as well', async () => {
    const served = await serviceFor(false).activate('g1', 'amani-user');
    expect(JSON.stringify(served)).not.toMatch(/p-juma|p-lead/);
  });

  it('the lead, as the lead of a hidden check-in, still reads every row', async () => {
    const served = await read(serviceFor(false), 'lead-user');
    expect(served.parties).toHaveLength(3);
  });
});
