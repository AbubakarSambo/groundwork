import { boardAs, handoff, answered, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, A_RELEASED_REPORT } from './the-switchboards-sections-harness';
import { aWaitOnOneself } from './a-thing-is-not-somebody';
import { theTargetsThatAreSet } from '../reports/what-this-session-holds';

/**
 * SCREENS REQUESTS 111 (e) AND 109 (c), ON THE SALES BOARD ("Sales team, Q3"), 2 OCTOBER 2026.
 *
 * (e) Rukia, who runs it, read "You are waiting on themselves to approve a discount for Baraka Mwangi." The
 *     extraction had written what she still had to do herself as a wait on "themselves". Baraka's own wait on
 *     her, for the discount decision, was already on the board. Nobody waits on themselves.
 * (c) The quick read said "1 target is set" above a list of three targets, because it counted only the ones
 *     with a number.
 *
 * Here Amina runs it (Rukia's place), and Baraka waits on her for the discount decision.
 */
const WAITS = [
  handoff('d-self', 'p-amina', 'to approve a discount for Baraka Otieno', { onLabel: 'themselves', status: 'WAITING' }),
  handoff('d-baraka', 'p-baraka', 'the discount decision', { onParticipantId: 'p-amina', status: 'BLOCKING' }),
];

describe('a wait on oneself is not a wait', () => {
  it.each([
    ['Amina, who runs it', AMINA],
    ['Rukia, who checks in', RUKIA],
    ['Baraka, who is waiting on Amina', BARAKA],
    ['Juma, an admin who only reads', JUMA],
    ['the admin who set it up', SETUP_ADMIN],
  ])('%s reads nobody "waiting on themselves"', async (_who, [userId, role]) => {
    const board = await boardAs({ dependencies: WAITS, createdByUserId: 'u-setup', report: A_RELEASED_REPORT }, userId, role);
    expect(JSON.stringify(board)).not.toMatch(/themselves/);
  });

  it('Baraka\'s own wait on Amina is still there, for Amina and for Baraka', async () => {
    const amina = JSON.stringify(await boardAs({ dependencies: WAITS }, ...AMINA));
    /* Change 4: Amina has not promised the discount decision herself, so the wait is Baraka's account, with the note. */
    expect(amina).toContain('Baraka Otieno says the work is waiting on you for the discount decision.');
    const baraka = JSON.stringify(await boardAs({ dependencies: WAITS }, ...BARAKA));
    expect(baraka).toContain('You say the work is waiting on Amina Wanjiru for the discount decision.');
  });

  it('the rule', () => {
    expect(aWaitOnOneself({ fromParticipantId: 'p-a', onLabel: 'themselves' })).toBe(true);
    expect(aWaitOnOneself({ fromParticipantId: 'p-a', onParticipantId: 'p-a' })).toBe(true);
    expect(aWaitOnOneself({ fromParticipantId: 'p-a', onParticipantId: 'p-b' })).toBe(false);
    expect(aWaitOnOneself({ fromParticipantId: 'p-a', onLabel: 'the warehouse' })).toBe(false);
  });
});

describe('the quick read counts every target it lists (request 109 c)', () => {
  it('three targets, one with a number', () => {
    /* Run-25: "no round has closed to measure from" was jargon; it now says plainly when a change will show. */
    expect(theTargetsThatAreSet(3, 1)).toBe('3 targets are set, and 1 of them has a number. Any change in it will show here after the next check-in.');
    expect(theTargetsThatAreSet(3, 3)).toBe('3 targets are set. Any change in them will show here after the next check-in.');
    expect(theTargetsThatAreSet(1, 1)).toBe('1 target is set. Any change in it will show here after the next check-in.');
    expect(theTargetsThatAreSet(3, 3)).not.toMatch(/round|measure from/);
    expect(theTargetsThatAreSet(1, 0)).toBe('1 target is set, and it has no number to measure from.');
  });

  it('on the board, the lead is told three are set where three are listed', async () => {
    const objectives = [
      { id: 'o1', name: 'Sign 12 shops for kitchen appliances in Nairobi', target: null, count: 0, prevCount: 0, ownerParticipantId: null, sortOrder: 0, assumes: [], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01') },
      { id: 'o2', name: 'Shops visited', target: 30, count: 0, prevCount: 0, ownerParticipantId: null, sortOrder: 1, assumes: [], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01') },
      { id: 'o3', name: 'Cookers delivered', target: null, count: 0, prevCount: 0, ownerParticipantId: null, sortOrder: 2, assumes: [], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01') },
    ];
    const board = await boardAs({ objectives, report: A_RELEASED_REPORT, checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)] }, ...AMINA);
    const tile = (board.quickRead ?? []).find((t: any) => /target/i.test(JSON.stringify(t)));
    expect(JSON.stringify(board.quickRead)).not.toContain('1 target is set');
    if (tile) expect(JSON.stringify(tile)).toContain('3 targets are set, and 1 of them has a number.');
  });
});
