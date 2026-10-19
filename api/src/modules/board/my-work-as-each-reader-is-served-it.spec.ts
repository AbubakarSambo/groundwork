import { ForbiddenException } from '@nestjs/common';
import { readMyWork, myWorkFrom, THE_LEADS_NOTE_SHOWS_ON_THEIR_OWN_MY_WORK, type MyWorkServed } from './my-work';
import { THE_SEVEN_BEHAVIOURS } from '../patterns/the-seven-behaviours';

/**
 * MY WORK, AS EACH READER IS SERVED IT (Release 1B, pull request 3 of 3). Proved at the server, on the sales check-in of the B7
 * pictures: Grace Achieng runs "Sales team, Q4" at Drop Access; Mercy, Kevin and Joseph check in.
 *
 *  - with the switch off, every reader is served { on: false }, and nothing about anybody is read;
 *  - Mercy reads her own page, in the second person, the seven behaviours in the library's order with the library's words;
 *  - Mercy can never open Kevin's page: refused before any of Kevin's record is read;
 *  - Grace reads Mercy's page as a manager would, with Mercy's name, her own note for Mercy and the pattern's step, and never
 *    Mercy's own reports;
 *  - Mercy never receives Grace's note for her (held off until Hafsah says yes), nor anybody else's work;
 *  - an admin who does not run it, and somebody outside it, are refused;
 *  - a thin record reads "Not enough yet", never a guess, and nothing is a label on a person.
 */
const NOW = new Date('2026-10-19T09:00:00Z');
const at = (d: string, h = 8) => new Date(`2026-10-${d}T${String(h).padStart(2, '0')}:00:00Z`);
const HELP_MERCY = 'Find the decision maker at each school before quoting.';
const TEAM_COACHING = 'Book the next step before you leave each visit.';
const KEVINS_PROMISE = 'I will visit two shops in Westlands tomorrow.';

