import { GroundsService } from './grounds.service';
import { readPeopleAndSetup, howThisCheckInRuns, theRhythmInWords } from './people-and-setup';

/**
 * PEOPLE AND SETUP, AS EACH READER IS SERVED IT (Release 1B, pull request 1 of 3). Proved at the server, for each reader, on
 * the sales check-in of the B8 pictures: Grace Achieng runs "Sales team, Q4" at Drop Access; Kevin, Mercy, Joseph and Peter
 * check in. Peter's invitation bounced, Mercy has no WhatsApp number and nobody has described Joseph's role.
 *
 *  - the lead reads the whole page, with the fixes only she may use;
 *  - an admin who does not run it reads the whole page with no ending, and never the lead's words about a person;
 *  - a team member is served only the short page: those keys and no others, with nobody else's details in them;
 *  - with the switch off, nothing new is served at all, and nothing is ever written.
 */
const NOW = new Date('2026-10-19T09:00:00Z');
const LEAD_NOTE_ABOUT_KEVIN = 'Rep, Nairobi hardware shops, needs pushing on follow-ups';

function theSalesCheckIn(over: { switchOn?: boolean; overWhatsApp?: boolean | null; scenario?: string } = {}) {
  const person = (id: string, userId: string | null, first: string, last: string, extra: any = {}) => ({
    id, userId, email: `${first.toLowerCase()}@dropaccess.test`, nameGiven: null, partyType: id === 'p-grace' ? 'INITIATOR' : 'PARTICIPANT',
    managingOnly: false, roleAsDescribed: null, inviteDeliveryStatus: 'DELIVERED', awaitingSeat: false, cameThroughTheLink: false, createdAt: new Date('2026-10-12'),
    user: userId ? { firstName: first, lastName: last, jobTitle: null, awaitingOrgApproval: false, phoneNumber: null } : null,
    ...extra,
  });
  const participants = [
    person('p-grace', 'u-grace', 'Grace', 'Achieng', { roleAsDescribed: 'Sales lead', user: { firstName: 'Grace', lastName: 'Achieng', jobTitle: 'Sales lead', awaitingOrgApproval: false, phoneNumber: '+254700000112' } }),
    person('p-kevin', 'u-kevin', 'Kevin', 'Otieno', { roleAsDescribed: LEAD_NOTE_ABOUT_KEVIN, cameThroughTheLink: true, user: { firstName: 'Kevin', lastName: 'Otieno', jobTitle: null, awaitingOrgApproval: false, phoneNumber: '+254700000410' } }),
    person('p-mercy', 'u-mercy', 'Mercy', 'Wanjiru', { roleAsDescribed: 'Rep, Kiambu and schools', user: { firstName: 'Mercy', lastName: 'Wanjiru', jobTitle: 'Rep, Kiambu and schools', awaitingOrgApproval: false, phoneNumber: null } }),
    person('p-joseph', 'u-joseph', 'Joseph', 'Mutua', { user: { firstName: 'Joseph', lastName: 'Mutua', jobTitle: null, awaitingOrgApproval: false, phoneNumber: '+254700000093' } }),
    { ...person('p-peter', null, 'Peter', 'Ouma'), nameGiven: 'Peter Ouma', roleAsDescribed: 'Agent, Thika', inviteDeliveryStatus: 'BOUNCED' },
  ];
  const ground = {
    id: 'g-sales', organizationId: 'org-drop', initiatorId: 'u-grace', createdByUserId: 'u-grace', scenario: over.scenario ?? 'OKR_ALIGNMENT', status: 'AWAITING_PARTIES', approvedById: null,
    cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], cadenceAnchorDay: null, timelineDays: 18, runsUntilEnded: false, startsAt: new Date('2026-10-12T05:00:00Z'), endsAt: new Date('2026-10-30T12:00:00Z'),
    createdAt: new Date('2026-10-10T08:00:00Z'), overWhatsApp: over.overWhatsApp ?? null, kindOfWork: 'sales team', peersVisibleToEachOther: true, restrictExternalVisibility: true,
    initiator: { firstName: 'Grace', lastName: 'Achieng' },
    organization: { name: 'Drop Access', timeZone: 'Africa/Nairobi', whatsappConnection: { enabled: true } },
    participants,
    checkIns: [
      { participantId: 'p-mercy', status: 'COMPLETED', isSetup: false, sessionNumber: 1, closedReason: null },
      { participantId: 'p-mercy', status: 'COMPLETED', isSetup: false, sessionNumber: 2, closedReason: null },
      { participantId: 'p-mercy', status: 'COMPLETED', isSetup: false, sessionNumber: 3, closedReason: 'auto_closed' },
      { participantId: 'p-kevin', status: 'COMPLETED', isSetup: false, sessionNumber: 1, closedReason: null },
    ],
    roundCompletions: [1, 2, 3, 4, 5].map((n) => ({ sessionNumber: n })),
  };
  const users: Record<string, any> = {
    'u-grace': { role: 'LEAD', organizationId: 'org-drop', email: 'grace@dropaccess.test', awaitingOrgApproval: false },
    'u-mercy': { role: 'MEMBER', organizationId: 'org-drop', email: 'mercy@dropaccess.test', awaitingOrgApproval: false },
    'u-kevin': { role: 'MEMBER', organizationId: 'org-drop', email: 'kevin@dropaccess.test', awaitingOrgApproval: false },
    'u-naomi': { role: 'ADMIN', organizationId: 'org-drop', email: 'naomi@dropaccess.test', awaitingOrgApproval: false },
    'u-stranger': { role: 'MEMBER', organizationId: 'org-drop', email: 'someone@dropaccess.test', awaitingOrgApproval: false },
  };
  const writes: string[] = [];
  const write = (what: string) => jest.fn(async () => { writes.push(what); return {}; });
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async () => ground),
      findUnique: jest.fn(async () => ({ organizationId: ground.organizationId, initiatorId: ground.initiatorId, scenario: ground.scenario, createdByUserId: ground.createdByUserId, status: ground.status, approvedById: null, participants: participants.map((p) => ({ userId: p.userId, email: p.email })) })),
      update: write('ground.update'), updateMany: write('ground.updateMany'), create: write('ground.create'), delete: write('ground.delete'),
    },
    groundParticipant: { update: write('groundParticipant.update'), updateMany: write('groundParticipant.updateMany') },
    organization: { findUnique: jest.fn(async () => ({ release1bTabsOn: over.switchOn ?? true })), update: write('organization.update') },
    user: { findUnique: jest.fn(async (a: any) => users[a.where.id] ?? null) },
    person: { findMany: jest.fn(async () => [{ email: 'kevin@dropaccess.test', phone: '+254700000410' }]), findFirst: jest.fn(async () => null) },
    platformSetting: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) },
  };
  return { prisma, writes };
}

