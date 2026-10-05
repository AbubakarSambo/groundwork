import { thePictureInstruction } from './the-picture-in-plain-sentences';

/**
 * THE JUDGEMENT COULD NOT NAME THE CEO BECAUSE NOTHING IT WAS GIVEN MENTIONED HIM.
 *
 * The realign scenario's right answer is that two of three engineers were steered by the chief
 * executive directly, in conversations the team lead does not know happened. The judgement said
 * instead that the team were working on different things - which is true, and misses the reason.
 *
 * My first guess was that a new rule in the judgement instruction was crowding it out. Tested by
 * running the judgement on the same material under three different instructions, four samples
 * each: the CEO appeared 0 times out of 12. Not the instruction. The material.
 *
 * The record holds it. Two entries, in the engineers' own words: "The CEO asked me to on September
 * 2nd and said it was urgent", "The CEO mentioned it to me. He said it would really move the
 * needle." Their per-person paragraph came out as "their goal is for the referral scheme to be
 * live, and they began work on it on September 2nd" - the work, the date, and not who asked. The
 * judgement is built from those paragraphs, so by then the fact was gone.
 *
 * On the prompt, because the prompt is where it was missing.
 */
describe('a person’s paragraph keeps who asked them for the work', () => {
  const it_ = thePictureInstruction({ peopleAnswered: 4, peopleExpected: 4, differenceTopics: [], aboutOnePerson: false });
  /* The prompt is wrapped, so sentences are matched with line breaks flattened. */
  const flat = it_.replace(/\s+/g, ' ');

  it('asks for the reason they are doing this rather than something else', () => {
    expect(flat).toContain('AND WHO ASKED THEM FOR IT, WHERE THEY SAID');
    expect(flat).toContain('a person who asked them, a request, an instruction, a conversation');
  });

  it('says why it is the fact most easily lost, rather than just listing it', () => {
    expect(flat).toContain('it sits next to the work rather than in it');
  });

  it('carries the paragraph that actually dropped it', () => {
    expect(flat).toContain('the work, the date, and not a word about who asked');
    expect(flat).toContain('Keep the work AND keep who asked for it');
  });

  it('names the consequence, which is that the report accuses the wrong people', () => {
    expect(flat).toContain('three people ignoring their lead, when the record says they were following somebody else');
  });

  it('sits with the per-person paragraph rule, not somewhere else in the prompt', () => {
    const para = it_.indexOf('ONE PARAGRAPH PER PERSON');
    const who = it_.indexOf('AND WHO ASKED THEM FOR IT');
    const headline = it_.indexOf('AND A HEADLINE PER PERSON');
    expect(para).toBeGreaterThan(-1);
    expect(who).toBeGreaterThan(para);
    expect(who).toBeLessThan(headline);
  });
});

/**
 * THE PROSPECT'S NEED, PUT IN MARTIN'S MOUTH (run 32, the discovery participant's report).
 *
 * Martin told the check-in what a prospect had said. His own paragraph came back: "You are a
 * solutions engineer, and you want to expand your use of data analytics... You are worried that
 * you will not be able to hire enough analysts to do the work." The prospect's job, wish and worry,
 * all written as Martin's.
 *
 * Same fault as the judgement's "Make the decision about hiring more analysts", one layer earlier.
 */
describe('what somebody reports about a customer stays the customer’s', () => {
  const it_ = thePictureInstruction({ peopleAnswered: 2, peopleExpected: 2, differenceTopics: [], aboutOnePerson: false });
  const flat2 = it_.replace(/\s+/g, ' ');

  it('says it, and names the people outside a check-in it covers', () => {
    expect(flat2).toContain("WHAT SOMEBODY REPORTS ABOUT A CUSTOMER STAYS THE CUSTOMER'S");
    expect(flat2).toContain('a customer, a supplier, a partner or anybody outside this check-in');
  });

  it('shows the sentence both ways, which is the only way the rule is usable', () => {
    expect(flat2).toContain('"Martin says the customer cannot hire enough analysts", never "Martin cannot hire enough analysts"');
  });

  it('says what to do when it cannot be told apart', () => {
    expect(flat2).toContain('it is theirs to report and not theirs to own');
  });
});