function theSalesCheckIn(over: { switchOn?: boolean; thin?: boolean; judgementsOff?: boolean } = {}) {
  const person = (id: string, userId: string, first: string, last: string) => ({
    id, userId, email: `${first.toLowerCase()}@dropaccess.test`, nameGiven: null, partyType: id === 'p-grace' ? 'INITIATOR' : 'PARTICIPANT',
    managingOnly: id === 'p-grace', createdAt: at('01'), user: { firstName: first, lastName: last },
  });
  const ground = {
    id: 'g-sales', label: 'Sales team, Q4', organizationId: 'org-drop', initiatorId: 'u-grace', scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team',
    peersVisibleToEachOther: true,
    initiator: { firstName: 'Grace', lastName: 'Achieng' },
    organization: { timeZone: 'Africa/Nairobi' },
    participants: [
      person('p-grace', 'u-grace', 'Grace', 'Achieng'),
      person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
      person('p-kevin', 'u-kevin', 'Kevin', 'Omondi'),
      person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
    ],
  };
  const done = (n: number, specific: boolean) => ({ id: `c-mercy-${n}`, participantId: 'p-mercy', sessionNumber: n, status: 'COMPLETED', availableFrom: at(String(n + 4).padStart(2, '0')), createdAt: at('01'), completedAt: at(String(n + 4).padStart(2, '0'), 10), specificityLevel: specific ? 'specific' : 'directional' });
  const checkIns = over.thin
    ? [done(1, true)]
    : [...Array.from({ length: 10 }, (_, i) => done(i + 1, i !== 3)), { id: 'c-kevin-1', participantId: 'p-kevin', sessionNumber: 1, status: 'COMPLETED', availableFrom: at('05'), completedAt: at('05', 9), specificityLevel: 'vague' }];
  const settledPromise = (i: number, status: string) => ({ id: `k-${i}`, participantId: 'p-mercy', text: `I will call shop ${i}`, whenSaid: null, status, explicit: true, settledAt: at('05'), createdAt: at('03') });
  const commitments = over.thin ? [] : [
    ...Array.from({ length: 7 }, (_, i) => settledPromise(i, 'DONE')),
    settledPromise(8, 'NOT_DONE'),
    { id: 'k-quote', participantId: 'p-mercy', text: 'I will send Mama Mboga Mart the quote, with a photo', whenSaid: 'today', status: 'UNKNOWN', explicit: true, settledAt: null, createdAt: at('19', 7) },
    { id: 'k-westgate', participantId: 'p-mercy', text: 'I’ll book a follow-up with Westgate Deli', whenSaid: 'on Friday', status: 'UNKNOWN', explicit: true, settledAt: null, createdAt: at('14') },
    { id: 'k-greenfield', participantId: 'p-mercy', text: 'Visit Greenfield to take the order', whenSaid: null, status: 'DONE', explicit: true, settledAt: at('13'), createdAt: at('12') },
    { id: 'k-kevin', participantId: 'p-kevin', text: KEVINS_PROMISE, whenSaid: 'tomorrow', status: 'UNKNOWN', explicit: true, settledAt: null, createdAt: at('14') },
  ];
  const deps = over.thin ? [] : [
    { id: 'w-joseph', groundId: 'g-sales', fromParticipantId: 'p-joseph', onParticipantId: 'p-mercy', what: 'the Kiambu route notes', status: 'WAITING', triedSaid: null, dueSaid: null, createdAt: at('14') },
    { id: 'w-grace', groundId: 'g-sales', fromParticipantId: 'p-grace', onParticipantId: 'p-mercy', what: 'the name of who decides at Ruiru Academy', status: 'WAITING', triedSaid: null, dueSaid: 'by Monday', createdAt: at('16') },
    { id: 'b-1', groundId: 'g-sales', fromParticipantId: 'p-mercy', onParticipantId: 'p-grace', what: 'a price for 30 units', status: 'CLEARED', triedSaid: 'I asked the warehouse first', createdAt: at('02') },
    { id: 'b-2', groundId: 'g-sales', fromParticipantId: 'p-mercy', onParticipantId: 'p-grace', what: 'transport to Ruiru', status: 'CLEARED', triedSaid: null, createdAt: at('06') },
    { id: 'b-3', groundId: 'g-sales', fromParticipantId: 'p-mercy', onParticipantId: null, what: 'stock of the 20 L dispenser', status: 'CLEARED', triedSaid: null, createdAt: at('10') },
    { id: 'b-4', groundId: 'g-sales', fromParticipantId: 'p-mercy', onParticipantId: 'p-grace', what: 'a school price list', status: 'WAITING', triedSaid: null, createdAt: at('15') },
    { id: 'w-kevin', groundId: 'g-sales', fromParticipantId: 'p-joseph', onParticipantId: 'p-kevin', what: 'the Westlands stock count', status: 'WAITING', triedSaid: null, createdAt: at('15') },
  ];
  const mentions = over.thin ? [] : [
    { sourceParticipantId: 'p-joseph', aboutParticipantId: 'p-mercy', checkInId: 'c-joseph-3', kind: 'CREDIT' },
    { sourceParticipantId: 'p-joseph', aboutParticipantId: 'p-mercy', checkInId: 'c-joseph-4', kind: 'CREDIT' },
  ];
  const lines = [
    { kind: 'COACHING', text: TEAM_COACHING, audience: 'EVERYONE', aboutParticipantId: null, createdAt: at('03') },
    { kind: 'HELP_WITH', text: HELP_MERCY, audience: 'LEAD_ONLY', aboutParticipantId: 'p-mercy', createdAt: at('04') },
  ];
  const recordEntries = over.thin ? [] : [
    { participantId: 'p-mercy', checkInId: 'c-mercy-10', text: 'Greenfield signed the order today.', createdAt: at('14', 10) },
    { participantId: 'p-mercy', checkInId: 'c-mercy-9', text: 'Ruiru Academy moved to Qualified.', createdAt: at('13', 10) },
  ];
  const reads: string[] = [];
  const prisma: any = {
    organization: { findUnique: async () => ({ release1bTabsOn: over.switchOn !== false, personJudgementsOn: !over.judgementsOff }) },
    ground: { findFirst: async () => ground },
    groundCommitment: { findMany: async ({ where }: any) => { reads.push(`commitments:${where.participantId}`); return commitments.filter((c) => c.participantId === where.participantId); } },
    groundDependency: { findMany: async ({ where }: any) => { reads.push(`handoffs:${where.OR[0].fromParticipantId}`); const pid = where.OR[0].fromParticipantId; return deps.filter((d) => d.fromParticipantId === pid || d.onParticipantId === pid); } },
    workMention: { findMany: async ({ where }: any) => mentions.filter((m) => m.aboutParticipantId === where.aboutParticipantId) },
    checkIn: { findMany: async ({ where }: any) => { reads.push(`check-ins:${where.participantId}`); return checkIns.filter((c) => c.participantId === where.participantId); } },
    groundContextItem: { findMany: async ({ where }: any) => lines.filter((l) => where.OR.some((o: any) => o.kind === l.kind && (o.aboutParticipantId === undefined || o.aboutParticipantId === l.aboutParticipantId) && (!o.audience || o.audience === l.audience))) },
    groundObjective: { findMany: async ({ where }: any) => (where.ownerParticipantId === 'p-mercy' && !over.thin ? [{ name: 'Dispensers sold', target: 40, count: 4, ownerParticipantId: 'p-mercy', isADecisionAboutAPerson: false }] : []) },
    recordEntry: { findMany: async ({ where }: any) => { reads.push(`own-words:${where.participantId}`); return recordEntries.filter((e) => e.participantId === where.participantId && where.checkInId.in.includes(e.checkInId)); } },
  };
  const row = (id: string, name: string, stage: string, more: any = {}) => ({ id, kind: 'deal', name, stage, ownerParticipantId: 'p-mercy', owner: 'Mercy', due: null, fields: {}, from: 'said', ...more });
  const mercysDeals = over.thin ? [] : [
    row('w-mama', 'Mama Mboga Mart', 'Pitched', { nextStep: 'send the quote today', evidence: [{ readAs: 'A visit photo', countsAsProof: false }] }),
    row('w-westgate', 'Westgate Deli', 'Contacted', { notAnsweringSince: '2026-10-02', contactHistory: [{ on: '2026-10-16' }, { on: '2026-10-12' }, { on: '2026-10-08' }, { on: '2026-10-05' }, { on: '2026-10-01' }] }),
    row('w-ruiru', 'Ruiru Academy', 'Qualified', { nextStep: 'meet the bursar on Monday' }),
    row('w-tuskys', 'Tuskys Thika', 'Contacted'),
    row('w-naivas', 'Naivas Kiambu', 'Need established'),
    row('w-greenfield', 'Greenfield Hardware', 'Won', { group: 'won', value: 'KES 112,500', signedOrder: true, nextStep: 'delivery on 23 October' }),
    row('w-kilimani', 'Kilimani Hardware', 'Won', { group: 'won', paymentRecord: true }),
    row('w-juja', 'Juja Primary School', 'Won', { group: 'won', mark: 'proven' }),
    row('w-thika', 'Thika Hardware', 'Won', { group: 'won', mark: 'said' }),
    row('w-old', 'Ngong Road Deli', 'Contacted', { lost: { on: '2026-10-10', reason: 'They chose another supplier.' } }),
  ];
  const kevinsDeals = [{ id: 'w-kilele', kind: 'deal', name: 'Kilele Supplies', stage: 'Won', group: 'won', ownerParticipantId: 'p-kevin', owner: 'Kevin', due: null, fields: {}, from: 'said', paymentRecord: true }];
  const PATTERN_FOR_THE_LEAD = { participantId: 'p-mercy', heading: 'The same problem is raised again and never fixed', kind: 'attention', oneStep: 'One step they could take this week is to pick the problem raised most often and agree who fixes it, and by when.', yours: false };
  const boardReads: string[] = [];
  const board = {
    get: async (_g: string, userId: string) => {
      boardReads.push(userId);
      /* The board walls itself; a member is served their own rows and their own patterns, the lead every one. */
      if (userId === 'u-grace') return { workRecords: [{ section: 'Deal grid', rows: [...mercysDeals, ...kevinsDeals] }], patterns: over.thin ? [] : [PATTERN_FOR_THE_LEAD] };
      if (userId === 'u-mercy') return { workRecords: [{ section: 'Deal grid', rows: mercysDeals }], patterns: over.thin ? [] : [{ ...PATTERN_FOR_THE_LEAD, oneStep: null, yours: true }] };
      if (userId === 'u-kevin') return { workRecords: [{ section: 'Deal grid', rows: kevinsDeals }], patterns: [] };
      return { workRecords: [], patterns: [] };
    },
  };
  return { prisma, board, reads, boardReads };
}