const read = (prisma: any, userId: string) => readPeopleAndSetup(prisma, { groundId: 'g-sales', organizationId: 'org-drop', userId }, NOW);

describe('with Release 1B\'s switch off, nothing new is served, and nothing is written', () => {
  it('every reader is served { on: false }, so People and setup reads exactly as it did', async () => {
    for (const who of ['u-grace', 'u-naomi', 'u-mercy']) {
      const { prisma, writes } = theSalesCheckIn({ switchOn: false });
      expect(await read(prisma, who)).toEqual({ on: false });
      expect(writes).toEqual([]);
    }
  });
});

describe('the lead, Grace, reads the whole page', () => {
  it('one sentence on how it runs, and each setup problem with its one fix', async () => {
    const { prisma, writes } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-grace');
    expect(r.view).toBe('lead');
    /* Changed 28 October 2026 (fix plan, pattern 1): the people a session waits on, as Today's "1 of N" counts them. Grace runs it and checks in
       when she chooses, so she is not counted. Changed again 3 November: somebody invited who has not joined is counted (Hafsah, 1 November:
       "counted and named as not joined"), as Today and the board count them, so Peter is one of the 4. */
    expect(r.howItRuns).toBe('4 people answer every weekday, until 30 October, on WhatsApp or here.');
    expect(r.problems).toEqual([
      { participantId: 'p-mercy', says: 'Mercy Wanjiru has no WhatsApp number, so Mercy answers here.', fix: 'add-a-number' },
      { participantId: 'p-joseph', says: "Nobody has described Joseph Mutua's role here, so Joseph gets the general questions.", fix: 'add-their-role' },
      { participantId: 'p-peter', says: "Peter Ouma can't start, because the invitation to Peter bounced.", fix: 'fix-the-address' },
    ]);
    expect(r.sessions).toBe('5 of 18 sessions done. Sessions already done are never removed.');
    expect(r.joinedWithTheLink).toBe('1 person has answered with it.');
    expect(r.kindOfWork).toBe('sales team');
    expect(r.othersWithAccess).toBe("The people above and the admins of Drop Access can see it. So can a lead in the same department, once the team's report is shared.");
    expect(writes).toEqual([]);
  });

  it('a check-in kept in Groundwork asks nobody for a number, and says "here"', async () => {
    const { prisma } = theSalesCheckIn({ overWhatsApp: false });
    const r: any = await read(prisma, 'u-grace');
    expect(r.howItRuns).toBe('4 people answer every weekday, until 30 October, here.');
    expect(r.problems.map((p: any) => p.fix)).toEqual(['add-their-role', 'fix-the-address']);
  });
});

describe('an admin who does not run it, Naomi, reads the whole page with no ending', () => {
  it('is served the admin view, the fixes an admin may use, and never the lead\'s words about a person', async () => {
    const { prisma, writes } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-naomi');
    expect(r.view).toBe('admin');
    expect(r.howItRuns).toBe('4 people answer every weekday, until 30 October, on WhatsApp or here.');
    expect(r.problems).toEqual([
      { participantId: 'p-mercy', says: 'Mercy Wanjiru has no WhatsApp number, so Mercy answers here.', fix: 'add-a-number' },
      { participantId: 'p-joseph', says: "Nobody has described Joseph Mutua's role here, so Joseph gets the general questions.", fix: null },
      { participantId: 'p-peter', says: "Peter Ouma can't start, because the invitation to Peter bounced.", fix: null },
    ]);
    expect(r.roleDescribed).toEqual({ 'p-grace': true, 'p-kevin': true, 'p-mercy': true, 'p-joseph': false, 'p-peter': true });
    const served = JSON.stringify(r);
    expect(served).not.toContain(LEAD_NOTE_ABOUT_KEVIN);
    expect(served).not.toContain('Agent, Thika');
    expect(served).not.toContain('@dropaccess.test');
    expect(writes).toEqual([]);
  });
});

