import { countCheckableSpecifics } from './conversation.service';
import { stripCloseMarker, SESSION_CLOSE_MARKER } from './prompt-library';

/**
 * GW-GATE tripwires. Every case here is REAL text from a live 12-session run.
 *
 * The old gate counted characters. It rejected two of Nate's genuine check-ins
 * for being "too short" while they named a count, an outcome and a blocker, and
 * it accepted "things are going quite well and the team seems happy" because
 * that happens to be 90 characters. Length was measuring the wrong thing.
 */
/**
 * The gate and the board do DIFFERENT jobs, and conflating them was the bug.
 *  - GATE: did this person answer at all? Stops "ok / yes / fine".
 *  - BOARD: was the answer any good? That is the contribution read's job, and
 *    it now handles it honestly (verifiability, negation, trajectory).
 * Enforcing quality at the gate traps an evasive person until they produce
 * specifics, which is badgering - and it hits the honest person having a bad
 * week exactly as hard.
 */
const gatePasses = (turns: string[]) => {
  const chars = turns.reduce((s, t) => s + t.trim().length, 0);
  const real = turns.filter((t) => t.trim().length >= 12).length;
  return chars >= 50 && real >= 2;
};

describe('GW-GATE: completion is gated on substance, not length', () => {
  it("accepts Nate's terse but specific check-in (the old gate rejected this)", () => {
    expect(gatePasses(['Two more signed this session. That is three paying from me.', 'Working the rest of the queue.', 'Not blocked.'])).toBe(true);
  });

  it('accepts a second real one the old gate rejected', () => {
    expect(gatePasses(['Five paying users. One more to hit my six.', 'Still working the last one, they are in procurement.', 'Not blocked.'])).toBe(true);
  });

  it('lets a vague answer through - the BOARD is where thinness shows, not here', () => {
    // One real sentence is an answer. It is a bad answer, and the contribution
    // read now says so plainly. Blocking it here would badger.
    expect(gatePasses([
      'I think things are going quite well and the team seems happy with progress.',
      'Nothing else really to add this week.',
    ])).toBe(true);
    // ...but the board correctly sees nothing checkable in it.
    expect(countCheckableSpecifics('I think things are going quite well and the team seems happy with progress.')).toBe(0);
  });

  it('rejects an empty record', () => {
    expect(gatePasses(['ok', 'yes', 'fine'])).toBe(false);
  });

  it('lets an evasive person finish, while the board sees straight through it', () => {
    // Blocking someone until they produce specifics is badgering, which the
    // design forbids. Kavon's thinness must surface on the board, not here.
    expect(gatePasses([
      'Yeah it has been a busy few weeks, still pushing on sales.',
      'A few conversations, nothing I can point to as closed yet.',
      'Not really blocked as such, just a lot going on.',
    ])).toBe(true);
    // The board's read of the same words: nothing that could be checked.
    expect(countCheckableSpecifics('A few conversations, nothing I can point to as closed yet.')).toBe(0);
  });

  it('does not count a NEGATED outcome as an achievement (tripwire)', () => {
    // "nothing I can point to as closed" contains "closed". Counting that as a
    // win is how someone who delivered nothing for six weeks scored the same as
    // someone who delivered all quarter.
    expect(countCheckableSpecifics('nothing I can point to as closed yet')).toBe(0);
    expect(countCheckableSpecifics('no new deals signed')).toBe(0);
    expect(countCheckableSpecifics('not blocked')).toBe(0);
    // The positive version still counts.
    expect(countCheckableSpecifics('we signed Loop')).toBeGreaterThan(0);
  });

  it('does not count sentence openers as named entities (tripwire)', () => {
    // "Yeah", "Not", "Same" are not people or organisations.
    expect(countCheckableSpecifics('Yeah. Not really. Same as before.')).toBe(0);
    expect(countCheckableSpecifics('I spoke to Northwind and Beacon today')).toBeGreaterThan(0);
  });

  it('counts numbers written as words, which is how people actually talk', () => {
    expect(countCheckableSpecifics('two more signed')).toBeGreaterThanOrEqual(2);
  });
});

describe('GW-CLOSE: the session-close marker never reaches a person', () => {
  it('strips the marker and reports that it was there', () => {
    const r = stripCloseMarker(`Your record is updated.\n\n${SESSION_CLOSE_MARKER}`);
    expect(r.hadMarker).toBe(true);
    expect(r.text).toBe('Your record is updated.');
    expect(r.text).not.toContain('SESSION_COMPLETE');
  });

  it('leaves an ordinary reply untouched', () => {
    const r = stripCloseMarker('Which of those could actually buy?');
    expect(r.hadMarker).toBe(false);
    expect(r.text).toBe('Which of those could actually buy?');
  });
});
