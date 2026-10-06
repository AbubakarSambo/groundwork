import { CompanyService } from './company.service';
import { buildPicture, notReachingFrom, tidyTitle, type PictureInput, type StoredPicture } from './the-company-picture';

/**
 * THE COMPANY PAGE'S QUESTIONS READ AS PLAIN SENTENCES (4 October 2026 review, items C1, C2, C3 and C6).
 *
 * It was found on the Groundwork organisation's own data: three priorities named an owner nobody in the
 * organisation matches ("james", "abubakar"), yet read "has an owner" and were asked "For the person who
 * owns it"; two titles were pasted raw into questions (": three customers live on the API" and "Ten
 * companies lined up for the sprint — Companies attached to the September sprint"); and each priority
 * that was both unowned-underneath and overdue got two rows. The rows below are stored as the old code
 * wrote them, because opening the page never writes the picture again, and are read as each person is served.
 */
const ORG = 'org-gw';
const NOW = Date.now();
const ago = (d: number) => new Date(NOW - d * 86_400_000);
const RAW_SPRINT = 'Ten companies lined up for the sprint — Companies attached to the September sprint';
const RAW_API = ': three customers live on the API';

const subjects = [
  { id: 'p1', externalId: 'o1', type: 'OBJECTIVE', title: RAW_SPRINT, measure: 'companies', target: '10', ownerExternalId: 'hafsah', createdAt: ago(60), dueDate: ago(5), status: 'In progress' },
  { id: 'p2', externalId: 'o2', type: 'OBJECTIVE', title: RAW_API, measure: 'customers', target: '3', ownerExternalId: 'hafsah', createdAt: ago(59), dueDate: ago(4), status: 'In progress' },
  { id: 'p3', externalId: 'o3', type: 'OBJECTIVE', title: 'The product supports what these ten want to do', measure: null, target: null, ownerExternalId: 'james', createdAt: ago(58) },
  { id: 'p4', externalId: 'o4', type: 'OBJECTIVE', title: 'Nothing technical is standing between a company and using it', measure: null, target: null, ownerExternalId: null, createdAt: ago(57) },
].map((s: any) => ({ organizationId: ORG, status: null, dueDate: null, syncedAt: ago(1), sourceDeletedAt: null, ...s }));

const nothingUnder = (n: number, id: string, title: string, owner: string | null) => ({
  id: `nothing-under-${id}`,
  observation: `Priority ${n} has an owner, but nothing is underneath it and no check-in feeds it.`,
  question: `Which team should take on priority ${n}, ${title}?`,
  forWhom: owner ? { kind: 'owner', externalId: owner } : { kind: 'leadership' },
  restsOn: [] as string[],
});
const OLD_ROWS = [
  nothingUnder(1, 'p1', RAW_SPRINT, 'hafsah'),
  nothingUnder(2, 'p2', RAW_API, 'hafsah'),
  nothingUnder(3, 'p3', 'The product supports what these ten want to do', 'james'),
  { id: 'no-owner-p4', observation: 'Priority 4 has no owner and nothing underneath it.', question: 'Who owns priority 4, Nothing technical is standing between a company and using it?', forWhom: { kind: 'leadership' }, restsOn: [] as string[] },
  { id: 'overdue-p1', observation: `${RAW_SPRINT} is still open, and its date has passed.`, question: `Should ${RAW_SPRINT} get a new date, or be closed?`, forWhom: { kind: 'owner', externalId: 'hafsah' }, restsOn: [] as string[] },
  { id: 'overdue-p2', observation: `${RAW_API} is still open, and its date has passed.`, question: `Should ${RAW_API} get a new date, or be closed?`, forWhom: { kind: 'owner', externalId: 'hafsah' }, restsOn: [] as string[] },
];
const stored: StoredPicture = {
  readings: subjects.map((s: any, i: number) => ({ priorityId: s.id, number: i + 1, tag: 'Nothing is moving it yet', says: 'This priority is not moving.', restsOn: [], levels: [] })),
  notReaching: OLD_ROWS as any,
  namedByTeams: [], saidAndShown: [],
};

const readers = {
  hafsah: { userId: 'u-hafsah', email: 'hafsah@gw.test', role: 'ADMIN' },
  sahar: { userId: 'u-sahar', email: 'sahar@gw.test', role: 'MEMBER' },
};

function read(who: keyof typeof readers) {
  const prisma: any = {
    organization: { findUnique: async () => ({ name: 'Groundwork' }) },
    subject: { findMany: async () => subjects },
    person: { findMany: async () => [{ externalId: 'hafsah', displayName: 'Hafsah Jumare', title: null, linkedUserId: 'u-hafsah' }] },
    organizationMembership: { findMany: async () => [{ team: null }] },
    ground: { findMany: async () => [] },
    companyPicture: { findUnique: async () => ({ ...stored }) },
  };
  return new CompanyService(prisma, { list: async () => [] } as any).forReader({ ...readers[who], organizationId: ORG });
}

const SENTENCES = [
  ['Priority 1 has an owner, but nothing is underneath it and no check-in feeds it. Its date has passed, and it is not marked as done.', 'Which team should take on priority 1, “Ten companies lined up for the sprint”?', 'For you'],
  ['Priority 2 has an owner, but nothing is underneath it and no check-in feeds it. Its date has passed, and it is not marked as done.', 'Which team should take on priority 2, “three customers live on the API”?', 'For you'],
  ['Priority 3 names an owner who is not one of the people in your organisation, and nothing is underneath it and no check-in feeds it.', 'Who should own priority 3, “The product supports what these ten want to do”?', 'For you'],
  ['Priority 4 has no owner and nothing underneath it.', 'Who owns priority 4, “Nothing technical is standing between a company and using it”?', 'For you'],
];

