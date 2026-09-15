import { readFileSync } from 'fs';
import { join } from 'path';
import { whatToDoAboutTheirDeadline } from './a-period-is-not-a-day';

/*
 * "If i say end of year it should rrespond with december? what date?"
 *
 * Her instruction on deadlines was always two halves - "yes infer a date but be sure to probe for
 * details in the engine" - and only the inferring was wired. The probe existed, with two specs and
 * no callers.
 */
describe('a period is not a day', () => {
  const on = new Date(Date.UTC(2026, 8, 15));

  it('says the date a period means and checks it, which is what she asked for', () => {
    const out = whatToDoAboutTheirDeadline('we want it done by the end of the year', on)!;
    expect(out).toContain('31 December 2026');
    expect(out).toMatch(/end of the year - so 31 December 2026\?/);
    expect(out).toMatch(/Ask once/);
  });

  it('and the same for a month or a quarter', () => {
    expect(whatToDoAboutTheirDeadline('finish by end of October', on)).toContain('31 October 2026');
    expect(whatToDoAboutTheirDeadline('we will deliver this quarter', on)).toBeTruthy();
  });

  it('asks openly where the words carry no date at all', () => {
    const out = whatToDoAboutTheirDeadline('I will get the forecast to her soon', on)!;
    expect(out).toMatch(/does not carry a date/);
    expect(out).toMatch(/Ask which day that is/);
    /* Her rule, already in that instruction: not everything has a date and pressing is worse. */
    expect(out).toMatch(/accept "there is not a date yet" as an answer/);
  });

  it('says nothing about a day they actually named', () => {
    expect(whatToDoAboutTheirDeadline('by december 1 2026', on)).toBeNull();
    expect(whatToDoAboutTheirDeadline('It will be done by the 15th of May of 2027.', on)).toBeNull();
  });

  it('and nothing about a sentence that is not a promise', () => {
    /* "Soon" in a sentence about how somebody is settling in is not a deadline. */
    expect(whatToDoAboutTheirDeadline('she is settling in and it will feel normal soon enough', on)).toBeNull();
    expect(whatToDoAboutTheirDeadline('nothing much to report', on)).toBeNull();
  });

  it('reaches the live turn, appended to the prompt rather than run as a retry', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const aboutTheirDeadline = whatToDoAboutTheirDeadline\(message, new Date\(\)\)/);
    expect(src).toMatch(/const fullSystem = aboutTheirDeadline \? `\$\{composed\}/);
  });

  it('and the probe that had two specs and no callers now has one', () => {
    const src = readFileSync(join(__dirname, 'a-period-is-not-a-day.ts'), 'utf8');
    expect(src).toMatch(/askWhenTheyMean\(vague\)/);
  });
});

/*
 * The instruction alone lost twice on live turns - the reply asked whether the pricing was somebody
 * else's job, then what would tell them the contracts were closed. Both decent questions, neither
 * with a date in it. There is a note in this codebase saying the prompt-wording route is exhausted
 * for dates; this is the same shape, so it is checked.
 */
describe('and the check that it actually said the date', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { theDateItHadToSay, didNotSayTheDate, SAY_THE_DATE } = require('./a-period-is-not-a-day');
  const on = new Date(Date.UTC(2026, 8, 15));

  it('knows the date the reply owed them', () => {
    expect(theDateItHadToSay('closed by the end of the year', on)).toBe('31 December 2026');
    expect(theDateItHadToSay('by december 1 2026', on)).toBeNull();
  });

  it('spots a reply that left it out, which is what happened twice', () => {
    expect(didNotSayTheDate('That second part - is that something you are responsible for?', '31 December 2026')).toBe(true);
    expect(didNotSayTheDate('What would tell you they are genuinely closed?', '31 December 2026')).toBe(true);
  });

  it('and accepts it however it is written', () => {
    expect(didNotSayTheDate('End of the year - so 31 December 2026?', '31 December 2026')).toBe(false);
    /* Without the year, which is how people write it. */
    expect(didNotSayTheDate('So 31 December, then?', '31 December 2026')).toBe(false);
  });

  it('the second ask is the question and nothing else', () => {
    const ask = SAY_THE_DATE('end of the year', '31 December 2026');
    expect(ask).toMatch(/"end of the year - so 31 December 2026\?"/);
    expect(ask).toMatch(/Nothing before it, no second question after it/);
    expect(ask).toMatch(/Saying the date is not repeating them back/);
  });
});
