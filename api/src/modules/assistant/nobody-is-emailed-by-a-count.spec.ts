/**
 * THE FIRST CAPABILITY THAT EMAILS PEOPLE.
 *
 * Everything else the assistant does is recoverable — a wrong answer is
 * corrected in the next sentence. An invitation is in somebody's inbox, and what
 * it invites them to is accounting for themselves.
 */
import { askWhoIsInIt, saidBack, theNextStep } from './a-check-in-set-up-by-talking';
import {
  askWhichSituation,
  saidAsAList,
  whichSituation,
  whoWouldBeAsked,
  whyItCannotBeOpened,
} from './what-a-new-check-in-would-be';

const person = (externalId: string, displayName: string, managerExternalId: string | null = null) => ({
  externalId,
  displayName,
  managerExternalId,
  active: true,
});

describe('which situation they described', () => {
  it.each([
    ['someone is joining next month', 'NEW_HIRE'],
    ['we are kicking off a new project', 'NEW_PROJECT'],
    ['the delivery has gone off track', 'DRIFT'],
    ['the team see it differently', 'REALIGN_TEAM'],
    ['a role is changing hands', 'ROLE_HANDOVER'],
  ])('reads "%s" as %s', (said, scenario) => {
    expect(whichSituation(said)).toEqual(expect.objectContaining({ scenario }));
  });

  it('asks rather than choosing when two fit equally', () => {
    /**
     * "The new project's objectives" is both, and they are different interviews.
     * Picking the one listed first produces a session that asks the wrong
     * questions, which is worse than asking which it is.
     */
    const read = whichSituation("the new project's objectives") as { ambiguous: unknown[] };
    expect(read.ambiguous.length).toBeGreaterThan(1);
    expect(askWhichSituation(read.ambiguous as never)).toContain('different conversations');
  });

  it('and asks plainly when nothing fits', () => {
    expect(whichSituation('something about the thing')).toBeNull();
    expect(askWhichSituation()).toContain('What is it about?');
  });
});

describe('who would be asked', () => {
  const roster = [
    person('sam', 'Sam'),
    person('adam', 'Adam', 'sam'),
    person('kemi', 'Kemi', 'sam'),
    person('other', 'Other', 'someone-else'),
  ];

  it('is the people who report to them', () => {
    expect(whoWouldBeAsked(roster, 'sam').map((p) => p.externalId)).toEqual(['adam', 'kemi']);
  });

  it('and never themselves', () => {
    expect(whoWouldBeAsked([...roster, person('sam', 'Sam', 'sam')], 'sam').map((p) => p.externalId))
      .not.toContain('sam');
  });
});

/* Batch S, S6 (19 November): askBeforeOpeningIt is replaced by the check-in setup by talking (a-check-in-set-up-by-talking.ts), which asks
   for the people instead of only telling the lead to. The same four promises are checked on its say-back and its question about people. */
describe('the confirmation', () => {
  const people = [{ name: 'Adam', email: 'adam@x.co' }, { name: 'Kemi', email: 'kemi@x.co' }];
  const back = saidBack({ updatesOn: 'Adam joining', people, unreachable: [], offered: [], cadence: 'WEEKLY', asked: 'confirm' });

  it('names every single person who will be emailed', () => {
    expect(back).toContain('Adam (adam@x.co) and Kemi (kemi@x.co)');
    expect(back).not.toMatch(/\d+ others?|and others/);
  });

  it('and says they will be emailed, before anything is', () => {
    expect(back).toContain('emailed an invitation');
    expect(back).toContain('Shall I open it?');
  });

  it('and offers the people on the roster as a guess, never takes them', () => {
    expect(askWhoIsInIt(people)).toContain('Adam and Kemi report to you, so say yes to ask all of them. Or give me');
  });

  it('and asks who, rather than opening an empty one', () => {
    const next = theNextStep({ updatesOn: 'x', people: [], unreachable: [], offered: [], cadence: 'WEEKLY', asked: 'people' });
    expect(next.asked).toBe('people');
    expect(next.says).toContain('Who should be in it');
    expect(next.says).not.toContain('Shall I open it?');
  });

  it('and reads as a sentence however many there are', () => {
    expect(saidAsAList(['Adam'])).toBe('Adam');
    expect(saidAsAList(['Adam', 'Kemi'])).toBe('Adam and Kemi');
    expect(saidAsAList(['Adam', 'Kemi', 'Sam'])).toBe('Adam, Kemi and Sam');
  });
});

describe('what it refuses', () => {
  it('an unnamed check-in', () => {
    expect(whyItCannotBeOpened({ label: null, people: 2 })).toContain('recognise in a list');
  });

  it('and one with nobody in it but them', () => {
    expect(whyItCannotBeOpened({ label: 'A real name', people: 0 })).toContain('other than you');
  });

  it('and nothing else', () => {
    expect(whyItCannotBeOpened({ label: 'A real name', people: 2 })).toBeNull();
  });
});

describe('opening one is the same capability as starting one', () => {
  const { route } = require('./the-router-is-deterministic');
  const { CAPABILITY_BY_KEY } = require('./what-the-assistant-can-do');

  it('so nobody has to know whether the thing they want already exists', () => {
    /**
     * A second lane claiming "set up a check-in" would have been the fifth
     * collision of the week — the registry says these words are already owned,
     * and the person saying them does not know or care which case they are in.
     */
    expect(route('set up a check-in').lane).toBe('start_a_check_in');
    expect(route('start my check-in').lane).toBe('start_a_check_in');
    expect(CAPABILITY_BY_KEY.get('start_a_check_in').does).toContain('open a new one');
  });
});

/* Batch S, S6: the opening is now openTheCheckInSetUpByTalking, which the setup reaches only on a yes to a say-back that names everybody. The same
   guards are read from it: the roster is read again, anybody who has gone is named, and nothing is sent when nobody can be reached. */
describe('between the offer and the yes', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs
    .readFileSync(path.join(__dirname, 'assistant.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const branch = source.slice(
    source.indexOf('private async openTheCheckInSetUpByTalking'),
    source.indexOf('private async resolveParkedDocument'),
  );

  it('the roster is read again, not taken from the proposal', () => {
    expect(branch.length).toBeGreaterThan(400);
    expect(branch).toMatch(/person\.findMany/);
    expect(branch).toMatch(/active: false/);
  });

  it('and anybody who has gone is named, not silently skipped', () => {
    expect(branch).toMatch(/no longer on the roster/);
    expect(branch).toMatch(/was not invited/);
  });

  it('and nothing is sent when nobody can be reached', () => {
    expect(branch).toMatch(/none of those people can be reached now/);
  });
});

describe('a yes with nobody named', () => {
  it('has nothing to say yes to: the say-back is never reached with nobody in it', () => {
    expect(theNextStep({ updatesOn: 'x', people: [], unreachable: [], offered: [{ name: 'Adam', email: 'a@x.co' }], cadence: 'WEEKLY', asked: 'people' }).asked).toBe('people');
    expect(theNextStep({ updatesOn: 'x', people: [], unreachable: ['Adam'], offered: [], cadence: 'WEEKLY', asked: 'people' }).asked).toBe('people');
  });
});
