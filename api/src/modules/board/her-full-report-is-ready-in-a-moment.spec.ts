import { boardAs, answered, AMINA, RUKIA, THE_BOARDS_CLOCK } from './the-switchboards-sections-harness';
import { YOUR_FULL_REPORT_IS_COMING } from './board.service';

/**
 * "YOUR FULL REPORT IS READY IN A MOMENT." (Hafsah, 3 November evening). After "Send N invitations" Amina lands on the board at once, while
 * setup's report is still being written after the save. She reads the line until the report is on her setup session; Rukia never reads it;
 * and a report that never came does not leave the line standing.
 */
const checkIns = [answered('p-rukia', 1), answered('p-baraka', 1)];
const herSetup = (secondsAgo: number, sessionReport: unknown) => ({
  prismaExtras: {
    checkIn: {
      findMany: jest.fn(async () => structuredClone(checkIns)),
      aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
      findUnique: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async (args: any) => (args?.where?.sessionNumber === 1 && args?.where?.participant?.userId === 'u-amina'
        ? { completedAt: new Date(THE_BOARDS_CLOCK.getTime() - secondsAgo * 1000), sessionReport }
        : null)),
    },
  },
  checkIns,
});

describe('the lead\'s board while setup\'s full report is being written', () => {
  it('Amina reads "Your full report is ready in a moment." straight after sending the invitations', async () => {
    const b = await boardAs(herSetup(20, null) as any, ...AMINA);
    expect(b.fullReportComing).toBe('Your full report is ready in a moment.');
    expect(YOUR_FULL_REPORT_IS_COMING).toBe('Your full report is ready in a moment.');
  });

  it('the line is gone once the report is on her setup session', async () => {
    const b = await boardAs(herSetup(40, { summary: 'What you said.' }) as any, ...AMINA);
    expect(b.fullReportComing).toBeUndefined();
  });

  it('a report that never came does not leave the line standing', async () => {
    const b = await boardAs(herSetup(60 * 60, null) as any, ...AMINA);
    expect(b.fullReportComing).toBeUndefined();
  });

  it('Rukia, who checks in, never reads it', async () => {
    const b = await boardAs(herSetup(20, null) as any, ...RUKIA);
    expect(JSON.stringify(b)).not.toContain('Your full report is ready in a moment.');
  });
});
