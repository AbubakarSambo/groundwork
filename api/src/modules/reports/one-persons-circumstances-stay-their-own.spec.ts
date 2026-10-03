import { existsSync } from 'fs';
import { join } from 'path';
import { PartyType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { ConversationService } from '../conversation/conversation.service';
import { onlyCountsAndPatternsAboutTheOthers, withoutSentencesAboutOneOfThem } from './one-persons-circumstances-stay-their-own';

/**
 * DECISION 75, ITEM 14: IN A CHECK-IN WHERE PEOPLE DO NOT SEE EACH OTHER, ONE PERSON'S CIRCUMSTANCES NEVER REACH
 * ANOTHER.
 *
 * The loans run (run-23): eight borrowers in a cohort, nobody named to anybody. Sunday Eze, a borrower, was served
 * "A sixth colleague received a tricycle for a business. The tricycle was stolen, so the sixth colleague has no
 * income from it." The lead, Amaka Nwachukwu, was right to read it about Yakubu Sani. Read here for each reader,
 * through the door every report and board read takes, and in a turn of Sunday's own check-in.
 */
const RUN = join(__dirname, '../../../journey/all-24/run-23/loans.json');
/* A run's saved data, not source code, so it is loaded as data (request 113 a). */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const run = existsSync(RUN) ? require(RUN) : null;
const session = run?.sessions?.[0];

const NAMES = ['Amaka Nwachukwu', 'Sunday Eze', 'Hauwa Ibrahim', 'Chinedu Obi', 'Blessing Ade', 'Musa Danjuma', 'Grace Oyelaran', 'Yakubu Sani', 'Esther Udo'];
const participants = NAMES.map((n, i) => ({
  id: i === 0 ? 'p-amaka' : `p-${n.split(' ')[0].toLowerCase()}`,
  userId: i === 0 ? 'u-amaka' : `u-${n.split(' ')[0].toLowerCase()}`,
  partyType: i === 0 ? PartyType.INITIATOR : PartyType.PARTICIPANT,
  createdAt: new Date(2026, 8, i + 1), email: `${i}@x.test`, managingOnly: false, roleAsDescribed: null, nameGiven: null,
  user: { firstName: n.split(' ')[0], lastName: n.split(' ')[1] },
}));

/* What the report holds, as the engine wrote it: the loans run's own sentences, with each person's name. */
const STORED_PICTURE = [
  'All nine people have answered. People disagree on one thing: Amaka Nwachukwu sees a uniform problem of low revenue across the cohort, but the participants describe a wide range of individual circumstances from success to complete business failure.',
  'Sunday Eze\'s goal was to start a grinding business for a steady income.',
  'Chinedu Obi is running a transport business with a tricycle.',
  'Yakubu Sani received a tricycle for a business. The tricycle was stolen, so Yakubu Sani has no income from it.',
  'A common experience was a delay between receiving the asset and generating income, which for some resulted in missed payments during the first one to three months.',
].join('\n\n');
const NETWORK = {
  thePicture: 'Several participants report missing the first one to three months of payments because the asset took time to earn.',
  whatWentWrong: [
    { whatHappened: 'Yakubu Sani\'s tricycle was stolen in the fourth month of operation.', said: { who: ['Yakubu Sani'], howMany: 1 } },
    { whatHappened: 'Repayments started before most of the assets were earning.', said: { who: [], howMany: 5 } },
  ],
};
const ground = (over: any = {}) => ({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, initiatorId: 'u-amaka', participants, report: { sharedPicture: STORED_PICTURE, networkPicture: NETWORK, agreements: ['The loan was for a specific business asset, such as a grinding machine, freezer, tricycle, or borehole pump.'] }, ...over });
const door = () => Object.create(ReportsService.prototype) as any;
const STOLEN = /tricycle was stolen|Yakubu|sixth colleague|Chinedu/i;

describe('the shared picture, as each reader reads it, where people do not see each other', () => {
  it('Sunday, a borrower, reads the counts, the pattern and his own goal, and nobody else\'s circumstances', () => {
    const r = door().theReportAsItWasShared(ground(), 'p-sunday', false);
    expect(r.sharedPicture).toContain('All nine people have answered.');
    expect(r.sharedPicture).toContain('A common experience was a delay between receiving the asset and generating income');
    expect(r.sharedPicture).toMatch(/Your goal was to start a grinding business/);
    expect(JSON.stringify(r)).not.toMatch(STOLEN);
    expect(r.networkPicture.whatWentWrong.map((w: any) => w.whatHappened)).toEqual(['Repayments started before most of the assets were earning.']);
    expect(r.agreements).toHaveLength(1);
  });

  it('Yakubu reads his own circumstance, as his, and nobody else\'s', () => {
    const r = door().theReportAsItWasShared(ground(), 'p-yakubu', false);
    expect(r.sharedPicture).toMatch(/The tricycle was stolen, so you have no income from it\./);
    expect(r.sharedPicture).not.toMatch(/Chinedu|grinding business|Sunday/);
  });

  it('Amaka, who runs it, and an admin, read it whole', () => {
    const r = door().theReportAsItWasShared(ground(), 'p-amaka', true);
    expect(r.sharedPicture).toContain('Yakubu Sani received a tricycle for a business.');
    expect(JSON.stringify(r.networkPicture)).toContain('stolen');
  });

  it('where the lead lets people see each other, a participant reads it as before', () => {
    const r = door().theReportAsItWasShared(ground({ peersVisibleToEachOther: true }), 'p-sunday', false);
    expect(r.sharedPicture).toContain('Yakubu Sani received a tricycle for a business.');
  });
});

(session ? describe : describe.skip)('the loans run as it was served to Sunday (run-23)', () => {
  it('his report and his board, through the wall, keep the counts and the patterns and lose every colleague\'s story', () => {
    const before = JSON.stringify({ r: session.participantReport, b: session.participantBoard });
    expect(before).toMatch(/A sixth colleague received a tricycle/);
    const after = onlyCountsAndPatternsAboutTheOthers({ r: session.participantReport, b: session.participantBoard }, { names: NAMES.slice(1) });
    const said = JSON.stringify(after);
    expect(said).not.toMatch(/sixth colleague|tricycle was stolen|colleague's tricycle/i);
    expect(after.r.sharedPicture).toContain('All nine people have answered.');
    expect(after.r.sharedPicture).toContain('A common experience was a delay between receiving the asset and generating income');
    expect(after.r.sharedPicture).toContain('Your goal was to start a grinding business for a steady income.');
  });
});

describe('a turn in Sunday\'s own check-in', () => {
  it('a sentence naming somebody else in the cohort is cut, and the question stays', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ brief: null, scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, initiatorId: 'u-amaka', initiator: { firstName: 'Amaka' }, participants })) },
      conversationTurn: { findMany: jest.fn(async () => []) },
      groundObjective: { findMany: jest.fn(async () => []) },
    };
    const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
    jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
    const saved: string = await s.theTurnAsItIsSaved(
      { id: 'ci-sunday', groundId: 'g1', participantId: 'p-sunday', participant: { partyType: PartyType.PARTICIPANT } },
      'Yakubu had his tricycle stolen, so you are not the only one. What has the grinding machine earned this week?',
    );
    expect(saved).toBe('What has the grinding machine earned this week?');
  });

  it('a name the person said themselves stays', () => {
    expect(withoutSentencesAboutOneOfThem('You said Chinedu helped you. How?', { names: [] }, { namesOnly: true })).toBe('You said Chinedu helped you. How?');
  });
});

