import { onceAcrossCopies, oneOrganisationAtATime, theDay, theHour, theWeek, jobRunKey } from './once-across-copies';

/**
 * A SCHEDULED JOB RUNS ONCE FOR ITS TIME, HOWEVER MANY COPIES OF THE API RUN (decision 74, item 7).
 *
 * The database is a stand-in that does what the claim's one statement does in Postgres: it writes
 * the slot only when the row holds a different one, and says how many rows it changed. Two copies
 * share it, as two copies of the API share one database.
 */
function aSharedDatabase() {
  const rows = new Map<string, string>();
  const $executeRaw = jest.fn(async (_strings: TemplateStringsArray, key: string, value: string) => {
    await new Promise((r) => setImmediate(r)); // both copies are in flight at once
    if (rows.get(key) === value) return 0;
    rows.set(key, value);
    return 1;
  });
  return { rows, copy: () => ({ $executeRaw }) };
}

describe('the time slot a job runs for', () => {
  const at = new Date('2026-10-02T02:00:05Z'); // a Friday
  it('is the UTC day, the UTC hour, or the week named by its Monday', () => {
    expect(theDay(at)).toBe('2026-10-02');
    expect(theHour(at)).toBe('2026-10-02T02');
    expect(theWeek(at)).toBe('week of 2026-09-28');
    expect(theWeek(new Date('2026-09-28T05:00:00Z'))).toBe('week of 2026-09-28');
    expect(theWeek(new Date('2026-10-04T23:59:00Z'))).toBe('week of 2026-09-28');
  });
});

describe('two copies of the API at 02:00', () => {
  it('run the job once between them', async () => {
    const db = aSharedDatabase();
    const job = jest.fn(async () => undefined);
    const [a, b] = await Promise.all([
      onceAcrossCopies(db.copy(), 'warn-before-time-runs-out', '2026-10-02', job),
      onceAcrossCopies(db.copy(), 'warn-before-time-runs-out', '2026-10-02', job),
    ]);
    expect(job).toHaveBeenCalledTimes(1);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(db.rows.get(jobRunKey('warn-before-time-runs-out'))).toBe(JSON.stringify('2026-10-02'));
  });

  it('a copy whose timer fires after the first has finished does not run it again', async () => {
    const db = aSharedDatabase();
    const job = jest.fn(async () => undefined);
    await onceAcrossCopies(db.copy(), 'the-company-picture', '2026-10-02', job);
    await onceAcrossCopies(db.copy(), 'the-company-picture', '2026-10-02', job);
    expect(job).toHaveBeenCalledTimes(1);
  });

  it('the next night runs again, and another job is not held up by this one', async () => {
    const db = aSharedDatabase();
    const job = jest.fn(async () => undefined);
    await onceAcrossCopies(db.copy(), 'the-company-picture', '2026-10-02', job);
    await onceAcrossCopies(db.copy(), 'the-company-picture', '2026-10-03', job);
    await onceAcrossCopies(db.copy(), 'the-role-gap-notes', '2026-10-03', job);
    expect(job).toHaveBeenCalledTimes(3);
  });

  it('when the claim cannot be made, the job does not run, so nothing is sent twice', async () => {
    const job = jest.fn(async () => undefined);
    const broken = { $executeRaw: jest.fn(async () => { throw new Error('the database is not answering'); }) };
    await expect(onceAcrossCopies(broken, 'send-reminders', '2026-10-02', job)).resolves.toBe(false);
    expect(job).not.toHaveBeenCalled();
  });

  it('a stand-in database with no raw SQL, as in a job’s own unit tests, simply runs it', async () => {
    const job = jest.fn(async () => undefined);
    await onceAcrossCopies({}, 'send-reminders', '2026-10-02', job);
    await onceAcrossCopies(undefined, 'send-reminders', '2026-10-02', job);
    expect(job).toHaveBeenCalledTimes(2);
  });
});

describe('one organisation at a time, on the first night', () => {
  it('waits after each organisation that made a model call, and not after one whose record had not changed', async () => {
    const waits: number[] = [];
    const order: string[] = [];
    const results: Record<string, string> = { o1: 'built', o2: 'unchanged', o3: 'built', o4: 'nothing', o5: 'built' };
    const r = await oneOrganisationAtATime(['o1', 'o2', 'o3', 'o4', 'o5'], async (id) => { order.push(id); return results[id]; }, {
      pauseMs: 20_000,
      wait: async (ms) => { waits.push(ms); order.push(`wait ${ms}`); },
    });
    expect(order).toEqual(['o1', 'wait 20000', 'o2', 'o3', 'wait 20000', 'o4', 'o5']);
    expect(r).toEqual({ done: 5, withWork: 3 });
  });

  it('never runs two organisations at once', async () => {
    let running = 0;
    let most = 0;
    await oneOrganisationAtATime(['a', 'b', 'c'], async () => {
      running += 1; most = Math.max(most, running);
      await new Promise((r) => setImmediate(r));
      running -= 1;
      return 'built';
    }, { wait: async () => undefined });
    expect(most).toBe(1);
  });
});
