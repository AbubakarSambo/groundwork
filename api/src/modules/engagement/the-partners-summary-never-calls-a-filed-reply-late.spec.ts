import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { thePromisesSaidDone } from '../conversation/a-promise-said-done-is-kept';

/**
 * "THAT WAS DUE BY TUESDAY 13 OCTOBER AND IS ONE DAY LATE", ABOUT A REPLY BRIAN HAD SAID WAS FILED (messages test, 19 October, finding 3).
 *
 * Muchemi & Co. (test). On Monday 12 October, on WhatsApp in "Litigation team daily", Brian Otieno said "I'll send the drafted reply to
 * Wanjiru for her review tomorrow". On Tuesday 13 October he said "We filed the reply today, on 13 October." and "The reply in Kasarani
 * Foods v. Tumaini Traders was filed today." From Wednesday to Friday Wanjiru's morning summary still read, under "These are overdue on
 * your team", "In “Litigation team daily”, Brian said “I'll send the drafted reply to Wanjiru for her review tomorrow”. That was due by
 * Tuesday 13 October and is one day late." Two things kept the promise open: "filed" was not a word for something having happened, and
 * the line was cut at "v." as if that were the end of a sentence, so "the reply" and "was filed" were never read together.
 */
const G = '352b8180-f633-40ac-ab0d-824432e9f394';
const ORG = '494f8e2d-f920-4132-8252-e17fb7bf7172';
const P = { wanjiru: '3e60b08a-d31d-4b7e-9adc-b4c60bd4b0f1', brian: 'e9e2d42c-c918-491e-8b13-73b212ec6f2c', aisha: '1fdbb152-b086-44f4-8c1f-172734ff06ba' };
const U = { wanjiru: 'u-wanjiru', brian: 'u-brian', aisha: 'u-aisha' };
const NAMES: Record<string, [string, string]> = { [P.wanjiru]: ['Wanjiru', 'Muchemi'], [P.brian]: ['Brian', 'Otieno'], [P.aisha]: ['Aisha', 'Kamau'] };
const person = (id: string, userId: string) => ({ id, groundId: G, userId, email: `${NAMES[id][0].toLowerCase()}@muchemi.test`, nameGiven: null, managingOnly: false, leftAt: null, partyType: id === P.wanjiru ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: NAMES[id][0], lastName: NAMES[id][1], awaitingOrgApproval: false }, checkIns: [] });
const PEOPLE = [person(P.wanjiru, U.wanjiru), person(P.brian, U.brian), person(P.aisha, U.aisha)];
const PERSON_OF = (id: string) => PEOPLE.find((p) => p.id === id);

const BRIANS_PROMISE = { id: 'brian-send-the-reply', groundId: G, participantId: P.brian, owedToParticipantId: null, text: "I'll send the drafted reply to Wanjiru for her review tomorrow", kind: 'TODO', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: new Date('2026-10-13T00:00:00Z'), createdAt: new Date('2026-10-12T06:40:00.000Z') };
const TUESDAY = [
  { id: 'l-filed-1', participantId: P.brian, type: 'PROGRESS', text: 'We filed the reply today, on 13 October.', createdAt: new Date('2026-10-13T06:31:00.000Z') },
  { id: 'l-filed-2', participantId: P.brian, type: 'PROGRESS', text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', createdAt: new Date('2026-10-13T06:33:00.000Z') },
];

function theRecord(now: Date, lines: any[]) {
  const prisma: any = new Proxy({
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => (!where?.userId || p.userId === where.userId) && (!where?.partyType?.not || p.partyType !== where.partyType.not))) },
    personObjective: { findMany: jest.fn(async ({ where }: any) => [BRIANS_PROMISE].filter((p) => (!where?.dueDate?.lt || p.dueDate < where.dueDate.lt) && p.createdAt <= now).map((p) => ({ ...p, participant: { ground: { id: G, label: 'Litigation team daily', scenario: 'PULSE_CHECK', overWhatsApp: true }, ...PERSON_OF(p.participantId) } }))) },
    recordEntry: { findMany: jest.fn(async () => lines.filter((l) => l.createdAt <= now)) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, method: string) => jest.fn(async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null)) }) });
  return prisma;
}
const LEAD = { userId: U.wanjiru, organizationId: ORG, grounds: [{ id: G, label: 'Litigation team daily', scenario: 'PULSE_CHECK', overWhatsApp: true, timelineDays: 30, cadence: 'DAILY' }] };
const said = (o: WhatIsOutstanding) => theTemplateParagraph('Wanjiru', withPlacesWhereTheyTellApart(theseForAPhone(o)), 'http://localhost:5197/today').params[1] ?? '';

