import { aboutTheToolNotTheWork, theWorkTheySaid, notARemarkAboutUs } from './a-remark-about-the-tool-is-not-the-work';

/**
 * THE FIVE SENTENCES THAT REACHED A BOARD.
 *
 * All five are Hafsah's own, from a live check-in on 23 September 2026. They became a Risk, two
 * Asks, a priority and a tracked blocker on a board meant for an expansion team.
 */
describe('a remark about the tool', () => {
  it('is recognised, in her exact words', () => {
    for (const said of [
      'you didnt even as me what i do, i dont get you saying that goes on the record, what does that mean',
      'can you have the session end please',
      'you are repeating yourself, please end the session',
      'this is meant to be about personal, they told us this so it can be aggregated to form a full picture',
      'what do you mean its not about personal',
      'what went well about my work?',
    ].slice(0, 5)) expect(aboutTheToolNotTheWork(said)).toBe(true);
  });

  it('and in the other shapes people use', () => {
    for (const said of [
      'i said farmers',
      'you already asked me that',
      'why are you asking about volumes',
      'no more questions',
      'are you a bot',
      'that is not what i said',
      'please end this check-in',
    ]) expect(aboutTheToolNotTheWork(said)).toBe(true);
  });
});

/**
 * AND THE FALSE POSITIVE THAT WOULD MATTER MORE THAN THE BUG.
 *
 * A complaint about a colleague, or a fact that happens to use our vocabulary, is the work. Losing
 * one of those from the record is worse than filing a remark: a person's account of what happened
 * would go missing and nobody would know.
 */
describe('and the work is still the work', () => {
  it('when it is about a person who is not us', () => {
    for (const said of [
      'you know Ibrahim never sent the invoice, that is the delay',
      'he keeps repeating himself in stand-ups and nothing moves',
      'I asked the aggregator three times and got nothing',
      'they did not ask us before changing the price',
    ]) expect(aboutTheToolNotTheWork(said)).toBe(false);
  });

  /*
   * THESE FOUR CAME OUT OF A DRY RUN OVER THE WHOLE RECORD BEFORE ANYTHING WAS DELETED.
   *
   * My first version matched `\bi (said|told you)\b` anywhere, which took "I logged the times like
   * I said" (progress), "I said I'd push forward the Client Connect initiative" (a commitment) and
   * "This is what I said last year too" (a worry) - all of them the work. And it read the product's
   * own bracketed annotations, so "[INFERRED: this was the answer to the question...]" made a real
   * expansion plan look like a remark about us. The dry run is why the list below exists.
   */
  it('and when somebody refers to what they said about their work', () => {
    for (const said of [
      'I logged the times like I said.',
      "I said I'd push forward the Client Connect initiative and it is still pending",
      'This is what I said last year too.',
      '[I would expand to] Kogi and Nasarawa. [INFERRED: answer to the question where would you expand]',
    ]) expect(aboutTheToolNotTheWork(said)).toBe(false);
  });

  it('and when it happens to use our words', () => {
    for (const said of [
      'we record every delivery on paper and it gets lost',
      'our sessions with the co-op run every Tuesday',
      'the questions the buyers ask are all about aflatoxin',
      'I plan to run interventions to impact 30k women farmers',
      'about two thousand tonnes a quarter, bought between November and February',
      'no volumes, just increase their incomes by 30%',
      'getting data from the women before and after the intervention',
    ]) expect(aboutTheToolNotTheWork(said)).toBe(false);
  });

  it('and an empty turn is nothing at all', () => {
    expect(aboutTheToolNotTheWork('')).toBe(false);
    expect(aboutTheToolNotTheWork(null)).toBe(false);
  });
});

describe('what the record is built from', () => {
  it('is their work, with the remarks taken out', () => {
    const turns = [
      { content: 'I plan to run interventions to impact 30k women farmers' },
      { content: 'you are repeating yourself, please end the session' },
      { content: 'no volumes, just increase their incomes by 30%' },
      { content: 'can you have the session end please' },
    ];
    expect(theWorkTheySaid(turns).map((t) => t.content)).toEqual([
      'I plan to run interventions to impact 30k women farmers',
      'no volumes, just increase their incomes by 30%',
    ]);
  });

  /* Belt and braces: the extractor is handed only the work, and an entry that quotes a remark
     anyway - by reaching into an AI turn that repeated it back - is dropped on the way out. */
  it('and an entry that quotes one is dropped on the way out', () => {
    const entries = [
      { text: 'Aggregators defaulted after prepayment in 2025' },
      { text: 'you didnt even as me what i do, what does that mean' },
    ];
    expect(notARemarkAboutUs(entries).map((e) => e.text)).toEqual([
      'Aggregators defaulted after prepayment in 2025',
    ]);
  });
});
