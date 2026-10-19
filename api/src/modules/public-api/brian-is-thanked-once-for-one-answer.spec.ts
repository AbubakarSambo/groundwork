import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { THANKS_ONLY } from './a-whatsapp-message-is-routed';

/**
 * ONE THANK-YOU FOR ONE ANSWER (messages test after the fixes, 19 October, finding 10; Hafsah, 19 October, point 4: "nobody is thanked
 * again for an earlier check-in").
 *
 * Muchemi & Co. (test). Brian Otieno answered "Litigation team daily" on WhatsApp on Tuesday 13 October at 14:01 in Nairobi and was
 * thanked. On Thursday 15 and Friday 16 October at 07:30 he read again, on WhatsApp, "Thank you, your answer for Litigation team daily
 * is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read." He had not
 * answered either day: the morning backstop re-emits the round's completion as a repair, and each repair thanked him again.
 */
const CHECK_IN = '629a5a54-f0b5-435c-bc90-09b1eefd7f31';
const ORG = 'org-muchemi';
const THANKS = 'Thank you, your answer for Litigation team daily is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.';

function brian(o: { thankedOnTuesday: boolean }) {
  const sent: { text: string; kind: string }[] = [];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async ({ select }: any) => (select?.groundId
        ? { groundId: 'g-lit', participant: { language: 'en' } }
        : { id: CHECK_IN, sessionNumber: 2, status: 'COMPLETED', ground: { id: 'g-lit', organizationId: ORG, label: 'Litigation team daily', overWhatsApp: true, simplerWords: false }, participant: { userId: 'u-brian', email: 'brian@muchemi.test' } })),
    },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700400003' })), findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Brian', phoneNumber: null })) },
    whatsAppSend: { findFirst: jest.fn(async ({ where }: any) => (where.kind === THANKS_ONLY && o.thankedOnTuesday ? { id: 'ws-tuesday' } : null)) },
    conversationTurn: { findMany: jest.fn(async () => [{ content: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.' }]) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
    organizationMembership: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  const proxy: any = new Proxy(prisma, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const whatsapp: any = {
    lastWroteTo: jest.fn(async () => 'theirs'),
    sendOn: jest.fn(async (_via: string, _org: string, _phone: string, text: string, ctx: any) => { sent.push({ text, kind: ctx.kind }); return { sent: true }; }),
  };
  /* Nobody else has answered yet, so there is nothing to read. */
  const reports: any = { sessionReport: jest.fn(async () => ({ state: 'forming', whereThingsStand: { agreed: 0, stillOpen: 0, saying: 'Not everyone has answered yet, so there is nothing to agree or differ with.' }, atAGlance: [] })) };
  const svc = new WhatsAppForAnOrganisationService(proxy, whatsapp, {} as any, {} as any, {} as any, {} as any, reports, {} as any);
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
  return { svc, sent, settle };
}

describe('Brian is thanked once for his Tuesday answer', () => {
  it('on Tuesday, when he answers, he is thanked', async () => {
    const b = brian({ thankedOnTuesday: false });
    await b.svc.onCheckInCompleted({ checkInId: CHECK_IN, groundId: 'g-lit', participantId: 'gp-brian', sessionNumber: 2 });
    await b.settle();
    expect(b.sent).toEqual([{ text: THANKS, kind: THANKS_ONLY }]);
  });
  it('on Thursday and Friday the backstop\'s repair sends him nothing', async () => {
    const b = brian({ thankedOnTuesday: true });
    await b.svc.onCheckInCompleted({ checkInId: CHECK_IN, groundId: 'g-lit', participantId: 'gp-brian', sessionNumber: 2, source: 'repair' });
    await b.settle();
    expect(b.sent).toEqual([]);
  });
  it('and the same completion read a second time thanks nobody again', async () => {
    const b = brian({ thankedOnTuesday: true });
    await b.svc.onCheckInCompleted({ checkInId: CHECK_IN, groundId: 'g-lit', participantId: 'gp-brian', sessionNumber: 2 });
    await b.settle();
    expect(b.sent).toEqual([]);
  });
});
