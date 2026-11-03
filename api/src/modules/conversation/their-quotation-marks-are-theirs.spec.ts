import { readFileSync } from 'fs';
import { join } from 'path';
import { ConversationService } from './conversation.service';
import { anAssessmentHolding } from './an-assessment-for-a-spec';
import { RECORD_EXTRACTION_PROMPT } from './prompt-library';
import { READ_WHAT_THEY_PROMISED } from './what-they-said-they-would-do-next';
import { theirQuotationMarksBack } from './their-quotation-marks-are-theirs';
import { saidWordForWord } from '../reports/a-quote-is-what-they-said';

/**
 * THEIR QUOTATION MARKS ARE PART OF THEIR WORDS. All-24 run 12, the two lines word for word: the
 * record reader added marks to Yemi's and changed Amina's. See their-quotation-marks-are-theirs.
 */

const YEMI_TYPED = "Well, I'd look at the regular reports, of course. And my weekly chats with the partner were key to understanding if there were any immediate issues or concerns. On track, for me, meant that there weren't any major disruptions or escalations.";
const YEMI_AS_THE_READER_WROTE_IT = "'On track', for me, meant that there weren't any major disruptions or escalations.";
const YEMIS_WORDS = "On track, for me, meant that there weren't any major disruptions or escalations.";

const AMINA_TYPED = 'I haven\'t explicitly said "get me out of these meetings." I did say he would own the relationships in his interview.';
const AMINA_AS_THE_READER_WROTE_IT = "I haven't explicitly said 'get me out of these meetings.' I did say he would own the relationships in his interview.";

describe('the marks go back to the ones they typed', () => {
  it('Yemi: the marks he never typed come off', () => {
    expect(theirQuotationMarksBack(YEMI_AS_THE_READER_WROTE_IT, [YEMI_TYPED])).toBe(YEMIS_WORDS);
  });

  it('Amina: her double marks come back', () => {
    expect(theirQuotationMarksBack(AMINA_AS_THE_READER_WROTE_IT, [AMINA_TYPED])).toBe(AMINA_TYPED);
  });

  it('and then each line is stamped as their own words, which it was not before', () => {
    expect(saidWordForWord(YEMI_AS_THE_READER_WROTE_IT, [YEMI_TYPED])).toBe(false);
    expect(saidWordForWord(AMINA_AS_THE_READER_WROTE_IT, [AMINA_TYPED])).toBe(false);
    expect(saidWordForWord(theirQuotationMarksBack(YEMI_AS_THE_READER_WROTE_IT, [YEMI_TYPED]), [YEMI_TYPED])).toBe(true);
    expect(saidWordForWord(theirQuotationMarksBack(AMINA_AS_THE_READER_WROTE_IT, [AMINA_TYPED]), [AMINA_TYPED])).toBe(true);
  });

  it('keeps the reader\'s note at the end, and puts it back after their words', () => {
    expect(theirQuotationMarksBack(`${YEMI_AS_THE_READER_WROTE_IT} [INFERRED: about the partner]`, [YEMI_TYPED]))
      .toBe(`${YEMIS_WORDS} [INFERRED: about the partner]`);
  });

  it('leaves a line alone where anything but the marks differs', () => {
    /* A name put in by the reader, a word changed, a clause trimmed: the reader's version, as written. */
    const tidied = "I haven't actually said that exact phrase to him [about taking me out of those meetings].";
    expect(theirQuotationMarksBack(tidied, ["I haven't actually said that exact phrase to him."])).toBe(tidied);
    expect(theirQuotationMarksBack("'On track' meant no major escalations.", [YEMI_TYPED])).toBe("'On track' meant no major escalations.");
    expect(theirQuotationMarksBack("'on track', for me, meant that there weren't any major disruptions or escalations.", [YEMI_TYPED]))
      .toBe("'on track', for me, meant that there weren't any major disruptions or escalations.");
  });

  it('treats an apostrophe as part of the word, and never matches inside a word', () => {
    expect(theirQuotationMarksBack('We don’t have the numbers.', ["We don't have the numbers."])).toBe("We don't have the numbers.");
    expect(theirQuotationMarksBack("'track'", ['keeping things on tracking'])).toBe("'track'");
  });

  it('a line already in their marks stays exactly as it is', () => {
    expect(theirQuotationMarksBack(AMINA_TYPED, [AMINA_TYPED])).toBe(AMINA_TYPED);
    expect(theirQuotationMarksBack(YEMIS_WORDS, [YEMI_TYPED])).toBe(YEMIS_WORDS);
  });
});

describe('the extractor keeps their marks, told and checked', () => {
  it('is told, in both readers that write what people said', () => {
    expect(RECORD_EXTRACTION_PROMPT).toContain('Keep every quotation mark exactly as they typed it.');
    expect(RECORD_EXTRACTION_PROMPT).toContain('never change double marks to single ones');
    expect(READ_WHAT_THEY_PROMISED).toContain('Keep their punctuation and their quotation marks exactly as they typed them');
  });

  /* Changed in F5: the end card's own model read is gone; the one owner of the record's lines gives every line their marks back. */
  it('the one owner of the record\'s lines gives them their marks back', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
    const owner = src.slice(src.indexOf('private async theRecordLinesFromTheAssessment('), src.indexOf('private async theAssessmentAtTheClose('));
    expect(owner).toContain('theirQuotationMarksBack(theLineWithoutItsDanglingJoin(l.text), whatTheyTyped)');
  });

  /* Changed for one source, part 2: the lines reach the record from the conversation's assessment, by its one writer, which keeps
     the same marks rule; the assessment's words are fed in here the way the record reader's text was. */
  it('stores Yemi\'s and Amina\'s lines in their own marks, stamped as their words', async () => {
    const stored: any[] = [];
    const svc = Object.create(ConversationService.prototype) as any;
    svc.logger = { log: () => undefined, warn: () => undefined };
    svc.prisma = {
      conversationTurn: { findMany: async () => [{ id: 't2', role: 'PERSON', content: YEMI_TYPED }, { id: 't4', role: 'PERSON', content: AMINA_TYPED }] },
      recordEntry: { findMany: async () => [], createMany: async ({ data }: any) => { stored.push(...data); return { count: data.length }; } },
    };
    const a: any = anAssessmentHolding();
    a.messages = [{ n: 1, turnId: 't2', where: 'check-in', at: null }, { n: 2, turnId: 't4', where: 'check-in', at: null }];
    a.targets = [{ id: 'r1.targets.0', words: YEMI_AS_THE_READER_WROTE_IT, from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: false }];
    a.claims = [{ id: 'r1.claims.0', words: AMINA_AS_THE_READER_WROTE_IT, from: [2], whoMaySee: 'the people in this check-in', saidWordForWord: false }];
    await svc.writeTheRecordFromTheAssessment({ id: 'c1', participantId: 'p1', groundId: 'g1' }, a);
    expect(stored.map((r) => [r.text, r.saidWordForWord])).toEqual([
      [YEMIS_WORDS, true],
      [AMINA_TYPED, true],
    ]);
  });
});
