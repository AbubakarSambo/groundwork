import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { thePromisesSaidDone } from '../conversation/a-promise-said-done-is-kept';

/**
 * A PROMISE SAID DONE IN OTHER WORDS IS NEVER LISTED AS OVERDUE (Hafsah, 19 October, point 1; messages test, finding 1).
 *
 * Drop Access, from the run's own record. On Monday 12 October Mercy said "I'll follow up with Joseph about the samples today." On
 * Wednesday 14 October at 09:32 she said "I called Joseph yesterday about the samples." (kept as a worry, because the samples had
 * still not come). At 11:00 Grace's WhatsApp summary read "These are overdue on your team. Mercy committed to “follow up with Joseph
 * about the samples today”. That was due by Monday 12 October and is two days late."
 */
const G = 'ac3b4070-27f1-4dc4-a2ea-b027f8fc72d1';
const ORG = '017b3b44-850c-481f-964b-6bc41ece4dce';
const P = { grace: 'gp-grace', mercy: 'gp-mercy', joseph: 'gp-joseph' };
const NAMES: Record<string, [string, string]> = { [P.grace]: ['Grace', 'Achieng'], [P.mercy]: ['Mercy', 'Wairimu'], [P.joseph]: ['Joseph', 'Kariuki'] };
const person = (id: string) => ({ id, groundId: G, userId: `u-${id}`, email: `${NAMES[id][0].toLowerCase()}@dropaccess.test`, nameGiven: null, managingOnly: false, leftAt: null, partyType: id === P.grace ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: NAMES[id][0], lastName: NAMES[id][1], awaitingOrgApproval: false }, checkIns: [] });
const PEOPLE = [person(P.grace), person(P.mercy), person(P.joseph)];

const MERCYS_PROMISE = { id: 'mercy-follow-up-joseph', groundId: G, participantId: P.mercy, owedToParticipantId: null, text: 'follow up with Joseph about the samples today', kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: new Date('2026-10-12T00:00:00Z'), createdAt: new Date('2026-10-12T11:07:08.066Z') };
const WEDNESDAY_MORNING = [
  { id: 'l-1', participantId: P.mercy, type: 'PROGRESS', text: "Joseph said he'll have the samples ready by Thursday.", createdAt: new Date('2026-10-14T06:32:53.832Z') },
  { id: 'l-2', participantId: P.mercy, type: 'WORRY', text: 'The samples from Joseph are holding up Tuskys Westgate.', createdAt: new Date('2026-10-14T06:32:53.832Z') },
  { id: 'l-3', participantId: P.mercy, type: 'WORRY', text: 'I called Joseph yesterday about the samples.', createdAt: new Date('2026-10-14T06:32:53.832Z') },
];
const namesOf = (id: string) => NAMES[id] ?? [];

function theRecord(now: Date, lines: any[]) {
  return new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => (!where?.userId || p.userId === where.userId) && (!where?.partyType?.not || p.partyType !== where.partyType.not))) },
    personObjective: { findMany: jest.fn(async ({ where }: any) => [MERCYS_PROMISE].filter((p) => (!where?.dueDate?.lt || p.dueDate < where.dueDate.lt)).map((p) => ({ ...p, participant: { ground: { id: G, label: 'Sales team, Q4', scenario: 'PULSE_CHECK', overWhatsApp: true }, ...PEOPLE.find((x) => x.id === p.participantId) } }))) },
    recordEntry: { findMany: jest.fn(async ({ where }: any) => lines.filter((l) => l.createdAt <= now && (!where?.type?.in || where.type.in.includes(l.type)) && (typeof where?.type !== 'string' || where.type === l.type))) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: false })) },
  } as any, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, method: string) => jest.fn(async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null)) }) });
}
const LEAD = { userId: `u-${P.grace}`, organizationId: ORG, grounds: [{ id: G, label: 'Sales team, Q4', scenario: 'PULSE_CHECK', overWhatsApp: true, timelineDays: 18, cadence: 'DAILY' }] };
const said = (o: WhatIsOutstanding) => theTemplateParagraph('Grace', withPlacesWhereTheyTellApart(theseForAPhone(o)), 'http://localhost:5206/today').params[1] ?? '';

describe('a follow-up said done in other words is kept', () => {
  it('"I called Joseph yesterday about the samples." keeps "follow up with Joseph about the samples today"', () => {
    expect(thePromisesSaidDone([MERCYS_PROMISE], [WEDNESDAY_MORNING[2]], [], namesOf, Object.values(P)).map((k) => k.id)).toEqual(['mercy-follow-up-joseph']);
  });
  it('but a worry that says nothing was done keeps nothing', () => {
    const stillWaiting = [
      { id: 'l-4', participantId: P.mercy, type: 'WORRY', text: 'Still waiting on Joseph for those samples.', createdAt: new Date('2026-10-14T11:06:05.009Z') },
      { id: 'l-5', participantId: P.mercy, type: 'WORRY', text: "I called Joseph about the samples but he hasn't answered.", createdAt: new Date('2026-10-14T11:06:05.009Z') },
      WEDNESDAY_MORNING[1],
    ];
    expect(thePromisesSaidDone([MERCYS_PROMISE], stillWaiting, [], namesOf, Object.values(P))).toEqual([]);
  });
  it("Grace's summary on Wednesday 14 October at 11:00 does not call Mercy's follow-up two days late, on any board", async () => {
    const now = new Date('2026-10-14T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now, WEDNESDAY_MORNING) as any, LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.overdueOnYourTeam).toEqual([]);
    expect(said(o)).not.toContain('Mercy committed to');
  });
  it('and on Tuesday, before she said it, it was still told as late, as it should be', async () => {
    const now = new Date('2026-10-13T08:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now, WEDNESDAY_MORNING) as any, LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(said(o)).toBe('These are overdue on your team. Mercy committed to “follow up with Joseph about the samples today”. That was due by Monday 12 October and is one day late.');
  });
});