describe('the Company page, as each reader reads it, on rows the old code stored', () => {
  it('Hafsah, an admin, reads one row for each priority, in plain sentences, and only what is true', async () => {
    const page = await read('hafsah');
    expect(page.notReaching.map((n) => [n.observation, n.question, n.forWhom])).toEqual(SENTENCES);
  });

  it('never says "has an owner" of a priority whose owner nobody here matches, and never "For the person who owns it"', async () => {
    const text = JSON.stringify((await read('hafsah')).notReaching);
    expect(text).not.toContain('Priority 3 has an owner');
    expect(text).not.toContain('For the person who owns it');
  });

  it('shows no raw title: no leading colon, no dash joining two pieces, no title pasted bare into a question', async () => {
    const page = await read('hafsah');
    const text = page.notReaching.map((n) => `${n.observation} ${n.question}`).join(' ');
    expect(text).not.toMatch(/priority \d, :|, :|—|Companies attached/);
    expect(page.priorities[1].title).toBe('three customers live on the API');
  });

  it('a member who runs no check-in is given none of it', async () => {
    const page = await read('sahar');
    expect(page.notReaching).toEqual([]);
    expect(JSON.stringify(page)).not.toMatch(/names an owner|Which team should/);
  });
});

describe('a new picture is written the same way', () => {
  const input: PictureInput = {
    priorities: [
      { id: 'p1', number: 1, title: RAW_SPRINT, ownerExternalId: 'hafsah', ownerKnown: true, overdue: true, hasChildren: false, feedingGroundIds: [], finishedLast30: 0, blocked: 0, waiting: 0, teams: [] },
      { id: 'p3', number: 2, title: 'Open the second warehouse', ownerExternalId: 'james', ownerKnown: false, overdue: false, hasChildren: false, feedingGroundIds: [], finishedLast30: 0, blocked: 0, waiting: 0, teams: [] },
    ],
    handoffs: [],
    subjects: [
      { id: 'p1', externalId: 'o1', type: 'OBJECTIVE', title: RAW_SPRINT, ownerExternalId: 'hafsah', ownerKnown: true, parentExternalId: null, overdue: true },
      { id: 'p3', externalId: 'o3', type: 'OBJECTIVE', title: 'Open the second warehouse', ownerExternalId: 'james', ownerKnown: false, parentExternalId: null, overdue: false },
      { id: 'a1', externalId: 'a1', type: 'PROJECT', title: ': the old portal — shut it down', ownerExternalId: 'james', ownerKnown: false, parentExternalId: 'gone', overdue: true },
    ],
    finishedOnPriorities: 0, groundsOnPriorities: [], names: [],
  };

  it('has one row for each priority or aim, and reads the same as the rows put right on the way out', () => {
    const rows = notReachingFrom(input);
    expect(rows.map((r) => [r.id, r.observation, r.question, r.forWhom])).toEqual([
      ['nothing-under-p1', 'Priority 1 has an owner, but nothing is underneath it and no check-in feeds it. Its date has passed, and it is not marked as done.', 'Which team should take on priority 1, “Ten companies lined up for the sprint”?', { kind: 'owner', externalId: 'hafsah' }],
      ['owner-not-known-p3', 'Priority 2 names an owner who is not one of the people in your organisation, and nothing is underneath it and no check-in feeds it.', 'Who should own priority 2, “Open the second warehouse”?', { kind: 'leadership' }],
      ['orphan-a1', '“the old portal” sits under no current priority. Its date has passed, and it is not marked as done.', 'Which priority does “the old portal” serve?', { kind: 'leadership' }],
    ]);
  });

  it('tidies a title: leading marks off, the name before a dash, a long one cut at a word', () => {
    expect(tidyTitle(RAW_API)).toBe('three customers live on the API');
    expect(tidyTitle(RAW_SPRINT)).toBe('Ten companies lined up for the sprint');
    expect(tidyTitle('Grow revenue 50%, enterprise first')).toBe('Grow revenue 50%, enterprise first');
    expect(tidyTitle('word '.repeat(40)).length).toBeLessThan(95);
  });

  it('the priority card’s "What you say" reads the tidied title too', () => {
    const picture = buildPicture({ ...input, finishedOnPriorities: 4, priorities: [{ ...input.priorities[0], feedingGroundIds: ['g1'], finishedLast30: 1 }] }, null);
    expect(picture.saidAndShown[0].youSaid).toBe('Ten companies lined up for the sprint');
  });
});

describe('"Named by more than one team" and "What you say, and where the time goes", with no data', () => {
  it('are empty when no check-in feeds a priority and no team raised the same thing twice, which is the Groundwork and Meridian data', () => {
    const picture = buildPicture({
      priorities: [{ id: 'p1', number: 1, title: 'x', ownerExternalId: 'h', overdue: false, hasChildren: false, feedingGroundIds: [], finishedLast30: 0, blocked: 0, waiting: 0, teams: [] }],
      handoffs: [{ id: 'h1', groundId: 'g1', team: null, about: 'the invoices are late', status: 'WAITING', priorityNumbers: [] }],
      subjects: [], finishedOnPriorities: 0, groundsOnPriorities: [], names: [],
    }, { namedByTeams: [{ title: 'Late invoices are a problem', handoffIds: ['h1'], teams: [{ team: 'Sales', says: 'Sales meets late invoices.' }] }] });
    expect(picture.namedByTeams).toEqual([]);
    expect(picture.saidAndShown).toEqual([]);
  });
});
