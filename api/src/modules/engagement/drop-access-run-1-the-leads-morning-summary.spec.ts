import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { thePromisesSaidDone, whoItWasFor } from '../conversation/a-promise-said-done-is-kept';
import { dedupeDependencies } from '../board/reads';

/**
 * DROP ACCESS RUN 1, ITEMS 13, 14 AND 15: GRACE'S MORNING SUMMARY (gw_sweep_drop10, 18 October 2026), from the run's own rows.
 *
 * What Grace read on WhatsApp on Monday 19 October (lead_daily_summary, {{2}}):
 *   "These need you. Joseph is waiting on you for a decision on the KES 4,500 price for Juja Hardware since Wednesday 14 October.
 *    Joseph is waiting on you for approval on the KES 4,500 price for 5 units since Thursday 15 October. You said “I need to decide on
 *    Joseph's pricing request for Juja Hardware”. That was due by Friday 16 October and is three days late. These are overdue on your
 *    team. Joseph said “I'll bring them on Thursday”. That was due by Thursday 15 October and is four days late."
 * Three wrongs: the samples were brought on 15 October (Mercy: "Joseph finally brought the samples today."), the one KES 4,500 decision
 * was told three times, and "These are risks." never appeared in ten days.
 */
const G = 'ffa3b4b1-5ce0-4651-b35b-bf5ecc42d5be';
const ORG = '83e249ca-67c6-47eb-a0d9-b0c531ec8c3c';
const P = { grace: '5a27e2d6-56ce-40a7-9e39-e304ad57d824', joseph: '9f648012-3951-49af-92a5-9b7968b8a466', mercy: 'fec56b17-a9a5-4ade-b07b-cdb05eac00e6', kevin: '49e0307a-d6ed-43dc-bb0a-0f63b50008bc' };
const U = { grace: '121638a1-2755-406a-aae9-29325d10bb55', joseph: '003d6475-2ad8-493e-8e68-50364a737d20', mercy: '4837f59a-1608-4070-bd5b-20d5f0f9365d', kevin: 'f70c98d1-7d74-4313-a443-e1aa2b8f1d91' };
const NAMES: Record<string, [string, string]> = { [P.grace]: ['Grace', 'Achieng'], [P.joseph]: ['Joseph', 'Kariuki'], [P.mercy]: ['Mercy', 'Wairimu'], [P.kevin]: ['Kevin', 'Omondi'] };
const person = (id: string, userId: string) => ({ id, groundId: G, userId, email: `${NAMES[id][0].toLowerCase()}@dropaccess.test`, nameGiven: null, managingOnly: false, leftAt: null, partyType: id === P.grace ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: NAMES[id][0], lastName: NAMES[id][1], awaitingOrgApproval: false }, checkIns: [] });
const PEOPLE = [person(P.grace, U.grace), person(P.joseph, U.joseph), person(P.mercy, U.mercy), person(P.kevin, U.kevin)];
const PERSON_OF = (id: string) => PEOPLE.find((p) => p.id === id);

