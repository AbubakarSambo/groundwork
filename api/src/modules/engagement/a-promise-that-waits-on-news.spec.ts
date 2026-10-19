import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, type WhatIsOutstanding } from './the-leads-daily-nudge';
import { theNewsAPromiseWaitsOn, aLineGivesTheNews } from './a-promise-that-waits-on-news';
import { ConversationService } from '../conversation/conversation.service';

/**
 * FN-005 (Hafsah, 19 October: "the summary says "Brian said on Wednesday 14 October that it was filed; Njeri hasn't been told." Njeri's
 * next opening tells her it's filed."). Muchemi & Co., engine test, the real lines:
 *  - Njeri, "Fee notes", Monday 12 October 10:03: "I will check with the relevant team to see if the reply for FN-005 has been filed. I'll
 *    aim to do this today."
 *  - Brian, "Litigation team daily", Wednesday 14 October 14:00: "Good morning all. The reply in Kasarani Foods v. Tumaini Traders was
 *    successfully filed today."
 *  - Wanjiru's summary on Thursday 15 October said "In “Fee notes”, Njeri said “I will check with the relevant team to see if the reply
 *    for FN-005 has been filed”. That was due by Monday 12 October and is three days late."
 */
const at = (s: string) => new Date(s);
const FEES = 'g-fees';
const LIT = 'g-lit';
const NJERI = { id: 'fees-njeri', groundId: FEES, userId: 'u-njeri', email: 'njeri@x.test', nameGiven: null, managingOnly: false, leftAt: null, partyType: 'PARTICIPANT', user: { firstName: 'Njeri', lastName: 'Wambui', awaitingOrgApproval: false } };
const WANJIRU = { id: 'fees-wanjiru', groundId: FEES, userId: 'u-wanjiru', email: 'w@x.test', nameGiven: null, managingOnly: false, leftAt: null, partyType: 'INITIATOR', user: { firstName: 'Wanjiru', lastName: 'Muchemi', awaitingOrgApproval: false } };
const PROMISE = { id: 'njeri-check-fn-005', groundId: FEES, participantId: 'fees-njeri', owedToParticipantId: null, text: 'I will check with the relevant team to see if the reply for FN-005 has been filed.', kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', seenBySubject: true, dueDate: at('2026-10-12T00:00:00Z'), createdAt: at('2026-10-12T07:03:30.000Z') };
const BRIANS_LINE = { participantId: 'lit-brian', text: 'The reply in Kasarani Foods v. Tumaini Traders was successfully filed today.', createdAt: at('2026-10-14T11:00:30.000Z'), participant: { groundId: LIT, userId: 'u-brian', nameGiven: null, user: { firstName: 'Brian', lastName: 'Otieno' } } };
const FN005 = { fields: { Number: 'FN-005', Client: 'Kasarani Foods', Matter: 'Kasarani Foods v. Tumaini Traders' } };

function theRecord(o: { lines: any[]; njeriCheckedInSince?: boolean }) {
  return new Proxy({
    ground: { findMany: jest.fn(async () => [{ id: FEES, scenario: 'COLLECTIONS' }, { id: LIT, scenario: 'PULSE_CHECK' }]), findUnique: jest.fn(async () => ({ organizationId: 'org' })) },
    workItem: { findMany: jest.fn(async ({ where }: any) => (where?.kind === 'bill' ? [FN005] : [])) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => [NJERI, WANJIRU].filter((p) => (!where?.userId || p.userId === where.userId) && (!where?.partyType?.not || p.partyType !== where.partyType.not))), findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => [{ ...PROMISE, participant: { ground: { id: FEES, label: 'Fee notes', scenario: 'COLLECTIONS', overWhatsApp: true }, ...NJERI } }]) },
    recordEntry: { findMany: jest.fn(async ({ where }: any) => (where?.type === 'PROGRESS' && where?.participant?.groundId?.in ? o.lines : [])) },
    checkIn: { findFirst: jest.fn(async () => (o.njeriCheckedInSince ? { id: 'njeri-2' } : null)), findMany: jest.fn(async () => []) },
  } as any, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
}
const lead = { userId: 'u-wanjiru', organizationId: 'org', grounds: [{ id: FEES, label: 'Fee notes', scenario: 'COLLECTIONS', overWhatsApp: true, timelineDays: 18, cadence: 'WEEKLY' }] };
const wanjirusSummary = async (prisma: any, now: Date) => {
  const out: WhatIsOutstanding = await whatIsOutstandingFor(prisma, lead, { boards: {} as any, release: new Date('2026-01-01') }, now);
  return theTemplateParagraph('Wanjiru', withPlacesWhereTheyTellApart(theseForAPhone(out)), 'http://localhost/today').params[1] ?? '';
};

describe("Njeri's check for FN-005, in Wanjiru's summary", () => {
  it('on Thursday 15 October says who said it was filed and that Njeri has not been told, never "late"', async () => {
    const said = await wanjirusSummary(theRecord({ lines: [BRIANS_LINE] }), at('2026-10-15T08:00:00Z'));
    expect(said).toContain('Njeri said “I will check with the relevant team to see if the reply for FN-005 has been filed”. Brian said on Wednesday 14 October that it was filed; Njeri hasn\'t been told.');
    expect(said).not.toContain('days late');
  });
  it('on Tuesday 13 October, before anybody said it was filed, it was late, as was true', async () => {
    expect(await wanjirusSummary(theRecord({ lines: [] }), at('2026-10-13T08:00:00Z'))).toContain('That was due by Monday 12 October and is one day late.');
  });
  it('once Njeri has had a check-in since, it is not said at all', async () => {
    expect(await wanjirusSummary(theRecord({ lines: [BRIANS_LINE], njeriCheckedInSince: true }), at('2026-10-16T08:00:00Z'))).not.toContain('FN-005');
  });
  it('another reply, or one not filed yet, is not the news', () => {
    const news = theNewsAPromiseWaitsOn(PROMISE.text, [FN005.fields].map((f) => ({ number: f.Number, client: f.Client, matter: f.Matter })))!;
    expect(aLineGivesTheNews('The reply in Upendo Schools v. Baraka was filed today.', news)).toBe(false);
    expect(aLineGivesTheNews('The reply in Kasarani Foods v. Tumaini Traders has not been filed yet.', news)).toBe(false);
  });
});

describe("Njeri's next opening", () => {
  it('tells her, in one line, that it was filed and on which day; who said it only where she is in that check-in', async () => {
    const service: any = Object.create(ConversationService.prototype);
    service.prisma = theRecord({ lines: [BRIANS_LINE] });
    const opening = await service.withTheNewsTheyWaitOn({ participantId: 'fees-njeri', groundId: FEES, participant: { userId: 'u-njeri' } }, 'Last time you said you would check on FN-005. What has happened since then?');
    expect(opening).toBe('Somebody in another check-in said on Wednesday 14 October that the reply for FN-005 was filed. Last time you said you would check on FN-005. What has happened since then?');
    service.prisma.groundParticipant.findFirst = jest.fn(async () => ({ id: 'lit-njeri' }));
    expect(await service.withTheNewsTheyWaitOn({ participantId: 'fees-njeri', groundId: FEES, participant: { userId: 'u-njeri' } }, 'What has happened since then?')).toBe('Brian said on Wednesday 14 October that the reply for FN-005 was filed. What has happened since then?');
  });
});
