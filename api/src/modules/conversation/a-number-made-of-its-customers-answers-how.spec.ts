import { whatIsStillOwed, KEEP_THE_TEAM_ON_TRACK } from './what-a-check-in-owes';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 12. Mercy was asked "How are you making your number?" on 13 October and said
 * "Greenfield is secured for 25 units. And I've got Mama Mboga Mart wanting 2 units. So that's 27 units total." Grace's board and
 * team report still read: In session 1, Mercy Wairimu was asked, "How are you making your number?" Mercy Wairimu has not answered
 * it yet. Her record entries of that day, as written:
 */
const MERCY_DAY_2 = [
  { type: 'PROGRESS', text: 'I got a new lead today, Mama Mboga Mart in Kawangware. Rose, the owner, wants 2 units.' },
  { type: 'WORRY', text: "I can't really progress with Tuskys Westgate without those samples for Peter to see." },
  { type: 'PROGRESS', text: "Greenfield is secured for 25 units. And I've got Mama Mboga Mart wanting 2 units. So that's 27 units total." },
  { type: 'COMMITMENT', text: "I'll have that delivery date confirmed by Thursday, latest. I'll make sure of it." },
];
const held = (entries: { type: string; text: string }[]) => ({ types: entries.map((e) => e.type) as any[], entries: entries as any[], answered: [], letGo: [] });

describe('a number made up of what each customer takes answers how it is made', () => {
  it('Mercy\'s day 2 settles "how they are making their number"', () => {
    const still = whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'middle', held(MERCY_DAY_2)).map((o) => o.id);
    expect(still).not.toContain('how-the-number-is-made');
  });
  it('one count alone does not', () => {
    const still = whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'middle', held([MERCY_DAY_2[0]])).map((o) => o.id);
    expect(still).toContain('how-the-number-is-made');
  });
});
