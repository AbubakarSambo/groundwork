import { ReportsService } from './reports.service';

/**
 * THE RECORD READ HAS TO REACH THE PAYLOAD. (G10, G34, G35)
 *
 * Every module in this wave was tested against hand-written inputs and passed,
 * and one of them had no consumer at all. Earlier today the same shape bit twice
 * in one sitting: a restore proved against its own function while the live path
 * had it removed, and 321 tests stayed green.
 *
 * So this asserts on what get() actually returns, as the lead and as a
 * participant, with the flag on and off. Nothing here calls the arithmetic
 * directly - that is next door, and passing there is not the claim being made.
 */

const RELEASED = {
  id: 'r1',
  groundId: 'g1',
  createdAt: new Date(),
  releasedAt: new Date(),
  sharedPicture: 'Both accounts describe the handover.',
  agreements: [],
  divergences: [],
  centralQuestion: 'Who owns the handover?',
  engagement: {},
  finalSynthesis: { tiers: {} },
};

const ENTRIES = [
  // The lead's two standards. The first is reached by the participant's account;
  // the second, the one that matters, is reached by nothing.
  { participantId: 'p-init', type: 'SUCCESS_DEFINITION', text: 'owning at least one client relationship end to end', checkIn: { sessionNumber: 1 } },
  { participantId: 'p-init', type: 'SUCCESS_DEFINITION', text: 'judgement, not just delivery', checkIn: { sessionNumber: 1 } },
  { participantId: 'p-part', type: 'COMMITMENT', text: 'I have taken one client relationship end to end', checkIn: { sessionNumber: 4 } },
  { participantId: 'p-part', type: 'WORRY', text: 'The ticket queue is the only number anybody named', checkIn: { sessionNumber: 4 } },
];

function makeService({ closed = true }: { closed?: boolean } = {}) {
  const ground = {
    id: 'g1',
    initiatorId: 'init-user',
    organizationId: 'org1',
    status: closed ? 'RESOLVED' : 'ACTIVE',
    resolutionState: closed ? { state: 'done' } : null,
    participants: [
      { id: 'p-init', userId: 'init-user', partyType: 'INITIATOR', user: { firstName: 'Hafsah', lastName: 'J', email: 'h@x.test' } },
      { id: 'p-part', userId: 'part-user', partyType: 'PARTICIPANT', user: { firstName: 'Abubakar', lastName: 'K', email: 'a@x.test' } },
    ],
    report: RELEASED,
  };
  const prisma: any = {
    /**
     * `GroundBaseline` is read by `get()` and by the report now - the team's starting point, which had
     * no reader until it was built. A mock without it throws on `findFirst` of undefined, which is what
     * these four suites did the moment the read landed. Null here means "not stated", the state every
     * one of these fixtures is actually in.
     */
    groundBaseline: { findFirst: jest.fn(async () => null) },
    /** Read by `get()` since per-person objectives were built. Empty is "nobody has stated one". */
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => ground) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
    reportActivation: { findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })), findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => ENTRIES) },
    groundDocument: { findMany: jest.fn(async () => [{ participantId: 'p-part', name: 'handover-plan.pdf', fileName: 'handover-plan.pdf' }]) },
    checkIn: { findMany: jest.fn(async () => []) },
    deferral: { findMany: jest.fn(async () => []) },
  };
  const config: any = { get: jest.fn(() => true) };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, {} as any, grounds);
  return { service, prisma, config };
}

describe('what the lead gets', () => {
  it('the section, naming the standard nothing in the record reached', async () => {
    // THE POINT OF G10, on the live payload. Parts one and two a lead could build
    // themselves; part three they cannot, because absence does not appear on a
    // page unless something puts it there.
    const { service } = makeService();
    const res: any = await service.get('g1', 'init-user');
    expect(res.whatTheGroundCanTellYou?.whatNobodyHasEvidenceFor).toEqual(['judgement, not just delivery']);
    expect(res.whatTheGroundCanTellYouNote).toMatch(/does not add up to an answer/);
  });

  it('and the soft spots, each with what would raise it', async () => {
    const { service } = makeService();
    const res: any = await service.get('g1', 'init-user');
    const all = Object.values(res.softSpots ?? {}).flat() as any[];
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      // G34's guarantee, asserted where it is actually assembled rather than
      // where it is defined.
      expect(s.wouldRaiseIt).toMatch(/^Ask /);
      expect(s.line).toBeTruthy();
    }
  });
});

describe('what a participant gets', () => {
  it('never the soft spots', async () => {
    // THE REGRESSION THIS GUARDS. A soft spot lowers confidence in a picture,
    // which is the lead's job to hold. In a participant's hands the same sentence
    // reads as a note about a colleague, which is what it is written not to be.
    const { service } = makeService();
    const res: any = await service.get('g1', 'part-user');
    expect(res.softSpots).toBeUndefined();
  });

  it('and the section is theirs to read, under its own heading', async () => {
    // Everything in it comes from shared entries and the lead's own stated
    // standard, so there is nothing here they have not effectively seen.
    const { service } = makeService();
    const res: any = await service.get('g1', 'part-user');
    expect(res.whatTheGroundCanTellYou).toBeTruthy();
  });
});

describe('the switch, and the close', () => {
  it('off is today\'s product: neither field appears', async () => {
    const { service, config } = makeService();
    config.get.mockReturnValue(false);
    const res: any = await service.get('g1', 'init-user');
    expect(res.whatTheGroundCanTellYou).toBeUndefined();
    expect(res.softSpots).toBeUndefined();
    // And the report itself still arrives, which is the whole promise of the flag.
    expect(res.sharedPicture).toBe(RELEASED.sharedPicture);
  });

  it('nothing before the closing round', async () => {
    // A "what to weigh about this person" panel sitting on the overview from week
    // two turns every visit into an evaluation exercise.
    const { service } = makeService({ closed: false });
    const res: any = await service.get('g1', 'init-user');
    expect(res.whatTheGroundCanTellYou).toBeUndefined();
  });

  it('and a read that throws never takes the report down with it', async () => {
    // A field that adds material must not be the reason somebody cannot open
    // their report. The flag read already fails to off for the same reason.
    const { service, prisma } = makeService();
    prisma.recordEntry.findMany = jest.fn(async () => { throw new Error('database went away'); });
    const res: any = await service.get('g1', 'init-user');
    expect(res.sharedPicture).toBe(RELEASED.sharedPicture);
    expect(res.whatTheGroundCanTellYou).toBeUndefined();
  });
});
