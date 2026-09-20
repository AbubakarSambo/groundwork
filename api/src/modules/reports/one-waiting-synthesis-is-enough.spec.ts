import { ReportsService } from './reports.service';

/**
 * Run 3, 20 Sep 2026: six people finished a round inside a minute, six syntheses queued at three
 * minutes each, and the release waited for the sixth, which read nothing the second would not have.
 */
describe('one waiting synthesis is enough', () => {
  it('a request made while one runs and one waits joins the waiting one; each run reads the state when it starts', async () => {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.synthesisQueue = new Map(); svc.synthesisWaiting = new Map(); svc.logger = { warn() {}, log() {} };
    const started: number[] = [];
    let release: (() => void) | null = null;
    let n = 0;
    svc.synthesizeNow = jest.fn(async () => {
      const me = ++n;
      started.push(me);
      if (me === 1) await new Promise<void>((r) => { release = r; });
      return me;
    });
    const first = svc.synthesize('g');
    await new Promise((r) => setTimeout(r, 0));
    const second = svc.synthesize('g');
    const third = svc.synthesize('g');
    const fourth = svc.synthesize('g');
    release!();
    expect(await first).toBe(1);
    expect(await second).toBe(2);
    expect(await third).toBe(2);
    expect(await fourth).toBe(2);
    expect(started).toEqual([1, 2]);
    /* And after the queue drains, a new request runs afresh. */
    expect(await svc.synthesize('g')).toBe(3);
  });
});
