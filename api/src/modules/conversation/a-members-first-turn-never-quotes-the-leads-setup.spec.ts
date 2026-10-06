import { PartyType, GroundScenario } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { theLeadsSetupWords } from './the-leads-brief-is-never-quoted-to-them';

/**
 * A MEMBER'S FIRST TURN NEVER QUOTES THE LEAD'S SETUP (release blocker, 5 October 2026; decisions 75 item 13 and 96 (8)).
 *
 * The lead's setup reaches a member's model twice: the brief, and the lead's note to everyone in the check-in
 * (`sharedNote`). The brief was cut from what a member reads; the note was held only by an instruction to the model.
 * Only what the member was told the check-in is for may be said to them. Read here as Amani's first turn, the way it
 * is saved, across scenarios and on a check-in started from the anchor link; and as Rukia, the lead, unchanged.
 */
const BRIEF = 'Sales fell for three weeks because the shops in Kibera stopped reordering after the price change. Ask each of them whether they explained the new prices to their shops.';
const NOTE = 'I am worried that Amani and Baraka are not visiting their shops every week and that nobody is chasing the late payments.';
const TOLD = 'This check-in is about how sales are going in your area, and what is getting in the way.';

function saving(scenario: string, startedFrom: string | null = null, opts: { brief?: string | null } = {}) {
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        brief: opts.brief === undefined ? BRIEF : opts.brief, toldToParticipants: TOLD, scenario, startedFrom,
        initiator: { firstName: 'Rukia' }, initiatorId: 'u-rukia', peersVisibleToEachOther: true,
        leadContextNotes: [{ text: NOTE, audience: 'EVERYONE', participantId: null }],
        participants: [],
      })),
    },
    conversationTurn: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    groundObjective: { findMany: jest.fn(async () => []) },
  };
  const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
  jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
  return s;
}
const AMANI = { id: 'ci-amani', groundId: 'g1', participantId: 'p-amani', sessionNumber: 1, participant: { partyType: PartyType.PARTICIPANT } };
const RUKIA = { id: 'ci-rukia', groundId: 'g1', participantId: 'p-rukia', sessionNumber: 1, participant: { partyType: PartyType.INITIATOR } };

const QUOTING_THE_BRIEF = 'Sales fell for three weeks because the shops in Kibera stopped reordering. How are your shops doing this week?';
const QUOTING_THE_NOTE = 'Welcome. Rukia is worried that you are not visiting their shops every week. How are your shops doing this week?';
const ONLY_WHAT_SHE_WAS_TOLD = 'This check-in is about how sales are going in your area, and what is getting in the way. How are your shops doing this week?';

const SCENARIOS: string[] = [GroundScenario.PULSE_CHECK, GroundScenario.NEW_HIRE, GroundScenario.PIP, GroundScenario.NEW_PROJECT, GroundScenario.IMPLEMENTATION_TRACKING, GroundScenario.CRISIS_ALIGNMENT];

describe('Amani, a member, on her first turn', () => {
  for (const scenario of SCENARIOS) {
    it(`reads no sentence of the brief and none of the lead's note on ${scenario}`, async () => {
      expect(await saving(scenario).theTurnAsItIsSaved(AMANI, QUOTING_THE_BRIEF)).toBe('How are your shops doing this week?');
      expect(await saving(scenario).theTurnAsItIsSaved(AMANI, QUOTING_THE_NOTE)).toBe('Welcome. How are your shops doing this week?');
    });
  }

  it('on a check-in started from the anchor link, the same, and what she was told is still said', async () => {
    const anchor = saving(GroundScenario.PULSE_CHECK as string, 'anchor');
    expect(await anchor.theTurnAsItIsSaved(AMANI, QUOTING_THE_NOTE)).toBe('Welcome. How are your shops doing this week?');
    expect(await saving(GroundScenario.PULSE_CHECK as string, 'anchor').theTurnAsItIsSaved(AMANI, ONLY_WHAT_SHE_WAS_TOLD)).toBe(ONLY_WHAT_SHE_WAS_TOLD);
  });

  it('the lead\'s note is held even where the lead wrote no brief', async () => {
    expect(await saving(GroundScenario.PULSE_CHECK as string, null, { brief: null }).theTurnAsItIsSaved(AMANI, QUOTING_THE_NOTE)).toBe('Welcome. How are your shops doing this week?');
  });

  it('while it streams, a sentence of the lead\'s note is held back too', async () => {
    const quotes = await saving(GroundScenario.PULSE_CHECK as string).aSentenceThatQuotesTheBriefFor(AMANI, []);
    expect(quotes('Rukia is worried that you are not visiting their shops every week.')).toBe(true);
    expect(quotes('How are your shops doing this week?')).toBe(false);
  });
});

describe('Rukia, the lead, reads her own setup in her own check-in as before', () => {
  it('nothing of hers is cut', async () => {
    const saved: string = await saving(GroundScenario.PULSE_CHECK as string).theTurnAsItIsSaved(RUKIA, QUOTING_THE_BRIEF);
    expect(saved).toContain('Sales fell for three weeks');
  });
});

describe('the lead\'s setup words', () => {
  it('are the brief and the note to everyone, never a private note or a note about one person', () => {
    expect(theLeadsSetupWords({ brief: 'B.', leadContextNotes: [
      { text: 'To everyone.', audience: 'EVERYONE', participantId: null },
      { text: 'Only mine.', audience: 'LEAD_ONLY', participantId: null },
      { text: 'About Amani.', audience: 'EVERYONE', participantId: 'p-amani' },
    ] })).toBe('B.\n\nTo everyone.');
    expect(theLeadsSetupWords({ brief: null, leadContextNotes: [] })).toBeNull();
  });
});
