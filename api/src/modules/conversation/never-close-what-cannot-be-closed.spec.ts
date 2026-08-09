import { closeReadiness } from './close-readiness';

/**
 * THE ENGINE MUST NOT OFFER TO CLOSE SOMETHING THE SERVER WILL REFUSE.
 *
 * complete() enforces a floor: three answers on a normal check-in, one on a
 * correction. That floor knew nothing about the close gate, and the close gate
 * knew nothing about the floor, so a person could land between them:
 *
 *   the engine decides it has enough after two answers
 *   -> it signals the close
 *   -> the client disables the composer, because the session is over
 *   -> the person presses finish
 *   -> the server refuses: "A few more exchanges are needed before this
 *      check-in can close - the record is still thin. Answer one or two more
 *      questions, then complete."
 *   -> there is no way to answer. The input is gone.
 *
 * A DEADLOCK, not friction. Seen on live Ground 1 runs, repeatedly, and it
 * stopped several of them dead at session 1.
 *
 * WHO IT HITS IS THE UNCOMFORTABLE PART. This gate releases a close as soon as
 * anything checkable exists, so a dense first answer clears it immediately:
 *
 *   "Abubakar. He's joining as a delivery lead, starting Monday. I'm the ops
 *    admin setting this up, but Hafsah is his manager and should run it. Run it
 *    for 90 days with weekly check-ins."
 *
 * A name, a role, a start day, a duration and a rhythm, all in one breath. The
 * engine wraps on the next turn, and the person who gave the BEST opening answer
 * is the one who gets stuck. The original gate was written because thin records
 * closed too easily; this is the same fault arriving from the other direction.
 *
 * The trap was already known. The comment above complete()'s floor describes it
 * exactly - "the AI signals done, the input disables, but completion 400s for a
 * turn the person can no longer add" - and it was fixed there for corrections by
 * relaxing the floor, and left standing on the normal path.
 *
 * One number now, consulted in one place: the floor governs the close signal as
 * well as the close itself.
 */

describe('the close signal respects the floor that completion enforces', () => {
  it('does not signal a close on two answers when three are required', () => {
    // THE DEADLOCK. Both answers are rich, so the checkable-content rule would
    // release the close, and the server would then refuse it.
    const turns = [
      "Abubakar. He's joining as a delivery lead, starting Monday. Run it for 90 days with weekly check-ins.",
      'Success at 90 days is that I can hand him a messy client problem and not think about it again.',
    ];
    expect(closeReadiness(turns, false, 3).ready).toBe(false);
  });

  it('says why, in terms that name the trap', () => {
    const verdict = closeReadiness(['one dense answer with 22 tickets in it'], false, 3);
    expect(verdict.reason).toMatch(/strand/i);
  });

  it('lets the close through once the floor is met', () => {
    const turns = [
      'I closed 22 tickets in my first three weeks.',
      'Nobody has told me I own a client yet.',
      'I would take a second account if one came up.',
    ];
    expect(closeReadiness(turns, false, 3).ready).toBe(true);
  });

  it('uses the relaxed floor for a correction, which is short by nature', () => {
    // A correction is "the deadline was March, not May". One turn is the whole
    // point of it, and holding it to three would strand it the other way.
    expect(closeReadiness(['The deadline was March, not May.'], false, 1).ready).toBe(true);
  });
});

describe('what the floor must never override', () => {
  it('always honours somebody asking to stop, whatever the count', () => {
    // Nobody is held in a conversation because a counter says so. This check
    // sits BEFORE the floor deliberately.
    expect(closeReadiness(['I need to go'], false, 3).ready).toBe(true);
    expect(closeReadiness(["that's it from me"], false, 3).ready).toBe(true);
  });

  it('leaves the original thin-record behaviour intact above the floor', () => {
    // The gate this was added to: nothing checkable, no statement that there is
    // nothing, so one more question is worth asking.
    const vague = ['things are going fine', 'yeah, all good', 'no real news'];
    expect(closeReadiness(vague, false, 3).ready).toBe(false);
    // ...and the one held-back close is still the whole budget.
    expect(closeReadiness(vague, true, 3).ready).toBe(true);
  });

  it('still lets an honest empty week close, once the floor is met', () => {
    const nothing = ['Nothing much this week', 'no update really', 'same as before'];
    expect(closeReadiness(nothing, false, 3).ready).toBe(true);
  });

  it('behaves exactly as before when no floor is passed', () => {
    // Default 0, so every existing caller is unaffected.
    expect(closeReadiness(['I closed 22 tickets.'], false).ready).toBe(true);
  });
});
