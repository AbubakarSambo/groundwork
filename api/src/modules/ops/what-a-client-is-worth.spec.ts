/**
 * A $25 client is not a $1,000 client, and a client who paid once is not a
 * client who stayed.
 *
 * Both of those are obvious said out loud and both are lost the moment somebody
 * counts clients. This is the arithmetic that stops it, and it is worth pinning
 * hard because the numbers it produces are meant to be usable as evidence in a
 * conversation about equity - which means somebody will eventually have a
 * reason to want them to say something else.
 */
import {
  creditsForMonthlyValue,
  monthsRetained,
  earnedCredit,
  DEFAULT_VALUE_BANDS,
} from './what-a-client-is-worth';

const monthly = (n: number) => creditsForMonthlyValue(n);
const on = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('what a client is worth by what they pay', () => {
  it.each([
    [25, 0.25],
    [99, 0.25],
    [100, 0.5],
    [499, 0.5],
    [500, 1],
    [999, 1],
    [1000, 2],
    [2499, 2],
    [2500, 3],
    [10000, 3],
  ])('$%i a month is %s credits', (value, credits) => {
    expect(monthly(value)).toBe(credits);
  });

  it('and the bands are boundaries, not approximations', () => {
    /* $100 is in the second band, not the first. Off-by-one here is somebody's
       credit, and it is the kind of thing nobody checks twice. */
    expect(monthly(99.99)).toBe(0.25);
    expect(monthly(100)).toBe(0.5);
  });

  it('and they are configurable, because they are a judgement that will change', () => {
    const ourBands = [{ fromMonthly: 0, toMonthly: null, credits: 7 }];
    expect(creditsForMonthlyValue(25, ourBands)).toBe(7);
  });

  it('and the default framework is the one that was agreed', () => {
    expect(DEFAULT_VALUE_BANDS.map((b) => b.credits)).toEqual([0.25, 0.5, 1, 2, 3]);
  });
});

describe('how long they actually stayed', () => {
  it('is nothing on a single payment, however large', () => {
    expect(monthsRetained([on('2026-01-01')])).toBe(0);
  });

  it('counts whole months between the first payment and the last', () => {
    expect(monthsRetained([on('2026-01-01'), on('2026-04-01')])).toBe(3);
  });

  it('and does not round a partial month up', () => {
    expect(monthsRetained([on('2026-01-15'), on('2026-04-10')])).toBe(2);
  });

  it('and stops when they stop, rather than running on to today', () => {
    /**
     * The one that would go wrong silently. Measured to today, a client who
     * paid twice in March and left becomes a six-month retained client by
     * September - and somebody earns full credit for a client who is gone.
     */
    const paidTwiceAndLeft = [on('2026-03-01'), on('2026-03-28')];
    expect(monthsRetained(paidTwiceAndLeft)).toBe(0);
  });
});

describe('what has actually been earned', () => {
  it('is nothing before anybody pays', () => {
    expect(earnedCredit([]).earned).toBe(0);
  });

  it('is nothing at first payment, however good the client', () => {
    const one = earnedCredit([{ amount: 2500, paidAt: on('2026-01-01') }]);
    expect(one.possible).toBe(3);
    expect(one.earned).toBe(0);
    expect(one.says).toMatch(/none earned yet/);
  });

  it('is half at three months', () => {
    /* $600/month retained three months: 0.5 earned of a possible 1. */
    const payments = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((d) => ({
      amount: 600,
      paidAt: on(d),
    }));
    const result = earnedCredit(payments);
    expect(result.possible).toBe(1);
    expect(result.earned).toBe(0.5);
  });

  it('is all of it at six', () => {
    /* $1,000/month retained six months: 2 earned. */
    const payments = Array.from({ length: 7 }, (_, i) => ({
      amount: 1000,
      paidAt: on(`2026-0${i + 1}-01`),
    }));
    const result = earnedCredit(payments);
    expect(result.possible).toBe(2);
    expect(result.earned).toBe(2);
  });

  it('and a small client retained six months earns its small credit in full', () => {
    /* $25/month for six months: 0.25 earned. Small and real. */
    const payments = Array.from({ length: 7 }, (_, i) => ({
      amount: 25,
      paidAt: on(`2026-0${i + 1}-01`),
    }));
    expect(earnedCredit(payments).earned).toBe(0.25);
  });

  it('and values a client by what arrived, not by what was promised', () => {
    /**
     * A client on a $1,000 contract who has paid $250 once is a $250 client.
     * Reading the contract value here is how a projection earns a credit, which
     * is the one thing this must never do.
     */
    const result = earnedCredit([{ amount: 250, paidAt: on('2026-01-01') }]);
    expect(result.possible).toBe(0.5);
  });
});
