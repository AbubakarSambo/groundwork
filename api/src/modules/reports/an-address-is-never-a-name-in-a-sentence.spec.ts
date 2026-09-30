import { PartyType, GroundMode, GroundScenario } from '@prisma/client';
import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';
import { whatEachLabelIsCalled, withoutAddressesAsNames, withoutInternalLabelsIn } from './no-internal-label-reaches-anyone';
import { whatNeedsYou } from '../grounds/what-needs-you';
import { whatToCallThem } from '../conversation/a-colleague-in-an-interview-has-a-name';
import { plainWordsByPerson } from './party-labels';

/**
 * AN ADDRESS IS NEVER A NAME IN A SENTENCE (week 12c; screens requests 56, 58, 65).
 *
 * Zawadi has been invited and has given no name. The lead reads the report, the board, Today, and the
 * check-in is built for the person asked; in none of the sentences is she her address, or any part of
 * it. She is "a colleague". The address is only ever in its own `email` field.
 */
const ADDRESS = 'zawadi.u8@example.test';
const person = (id: string, userId: string | null, first: string | null, partyType: PartyType, email: string, at: string) => ({
  id, userId, partyType, email, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, createdAt: new Date(at), user: first ? { firstName: first, lastName: 'Kamau' } : null,
});
const LEAD = person('p-lead', 'u-lead', 'Wairimu', PartyType.INITIATOR, 'wairimu@baridi.test', '2026-09-01T09:00:00Z');
const AISHA = person('p-aisha', 'u-aisha', 'Aisha', PartyType.PARTICIPANT, 'aisha@baridi.test', '2026-09-01T10:00:00Z');
const ZAWADI = person('p-zawadi', null, null, PartyType.PARTICIPANT, ADDRESS, '2026-09-01T11:00:00Z');

const PLANTED = {
  sharedPicture: `Start with ${ADDRESS}. Zawadi.u8 has not answered, and zawadi.u8 was asked twice.`,
  agreements: [`The record holds nothing about ${ADDRESS}.`],
  whatEachPersonSaid: [{ who: ADDRESS, finding: 'Nothing yet.' }],
};

const ground = (): any => ({
  id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: 'u-lead', createdByUserId: 'u-lead',
  organizationId: 'org-1', peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales', participants: [LEAD, AISHA, ZAWADI],
  checkIns: [{ id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T10:00:00Z') }],
  report: { ...PLANTED, releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: PLANTED.sharedPicture, centralQuestion: `What does ${ADDRESS} need?`,
    engagement: {}, findings: [{ participantId: 'p-aisha', text: `Start with ${ADDRESS}.`, hasGap: false }],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z') },
  objectives: [], dependencies: [], poll: null,
});

function prismaFor(g: any, role: string) {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(g))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(g.checkIns))) }),
  } as any, { get(t: any, k: string) { if (!(k in t) && typeof k === 'string' && !k.startsWith('$')) t[k] = model(); return t[k]; } });
}

/** Every sentence in what was served: every string that is not a field holding an address by design. */
function sentencesIn(v: any, key = ''): string[] {
  if (typeof v === 'string') return /^(email|address|replyTo|to)$/i.test(key) ? [] : [v];
  if (!v || typeof v !== 'object' || v instanceof Date) return [];
  return Object.entries(v).flatMap(([k, x]) => sentencesIn(x, k));
}
const NO_ADDRESS = /@|zawadi\.u8/i;

const READERS: [string, string, string][] = [
  ['the lead', 'u-lead', 'MEMBER'],
  ['a participant', 'u-aisha', 'MEMBER'],
  ['an admin who only reads', 'u-grace', 'ADMIN'],
];