/**
 * RUN-25, LOANS: ONE OF THEM WITHOUT A NAME. The wall above caught "a sixth colleague" and a name. Run-25 served
 * Sunday the same circumstances in other words: "One participant's tricycle was stolen in the fourth month, halting
 * that business." in his shared picture and its lines, "for another person, the problem was not just a delay in
 * income but that the business asset itself was never delivered" in his own guide, and, on his board under what
 * the borrowers already have, "A tricycle business that has generated enough revenue to make all repayments on
 * time." and "A borehole pump business that earns roughly N25,000 a week ...", each said by one other borrower.
 */
const RUN25 = join(__dirname, '../../../journey/all-24/run-25/loans.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const run25 = existsSync(RUN25) ? require(RUN25) : null;
const session25 = run25?.sessions?.[0];

const PICTURE_25 = [
  'All nine people have answered.',
  'You expected the grinding machine to help you start a business and now make about N45,000 every week.',
  'For most participants, the asset-based business is operating and generating revenue, though for many there was a delay of several weeks or months before income started. Several are now making payments but are behind on repayments from the initial period. One participant\'s tricycle was stolen in the fourth month, halting that business. Another participant never received the grinding machine they were promised and has no business to operate.',
].join('\n\n');
const LINES_25 = [
  'All nine people have answered.',
  'Several are now making payments but are behind on repayments from the initial period.',
  'One participant\'s tricycle was stolen in the fourth month, halting that business.',
  'Another participant never received the grinding machine they were promised and has no business to operate.',
].map((text) => ({ text, mark: 'said' }));
const HAVE_25 = {
  thePicture: 'Five of the eight businesses are operating, but they started in debt because repayments began before the asset could generate income.',
  whatMatters: [
    { said: { who: ['Sunday Eze'], howMany: 2 }, thing: 'Grinding machine' },
    { said: { who: [], howMany: 2 }, thing: 'Tricycle' },
    { said: { who: [], howMany: 1 }, thing: 'Freezer' },
  ],
  whatTheyAlreadyHave: [
    { said: { who: ['Sunday Eze'], howMany: 1 }, what: 'A grinding business that earns approximately N45,000 weekly from around 40 customers.' },
    { said: { who: ['Chinedu Obi'], howMany: 1 }, what: 'A tricycle business that has generated enough revenue to make all repayments on time.' },
    { said: { who: [], howMany: 1 }, what: 'A borehole pump business that earns roughly N25,000 a week selling water to households and small businesses.' },
    { said: { who: ['Amaka Nwachukwu'], howMany: 1 }, what: 'A team of field officers and a system for collecting repayment data.' },
  ],
  whatWentWrong: [{ said: { who: ['Sunday Eze'], howMany: 5 }, whatHappened: 'Repayments for the loan started before the asset could generate any income.' }],
};
const GUIDE_25 = {
  openingLine: 'My business is profitable now, but I had to miss my first payments because it took time to find customers.',
  toAcknowledge: 'I need to take seriously that for another person, the problem was not just a delay in income but that the business asset itself was never delivered.',
  questionToCarry: 'What is the most direct way for us to report when the loan terms are not working at the start of a new business?',
};
const ground25 = (over: any = {}) => ground({ report: { sharedPicture: PICTURE_25, sharedPictureLines: LINES_25, networkPicture: HAVE_25, postReportGuide: GUIDE_25 }, ...over });
const ONE_OF_THEM_25 = /One participant's tricycle|Another participant never received|for another person|A tricycle business|borehole pump business|N25,000|Freezer/;

describe('run-25: one of them without a name, as each reader reads it', () => {
  it('Sunday reads the counts and patterns, his own row and goal, the lead\'s row, and no one borrower\'s circumstance', () => {
    const r = door().theReportAsItWasShared(ground25(), 'p-sunday', false);
    const said = JSON.stringify(r);
    expect(said).not.toMatch(ONE_OF_THEM_25);
    expect(r.sharedPicture).toContain('All nine people have answered.');
    expect(r.sharedPicture).toContain('For most participants, the asset-based business is operating and generating revenue');
    expect(r.sharedPicture).toContain('Several are now making payments but are behind on repayments from the initial period.');
    expect(r.sharedPictureLines.map((l: any) => l.text)).toEqual(['All nine people have answered.', 'Several are now making payments but are behind on repayments from the initial period.']);
    expect(r.networkPicture.whatTheyAlreadyHave.map((w: any) => w.what)).toEqual([
      'A grinding business that earns approximately N45,000 weekly from around 40 customers.',
      'A team of field officers and a system for collecting repayment data.',
    ]);
    expect(r.networkPicture.whatMatters.map((w: any) => w.thing)).toEqual(['Grinding machine', 'Tricycle']);
    expect(r.networkPicture.whatWentWrong).toHaveLength(1);
    expect(r.postReportGuide.openingLine).toBe(GUIDE_25.openingLine);
    expect(r.postReportGuide.questionToCarry).toBe(GUIDE_25.questionToCarry);
  });

  it('Amaka, who runs it, and an admin, who reads with her eyes, read every borrower\'s row', () => {
    const r = door().theReportAsItWasShared(ground25(), 'p-amaka', true);
    expect(r.sharedPicture).toContain('One participant\'s tricycle was stolen in the fourth month, halting that business.');
    expect(r.networkPicture.whatTheyAlreadyHave).toHaveLength(4);
    const admin = door().theReportAsItWasShared(ground25(), null, true);
    expect(JSON.stringify(admin)).toMatch(/A tricycle business that has generated enough revenue/);
  });

  it('where people see each other, Sunday reads it as before', () => {
    const r = door().theReportAsItWasShared(ground25({ peersVisibleToEachOther: true }), 'p-sunday', false);
    expect(r.sharedPicture).toContain('One participant\'s tricycle was stolen');
    expect(r.networkPicture.whatTheyAlreadyHave).toHaveLength(4);
  });

  it('the product\'s own sentences with "another person" or "one person" in them stay', () => {
    const keep = 'All 2 of the things described here line up with something other than what the person said. Each one is backed by what another person said, a document, or a record. If this holds, the work could come to depend on one person.';
    expect(withoutSentencesAboutOneOfThem(keep, { names: [] })).toBe(keep);
  });
});

(session25 ? describe : describe.skip)('the loans run as it was served to Sunday (run-25)', () => {
  it('through the wall, his report and his board lose every one-borrower sentence and row, and keep the patterns', () => {
    const before = JSON.stringify({ r: session25.participantReport, b: session25.participantBoard });
    expect(before).toMatch(ONE_OF_THEM_25);
    const after: any = onlyCountsAndPatternsAboutTheOthers({ r: session25.participantReport, b: session25.participantBoard }, { names: NAMES.slice(1) });
    expect(JSON.stringify(after)).not.toMatch(ONE_OF_THEM_25);
    expect(after.r.sharedPicture).toContain('For most participants, the asset-based business is operating and generating revenue');
    expect(after.b.whatTheAnswersSay.whatTheyAlreadyHave.map((w: any) => w.what)).toEqual([
      'A grinding business that earns approximately N45,000 weekly from around 40 customers.',
      'A team of field officers and a system for collecting repayment data.',
    ]);
    expect(after.b.whatTheAnswersSay.thePicture).toMatch(/^Five of the eight businesses are operating/);
  });
});

/**
 * RUN-26, LOANS: THE WALL HELD BY WHAT IT CAUGHT, AND DID NOT HOLD. Sunday still read bare sentences with no name and
 * no "one participant" in them, each one a single borrower's story: "The pump was installed in the second month after
 * a delay ...", "The supplier never delivered the machine.", "The tricycle was stolen in the fourth month." So the
 * shared picture now keeps only what is about the reader, what is clearly about several people, and the lead's own
 * aim or the shared purpose.
 */
const RUN26 = join(__dirname, '../../../journey/all-24/run-26/loans.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const run26 = existsSync(RUN26) ? require(RUN26) : null;
const session26 = run26?.sessions?.[0];
const ONE_OF_THEM_26 = /The pump was installed in the second month|The supplier never delivered the machine|The tricycle was stolen in the fourth month/;

describe('run-26: bare sentences about one borrower, as each reader reads them', () => {
  const PICTURE_26 = [
    'All nine people have answered.',
    'You expected the grinding machine to help you start a business.',
    'Blessing Ade received a borehole pump. The pump was installed in the second month after a delay, and the business has been operating since the third month.',
    'Musa Danjuma was promised a grinding machine. The supplier never delivered the machine.',
    'Yakubu Sani received a tricycle. The tricycle was stolen in the fourth month.',
    'Most borrowers started repaying before their asset was earning.',
  ].join('\n\n');
  const g26 = (over: any = {}) => ground({ report: { sharedPicture: PICTURE_26, sharedPictureLines: PICTURE_26.split(/\n\n|(?<=\.) /).map((text) => ({ text, mark: 'said' })) }, ...over });

  it('Sunday keeps what is about him and what is about several people, and loses the bare sentences', () => {
    const r = door().theReportAsItWasShared(g26(), 'p-sunday', false);
    expect(r.sharedPicture).not.toMatch(ONE_OF_THEM_26);
    expect(JSON.stringify(r.sharedPictureLines)).not.toMatch(ONE_OF_THEM_26);
    expect(r.sharedPicture).toContain('All nine people have answered.');
    expect(r.sharedPicture).toContain('You expected the grinding machine');
    expect(r.sharedPicture).toContain('Most borrowers started repaying before their asset was earning.');
  });

  it('Amaka and an admin read every one of them', () => {
    expect(door().theReportAsItWasShared(g26(), 'p-amaka', true).sharedPicture).toMatch(ONE_OF_THEM_26);
    expect(door().theReportAsItWasShared(g26(), null, true).sharedPicture).toMatch(ONE_OF_THEM_26);
  });

  it('where people see each other, nothing changes', () => {
    expect(door().theReportAsItWasShared(g26({ peersVisibleToEachOther: true }), 'p-sunday', false).sharedPicture).toMatch(ONE_OF_THEM_26);
  });

  (session26 ? it : it.skip)('the run as it was served to Sunday, through the wall', () => {
    const served = { r: session26.participantReport, b: session26.participantBoard };
    expect(JSON.stringify(served)).toMatch(ONE_OF_THEM_26);
    const after = onlyCountsAndPatternsAboutTheOthers(served, { names: NAMES.slice(1) });
    expect(JSON.stringify(after)).not.toMatch(ONE_OF_THEM_26);
  });
});

/**
 * RUN-26 REVIEW: THE LEAD'S DOUBT REACHED A BORROWER ON THE CHECK-IN PAGE. `GET /grounds/:id` and the list asked the report's
 * door with only the shared picture, so the wall did not know who the lead was and guessed from the way a sentence began:
 * two capitalised words were read as the lead's. Read here through the grounds service's own call, as Sunday and as Amaka.
 */
describe('run-26 review: the check-in page asks the door with the people and the lead\'s names', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GroundsService } = require('../grounds/grounds.service');
  const PAGE = [
    'All nine people have answered.',
    'You expected the grinding machine to help you start a business.',
    'Amaka wants to understand if there is an issue with the selection process for loan qualification.',
    'Amaka wants every borrower to be earning by the fourth month.',
    'Mr Danjuma\'s machine never arrived.',
    'Kaduna Grinding Works never delivered the machine.',
    'Emeka Okafor logged eleven calls about the machine.',
    'Emeka Okafor placed eleven calls to Musa about the machine.',
    'Most borrowers started repaying before their asset was earning.',
  ].join('\n\n');
  const asServedBy = (viewer: string | null, runsIt: boolean, over: any = {}) => {
    const service = Object.create(GroundsService.prototype) as any;
    service.logger = { warn: () => undefined };
    service.moduleRef = { get: () => door() };
    const g = ground(over);
    return service.reportTextAsItWasShared({ scenario: g.scenario, peersVisibleToEachOther: g.peersVisibleToEachOther, initiatorId: 'u-amaka', participants }, { sharedPicture: PAGE, theOpening: PAGE }, null, viewer, runsIt);
  };

  it('Sunday does not read the lead\'s doubt, a stranger\'s name, a company\'s name or a field officer\'s calls, and keeps the lead\'s aim', () => {
    const r = asServedBy('p-sunday', false);
    for (const text of [r.sharedPicture, r.theOpening]) {
      expect(text).not.toMatch(/selection process|Danjuma|Kaduna|Emeka|eleven calls/);
      expect(text).toContain('Amaka wants every borrower to be earning by the fourth month.');
      expect(text).toContain('All nine people have answered.');
      expect(text).toContain('You expected the grinding machine');
      expect(text).toContain('Most borrowers started repaying before their asset was earning.');
    }
  });

  it('Amaka reads all of it, and where people see each other Sunday does too', () => {
    expect(asServedBy('p-amaka', true).sharedPicture).toMatch(/selection process[\s\S]*Danjuma[\s\S]*Kaduna[\s\S]*Emeka/);
    expect(asServedBy('p-sunday', false, { peersVisibleToEachOther: true }).sharedPicture).toMatch(/selection process[\s\S]*Kaduna/);
  });

  it('the wall alone, given the lead\'s names and no guess, drops the sentences that merely begin with two capital letters', () => {
    const served = { sharedPicture: PAGE, theLeadsNames: ['Amaka Nwachukwu', 'Amaka'] };
    const after: any = onlyCountsAndPatternsAboutTheOthers(served, { names: NAMES.slice(1) });
    expect(after.sharedPicture).not.toMatch(/Danjuma|Kaduna|Emeka|selection process/);
    expect(after.theLeadsNames).toBeUndefined();
  });
});

(session26 ? describe : describe.skip)('run-26 review: the saved run\'s own picture, asked for by the check-in page', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GroundsService } = require('../grounds/grounds.service');
  it('Sunday no longer reads "Amaka wants to understand if there is an issue with the selection process"', () => {
    const picture: string = session26.participantReport.sharedPicture;
    expect(picture).toMatch(/Amaka wants to understand if there is an issue with the selection process/);
    const service = Object.create(GroundsService.prototype) as any;
    service.logger = { warn: () => undefined };
    service.moduleRef = { get: () => door() };
    const r = service.reportTextAsItWasShared({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, initiatorId: 'u-amaka', participants }, { sharedPicture: picture }, null, 'p-sunday', false);
    expect(r.sharedPicture).not.toMatch(/selection process/);
  });
});
