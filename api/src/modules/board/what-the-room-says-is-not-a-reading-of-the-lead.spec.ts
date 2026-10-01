import { GroundScenario } from '@prisma/client';
import { AMINA, RUKIA, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * THE SHARED READ OF THE ANSWERS, AS THE LEAD AND A PARTICIPANT READ IT (the 1 October review, part 1).
 * A sentence in it that is a reading of the lead ("Amina Wanjiru has no visibility of these facts...") is not
 * served to a participant. Everything else in it is.
 */
const PICTURE = 'Most people are behind on payments. Amina Wanjiru has no visibility of these facts, and so has understood the problem as one of individual repayment. Only one person is repaying on time.';
const RECORD: Setup = {
  scenario: GroundScenario.OKR_ALIGNMENT,
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, sharedPicture: 'Both have checked in.', agreements: [], divergences: [],
    centralQuestion: null, engagement: {}, findings: [], networkPicture: { thePicture: PICTURE, whatMatters: [], dataTheyNeed: [], whatWentWrong: [] },
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
};

describe('The shared read of the answers, on the board', () => {
  it('Rukia reads the picture without the sentence that is a reading of Amina', async () => {
    const b = await boardAs(RECORD, ...RUKIA);
    expect(b.whatTheAnswersSay.thePicture).toBe('Most people are behind on payments. Only one person is repaying on time.');
  });
  /*
   * Amina reads all of it, and the sentence about her reads "You", since c86af26f (the reader's own
   * name is served as "you"). This used to expect her to read her own name in the third person, which
   * the 1 October review rules out.
   */
  it('Amina reads all of it, the sentence about her as "you"', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(b.whatTheAnswersSay.thePicture).toBe('Most people are behind on payments. You have no visibility of these facts, and so have understood the problem as one of individual repayment. Only one person is repaying on time.');
  });
});
