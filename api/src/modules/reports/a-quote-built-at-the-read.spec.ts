import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';
import { quotesBuiltAtTheRead, theRecordAQuoteMayComeFrom } from './a-quote-built-at-the-read';
import { linesBuiltAtTheRead } from './a-line-built-at-the-read-is-read-too';
import { quotationsIn } from './a-quote-is-what-they-said';
import { whatToProbe } from './what-to-probe';

/**
 * A QUOTE IN A LINE BUILT AT THE READ IS THE RECORD'S WORDS TOO.
 *
 * The two cases from all-24, run 12, word for word, where a quote reached a person that nobody said
 * the way it was quoted. Both lines are built when the page is opened, so the quote pass that runs
 * before a report is stored never saw them. See a-quote-built-at-the-read.
 */

/* Every quote in a served value, and whether each is a passage of the record, character for character. */
const notInTheRecord = (served: unknown, record: string[]): string[] => {
  const out: string[] = [];
  const walk = (v: any) => {
    if (typeof v === 'string') {
      for (const q of quotationsIn(v)) if (!record.some((line) => line.includes(q.inner))) out.push(q.inner);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(served);
  return out;
};

describe('renewal: the lead reads "what to ask" Yemi, and the quote in it is the record\'s words', () => {
  /* Yemi typed "On track, for me, meant..." with no marks; the record reader wrote the line with 'On track'
     in single marks, so it is not stamped as his words. The probe list copies the whole line. */
  const TIDIED = "'On track', for me, meant that there weren't any major disruptions or escalations.";
  const YEMI_SAID = 'My role is really to oversee the relationship and make sure everything is running smoothly, you know, keeping things on track.';
  const built = whatToProbe({
    who: 'Yemi Ojo', participantId: 'p-yemi', role: null, answeredThisSession: true, patterns: [],
    waitingOn: [], holdingUp: [], concrete: [TIDIED], documentsAttached: 0,
    sessionNumber: 1, totalSessions: 6, scenario: 'CONTRACT_RENEWAL',
  });

  /*
   * REQUEST 111 (e), 2 October 2026: this line was served as "Worth getting on record, where anyone could
   * check it later: 'On track', for me, ...": two pieces joined with a colon, with the record's own tidied
   * line copied in after it. A line the record wrote in its own words is not quoted as the person's now;
   * it is counted. Only a line stamped as their own words is quoted, and the quote rule below still holds.
   */
  it('a line the record tidied is counted, not quoted, so nothing in it can be taken for his words', () => {
    expect(built.encourage).toEqual(['Yemi Ojo put one thing on record that anyone could check later, which is worth recognising.']);
    const served = linesBuiltAtTheRead(quotesBuiltAtTheRead(built, [YEMI_SAID]));
    expect(served.encourage).toEqual(built.encourage);
    expect(notInTheRecord(served, [YEMI_SAID])).toEqual([]);
  });

  const HIS_WORDS = 'On track, for me, meant that there were no major disruptions or escalations.';
  const quoted = whatToProbe({
    who: 'Yemi Ojo', participantId: 'p-yemi', role: null, answeredThisSession: true, patterns: [],
    waitingOn: [], holdingUp: [], concrete: [HIS_WORDS], concreteWordForWord: [HIS_WORDS], documentsAttached: 0,
    sessionNumber: 1, totalSessions: 6, scenario: 'CONTRACT_RENEWAL',
  });

  it('a line stamped as his own words is quoted as his, in a sentence of its own', () => {
    expect(quoted.encourage).toEqual(['Yemi Ojo said, "On track, for me, meant that there were no major disruptions or escalations." That is worth getting on record, so anyone can check it later.']);
    const served = linesBuiltAtTheRead(quotesBuiltAtTheRead(quoted, [HIS_WORDS]));
    expect(notInTheRecord(served, [HIS_WORDS])).toEqual([]);
  });

  it('and where nobody said the words, the quote is not shown as his', () => {
    const changed: string[] = [];
    const served = quotesBuiltAtTheRead(quoted, [], changed);
    expect(notInTheRecord(served, [])).toEqual([]);
    expect(served.triedToUnblock).toBe(quoted.triedToUnblock);
    expect(changed).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------------------------------------ */

const AMINA = {
  id: 'p-amina', userId: 'u-amina', partyType: PartyType.INITIATOR, email: 'ceo@seniorhire.test',
  roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Amina', lastName: 'Bello' },
};
const TOBI = {
  id: 'p-tobi', userId: 'u-tobi', partyType: PartyType.PARTICIPANT, email: 'director@seniorhire.test',
  roleAsDescribed: 'Engagement Director', remitAsGiven: 'Engagement Director', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Tobi', lastName: 'Adewale' },
};
const CHECK_INS = [
  { id: 'c-amina', participantId: 'p-amina', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-27T22:20:00Z') },
  { id: 'c-tobi', participantId: 'p-tobi', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-27T22:30:00Z') },
];
/* Amina typed: I haven't explicitly said "get me out of these meetings." I did say he would own the
   relationships in his interview. The record reader wrote it with single marks. */
const AMINAS_LINE_AS_THE_READER_WROTE_IT = "I haven't explicitly said 'get me out of these meetings.' I did say he would own the relationships in his interview.";
const WORRIES = [
  { checkInId: 'c-amina', participantId: 'p-amina', type: 'TENSION', text: AMINAS_LINE_AS_THE_READER_WROTE_IT, saidWordForWord: false },
  { checkInId: 'c-amina', participantId: 'p-amina', type: 'WORRY', text: "I'm just not sure the brief was clear enough on that one point. Or the onboarding.", saidWordForWord: true },
  { checkInId: 'c-amina', participantId: 'p-amina', type: 'WORRY', text: "I haven't decided yet. [INFERRED: on how to address the lack of clarity in the brief or onboarding]", saidWordForWord: true },
  { checkInId: 'c-tobi', participantId: 'p-tobi', type: 'WORRY', text: 'If client satisfaction declines, or if issues arise that I cannot resolve, that would indicate things are off track.', saidWordForWord: true },
];
const OTHER_LINES = [
  { checkInId: 'c-amina', participantId: 'p-amina', type: 'SUCCESS_DEFINITION', text: 'I need to be out of those top five client meetings.', saidWordForWord: true },
];
const RECORD = [...WORRIES, ...OTHER_LINES];
const GROUND: any = {
  id: 'g-seniorhire', scenario: GroundScenario.NEW_HIRE, mode: GroundMode.SHARED,
  initiatorId: 'u-amina', createdByUserId: 'u-amina', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'FORTNIGHTLY',
  label: 'The new Engagement Director',
  brief: 'We hired an Engagement Director to own the relationships with our five largest clients.',
  participants: [AMINA, TOBI], checkIns: CHECK_INS,
  report: {
    releasedAt: new Date('2026-09-27T22:40:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Both have checked in.', agreements: [], divergences: [], centralQuestion: null,
    engagement: { documentBackedPct: 0 }, findings: [],
    createdAt: new Date('2026-09-27T22:40:00Z'), updatedAt: new Date('2026-09-27T22:40:00Z'),
  },
  objectives: [], dependencies: [], poll: null, reportRounds: [],
};

function boardFor(requestingUserId: string) {
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    recordEntry: model({
      findMany: jest.fn(async (args: any) => {
        const types: string[] | undefined = args?.where?.type?.in;
        const rows = types ? RECORD.filter((r) => types.includes(r.type)) : RECORD;
        return JSON.parse(JSON.stringify(rows));
      }),
    }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return { board: svc.get('g-seniorhire', requestingUserId) as Promise<any>, prisma };
}

describe('seniorhire: the Blockers tile, as Amina and as Tobi read it', () => {
  const quotable = RECORD.filter((r) => r.saidWordForWord).map((r) => r.text).concat([GROUND.brief, TOBI.roleAsDescribed]);

  /* The worry is Amina's, said as hers: "You said, ..." to her (review of 1 October 2026). Changed with decision
     75, item 25: seniorhire is a new hire's first 90 days, an evaluation check-in now, so Tobi, the person it is
     about, reads no one else's exact words, and his tile quotes his own worry instead of Amina's. */
  const AMINAS = `You said, "I'm just not sure the brief was clear enough on that one point." There are 3 more worries on record, and nobody is waiting on anybody.`;
  const TOBIS = `You said, "If client satisfaction declines, or if issues arise that I cannot resolve, that would indicate things are off track." There are 3 more worries on record, and nobody is waiting on anybody.`;
  for (const [who, userId, expected] of [['Amina, who runs it', 'u-amina', AMINAS], ['Tobi', 'u-tobi', TOBIS]] as const) {
    it(`${who} reads no quote that is not the record's words, and the tile is still there`, async () => {
      const b = await boardFor(userId).board;
      const tile = (b.quickRead ?? []).find((t: any) => t.label === 'Blockers');
      expect(tile).toBeDefined();
      expect(tile.value).toBe('4 worries');
      /* Amina's first worry quotes words she typed in other marks, so the tile passes over it for the
         next one, which stands whole, and says the count as a sentence of its own. See
         what-this-session-holds (a tile shows a whole sentence, or none). */
      expect(tile.sub).toBe(expected);
      expect(tile.sub).not.toContain('get me out of these meetings');
      expect(notInTheRecord(b.quickRead, quotable)).toEqual([]);
    });
  }

  it('reads the record from the same lines the stored pass quotes from, and no wider', async () => {
    const { prisma } = boardFor('u-amina');
    const lines = await theRecordAQuoteMayComeFrom(prisma, 'g-seniorhire');
    expect(lines).not.toContain(AMINAS_LINE_AS_THE_READER_WROTE_IT);
    expect(lines).toContain("I haven't decided yet.");
    expect(lines).toContain("I'm just not sure the brief was clear enough on that one point. Or the onboarding.");
    expect(lines).toContain(GROUND.brief);
    const asked = (prisma.recordEntry.findMany as jest.Mock).mock.calls.map((c: any[]) => c[0]).filter((a: any) => a?.select?.saidWordForWord);
    expect(asked).toContainEqual({ where: { participant: { groundId: 'g-seniorhire' } }, select: { text: true, saidWordForWord: true } });
  });

  it('a quote the record holds keeps its marks, in the record\'s own capitals', () => {
    expect(quotesBuiltAtTheRead('Amina said "i need to be out of those top five client meetings."', quotable))
      .toBe('Amina said "I need to be out of those top five client meetings."');
  });

  it('never puts a name into a quote at the read: a label or a "you" is not found as somebody\'s name', () => {
    const record = ['Amina set up those meetings.'];
    /* Tobi, reading with "you" for himself or a label for Amina, is never handed her name in a quote. */
    expect(quotesBuiltAtTheRead('He said "the initiator set up those meetings" last week.', record))
      .toBe('He said the initiator set up those meetings last week.');
  });
});

/* ------------------------------------------------------------------------------------------------ */

describe('every part built at the read goes through the quote rule, by the code that serves it', () => {
  /* Comments out before matching, so a note that names the rule cannot satisfy this. */
  const code = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const reports = code('reports.service.ts');
  const board = code('../board/board.service.ts');

  it('the report: the probe list, the coaching note, the guide, what they could try, their soft spots', () => {
    expect(reports).toMatch(/probes: this\.readAsItWillBeRead\(probes, groundId, '[^']+', quotable\)/);
    expect(reports).toMatch(/coaching: this\.readAsItWillBeRead\(coaching, groundId, '[^']+', quotable\)/);
    expect(reports).toMatch(/postReportGuide: quotesChecked\(postReportGuide,/);
    /* Four: the forming, released and withheld reads, and the read of a session not shared yet (decision 76, item 4). */
    expect(reports.match(/couldTry: quotesChecked\(await this\.whatTheyCouldTryNext\(/g) ?? []).toHaveLength(4);
    expect(reports.match(/couldTry: await this\.whatTheyCouldTryNext\(/g) ?? []).toHaveLength(0);
    expect(reports).toMatch(/quotesChecked\(await this\.myOwnSoftSpots\(/);
    expect(reports).toMatch(/const quotable = await theRecordAQuoteMayComeFrom\(this\.prisma as any, groundId\)/);
  });

  it('the session report: its tiles and its worded lines', () => {
    expect(reports).toMatch(/atAGlance: shape\.atAGlance\.map\(\(t, i\) => \(\{ \.\.\.t, sub: q\(subOf\(i, t\)\) \}\)\)/);
  });

  it('the board: the tiles, and every section it builds on open', () => {
    expect(board).toMatch(/out\.quickRead = \(out\.quickRead as any\[\]\)\.map\(\(t\) => \(\{ \.\.\.t, sub: q\(t\?\.sub\) \}\)\)/);
    for (const k of ['howItIsGoing', 'divergence', 'eachPerson', 'contribution', 'coverage', 'hiddenContributors', 'decisions', 'managerAlignment']) {
      expect(board).toContain(`'${k}'`);
    }
    /* Request 107 (a): stillUnanswered now holds only the question Groundwork asked, in quotation
       marks, and a name, never anybody's own words, so it is left out of the quote rule on purpose
       (the rule would strip the marks from Groundwork's own question). */
    expect(board).not.toMatch(/for \(const k of \[[^\]]*'stillUnanswered'/);
    expect(board).toMatch(/const quotable = await theRecordAQuoteMayComeFrom\(this\.prisma as any, groundId\)/);
  });
});
