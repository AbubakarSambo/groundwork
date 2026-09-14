import { worthWaitingOut, tryAgainIfItIsJustBusy, withADeadline, A_CALL_WAITS, OPENING_A_STREAM_WAITS } from './anthropic.service';

/**
 * A CALL THAT RAN OUT OF TIME IS TRIED AGAIN. IT USED TO BE HANDED TO THE PERSON.
 *
 * Every call carried a ninety-second ceiling and not one of them was ever retried: the deadline
 * threw a plain Error whose words matched nothing the retry recognised, so it went straight past it.
 *
 * Measured on forty-one people answering at the same instant: one waited seventy seconds for a
 * reply while the other forty finished inside six. Nothing was broken and nothing was retried.
 */
describe('a slow call', () => {
  it('is worth waiting out, the same as a busy one', () => {
    for (const said of [
      'Gemini respond() timed out after 20s',
      'Gemini respondStream() did not open after 20s',
      'Gemini respondStream() stalled mid-answer after 30s',
      'Gemini extract() timed out after 60s',
    ]) {
      expect(worthWaitingOut(new Error(said))).toBe(true);
    }
  });

  it('is still not retried when it is a fault asking again cannot fix', () => {
    expect(worthWaitingOut(new Error('Invalid JSON payload'))).toBe(false);
    expect(worthWaitingOut({ status: 400 })).toBe(false);
  });

  it('gets asked again, and the person who typed once never sees the first try', async () => {
    let tries = 0;
    const answer = await tryAgainIfItIsJustBusy(async () => {
      tries += 1;
      if (tries === 1) throw new Error('Gemini respond() timed out after 20s');
      return 'the reply';
    });
    expect(answer).toBe('the reply');
    expect(tries).toBe(2);
  });

  it('waits a length of time somebody will actually sit through', () => {
    /* Ninety seconds was chosen when a missed deadline was a dead end. It is not one now. */
    expect(A_CALL_WAITS).toBeLessThanOrEqual(20_000);
    expect(OPENING_A_STREAM_WAITS).toBeLessThanOrEqual(20_000);
  });

  it('clears its timer, so a fast answer leaves nothing running behind it', async () => {
    const before = (process as any)._getActiveHandles?.().length ?? 0;
    await withADeadline(Promise.resolve('quick'), 10_000, 'nothing');
    expect((process as any)._getActiveHandles?.().length ?? 0).toBeLessThanOrEqual(before);
  });
});
