import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundsService } from '../grounds/grounds.service';
import { ConversationService } from '../conversation/conversation.service';
import { buildIntakeBlock } from '../conversation/prompt-library';
import { withoutHiddenTargets, withoutHiddenTargetsIn, type AHiddenTarget } from './a-hidden-target-stays-hidden';

/**
 * A COLLEAGUE'S HIDDEN TARGET CANNOT SLIP THROUGH, IN ANY SHAPE (29 September 2026).
 *
 * On a check-in where people see only their own targets (`whoSeesTargets: THEIR_OWN`), the lead set
 * Kwame Mensah a target of 17 approved facilities. Ngozi, a colleague on the same check-in, must
 * never read that number, whatever shape the words take: behind a pronoun, sentences after the name,
 * split across a list, in words, or with his name spelt with an apostrophe or an accent. Each case
 * here is the text as served to Ngozi. Then the same through the real served paths (her report, her
 * board, an admin who only reads the board, the check-in's page and the list), and the text a
 * person's own check-in hands the model.
 *
 * What this must not do is hide too much: Kwame still reads "Your target is 17", the lead still
 * reads Kwame's 17, and a date or a count that is not his target stays.
 */

const kwame = (target: number, names = ['Kwame Mensah', 'Kwame']): AHiddenTarget[] => [{ names, target, participantId: 'p-kwame' }];
const served = (v: unknown, hidden: AHiddenTarget[]) => JSON.stringify(typeof v === 'string' ? withoutHiddenTargets(v, hidden) : withoutHiddenTargetsIn(v, hidden));

/* [case, what is served, his target, what must not be left] */
const CASES: [string, unknown, number, RegExp][] = [
  /* 1. A pronoun, and the name somewhere else than the number. */
  ['a pronoun two sentences on', 'Kwame Mensah met four customers. He is behind. His target is 17 approved facilities.', 17, /\b17\b/],
  ['a pronoun, target 120', 'Kwame Mensah met four customers. He is behind. His target is 120 approved facilities.', 120, /\b120\b/],
  ['the name only in a sibling field of the row', { who: 'Kwame Mensah', note: 'He is behind. His target is 17.' }, 17, /\b17\b/],
  ['the name in one string of a list, the number in another', ['Kwame Mensah is behind.', 'His target is 17.'], 17, /\b17\b/],
  ['the same list inside a row', { items: ['Kwame Mensah is behind.', 'His target is 120.'] }, 120, /\b120\b/],
  /* 2. The number sentences after the name. */
  ['the number three sentences after the name', 'Kwame is waiting on legal. The paperwork went in on Monday. The bank is slow. He needs 17 to hit the goal.', 17, /\b17\b/],
  ['the same, target 120', 'Kwame is waiting on legal. The paperwork went in on Monday. The bank is slow. He needs 120 to hit the goal.', 120, /\b120\b/],
  /* 3. A list. */
  ['an array of strings', ['Kwame Mensah', 'Target: 17', 'Done: 9'], 17, /\b17\b/],
  ['lines with no name field', { lines: ['Kwame is behind', 'His target is 17'] }, 17, /\b17\b/],
  ['a bulleted string', '- Kwame: 17\n- Ngozi: 12', 17, /\b17\b/],
  ['a table-like row', { cells: ['Kwame', '17'] }, 17, /\b17\b/],
  ['a table-like row, target 120', { cells: ['Kwame', '120'] }, 120, /\b120\b/],
  ['a list sentence', 'Targets are 17, 12 and 9 for Kwame, Ngozi and Bisi.', 17, /\b17\b/],
  /* 4. The number in words, and in other figures. */
  ['seventeen', 'Kwame is aiming for seventeen approved facilities.', 17, /seventeen/i],
  ['Seventeen, starting a sentence', 'Kwame is behind. Seventeen is his target.', 17, /seventeen/i],
  ['one hundred and twenty', 'Kwame is aiming for one hundred and twenty.', 120, /hundred/i],
  ['a hundred and twenty', 'Kwame is aiming for a hundred and twenty.', 120, /hundred/i],
  ['one hundred twenty', 'Kwame is aiming for one hundred twenty.', 120, /hundred/i],
  ['120 in figures', 'Kwame is aiming for 120.', 120, /\b120\b/],
  ['1,200 for 1200', 'Kwame is aiming for 1,200 sales.', 1200, /1,200/],
  ['1200 for 1200', 'Kwame is aiming for 1200 sales.', 1200, /1200/],
  ['twelve hundred for 1200', 'Kwame is aiming for twelve hundred sales.', 1200, /hundred/i],
  ['twenty-one', 'Kwame is aiming for twenty-one.', 21, /twenty/i],
  ['twenty one', 'Kwame is aiming for twenty one.', 21, /twenty/i],
  ['17k for 17000', 'Kwame is aiming for 17k.', 17000, /17k/i],
  ['17,000 for 17000', 'Kwame is aiming for 17,000.', 17000, /17,000/],
  ['17 thousand for 17000', 'Kwame is aiming for 17 thousand.', 17000, /thousand/i],
  ['seventeen thousand for 17000', 'Kwame is aiming for seventeen thousand.', 17000, /thousand/i],
  ['5.2 million for 5,200,000', 'Kwame is aiming for 5.2 million in approvals.', 5200000, /5\.2|million/i],
  ['5.2m for 5,200,000', 'Kwame is aiming for NGN 5.2m.', 5200000, /5\.2/],
  /* And the name spelt otherwise. */
  ['the possessive', "Kwame's target is 17.", 17, /\b17\b/],
  ['the possessive, curly', 'Kwame’s target is 17.', 17, /\b17\b/],
  ['the first name only, in capitals', 'KWAME is behind. His target is 17.', 17, /\b17\b/],
];

