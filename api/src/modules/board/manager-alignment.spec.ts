import { BoardService } from './board.service';
import { CheckInStatus, GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { LeadershipDimension } from './coverage';

/**
 * GW-MGR-ALIGN tripwires.
 *
 * The manager-report alignment read is the divergence mechanic pointed at
 * management. What must hold:
 *
 *  1. It shows the GAP, never a quote. If either side's words reached the
 *     output, the independence rule the whole product rests on would be broken
 *     on the most sensitive read it has.
 *  2. It never names which report a signal came from.
 *  3. No manager or no reports means no read at all - it does not invent one.
 *  4. Agreement produces nothing. A gap has to actually exist.
 */

const MGR_CLEAR = 'I set out the sales targets clearly and assigned who owns what.';
const REPORT_UNCLEAR = 'I am not sure exactly what I own on sales, nobody said which accounts are mine.';
const REPORT_ALIGNED = 'I own the enterprise accounts and the pipeline for them, which is clear.';

function makeService(opts: {
  managerEntries: string[];
  reportEntries: { participantId: string; text: string }[];
  participants?: any[];
}) {
  const participants = opts.participants ?? [
    { id: 'mgr', partyType: PartyType.INITIATOR, managingOnly: false, detectedFunction: 'MANAGEMENT', roleAsDescribed: 'Sales lead', email: 'm@x', user: { firstName: 'Mo', lastName: 'Lead' } },
    { id: 'r1', partyType: PartyType.PARTICIPANT, managingOnly: false, detectedFunction: 'SALES', roleAsDescribed: 'AE', email: 'r1@x', user: { firstName: 'Ray', lastName: 'One' } },
  ];
  const prisma: any = {
    recordEntry: {
      findMany: jest.fn(async (a: any) => {
        const pid = a.where.participantId;
        if (typeof pid === 'string') return opts.managerEntries.map((text) => ({ type: 'COMMITMENT', text }));
        return opts.reportEntries.map((e) => ({ participantId: e.participantId, type: 'COMMITMENT', text: e.text }));
      }),
    },
  };
  const service = new BoardService(prisma) as any;
  const ground = { id: 'g1', initiatorId: 'u-mgr', participants };
  const checkIns = participants.map((p: any) => ({ participantId: p.id, status: CheckInStatus.COMPLETED }));
  const nameOf = (pid: string) => participants.find((p: any) => p.id === pid)?.user?.firstName ?? null;
  return { service, ground, checkIns, nameOf };
}

describe('GW-MGR-ALIGN-01: the gap is surfaced, the words never are', () => {
  it('surfaces a clarity-of-ownership gap when the two accounts disagree', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: [MGR_CLEAR],
      reportEntries: [{ participantId: 'r1', text: REPORT_UNCLEAR }],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads[0].dimension).toBe(LeadershipDimension.CLARITY_OF_OWNERSHIP);
  });

  it('NEVER leaks either side\'s words into the output (tripwire)', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: [MGR_CLEAR],
      reportEntries: [{ participantId: 'r1', text: REPORT_UNCLEAR }],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    const blob = JSON.stringify(reads);
    // Distinctive fragments from each account. If either appears, one person's
    // words have been shown to the other - the exact thing this must not do.
    expect(blob).not.toContain('nobody said which accounts are mine');
    expect(blob).not.toContain('I set out the sales targets clearly');
    expect(blob).not.toContain('assigned who owns what');
  });

  it('never names which report the signal came from', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: [MGR_CLEAR],
      reportEntries: [{ participantId: 'r1', text: REPORT_UNCLEAR }],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    const blob = JSON.stringify(reads);
    expect(blob).not.toContain('Ray');
    expect(blob).not.toContain('r1');
    // A count is fine - it is how many accounts point the same way, not who.
    expect(reads[0].reportsPointingThisWay).toBe(1);
  });
});

describe('GW-MGR-ALIGN-02: it does not invent a read', () => {
  it('agreement produces no gap', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: [MGR_CLEAR],
      reportEntries: [{ participantId: 'r1', text: REPORT_ALIGNED }],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    expect(reads.filter((r: any) => r.dimension === LeadershipDimension.CLARITY_OF_OWNERSHIP)).toHaveLength(0);
  });

  it('no reports means no read at all', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: [MGR_CLEAR],
      reportEntries: [],
      participants: [
        { id: 'mgr', partyType: PartyType.INITIATOR, managingOnly: false, detectedFunction: 'MANAGEMENT', email: 'm@x', user: { firstName: 'Mo' } },
      ],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    expect(reads).toEqual([]);
  });

  it('a managing-only lead is not treated as a manager with an account', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: [MGR_CLEAR],
      reportEntries: [{ participantId: 'r1', text: REPORT_UNCLEAR }],
      participants: [
        { id: 'mgr', partyType: PartyType.INITIATOR, managingOnly: true, detectedFunction: 'MANAGEMENT', email: 'm@x', user: { firstName: 'Mo' } },
        { id: 'r1', partyType: PartyType.PARTICIPANT, managingOnly: false, detectedFunction: 'SALES', email: 'r1@x', user: { firstName: 'Ray' } },
      ],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    expect(reads).toEqual([]);
  });
});

describe('GW-MGR-ALIGN-03: "no drama" is checked across two accounts, not one', () => {
  it('surfaces unaddressed tension when the manager reads calm and a report does not', async () => {
    const { service, ground, checkIns, nameOf } = makeService({
      managerEntries: ['The team is fine, no issues this period.'],
      reportEntries: [{ participantId: 'r1', text: 'There is real friction with how work gets handed over and it has not been raised.' }],
    });
    const reads = await service.buildManagerAlignment(ground, checkIns, nameOf);
    expect(reads.some((r: any) => r.dimension === LeadershipDimension.UNADDRESSED_TENSION)).toBe(true);
  });
});
