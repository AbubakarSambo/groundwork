import { ReportsService } from './reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from '../patterns/pattern-library';

/**
 * THE LEAD'S PROBE LIST READS THE PLAIN NAME, NEVER THE DETECTOR'S OWN SIGNAL.
 *
 * `whatToProbeOn` (reports.service.ts) used to build each pattern line from
 * `patternCatalogue().get(code).signal`, the library's own terse description written for whoever
 * reads the detector - "Ownership claimed for work others delivered." for B3 - straight onto the
 * one list the lead reads (decision 52: no internal name or code reaches any reader). The rows it
 * draws from already go through `patternRowsThisReaderMayRead`, so the three-period rule and
 * decision 39's "the person first" timing were already kept; only the words on the line were wrong.
 *
 * Fixed by reading the plain name from plain-pattern-names.ts, the one place every other reader's
 * pattern is named from, so the probe list now agrees with the board, the record and the coaching
 * note about what a pattern is called.
 */

const LEAD = { id: 'p-lead', userId: 'u-tunde', partyType: PartyType.INITIATOR, email: 't@meridian.test', roleAsDescribed: 'runs Atlas', nameGiven: null, organisationGiven: null, managingOnly: true, createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Tunde', lastName: 'Bakare' } };
const FEMI = { id: 'p-femi', userId: 'u-femi', partyType: PartyType.PARTICIPANT, email: 'f@meridian.test', roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Femi', lastName: 'Okonkwo' } };
const PEOPLE = [LEAD, FEMI];

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const CHECK_INS = [1, 2, 3].map((n) => ({ id: `f${n}`, participantId: 'p-femi', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n + 1}T16:00:00Z`) }));

const FEMI_SAID = 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.';

/* B3, three periods, shown four days ago and never answered: the lead may read it (decision 39). */
const PATTERN_ROWS = [
  { id: 'pd2', groundId: 'g-atlas', participantId: 'p-femi', code: 'B3', status: 'SURFACED', observationText: FEMI_SAID, periodsObserved: 3, seenInSessions: [1, 2, 3], readyAt: ago(5), shownToPersonAt: ago(4), personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(4), createdAt: ago(30) },
];

const GROUND: any = {
  id: 'g-atlas', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, status: 'ACTIVE',
  initiatorId: 'u-tunde', createdByUserId: 'u-tunde', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYBODY', label: 'Atlas delivery',
  participants: PEOPLE, checkIns: CHECK_INS,
  report: {
    id: 'r1', groundId: 'g-atlas', releasedAt: new Date('2026-09-04T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Both have checked in three times.', agreements: [], divergences: [], centralQuestion: '', engagement: {},
    createdAt: new Date('2026-09-02T09:00:00Z'), updatedAt: new Date('2026-09-04T17:00:00Z'),
  },
  objectives: [], dependencies: [], poll: null,
};

const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function prismaFor(role: string) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => {
      const g = copy(GROUND);
      if (g.report) for (const k of ['releasedAt', 'createdAt', 'updatedAt']) if (g.report[k]) g.report[k] = new Date(g.report[k]);
      return g;
    }) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1', awaitingOrgApproval: false })), findFirst: jest.fn(async () => ({ id: 'u-grace' })) }),
    checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
    patternDetection: model({ findMany: jest.fn(async () => copy(PATTERN_ROWS)) }),
    recordEntry: model({ findMany: jest.fn(async () => []) }),
    groundDependency: model({ findMany: jest.fn(async () => []) }),
    groundDocument: model({ findMany: jest.fn(async () => []) }),
    wordedLine: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

const theModel: any = { respond: jest.fn(async () => null), extract: jest.fn(async () => { throw new Error('no model here'); }) };
const reportsFor = (role: string) => new ReportsService(
  prismaFor(role), {} as any, theModel, {} as any, { get: (k: string) => k === 'app.confidenceEnabled' } as any,
  { emit: async () => undefined } as any,
  { getSessionProgress: async () => ({ completed: 3, total: 3, missingParticipantIds: [], declinedParticipantIds: [] }) } as any,
  { tell: async () => [] } as any,
);

const INTERNAL = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];
const b3 = INTERNAL.find((c) => c.code === 'B3')!;

describe('the probe list, decision 52', () => {
  it('reads the plain name, and never the internal name or the detector’s own signal', async () => {
    const report: any = await reportsFor('MEMBER').get('g-atlas', 'u-tunde', 'org-1');
    const probeLines: string[] = (report.probes ?? []).flatMap((p: any) => p.probe ?? []);
    const joined = probeLines.join(' ');
    expect(joined).toContain('Others describe doing work they described as theirs');
    expect(joined).not.toContain(b3.signal);
    expect(joined).not.toContain(b3.name);
    expect(joined).not.toMatch(/\bB3\b/);
  });

  it('a colleague never reads it, and never reaches this list at all', async () => {
    const asFemi: any = await reportsFor('MEMBER').get('g-atlas', 'u-femi', 'org-1');
    expect(asFemi.probes ?? null).toBeNull();
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, the lead's
 * report carries no pattern line". There is no such reach now: with nothing put in force, the lead's
 * probe list carries Femi's pattern, in its plain name, after his turn.
 */
describe('with no setting at all, the lead’s report carries the pattern line (decision 86)', () => {
  it('the lead’s probe list holds Femi’s pattern in plain words, and never the internal name', async () => {
    const report: any = await reportsFor('MEMBER').get('g-atlas', 'u-tunde', 'org-1');
    const all = JSON.stringify(report.probes ?? []);
    expect(all).toContain('Others describe doing work they described as theirs');
    expect(all).not.toContain(b3.signal);
    expect(all).not.toContain(b3.name);
  });

  it('an admin of the organisation who does not run the check-in reads none (decision 58)', async () => {
    const report: any = await reportsFor('ADMIN').get('g-atlas', 'u-grace', 'org-1').catch(() => null);
    expect(JSON.stringify(report ?? null)).not.toContain('Others describe doing work they described as theirs');
  });
});
