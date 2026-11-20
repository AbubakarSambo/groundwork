import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { THANKS_ONLY } from './a-whatsapp-message-is-routed';

/**
 * WhatsApp test, 20 November 2026, C28 and C29. Chidi wrote "That's right, finish." and read "Your check-in is complete and on record."; he
 * wrote "finish" again, and three seconds later got "Thank you, your answer for Sales team, Q4 is in. You will be told when the report is
 * ready." Neema, on two organisations' rosters, got the same line wrapped as a first message: "This is Groundwork, writing for Msingi Foods.
 * Thank you, your answer for Sales team, Q4 is in. You will be told when the report is ready. Not you? Reply STOP." Somebody who answered
 * the check-in on WhatsApp was told at the close, so nothing more is sent until there is a report worth reading.
 */
const CHECK_IN = 'a8ab86f1-4115-4118-bba7-06b199c136b6';
const ORG = 'org-msingi';

function chidi(o: { answeredOnWhatsApp: boolean; reportHasSomething?: boolean }) {
  const sent: { text: string; kind: string }[] = [];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async ({ select }: any) => (select?.groundId
        ? { groundId: 'g-sales' }
        : { id: CHECK_IN, sessionNumber: 3, status: 'COMPLETED', ground: { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q4', overWhatsApp: true, simplerWords: false }, participant: { userId: 'u-chidi', email: 'chidi@msingi.test' } })),
    },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700100004' })), findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Chidi', phoneNumber: null })) },
    whatsAppSend: { findFirst: jest.fn(async ({ where }: any) => (where.kind === 'answered-here' && o.answeredOnWhatsApp ? { id: 'ws-answered' } : null)) },
    conversationTurn: { findMany: jest.fn(async () => [{ content: 'closed kilele 450k on tues, still chasing naivas PO' }]), findFirst: jest.fn(async () => ({ id: 't1' })) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
    organizationMembership: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  const proxy: any = new Proxy(prisma, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const whatsapp: any = {
    lastWroteTo: jest.fn(async () => 'theirs'),
    sendOn: jest.fn(async (_via: string, _org: string, _phone: string, text: string, ctx: any) => { sent.push({ text, kind: ctx.kind }); return { sent: true }; }),
  };
  const nothingYet = { state: 'forming', whereThingsStand: { agreed: 0, stillOpen: 0, saying: 'Not everyone has answered yet, so there is nothing to agree or differ with.' }, atAGlance: [] };
  const something = { state: 'ready', whereThingsStand: { agreed: 2, stillOpen: 1, saying: 'Two things are agreed and one is still open.' }, atAGlance: [] };
  const reports: any = { sessionReport: jest.fn(async () => (o.reportHasSomething ? something : nothingYet)) };
  const svc = new WhatsAppForAnOrganisationService(proxy, whatsapp, {} as any, {} as any, {} as any, {} as any, reports, {} as any);
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
  return { svc, sent, settle };
}

describe('nothing arrives after a close Chidi saw on the phone', () => {
  it('no "Thank you, your answer for Sales team, Q4 is in." after he finished on WhatsApp', async () => {
    const c = chidi({ answeredOnWhatsApp: true });
    await c.svc.onCheckInCompleted({ checkInId: CHECK_IN, groundId: 'g-sales', participantId: 'gp-chidi', sessionNumber: 3 });
    await c.settle();
    expect(c.sent).toEqual([]);
  });
  it('a report with something in it still follows', async () => {
    const c = chidi({ answeredOnWhatsApp: true, reportHasSomething: true });
    await c.svc.onCheckInCompleted({ checkInId: CHECK_IN, groundId: 'g-sales', participantId: 'gp-chidi', sessionNumber: 3 });
    await c.settle();
    expect(c.sent.map((s) => s.kind)).toEqual(['report']);
    expect(c.sent.map((s) => s.kind)).not.toContain(THANKS_ONLY);
  });
  it('somebody who answered in the app is still thanked on the phone, as before', async () => {
    const c = chidi({ answeredOnWhatsApp: false });
    await c.svc.onCheckInCompleted({ checkInId: CHECK_IN, groundId: 'g-sales', participantId: 'gp-chidi', sessionNumber: 3 });
    await c.settle();
    expect(c.sent).toEqual([{ text: 'Thank you, your answer for Sales team, Q4 is in. You will be told when the report is ready.', kind: THANKS_ONLY }]);
  });
});