describe('a person with no name, read as each reader', () => {
  it.each(READERS)('on the board, as %s', async (_w, userId, role) => {
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prismaFor(ground(), role), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    const sentences = sentencesIn(await svc.get('g-1', userId));
    expect(sentences.filter((s) => NO_ADDRESS.test(s))).toEqual([]);
  });

  it.each(READERS)('on every report read, as %s', async (_w, userId, role) => {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prismaFor(ground(), role);
    svc.isAnAdminOf = async () => role === 'ADMIN';
    const served = await svc.whatTheLeadHasNotShared('g-1', userId, 'org-1', { ...PLANTED, updatedAt: new Date('2026-09-23T15:02:00Z') });
    expect(sentencesIn(served).filter((s) => NO_ADDRESS.test(s))).toEqual([]);
    expect(served.sharedPicture).toMatch(/^Start with (a|one) colleague\. The same colleague has not answered, and the same colleague was asked twice\.$/);
  });

  it('the same unnamed person twice is "the same colleague", and two different ones still read as two', () => {
    const other = person('p-baraka', null, null, PartyType.PARTICIPANT, 'baraka.k3@example.test', '2026-09-01T12:00:00Z');
    const called = whatEachLabelIsCalled([LEAD, AISHA, ZAWADI, other] as any, { viewerParticipantId: null, viewerIsLead: true, peersAreNamed: true });
    expect(withoutAddressesAsNames(`${ADDRESS} has not answered, and zawadi.u8 was asked twice.`, called))
      .toMatch(/^(A|One) colleague has not answered, and the same colleague was asked twice\.$/);
    const two = withoutAddressesAsNames(`Ask ${ADDRESS} first, then baraka.k3@example.test, then ${ADDRESS} again.`, called);
    expect(two).toMatch(/^Ask (a|one|another) colleague first, then (a|one|another) colleague, then (the same|that other) colleague again\.$/);
    const [, one, two2] = two.match(/^Ask (\w+ colleague) first, then (\w+ colleague)/)!;
    expect(one).not.toBe(two2);
  });
  it('the address stays in its own field, and only there', () => {
    const called = whatEachLabelIsCalled([LEAD, AISHA, ZAWADI] as any, { viewerParticipantId: null, viewerIsLead: true, peersAreNamed: true });
    const out: any = withoutInternalLabelsIn({ roster: [{ name: 'a colleague', email: ADDRESS, says: `Start with ${ADDRESS}.` }] }, called);
    expect(out.roster[0].email).toBe(ADDRESS);
    expect(out.roster[0].says).toMatch(/^Start with (a|another) colleague\.$/);
  });

  it('a named person is not changed, and a word that is only an ordinary word is left', () => {
    const tobi = person('p-tobi', 'u-tobi', 'Tobi', PartyType.PARTICIPANT, 'tobi@baridi.test', '2026-09-01T12:00:00Z');
    const sales = person('p-sales', null, null, PartyType.PARTICIPANT, 'sales@baridi.test', '2026-09-01T13:00:00Z');
    const called = whatEachLabelIsCalled([LEAD, tobi, sales] as any, { viewerParticipantId: null, viewerIsLead: true, peersAreNamed: true });
    expect(withoutAddressesAsNames('Tobi says sales were slow.', called)).toBe('Tobi says sales were slow.');
  });
});

describe('Today, as the lead', () => {
  it('names nobody by an address', () => {
    const g: any = {
      id: 'g', label: 'Sales', status: 'ACTIVE', organizationId: 'org-1', initiatorId: 'u-lead',
      participants: [{ id: 'p-lead', userId: 'u-lead', user: { firstName: 'Wairimu' } }, { id: 'p-aisha', userId: 'u-aisha', user: { firstName: 'Aisha' } }, { id: 'p-zawadi', userId: null, email: ADDRESS, user: null }],
      checkIns: [{ id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', availableFrom: '2026-09-20T00:00:00Z', completedAt: '2026-09-21T00:00:00Z' }],
    };
    const told = whatNeedsYou([g], { userId: 'u-lead', role: 'MEMBER', organizationId: 'org-1', notLetIn: false } as any, []);
    expect(sentencesIn(told).filter((s) => NO_ADDRESS.test(s))).toEqual([]);
  });
});

describe('the check-in is built for somebody else', () => {
  it('calls a colleague with no name "a colleague", even where they typed her address', () => {
    const plainWords = plainWordsByPerson([LEAD, AISHA, ZAWADI] as any);
    expect(whatToCallThem({ person: ZAWADI as any, peersMayBeNamed: true, plainWords, fallback: 'a colleague' })).toBe('a colleague');
    expect(whatToCallThem({ person: ZAWADI as any, speakerCalledThem: ADDRESS, peersMayBeNamed: true, plainWords, fallback: 'a colleague' })).toMatch(/colleague$/);
  });
});
