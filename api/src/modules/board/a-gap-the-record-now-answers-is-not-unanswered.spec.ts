import { GroundScenario } from '@prisma/client';
import { boardAs, AMINA } from './the-switchboards-sections-harness';
import { KEEP_THE_TEAM_ON_TRACK } from '../conversation/what-a-check-in-owes';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 12. check_in_gaps held Mercy's "how they are making their number" asked three
 * times and never settled, though on 13 October she said "Greenfield is secured for 25 units. And I've got Mama Mboga Mart wanting
 * 2 units. So that's 27 units total." Grace's board read: In session 1, Mercy Wairimu was asked, "How are you making your number?"
 * Mercy Wairimu has not answered it yet. Here Rukia holds that gap and said the same kind of line; Amina runs the check-in.
 */
const HOW = KEEP_THE_TEAM_ON_TRACK.find((o) => o.id === 'how-the-number-is-made')!.what;
const gaps = [
  { participantId: 'p-rukia', what: HOW, firstRound: 1, asked: 3, certain: true },
  { participantId: 'p-baraka', what: HOW, firstRound: 1, asked: 3, certain: true },
];
const lines = [
  { id: 'l-1', participantId: 'p-rukia', type: 'PROGRESS', text: "Greenfield is secured for 25 units. And I've got Mama Mboga Mart wanting 2 units. So that's 27 units total.", createdAt: new Date('2026-09-16T10:00:00Z') },
  { id: 'l-2', participantId: 'p-baraka', type: 'PROGRESS', text: 'I sold 25 units.', createdAt: new Date('2026-09-16T11:00:00Z') },
];

describe('a gap the record now answers is not still unanswered', () => {
  it('Amina reads Baraka\'s question as still open, and Rukia\'s not at all', async () => {
    const b = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, gaps, lines, releaseOneSalesBoard: true }, ...AMINA);
    const says = (b.stillUnanswered ?? []).map((g: any) => g.says).join(' ');
    expect(says).toMatch(/Baraka/);
    expect(says).not.toMatch(/Rukia/);
  });

  /* Release 1, part 3: the re-read is behind the switch, so with it off Amina reads both, as on staging. */
  it('with Release 1\'s switch off, Amina reads both questions as the board did before', async () => {
    const b = await boardAs({ scenario: GroundScenario.OKR_ALIGNMENT, gaps, lines }, ...AMINA);
    const says = (b.stillUnanswered ?? []).map((g: any) => g.says).join(' ');
    expect(says).toMatch(/Baraka/);
    expect(says).toMatch(/Rukia/);
  });
});