const allText = (x: unknown) => JSON.stringify(x);

describe('My work, as each reader is served it', () => {
  it('with the switch off, every reader is served { on: false }, and nothing about anybody is read', async () => {
    for (const userId of ['u-grace', 'u-mercy', 'u-kevin']) {
      const c = theSalesCheckIn({ switchOn: false });
      await expect(readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId }, NOW)).resolves.toEqual({ on: false });
      expect(c.reads).toEqual([]);
      expect(c.boardReads).toEqual([]);
    }
  });

  it('Mercy reads her own page, in her own words for her, with the seven behaviours in the library’s order and words', async () => {
    const c = theSalesCheckIn();
    const page = (await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId: 'u-mercy' }, NOW)) as MyWorkServed;
    expect(page.view).toBe('self');
    expect(page.heading).toBe('Mercy’s work');
    expect(page.topLine).toBe('What you need to do, what you’ve done, and how to get better. Grace sees this page too.');
    expect(page.numbers).toEqual([
      { value: '4', label: 'sold, 3 with proof' },
      { value: '4 of 40', label: 'your target' },
      { value: '8 of 9', label: 'promises kept' },
    ]);
    expect(page.focus).toEqual({ line: 'Book the next step, with a day, before you finish each piece of work.', why: '3 of your 5 open deals have no next step with a day.' });
    expect(page.toDo.othersNeed).toEqual([
      { id: 'w-joseph', text: 'Joseph is waiting on you for the Kiambu route notes.', when: 'Since 14 October' },
      { id: 'w-grace', text: 'Grace is waiting on you for the name of who decides at Ruiru Academy.', when: 'By Monday' },
    ]);
    expect(page.toDo.own.map((t) => [t.text, t.when, t.done, t.late])).toEqual([
      ['Book a follow-up with Westgate Deli', 'It was due on 16 October.', false, true],
      ['Send Mama Mboga Mart the quote, with a photo', 'Today', false, false],
      ['Visit Greenfield to take the order', 'Done on 13 October.', true, false],
    ]);
    expect(page.achieved.items).toEqual([
      { text: 'Greenfield Hardware was won, for KES 112,500.', proof: 'A signed order' },
      { text: 'Kilimani Hardware was won.', proof: 'A payment record' },
      { text: 'Juja Primary School was won.', proof: 'Proof added' },
      { text: 'Thika Hardware was won.', proof: 'Said in a check-in' },
      { text: 'Joseph mentioned your help in 2 check-ins.', proof: 'Joseph’s check-ins' },
      { text: 'You kept 8 of 9 promises.', proof: 'Your check-ins' },
    ]);
    expect(page.performing.note).toBe('The same seven behaviours in every check-in, read from your last 10 check-ins.');
    expect(page.performing.behaviours.map((b) => b.name)).toEqual(THE_SEVEN_BEHAVIOURS.map((b) => b.name));
    const by = Object.fromEntries(page.performing.behaviours.map((b) => [b.key, b]));
    expect(by['keeping-promises']).toMatchObject({ verdict: 'Strength', happened: 'You kept 8 of 9 promises.', means: 'Doing what you said builds trust fast.', toImprove: null, basedOn: 'Your check-ins' });
    expect(by['planning-ahead']).toMatchObject({ verdict: 'Needs work', happened: '3 of your 5 open deals have no next step with a day.', means: 'Work without a booked next step stalls.', toImprove: 'Book the next step, with a day, before you finish each piece of work.', basedOn: 'Your deals today' });
    expect(by['handling-blockers']).toMatchObject({ verdict: 'Needs work', happened: 'You raised 4 blockers and said what you had tried first on 1 of them. 3 of them are cleared now.', toImprove: 'Try one thing before you raise a blocker, and say what you tried.', basedOn: '4 blockers raised between 2 and 15 October' });
    expect(by['working-on-the-right-things']).toMatchObject({ verdict: 'Needs work', happened: 'Westgate Deli has not answered since 2 October, and you are still following it up.', means: 'Time spent on the wrong work is taken from the right work.' });
    expect(by['backing-claims-with-proof']).toMatchObject({ verdict: 'Strength', happened: '3 of your 4 sales have proof.', means: 'Proof makes your work easy to trust.', basedOn: 'Your deals' });
    expect(by['helping-your-team']).toMatchObject({ verdict: 'Strength', happened: 'Joseph mentioned your help in 2 check-ins.', means: 'Helping teammates is what strong team players do.', basedOn: 'Joseph’s check-ins' });
    expect(by['check-in-quality']).toMatchObject({ verdict: 'Strength', happened: 'You did 10 of 10 check-ins on time. 9 of 10 were specific.', means: 'Specific, on-time check-ins make your work visible.', basedOn: '10 check-ins' });
    expect(page.performing.libraryNote).toBe('What each behaviour means and how to improve come from the behaviour and pattern library, so the words are the same in every check-in.');
    expect(page.coaching.better).toEqual([
      { text: TEAM_COACHING, from: 'Grace’s coaching for the team' },
      { text: 'The same problem is raised again and never fixed.', from: 'From your pattern' },
    ]);
    expect(page.coaching.keep).toEqual(['Doing what you say you’ll do.', 'Adding proof when you say something is done.', 'Helping your teammates.', 'Specific, on-time check-ins.']);
    expect(page.checkIns).toMatchObject({ heading: 'Your check-ins', due: 10, done: 10, onTime: 10, specific: 9 });
    expect(page.reports.heading).toBe('Your reports');
    expect(page.reports.items.slice(0, 2).map((r) => r.line)).toEqual(['“Greenfield signed the order today.”', '“Ruiru Academy moved to Qualified.”']);
    expect(page.items.heading).toBe('Your deals');
    expect(page.items.note).toBe('5 open');
    expect(page.items.rows.find((r) => r.name === 'Westgate Deli')).toMatchObject({ stage: 'Contacted', next: 'Nothing booked', proof: 'None yet' });
    expect(page.items.rows.find((r) => r.name === 'Mama Mboga Mart')).toMatchObject({ next: 'Send the quote today', proof: 'A visit photo', proven: false });
    expect(page.items.rows.find((r) => r.name === 'Greenfield Hardware')).toMatchObject({ stage: 'Won', proof: 'A signed order', proven: true });
    expect(page.items.rows.some((r) => r.name === 'Ngong Road Deli')).toBe(false);
  });

  it('Mercy never receives Grace’s note for her, Kevin’s work or the people list, and cannot open Kevin’s page', async () => {
    expect(THE_LEADS_NOTE_SHOWS_ON_THEIR_OWN_MY_WORK).toBe(false);
    const c = theSalesCheckIn();
    const page = await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId: 'u-mercy' }, NOW);
    const text = allText(page);
    expect(text).not.toContain(HELP_MERCY);
    expect(text).not.toContain('Kilele');
    expect(text).not.toContain('Westlands');
    expect(text).not.toContain('One step they could take');
    expect((page as any).people).toBeUndefined();

    const k = theSalesCheckIn();
    await expect(readMyWork(k.prisma, k.board, { groundId: 'g-sales', userId: 'u-mercy', personId: 'p-kevin' }, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    /* Refused before anything about Kevin is read. */
    expect(k.reads.filter((r) => r.endsWith('p-kevin'))).toEqual([]);
    expect(k.boardReads).toEqual([]);
  });

  it('Grace reads Mercy’s page with Mercy’s name, her own note for Mercy and the pattern’s step, and never Mercy’s own reports', async () => {
    const c = theSalesCheckIn();
    const page = (await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId: 'u-grace', personId: 'p-mercy' }, NOW)) as MyWorkServed;
    expect(page.view).toBe('lead');
    expect(page.people).toEqual([
      { participantId: 'p-mercy', name: 'Mercy Wairimu' },
      { participantId: 'p-kevin', name: 'Kevin Omondi' },
      { participantId: 'p-joseph', name: 'Joseph Kariuki' },
    ]);
    expect(page.heading).toBe('Mercy’s work');
    expect(page.topLine).toBe('What Mercy needs to do, what Mercy has done, and how Mercy can get better. Mercy sees this page too.');
    expect(page.numbers[1]).toEqual({ value: '4 of 40', label: 'Mercy’s target' });
    expect(page.focus).toEqual({ line: 'Book the next step, with a day, before you finish each piece of work.', why: '3 of Mercy’s 5 open deals have no next step with a day.' });
    expect(page.toDo.othersNeed[0].text).toBe('Joseph is waiting on Mercy for the Kiambu route notes.');
    expect(page.toDo.othersNeed[1].text).toBe('You are waiting on Mercy for the name of who decides at Ruiru Academy.');
    const by = Object.fromEntries(page.performing.behaviours.map((b) => [b.key, b]));
    expect(by['keeping-promises'].happened).toBe('Mercy kept 8 of 9 promises.');
    expect(by['check-in-quality'].happened).toBe('Mercy did 10 of 10 check-ins on time. 9 of 10 were specific.');
    expect(by['helping-your-team'].happened).toBe('Joseph mentioned Mercy’s help in 2 check-ins.');
    expect(page.coaching.better).toEqual([
      { text: TEAM_COACHING, from: 'Your coaching for the team' },
      { text: HELP_MERCY, from: 'Your note for Mercy' },
      { text: 'One step they could take this week is to pick the problem raised most often and agree who fixes it, and by when.', from: 'From Mercy’s pattern' },
    ]);
    /* A person's own report is private, always: none of its words, and Mercy's own words are not read for the lead. */
    expect(page.reports.items).toEqual([]);
    expect(page.reports.private).toBe('Mercy’s own reports are Mercy’s alone, so they are not shown here.');
    expect(allText(page)).not.toContain('Greenfield signed the order today.');
    expect(c.reads).not.toContain('own-words:p-mercy');
    /* Only Mercy's work, never Kevin's, on Mercy's page. */
    expect(allText(page)).not.toContain('Kilele');
  });

  it('nothing on either reader’s page is a label on a person', async () => {
    for (const [userId, personId] of [['u-mercy', null], ['u-grace', 'p-mercy']] as const) {
      const c = theSalesCheckIn();
      const text = allText(await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId, personId }, NOW)).toLowerCase();
      for (const label of ['pip', 'at risk', 'exit', 'underperform', 'low performer', 'score']) expect(text).not.toContain(label);
    }
  });

  it('an admin who does not run it, and somebody outside it, are refused', async () => {
    const c = theSalesCheckIn();
    await expect(readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId: 'u-admin' }, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    expect(c.reads).toEqual([]);
  });

  it('a thin record reads "Not enough yet", never a guess, and the focus says so', async () => {
    const c = theSalesCheckIn({ thin: true });
    const page = (await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId: 'u-mercy' }, NOW)) as MyWorkServed;
    expect(page.performing.behaviours.every((b) => b.verdict === 'Not enough yet' && b.happened === 'Not enough check-ins show this yet.' && b.means === null)).toBe(true);
    expect(page.focus).toBeNull();
    expect(page.focusEmpty).toBe('Nothing needs work yet. Your focus will show here once your check-ins show something to work on.');
    expect(page.coaching.keep).toEqual([]);
    expect(page.coaching.better).toEqual([{ text: TEAM_COACHING, from: 'Grace’s coaching for the team' }]);
  });

  it('every behaviour line is the library’s, word for word, whatever the scenario', () => {
    const base = { reader: 'self' as const, person: { participantId: 'p', name: 'David Mwangi', firstName: 'David' }, leadFirst: 'Aisha', items: [], commitments: [], waitsOnThem: [], raised: [], credits: [], checkIns: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null, target: null, now: NOW, timeZone: 'Africa/Nairobi' };
    for (const kindOfWork of ['sales team', 'engineering release', 'a law firm matter', null]) {
      const page = myWorkFrom({ ...base, kindOfWork }, 'Any');
      expect(page.performing.behaviours.map((b) => b.name)).toEqual(['Keeping promises', 'Planning ahead', 'Handling blockers', 'Working on the right things', 'Backing claims with proof', 'Helping your team', 'Check-in quality']);
    }
    const eng = myWorkFrom({ ...base, kindOfWork: 'engineering release' }, 'Engineering release');
    expect(eng.items.heading).toBe('Your releases');
  });
});

