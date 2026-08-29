import {
  stillOnboarding, whatIsLeft, sayWhatIsLeft, WINDOW_BACKSTOP_DAYS,
} from './still-finding-their-feet';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const g = (required: boolean, closed: boolean) => ({ required, closed });

describe('the window that suppresses a finding', () => {
  it('is open while a required gate is outstanding', () => {
    expect(stillOnboarding([g(true, false)], daysAgo(3), NOW)).toBe(true);
  });

  it('closes when the gates clear, not when a fortnight passes', () => {
    /* The whole reason to have gates rather than a timer: somebody who has been shown what to do
       is ready, and somebody who has not is not, whatever the calendar says. */
    expect(stillOnboarding([g(true, true), g(true, true)], daysAgo(3), NOW)).toBe(false);
  });

  it('and an optional gate does not hold it open', () => {
    expect(stillOnboarding([g(true, true), g(false, false)], daysAgo(3), NOW)).toBe(false);
  });

  it('but time still bounds it, so onboarding cannot become a permanent excuse', () => {
    /*
     * A gate nobody ever marks done would hold the window open forever, and the person it protects
     * is then somebody nobody has looked at in a year - which is the opposite of protection.
     */
    expect(stillOnboarding([g(true, false)], daysAgo(WINDOW_BACKSTOP_DAYS - 1), NOW)).toBe(true);
    expect(stillOnboarding([g(true, false)], daysAgo(WINDOW_BACKSTOP_DAYS + 1), NOW)).toBe(false);
  });

  it('and somebody with no gates at all is not inside a window', () => {
    /*
     * No track means nothing has been asked of them. Treating an absent track as an open-ended
     * exemption would let one unconfigured role suppress every finding about everybody in it.
     */
    expect(stillOnboarding([], daysAgo(1), NOW)).toBe(false);
  });
});

describe('what is left', () => {
  const gate = (name: string, ordinal: number, required = true, closed = false) =>
    ({ name, ordinal, required, closed });

  it('comes back in the order it was meant to be done', () => {
    const left = whatIsLeft([gate('third', 3), gate('first', 1), gate('second', 2)]);
    expect(left.map((l) => l.name)).toEqual(['first', 'second', 'third']);
  });

  it('and drops what is already through', () => {
    expect(whatIsLeft([gate('done', 1, true, true), gate('todo', 2)]).map((l) => l.name)).toEqual(['todo']);
  });

  it('names the optional ones as optional', () => {
    /* Somebody working through a list treats everything on it as compulsory unless told otherwise,
       and then resents the whole list. */
    const said = sayWhatIsLeft([{ name: 'read the brief', required: true },
      { name: 'meet the team', required: false }], 'Head of Partnerships');
    expect(said).toMatch(/- read the brief\n/);
    expect(said).toMatch(/- meet the team \(optional\)/);
  });

  it('and says so plainly when there is nothing left', () => {
    expect(sayWhatIsLeft([], 'Head of Partnerships'))
      .toBe('You are through everything Head of Partnerships asks for at the start.');
  });
});
