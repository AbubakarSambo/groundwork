import { serviceFor, everyString } from './__fixtures__/sales-team-q3-two-sessions';
import { boardAs } from '../board/the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from '../board/__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 117 (3): SESSIONS COUNTED TWO WAYS.
 *
 * On "Sales team, Q3" session 1 was still open on the board's clock (Faraji Odhiambo, let in, had not checked in)
 * while Rukia and Amani had done session 2. The header said "Session 1 of 12", the coaching note "This is session
 * 2", and the lead's questions said Baraka "has not answered this session" while "The team today" said he had
 * checked in, because the questions counted the highest row anybody had. All of them now count the board's own
 * clock: the open round among the people who check in, capped at the last planned session.
 */
function heldOpenByFaraji() {
  const { svc, w } = serviceFor('sales');
  (svc as any).anthropic = { respond: jest.fn(async () => null) };
  const ground: any = w.ground;
  /* Faraji is let in, and has not started session 1. */
  const faraji = ground.participants.find((p: any) => p.id === 'p-faraji');
  faraji.user.awaitingOrgApproval = false;
  const prisma: any = (svc as any).prisma;
  const users = prisma.user.findMany;
  prisma.user.findMany = async (args: any) => (await users(args)).filter((u: any) => u.id !== 'u-faraji');
  /* Baraka and Neema have done session 1 only; session 2 is written ahead for them, untouched. */
  const rows = w.checkIns as any[];
  for (const c of rows) if (['p-baraka', 'p-neema'].includes(c.participantId) && c.sessionNumber === 2) { c.status = 'NOT_STARTED'; c.completedAt = null; }
  rows.push({ id: 'c-p-faraji-1', groundId: 'g1', participantId: 'p-faraji', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, isFinal: false, completedAt: null });
  return svc;
}

describe('request 117 (3): one count for the sessions', () => {
  /*
   * Changed 21 October (final real-model check, item 15): a person's own note is never behind their own check-ins. Kevin, who had done
   * session 3, read "This is session 2 of 15 of this work." because Peter's open session 2 held the round. Rukia and Amani have done
   * session 2, so their own notes say session 2; the board's header still says the round, and the lead's questions still count it.
   */
  it('Rukia\'s coaching note says the session she has done, not the round Faraji holds open', async () => {
    const svc = heldOpenByFaraji();
    const c: any = await svc.coachingForTheBoard('g1', 'u-rukia');
    expect(c.yours.whyItMatters).toMatch(/^This is check-in 2 of 12 of this work\./);
  });

  it('Amani, who has done session 2, reads session 2 in her own note', async () => {
    const svc = heldOpenByFaraji();
    const c: any = await svc.coachingForTheBoard('g1', 'u-amani');
    expect(c.yours.whyItMatters).toMatch(/^This is check-in 2 of 12 of this work\./);
  });

  /* Changed 22 November 2026 (Hafsah, "Yes, move it on"): Rukia and Amani have begun session 2, so it is the team's session, and the
     people who have not answered it are Baraka, Neema and Faraji. Before, Faraji's unanswered session 1 held the round at 1. */
  it.each([['Rukia', 'u-rukia'], ['Grace, who set it up', 'u-grace']])('%s is told who has not answered session 2: Baraka, Neema and Faraji', async (_who, userId) => {
    const svc = heldOpenByFaraji();
    const c: any = await svc.coachingForTheBoard('g1', userId);
    const notAnswered = (c.eachPerson as any[]).filter((p) => p.probe.some((l: string) => /has not answered this check-in/.test(l))).map((p) => p.who);
    expect(notAnswered.sort()).toEqual(['Baraka Mwangi', 'Faraji Odhiambo', 'Neema Achieng']);
  });

  it('Juma, an admin who only reads, and Baraka are sent no probe list at all', async () => {
    const svc = heldOpenByFaraji();
    expect((await svc.coachingForTheBoard('g1', 'u-juma'))).toBeNull();
    const baraka: any = await svc.coachingForTheBoard('g1', 'u-baraka');
    expect(baraka.eachPerson).toBeNull();
  });
});

describe('request 117 (3): the board says the same session to every reader', () => {
  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Amani, who checks in', AMANI],
    ['Baraka, who checks in', BARAKA_M],
    ['Neema, who checks in', NEEMA],
    ['Juma, an admin who only reads', JUMA_READS],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
  ])('%s: session 2 of 12, with session 1 over and the misses said', async (_who, reader) => {
    const board = await boardAs(review5(), reader[0], reader[1]);
    expect(board.phaseSpine.currentSession).toBe(2);
    expect(board.phaseSpine.plannedSessions).toBe(12);
    const lines = board.phaseSpine.sessions.map((s: any) => s.says);
    expect(lines[0]).toMatch(/^Check-in 1 is over, and (one person|\d+ people) missed it\.$/);
    expect(lines[1]).toMatch(/^Check-in 2 (opened on .*, and it is still open|is open now)\.$/);
    expect(lines.join(' ')).not.toMatch(/still open\. .*while|while check-in/);
  });

  it('the lead reads that Baraka, Neema and Faraji have not checked in for session 2', async () => {
    const board = await boardAs(review5(), ...RUKIA_RUNS_IT);
    const says = Object.fromEntries((board.eachPerson as any[]).map((r) => [r.who, r.says]));
    expect(says['Faraji Odhiambo']).toBe('Faraji Odhiambo has not checked in yet.');
    expect(says['Baraka Mwangi']).toMatch(/^Baraka Mwangi has not checked in/);
    expect(says['Neema Achieng']).toMatch(/^Neema Achieng has not checked in/);
  });
});
