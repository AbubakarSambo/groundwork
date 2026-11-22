import { askGroundwork, textOf } from './request-92-harness';
import { route } from './the-router-is-deterministic';
import { RoleMapService } from '../suites/the-role-map.service';
import { askStartersFor } from './ask-name';
import { whatYouCanAskSaid } from './what-you-can-ask-here';
import { thePeriodAskedAbout } from './a-quarter-or-a-year-by-asking';
import { whoseHistory } from './a-persons-history-by-asking';

/**
 * CHAT IS KING, SECTION 8: WHAT EACH READER READS WHEN THEY ASK, AND WHAT THEY ARE NEVER GIVEN.
 *
 * Grace Achieng runs "Sales team, Q4" at Baridi (lead-1 here). Mercy, Kevin and Joseph take part. Kevin is also in "Support, Q4", run by
 * somebody else (lead-2), which Grace does not run and cannot read. Each answer is checked as the words a person reads, for the lead, for a
 * member, for an admin who does not run it, and for a person asking about themselves. The history is read through the My work page's own
 * reader, so the privacy cases here are the page's, reached by asking.
 */
const NOW_ISH = new Date();
const at = (d: string, h = 8) => new Date(`2026-08-${d}T${String(h).padStart(2, '0')}:00:00Z`);

const person = (id: string, userId: string, first: string, last: string, over: any = {}) => ({
  id, userId, email: `${first.toLowerCase()}@baridi.test`, nameGiven: null, partyType: 'PARTICIPANT', managingOnly: false, createdAt: at('01'), joinedAt: at('01'),
  user: { firstName: first, lastName: last }, ...over,
});
const salesGround = {
  id: 'g-sales', label: 'Sales team, Q4', organizationId: 'org-a', initiatorId: 'lead-1', scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team', peersVisibleToEachOther: true,
  initiator: { firstName: 'Grace', lastName: 'Achieng' }, organization: { timeZone: 'Africa/Nairobi' },
  participants: [
    person('p-grace', 'lead-1', 'Grace', 'Achieng', { partyType: 'INITIATOR', managingOnly: true }),
    person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
    person('p-kevin', 'u-kevin', 'Kevin', 'Omondi'),
    person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
  ],
};
const supportGround = {
  id: 'g-support', label: 'Support, Q4', organizationId: 'org-a', initiatorId: 'lead-2', scenario: 'OKR_ALIGNMENT', kindOfWork: 'support team', peersVisibleToEachOther: true,
  initiator: { firstName: 'Tom', lastName: 'Ndegwa' }, organization: { timeZone: 'Africa/Nairobi' },
  participants: [person('p-tom', 'lead-2', 'Tom', 'Ndegwa', { partyType: 'INITIATOR', managingOnly: true }), person('p-kevin2', 'u-kevin', 'Kevin', 'Omondi'), person('p-nia', 'u-nia', 'Nia', 'Chebet')],
};
const GROUNDS = [salesGround, supportGround];

const done = (n: number, pid: string, specific = true) => ({
  id: `c-${pid}-${n}`, participantId: pid, groundId: 'g-sales', sessionNumber: n, status: 'COMPLETED',
  availableFrom: at(String(n + 4).padStart(2, '0')), createdAt: at('01'), completedAt: at(String(n + 4).padStart(2, '0'), 10), specificityLevel: specific ? 'specific' : 'directional',
});

