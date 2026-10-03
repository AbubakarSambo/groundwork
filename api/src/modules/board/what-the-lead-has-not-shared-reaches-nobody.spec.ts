import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { withoutHiddenTargets, withoutHiddenTargetsIn, targetsHiddenFrom } from './a-hidden-target-stays-hidden';

/**
 * A PRIVATE FILE'S NAME AND A HIDDEN TARGET'S NUMBER REACH NOBODY THE LEAD HAS NOT SHARED THEM WITH.
 *
 * Hafsah, 28 September 2026, from screens requests 46 and 63. The board and the report are served
 * here, through the real services, to every kind of reader: the lead, a participant whose target is
 * hidden from others, a participant with no target, and an admin who only reads. The file is the
 * lead's own (OWN), so only the lead may see its name - not an admin, who reads with the lead's eyes
 * only for the lead's CLOSED material. Targets are each person's own (THEIR_OWN), so only the lead
 * who set them and the person whose target it is may see the number.
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last },
});
const LEAD = person('p-lead', 'u-wairimu', 'Wairimu', 'Kamau', PartyType.INITIATOR);
const AISHA = person('p-aisha', 'u-aisha', 'Aisha', 'Otieno');
const MIRIAM = person('p-miriam', 'u-miriam', 'Miriam', 'Wanjiku');

const FILE = 'wairimu-team-plan.txt';
const SAID = [
  `The attached ${FILE} document confirms the split between the two.`,
  'Aisha Otieno is aiming for 5 sales this month, and has sold 4.',
  'Miriam Wanjiku visited the buyers.',
].join(' ');

const CHECK_INS = [
  { id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } },
  { id: 'c2', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } },
];

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3',
  participants: [LEAD, AISHA, MIRIAM],
  checkIns: CHECK_INS,
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: SAID, networkPicture: null,
    sharedPicture: SAID, agreements: [SAID], divergences: [], centralQuestion: null, engagement: {},
    findings: [
      { participantId: 'p-aisha', text: 'Aisha Otieno set a target of five sales for her own work. She has four so far.', hasGap: false },
      { participantId: 'p-miriam', text: `Miriam Wanjiku read ${FILE} and visited the buyers.`, hasGap: false },
    ],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
  objectives: [
    { id: 'o-aisha', name: 'Aisha’s sales', target: 5, count: 4, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1, assumes: [],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
  ],
  dependencies: [],
  poll: null,
};
const DOCS = [{ fileName: FILE, visibility: 'OWN', participantId: 'p-lead', createdAt: new Date('2026-09-21T09:00:00Z'), origin: 'TYPED' }];

function prismaFor(viewerRole: string) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    groundDocument: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(DOCS))) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

const boardAs = (userId: string, role = 'MEMBER') => {
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prismaFor(role), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return svc.get('g-sales', userId) as Promise<any>;
};

const READERS: [string, string, string, { file: boolean; target: boolean }][] = [
  ['the lead', 'u-wairimu', 'MEMBER', { file: true, target: true }],
  ['a participant whose own target it is', 'u-aisha', 'MEMBER', { file: false, target: true }],
  ['a participant with no target', 'u-miriam', 'MEMBER', { file: false, target: false }],
  ['an admin who only reads', 'u-grace', 'ADMIN', { file: false, target: false }],
];

const FIVE = /\b5 sales\b|\bfive sales\b/i;

describe('what the lead has not shared reaches nobody, on the board', () => {
  it.each(READERS)('%s', async (_who, userId, role, may) => {
    const served = JSON.stringify(await boardAs(userId, role));
    /* The lead's private file stays the lead's, from an admin too. */
    expect(served.includes(FILE)).toBe(may.file);
    /* Decision 86: on the board an admin sees the figures, Aisha's number included. The report is not
       changed by it (a question for Hafsah). A participant with no target still never reads it. */
    if (role === 'ADMIN') expect(served).toMatch(FIVE);
    else if (!may.target) expect(served).not.toMatch(FIVE);
    /* What is not the lead's to keep stays for everybody: what Miriam did is not a secret. */
    if (served.includes('Miriam Wanjiku')) expect(served).toMatch(/visited the buyers/);
  });

  it('and the lead still reads both', async () => {
    const served = JSON.stringify(await boardAs('u-wairimu'));
    expect(served).toMatch(FIVE);
    expect(served).toContain(FILE);
  });
});

