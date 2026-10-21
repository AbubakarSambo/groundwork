import { theMPesaCodesSaid, theMPesaCodesForTheModel, theScreenshotWasAskedFor, withTheScreenshotAskedOnce } from './an-mpesa-code-is-asked-about-once';
import { ConversationService } from './conversation.service';

/**
 * Drop Access (test), Kevin's WhatsApp check-ins (messages test, fourth run). On Tuesday 13 October he said "Yep, Kilele Hotel's payment
 * was KES 200,000 via M-Pesa. The confirmation code is QJK4TL2MX9. I can forward the M-Pesa message if you need proof." The screenshot is
 * asked for once for that sale, and never after (Hafsah, 19 October).
 */
const CODE_SAID = { text: "Yep, Kilele Hotel's payment was KES 200,000 via M-Pesa. The confirmation code is QJK4TL2MX9. I can forward the M-Pesa message if you need proof.", at: '2026-10-13T11:03:30.000Z' };
const ASK = 'Thank you for the M-Pesa code. Could you send a screenshot of the M-Pesa message for Kilele Hotel when you can?';

describe("Kevin's M-Pesa code for Kilele Hotel", () => {
  const [code] = theMPesaCodesSaid([CODE_SAID]);
  it('is read from his words', () => {
    expect(code.code).toBe('QJK4TL2MX9');
  });
  it('the model is told it is proof, and that it may ask once for the screenshot', () => {
    expect(theMPesaCodesForTheModel([code], () => false)).toContain('M-Pesa code QJK4TL2MX9');
    expect(theMPesaCodesForTheModel([code], () => false)).toContain('you may ask once, in plain words, for a screenshot of the M-Pesa message for this sale');
    expect(theMPesaCodesForTheModel([code], () => true)).toContain('never ask for it, or for any other proof of this sale, again');
  });
  it('the first ask goes out', () => {
    expect(withTheScreenshotAskedOnce(ASK, [code], (c) => theScreenshotWasAskedFor(c, [])).text).toBe(ASK);
  });
  it('once asked, on Tuesday, it is never asked again on Wednesday', () => {
    const ours = [{ content: ASK, at: '2026-10-13T11:03:40.000Z' }];
    expect(theScreenshotWasAskedFor(code, ours)).toBe(true);
    const r = withTheScreenshotAskedOnce('Savannah Cafe confirmed 6 units. Can you forward the M-Pesa message for Kilele Hotel?', [code], (c) => theScreenshotWasAskedFor(c, ours));
    expect(r.text).toBe('Savannah Cafe confirmed 6 units. What else should I know?');
  });
  it('through the step every reply is saved by', async () => {
    const service: any = Object.create(ConversationService.prototype);
    service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    service.prisma = { conversationTurn: { findMany: jest.fn(async ({ where }: any) => {
      if (where.checkIn?.participantId) return [{ role: 'PERSON', content: CODE_SAID.text, createdAt: new Date(CODE_SAID.at) }, { role: 'AI', content: ASK, createdAt: new Date('2026-10-13T11:03:40.000Z') }];
      return [];
    }) } };
    const said = await service.theTurnAsItIsSaved({ id: 'kevin-3', participantId: 'gp-kevin', participant: { partyType: 'PARTICIPANT' } }, 'Kilele Hotel is paid. Please send a screenshot of the M-Pesa message for it. What else have you secured toward your 40-unit target?');
    expect(said).not.toContain('screenshot');
    expect(said).toContain('What else have you secured toward your 40-unit target?');
  });
});