/* The run's waits, as gw_sweep_drop10 holds them. */
const WAITS = [
  { id: '8c87eebb-30bf-4f15-b2e2-3cd77d2dc321', what: 'the samples', status: 'WAITING', fromParticipantId: P.mercy, onParticipantId: P.joseph, onLabel: null, dueOn: new Date('2026-10-15'), clearedAt: null, createdAt: new Date('2026-10-12T11:05:36.589Z'), triedSaid: 'I called him yesterday', namedTheThing: true },
  { id: '86186c63-7d38-4d39-864a-c1ef9234dfe4', what: 'a decision on the KES 4,500 price for Juja Hardware', status: 'WAITING', fromParticipantId: P.joseph, onParticipantId: P.grace, onLabel: null, dueOn: null, clearedAt: null, createdAt: new Date('2026-10-14T11:08:07.442Z'), triedSaid: null, namedTheThing: true },
  { id: '8ad5d462-3f40-437f-a7d1-33a93f1558d5', what: 'approval on the KES 4,500 price for 5 units', status: 'WAITING', fromParticipantId: P.joseph, onParticipantId: P.grace, onLabel: null, dueOn: null, clearedAt: null, createdAt: new Date('2026-10-15T11:06:34.117Z'), triedSaid: "I've asked her", namedTheThing: true },
  { id: 'f40f472f-31d8-4001-8440-47f593d2ca58', what: 'an answer about the KES 4,500 price', status: 'WAITING', fromParticipantId: P.joseph, onParticipantId: P.grace, onLabel: null, dueOn: null, clearedAt: null, createdAt: new Date('2026-10-22T11:08:33.862Z'), triedSaid: 'I asked her already', namedTheThing: true },
  { id: 'b1ca35c2-82dd-4bd4-87c0-105dc7c74b23', what: "confirmation of Rose's KES 5,000 deposit for Mama Mboga Mart", status: 'WAITING', fromParticipantId: P.mercy, onParticipantId: null, onLabel: 'Accounts', dueOn: new Date('2026-10-23'), clearedAt: null, createdAt: new Date('2026-10-23T11:05:22.171Z'), triedSaid: null, namedTheThing: true },
];
/* Joseph's promise of 14 October ("No, I forgot them. I'll bring them on Thursday."), and Grace's own of 16 October, owed to Joseph. */
const JOSEPHS_PROMISE = { id: 'joseph-bring-them', groundId: G, participantId: P.joseph, owedToParticipantId: null, text: "I'll bring them on Thursday", kind: 'TODO', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: new Date('2026-10-15T00:00:00Z'), createdAt: new Date('2026-10-14T11:08:07.000Z') };
const GRACES_PROMISE = { id: '84ac0a7a-8a7b-45c2-9e3e-c23355af1726', groundId: G, participantId: P.grace, owedToParticipantId: P.joseph, text: "I need to decide on Joseph's pricing request for Juja Hardware.", kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: new Date('2026-10-16T00:00:00Z'), createdAt: new Date('2026-10-16T11:00:12.148Z') };
/* What was said on record, word for word (record_entries). */
const LINES = [
  { id: 'l-1', participantId: P.mercy, type: 'WORRY', text: "I haven't received [the samples] yet. Joseph said he'd have them ready by tomorrow, Thursday.", createdAt: new Date('2026-10-14T11:04:55.197Z') },
  { id: 'l-2', participantId: P.mercy, type: 'PROGRESS', text: 'Joseph finally brought the samples today.', createdAt: new Date('2026-10-15T11:04:54.082Z') },
];