/**
 * JUDGEMENTS OF A PERSON OFF FOR THE ORGANISATION (production truth, 19 October 2026; organisation/person-judgements.ts). Grace and Mercy
 * are served what happened (the numbers, to do, what was achieved, the items) and none of what judges Mercy: no behaviours, no focus,
 * no coaching from her pattern, no note about her, no strengths, and no on-time or specific counts.
 */
describe('My work, with judgements of a person off for Drop Access', () => {
  for (const [who, userId] of [['Mercy, her own page', 'u-mercy'], ['Grace, on Mercy’s page', 'u-grace']] as const) {
    it(`${who}: what happened is served, and nothing that judges Mercy`, async () => {
      const c = theSalesCheckIn({ judgementsOff: true });
      const page = (await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId, personId: userId === 'u-grace' ? 'p-mercy' : null }, NOW)) as MyWorkServed;
      expect(page.judgements).toBe(false);
      expect(page.performing.behaviours).toEqual([]);
      expect(page.performing.note).toBe('This part is turned off for your organisation.');
      expect(page.focus).toBeNull();
      expect(page.coaching.keep).toEqual([]);
      expect(page.coaching.better.map((b) => b.text)).toEqual([TEAM_COACHING]);
      expect(page.checkIns.onTime).toBe(0);
      expect(page.checkIns.specific).toBe(0);
      expect(page.numbers.map((n) => n.label)).toContain('promises kept');
      const text = allText(page);
      expect(text).not.toContain(HELP_MERCY);
      expect(text).not.toMatch(/Strength|Needs work|same problem is raised again|One step they could take/);
    });
  }
  it('with it on, as before', async () => {
    const c = theSalesCheckIn();
    const page = (await readMyWork(c.prisma, c.board, { groundId: 'g-sales', userId: 'u-mercy' }, NOW)) as MyWorkServed;
    expect(page.judgements).toBeUndefined();
    expect(page.performing.behaviours).toHaveLength(7);
  });
});
