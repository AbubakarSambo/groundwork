import { GroundScenario } from '@prisma/client';
import {
  boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, type Setup,
} from './the-switchboards-sections-harness';
import { THE_TEAM_PICTURE_IS_NOT_SHARED_YET, YOUR_OWN_REPORT_IS_READY, ONLY_YOURS } from './a-participants-board-is-their-own';

/**
 * REQUEST 105, PART 3: A PARTICIPANT'S BOARD IS THEIR OWN (the prototype's B5, board-as-participant.txt).
 *
 * "Your deals, day by day. Only yours.", "Your share. ... Only you and Wairimu see your share.", and
 * "Today's team picture isn't shared yet ... Your own report is ready now." Read on the sales run
 * (api/journey/all-24/re-f/sales.json: Bisi runs it; Femi, Ngozi and Kwame check in, in their own words),
 * as every reader: the lead, each person who checks in (with and without seeing each other), an admin who
 * only reads, the admin who set it up, and the person reviewed on an evaluation check-in.
 */
const item = (id: string, kind: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind, name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: 'u-bisi', createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const target = (id: string, name: string, n: number, count: number, owner: string | null) => ({
  id, groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: owner, setByParticipantId: 'p-bisi', sortOrder: owner ? 1 : 0, addedAtSession: null, assumes: [], direction: 'AIM',
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  items: [
    item('w-femi', 'deal', 'Mama Ngozi Kitchens', { stage: 'Quoted', ownerParticipantId: 'p-femi' }),
    item('w-kwame', 'deal', 'Jos Grain Traders', { stage: 'Won', ownerParticipantId: 'p-kwame' }),
    item('w-lead', 'deal', 'Plateau Foods', { stage: 'Contacted' }),
  ],
  objectives: [
    target('o-team', 'Approved facilities this quarter', 40, 11, null),
    target('o-femi', 'Approved facilities for Femi this quarter', 14, 3, 'p-femi'),
    target('o-kwame', 'Approved facilities for Kwame this quarter', 14, 6, 'p-kwame'),
  ],
};
const grid = (b: any) => ((b.workRecords ?? []) as any[]).find((s) => s.section === 'Deal grid');
const deals = (b: any) => (grid(b)?.rows ?? []).map((r: any) => r.name);
/** Everything a reader is served except the list of people, which names everybody on the check-in by design. */
const allButThePeople = (b: any) => JSON.stringify({ ...b, participants: undefined, whoIsAway: undefined, howItIsGoing: undefined });

/** What a person who checks in may be served at all. Anything else on their board is a field a lead gets. */
const A_PARTICIPANTS_FIELDS = new Set([
  'groundId', 'renders', 'mode', 'family', 'peopleWorkTogether', 'sections', 'title', 'scenario', 'kindOfWork', 'groundStatus',
  'endState', 'coverageVariant', 'startingState', 'myParticipantId', 'canEditFrame', 'readOnlyNote', 'lastChangedAt', 'participants',
  'aTeamReportComes', 'whoIsAway', 'waitingToBeLetIn', 'phaseSpine', 'whyYouOnlySeeYourself', 'poll', 'howItIsGoing', 'theJudgement', 'theTable', 'overTime',
  'risks', 'workPlan', 'timeline', 'personHistory', 'blockerCheck', 'evidenceIndex', 'obligations', 'whoWaitedOnWhom', 'contradictions',
  'whoOwnsWhat', 'contribution', 'patterns', 'workRecords', 'objectives', 'yourShare', 'blockers', 'dependencies', 'stillUnanswered',
  'coverage', 'teamPicture', 'byArea', 'reportedAgainstCriteria',
  /* Whether the organisation has Release 1's sales board on: an organisation's switch, about nobody (Hafsah's point 6, 17 October). */
  'releaseOneSalesBoard',
  /* Only once the team's picture is shared. */
  'divergence', 'whatTheAnswersSay', 'whatTheRoomIsAbout', 'whatTheRoomIsAboutNote', 'quickRead', 'forecast',
]);

describe('Femi, who checks in, where people see each other, before the team picture is shared', () => {
  it('is served only his own deal, under "Only yours."', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(deals(b)).toEqual(['Mama Ngozi Kitchens']);
    expect(grid(b).onlyYours).toBe(ONLY_YOURS);
  });

  it('reads his own share, and the team\'s aim, and never Kwame\'s number', async () => {
    const b = await boardAs(RUN, ...FEMI);
    /* Changed 4 November 2026 (release batch 1): no note about who else sees the share. */
    expect(b.yourShare.map((s: any) => s.whoSees)).toEqual([undefined]);
    expect(b.objectives.map((o: any) => o.id).sort()).toEqual(['o-femi', 'o-team']);
    expect(allButThePeople(b)).not.toMatch(/Jos Grain|Plateau Foods|o-kwame/);
  });

  it('is told the team picture is not shared yet, and that his own report is ready', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(b.teamPicture).toEqual({ shared: false, says: THE_TEAM_PICTURE_IS_NOT_SHARED_YET, yourOwnReport: YOUR_OWN_REPORT_IS_READY });
    expect(b.teamPicture.says).toBe("Today's team picture is not shared yet.");
    expect(b.teamPicture.yourOwnReport).toBe('Your own report is ready now.');
    for (const k of ['divergence', 'quickRead', 'forecast', 'whatTheRoomIsAbout']) expect(b[k]).toBeUndefined();
  });

  it('reads his own work in his own words, and nobody else\'s', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(b.workPlan.map((r: any) => r.says)).toEqual([
      'In session 2, you said, "I will visit a few of them again this week to see if I can collect the statements myself." Nobody has said yet whether it happened.',
    ]);
    expect(b.blockers.map((x: any) => x.says)).toEqual(['You are waiting for the bank statements.']);
    expect(b.whoOwnsWhat.map((r: any) => r.participantId)).toEqual(['p-femi']);
    expect(allButThePeople(b)).not.toMatch(/Mr\. Adebayo|committee members|five applications|missing documents/);
  });

  it('is served none of the fields only a lead gets', async () => {
    const b = await boardAs(RUN, ...FEMI);
    for (const k of Object.keys(b)) expect(A_PARTICIPANTS_FIELDS.has(k)).toBe(true);
    for (const k of ['decisions', 'eachPerson', 'eachPersonToday', 'leadActions', 'questionsForTheLead', 'checkInGrid', 'cascade', 'targetsNobodyOwns', 'toLookAt', 'busyOrMoving']) {
      expect(b[k]).toBeUndefined();
    }
    expect(b.theJudgement).toBeNull();
    expect(b.overTime).toBeNull();
  });
});

