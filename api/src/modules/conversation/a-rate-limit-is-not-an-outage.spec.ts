import { worthWaitingOut, tryAgainIfItIsJustBusy, BACKOFF_MS } from './anthropic.service';

/**
 * A BURST STOPPED TWO PEOPLE'S CHECK-INS AND NOTHING TRIED AGAIN.
 *
 * Driven through a twelve-session cohort with four people, the provider answered 429
 * RESOURCE_EXHAUSTED under sustained load. The session stopped where it stood - "The conversation
 * could not be reached just now" - and two of the four never finished their remaining sessions.
 * Nothing was broken; nothing was retried either.
 *
 * A 429 says "not this second", which is the one error worth waiting out. Everything else is not
 * going to improve by being sent again, and retrying it turns one clear failure into three slow
 * ones.
 */
describe('which failures are worth waiting out', () => {
  it('a rate limit, however the provider spells it', () => {
    expect(worthWaitingOut({ status: 429 })).toBe(true);
    expect(worthWaitingOut({ message: 'Resource exhausted. Please try again later.' })).toBe(true);
    expect(worthWaitingOut({ message: 'The model is overloaded' })).toBe(true);
    expect(worthWaitingOut({ code: 503 })).toBe(true);
  });

  it('and nothing that a second attempt cannot fix', () => {
    expect(worthWaitingOut({ status: 400, message: 'function_declarations[0].name: [REQUIRED_FIELD_MISSING]' })).toBe(false);
    expect(worthWaitingOut({ status: 401 })).toBe(false);
    expect(worthWaitingOut(new Error('AI returned an empty response'))).toBe(false);
  });
});

describe('trying again', () => {
  it('returns the first success without waiting', async () => {
    let calls = 0;
    const r = await tryAgainIfItIsJustBusy(async () => { calls++; return 'ok'; });
    expect([r, calls]).toEqual(['ok', 1]);
  });

  it('waits out a burst and comes back with the answer', async () => {
    let calls = 0;
    const r = await tryAgainIfItIsJustBusy(async () => {
      calls++;
      if (calls < 3) throw { status: 429, message: 'RESOURCE_EXHAUSTED' };
      return 'through';
    });
    expect([r, calls]).toEqual(['through', 3]);
  });

  it('and gives up rather than looping, throwing what the provider said', async () => {
    let calls = 0;
    await expect(tryAgainIfItIsJustBusy(async () => { calls++; throw { status: 429, message: 'still busy' }; }))
      .rejects.toMatchObject({ message: 'still busy' });
    expect(calls).toBe(BACKOFF_MS.length + 1);
  });

  it('and does not retry what will fail again', async () => {
    let calls = 0;
    await expect(tryAgainIfItIsJustBusy(async () => { calls++; throw { status: 400, message: 'bad tool' }; }))
      .rejects.toMatchObject({ message: 'bad tool' });
    expect(calls).toBe(1);
  });

  it('and says it is retrying, so a slow turn is explainable afterwards', async () => {
    const seen: number[] = [];
    let calls = 0;
    await tryAgainIfItIsJustBusy(
      async () => { calls++; if (calls < 2) throw { status: 429 }; return 1; },
      (n) => seen.push(n),
    );
    expect(seen).toEqual([1]);
  });
});