describe('a reply said filed keeps the promise to send it', () => {
  it('"We filed the reply today, on 13 October." keeps "I\'ll send the drafted reply to Wanjiru for her review tomorrow"', () => {
    expect(thePromisesSaidDone([BRIANS_PROMISE], [TUESDAY[0]], [], (id) => NAMES[id] ?? [], Object.values(P)).map((k) => k.id)).toEqual(['brian-send-the-reply']);
  });
  it('and so does "The reply in Kasarani Foods v. Tumaini Traders was filed today.", read as one sentence', () => {
    expect(thePromisesSaidDone([BRIANS_PROMISE], [TUESDAY[1]], [], (id) => NAMES[id] ?? [], Object.values(P)).map((k) => k.id)).toEqual(['brian-send-the-reply']);
  });
  it('"The reply has been drafted and should be filed this week." keeps nothing', () => {
    const notYet = [{ id: 'l-0', participantId: P.brian, type: 'PROGRESS', text: 'The reply has been drafted and should be filed this week.', createdAt: new Date('2026-10-12T09:00:00Z') }];
    expect(thePromisesSaidDone([BRIANS_PROMISE], notYet, [], (id) => NAMES[id] ?? [], Object.values(P))).toEqual([]);
  });
  it('Wanjiru\'s summary on Wednesday 14 October tells nothing about it as late', async () => {
    const now = new Date('2026-10-14T05:00:00Z');
    const o = await whatIsOutstandingFor(theRecord(now, TUESDAY), LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.overdueOnYourTeam).toEqual([]);
    expect(said(o)).not.toContain('is one day late');
  });
});

/*
 * THE SECOND RUN (messages test after the fixes, 19 October): Brian's promise said "it". On Monday 12 October, in one answer, he said
 * "The reply was drafted." and "I will send it to Wanjiru tomorrow for her review." On Tuesday, "The reply in Kasarani Foods v. Tumaini
 * Traders was filed today." Wanjiru's summary on Wednesday, Thursday and Friday still read "In “Litigation team daily”, Brian said “I will
 * send it to Wanjiru tomorrow for her review”. That was due by Tuesday 13 October and is one day late." (then two, then three).
 */
const IT = { ...BRIANS_PROMISE, id: '85b35902-1629-421d-93a9-e175582383f1', text: 'I will send it to Wanjiru tomorrow for her review.', kind: 'COMMITMENT', createdAt: new Date('2026-10-12T11:02:49.991Z') };
const MONDAY = [
  { id: 'l-working', participantId: P.brian, type: 'INTENT', text: 'I am working on Kasarani Foods v. Tumaini Traders.', createdAt: new Date('2026-10-12T11:02:43.211Z') },
  { id: 'l-drafted', participantId: P.brian, type: 'PROGRESS', text: 'The reply was drafted.', createdAt: new Date('2026-10-12T11:02:43.211Z') },
];
const FILED = { id: 'l-filed-run2', participantId: P.brian, type: 'PROGRESS', text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', createdAt: new Date('2026-10-13T11:01:55.904Z') };

describe('a promise that says "it" is about what its maker had just said was done', () => {
  it('"I will send it to Wanjiru tomorrow for her review." is kept by "The reply ... was filed today."', () => {
    expect(thePromisesSaidDone([IT], [...MONDAY, FILED], [], (id) => NAMES[id] ?? [], Object.values(P)).map((k) => k.id)).toEqual([IT.id]);
  });
  it('without the line it came after, "it" is about nothing, and nothing keeps it', () => {
    expect(thePromisesSaidDone([IT], [FILED], [], (id) => NAMES[id] ?? [], Object.values(P))).toEqual([]);
  });
  it('two things said done in that answer, and "it" could be either: nothing keeps it', () => {
    const two = [...MONDAY, { id: 'l-other', participantId: P.brian, type: 'PROGRESS', text: 'The witness list was updated.', createdAt: new Date('2026-10-12T11:02:43.211Z') }];
    expect(thePromisesSaidDone([IT], [...two, FILED], [], (id) => NAMES[id] ?? [], Object.values(P))).toEqual([]);
  });
  it('Wanjiru\'s summary on Thursday 15 October does not call it late', async () => {
    const now = new Date('2026-10-15T05:00:00Z');
    const prisma = theRecord(now, [...MONDAY, FILED]);
    prisma.personObjective.findMany = jest.fn(async () => [{ ...IT, participant: { ground: { id: G, label: 'Litigation team daily', scenario: 'PULSE_CHECK', overWhatsApp: true }, ...PERSON_OF(P.brian) } }]);
    const o = await whatIsOutstandingFor(prisma, LEAD, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.overdueOnYourTeam).toEqual([]);
    expect(said(o)).not.toContain('I will send it to Wanjiru tomorrow for her review');
  });
});
