import { withNoPastQuestionAboutADayToCome } from './a-day-to-come-is-never-asked-about-as-past';
import { ConversationService } from './conversation.service';

/**
 * Drop Access (test), messages test, fourth run, the openings as they were sent on Wednesday 14 October, read against what Amos and
 * Mercy had said.
 */
const WEDNESDAY = new Date('2026-10-14T11:10:08.940Z');
const AMOS_TUESDAY = [{ content: 'For Westlands Pharmacy, I need to go back on Friday. The other three shops said no for now.', at: '2026-10-13T11:05:30.000Z' }];
const AMOS_SENT = 'Last time you said Westlands Pharmacy was interested, and Lucy, the manager, had asked for a price on two units. You also said you needed to go back to Westlands Pharmacy on Friday. What happened when you went back on Friday?';

describe('Amos, Wednesday 14 October', () => {
  it('is never asked what happened on Friday; Friday is said with its date, and he is asked what has happened since', () => {
    const r = withNoPastQuestionAboutADayToCome(AMOS_SENT, AMOS_TUESDAY, WEDNESDAY);
    expect(r.text).toBe('Last time you said Westlands Pharmacy was interested, and Lucy, the manager, had asked for a price on two units. You also said you needed to go back to Westlands Pharmacy on Friday 16 October. What has happened since then?');
    expect(r.cut).toEqual(['What happened when you went back on Friday?']);
  });
  it('on Saturday 17 October, when Friday has gone by, the question goes as it was written', () => {
    expect(withNoPastQuestionAboutADayToCome(AMOS_SENT, AMOS_TUESDAY, new Date('2026-10-17T09:00:00Z')).text).toBe(AMOS_SENT);
  });
});

describe('Mercy, Wednesday 14 October', () => {
  const MERCY_THAT_MORNING = [{ content: "I need to get samples to Peter at Tuskys Westgate. Joseph said he'd have them for me on Thursday.", at: '2026-10-14T06:31:30.000Z' }];
  const SENT = 'Last time you mentioned needing to get samples to Peter at Tuskys Westgate, and that Joseph would have them for you on Thursday. What happened with that?';
  it('is never asked what happened with a Thursday that has not come', () => {
    const r = withNoPastQuestionAboutADayToCome(SENT, MERCY_THAT_MORNING, new Date('2026-10-14T11:05:18.572Z'));
    expect(r.text).toBe('Last time you mentioned needing to get samples to Peter at Tuskys Westgate, and that Joseph would have them for you on Thursday 15 October. What has happened since then?');
  });
  it('a day they said had gone by ("I called Joseph on Tuesday") is asked about as it was written', () => {
    const asked = 'You said you called Joseph on Tuesday. What did he say when you called him on Tuesday?';
    expect(withNoPastQuestionAboutADayToCome(asked, [{ content: 'I called Joseph on Tuesday, and he said Thursday.', at: '2026-10-14T11:05:30.000Z' }], new Date('2026-10-14T11:06:00Z')).text).toBe(asked);
  });
});

describe('through the one step every reply is saved by', () => {
  it("Amos's opening goes out without the question about Friday", async () => {
    const service: any = Object.create(ConversationService.prototype);
    service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    service.prisma = { conversationTurn: { findMany: jest.fn(async ({ where }: any) => (where.role === 'PERSON' && where.checkIn ? AMOS_TUESDAY.map((t) => ({ content: t.content, createdAt: new Date(t.at) })) : [])) } };
    jest.useFakeTimers({ now: WEDNESDAY });
    try {
      const said = await service.theTurnAsItIsSaved({ id: 'amos-3', participantId: 'gp-amos', participant: { partyType: 'PARTICIPANT' } }, AMOS_SENT);
      expect(said).not.toContain('What happened when you went back on Friday?');
      expect(said).toContain('on Friday 16 October');
    } finally { jest.useRealTimers(); }
  });
});
