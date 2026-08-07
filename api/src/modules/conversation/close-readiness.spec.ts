import { closeReadiness } from './close-readiness';

/**
 * WHO GETS A CLEAN ENDING.
 *
 * An eighteen-ground run measured it, and the answer was upside down. People
 * given a BASIC persona closed 94% of their sessions; articulate ones 87%; the
 * chatty one 70%. The distracted person answering off-topic from her phone
 * reached a natural ending more reliably than the person giving dates and
 * numbers, because the engine closes when someone stops producing new material -
 * and running out of things to say correlates with having had little to say.
 *
 * The fix has to hold two things at once. Ask one more question when the record
 * is empty. Never trap anyone: a quiet week is a real answer, and a loop that
 * squeezes for a specific which does not exist would be worse than the problem
 * it replaces.
 */

describe('when the account has something in it', () => {
  it('closes on a specific', () => {
    const r = closeReadiness(['Closed out module 4 on the 12th with Priya'], false);
    expect(r.ready).toBe(true);
  });

  it('closes on a date and a number even in a short answer', () => {
    expect(closeReadiness(['92 patients this week, audit submitted on the 14th'], false).ready).toBe(true);
  });
});

describe('when the account is empty', () => {
  it('holds the close once, to ask one more question', () => {
    // Vague and positive, but never actually saying there is nothing - which is
    // the shape that matters. "Nothing much" would be an honest empty week and
    // is handled below; this is the person who sounds fine every single time.
    const r = closeReadiness(['Yeah all good', 'Going well, getting on with it'], false);
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/one more question/);
  });

  it('but closes on the SECOND signal, whatever the record looks like', () => {
    // The whole safety valve. One held-back close is the entire budget.
    expect(closeReadiness(['Yeah all good', 'Going well, getting on with it'], true).ready).toBe(true);
  });
});

describe('a quiet week is a real answer', () => {
  it('closes when someone says plainly there is nothing', () => {
    // An empty week honestly stated is an account. Squeezing it for a specific
    // that does not exist teaches people to invent one.
    for (const said of ['Nothing to add this week', 'No real progress, same as last week', 'Quiet week, nothing happened']) {
      expect(closeReadiness([said], false).ready).toBe(true);
    }
  });
});

describe('the person can always stop', () => {
  it('honours someone saying they are done, even with an empty record', () => {
    expect(closeReadiness(['Yeah fine', "That's me, I'm done"], false).ready).toBe(true);
  });

  it('honours needing to go', () => {
    expect(closeReadiness(['ok', 'got to go sorry'], false).ready).toBe(true);
  });

  it('only reads the LAST thing they said as wanting out', () => {
    // "later" mid-conversation is not a request to stop.
    const r = closeReadiness(['I will do the audit later', 'Still working through module 3'], false);
    expect(r.ready).toBe(false);
  });
});
