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
    expect(out).toMatch(/When you say end of the year, do you mean 31 December 2026\?/);
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
    expect(src).toMatch(/const aboutTheirDeadline = whatToDoAboutTheirDeadline\(message, new Date\(\), repliesInThisCheckIn\)/);
    /* The prompt is now assembled from the composed blocks plus whatever this turn owes them - the
       deadline question and, since the same day, the numbers question. Both are about what the
       PERSON said, which is why they are appended here rather than run as retries afterwards. */
    /* The team baseline is the one conversation that leaves it out: it learns how their work looks and does not turn a period they gave into a date to confirm. */
    expect(src).toMatch(/const fullSystem = \[composed, (?:inTheBaseline \? null : )?aboutTheirDeadline/);
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
    expect(ask).toMatch(/"When you say end of the year, do you mean 31 December 2026\?"/);
    expect(ask).toMatch(/Nothing before it, no second question after it/);
    expect(ask).toMatch(/Saying the date is not repeating them back/);
  });
});

/*
 * "BY THE END OF Q4" AND "IN H1" WENT STRAIGHT THROUGH.
 *
 * 3.5 on her list: "This quarter", "end of Q4", "H1" need a financial year the product does not
 * have. The first was already caught and asked about. The other two carried no vague word and
 * matched no phrase, so a deadline nobody can be early or late against went onto the record with
 * no question asked.
 *
 * They get no reading on purpose. Q4 ends in December, March or June depending on the
 * organisation, and guessing one is the fault this whole file exists to refuse.
 */
describe('a quarter and a half are periods too', () => {
  const on = new Date('2026-09-16T00:00:00Z');
  const { whatToDoAboutTheirDeadline: whatToDo } = require('./a-period-is-not-a-day');

  it('asks which day, rather than reading a financial year nobody gave', () => {
    for (const said of ['by the end of Q4', 'in H1', 'we close 12 deals in q2', 'our h2 target is 300']) {
      const out = whatToDo(said, on);
      expect(out).toBeTruthy();
      expect(out).toMatch(/does not carry a date/);
      /* And never a guessed day. */
      expect(out).not.toMatch(/December 2026|March 2027|June 2027/);
    }
  });

  it('and leaves alone the words that only look like one', () => {
    for (const said of ['the qa team is behind', 'high quality work', 'we use HQ for that', 'the h1 heading is wrong']) {
      expect(whatToDo(said, on)).toBeNull();
    }
  });
});
