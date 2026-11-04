/**
 * The last thing about a check-in that was a button and not a sentence.
 */
import { route } from './the-router-is-deterministic';
import { whatItTakesToStart } from './what-it-takes-to-start';

describe('asking to start one', () => {
  it.each([
    'start my check-in',
    'can I start my check-in',
    'set up a check-in',
    'open the session',
    "I'm ready to start my check-in",
  ])('takes "%s"', (m) => {
    expect(route(m).lane).toBe('start_a_check_in');
  });

  it.each([
    'what is my check-in about',
    'when is the next session',
    'who is in the check-in',
    /* One word apart from "start my check-in", and a question about the product
       rather than a request to start one. Caught by the guard that pins this
       next to `how_we_work`. */
    'how do I run a check-in',
    'how does a check-in work',
  ])(
    'and leaves "%s" to the lanes that answer questions',
    (m) => {
      expect(route(m).lane).not.toBe('start_a_check_in');
    },
  );

  it('and wins over the objective lane when somebody names a check-in', () => {
    /* "set up a check-in about our objectives" is a request to start a session,
       and reads to the objective lane as a request to write an objective. The
       more specific thing somebody named is the thing they asked for. */
    expect(route('set up a check-in about our objectives').lane).toBe('start_a_check_in');
  });
});

describe('what it takes to start', () => {
  const none = { toStart: [], open: [], notAccepted: [] };

  it('offers starting the thing set up for them first', () => {
    /* Until that happens nothing on it exists for anybody, so it unblocks other
       people and not only themselves. */
    const said = whatItTakesToStart({
      ...none,
      toStart: [{ groundId: 'g1', label: 'September sprint' }],
      open: [{ checkInId: 'c1', label: 'Something else' }],
    });
    expect(said.act).toEqual({ kind: 'confirm_a_check_in', id: 'g1', label: 'Start it' });
    expect(said.line).toContain('has not begun');
  });

  it('then a session already open to them', () => {
    const said = whatItTakesToStart({ ...none, open: [{ checkInId: 'c1', label: 'September sprint' }] });
    expect(said.act).toEqual({ kind: 'open_a_check_in', id: 'c1', label: 'Open it' });
    expect(said.line).toContain('about ten minutes');
  });

  it('names the others without offering them', () => {
    /* A list of buttons hands the decision about which to do first back to
       somebody who asked the product to get on with it. */
    const said = whatItTakesToStart({
      ...none,
      toStart: [
        { groundId: 'g1', label: 'One' },
        { groundId: 'g2', label: 'Two' },
      ],
    });
    expect(said.act!.id).toBe('g1');
    expect(said.line).toContain('"Two"');
  });

  it('says why an unopenable session is unopenable, and offers nothing', () => {
    const said = whatItTakesToStart({ ...none, notAccepted: [{ label: 'September sprint' }] });
    expect(said.act).toBeNull();
    expect(said.line).toContain('not something I can do for you');
  });

  it('and says nothing is waiting in a way that does not read as a refusal', () => {
    const said = whatItTakesToStart(none);
    expect(said.act).toBeNull();
    expect(said.line).toContain('I will tell you the moment there is');
    expect(said.line).not.toMatch(/cannot|sorry|unable/i);
  });
});

describe('asking how something in this company works', () => {
  /**
   * FOUND THE DAY THE COMPANY'S OWN DECISIONS WERE FIRST PUSHED IN.
   *
   * Four cards landed, retrieval found them, and two of the three questions
   * anybody would actually ask went to the default lane — because `how_we_work`
   * owned "how do we" and "how do I" and neither shape covers a question about a
   * THING rather than about doing something.
   */
  it.each([
    'how does the freeze work',
    'how do the phases work',
    'how does our pricing work',
    'how do the objectives work',
  ])('routes "%s" to what the organisation has written down', (m) => {
    expect(route(m).lane).toBe('how_we_work');
  });

  it('but not a bare "how", which belongs to somebody\'s own standing', () => {
    /* "How am I doing" is a question about them, with a lane of its own. A bare
       `how` in this rule would have taken it. */
    expect(route('how am I doing').lane).toBe('how_am_i_doing');
    expect(route('how are things going for me').lane).not.toBe('how_we_work');
  });
});
