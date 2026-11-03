import { sendHeresWhatIsNew } from './heres-what-is-new';
import { theWaitingWords } from './waiting-on-the-people-you-invited';
import { theTeamWords, theAcrossWords } from './who-has-gone-quiet';
import { theFollowUpWords } from './the-report-follow-up';
import { theirWeekInWords } from './the-participants-week';
import { theSharedPictureSubject } from './the-leads-subjects-carry-the-facts';
import { theFirstInsight } from './the-first-insight';
import { whatThePersonReads, whatTheLeadReads } from '../grounds/missed-check-ins';
import { aDealSaid, aFeeNoteSaid } from './what-they-reported';

/**
 * THE OTHER EMAILS A LEAD AND A TEAM MEMBER GET, DIRECT BEHIND THE DIRECT MORNING'S SWITCH (Hafsah, 20 October 2026, part 4).
 *
 * Grace runs "Sales team, Q4" at Drop Access (test); Kevin, Joseph, Peter and Mercy are on it. Wanjiru runs "Litigation team daily" at
 * Muchemi & Co (test); David is on it. Each email's words, for the person who reads them, with the switch off (as before) and on.
 */
const MON = new Date('2026-10-12T05:00:00Z');
const TUE = new Date('2026-10-13T05:00:00Z');

describe('nobody has started yet (to Grace)', () => {
  const w = { label: 'Sales team, Q4', invited: ['Kevin', 'Joseph', 'Peter', 'Mercy'], invitedOn: MON, reminded: ['Kevin'], remindingAgainOn: [TUE] };
  it('off: as before, with what Groundwork is doing for her', () => {
    const said = theWaitingWords('Grace', w);
    expect(said.subject).toBe('Nobody has started "Sales team, Q4" yet, and Groundwork is following up');
    expect(said.lines.join(' ')).toContain('You do not need to chase anyone yourself.');
  });
  it('on: who, who has had a reminder, and when the next goes', () => {
    const said = theWaitingWords('Grace', w, true);
    expect(said.subject).toBe('Nobody has started "Sales team, Q4" yet');
    expect(said.lines).toEqual([
      'Hello Grace. Kevin, Joseph, Peter and Mercy were invited to "Sales team, Q4" on 12 Oct 2026, and nobody has started yet.',
      'Kevin has had a reminder.',
      'The next reminder goes on 13 Oct 2026.',
      'You could write to them yourself, "I would value your view on Sales team, Q4. It takes about ten minutes."',
    ]);
  });
});

describe('who has gone quiet (to Wanjiru)', () => {
  const c: any = { label: 'Litigation team daily', ofHowMany: 4, neverAnswered: 1, stoppedAfterAnswering: ['Brian', 'David'], closedAllBy: null };
  it('off: the line that defends the check-in is still there', () => {
    expect(theTeamWords('Wanjiru', c).lines.join(' ')).toContain('this is a pattern across the team and not about one person. Groundwork has not changed or shortened the check-in.');
    expect(theAcrossWords('Wanjiru', [c]).lines.join(' ')).toContain('Groundwork has not changed or shortened any of them.');
  });
  it('on: it is not', () => {
    for (const l of [...theTeamWords('Wanjiru', c, true).lines, ...theAcrossWords('Wanjiru', [c], true).lines]) expect(l).not.toMatch(/pattern across the team|Groundwork has not changed/);
    expect(theTeamWords('Wanjiru', c, true).lines).toContain('If you want to know what is in the way, asking one of them directly is the quickest way to find out.');
  });
});

describe('missed check-ins', () => {
  it('David, off: as before', () => {
    expect(whatThePersonReads({ inARow: 2, stage: 1 as any }, { leadName: 'Wanjiru', somebodyWaitsOnThem: false })).toBe("You've missed your last two check-ins. When you miss them, your team works without your view. Things you know about surface late and Wanjiru has to chase instead of help. If you miss the next one as well, Wanjiru will be told. About ten minutes now puts your view back in the picture.");
  });
  it('David, on: how many, whether Wanjiru is told, and how long it takes', () => {
    expect(whatThePersonReads({ inARow: 2, stage: 1 as any }, { leadName: 'Wanjiru', somebodyWaitsOnThem: true, direct: true })).toBe("You've missed your last two check-ins. Somebody on the team is waiting on you. If you miss the next one as well, Wanjiru will be told. It takes about ten minutes.");
  });
  it('Wanjiru, off and on', () => {
    const stand: any = { ofTheLastFour: 3, lastFour: 4, reason: null };
    expect(whatTheLeadReads('David', stand, 'Litigation team daily')).toBe('David has missed 3 of the last 4 check-ins on "Litigation team daily". When someone stops checking in, the team loses their view, problems surface late, and the effort to keep everyone in step falls on you and the rest of the team. Speak to David this week.');
    expect(whatTheLeadReads('David', stand, 'Litigation team daily', true)).toBe('David has missed 3 of the last 4 check-ins on "Litigation team daily". Speak to David this week.');
  });
});

describe('the report follow-up (to Grace)', () => {
  const c: any = { done: 1, cleared: 0, waiting: 2, open: 0, difference: "the standard for what counts as a 'sold' unit is not being applied consistently", scenario: 'OKR_ALIGNMENT', daysSinceTheReport: 8 };
  it('off: "The shared picture found"', () => {
    expect(theFollowUpWords('Grace', 'Sales team, Q4', MON, c).lines[1]).toBe("The shared picture found that the standard for what counts as a 'sold' unit is not being applied consistently. No check-in has been held since, so that has not been looked at again.");
  });
  it('on: "The report found"', () => {
    expect(theFollowUpWords('Grace', 'Sales team, Q4', MON, c, true).lines[1]).toBe("The report found that the standard for what counts as a 'sold' unit is not being applied consistently. No check-in has been held since, so that has not been looked at again.");
  });
});

