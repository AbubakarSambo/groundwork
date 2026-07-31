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
const MIN = 2;
const pass = (turns: string[]) => {
  const chars = turns.reduce((s, t) => s + t.trim().length, 0);
  return chars >= 50 && countCheckableSpecifics(turns.join(' \n ')) >= MIN;
};

describe('GW-GATE: completion is gated on substance, not length', () => {
  it("accepts Nate's terse but specific check-in (the old gate rejected this)", () => {
    expect(pass(['Two more signed this session. That is three paying from me.', 'Working the rest of the queue.', 'Not blocked.'])).toBe(true);
  });

  it('accepts a second real one the old gate rejected', () => {
    expect(pass(['Five paying users. One more to hit my six.', 'Still working the last one, they are in procurement.', 'Not blocked.'])).toBe(true);
  });

  it('rejects long and vague (the old gate accepted this on length alone)', () => {
    expect(pass(['I think things are going quite well and the team seems happy with how it is all progressing overall really.'])).toBe(false);
  });

  it('rejects an empty record', () => {
    expect(pass(['ok', 'yes', 'fine'])).toBe(false);
  });

  it('still lets an evasive person finish - a thin account is the board\'s job, not a trap', () => {
    // Blocking someone until they produce specifics is badgering, which the
    // design forbids. Kavon's thinness must surface on the board, not here.
    expect(pass([
      'Yeah it has been a busy few weeks, still pushing on sales.',
      'A few conversations, nothing I can point to as closed yet.',
      'Not really blocked as such, just a lot going on.',
    ])).toBe(true);
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
