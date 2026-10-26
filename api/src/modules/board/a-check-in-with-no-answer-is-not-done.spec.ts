import { thePersonsRecord } from './the-persons-record';

/** Peter, polish round 2: the board read "four of five check-ins, all on time" after he answered two of them. */
describe('a check-in closed with no answer from them is not one they did', () => {
  const at = (d: string) => new Date(`${d}T09:00:00Z`);
  const ci = (n: number, day: string, answers: number) => ({ id: `c${n}`, sessionNumber: n, status: 'COMPLETED', availableFrom: at(day), createdAt: at(day), completedAt: at(day), _count: { turns: answers } });
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