function theAssistant(userId: string, role = 'MEMBER') {
  const h = askGroundwork({ userId, role, grounds: GROUNDS as any, participants: [] });
  const p = h.prisma;
  /* The where is honoured, so a lead is never handed a check-in somebody else runs. */
  p.ground.findMany = jest.fn(async ({ where }: any = {}) => GROUNDS.filter((g) => (where?.initiatorId ? g.initiatorId === where.initiatorId : where?.participants?.some ? g.participants.some((x) => x.userId === where.participants.some.userId) : true)));
  p.ground.findFirst = jest.fn(async ({ where }: any) => GROUNDS.find((g) => g.id === where.id) ?? null);
  p.organization.findUnique = jest.fn(async () => ({ name: 'Baridi', release1bTabsOn: true, personJudgementsOn: true }));
  p.groundCommitment = { findMany: async () => [] };
  p.groundDependency = { findMany: async () => [] };
  p.workMention = { findMany: async () => [] };
  p.groundObjective = { findMany: async () => [] };
  const rows = [...[1, 2, 3, 4, 5].map((n) => done(n, 'p-mercy', n !== 4)), done(1, 'p-kevin', false)];
  p.checkIn = { findMany: async ({ where, select }: any = {}) => {
    if (select?.sessionReport) return [];
    if (where?.participantId && typeof where.participantId === 'string') return rows.filter((c) => c.participantId === where.participantId);
    if (where?.groundId && where?.completedAt) return rows.filter((c) => c.groundId === where.groundId && c.completedAt >= where.completedAt.gte && c.completedAt < where.completedAt.lt);
    return [];
  } };
  p.groundContextItem = { findMany: async ({ where }: any) => {
    const all = [
      { kind: 'WAY_OF_WORKING', text: 'Book the next step before you leave each visit.', audience: 'EVERYONE', aboutParticipantId: null, groundId: 'g-sales' },
      { kind: 'WAY_OF_WORKING', text: 'No quote before the decision maker is named.', audience: 'EVERYONE', aboutParticipantId: null, groundId: 'g-sales' },
      { kind: 'DECISION', text: 'Who owns Juja.', audience: 'EVERYONE', aboutParticipantId: null, groundId: 'g-sales' },
      { kind: 'COACHING', text: 'Book the next step before you leave each visit.', audience: 'EVERYONE', aboutParticipantId: null, groundId: 'g-sales' },
      { kind: 'HELP_WITH', text: 'Find the decision maker at each school before quoting.', audience: 'LEAD_ONLY', aboutParticipantId: 'p-mercy', groundId: 'g-sales' },
    ];
    return all.filter((l) => (!where.groundId || l.groundId === where.groundId)
      && (!where.kind?.in || where.kind.in.includes(l.kind))
      && (!where.audience || l.audience === where.audience)
      && (!where.OR || where.OR.some((o: any) => o.kind === l.kind && (o.aboutParticipantId === undefined || o.aboutParticipantId === l.aboutParticipantId) && (!o.audience || o.audience === l.audience))));
  } };
  (h.service as any).board = { get: async () => ({ workRecords: [], patterns: [], howItIsGoing: { latestSummary: 'Three of the four people have answered this round.' } }) };
  return h;
}

const ask = async (h: ReturnType<typeof theAssistant>, message: string) => { const r: any = await h.service.respond('org-a', 'p1', message); return { lane: r.lane as string, said: textOf(r) }; };

describe('a person’s history, asked for by name', () => {
  it('Grace, who runs the check-in, reads Mercy’s history in full sentences, from the page she already reads', async () => {
    const r = await ask(theAssistant('lead-1'), 'How has Mercy been performing?');
    expect(r.lane).toBe('performance_history');
    expect(r.said).toContain('This is Mercy’s history in "Sales team, Q4"');
    expect(r.said).toMatch(/Mercy has done 5 of \d+ check-ins, \d+ on time and \d+ with specific answers\./);
    /* Changed 21 November 2026 (Batch E, N13): the closing no longer carries a privacy note (it had already been taken out of the words, and this test still pinned it). */
    expect(r.said).toContain('This is the same page you see under My work for this check-in.');
    expect(r.said).not.toContain('only you can read it');
    expect(r.said).not.toContain('Kevin');
    expect(r.said).not.toMatch(/\b(PIP|at risk|low performer|rating)\b/i);
  });

  it('Grace is told the same sentence for a person who is not in anything she runs, whether or not that person exists', async () => {
    const nia = await ask(theAssistant('lead-1'), 'How has Nia been performing?');
    const nobody = await ask(theAssistant('lead-1'), 'How has Zuri been performing?');
    expect(nia.said).toBe('I can give the history of people in the check-ins you run, and I cannot find Nia in any of them. If you lead Nia, ask me about a name as it is on your check-in.');
    expect(nobody.said).toBe(nia.said.replace('Nia', 'Zuri').replace('Nia', 'Zuri'));
    expect(nia.said).not.toContain('Support, Q4');
  });

  it('Kevin is in two check-ins, and Grace reads only the one she runs', async () => {
    const r = await ask(theAssistant('lead-1'), 'Show me the performance history of Kevin');
    expect(r.said).toContain('"Sales team, Q4"');
    expect(r.said).not.toContain('Support, Q4');
  });

  it('a member asking about a colleague is told what an outsider is told, and reads nothing of the colleague', async () => {
    const r = await ask(theAssistant('u-mercy'), 'How has Kevin been performing?');
    expect(r.lane).toBe('performance_history');
    expect(r.said).toBe('I can give the history of people in the check-ins you run, and I cannot find Kevin in any of them. If you lead Kevin, ask me about a name as it is on your check-in.');
  });

  it('an admin who runs nothing is not handed a team’s history through the chat', async () => {
    const r = await ask(theAssistant('u-admin', 'ADMIN'), 'How has Mercy been performing?');
    expect(r.said).toContain('I cannot find Mercy in any of them');
  });

  it('Mercy asking about herself reads her own page, in the second person', async () => {
    const r = await ask(theAssistant('u-mercy'), 'Show me the performance history for myself');
    expect(r.said).toContain('This is your history in "Sales team, Q4"');
    expect(r.said).toContain('You have done 5 of');
    /* Changed 21 November 2026 (Batch E, N13): no privacy note in a message. */
    expect(r.said).toContain('This is the same page you see under My work.');
    expect(r.said).not.toContain('nobody else reads it');
    expect(r.said).not.toContain('what you have told me about them');
  });

  it('the lead’s own note about a person is read to the lead as coaching, and is never in what the person reads about themselves', async () => {
    const lead = await ask(theAssistant('lead-1'), 'How has Mercy been performing?');
    const mercy = await ask(theAssistant('u-mercy'), 'Show me the performance history for myself');
    expect(mercy.said).not.toContain('Find the decision maker at each school before quoting');
    expect(lead.said + mercy.said).not.toContain('LEAD_ONLY');
  });

  it('is read from the question, and a question about the team or about me is not taken for it', () => {
    expect(whoseHistory('How has Joseph been performing?')).toBe('Joseph');
    expect(whoseHistory('Kevin’s track record')).toBe('Kevin');
    expect(whoseHistory('how has the team been doing')).toBeNull();
    expect(whoseHistory('how am I doing')).toBeNull();
  });
});