describe('a hidden target does not slip through, as served to a colleague', () => {
  it.each(CASES.map((c) => [c[0], c] as const))('%s', (_name, [, text, target, leak]) => {
    expect(served(text, kwame(target))).not.toMatch(leak);
  });

  it.each([
    ['Zoë', 'Zoë is behind. Her target is 17.', ['Zoë Okafor', 'Zoë']],
    ['Zoe, written without the accent', 'Zoe is behind. Her target is 17.', ['Zoë Okafor', 'Zoë']],
    ["N'Golo", "N'Golo is behind. His target is 17.", ["N'Golo Kanté", "N'Golo"]],
    ['N’Golo, with a curly apostrophe', 'N’Golo is behind. His target is 17.', ["N'Golo Kanté", "N'Golo"]],
  ])('a name with an accent or an apostrophe: %s', (_n, text, names) => {
    const out = withoutHiddenTargets(text, kwame(17, names));
    expect(out).not.toMatch(/\b17\b/);
    expect(out).toMatch(/is behind\./);
  });
});

describe('and it does not hide too much', () => {
  it('what the person did stays, only the sentence with the number goes', () => {
    expect(withoutHiddenTargets('Kwame Mensah met four customers. He is behind. His target is 17 approved facilities.', kwame(17)))
      .toBe('Kwame Mensah met four customers. He is behind.');
  });
  it('a date is not his target: "the 17th" stays', () => {
    expect(withoutHiddenTargets('Kwame met a buyer on the 17th.', kwame(17))).toBe('Kwame met a buyer on the 17th.');
    expect(withoutHiddenTargets('Kwame met a buyer on the seventeenth.', kwame(17))).toBe('Kwame met a buyer on the seventeenth.');
  });
  it('a text that never names him keeps its 17', () => {
    expect(withoutHiddenTargets('The team has 17 open applications.', kwame(17))).toBe('The team has 17 open applications.');
  });
  it('in a bulleted list, Ngozi keeps her own line', () => {
    expect(withoutHiddenTargets('- Kwame: 17\n- Ngozi: 12', kwame(17))).toBe('- Ngozi: 12');
  });
  it('a decimal is not split into two sentences: 1.7 million is not 7', () => {
    expect(withoutHiddenTargets('Kwame is aiming for 1.7 million.', kwame(7))).toBe('Kwame is aiming for 1.7 million.');
  });
  it('an id, a date or a link in a row about him is not a sentence: it goes out as it came', () => {
    const row = { participantId: 'p-kwame', id: 'cm17xq', checkInId: 'ab-17cd', at: '2026-09-17', ref: 'cm17xq', says: 'He met a buyer.' };
    expect(withoutHiddenTargetsIn(row, kwame(17))).toEqual(row);
  });
  it('a list of sentences loses the emptied line, it does not keep an empty one', () => {
    expect(withoutHiddenTargetsIn({ agreements: ['Kwame Mensah met four customers.', 'His target is 17.', 'Both want the bank to move.'] }, kwame(17)))
      .toEqual({ agreements: ['Kwame Mensah met four customers.', 'Both want the bank to move.'] });
    expect(withoutHiddenTargetsIn({ agreements: [{ text: 'Kwame Mensah is behind.' }, { text: 'Kwame needs 17.' }] }, kwame(17)))
      .toEqual({ agreements: [{ text: 'Kwame Mensah is behind.' }] });
    /* A line that was empty before stays: only what this read emptied goes. */
    expect(withoutHiddenTargetsIn({ lines: ['Kwame is behind.', ''] }, kwame(17))).toEqual({ lines: ['Kwame is behind.', ''] });
  });
  it('a table row keeps its shape', () => {
    expect(withoutHiddenTargetsIn({ cells: ['Kwame', '17'] }, kwame(17))).toEqual({ cells: ['Kwame', ''] });
  });
});

