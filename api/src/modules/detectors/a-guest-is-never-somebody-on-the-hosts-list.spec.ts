import * as fs from 'fs';
import * as path from 'path';

/*
 * A GUEST'S CHECK-IN WORDS ARE NEVER CREDITED TO AN ENTRY ON THE HOST'S LIST (decisions 27 and 36).
 *
 * Found in the test data while building guests in Ask Groundwork: Kofi is a guest from another
 * organisation, and his address is also on an unclaimed entry on the host's list. The detectors join
 * a participant to an entry by address, so what Kofi said in his check-in, the aims he stated and the
 * handoff he cleared were all read as that entry's.
 *
 * The same organisation is run twice. Once with Kofi as a guest, where nothing may reach the entry;
 * and once with Kofi as one of the organisation's own people, where the same shape of data must be
 * matched exactly as before. The second run is what stops the first passing by matching nobody.
 */
const KOFI = 'kofi@elsewhere.test';
const AMA = 'ama@host.test';

const run = async (kofiIsAGuest: boolean) => {
  const contributions: any[] = [];
  const findings: any[] = [];
  const looked: string[] = [];
  const empty = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null,
    count: async () => 0, create: async () => ({}), update: async () => ({}), upsert: async () => ({}) };
  const kofiSpeaks = { email: KOFI, userId: 'u-kofi', user: { email: KOFI } };
  const amaSpeaks = { email: AMA, userId: 'u-ama', user: { email: AMA } };
  const at = new Date('2026-09-20T09:00:00Z');
  const mocked: any = {
    detectionQuietPeriod: { findMany: async () => [] },
    subject: { findMany: async () => [
      { externalId: 'atlas', title: 'Atlas launch', ownerExternalId: 'ama', contributorExternalIds: [], parentExternalId: null, createdAt: new Date('2026-01-01') },
    ] },
    assistantTurn: { findMany: async () => [] },
    conversationTurn: { findMany: async () => [
      { content: 'I spent the week on the Atlas launch, fixing the sign-up page.', createdAt: at, checkIn: { participant: kofiSpeaks } },
      { content: 'The Atlas launch is waiting on the pricing page.', createdAt: new Date(at.getTime() + 1000), checkIn: { participant: amaSpeaks } },
    ] },
    /* The unclaimed entry that shares Kofi's address, and Ama, who is one of the organisation's own. */
    person: {
      findMany: async () => [
        { externalId: 'kofi-entry', displayName: 'Kofi Entry', userName: KOFI, email: KOFI, managerExternalId: 'ama', active: true, createdAt: new Date('2024-01-01') },
        { externalId: 'ama', displayName: 'Ama Owusu', userName: AMA, email: AMA, managerExternalId: null, active: true, createdAt: new Date('2024-01-01') },
      ],
      findFirst: async (a: any) => {
        const email = a?.where?.email;
        looked.push(email);
        if (email === KOFI) return { externalId: 'kofi-entry' };
        if (email === AMA) return { externalId: 'ama' };
        return null;
      },
    },
    organizationMembership: { findMany: async () => (kofiIsAGuest ? [{ userId: 'u-kofi', user: { email: KOFI } }] : []) },
    ground: { findMany: async () => [{ id: 'g1', subjectExternalId: 'atlas' }] },
    personObjective: { findMany: async () => [
      { text: 'The sign-up page works on phones.', createdAt: at, participant: { email: KOFI, userId: 'u-kofi' } },
      { text: 'Pricing agreed with finance before March.', createdAt: at, participant: { email: AMA, userId: 'u-ama' } },
    ] },
    /* Ama was waiting on Kofi, and Kofi cleared it. */
    groundDependency: { findMany: async () => [
      { what: 'The Atlas launch sign-up page', fromParticipant: { email: AMA, userId: 'u-ama' }, onParticipant: { email: KOFI, userId: 'u-kofi' } },
    ] },
    groundParticipant: { findMany: async () => [{ email: KOFI, userId: 'u-kofi' }, { email: AMA, userId: 'u-ama' }] },
    contribution: {
      findMany: async () => [],
      upsert: async (a: any) => { contributions.push(a.create); return {}; },
    },
    detectorResult: { findMany: async () => [], findFirst: async () => null, update: async () => ({}),
      create: async (a: any) => { findings.push(a.data); return {}; } },
  };
  const prisma: any = new Proxy(mocked, { get: (t, k: string) => t[k] ?? empty });
  const { DetectorsService } = require('./detectors.service');
  const { OnboardingService } = require('../grounds/onboarding.service');
  await new DetectorsService(prisma, new OnboardingService(prisma)).run('org-host');
  return { contributions, findings, looked };
};