describe('a quarterly or an annual report, asked for by saying so', () => {
  it('Grace reads a report of the quarter from her check-in, the Desk and References and resources, and is told where each came from', async () => {
    const r = await ask(theAssistant('lead-1', 'LEAD'), 'Get me the quarterly report for Q3 2026');
    expect(r.lane).toBe('period_report');
    expect(r.said).toContain('Here is your quarterly report for Q3 2026, written from what is on record for the check-ins you can read.');
    expect(r.said).toContain('Sales team, Q4. 5 rounds were finished in this time, with 2 people taking part.');
    expect(r.said).toContain('In References and resources, 2 rules are written down for everyone and 1 decision is still open.');
    expect(r.said).toMatch(/This comes from the finished check-ins and boards of "Sales team, Q4"(?:, from the Desk,)? and from References and resources\./);
    /* No privacy notes, and the Company page is called the Desk (Batch S round 2, T11). */
    expect(r.said).not.toMatch(/may not read|that you may read|Company page|does not name what people said/);
  });

  it('never reads from a check-in the asker does not run, and never reads the lead’s private note for a person', async () => {
    const r = await ask(theAssistant('lead-1', 'LEAD'), 'quarterly report');
    expect(r.said).not.toContain('Support, Q4');
    expect(r.said).not.toContain('Find the decision maker at each school');
  });

  it('a member who runs nothing is told there is nothing to report from', async () => {
    const r = await ask(theAssistant('u-mercy'), 'Get me a quarterly report');
    expect(r.said).toMatch(/^There is no check-in you can read to report on for Q\d \d{4}\./);
  });

  it('an annual report is the year, and says so', async () => {
    const r = await ask(theAssistant('lead-1', 'LEAD'), 'write the annual report for last year');
    expect(r.said).toContain(`Here is your annual report for ${NOW_ISH.getUTCFullYear() - 1}`);
  });

  it('reads the period from the words', () => {
    const now = new Date('2026-11-19T09:00:00Z');
    expect(thePeriodAskedAbout('quarterly report', now).said).toBe('Q4 2026');
    expect(thePeriodAskedAbout('last quarter', now).said).toBe('Q3 2026');
    expect(thePeriodAskedAbout('annual report', now).said).toBe('2026');
    expect(thePeriodAskedAbout('report for Q1', new Date('2027-02-01T00:00:00Z')).said).toBe('Q1 2027');
    expect(thePeriodAskedAbout('last quarter', new Date('2027-02-01T00:00:00Z')).said).toBe('Q4 2026');
  });
});

