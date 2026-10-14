import { CheckInStatus, Cadence } from '@prisma/client';
import { howACheckInIsGoing } from './how-a-check-in-is-going';

/**
 * Hafsah, 21 Sep 2026: a 90-day quarterly check-in read "Session 1 of 1"; she answered, a session-2 row
 * was created for day 90, and the board read "0 of 2 answered this round".
 */
describe('there is no round after the last planned one', () => {
  it('the board counts the last planned round, not a stray row after it', () => {
    const going = howACheckInIsGoing({
      timelineDays: 90, cadence: Cadence.ONE_TIME, sharedPicture: null, dependencies: [],
      participants: [{ id: 'h', userId: 'u-h' }, { id: 'a', userId: 'u-a' }],
      checkIns: [
        { participantId: 'h', sessionNumber: 1, status: CheckInStatus.COMPLETED },
        { participantId: 'a', sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
        { participantId: 'h', sessionNumber: 2, status: CheckInStatus.NOT_STARTED },
      ],
    } as any);
    expect(going.glance.progress.roundsPlanned).toBe(1);
    expect(going.glance.progress.answeredThisRound).toBe(1);
    expect(going.glance.progress.ofPeople).toBe(2);
  });
  it('and the service does not create one', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../conversation/conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toMatch(/const planned = totalSessionsFor\(\(ground as any\)\?\.timelineDays \?\? null, cadence\);\s*if \(planned != null && sessionNumber >= planned\)/);
    expect(src).toMatch(/ownAvailableFrom >= ground\.endsAt/);
  });
});

/** The board's own select, which left out the one field the count is keyed by. */
describe('the board hands the glance who answered', () => {
  it('selects participantId on the check-ins it counts', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../board/board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    /* The select also carries closedReason and the person's first turn since 9 October (a quiet close is not an answer); participantId is what this checks. */
    expect(src).toMatch(/checkIns: \{ select: \{ sessionNumber: true, status: true, isSetup: true, completedAt: true, participantId: true, availableFrom: true[ ,]/);
  });
});