describe("Joseph's week", () => {
  const w: any = { kept: null, open: ['Get it to him', 'Get that price to Juja Hardware'], openSaid: [], waitingOn: [], waitingOnYou: [], saidToWaitOnYou: [], reportsReady: [] };
  it('off: "Only you can read this."', () => {
    expect(theirWeekInWords('Joseph', w)!.lines[0]).toBe('Hello Joseph. Here is your week in Groundwork. Only you can read this.');
  });
  it('on: the greeting, and the week', () => {
    expect(theirWeekInWords('Joseph', w, true)!.lines[0]).toBe('Hello Joseph. Here is your week.');
  });
});

describe('the report-ready subject a team member reads, and the finding the lead reads first', () => {
  it('off and on', () => {
    expect(theSharedPictureSubject('Sales team, Q4', { ofHowMany: 5, answered: 5, notYet: [] }, null)).toBe('All five people on "Sales team, Q4" have checked in, and the shared picture is ready');
    expect(theSharedPictureSubject('Sales team, Q4', { ofHowMany: 5, answered: 5, notYet: [] }, null, true)).toBe('All five people on "Sales team, Q4" have checked in, and the report is ready');
    expect(theSharedPictureSubject('Sales team, Q4', null, null, true)).toBe('Your report for "Sales team, Q4" is ready');
  });
  it('the lead: the finding with the names the report gives, and what to do, and no count of things settled', () => {
    const report = { whereThingsStand: { settled: ['a', 'b', 'c', 'd'], differences: ['Kevin Omondi said that the Kilele Hotel order is paid, while Joseph Kariuki said that no sale has a payment yet'], openWithReasons: [] }, theConversationWorthHaving: 'Agree on what shows a sale is paid.' };
    const off = theFirstInsight(report, 'Sales team, Q4', { isTheLead: true })!.lines;
    const on = theFirstInsight(report, 'Sales team, Q4', { isTheLead: true, direct: true })!.lines;
    expect(off).toEqual([
      'Kevin Omondi said that the Kilele Hotel order is paid, while Joseph Kariuki said that no sale has a payment yet.',
      'Four things are settled and one is still open.',
      'Here is a conversation worth having. Agree on what shows a sale is paid.',
      'What I would do is bring the people involved together on that one question.',
    ]);
    expect(on).toEqual([
      'Kevin Omondi said that the Kilele Hotel order is paid, while Joseph Kariuki said that no sale has a payment yet.',
      'Agree on what shows a sale is paid.',
      'What I would do is bring the people involved together on that one question.',
    ]);
  });
});

describe('what somebody reported, as the lead reads it', () => {
  it('a deal and a fee note, in full sentences', () => {
    expect(aDealSaid({ name: 'Kilele Hotel', stage: 'Won', fields: { Units: '40', Value: 'KES 200,000' } }, 'Kevin')).toBe('Kilele Hotel bought 40 units, and the value Kevin gave is KES 200,000.');
    expect(aDealSaid({ name: 'Kamau Electricals', stage: 'Lost', fields: { 'Next step': 'none' } }, 'Kevin')).toBe('Kamau Electricals said no.');
    expect(aFeeNoteSaid({ name: 'FN-006', stage: 'Paid', fields: { Number: 'FN-006', Client: 'Baraka Hardware', Amount: 'KES 120,000', 'Next step': 'follow up with Mr. Baraka today' } })).toBe('Fee note FN-006 for Baraka Hardware, for KES 120,000, is paid. The next step is "follow up with Mr. Baraka today".');
  });
});

describe('"here is what is new" (to Wanjiru)', () => {
  function world(on: boolean) {
    const sent: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: async () => ({ value: { at: '2026-10-01T00:00:00Z' } }) },
      organization: { findUnique: async () => ({ directMorningOn: on }) },
      ground: { findMany: async () => [{ id: 'g1', label: 'Litigation team daily', initiatorId: 'u-w', runsUntilEnded: true }] },
      checkIn: { findMany: async () => [{ status: 'COMPLETED', sessionNumber: 3, participant: { userId: 'u-d', managingOnly: false, nameGiven: null, user: { firstName: 'David', awaitingOrgApproval: false } } }, { status: 'NOT_STARTED', sessionNumber: 3, participant: { userId: 'u-b', managingOnly: false, nameGiven: null, user: { firstName: 'Brian', awaitingOrgApproval: false } } }] },
      user: { findUnique: async () => ({ email: 'wanjiru@muchemi.test', firstName: 'Wanjiru', deletedAt: null, isActive: true, organizationId: 'org-m' }) },
      notification: { findFirst: async () => null },
    };
    const email = { sendHeresWhatIsNew: jest.fn(async (...a: any[]) => { sent.push(a); }) };
    return { run: () => sendHeresWhatIsNew({ prisma, email, frontendUrl: 'https://app.test' }, new Date('2026-10-02T08:00:00Z')), sent };
  }
  it('off: sent, as before', async () => {
    const w = world(false);
    await w.run();
    expect(w.sent).toHaveLength(1);
  });
  it('on: not sent; it is about the product, not her work', async () => {
    const w = world(true);
    expect(await w.run()).toEqual({ tried: 0 });
    expect(w.sent).toHaveLength(0);
  });
});