describe('a team member, Mercy, is served only her short page', () => {
  it('those keys and no others: no setting, no problem list, no join link, nobody else\'s details', async () => {
    const { prisma, writes } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-mercy');
    expect(Object.keys(r).sort()).toEqual(['howItRuns', 'on', 'runsIt', 'sessionsPlanned', 'status', 'view', 'whoSeesWhat', 'yourRole', 'yourSessionsDone']);
    expect(r).toEqual({
      on: true,
      view: 'member',
      howItRuns: '4 people answer every weekday, until 30 October, on WhatsApp or here.',
      yourRole: 'Rep, Kiambu and schools',
      status: 'AWAITING_PARTIES',
      yourSessionsDone: 2,
      sessionsPlanned: 18,
      runsIt: 'Grace Achieng',
      whoSeesWhat: "Grace knows who is here. You see the team's report once it's shared, with names.",
    });
    const served = JSON.stringify(r);
    for (const other of ['Kevin', 'Joseph', 'Peter', LEAD_NOTE_ABOUT_KEVIN, '+254', '@dropaccess.test', 'problems', 'joinedWithTheLink', 'kindsOffered']) {
      expect(served).not.toContain(other);
    }
    expect(writes).toEqual([]);
  });

  it('her role is her own job title, never the lead\'s description of her', async () => {
    const { prisma } = theSalesCheckIn();
    const r: any = await read(prisma, 'u-kevin');
    expect(r.view).toBe('member');
    expect(r.yourRole).toBe('You have not described your role yet. You can add your job title on your profile.');
    expect(JSON.stringify(r)).not.toContain(LEAD_NOTE_ABOUT_KEVIN);
  });
});

describe('the check-in\'s own read rules come first', () => {
  function theService(prisma: any) {
    const svc = Object.create(GroundsService.prototype);
    svc.prisma = prisma;
    return svc as GroundsService;
  }

  it('somebody who may not open the check-in is refused before anything is read', async () => {
    const { prisma } = theSalesCheckIn();
    await expect(theService(prisma).peopleAndSetup('g-sales', 'org-drop', 'u-stranger')).rejects.toThrow('That check-in could not be found');
    expect(prisma.ground.findFirst).not.toHaveBeenCalled();
  });

  it('the lead, the admin and the member are each served their own view through the route\'s service', async () => {
    const views: string[] = [];
    for (const who of ['u-grace', 'u-naomi', 'u-mercy']) {
      const { prisma } = theSalesCheckIn();
      views.push(((await theService(prisma).peopleAndSetup('g-sales', 'org-drop', who)) as any).view);
    }
    expect(views).toEqual(['lead', 'admin', 'member']);
  });
});

describe('how it runs, as one sentence, for every rhythm', () => {
  const base = { answering: 4, endsOn: null, noEnd: true, onWhatsApp: true, endedBy: 'you' as const, timeZone: 'Africa/Nairobi' };
  it('reads each rhythm in plain words', () => {
    expect(theRhythmInWords({ cadence: 'WEEKLY', cadenceAnchorDay: 1 })).toBe('every Monday');
    expect(theRhythmInWords({ cadence: 'WEEKLY' })).toBe('every week');
    expect(theRhythmInWords({ cadence: 'FORTNIGHTLY', cadenceAnchorDay: 5 })).toBe('every other Friday');
    expect(theRhythmInWords({ cadence: 'MONTHLY', cadenceAnchorDay: 2 })).toBe('on the 2nd of every month');
    expect(theRhythmInWords({ cadence: 'DAILY', workingDays: [] })).toBe('every day');
    expect(theRhythmInWords({ cadence: 'DAILY', workingDays: [1, 3, 5] })).toBe('every Monday, Wednesday and Friday');
    expect(theRhythmInWords({ cadence: 'ONE_TIME' })).toBe('once');
  });
  it('fee notes, with no end, and a team pulse answered once', () => {
    expect(howThisCheckInRuns({ ...base, cadence: 'WEEKLY', cadenceAnchorDay: 1 })).toBe('4 people answer every Monday, until you end it, on WhatsApp or here.');
    expect(howThisCheckInRuns({ ...base, answering: 24, cadence: 'ONE_TIME', endsOn: new Date('2026-10-23T12:00:00Z'), noEnd: false })).toBe('24 people answer once, closing Friday 23 October, on WhatsApp or here.');
    expect(howThisCheckInRuns({ ...base, answering: 1, cadence: 'WEEKLY', endedBy: 'Grace', onWhatsApp: false })).toBe('1 person answers every week, until Grace ends it, here.');
  });
});
