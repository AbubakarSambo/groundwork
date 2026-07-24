import { ReportsService } from './reports.service';

/**
 * FORMING-REPORT SYMMETRY. Before release, get()'s own comment says the
 * forming picture should not be blocked from "anyone... initiator included" -
 * but the code short-circuited the initiator/org-admin branch with a bare
 * stub (no sharedPicture, no forming flag) BEFORE reaching the forming-report
 * construction that a participant's call already received. The initiator's
 * own admin page has UI for a "View the forming report" button gated on
 * `report.forming` - which the backend could never actually set for them.
 * Fixed: the initiator/org-admin path now gets the SAME forming content a
 * participant gets, pre-release. Revert -> the initiator's forming payload
 * loses `forming`/`sharedPicture` -> this bites.
 */
const unreleasedReport = {
  id: 'r1',
  groundId: 'g1',
  createdAt: new Date(),
  releasedAt: null,
  sharedPicture: 'Both accounts describe the same project scope.',
  agreements: ['scope'],
  divergences: [],
};

function makeService(overrides: any = {}) {
  const ground = {
    id: 'g1',
    initiatorId: 'init-user',
    organizationId: 'org1',
    participants: [
      { id: 'p-init', userId: 'init-user' },
      { id: 'p-part', userId: 'part-user' },
    ],
    report: unreleasedReport,
    ...overrides.ground,
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
  };
  const grounds: any = {
    getSessionProgress: jest.fn(async () => ({ completed: 1, total: 2, missingParticipantIds: ['p-part'] })),
  };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, grounds);
  return { service };
}

describe('forming report: the initiator gets the same pre-release content a participant gets', () => {
  it('initiator: forming picture + sharedPicture, NOT a bare stub', async () => {
    const { service } = makeService();
    const res: any = await service.get('g1', 'init-user');
    expect(res.forming).toBe(true);
    expect(res.sharedPicture).toBe(unreleasedReport.sharedPicture);
    expect(res.nextStep).toBe('release');
  });

  it('participant: unchanged - still gets the forming picture', async () => {
    const { service } = makeService();
    const res: any = await service.get('g1', 'part-user');
    expect(res.forming).toBe(true);
    expect(res.sharedPicture).toBe(unreleasedReport.sharedPicture);
  });

  it('both roles see the SAME sharedPicture content pre-release (symmetric)', async () => {
    const { service } = makeService();
    const initRes: any = await service.get('g1', 'init-user');
    const partRes: any = await service.get('g1', 'part-user');
    expect(initRes.sharedPicture).toBe(partRes.sharedPicture);
    expect(initRes.forming).toBe(partRes.forming);
  });
});