/*
 * REQUEST 46, ON whoOwnsWhat ITSELF. The line the screens found live sat in a person's own row of
 * "who owns what", read from the record. Here Aisha's own record line names the lead's private file,
 * and the panel is read as every reader: only the lead, whose file it is, reads its name there.
 */
describe('and in who owns what, where the line was found live', () => {
  const LINE = { id: 'e1', participantId: 'p-aisha', type: 'COMMITMENT', text: `The attached ${FILE} document confirms the split, and I will close the Kisumu shops.`, checkInId: 'c1', createdAt: new Date('2026-09-22T16:00:00Z') };
  const whoOwnsWhatAs = async (userId: string, role = 'MEMBER') => {
    const prisma: any = prismaFor(role);
    prisma.recordEntry.findMany = jest.fn(async (q: any) => (q?.where?.type ? [JSON.parse(JSON.stringify(LINE))] : []));
    /* What Aisha typed in that check-in, so the line is served as her own words (only words she said are
       quoted: what-each-person-said-is-in-their-name), and the file's name inside them is what is tested. */
    prisma.conversationTurn = { findMany: jest.fn(async () => [{ checkInId: 'c1', content: LINE.text }]) };
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    const board: any = await svc.get('g-sales', userId);
    return JSON.stringify(board.whoOwnsWhat ?? null);
  };

  it.each(READERS)('%s', async (_who, userId, role, may) => {
    const served = await whoOwnsWhatAs(userId, role);
    /* The row itself is served, so the test is reading a real line. Except to Miriam: since request 105 a person
       who checks in is served only their own row (the prototype's B5, "Only yours"), so Aisha's line is not on
       Miriam's board at all, and neither is the file's name. */
    if (userId === 'u-miriam') expect(served).not.toContain('Kisumu shops');
    else expect(served).toContain('Kisumu shops');
    expect(served.includes(FILE)).toBe(may.file);
  });
});

describe('and in the report', () => {
  const reportAs = async (userId: string, role = 'MEMBER') => {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prismaFor(role);
    svc.isAnAdminOf = async () => role === 'ADMIN';
    /* And a line still in labels, as the session report's findings reach this read (live, 28 Sep 2026). */
    const built = { sharedPicture: SAID, findings: GROUND.report.findings, stillInLabels: ['Participant A has four so far. A target of 5 sales appears in the record for Participant A.'], updatedAt: new Date('2026-09-23T15:02:00Z') };
    return svc.whatTheLeadHasNotShared('g-sales', userId, 'org-1', built);
  };

  it.each(READERS)('%s', async (_who, userId, role, may) => {
    const served = await reportAs(userId, role);
    const text = JSON.stringify(served);
    expect(text.includes(FILE)).toBe(may.file);
    if (!may.target) expect(text).not.toMatch(FIVE);
    else expect(text).toMatch(FIVE);
    /* A date is still a date on its way through. */
    expect(served.updatedAt instanceof Date).toBe(true);
  });

  it('get() and sessionReport() both go through it', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const served = await this\.getAsBuilt\(groundId, requestingUserId, requestingUserOrgId\);\s*return this\.whatTheLeadHasNotShared\(/);
    expect(src).toMatch(/const served = await this\.sessionReportAsBuilt\(groundId, sessionNumber, requestingUserId, requestingUserOrgId\);\s*return this\.whatTheLeadHasNotShared\(/);
  });
});

/*
 * TRYING TO GET PAST IT. Hafsah, 28 September 2026: "this sentence or the one before" is a rule of
 * thumb, so these try to get round it. Each one got through the first version or would get through a
 * narrower one.
 */