describe('being guided through connecting a platform', () => {
  it('an admin is told where Slack stands and where to finish it, and is told not to type the address here', async () => {
    const h = theAssistant('u-admin', 'ADMIN');
    h.prisma.workspaceNotifier = { findMany: async () => [] };
    const r = await ask(h, 'Connect Slack');
    expect(r.lane).toBe('connect_a_platform');
    expect(r.said).toBe('Slack is not connected.\n\nTo connect Slack, make an incoming webhook for the channel you want the notices in, then paste its address on the Integrations page. It arrives switched off, and you switch it on when you are ready.\n\nDo not type the address or the keys into this chat, because what is typed here is kept. Paste them on the page, and I will tell you where it stands.');
  });

  it('says when one is connected but the last notice did not arrive', async () => {
    const h = theAssistant('u-admin', 'ADMIN');
    h.prisma.workspaceNotifier = { findMany: async () => [{ kind: 'TEAMS', enabled: true, lastError: 'bad' }] };
    const r = await ask(h, 'how do I connect Teams?');
    expect(r.said).toContain('Teams is connected, but the last notice did not arrive. Its address may have changed, so connect it again.');
    expect(r.said).not.toContain('bad');
  });

  it('a member and a lead are told an admin does it, and nothing is read about the organisation’s connections', async () => {
    for (const role of ['MEMBER', 'LEAD']) {
      const h = theAssistant('u-x', role);
      const find = jest.fn(async () => []);
      h.prisma.workspaceNotifier = { findMany: find };
      const r = await ask(h, 'connect another platform');
      expect(r.said).toBe('Only an admin connects Groundwork to another platform. Ask an admin in your organisation to do it, and they can ask me to take them through it. Nothing has changed.');
      expect(find).not.toHaveBeenCalled();
    }
  });

  it('WhatsApp is pointed at the Connections page, with no keys asked for', async () => {
    const r = await ask(theAssistant('u-admin', 'ADMIN'), 'set up WhatsApp');
    expect(r.said).toContain('WhatsApp is connected on the Connections page');
  });
});

describe('the role map, asked about', () => {
  const ORG = 'org-a';
  const roleMapFor = (membership: string) => new RoleMapService({
    organizationSuite: { findUnique: async () => ({ isOn: true }) },
    organizationMembership: { findUnique: async () => ({ role: membership }) },
    role: { findMany: async () => [{ key: 'sales-lead', name: 'Sales lead', description: 'The sales team' }, { key: 'stock', name: 'Stock planning', description: 'Booking freezers' }] },
    roleAssignment: { findMany: async () => [{ personExternalId: 'p-grace', roleName: 'Sales lead', endedAt: null }] },
    person: { findMany: async () => [{ externalId: 'p-grace', displayName: 'Grace Achieng', givenName: 'Grace', familyName: 'Achieng', title: null }] },
    roleInterviewAnswer: { findMany: async () => [] },
    roleGapNote: { findMany: async () => [] },
  } as any);
  const withMap = (membership: string) => { const h = theAssistant('u-admin', membership); (h.service as any).roleMap = roleMapFor(membership); return h; };

  it('an admin is read who holds each role and which jobs nobody holds', async () => {
    const r = await ask(withMap('ADMIN'), 'who holds each role');
    expect(r.lane).toBe('role_map');
    expect(r.said).toContain('Sales lead is held by Grace Achieng. It owns The sales team.');
    expect(r.said).toContain('Stock planning is a job nobody holds right now.');
    expect(r.said).toContain('Only admins can read this');
    expect(ORG).toBe('org-a');
  });

  it('asking to change it is answered that nothing was changed, here or on the page', async () => {
    const r = await ask(withMap('ADMIN'), 'build the role map');
    expect(r.said.startsWith('The role map cannot be changed here, by chat or on the page.')).toBe(true);
    expect(r.said).toContain('I have changed nothing.');
  });

  it('a lead and a member are refused in the page’s own words', async () => {
    for (const m of ['LEAD', 'MEMBER']) {
      const r = await ask(withMap(m), 'Show me the role map');
      expect(r.said).toBe('Only an admin can open this board.');
    }
  });
});