/* ------------------------------------------------------------------------------------------------
 * THROUGH THE REAL SERVED PATHS.
 * ---------------------------------------------------------------------------------------------- */

const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last },
});
const LEAD = person('p-lead', 'u-wairimu', 'Wairimu', 'Kamau', PartyType.INITIATOR);
const KWAME = person('p-kwame', 'u-kwame', 'Kwame', 'Mensah');
const NGOZI = person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze');

/* The words of each shape above, as the report would hold them after names are swapped in. */
function wordsFor(target: number, inWords: string) {
  return {
    opening: `Kwame Mensah met four customers. He is behind. His target is ${target} approved facilities.`,
    picture: `Kwame is waiting on legal. The paperwork went in on Monday. The bank is slow. He needs ${target} to hit the goal. Kwame’s aim is ${inWords} approved facilities.`,
    agreements: ['Kwame Mensah', `Target: ${target}`, 'Done: 9'],
    kwameFinding: `He is behind. His target is ${target}.`,
    ngoziFinding: 'Ngozi Eze visited three banks. She is aiming for 14 approved facilities.',
  };
}

function fixture(target: number, inWords: string) {
  const w = wordsFor(target, inWords);
  const checkIns = [
    { id: 'c1', participantId: 'p-kwame', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z'), createdAt: new Date('2026-09-22T09:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } },
    { id: 'c2', participantId: 'p-ngozi', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z'), createdAt: new Date('2026-09-23T09:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } },
  ];
  const ground: any = {
    id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, status: 'ACTIVE',
    initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY', restrictExternalVisibility: true,
    whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3', createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    brief: `The sales team this quarter. Kwame Mensah should reach ${inWords} approved facilities. Ngozi should reach 14.`,
    toldToParticipants: `This check-in follows the sales team this quarter. Kwame is aiming for ${inWords} approved facilities.`,
    participants: [LEAD, KWAME, NGOZI],
    checkIns,
    report: {
      id: 'r1', releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: w.opening, networkPicture: null,
      sharedPicture: w.picture, agreements: w.agreements, divergences: [], centralQuestion: null, engagement: {},
      findings: [
        { participantId: 'p-kwame', text: w.kwameFinding, hasGap: false },
        { participantId: 'p-ngozi', text: w.ngoziFinding, hasGap: false },
      ],
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
    reportRounds: [{ sessionNumber: 1, finding: w.opening, sharedPicture: w.picture }],
    objectives: [
      { id: 'o-kwame', name: 'Kwame’s approved facilities', target, count: 9, prevCount: 9, ownerParticipantId: 'p-kwame', sortOrder: 1, assumes: [],
        createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
      { id: 'o-ngozi', name: 'Ngozi’s approved facilities', target: 14, count: 11, prevCount: 11, ownerParticipantId: 'p-ngozi', sortOrder: 2, assumes: [],
        createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
    ],
    dependencies: [], reportActivations: [], poll: null, resolution: null, patternDetections: [],
  };
  return { ground, checkIns, w };
}

function prismaFor(viewerRole: string, ground: any, checkIns: any[]) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({ count: 0 })), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  const copy = () => JSON.parse(JSON.stringify(ground), (k, v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v) : v));
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => copy()), findFirst: jest.fn(async () => copy()), findMany: jest.fn(async () => [copy()]) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(checkIns))) }),
    organization: model({ findUnique: jest.fn(async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false })) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

