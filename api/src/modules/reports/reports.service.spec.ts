import { NotFoundException } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { ReportsService } from './reports.service';

/**
 * Cross-org isolation invariant (GW-02). release() must refuse to act on a
 * ground that does not belong to the caller's organization - an admin of org A
 * must never be able to release org B's report by ID.
 */
describe('ReportsService.release - org scoping (GW-02)', () => {
  function makeService(groundRow: any) {
    const prisma: any = {
      ground: { findFirst: jest.fn(async (args: any) => (groundRow && groundRow.organizationId === args.where.organizationId ? groundRow : null)) },
      report: { update: jest.fn(async () => ({ releasedAt: new Date() })) },
    };
    const email: any = { sendReportReady: jest.fn(async () => undefined) };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any);
    return { service, prisma, email };
  }

  it('throws NotFound when the ground belongs to another org', async () => {
    const { service } = makeService({ id: 'g1', organizationId: 'org-A', report: { id: 'r1' }, participants: [] });
    await expect(service.release('g1', 'org-B')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes the lookup by organizationId and releases for the owning org', async () => {
    const { service, prisma, email } = makeService({
      id: 'g1',
      organizationId: 'org-A',
      label: 'Cofounder alignment',
      report: { id: 'r1', releasedAt: null },
      participants: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    });
    await service.release('g1', 'org-A');
    expect(prisma.ground.findFirst.mock.calls[0][0].where).toEqual({ id: 'g1', organizationId: 'org-A' });
    expect(email.sendReportReady).toHaveBeenCalledTimes(2);
  });
});

/**
 * GW-41: synthesize() must stamp promptVersionId on the report so the learning
 * loop can attribute outcome rates to specific prompt versions.
 */
describe('ReportsService.synthesize - promptVersionId stamping (GW-41)', () => {
  it('writes the synthesis prompt version ID onto the report', async () => {
    const VERSION_ID = 'pv-001';
    let upsertedCreate: any;

    const prisma: any = {
      ground: {
        findUnique: jest.fn(async () => ({ id: 'g1', participants: [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }] })),
        update: jest.fn(async () => ({})),
      },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }]) },
      recordEntry: {
        findMany: jest.fn(async () => [{ participant: { id: 'p1' }, type: 'COMMITMENT', text: 'We aligned on X.' }]),
        count: jest.fn(async () => 3),
      },
      checkIn: { count: jest.fn(async () => 1) },
      groundDocument: { count: jest.fn(async () => 0) },
      adminProfile: { findUnique: jest.fn(async () => null) },
      report: {
        upsert: jest.fn(async (args: any) => {
          upsertedCreate = args.create;
          return { id: 'r1' };
        }),
      },
    };

    const prompts: any = {
      getActive: jest.fn(async () => ({ id: VERSION_ID, content: 'synthesize this.' })),
    };

    const anthropic: any = {
      extract: jest.fn(async () => ({
        sharedPicture: 'both agreed',
        agreements: ['a'],
        divergences: [],
        centralQuestion: 'What next?',
      })),
    };

    const service = new ReportsService(prisma, prompts, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any);
    await service.synthesize('g1');

    expect(prompts.getActive).toHaveBeenCalledWith('report_synthesis');
    expect(upsertedCreate.promptVersionId).toBe(VERSION_ID);
  });
});
