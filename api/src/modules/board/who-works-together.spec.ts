import { CheckInStatus } from '@prisma/client';
import { ReadInput, buildCoverage } from './reads';
import { CoverageKind } from './coverage';

/**
 * WHO DECIDES WHETHER THESE PEOPLE CAN VOUCH FOR EACH OTHER.
 *
 * The board's fairness reads are all built on colleagues describing each other,
 * and the protection for a quiet, competent person works by noticing that others
 * still credit them while their own account stays modest. Where nobody can
 * corroborate anybody, that protection has nothing to stand on: silence in
 * someone's own account gets read as work going missing, and on a probation
 * ground that is somebody's job.
 *
 * The first version inferred this from the scenario - cohort meant separate,
 * everything else meant together. That is only usually true. A cohort of
 * trainers sharing one site see each other every day; a delivery team split
 * across four regions never does. "Usually" is not good enough for a fact that
 * decides whether a competent person is reported as absent, so the lead or an
 * admin can say, and their answer beats the guess.
 *
 * These tests pin the PRIORITY, in both directions. Getting it backwards in
 * either one reintroduces the harm.
 */

const base = (peopleWorkTogether?: boolean): ReadInput => ({
  peopleWorkTogether,
  participants: [
    {
      id: 'quiet',
      roleAsDescribed: 'Clinic manager. Run the clinic, protocol sign-off.',
      managingOnly: false,
      detectedFunction: 'OPERATIONS',
      detectedFunctionConfidence: 0.8,
    },
  ],
  checkIns: [1, 2, 3, 4, 5, 6].map((n) => ({ participantId: 'quiet', sessionNumber: n, status: CheckInStatus.COMPLETED })),
  // Does the work, describes it flatly. Nothing here is checkable - which is how
  // plenty of competent people write.
  entries: [1, 2, 3, 4, 5, 6].map((n) => ({
    participantId: 'quiet',
    sessionNumber: n,
    text: `[VERIFIABILITY:LOW] Fine week number ${n}, ticking along`,
  })),
  mentions: [],
  dependencies: [],
});

const readFor = (input: ReadInput) => buildCoverage(input, (i) => i).reads[0];

describe('when nobody can corroborate anybody', () => {
  it('does not read a quiet account as work going missing', () => {
    const r = readFor(base(false));
    if (r.kind === CoverageKind.LEAKING) {
      throw new Error(
        'The board says this person\'s work is landing elsewhere. Nobody on this ground can see anyone ' +
          'else\'s work, so there is nowhere else for it to land, and no colleague who could have said ' +
          'otherwise. On a probation this sentence costs someone their job.\n' +
          `BOARD SAID: ${r.what}`,
      );
    }
  });

  it('still shows the read, rather than going silent about the person', () => {
    // Withholding it entirely would be the opposite failure: the lead learns
    // nothing about someone they have to make a decision about.
    expect(readFor(base(false)).shown).toBe(true);
  });
});

describe('when they do work together', () => {
  it('a long quiet run with nobody crediting them is still surfaced', () => {
    // The signal has to survive. Turning it off everywhere to fix the cohort case
    // would lose the person who genuinely went dark on a team that would have
    // noticed.
    expect(readFor(base(true)).kind).toBe(CoverageKind.LEAKING);
  });
});

describe('whose answer wins', () => {
  it('an explicit "they work separately" beats a scenario that assumed otherwise', () => {
    expect(readFor(base(false)).kind).not.toBe(CoverageKind.LEAKING);
  });

  it('an explicit "they work together" beats a scenario that assumed otherwise', () => {
    // The direction that is easy to forget. A cohort sharing one site CAN
    // corroborate each other, and saying so must switch the signal back on.
    expect(readFor(base(true)).kind).toBe(CoverageKind.LEAKING);
  });

  it('falls back to the caller\'s default when nobody has answered', () => {
    // undefined means unset. The service passes the scenario-family guess in that
    // case; the read itself must not invent an answer.
    expect(readFor(base(undefined)).kind).toBe(CoverageKind.LEAKING);
  });
});