/* The readers: the lead who set it, Kwame whose it is, Ngozi a colleague, and an admin who only reads. */
const READERS: [string, string, string, boolean][] = [
  ['the lead', 'u-wairimu', 'MEMBER', true],
  ['Kwame, whose target it is', 'u-kwame', 'MEMBER', true],
  ['Ngozi, a colleague', 'u-ngozi', 'MEMBER', false],
  ['an admin who only reads', 'u-grace', 'ADMIN', false],
];

for (const [target, inWords, leak] of [
  [17, 'seventeen', /His target is 17\b|needs 17\b|Target: 17\b|\bseventeen\b|"17"/i],
  [120, 'one hundred and twenty', /His target is 120\b|needs 120\b|Target: 120\b|hundred and twenty|"120"/i],
] as [number, string, RegExp][]) {
  describe(`through the served paths, Kwame's target ${target}`, () => {
    const { ground, checkIns } = fixture(target, inWords);

    const boardAs = (userId: string, role: string) => {
      const reports = Object.create(ReportsService.prototype) as ReportsService;
      const svc = new BoardService(prismaFor(role, ground, checkIns), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
      return svc.get('g-sales', userId) as Promise<any>;
    };
    const reportAs = (userId: string, role: string) => {
      const svc = Object.create(ReportsService.prototype) as any;
      svc.prisma = prismaFor(role, ground, checkIns);
      svc.isAnAdminOf = async () => role === 'ADMIN';
      const w = wordsFor(target, inWords);
      const built = { theOpening: w.opening, sharedPicture: w.picture, agreements: w.agreements, findings: ground.report.findings, updatedAt: new Date('2026-09-23T15:02:00Z') };
      return svc.whatTheLeadHasNotShared('g-sales', userId, 'org-1', built);
    };
    const groundsFor = (role: string) => {
      const prisma = prismaFor(role, ground, checkIns);
      const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
      return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, { get: () => reports } as any);
    };

    describe.each(READERS)('as %s', (_who, userId, role, mayRead) => {
      it('the report as served', async () => {
        const text = JSON.stringify(await reportAs(userId, role));
        if (mayRead) expect(text).toMatch(leak); else expect(text).not.toMatch(leak);
        /* What he did stays for everybody. */
        expect(text).toMatch(/Kwame Mensah met four customers/);
        expect(text).toMatch(/Ngozi Eze visited three banks/);
        /* Ngozi's own 14 stays for Ngozi, and for the lead. */
        if (userId === 'u-ngozi' || userId === 'u-wairimu') expect(text).toMatch(/aiming for 14 approved facilities/);
        else expect(text).not.toMatch(/aiming for 14 approved facilities/);
      });

      it('the board as served', async () => {
        const text = JSON.stringify(await boardAs(userId, role));
        /* Decision 86: on the board, an admin sees the figures, Kwame's included. The check-in's own page
           follows it too (below). A colleague still never does. */
        if (mayRead || role === 'ADMIN') expect(text).toMatch(leak); else expect(text).not.toMatch(leak);
        expect(text).toMatch(/He is behind|Kwame Mensah met four customers/);
      });

      it('the check-in\'s own page', async () => {
        const text = JSON.stringify(await groundsFor(role).get('g-sales', 'org-1', userId));
        const words = text.replace(/"objectives":\[[^\]]*\]/g, '');
        /* Decision 86 item 3, and 93: an admin with access reads the figures here too, as on the board. A colleague still never does. */
        if (mayRead || role === 'ADMIN') expect(words).toMatch(leak); else expect(words).not.toMatch(leak);
        expect(text).toMatch(/Kwame Mensah met four customers/);
      });

      it('the list of check-ins', async () => {
        const rows = (await groundsFor(role).list('org-1', userId, `${userId}@baridi.test`, role)) as any[];
        const text = JSON.stringify(rows);
        if (!mayRead && role !== 'ADMIN') expect(text).not.toMatch(leak);
        if (userId === 'u-wairimu') expect(text).toMatch(leak);
      });
    });
  });
}

/* ------------------------------------------------------------------------------------------------
 * THE MODEL SIDE: what a person's own check-in hands the model.
 * ---------------------------------------------------------------------------------------------- */

