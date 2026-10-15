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
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => ground) },
  };
  const grounds: any = {
    getSessionProgress: jest.fn(async () => ({ completed: 1, total: 2, missingParticipantIds: ['p-part'], declinedParticipantIds: [] })),
    ...overrides.grounds,
  };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, grounds, { tell: async () => [] } as any);
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

  it('a participant who has ALREADY answered is told the picture is not shared yet, and is not shown it (decision 76, item 4)', async () => {
    /*
     * THE SYMMETRY THAT SURVIVES, AND THE ONE THAT DID NOT.
     *
     * This file was written because the LEAD was short-changed: their branch returned a bare stub
     * while a participant's returned the forming picture, on a page whose button was gated on the
     * flag the stub did not carry. That lesson is intact and is the test above.
     *
     * What was wrong with "both roles see the same thing" is the axis. Walked as a real
     * participant: Zainab, invited and not yet checked in, opened her Report tab and read a summary
     * of her manager's account of her - "two standards... one that was communicated, and another
     * that was not" - before writing a word. Whatever she said next was an answer to it.
     *
     * The gate is not the role. It is whether you have given your own account this round.
     */
    const { service } = makeService({
      grounds: {
        getSessionProgress: jest.fn(async () => ({
          completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [],
        })),
      },
    });
    /*
     * DECISION 76, ITEM 4 (2 October 2026): each session's team picture is released on its own, and
     * somebody who reads only what is released reads a session's picture only once it is. Before,
     * answering was enough to read the forming picture; that is the reading this decision ends. They
     * are told plainly, and keep their own things.
     */
    const res: any = await service.get('g1', 'part-user');
    expect(res.forming).toBe(true);
    expect(res.sharedPicture).toBeUndefined();
    expect(res.agreements).toBeUndefined();
    expect(res.withheldUntilYouAnswer).toBeUndefined();
    expect(res.saying).toBe("The team's picture of session 1 is not shared yet.");
    expect(res.teamPicture).toEqual({ shared: false, sessionNumber: 1, says: "The team's picture of session 1 is not shared yet." });
    expect(res).toHaveProperty('soloArtifact');
  });

  it('and a participant who has not is told why, rather than shown it', async () => {
    const { service } = makeService();
    const res: any = await service.get('g1', 'part-user');
    expect(res.withheldUntilYouAnswer).toBe(true);
    expect(res.sharedPicture).toBeUndefined();
    /* A fact about the method, not a refusal - and it says when it lifts. */
    expect(res.saying).toContain('as soon as you have answered');
    /* The copy pass turned "the whole point is that they are independent" into the plainer "the
       point is that they are separate". The claim is the reason they cannot read it yet, so that
       is what is asserted rather than the adjective. */
    expect(res.saying).toMatch(/would turn yours into an answer to theirs/);
    expect(res.saying).toMatch(/separate|independent/);
    /* Their own record is still theirs while they wait. */
    expect(res).toHaveProperty('soloArtifact');
  });

  it('while the lead reads it whether or not they have answered', async () => {
    /* Somebody who runs a check-in and gives no account of their own - managing-only - would
       otherwise never see the picture they are running. */
    const { service } = makeService();
    const res: any = await service.get('g1', 'init-user');
    expect(res.sharedPicture).toBe(unreleasedReport.sharedPicture);
    expect(res.withheldUntilYouAnswer).toBeUndefined();
  });
});