// ---------------------------------------------------------------------------
// The wiring, not just the rule.
// ---------------------------------------------------------------------------

import { GroundMode, GroundScenario } from '@prisma/client';
import { BoardService } from './board.service';

/**
 * The rule above is enforced in reads.ts. This checks the SERVICE actually hands
 * it the lead's stored answer, rather than computing the scenario guess and
 * ignoring what anyone said.
 *
 * Worth its own test because the rule and the wiring fail independently:
 * deleting the override in board.service left every test above passing, since
 * they all call the read directly. That is the same gap that once let the board
 * count one customer three times while the whole suite stayed green.
 */
function serviceFor(scenario: GroundScenario, peopleWorkTogether: boolean | null) {
  const participants = [
    {
      id: 'quiet', email: 'q@x.test', userId: 'u1', partyType: 'PARTICIPANT',
      roleAsDescribed: 'Clinic manager. Run the clinic.', managingOnly: false, signedOffAt: null,
      detectedFunction: 'OPERATIONS', detectedFunctionConfidence: 0.8, user: { firstName: 'Q', lastName: 'X' },
    },
  ];
  const ground: any = {
    id: 'g1', initiatorId: 'u1', organizationId: 'org1', scenario, mode: GroundMode.SHARED,
    label: 'A ground', peopleWorkTogether, participants, report: null, objectives: [],
    dependencies: [], poll: null,
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    checkIn: {
      findMany: jest.fn(async () =>
        [1, 2, 3, 4, 5, 6].map((n) => ({ participantId: 'quiet', sessionNumber: n, status: 'COMPLETED' })),
      ),
    },
    recordEntry: {
      findMany: jest.fn(async () =>
        [1, 2, 3, 4, 5, 6].map((n) => ({
          participantId: 'quiet',
          text: `[VERIFIABILITY:LOW] Fine week ${n}, ticking along`,
          checkIn: { sessionNumber: n },
        })),
      ),
    },
    workMention: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []) },
  };
  return new BoardService(prisma) as any;
}

describe('the service passes the lead\'s answer through', () => {
  it('honours "they work separately" on a scenario that would otherwise assume together', async () => {
    // NEW_PROJECT is a delivery scenario - the guess is "they work together".
    // The lead said otherwise, and the lead is the one who knows.
    const svc = serviceFor(GroundScenario.NEW_PROJECT, false);
    const board = await svc.get('g1', 'u1');
    const read = board.coverage.reads.find((r: any) => r.participantId === 'quiet');
    expect(read.kind).not.toBe(CoverageKind.LEAKING);
  });

  it('a cohort board never shows this section at all - a second, stronger guard', async () => {
    // Worth pinning, and worth not overclaiming. The cohort FAMILY omits the
    // coverage section entirely, so on a cohort the bad sentence could never have
    // reached anyone regardless of this setting. The setting is what protects the
    // case the family cannot see: a delivery ground whose people happen to be
    // spread across sites.
    const svc = serviceFor(GroundScenario.COHORT_CHECK, null);
    const board = await svc.get('g1', 'u1');
    expect(board.coverage).toBeUndefined();
    // The contribution read IS shown on a cohort, so that is where the honest
    // statement about someone's record has to land.
    expect(board.contribution).toBeDefined();
  });

  it('tells the lead plainly that no second account exists, where none can', async () => {
    const svc = serviceFor(GroundScenario.COHORT_CHECK, false);
    const board = await svc.get('g1', 'u1');
    const read = board.contribution.find((r: any) => r.participantId === 'quiet');
    expect(read.reason).toMatch(/no second account to check any of this against/i);
  });

  it('does not add that caveat when people can in fact corroborate each other', async () => {
    const svc = serviceFor(GroundScenario.NEW_PROJECT, true);
    const board = await svc.get('g1', 'u1');
    const read = board.contribution.find((r: any) => r.participantId === 'quiet');
    expect(read.reason ?? '').not.toMatch(/no second account/i);
  });
});
