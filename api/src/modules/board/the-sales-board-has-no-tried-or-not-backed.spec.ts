import { PartyType } from '@prisma/client';
import { boardAs, person, answered, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * HAFSAH'S ANSWER 5, 18 OCTOBER: "The board follows my kit. If the kit's board doesn't show 'Tried:' and 'Not backed:', remove
 * them." The kit's sales board (B5-the-board/board-as-lead.txt, B5-boards-every-check-in/sales-board.txt) has neither: its
 * blockers say "What the proof shows" and "Would clear it" on their own lines. Joseph's wait on Grace for the KES 4,500 price,
 * as gw_sweep_drop10 holds it, read by Grace, by Joseph, and by an admin.
 */
const at = (s: string) => new Date(s);
const PEOPLE = [
  person('p-grace', 'u-grace', 'Grace', 'Achieng', PartyType.INITIATOR),
  person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
  person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
];
const run = (kindOfWork: string, on: boolean): Setup => ({
  people: PEOPLE,
  initiatorId: 'u-grace',
  kindOfWork,
  releaseOneSalesBoard: on,
  clock: { now: at('2026-10-23T17:00:00Z') },
  checkIns: [answered('p-joseph', 10, '2026-10-23T11:10:00Z'), answered('p-mercy', 10, '2026-10-23T11:05:00Z')],
  dependencies: [handoff('d-price', 'p-joseph', 'her approval for the KES 4,500 price for Juja Hardware', {
    onParticipantId: 'p-grace', status: 'BLOCKING', createdAt: at('2026-10-14T11:20:00Z'), sourceCheckInId: 'c3-p-joseph',
  })],
  commitments: [],
});
const everySentence = (b: any) => JSON.stringify(b);

describe('the sales board, as the kit has it (answer 5)', () => {
  it.each([['Grace', 'u-grace', 'MEMBER'], ['Joseph', 'u-joseph', 'MEMBER']] as const)('%s reads no "Tried:" and no "Not backed:" anywhere on the board', async (_n, u, role) => {
    const b = await boardAs(run('sales team', true), u, role);
    expect(everySentence(b)).not.toMatch(/Not backed:|Tried:/);
  });
  it('Grace reads the claim in Joseph\'s words, and the blocker\'s own lines say what the proof shows and what would clear it', async () => {
    const b = await boardAs(run('sales team', true), 'u-grace', 'MEMBER');
    const blocker = (b.blockers ?? []).find((x: any) => x.id === 'd-price');
    /* Changed 18 October (Hafsah's quality pass, B-10): first names on the lead's sales board, and the lead's approval said to her as hers. */
    expect(blocker.says).toBe('Joseph is waiting on you for your approval for the KES 4,500 price for Juja Hardware.');
    /* Changed 18 October (Hafsah's quality pass, B-10 and B-17): first names on the lead's sales board, in the kit's words. */
    expect(blocker.proof.says).toBe('Nothing on record proves it. It rests on what Joseph said.');
    expect(blocker.wouldClearItSays).toBe('Nobody has said what would clear it yet.');
  });
  it('with Release 1\'s sales board off, and on any other kind of board, no "Not backed:" either', async () => {
    /* Changed 3 November (Hafsah, F2: silence is never a finding): "Not backed: no attempt to unblock mentioned" is gone everywhere, switch on or off. */
    const off = await boardAs(run('sales team', false), 'u-grace', 'MEMBER');
    expect(everySentence(off)).not.toMatch(/Not backed|could have messaged/);
    const other = await boardAs(run('operations', true), 'u-grace', 'MEMBER');
    expect(everySentence(other)).not.toMatch(/Not backed|could have messaged/);
  });
});
