import { readFileSync, existsSync } from 'fs';
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
const run = existsSync(RUN) ? JSON.parse(readFileSync(RUN, 'utf8')) : null;
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
