import { Logger } from '@nestjs/common';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { aCountThatMovedSaid } from './a-count-that-moved-is-one-sentence';

/**
 * A COUNT THAT MOVED, AS EACH READER READS IT (review of 1 October 2026, run re-d, sales, session 2).
 *
 * What Bisi, the lead, read under "since the last round":
 *
 *   "The count for the team is aiming for 120 million naira disbursed went from 0 to 31000000, of the
 *    120000000 aimed for."
 *
 * Served through the report as each reader opens it: Bisi who runs it, Ngozi who is in it, and Grace,
 * an admin who only reads. Each target is the sales team's, as the run had them.
 */

const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
const person = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, email: `${userId}@sales.test`,
  roleAsDescribed: lead ? 'Sales manager' : 'Relationship officer', nameGiven: null, organisationGiven: null, managingOnly: lead,
  createdAt: new Date(`2026-09-01T${lead ? '09' : '10'}:00:00Z`), user: { firstName: first, lastName: last },
});
const BISI = person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', true);
const NGOZI = person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze');
const KWAME = person('p-kwame', 'u-kwame', 'Kwame', 'Mensah');

const CHECK_INS = ['p-ngozi', 'p-kwame'].flatMap((pid) => [1, 2].map((n) => ({
  id: `c-${pid}-${n}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: at(n === 1 ? '15' : '29'),
})));

function groundWith(objectives: any[]): any {
  return {
    id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-bisi', createdByUserId: 'u-bisi', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'FORTNIGHTLY',
    whoSeesTargets: 'EVERYBODY', label: 'Credit sales against this quarter target',
    participants: [BISI, NGOZI, KWAME], checkIns: CHECK_INS,
    /* Both sessions' pictures released: what moved in a session is that session's picture, and a
       participant reads it only once it is released (decision 76, item 4). */
    report: { releasedAt: at('15'), releasedSessions: [1, 2] },
    objectives, dependencies: [], personObjectives: [], poll: null,
  };
}

function reportFor(requestingUserId: string, objectives: any[], viewerRole = 'MEMBER') {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => structuredClone(groundWith(objectives))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => structuredClone(CHECK_INS)) }),
    /* Round 1 closed at nought; round 2 closed where each count is now. */
    groundObjectiveSnapshot: model({ findMany: jest.fn(async (args: any) => (objectives as any[]).map((o) => ({ objectiveId: o.id, count: args?.where?.sessionNumber === 1 ? o.prevCount : o.count }))) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  svc.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
  return (svc as ReportsService).get('g-sales', requestingUserId, 'org-1') as Promise<any>;
}

/* The two team targets, as the run's board showed them: 0 to 11 approved, 0 to 31 million naira. */
const APPROVED = { id: 'o1', name: 'approved facilities', target: 40, count: 11, prevCount: 0, ownerParticipantId: null, setByParticipantId: null, direction: null, sortOrder: 0 };
const DISBURSED_AS_A_SENTENCE = { id: 'o2', name: 'The team is aiming for 120 million naira disbursed.', target: 120000000, count: 31000000, prevCount: 0, ownerParticipantId: null, setByParticipantId: null, direction: null, sortOrder: 1 };
const DISBURSED_AS_SAID = { ...DISBURSED_AS_A_SENTENCE, name: 'N120m disbursed' };
const NGOZIS_OWN = { id: 'o3', name: 'My goal is 14 approved facilities this quarter.', target: 14, count: 6, prevCount: 0, ownerParticipantId: 'p-ngozi', setByParticipantId: 'p-ngozi', direction: null, sortOrder: 2 };

const NO_RAW_NUMBER = /\d{5,}/;
const THE_OLD_PATTERN = /The count for|aimed for/;

describe('a count that moved is said in plain sentences, with numbers a person can read', () => {
  it('Bisi, who runs it, reads each target that moved, with the number aimed for said once', async () => {
    const r = await reportFor('u-bisi', [APPROVED, DISBURSED_AS_A_SENTENCE]);
    expect(r.sinceLast).toEqual({
      says: "The team's approved facilities went from 0 to 11, against the aim of 40. The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira.",
    });
    expect(JSON.stringify(r.sinceLast)).not.toMatch(NO_RAW_NUMBER);
    expect(JSON.stringify(r.sinceLast)).not.toMatch(THE_OLD_PATTERN);
  });

  it('a name stored as the number said ("N120m disbursed") reads the same way', async () => {
    const r = await reportFor('u-bisi', [DISBURSED_AS_SAID]);
    expect(r.sinceLast).toEqual({ says: "The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira." });
  });

  it('Ngozi, in the check-in, reads the team’s counts and her own as "you", and no number aimed for that the name does not already say', async () => {
    const r = await reportFor('u-ngozi', [APPROVED, DISBURSED_AS_A_SENTENCE, NGOZIS_OWN]);
    expect(r.sinceLast).toEqual({
      says: "The team's approved facilities went from 0 to 11. The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira.",
      /* Ngozi set this goal herself, so it is said as hers (decision 75, item 37). */
      also: 'Your own aim is 14 approved facilities this quarter. You said, "My goal is 14 approved facilities this quarter". Your count went from 0 to 6.',
    });
    expect(JSON.stringify(r.sinceLast)).not.toMatch(/against the aim/);
    expect(JSON.stringify(r.sinceLast)).not.toMatch(NO_RAW_NUMBER);
  });

  it('Bisi reads Ngozi’s own goal by her name, never "my"', async () => {
    const r = await reportFor('u-bisi', [NGOZIS_OWN]);
    expect(r.sinceLast).toEqual({ says: 'Ngozi\'s own aim is 14 approved facilities this quarter. Ngozi said, "My goal is 14 approved facilities this quarter". Ngozi\'s count went from 0 to 6.' });
  });

  it('Grace, an admin who only reads, reads what moved for the team, with no number aimed for', async () => {
    const r = await reportFor('u-grace', [APPROVED, DISBURSED_AS_A_SENTENCE], 'ADMIN');
    expect(r.sinceLast).toEqual({
      says: "The team's approved facilities went from 0 to 11. The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira.",
    });
    expect(JSON.stringify(r)).not.toMatch(/against the aim/);
  });

  it('a limit the lead set is said as a limit, never as an aim', () => {
    expect(aCountThatMovedSaid(
      { name: 'Spending this quarter', target: 180000, count: 254000, prevCount: 120000, direction: 'LIMIT' },
      { whose: 'team', againstTheAim: true },
    )).toBe("The team's spending this quarter went from 120,000 to 254,000, against the limit of 180,000.");
  });
});
