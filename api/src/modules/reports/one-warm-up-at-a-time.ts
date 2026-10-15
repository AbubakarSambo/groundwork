/**
 * ONE WARM-UP AT A TIME FOR EACH THING, AND ONE MORE IF SOMETHING NEW CAME IN WHILE IT RAN.
 *
 * Decision 44. On run-19 the step that words the reads ahead of time ran nine times for one
 * cohort's round and the board's ran eighteen, and the model refused 204 calls for its rate limit
 * (none on run-18). Every trigger started its own full run: a check-in, the release straight after
 * it, two check-ins whose syntheses had been merged into one, and a second copy of the board's
 * listener. Each run asked the model for the same new lines at the same moment.
 *
 * So, for each key (a check-in's round, or a board):
 *   - a trigger while nothing runs starts one run;
 *   - a trigger while one runs does not start a second beside it. It books ONE run for after, and
 *     every later trigger in that time shares that booking. Nothing new is skipped: whatever came in
 *     while the first ran is read by the one that follows;
 *   - a run that finds exactly what the last run found (the same fingerprint) does nothing and hands
 *     back what the last run gave.
 *
 * One per service instance; each service that warms is provided once (see only-one-board-listens).
 */
export class OneAtATime<T> {
  private readonly running = new Map<string, Promise<T>>();
  private readonly booked = new Map<string, Promise<T>>();
  private readonly last = new Map<string, { fingerprint: string; result: T }>();

  /**
   * `fingerprint` is read when the run starts, not when it is asked for, so a booked run reads what
   * came in while it waited. Return null from it to say "always run".
   */
  run(key: string, fingerprint: () => Promise<string | null>, job: () => Promise<T>): Promise<T> {
    const booked = this.booked.get(key);
    if (booked) return booked;
    const now = this.running.get(key);
    const start = () => this.once(key, fingerprint, job);
    if (!now) return this.track(key, start());
    const after = now.catch(() => undefined).then(() => {
      if (this.booked.get(key) === after) this.booked.delete(key);
      return this.track(key, start());
    });
    this.booked.set(key, after);
    return after;
  }

  /** For tests and logs: whether a run is out for this key. */
  isRunning(key: string): boolean {
    return this.running.has(key);
  }

  private track(key: string, p: Promise<T>): Promise<T> {
    this.running.set(key, p);
    const clear = () => { if (this.running.get(key) === p) this.running.delete(key); };
    p.then(clear, clear);
    return p;
  }

  private async once(key: string, fingerprint: () => Promise<string | null>, job: () => Promise<T>): Promise<T> {
    const fp = await fingerprint().catch(() => null);
    const was = this.last.get(key);
    if (fp !== null && was && was.fingerprint === fp) return was.result;
    const result = await job();
    if (fp !== null) {
      /* Only the newest is worth holding; the map is one entry per round or board. */
      this.last.delete(key);
      this.last.set(key, { fingerprint: fp, result });
      if (this.last.size > 500) this.last.delete(this.last.keys().next().value as string);
    }
    return result;
  }
}