/* Release 1's sales board is on for Drop Access unless a case says otherwise (release-one-sales-board). */
function theRecord(now: Date, o: { lines?: any[]; promises?: any[]; waits?: any[]; releaseOne?: boolean } = {}) {
  const lines = o.lines ?? LINES;
  const promises = o.promises ?? [JOSEPHS_PROMISE, GRACES_PROMISE];
  const waits = (o.waits ?? WAITS).filter((w) => w.createdAt <= now);
  const withPeople = (w: any) => ({ ...w, groundId: G, blockerKind: null, fromParticipant: PERSON_OF(w.fromParticipantId), onParticipant: w.onParticipantId ? PERSON_OF(w.onParticipantId) : null });
  const prisma: any = new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => (!where?.userId || p.userId === where.userId) && (!where?.partyType?.not || p.partyType !== where.partyType.not))) },
    personObjective: { findMany: jest.fn(async ({ where }: any) => promises.filter((p) => p.status === 'OPEN' && (!where?.dueDate?.lt || p.dueDate < where.dueDate.lt) && p.createdAt <= now).map((p) => ({ ...p, participant: { ground: { id: G, label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', overWhatsApp: null }, ...PERSON_OF(p.participantId) } }))) },
    groundDependency: { findMany: jest.fn(async ({ where }: any) => waits.filter((w) => !where?.status?.in || where.status.in.includes(w.status)).map(withPeople)) },
    recordEntry: { findMany: jest.fn(async () => lines.filter((l) => l.createdAt <= now)) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: o.releaseOne !== false })) },
  /* Every other table reads empty. */
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, method: string) => jest.fn(async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null)) }) });
  return prisma;
}
const LEAD = { userId: U.grace, organizationId: ORG, grounds: [{ id: G, label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', overWhatsApp: null, timelineDays: 15, cadence: 'DAILY' }] };
const said = (o: WhatIsOutstanding) => theTemplateParagraph('Grace', withPlacesWhereTheyTellApart(theseForAPhone(o)), 'http://localhost:5195/today').params[1];

describe('item 13: a promise said done is never late', () => {
  it('Mercy said on 15 October "Joseph finally brought the samples today.": Joseph\'s "I\'ll bring them on Thursday" is kept that day', () => {
    const namesOf = (id: string) => NAMES[id] ?? [];
    expect(whoItWasFor(JOSEPHS_PROMISE, WAITS as any, namesOf, Object.values(P))).toEqual([P.mercy]);
    const kept = thePromisesSaidDone([JOSEPHS_PROMISE], LINES, WAITS as any, namesOf, Object.values(P));
    expect(kept).toEqual([{ id: 'joseph-bring-them', keptAt: new Date('2026-10-15T11:04:54.082Z'), because: 'l-2' }]);
  });
  it('her worry the day before ("I haven\'t received [the samples] yet") keeps nothing', () => {
    expect(thePromisesSaidDone([JOSEPHS_PROMISE], [LINES[0]], WAITS as any, (id) => NAMES[id] ?? [], Object.values(P))).toEqual([]);
  });
  it('and the wait on him for the samples, cleared, keeps it too', () => {
    const cleared = WAITS.map((w) => (w.id === WAITS[0].id ? { ...w, status: 'CLEARED', clearedAt: new Date('2026-10-15T11:04:54.082Z') } : w));
    expect(thePromisesSaidDone([JOSEPHS_PROMISE], [], cleared as any, (id) => NAMES[id] ?? [], Object.values(P)).map((k) => k.id)).toEqual(['joseph-bring-them']);
  });
  it('Grace\'s summary on 19 October: nothing is overdue on her team', async () => {
    const o = await whatIsOutstandingFor(theRecord(new Date('2026-10-19T08:00:00Z')), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, new Date('2026-10-19T08:00:00Z'));
    expect(o.overdueOnYourTeam).toEqual([]);
    expect(said(o)).not.toMatch(/bring them on Thursday/);
  });
  it('and for every organisation: with Release 1\'s switch off, a promise the record says is done is still never told as late', async () => {
    const now = new Date('2026-10-19T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now, { releaseOne: false }), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.overdueOnYourTeam).toEqual([]);
    expect(said(o)).not.toMatch(/bring them on Thursday/);
  });
});

describe('item 14: one item for one decision, from the record\'s ids', () => {
  it('the three KES 4,500 waits are one wait, carrying all three ids and the fullest words of what Joseph tried', () => {
    const one = dedupeDependencies(WAITS.filter((w) => w.onParticipantId === P.grace) as any);
    expect(one).toHaveLength(1);
    expect((one[0] as any).ids).toEqual(['86186c63-7d38-4d39-864a-c1ef9234dfe4', '8ad5d462-3f40-437f-a7d1-33a93f1558d5', 'f40f472f-31d8-4001-8440-47f593d2ca58']);
    expect((one[0] as any).triedSaid).toBe('I asked her already');
  });
  it('a different thing Joseph waits on Grace for is still its own wait', () => {
    const two = dedupeDependencies([WAITS[1], { ...WAITS[2], id: 'other', what: 'the delivery van for Kasarani Gym' }] as any);
    expect(two).toHaveLength(2);
  });
  it('Grace reads the decision once, with the day she gave herself in the same line', async () => {
    const now = new Date('2026-10-19T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.needsYou).toHaveLength(1);
    expect(o.needsYou[0].about).toEqual({ kind: 'decision', ids: ['86186c63-7d38-4d39-864a-c1ef9234dfe4', '8ad5d462-3f40-437f-a7d1-33a93f1558d5', '84ac0a7a-8a7b-45c2-9e3e-c23355af1726'] });
    /* Changed 22 November 2026 (release test, bug 34, commit 2b308fa48): this summary speaks with the morning's approved labels (Hafsah, 21 October: "Needs you today:", "Closing:", "Your team:"), the same as the direct morning, so the lead reads one shape every morning. A risk is said under "Your team:" with what is overdue, never with a label of its own. */
    expect(said(o)).toBe('Needs you today: Joseph is waiting on you for a decision on the KES 4,500 price for Juja Hardware since Wednesday 14 October. You said you would do it by Friday 16 October, so it is three days late.');
  });
});

describe('item 15: the risks part says what the record says is at risk', () => {
  it('on 26 October, Mercy\'s wait on Accounts past its day (23 October) is a risk, and it is in the message beside what needs Grace', async () => {
    const now = new Date('2026-10-26T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.risks.map((r) => r.text.replace('{in}', ''))).toEqual(["Mercy is waiting on Accounts for confirmation of Rose's KES 5,000 deposit for Mama Mboga Mart, which was due on Friday 23 October and is three days late."]);
    expect(said(o)).toBe("Needs you today: Joseph is waiting on you for a decision on the KES 4,500 price for Juja Hardware since Wednesday 14 October. You said you would do it by Friday 16 October, so it is ten days late. Your team: Mercy is waiting on Accounts for confirmation of Rose's KES 5,000 deposit for Mama Mboga Mart, which was due on Friday 23 October and is three days late.");
  });
  it('when the first part is long, every part still gets its first line before any part gets a second', () => {
    const long = (n: number) => ({ text: `Joseph is waiting on you for thing number ${n}, which has a long description so that it takes up a good part of the room in the message ${'and more words '.repeat(4)}.` });
    const o: WhatIsOutstanding = { needsYou: [long(1), long(2), long(3)], overdueOnYourTeam: [{ text: 'Kevin said “I will send the quote”. That was due by Friday 16 October and is one day late.' }], risks: [{ text: 'Mama Pima has not answered Joseph since Monday 19 October.' }], releaseOne: true };
    const p = said(o);
    expect(p).toContain('Your team: Kevin said');
    expect(p).toContain('one day late. Mama Pima has not answered Joseph since Monday 19 October.');
    expect(p.split('Your team:')).toHaveLength(2);
    expect(p).toMatch(/There is more, and the link shows all of it\.$/);
  });
  it('nothing at risk is nothing said: no "Your team:" on a day the record holds nothing overdue and no risk', async () => {
    const now = new Date('2026-10-19T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.risks).toEqual([]);
    expect(said(o)).not.toContain('Your team:');
  });
});

describe('with Release 1\'s switch off for the organisation, the summary is put together as before', () => {
  it('Grace\'s promise and the decision it answers stay two lines, and a wait on somebody outside the check-in is not a risk', async () => {
    const now = new Date('2026-10-26T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now, { releaseOne: false }), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.releaseOne).toBeUndefined();
    expect(o.risks).toEqual([]);
    expect(o.needsYou.map((t) => t.about?.kind)).toEqual(['promise']);
  });
  it('the lines are taken part by part, as before', () => {
    const long = (n: number) => ({ text: `Joseph is waiting on you for thing number ${n}, which has a long description so that it takes up a good part of the room in the message ${'and more words '.repeat(4)}.` });
    const o: WhatIsOutstanding = { needsYou: [long(1), long(2), long(3)], overdueOnYourTeam: [{ text: 'Kevin said “I will send the quote”. That was due by Friday 16 October and is one day late.' }], risks: [{ text: 'Mama Pima has not answered Joseph since Monday 19 October.' }] };
    /* The risk is not reached part by part. Its old label is gone (bug 34), so the test looks for the risk itself. */
    expect(said(o)).not.toContain('Mama Pima has not answered');
  });
});
