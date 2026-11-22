import { thePersonsRecord } from './the-persons-record';

/** Peter, polish round 2: the board read "four of five check-ins, all on time" after he answered two of them. */
describe('a check-in closed with no answer from them is not one they did', () => {
  const at = (d: string) => new Date(`${d}T09:00:00Z`);
  /* A check-in nobody answered is closed by the clock, as the product closes one (closeAsMissed and closeByTheClock write CLOSED_BY_THE_CLOCK).
     Changed 22 November 2026: it was built as a finished check-in with no close reason, which the board's count has always read as answered;
     a person's record now reads the board's one rule (theyAnsweredIn), so the fixture says how the check-in really closed. */
  const ci = (n: number, day: string, answers: number) => ({ id: `c${n}`, sessionNumber: n, status: 'COMPLETED', availableFrom: at(day), createdAt: at(day), completedAt: at(day), ...(answers === 0 ? { closedReason: 'auto_closed' } : {}), _count: { turns: answers } });
  it('counts only the check-ins they answered', () => {
    const r = thePersonsRecord({
      participantId: 'p-peter', now: at('2026-10-19'), zone: 'Africa/Nairobi', sales: true,
      checkIns: [ci(1, '2026-10-12', 6), ci(2, '2026-10-13', 0), ci(3, '2026-10-14', 2), ci(4, '2026-10-15', 0), ci(5, '2026-10-16', 0)],
      lines: [], items: [], commitments: [], saidDone: {}, blockers: [], codes: [], ourTurns: [],
    } as any);
    expect(r.summary.checkInsDone).toBe(2);
    expect(r.summary.checkInsOnTime).toBeLessThanOrEqual(2);
  });
});

/** Joseph, polish round 2: "Juja Hardware bought 2 units, M-Pesa code TGH5K2M9QX." read "Nothing on file shows it". */
describe('a code typed in the same line as the sale is what shows it', () => {
  it('the claim is proven by the M-Pesa code', () => {
    const r = thePersonsRecord({
      participantId: 'p-joseph', now: new Date('2026-10-19T09:00:00Z'), zone: 'Africa/Nairobi', sales: true, checkIns: [],
      lines: [{ id: 'l1', participantId: 'p-joseph', checkInId: null, type: 'PROGRESS', text: 'Juja Hardware bought 2 units, M-Pesa code TGH5K2M9QX.', createdAt: new Date('2026-10-15T09:00:00Z'), mark: 'said' }],
      items: [], commitments: [], saidDone: {}, blockers: [], codes: [], ourTurns: [],
    } as any);
    expect(r.claims[0]).toMatchObject({ proven: true });
  });
});
