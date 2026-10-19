import { whatTheySaidTheyWouldDo } from './what-the-context-already-holds';
import { whatTheRecordAlreadyHolds } from './what-the-record-already-holds';

/**
 * EACH EARLIER THING REACHES THE MODEL WITH ITS DAY, AND THE MODEL IS TOLD WHAT DAY IT IS (messages test, third run, items 7, 10, 12, 13).
 * Read here as the model reads its prompt, from the runs' own lines, in Nairobi.
 *
 *  - Brian, Monday 12 October: "I will send the draft reply to Wanjiru for her review tomorrow." On Tuesday he was asked "Did you send
 *    it to her yesterday?" and "What made it miss the internal deadline for Wanjiru's review?".
 *  - David, Monday 12 October: "I will finish reviewing the Jamii Clinics bundle by Friday, October 16th." On Wednesday he was asked
 *    "What happened with that review by Friday, October 16th?".
 *  - Aisha, Tuesday 13 October: "I chased their HR manager about them yesterday." On Wednesday she was asked about "chasing them
 *    yesterday".
 */
const ZONE = 'Africa/Nairobi';
const at = (s: string) => new Date(s);

describe('what they said they would do, with the day it was said and the day it was for', () => {
  it("Brian's \"tomorrow\", read on Tuesday, is today", () => {
    const block = whatTheySaidTheyWouldDo([{ text: 'I will send the draft reply to Wanjiru for her review', when: 'tomorrow', saidOn: at('2026-10-12T08:03:05Z') }], { now: at('2026-10-13T08:00:28Z'), zone: ZONE });
    expect(block).toContain('- I will send the draft reply to Wanjiru for her review (said on Monday 12 October, "tomorrow", which is Tuesday 13 October, today)');
  });
  it("David's Friday, read on Wednesday, has not come yet", () => {
    const block = whatTheySaidTheyWouldDo([{ text: 'I will finish reviewing the Jamii Clinics bundle', when: 'by Friday, October 16th', saidOn: at('2026-10-12T08:05:02Z') }], { now: at('2026-10-14T08:04:57Z'), zone: ZONE });
    expect(block).toContain('(said on Monday 12 October, "by Friday, October 16th", which is Friday 16 October, two days from now, so it has not come yet)');
  });
  it('without the days, it reads as before', () => {
    expect(whatTheySaidTheyWouldDo([{ text: 'Call Paul', when: 'tomorrow' }])).toContain('- Call Paul (said: tomorrow)');
  });
});

describe('what this person said last time, with its day, under today', () => {
  it("Aisha's \"yesterday\" is put as said on Tuesday 13 October, and today is Wednesday 14 October", () => {
    const block = whatTheRecordAlreadyHolds({
      targets: [], inTheWay: [], now: at('2026-10-14T08:03:27Z'), zone: ZONE, sayToday: true,
      saidLastTime: ['I chased their HR manager about them yesterday.'], saidLastTimeOn: [at('2026-10-13T03:30:57Z')],
    });
    expect(block.startsWith('TODAY IS Wednesday 14 October. Each earlier thing below says the day it was said. A day somebody named, such as "yesterday", "tomorrow" or "on Friday", is counted from the day they said it, never from today.')).toBe(true);
    expect(block).toContain('- On Tuesday 13 October they said "I chased their HR manager about them yesterday."');
  });
});
