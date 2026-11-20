import { asADayPeopleSay, theFullBriefing } from './the-assembly-digest';
import { mightBeARequest, readARequestPlainly, REQUEST_PROMPT } from './the-work-reader';

/**
 * FATIMA ROUND 4, ZAINAB (N28) AND UCHE (issue 12). "Give me Folake's day." on WhatsApp was not understood for an assistant who acts for six people (it was answered with
 * "I can tell you what has been sent or said"), and a briefing said "dated 2026-12-01" in a plain mail. Both are printed as a person reads them.
 */
describe('"give me <name>\'s day" is a request for that person\'s day', () => {
  it.each(["Give me Folake's day.", "Give me Folake Adeyinka's day.", "Show me Folake Adeyinka's day", "Tell me Zainab's day"])('%s', (words) => {
    expect(mightBeARequest(words)).toBe(true);
    expect(readARequestPlainly(words)).toEqual({ kind: 'my_day' });
  });
  it('the model that reads it is told that the day of the person she acts for, by name, is the day', () => {
    expect(REQUEST_PROMPT).toMatch(/give me Folake's day[^]*Folake Adeyinka's day[^]*all my_day/);
  });
});

describe('a date in a plain mail reads as a person says it', () => {
  it('"2026-12-01" is "1 December", and another year keeps its year', () => {
    expect(asADayPeopleSay('2026-12-01', 2026)).toBe('1 December');
    expect(asADayPeopleSay('2026-12-01', 2027)).toBe('1 December 2026');
    expect(asADayPeopleSay('the first of December', 2026)).toBe('the first of December');
  });
  it('the briefing says "dated 1 December", never "dated 2026-12-01"', () => {
    const text = theFullBriefing({
      institution: 'Senate', weekKey: '2026-W49', forwardedOn: new Date('2026-12-04T09:00:00Z'), fileName: 'week-49.txt',
      developments: [{ title: 'The Senate moved the second hearing to Tuesday 24 November', said: 'The hearing moved.', quote: 'moved the second hearing to Tuesday 24 November', date: '2026-12-01', relatedKeys: [] }],
      comparison: { each: [{ kind: 'new' }], notMentioned: [], hadEarlier: false } as any, touches: null, followUps: [], reportDate: new Date('2026-12-04T00:00:00Z'), alreadyHad: false,
    });
    console.log(`SHE READS\n${text}`);
    expect(text).toContain('dated 1 December.');
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