describe('who is away, said when asking for something', () => {
  const asking = (role: string) => {
    const h = theAssistant('lead-1', role);
    (h.service as any).grounds = { theQuestionForAPerson: async () => ({ participantId: 'p-joseph', who: 'Joseph Kariuki', exactQuestion: 'How is Juja going?' }), list: async () => [] };
    const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    (h.service as any).leave = { board: async () => ({ off: [{ name: 'Joseph Kariuki', startsOn: iso(3), endsOn: iso(6) }] }) };
    return { h, iso };
  };

  it('a lead asking Joseph something is told he is off, in dates, before it is kept', async () => {
    const { h } = asking('LEAD');
    const r = await ask(h, 'Ask Joseph about Juja');
    expect(r.said).toMatch(/Just so you know, Joseph is off from \d{1,2} \w+ to \d{1,2} \w+, from approved leave, so the answer may take longer\. Shall I keep it for then\?/);
  });

  it('a member is told nothing about anybody’s leave this way', async () => {
    const { h } = asking('MEMBER');
    const r = await ask(h, 'Ask Joseph about Juja');
    expect(r.said).not.toContain('off from');
  });
});

describe('what people are told they can do', () => {
  /* Read from the one guide now (Batch S, S5): one sentence and one example for each thing, the reader's own role first. The checks are the same:
     a lead reads setting one up, the team and a report; an admin reads leave, connecting a platform and the role map; a member reads none of those.
     The promise "I will ask for the people and how to reach them" is gone from the help, because the check-in setup now does it. */
  const facts = { isAGuest: false, takesPartInOne: false, hasOneToUse: false, runsOne: false, leaveIsOn: false, spendingIsOn: false, hoursAreOn: false, contextIsHere: true, waitingForYou: 0 };

  it('a lead who runs a check-in reads setting one up, how the team is doing and a report, and not the admin list', () => {
    const said = whatYouCanAskSaid({ ...facts, takesPartInOne: true, hasOneToUse: true, runsOne: true });
    expect(said).toContain('You can set up a check-in. For example, say "Get updates from my team on deals, payments and visits."');
    expect(said).toContain('You can ask how your team is doing. For example, say "How is my team doing?"');
    expect(said).toContain('You can get a quarterly or an annual report.');
    expect(said).not.toContain('role map');
  });

  it('an admin reads leave, spending, time sheets, reviews, connecting a platform and the role map, and a report, but not how a team is doing', () => {
    const said = whatYouCanAskSaid({ ...facts, isAnAdmin: true });
    expect(said).toContain('You can set up how leave, spending, time sheets or reviews work. For example, say "Set up our leave process."');
    expect(said).toContain('You can connect Slack, Teams or WhatsApp.');
    expect(said).toContain('You can read the role map.');
    expect(said).toContain('You can get a quarterly or an annual report.');
    expect(said).not.toContain('how your team is doing');
  });

  it('a member reads none of what a lead or an admin does', () => {
    const said = whatYouCanAskSaid({ ...facts, takesPartInOne: true, hasOneToUse: true });
    expect(said).not.toContain('quarterly');
    expect(said).not.toContain('role map');
    expect(said).not.toContain('how your team is doing');
  });

  it('is answered when asked in the chat, for an admin', async () => {
    const h = theAssistant('u-admin', 'ADMIN');
    const r = await ask(h, 'What can you do?');
    expect(r.lane).toBe('what_can_you_do');
    expect(r.said).toContain('You can set up how leave, spending, time sheets or reviews work.');
  });

  it('the first-open list offers a lead and an admin what fits them, and a member none of it', () => {
    const base = { isAGuest: false, takesPartInOne: true, hasOneToUse: true, runsOne: false, leaveIsOn: false, spendingIsOn: false, contextIsHere: true };
    expect(askStartersFor({ ...base, runsOne: true })).toEqual(expect.arrayContaining(['How is my team doing?', 'Get a quarterly report.']));
    expect(askStartersFor({ ...base, runsOne: true })).not.toContain('Set up our leave process.');
    expect(askStartersFor({ ...base, isAnAdmin: true })).toEqual(expect.arrayContaining(['Get a quarterly report.', 'Set up our leave process.']));
    expect(askStartersFor(base)).not.toEqual(expect.arrayContaining(['Get a quarterly report.']));
    expect(askStartersFor({ ...base, isAGuest: true, isAnAdmin: true, runsOne: true })).toEqual(expect.not.arrayContaining(['Get a quarterly report.']));
  });

  it('every one of those offers is answered by a lane, never the shrug', () => {
    for (const s of ['How is my team doing?', 'Get a quarterly report.', 'Set up our leave process.']) expect(route(s).lane).not.toBe('unplaced');
  });
});
