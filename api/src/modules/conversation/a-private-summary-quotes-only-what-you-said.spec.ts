import { ConversationService } from './conversation.service';

/**
 * THE PRIVATE RECORD SUMMARY QUOTES ONLY WHAT THE PERSON SAID, FROM THEIR RECORD.
 *
 * The first thing a person reads about their own check-in is "Here is what you shared. ...", written by a
 * model from their own record lines. On the run of 26 September two of its seven quotes were in
 * nobody's record. The same rule as every report now holds for it: a quote is their words from the
 * record, exactly, or it is not a quote. See reports/a-quote-is-what-they-said.
 */
describe('a private summary quotes only what you said', () => {
  it('a quote of their own line is kept in their own words, and one they never said loses its marks', async () => {
    let stored: any = null;
    const prisma: any = {
      recordEntry: {
        findMany: jest.fn(async () => [
          { type: 'WORRY', text: "I can't proceed with the security review until the InfoSec contractor is back on the 29th.", saidWordForWord: true },
        ]),
      },
      groundParticipant: { update: jest.fn(async (a: any) => { stored = JSON.parse(a.data.soloArtifact); return {}; }) },
    };
    const anthropic: any = {
      extract: jest.fn(async () => ({
        summary: 'What you shared: you said "i can\'t proceed with the security review", and that you are "completely stuck".',
        whatToCarry: 'You said "until the InfoSec contractor is back on the 29th."',
      })),
    };
    const service = new ConversationService(
      prisma, {} as any, anthropic, {} as any, {} as any, {} as any, {} as any,
      { sendParticipantBlockedNudge: () => Promise.resolve() } as any, { emit: () => Promise.resolve() } as any, { get: () => '' } as any,
    );
    await service.buildSoloArtifact('p1', 'g1');
    expect(stored).toEqual({
      /* Stored with its opening as a sentence of its own, not "What you shared:" (request 60). */
      summary: 'Here is what you shared. You said "I can\'t proceed with the security review", and that you are completely stuck.',
      whatToCarry: 'You said "until the InfoSec contractor is back on the 29th."',
    });
  });
});
