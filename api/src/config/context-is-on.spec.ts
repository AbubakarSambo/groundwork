/**
 * CONTEXT IS ON. Her decision: "context is always enabled."
 *
 * It shipped behind a flag while the page's shape was being decided, and the flag was never turned
 * on. So the tab said Documents, every document stayed private to its uploader whatever its column
 * said, the context chat was hidden, and the honesty line telling a participant that the lead holds
 * more disappeared in exactly the state where it was most true.
 *
 * WHY FLIPPING IT REVEALS NOTHING. While it was off, `setVisibility` threw before touching anything,
 * so no document could ever have been marked Open or Closed. Every row is Own. Turning it on does not
 * expose a single document that was hidden - it only lets people start choosing.
 *
 * The env var still overrides to "false" so it can be killed in an emergency without a deploy. The
 * default is the decision.
 */
describe('context is on', () => {
  const load = (value: string | undefined) => {
    const before = process.env.CONTEXT_ENABLED;
    if (value === undefined) delete process.env.CONTEXT_ENABLED;
    else process.env.CONTEXT_ENABLED = value;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cfg = require('./configuration').appConfig();
    if (before === undefined) delete process.env.CONTEXT_ENABLED;
    else process.env.CONTEXT_ENABLED = before;
    return cfg;
  };

  it('is on when nothing sets it, which is every deployment', () => {
    expect(load(undefined).contextEnabled).toBe(true);
  });

  it('and stays on for any value that is not the word off', () => {
    expect(load('true').contextEnabled).toBe(true);
    expect(load('').contextEnabled).toBe(true);
  });

  /** The kill switch survives, because a data-visibility feature should have one. */
  it('but can still be killed without a deploy', () => {
    expect(load('false').contextEnabled).toBe(false);
  });
})
