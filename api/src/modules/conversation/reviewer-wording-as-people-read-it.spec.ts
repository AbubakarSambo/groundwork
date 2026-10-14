import { isWhatSomebodyDoesNotAnAim } from './what-somebody-does-is-not-an-aim';
import { whatTheyAskedFor } from '../entry/what-they-asked-for-in-so-many-words';
import { theContextWeHave } from '../documents/what-a-document-holds';
import { forEveryoneSentence, forOnePersonSentence } from '../documents/a-document-read-item-by-item';
import { whenItWasFor } from '../grounds/a-day-said-is-read-on-the-day-it-was-said';
import { theDayKeptApart } from '../board/an-aim-is-a-sentence-about-somebody';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * REVIEWER, 14 OCTOBER: WORDING, AS EACH PERSON READS IT.
 */
const withoutComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('what somebody is doing is not kept as an aim', () => {
  it('"Grace is working on the Kilele account." is not an aim; aims with a number or no person are', () => {
    expect(isWhatSomebodyDoesNotAnAim({ name: 'Grace is working on the Kilele account.', target: null })).toBe(true);
    expect(isWhatSomebodyDoesNotAnAim({ name: 'Kevin Omondi is handling Greenfield.', target: null })).toBe(true);
    expect(isWhatSomebodyDoesNotAnAim({ name: 'Close 300 units this quarter.', target: 300 })).toBe(false);
    expect(isWhatSomebodyDoesNotAnAim({ name: 'The team is aiming to close 300 units this quarter.', target: 300 })).toBe(false);
    expect(isWhatSomebodyDoesNotAnAim({ name: 'Every shop in Westlands pays on time.', target: null })).toBe(false);
  });
  it('the check-in\'s aims go through it before they are written', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/\.filter\(\(a\) => !isWhatSomebodyDoesNotAnAim\(a\)\)/);
  });
});

describe('a name said with "Call it" never swallows the schedule', () => {
  it.each([
    ['Call it Litigation daily, start now, every day, no end.', 'Litigation daily'],
    ['Call it Sales team, Q4', 'Sales team, Q4'],
    ['Call it New starter onboarding and start it now', 'New starter onboarding'],
    ['Call it Field visits - every Monday until December', 'Field visits'],
  ])('"%s" is named "%s"', (said, name) => {
    expect(whatTheyAskedFor([said]).name).toBe(name);
  });
});

describe('a target whose name says "target" is said once, with its unit', () => {
  const held: any = {
    fileName: 'q4-sales-targets.xlsx', whatItIs: 'It is a Q4 sales target sheet.', dates: [], unmatched: [],
    forEverybody: [{ what: 'Q4 target (units)', target: 300 }],
    forOnePerson: [{ who: 'Kevin Omondi', what: 'Q4 target (units)', target: 120, ownerParticipantId: 'p-kevin' }, { who: 'Mercy Wairimu', what: 'Q4 target (units)', target: 100, ownerParticipantId: 'p-mercy' }],
  };
  it('as the lead reads it', () => {
    const said = theContextWeHave(held)!;
    expect(said).toContain('For everyone in this check-in, the Q4 target is 300 units.');
    expect(said).toContain("Kevin Omondi's Q4 target is 120 units.");
    expect(said).not.toMatch(/target for Q4 target/);
  });
  it('as Kevin reads it', () => {
    expect(theContextWeHave(held, { reader: { participantId: 'p-kevin', name: 'Kevin Omondi' } as any })).toContain('Your Q4 target is 120 units.');
  });
  it('item by item, and a name without "target" reads as before', () => {
    const n = (x: number) => String(x);
    expect(forEveryoneSentence({ what: 'Q4 target (units)', target: 300 }, n)).toBe('For everyone in this check-in, the Q4 target is 300 units.');
    expect(forOnePersonSentence({ who: 'Kevin Omondi', what: 'Q4 target (units)', target: 120 }, n)).toBe("Kevin Omondi's Q4 target is 120 units.");
    expect(forEveryoneSentence({ what: 'cookers delivered', target: 30 }, n)).toBe('For everyone in this check-in, the target for cookers delivered is 30.');
  });
});

describe('"tomorrow" is read on the day it was said', () => {
  const said = new Date('2026-10-14T09:00:00Z');
  it('three days later an open promise says it was due, and before then it says the day', () => {
    expect(whenItWasFor('tomorrow', said, new Date('2026-10-17T09:00:00Z'))).toBe('It was due on 15 October.');
    expect(whenItWasFor('tomorrow', said, new Date('2026-10-15T09:00:00Z'))).toBe('today');
    expect(whenItWasFor('tomorrow', said, new Date('2026-10-14T12:00:00Z'))).toBe('15 October');
    expect(whenItWasFor('soon', said, new Date('2026-10-17T09:00:00Z'))).toBe('soon');
  });
  it('an aim said with "tomorrow" at its end keeps the day apart, so the board can say it is past due', () => {
    const kept = theDayKeptApart('I will visit two shops in Westlands tomorrow.', (w) => theDayTheyMeant(w, said));
    expect(kept.name).toBe('I will visit two shops in Westlands');
    expect(kept.dueOn?.toISOString().slice(0, 10)).toBe('2026-10-15');
  });
});
