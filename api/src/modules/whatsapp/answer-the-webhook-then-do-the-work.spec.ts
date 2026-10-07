import { answerFirst, whenTheWebhookWorkIsDone } from './answer-the-webhook-then-do-the-work';

/** User journeys F-25: "Hi" took 65.5 seconds to be answered, and Meta sends a message again when it is not answered in time. */
describe('the webhook answers first', () => {
  beforeEach(() => { process.env.GW_WEBHOOK_ANSWERS_FIRST = 'true'; });
  afterEach(() => { delete process.env.GW_WEBHOOK_ANSWERS_FIRST; });

  it('returns at once, while the slow work is still going, and the work then finishes', async () => {
    let finished = false;
    let release!: () => void;
    const slow = new Promise<void>((r) => { release = r; });
    const t0 = Date.now();
    await answerFirst(async () => { await slow; finished = true; }, () => undefined);
    expect(Date.now() - t0).toBeLessThan(200);
    expect(finished).toBe(false);
    release();
    await whenTheWebhookWorkIsDone();
    expect(finished).toBe(true);
  });

  it('a failure after the answer is reported, and never thrown back at Meta', async () => {
    const seen: string[] = [];
    await answerFirst(async () => { throw new Error('the model was slow'); }, (e) => seen.push(e.message));
    await whenTheWebhookWorkIsDone();
    expect(seen).toEqual(['the model was slow']);
  });
});

describe('in the test suites, without the switch, the work is waited for', () => {
  it('so a spec that reads what a person was sent still sees it', async () => {
    let done = false;
    await answerFirst(async () => { await new Promise((r) => setTimeout(r, 20)); done = true; }, () => undefined);
    expect(done).toBe(true);
  });
});
