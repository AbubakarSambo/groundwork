import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { thePromisesSaidDone, theAnswersIn } from '../conversation/a-promise-said-done-is-kept';

/**
 * A PROMISE ANSWERED "YES, I DID", OR A FOLLOW-UP WHOSE ANSWER WAS TOLD, IS NEVER LISTED AS OVERDUE (messages test, third run, items 2,
 * 4 and 8). From the runs' own check-ins, as Wanjiru and Grace read their morning summaries.
 *
 * Muchemi & Co. On Tuesday 13 October Brian said "I will let Njeri know today." On Wednesday Groundwork asked "Last time you said you
 * needed to tell Njeri in accounts about the Kasarani Foods filing. Did you let her know?" and he answered "Yes, I did." Wanjiru's
 * summaries on Thursday and Friday said "That was due by Tuesday 13 October and is two days late."
 *
 * Drop Access. On Monday 12 October Joseph said "I'll follow up with her tomorrow." about Mama Pima. On Wednesday he said "Mama Pima isn't
 * ready to buy yet." Grace's summaries on Thursday and Friday called it late, and never said who "her" was.
 */
const at = (s: string) => new Date(s);
const turn = (role: 'AI' | 'PERSON', content: string, createdAt: string) => ({ role, content, createdAt: at(createdAt) });

function aCheckIn(o: { ground: string; label: string; people: Record<string, [string, string]>; lead: string; promises: any[]; checkIns: any[]; lines?: any[] }) {
  const person = (id: string) => ({ id, groundId: o.ground, userId: `u-${id}`, email: `${o.people[id][0].toLowerCase()}@x.test`, nameGiven: null, managingOnly: false, leftAt: null, partyType: id === o.lead ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: o.people[id][0], lastName: o.people[id][1], awaitingOrgApproval: false }, checkIns: [] });
  const PEOPLE = Object.keys(o.people).map(person);
  const theRecord = (now: Date) => new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => (!where?.userId || p.userId === where.userId) && (!where?.partyType?.not || p.partyType !== where.partyType.not))) },
    personObjective: { findMany: jest.fn(async ({ where }: any) => o.promises.filter((p) => (!where?.dueDate?.lt || p.dueDate < where.dueDate.lt)).map((p) => ({ ...p, participant: { ground: { id: o.ground, label: o.label, scenario: 'PULSE_CHECK', overWhatsApp: true }, ...PEOPLE.find((x) => x.id === p.participantId) } }))) },
    recordEntry: { findMany: jest.fn(async () => (o.lines ?? []).filter((l) => l.createdAt <= now)) },
    checkIn: { findMany: jest.fn(async () => o.checkIns.map((c) => ({ ...c, turns: c.turns.filter((t: any) => t.createdAt <= now) }))) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: false })) },
  } as any, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, method: string) => jest.fn(async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null)) }) });
  const lead = { userId: `u-${o.lead}`, organizationId: 'org', grounds: [{ id: o.ground, label: o.label, scenario: 'PULSE_CHECK', overWhatsApp: true, timelineDays: 18, cadence: 'DAILY' }] };
  const said = async (now: Date) => {
    const out: WhatIsOutstanding = await whatIsOutstandingFor(theRecord(now) as any, lead, { boards: {} as any, release: new Date('2026-01-01') }, now);
    return theTemplateParagraph(o.people[o.lead][0], withPlacesWhereTheyTellApart(theseForAPhone(out)), 'http://localhost/today').params[1] ?? '';
  };
  return { said };
}

describe('Brian answered "Yes, I did." to "Did you let her know?"', () => {
  const G = 'g-litigation';
  const people: Record<string, [string, string]> = { wanjiru: ['Wanjiru', 'Muchemi'], brian: ['Brian', 'Otieno'], njeri: ['Njeri', 'Wambui'] };
  const promise = { id: 'brian-let-njeri-know', groundId: G, participantId: 'brian', owedToParticipantId: null, text: 'I will let Njeri know today.', kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: at('2026-10-13T00:00:00Z'), createdAt: at('2026-10-13T11:02:23.449Z') };
  const checkIns = [
    { id: 'brian-2', participantId: 'brian', turns: [
      turn('AI', 'You have no filings due today. Is there anything you are waiting on from anyone else right now to move your work forward?', '2026-10-13T11:01:28.275Z'),
      turn('PERSON', 'Yes, I need to tell Njeri in accounts about the Kasarani Foods filing. FN-005 is due now.', '2026-10-13T11:01:29.384Z'),
      turn('AI', 'I have one more question before we finish. What will you do about this, and by when?', '2026-10-13T11:01:48.346Z'),
      turn('PERSON', 'I will let Njeri know today.', '2026-10-13T11:01:48.975Z'),
    ] },
    { id: 'brian-3', participantId: 'brian', turns: [
      turn('PERSON', 'START', '2026-10-14T11:00:48.855Z'),
      turn('AI', 'Litigation team daily, session 3. You can write "ask" at any time to talk to Ask Muchemi & Co (test), "back" to come back to your check-in, and "switch" to choose another check-in.\n\nLast time you said you needed to tell Njeri in accounts about the Kasarani Foods filing. Did you let her know?', '2026-10-14T11:00:48.856Z'),
      turn('PERSON', 'Yes, I did.', '2026-10-14T11:00:49.430Z'),
    ] },
  ];
  const c = aCheckIn({ ground: G, label: 'Litigation team daily', people, lead: 'wanjiru', promises: [promise], checkIns });

  it("Wanjiru's summary on Thursday 15 October does not call it two days late", async () => {
    expect(await c.said(at('2026-10-15T08:00:00Z'))).not.toContain('Brian said');
  });
  it('and on Wednesday morning, before he answered, it was one day late, as was true', async () => {
    expect(await c.said(at('2026-10-14T08:00:00Z'))).toContain('These are overdue on your team. Brian said “I will let Njeri know today”. That was due by Tuesday 13 October and is one day late.');
  });
  it('a "No, not yet." keeps nothing, and nor does a yes to a question about something else', () => {
    const answers = (said: string, asked = 'Last time you said you needed to tell Njeri in accounts about the Kasarani Foods filing. Did you let her know?') =>
      theAnswersIn([{ id: 'brian-3', participantId: 'brian', turns: [turn('AI', asked, '2026-10-14T11:00:48.856Z'), turn('PERSON', said, '2026-10-14T11:00:49.430Z')] }]);
    const kept = (a: any[]) => thePromisesSaidDone([promise], [], [], (id) => people[id] ?? [], Object.keys(people), a).map((k) => k.id);
    expect(kept(answers('Yes, I did.'))).toEqual(['brian-let-njeri-know']);
    expect(kept(answers('No, not yet. I will do it today.'))).toEqual([]);
    expect(kept(answers('Yes, but not yet.'))).toEqual([]);
    expect(kept(answers('Yes, I did.', 'Did you file the reply in Kasarani Foods?'))).toEqual([]);
  });
});