describe('a person\'s own check-in is not given a colleague\'s hidden target, in figures or in words', () => {
  const svc: any = Object.create(ConversationService.prototype);
  const { ground } = fixture(17, 'seventeen');
  const as = (participantId: string, partyType: string = PartyType.PARTICIPANT) => ({ participantId, participant: { partyType } });
  const promptFor = (checkIn: any) => buildIntakeBlock({
    scenario: ground.scenario, partyType: checkIn.participant.partyType, sessionNumber: 1,
    adminBrief: svc.theBriefThisPersonMayBeGiven(ground, checkIn),
    objectives: svc.theTargetsThisPersonMaySee(ground, checkIn),
  } as any);

  it('Ngozi: neither 17 nor seventeen, and her own 14 and the situation stay', () => {
    const prompt = promptFor(as('p-ngozi'));
    expect(prompt).not.toMatch(/\bseventeen\b|(?<![\d.,-])17(?![\d])/i);
    expect(prompt).toMatch(/\b14\b/);
    expect(prompt).toMatch(/The sales team this quarter/);
  });

  it('Kwame: his own seventeen is there; Ngozi\'s 14 is not', () => {
    const brief = svc.theBriefThisPersonMayBeGiven(ground, as('p-kwame'));
    expect(brief).toMatch(/seventeen/);
    expect(brief).not.toMatch(/\b14\b/);
  });

  it('the lead: the brief as written', () => {
    expect(svc.theBriefThisPersonMayBeGiven(ground, as('p-lead', PartyType.INITIATOR))).toBe(ground.brief);
  });

  it('where the lead shared targets with everybody: the brief as written', () => {
    expect(svc.theBriefThisPersonMayBeGiven({ ...ground, whoSeesTargets: 'EVERYBODY' }, as('p-ngozi'))).toBe(ground.brief);
  });

  it('the lead\'s note to everyone: Ngozi\'s prompt holds no 17 or seventeen from it, and keeps her own 14', () => {
    const withNote = { ...ground, leadContextNotes: [{ audience: 'EVERYONE', participantId: null, text: 'We are behind the bank. Kwame should land seventeen approved facilities, and 17 is the floor. Ngozi should land 14.' }] };
    const note = svc.theSharedNoteThisPersonMayBeGiven(withNote, as('p-ngozi'));
    const prompt = buildIntakeBlock({ scenario: ground.scenario, partyType: PartyType.PARTICIPANT, sessionNumber: 1, sharedNote: note, objectives: svc.theTargetsThisPersonMaySee(withNote, as('p-ngozi')) } as any);
    expect(prompt).toMatch(/SHARED_NOTE/);
    expect(prompt).not.toMatch(/\bseventeen\b|(?<![\d.,-])17(?![\d])/i);
    expect(prompt).toMatch(/Ngozi should land 14\./);
    expect(prompt).toMatch(/We are behind the bank\./);
    /* Kwame keeps his own, and not Ngozi's. */
    const his = svc.theSharedNoteThisPersonMayBeGiven(withNote, as('p-kwame'));
    expect(his).toMatch(/seventeen/);
    expect(his).not.toMatch(/\b14\b/);
    /* The lead's own prompt: the note as written. */
    const leads = svc.theSharedNoteThisPersonMayBeGiven(withNote, as('p-lead', PartyType.INITIATOR));
    expect(leads).toBe(withNote.leadContextNotes[0].text);
    expect(buildIntakeBlock({ scenario: ground.scenario, partyType: PartyType.INITIATOR, sessionNumber: 1, sharedNote: leads } as any)).toContain(withNote.leadContextNotes[0].text);
    /* And shared with everybody: as written. */
    expect(svc.theSharedNoteThisPersonMayBeGiven({ ...withNote, whoSeesTargets: 'EVERYBODY' }, as('p-ngozi'))).toBe(withNote.leadContextNotes[0].text);
  });

  it('the prompt is built from it', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toContain('adminBrief: this.theBriefThisPersonMayBeGiven(ground as any, checkIn as any),');
    expect(src).not.toContain('adminBrief: (ground as any).brief ?? null,');
    expect(src).toContain('sharedNote: this.theSharedNoteThisPersonMayBeGiven(ground as any, checkIn as any),');
    expect(src).toContain("...(ground.leadContextNotes ?? []).map((n) => this.theLeadsWordsThisPersonMayBeGiven(ground as any, checkIn as any, n.text) ?? ''),");
  });
});
