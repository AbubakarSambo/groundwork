import {
  findUnattachedWork, findNoLead, findNoCheckIn,
  sayUnattached, sayNoLead, sayNoCheckIn,
  UNATTACHED_MENTIONS, SETTLING_IN_DAYS,
} from './the-three-that-were-not-built';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const subject = (title: string) => ({
  externalId: title, title, ownerExternalId: null, contributorExternalIds: [], parentExternalId: null,
});
const turn = (personExternalId: string, content: string, at = daysAgo(1)) =>
  ({ personExternalId, content, createdAt: at });

describe('work described repeatedly that sits against nothing', () => {
  const subjects = [subject('paying user pricing'), subject('onboarding rewrite')];

  it('fires only after somebody has said it enough times to mean something', () => {
    const one = [turn('ada', 'I have been working on the vendor migration all week')];
    expect(findUnattachedWork(subjects, one)).toEqual([]);

    const enough = Array.from({ length: UNATTACHED_MENTIONS }, (_, i) =>
      turn('ada', 'I have been working on the vendor migration', daysAgo(10 - i)));
    const [f] = findUnattachedWork(subjects, enough);
    expect(f.personExternalId).toBe('ada');
    expect(f.mentions).toBe(UNATTACHED_MENTIONS);
    /* Oldest first and newest last, so "how long has this been going on" is answerable. */
    expect(f.firstSeenAt).toEqual(daysAgo(10));
    expect(f.lastSeenAt).toEqual(daysAgo(8));
  });

  it('does not fire on somebody describing declared work', () => {
    const on = Array.from({ length: 5 }, () => turn('ada', 'I have been working on the onboarding rewrite'));
    expect(findUnattachedWork(subjects, on)).toEqual([]);
  });

  it('and does not fire on merely mentioning something unrecognised', () => {
    /*
     * A detector that fires whenever a turn contains an unfamiliar noun is noise with a name -
     * that is every conversation ever had. The finding is that they described DOING work.
     */
    const asking = Array.from({ length: 5 }, () => turn('ada', 'what is the vendor migration about?'));
    expect(findUnattachedWork(subjects, asking)).toEqual([]);
  });

  it('and says how many times without saying what the work was', () => {
    const f = { personExternalId: 'ada', mentions: 4, firstSeenAt: NOW, lastSeenAt: NOW };
    const said = sayUnattached(f);
    expect(said).toMatch(/4 times/);
    /* The turn is their own words about their own work, and this finding goes to an admin. */
    expect(said).not.toMatch(/vendor|migration|"/);
  });
});

describe('nobody is this person\'s manager', () => {
  const p = (externalId: string, managerExternalId: string | null, active = true) =>
    ({ externalId, managerExternalId, active });

  it('says nothing when exactly one person has no manager', () => {
    /*
     * Somebody has to be at the top, and they report to a board that is not in the directory.
     * Firing on them nightly would put a permanent false entry at the head of the list and teach
     * whoever reads it that the list has noise in it.
     */
    expect(findNoLead([p('ceo', null), p('ada', 'ceo'), p('lin', 'ceo')])).toEqual([]);
  });

  it('but reports all of them when the field has clearly been dropped', () => {
    const out = findNoLead([p('ceo', null), p('ada', null), p('lin', null)]);
    expect(out.map((o) => o.personExternalId).sort()).toEqual(['ada', 'ceo', 'lin']);
  });

  it('and catches a reporting line pointing at somebody who has left', () => {
    /* Worse than an empty field, because the record looks complete. */
    const out = findNoLead([p('ceo', null), p('ada', 'departed'), p('lin', 'ceo')]);
    expect(out.map((o) => o.personExternalId)).toEqual(['ada']);
    expect(sayNoLead(out[0])).toMatch(/not in the directory/);
  });

  it('and ignores deactivated people entirely', () => {
    expect(findNoLead([p('ceo', null), p('gone', null, false), p('lin', 'ceo')])).toEqual([]);
  });
});

describe('somebody who has never given their own account', () => {
  const p = (externalId: string, createdAt: Date, active = true) => ({ externalId, createdAt, active });

  it('leaves a new joiner alone', () => {
    /*
     * A product that opens by telling somebody who joined last week that they have failed to do
     * something is not one they will use. The honest answer during that window is "not yet".
     */
    expect(findNoCheckIn([p('new', daysAgo(SETTLING_IN_DAYS - 1))], new Set(), NOW)).toEqual([]);
  });

  it('and reports somebody who has been here long enough', () => {
    const [f] = findNoCheckIn([p('ada', daysAgo(60))], new Set(), NOW);
    expect(f.personExternalId).toBe('ada');
    expect(f.knownForDays).toBe(60);
    expect(sayNoCheckIn(f)).toMatch(/60 days/);
  });

  it('and says nothing about somebody who has checked in', () => {
    expect(findNoCheckIn([p('ada', daysAgo(60))], new Set(['ada']), NOW)).toEqual([]);
  });

  it('and nothing about somebody deactivated', () => {
    expect(findNoCheckIn([p('gone', daysAgo(60), false)], new Set(), NOW)).toEqual([]);
  });
});

describe('an organisation with no imported objectives still hears about its people', () => {
  /*
   * NOTHING CAUGHT THIS. Restoring the early return - `if (!subjects.length) return` above
   * everything - left all 80 detector tests passing, and `no_lead` and `no_checkin` would simply
   * never have run for an org that connected its identity provider before importing any objectives.
   *
   * That org is the one that most wants to hear its reporting lines are broken, and it is also the
   * likeliest state on day one of a trial.
   */
  const run = async (subjectCount: number, extraPeople: any[] = []) => {
    const created: any[] = [];
    /*
     * Anything not named below answers empty. The subject of this test is whether the people
     * detectors run at all, and listing every unrelated model would make it a test about fixtures.
     */
    const empty = { findMany: async () => [], findFirst: async () => null,
      create: async () => ({}), update: async () => ({}), upsert: async () => ({}) };
    const mocked: any = {
      detectionQuietPeriod: { findMany: async () => [] },
      subject: { findMany: async () => Array.from({ length: subjectCount },
        (_, i) => ({ externalId: `s${i}`, title: `objective ${i}`, ownerExternalId: null, contributorExternalIds: [], parentExternalId: null, createdAt: new Date('2026-01-01') })) },
      assistantTurn: { findMany: async () => [] },
      person: { findMany: async () => [
        { externalId: 'ceo', managerExternalId: null, active: true, createdAt: new Date('2024-01-01'), email: 'ceo@x.com' },
        { externalId: 'ada', managerExternalId: 'departed', active: true, createdAt: new Date('2024-01-01'), email: 'ada@x.com' },
        ...extraPeople,
      ] },
      groundParticipant: { findMany: async () => [] },
      detectorResult: { findMany: async () => [], findFirst: async () => null, update: async () => ({}),
        create: async (a: any) => { created.push(a.data); return {}; } },
      contribution: { upsert: async () => ({}) },
      groundDependency: { findMany: async () => [] },
      ground: { findMany: async () => [] },
      assistantProposal: { findFirst: async () => null },
      recommendation: { findFirst: async () => null, create: async () => ({}) },
    };
    const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
    const { DetectorsService } = require('./detectors.service');
    /* The real OnboardingService against the same fake prisma, rather than a stub: the exemption
       rule is the point of this test and a stub would let it be wrong. */
    const { OnboardingService } = require('../grounds/onboarding.service');
    await new DetectorsService(prisma, new OnboardingService(prisma)).run('org-a');
    return created.map((c) => `${c.key}:${c.personExternalId}`).sort();
  };

  it('reports the broken reporting line and the missing account with zero subjects', async () => {
    expect(await run(0)).toEqual(['no_checkin:ada', 'no_checkin:ceo', 'no_lead:ada']);
  });

  it('and the same with subjects present, so the two are genuinely independent', async () => {
    expect(await run(2)).toEqual(expect.arrayContaining(['no_lead:ada', 'no_checkin:ceo']));
  });

  it('and somebody the join cannot match is never accused of not checking in', async () => {
    /*
     * `no_checkin` is decided by matching a Person to a participant on email, which is the only
     * identifier the two reliably share. Somebody with no email cannot be matched - and the
     * difference between "has not checked in" and "we could not tell" is the whole finding.
     *
     * Treating unmatchable as never-checked-in would turn a data-quality problem into a statement
     * about a person, told to their admin, and it would be indistinguishable from the real thing.
     * The comment said so; nothing enforced it until this test.
     */
    const out = await run(0, [{ externalId: 'nomail', managerExternalId: 'ceo',
      active: true, createdAt: new Date('2024-01-01'), email: null }]);
    expect(out).not.toContain('no_checkin:nomail');
  });
});

describe('the onboarding window is when they started the ROLE, not when they joined', () => {
  it('so somebody who moved internally is not three years overdue on day one', async () => {
    /*
     * The directory date was a stand-in and it fails on the commonest case there is: an internal
     * move. Somebody three years at the company who changed jobs last week has, by that measure,
     * never checked in for three years - and would be told so in their first fortnight.
     */
    const created: any[] = [];
    const empty = { findMany: async () => [], findFirst: async () => null,
      create: async () => ({}), update: async () => ({}), upsert: async () => ({}) };
    const mocked: any = {
      detectionQuietPeriod: { findMany: async () => [] },
      subject: { findMany: async () => [] },
      assistantTurn: { findMany: async () => [] },
      person: { findMany: async () => [
        { externalId: 'mover', managerExternalId: 'boss', active: true,
          createdAt: new Date('2023-01-01'), email: 'mover@x.com' },
        { externalId: 'boss', managerExternalId: null, active: true,
          createdAt: new Date('2023-01-01'), email: 'boss@x.com' },
      ] },
      roleAssignment: { findMany: async () => [
        { personExternalId: 'mover', startedAt: new Date(Date.now() - 5 * 86_400_000) },
      ] },
      groundParticipant: { findMany: async () => [] },
      detectorResult: { findMany: async () => [], findFirst: async () => null, update: async () => ({}),
        create: async (a: any) => { created.push(a.data); return {}; } },
    };
    const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
    const { DetectorsService } = require('./detectors.service');
    /* The real OnboardingService against the same fake prisma, rather than a stub: the exemption
       rule is the point of this test and a stub would let it be wrong. */
    const { OnboardingService } = require('../grounds/onboarding.service');
    await new DetectorsService(prisma, new OnboardingService(prisma)).run('org-a');

    const keys = created.map((c) => `${c.key}:${c.personExternalId}`);
    expect(keys).not.toContain('no_checkin:mover');
    /* And somebody with no assignment still falls back to the directory date, so the weaker test
       is not silently lost for orgs that never populate assignments. */
    expect(keys).toContain('no_checkin:boss');
  });
});