const credited = (rows: any[], who: string) => rows.filter((r) => r.personExternalId === who).map((r) => r.kind).sort();
const namesThem = (f: any, who: string) => f.personExternalId === who || JSON.stringify(f.evidence ?? {}).includes(who);

describe('a guest is never somebody on the host\'s list', () => {
  it('so a guest\'s check-in words, aims and cleared handoff are credited to nobody on the list', async () => {
    const { contributions, findings, looked } = await run(true);
    /* What the guest said, what they cleared: nothing reaches the entry that shares their address. */
    expect(credited(contributions, 'kofi-entry')).toEqual([]);
    /* No finding names the entry: no divergence between it and Ama, and no missing check-in. */
    expect(findings.filter((f) => namesThem(f, 'kofi-entry'))).toEqual([]);
    /* And the guest's address is never even looked up against the list. */
    expect(looked).not.toContain(KOFI);
    /* The organisation's own person is still read: Ama's words are hers. */
    expect(credited(contributions, 'ama')).toContain('STATED');
  });

  it('while one of the organisation\'s own people with the same shape is matched as before', async () => {
    const { contributions, findings } = await run(false);
    expect(credited(contributions, 'kofi-entry')).toEqual(['STATED', 'UNBLOCKING']);
    expect(findings.some((f) => f.key === 'goal_divergence' && namesThem(f, 'kofi-entry'))).toBe(true);
  });

  /* The source, with comments stripped, so a comment cannot be what satisfies the check. */
  const source = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('and every place that ties check-in content to an entry on the list asks first', () => {
    const asks = /isAGuest(Here|In)\(/;
    for (const file of [
      './detectors.service.ts',
      '../patterns/patterns.service.ts',
      '../conversation/conversation.service.ts',
      '../grounds/grounds.cron.ts',
      '../grounds/your-board.service.ts',
      '../public-api/grounds-by-api.service.ts',
      '../public-api/whatsapp-for-an-organisation.service.ts',
    ]) {
      expect([file, asks.test(source(file))]).toEqual([file, true]);
    }
    /* In the detectors, one for each way check-in content reaches the list: words, aims, both sides of a handoff, and who checked in. */
    expect(source('./detectors.service.ts').match(/isAGuestHere\(/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});

describe('who counts as a guest', () => {
  const { isAGuestHere, theGuestsHere } = require('../participants/a-guest-is-never-somebody-on-the-hosts-list');

  it('is decided by the GUEST membership, by sign-in or by either address', async () => {
    const guests = await theGuestsHere({ organizationMembership: { findMany: async () => [{ userId: 'u-kofi', user: { email: 'Kofi@Elsewhere.test' } }] } }, 'org-host');
    expect(isAGuestHere(guests, { userId: 'u-kofi' })).toBe(true);
    expect(isAGuestHere(guests, { email: '  KOFI@elsewhere.test ' })).toBe(true);
    expect(isAGuestHere(guests, { email: 'open-1@unclaimed.invalid', userEmail: KOFI })).toBe(true);
    expect(isAGuestHere(guests, { email: AMA, userId: 'u-ama' })).toBe(false);
  });

  it('and when the memberships cannot be read, nobody is matched', async () => {
    const guests = await theGuestsHere({ organizationMembership: { findMany: async () => { throw new Error('down'); } } }, 'org-host');
    expect(isAGuestHere(guests, { email: AMA })).toBe(true);
  });
});