describe('a hidden target does not get past it', () => {
  const kw = [{ names: ['Kwame Mensah', 'Kwame'], target: 17, participantId: 'p-kwame' }];
  const gone = (t: string) => expect(withoutHiddenTargets(t, kw)).not.toMatch(/\b17\b|seventeen/i);
  it('by a pronoun on the next sentence', () => gone('Kwame Mensah has three so far. His target is 17 approved facilities.'));
  it('by a pronoun two sentences on', () => gone('Kwame Mensah has three so far. He is waiting on legal. His target is 17 approved facilities.'));
  it('three sentences after the name', () => gone('Kwame Mensah has three so far. He is waiting on legal. The committee meets Friday. A target of 17 approved facilities is on record.'));
  it('with the number before the name', () => gone('A target of 17 approved facilities is on record. It belongs to Kwame.'));
  it('in a list on one line', () => gone('Targets: Kwame 17, Femi 11, Ngozi 14'));
  it('in a list over lines', () => gone('- Kwame Mensah\n- 17 approved facilities\n- due in December'));
  it('in words', () => gone('Kwame is aiming for seventeen approved facilities.'));
  it('in words, behind a pronoun', () => gone('Kwame Mensah has three. He is aiming for seventeen.'));
  it('in a row whose name is in another field', () => {
    expect(JSON.stringify(withoutHiddenTargetsIn({ who: 'Kwame Mensah', finding: 'He has three. His target is 17 approved facilities.' }, kw))).not.toMatch(/\b17\b/);
  });
  it('in a row that carries only their id', () => {
    expect(JSON.stringify(withoutHiddenTargetsIn({ participantId: 'p-kwame', says: 'The target is 17.' }, kw))).not.toMatch(/\b17\b/);
  });
  it('in a list of rows, name and number in separate fields', () => {
    expect(JSON.stringify(withoutHiddenTargetsIn({ rows: [{ name: 'Kwame Mensah', target: '17 approved facilities' }] }, kw))).not.toMatch(/\b17\b/);
  });
  it('and a text that never names him keeps its seventeen', () => {
    expect(withoutHiddenTargets('The team has 17 open applications.', kw)).toBe('The team has 17 open applications.');
  });
});

describe('the rule, on its own', () => {
  const hidden = targetsHiddenFrom({ participantId: 'p-miriam', isTheLead: false }, 'THEIR_OWN',
    [{ ownerParticipantId: 'p-aisha', target: 5 }, { ownerParticipantId: 'p-miriam', target: 3 }],
    (pid) => (pid === 'p-aisha' ? ['Aisha Otieno', 'Aisha'] : ['Miriam Wanjiku', 'Miriam']));

  it('hides everybody else’s target, never the reader’s own', () => {
    expect(hidden.map((h) => h.target)).toEqual([5]);
  });

  it('takes out the sentence that gives it, and keeps the rest', () => {
    expect(withoutHiddenTargets('Aisha is aiming for 5 sales. Aisha visited Fresh Foods.', hidden)).toBe('Aisha visited Fresh Foods.');
    /* It errs on the side of hiding: a sentence naming Aisha with her target's number goes, even when
       the number counts something else. A fact lost from a line is better than a target shown. */
    expect(withoutHiddenTargets('Aisha visited five shops. Miriam is aiming for 3 sales.', hidden)).toBe('Miriam is aiming for 3 sales.');
  });

  it('and the sentence after one that names them, as read live', () => {
    expect(withoutHiddenTargets('Aisha has four so far. A target of 5 sales appears in the plan.', hidden)).toBe('Aisha has four so far.');
    expect(withoutHiddenTargets('The lead set no plans. The team has 5 open deals.', hidden)).toBe('The lead set no plans. The team has 5 open deals.');
  });

  it('shares nothing it should not when targets are shared with everybody, or with the lead', () => {
    expect(targetsHiddenFrom({ participantId: 'p-miriam', isTheLead: false }, 'EVERYBODY', [{ ownerParticipantId: 'p-aisha', target: 5 }], () => ['Aisha'])).toEqual([]);
    expect(targetsHiddenFrom({ participantId: 'p-lead', isTheLead: true }, 'THEIR_OWN', [{ ownerParticipantId: 'p-aisha', target: 5 }], () => ['Aisha'])).toEqual([]);
  });
});