describe('once the team picture is shared', () => {
  it('Femi reads it too, and still only his own deal', async () => {
    const b = await boardAs({ ...RUN, report: { ...A_RELEASED_REPORT, theOpening: 'Everybody has checked in, and two people are waiting on something.' } }, ...FEMI);
    expect(b.teamPicture).toEqual({ shared: true });
    expect(b.howItIsGoing.latestSummary).toBe('Everybody has checked in, and two people are waiting on something.');
    expect(Array.isArray(b.quickRead)).toBe(true);
    expect(deals(b)).toEqual(['Mama Ngozi Kitchens']);
  });

  it('before it is shared, the opening is not in his header', async () => {
    const b = await boardAs({ ...RUN, report: { ...A_RELEASED_REPORT, releasedAt: null, theOpening: 'Everybody has checked in, and two people are waiting on something.' } }, ...FEMI);
    expect(b.howItIsGoing.latestSummary).toBeNull();
  });
});

describe('where people see only themselves', () => {
  it('Ngozi reads only her own wait, and nothing of Femi or Kwame', async () => {
    const b = await boardAs({ ...RUN, peersVisibleToEachOther: false }, ...NGOZI);
    expect(b.blockers.map((x: any) => x.says)).toEqual(['You are waiting on Mr. Adebayo for a date for the credit decision.']);
    expect(deals(b)).toEqual([]);
    expect(allButThePeople(b)).not.toMatch(/Femi|Kwame|bank statements|five applications/);
  });
});

describe('whoever runs it reads everything, as before', () => {
  it.each([['Bisi, who runs it', BISI, RUN], ['Juma, an admin who only reads', JUMA, RUN], ['the admin who set it up', SETUP_ADMIN, { ...RUN, createdByUserId: 'u-setup' }]] as const)('%s', async (_who, reader, setup) => {
    const b = await boardAs(setup as Setup, reader[0], reader[1]);
    expect(deals(b)).toEqual(['Mama Ngozi Kitchens', 'Jos Grain Traders', 'Plateau Foods']);
    expect(b.teamPicture).toBeUndefined();
    expect(b.decisions).toBeDefined();
    expect(b.blockers).toHaveLength(3);
  });
});

describe('on an evaluation check-in', () => {
  const PIP: Setup = { ...RUN, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
  it('the person reviewed keeps the board their own rules already narrowed, unchanged by this', async () => {
    const b = await boardAs(PIP, ...FEMI);
    expect(b.teamPicture).toBeUndefined();
    expect(b.theJudgement ?? null).toBeNull();
  });
  it('a colleague giving a view reads only their own', async () => {
    const b = await boardAs(PIP, ...KWAME);
    expect(b.teamPicture).toEqual(expect.objectContaining({ shared: false }));
    expect(deals(b)).toEqual(['Jos Grain Traders']);
    expect(allButThePeople(b)).not.toMatch(/Mama Ngozi|bank statements/);
  });
});