describe('Joseph followed up with Mama Pima, and said what she answered', () => {
  const G = 'g-sales';
  const people: Record<string, [string, string]> = { grace: ['Grace', 'Achieng'], joseph: ['Joseph', 'Kariuki'], mercy: ['Mercy', 'Wairimu'] };
  const promise = { id: 'joseph-follow-up-her', groundId: G, participantId: 'joseph', owedToParticipantId: null, text: "I'll follow up with her tomorrow.", kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: at('2026-10-13T00:00:00Z'), createdAt: at('2026-10-12T11:08:57.133Z') };
  const monday = { id: 'joseph-1', participantId: 'joseph', turns: [
    turn('AI', 'I have one more question before we finish. How is it actually going?', '2026-10-12T11:08:12.216Z'),
    turn('PERSON', 'Mama Pima is still deciding on the 10 units. She wants a KES 12,000 discount.', '2026-10-12T11:08:13.191Z'),
    turn('AI', 'It sounds like you are still in conversation with Mama Pima. What will you do about this, and by when?', '2026-10-12T11:08:25.963Z'),
    turn('PERSON', "I'll try to persuade her on the price. I'll follow up with her tomorrow.", '2026-10-12T11:08:26.788Z'),
  ] };
  const wednesday = { id: 'joseph-2', participantId: 'joseph', turns: [
    turn('AI', 'Last time you said the Juja Hardware lead was on hold until you could speak to the owner. What did you try this week that did not work?', '2026-10-14T11:08:26.520Z'),
    turn('PERSON', "I spoke to Mr. Kariuki at Juja Hardware, but he wants a price I need to confirm. Mama Pima isn't ready to buy yet.", '2026-10-14T11:08:27.229Z'),
  ] };

  it("Grace's summary on Thursday 15 October does not call it two days late", async () => {
    const c = aCheckIn({ ground: G, label: 'Sales team, Q4', people, lead: 'grace', promises: [promise], checkIns: [monday, wednesday] });
    expect(await c.said(at('2026-10-15T08:00:00Z'))).not.toContain('Joseph said');
  });
  it('and on Tuesday, when it was late, the summary says who "her" is', async () => {
    const c = aCheckIn({ ground: G, label: 'Sales team, Q4', people, lead: 'grace', promises: [promise], checkIns: [monday, wednesday] });
    expect(await c.said(at('2026-10-14T08:00:00Z'))).toContain('These are overdue on your team. Joseph said “I\'ll follow up with her tomorrow” about Mama Pima. That was due by Tuesday 13 October and is one day late.');
  });
  it('"Mama Pima has not replied" keeps nothing', async () => {
    const noReply = { ...wednesday, turns: [wednesday.turns[0], turn('PERSON', 'I called, but Mama Pima has not replied yet.', '2026-10-14T11:08:27.229Z')] };
    const c = aCheckIn({ ground: G, label: 'Sales team, Q4', people, lead: 'grace', promises: [promise], checkIns: [monday, noReply] });
    expect(await c.said(at('2026-10-15T08:00:00Z'))).toContain('Joseph said “I\'ll follow up with her tomorrow” about Mama Pima. That was due by Tuesday 13 October and is two days late.');
  });
});

describe("Mercy's follow-up with Joseph, said done with what he answered", () => {
  const people: Record<string, [string, string]> = { grace: ['Grace', 'Achieng'], mercy: ['Mercy', 'Wairimu'], joseph: ['Joseph', 'Kariuki'] };
  const promise = { id: 'mercy-follow-up-joseph-again', participantId: 'mercy', owedToParticipantId: null, text: 'Follow up with Joseph again', createdAt: at('2026-10-12T11:06:49.574Z') };
  const said = (text: string) => [{ id: 'l', participantId: 'mercy', type: 'WORRY', text, createdAt: at('2026-10-14T06:33:14.742Z') }];
  const kept = (lines: any[]) => thePromisesSaidDone([promise], lines, [], (id) => people[id] ?? [], Object.keys(people)).map((k) => k.id);
  it('"I called Joseph yesterday about the samples, and he said he\'ll have them ready by Thursday." keeps it', () => {
    expect(kept(said("I actually have 25 units for Greenfield, bringing the target to 120, not 40. I called Joseph yesterday about the samples, and he said he'll have them ready by Thursday."))).toEqual(['mercy-follow-up-joseph-again']);
  });
  it('"I called Joseph about the samples but he hasn\'t answered." still keeps nothing', () => {
    expect(kept(said("I called Joseph about the samples but he hasn't answered."))).toEqual([]);
  });
});
