import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';

/**
 * A FILED REPLY ENDS THE PROMISE TO SEND ITS DRAFT FOR REVIEW (Muchemi & Co., messages test, fourth run). Brian said on Monday 12 October
 * "The reply is drafted." and "The draft will be with her tomorrow for review." On Tuesday he said "The reply in Kasarani Foods v. Tumaini
 * Traders was filed today." Wanjiru's summaries on Wednesday, Thursday and Friday said "In “Litigation team daily”, Brian committed to “The
 * draft will be with her tomorrow for review” about Wanjiru's. That was due by Tuesday 13 October and is one day late."
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


describe("Brian's draft for Wanjiru's review", () => {
  const G = 'g-litigation';
  const people: Record<string, [string, string]> = { wanjiru: ['Wanjiru', 'Muchemi'], brian: ['Brian', 'Otieno'] };
  const promise = { id: 'brian-draft-for-review', groundId: G, participantId: 'brian', owedToParticipantId: null, text: 'The draft will be with her tomorrow for review.', kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: at('2026-10-13T00:00:00Z'), createdAt: at('2026-10-12T11:03:52.043Z') };
  const lines = [
    { id: 'l-drafted', participantId: 'brian', type: 'PROGRESS', text: 'The reply is drafted.', createdAt: at('2026-10-12T11:03:43.210Z') },
    { id: 'l-filed', participantId: 'brian', type: 'PROGRESS', text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', createdAt: at('2026-10-13T11:03:01.728Z') },
  ];
  it("is not called late in Wanjiru's summary on Wednesday 14 October", async () => {
    const c = aCheckIn({ ground: G, label: 'Litigation team daily', people, lead: 'wanjiru', promises: [promise], checkIns: [], lines });
    expect(await c.said(at('2026-10-14T08:00:00Z'))).not.toContain('Brian committed');
  });
  it('and where nothing was filed it is, as is true', async () => {
    const c = aCheckIn({ ground: G, label: 'Litigation team daily', people, lead: 'wanjiru', promises: [promise], checkIns: [], lines: [lines[0]] });
    expect(await c.said(at('2026-10-14T08:00:00Z'))).toContain('Brian committed to “The draft will be with her tomorrow for review”. That was due by Tuesday 13 October and is one day late.');
  });
});
