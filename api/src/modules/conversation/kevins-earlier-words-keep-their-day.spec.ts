import { withEarlierWordsOnTheirOwnDay } from './earlier-words-keep-their-own-day';
import { ConversationService } from './conversation.service';

/**
 * "LAST TIME YOU SAID YOU SENT SAVANNAH CAFE THE PRICE LIST THIS MORNING" (Hafsah, 19 October, point 3: "Earlier words are put back with
 * the right day ('in the last checkin', not 'this morning')."; messages test after the fixes, finding 2). Drop Access (test). Kevin Omondi
 * said on Tuesday 13 October at 14:01 in Nairobi "Hey team! After I sent Savannah Cafe the price list this morning, Jane got back to me.
 * She wants 6 units, so I sent her a quote for KES 30,000 on WhatsApp." His check-in on Wednesday 14 October opened as below.
 */
const OPENER = 'Last time you said you sent Savannah Cafe the price list this morning. What has happened with Savannah Cafe since then?';
const TUESDAY = [{ content: 'Hey team! After I sent Savannah Cafe the price list this morning, Jane got back to me. She wants 6 units, so I sent her a quote for KES 30,000 on WhatsApp.', at: new Date('2026-10-13T11:01:17.989Z') }];
const WEDNESDAY = new Date('2026-10-14T11:00:17.535Z');

describe("Kevin's earlier words are put back with their own day", () => {
  it('"this morning" was Tuesday\'s, and is said so', () => {
    expect(withEarlierWordsOnTheirOwnDay(OPENER, TUESDAY, WEDNESDAY))
      .toBe('In the last check-in, on Tuesday 13 October, you said you sent Savannah Cafe the price list that morning. What has happened with Savannah Cafe since then?');
  });

  it('as the opener is saved and sent to him through the one step every reply goes through', async () => {
    jest.useFakeTimers({ now: WEDNESDAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout'] });
    try {
      const service: any = Object.create(ConversationService.prototype);
      service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
      service.prisma = { conversationTurn: { findMany: jest.fn(async ({ where }: any) => (where.role === 'PERSON' && where.checkIn ? TUESDAY.map((t) => ({ content: t.content, createdAt: t.at })) : [])) } };
      const said = await service.theTurnAsItIsSaved({ id: 'kevin-session-3', participantId: 'gp-kevin', participant: { partyType: 'PARTICIPANT' } }, OPENER);
      expect(said).toContain('on Tuesday 13 October');
      expect(said).not.toContain('price list this morning');
    } finally {
      jest.useRealTimers();
    }
  });

  it('words said earlier the same day keep their "this morning"', () => {
    expect(withEarlierWordsOnTheirOwnDay(OPENER, TUESDAY, new Date('2026-10-13T13:00:00Z'))).toBe(OPENER);
  });

  it('"today" in a sentence about now, with nothing of theirs behind it, is left alone', () => {
    const now = 'Last time you mentioned the samples for Tuskys. What has happened with them today?';
    expect(withEarlierWordsOnTheirOwnDay(now, TUESDAY, WEDNESDAY)).toBe(now);
  });
});

describe('a day already said, and words in quotation marks (polish round 2)', () => {
  const e = [{ content: 'I will check on Brian today.', at: new Date('2026-10-14T09:00:00+03:00') }];
  it('is not said twice, and their quoted words are left as they wrote them', () => {
    expect(withEarlierWordsOnTheirOwnDay('You wrote on Wednesday 14 October: “I will check on Brian today.” Did he?', e, new Date('2026-10-16T09:00:00+03:00')))
      .toBe('You wrote on Wednesday 14 October: “I will check on Brian today.” Did he?');
  });
});
