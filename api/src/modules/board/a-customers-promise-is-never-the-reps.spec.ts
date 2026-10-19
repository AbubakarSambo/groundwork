import { PartyType } from '@prisma/client';
import { boardAs, person, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * A CUSTOMER'S PROMISE IS NEVER THE REP'S COMMITMENT (Hafsah's point 13, Drop Access, 17 October).
 *
 * On the test bed Mercy's "Will do" on the team report read "Rose said she will buy the two units at the end of the month, on
 * October 30th.", because the line was kept as her commitment. Read as Grace, who runs it, and as Mercy herself, with Release 1's
 * switch on: her "Will do" is what she said she would do, and Rose's promise reads as what happened. "Will do" is worked out
 * here exactly as the team report page works it out (ThePicturedTeamReport: the first commitment in the session).
 */
const PEOPLE = [
  person('p-grace', 'u-grace', 'Grace', 'Njoroge', PartyType.INITIATOR),
  person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
  person('p-kevin', 'u-kevin', 'Kevin', 'Omondi'),
];
const GRACE = ['u-grace', 'MEMBER'] as const;
const MERCY = ['u-mercy', 'MEMBER'] as const;
const at = (s: string) => new Date(s);
const line = (id: string, participantId: string, type: string, text: string, checkInId: string, createdAt: string) => ({
  id, participantId, type, text, checkInId, recallBased: true, createdAt: at(createdAt), disputedAt: null, saidWordForWord: true,
});
const LINES = [
  line('e-rose', 'p-mercy', 'COMMITMENT', 'Rose said she will buy the two units at the end of the month, on October 30th.', 'c4-p-mercy', '2026-10-15T15:05:00Z'),
  line('e-peter', 'p-mercy', 'COMMITMENT', 'I will send Peter the quote for 30 units by Friday.', 'c4-p-mercy', '2026-10-15T15:05:30Z'),
  line('e-jane', 'p-kevin', 'COMMITMENT', 'Jane will pay a deposit on Friday.', 'c4-p-kevin', '2026-10-15T15:03:00Z'),
];
const run = (on = true): Setup => ({
  people: PEOPLE,
  initiatorId: 'u-grace',
  kindOfWork: 'sales team',
  releaseOneSalesBoard: on,
  clock: { now: at('2026-10-17T17:00:00Z') },
  checkIns: [answered('p-kevin', 4, '2026-10-15T15:03:00Z'), answered('p-mercy', 4, '2026-10-15T15:05:00Z')],
  turns: [
    { checkInId: 'c4-p-mercy', content: 'Rose said she will buy the two units at the end of the month, on October 30th. I will send Peter the quote for 30 units by Friday.' },
    { checkInId: 'c4-p-kevin', content: 'Jane will pay a deposit on Friday.' },
  ],
  lines: LINES,
  dependencies: [],
  commitments: [],
});
/* The page's own "Will do" for a person in a session. */
const willDo = (b: any, who: string, session: number): string | null => {
  const row = (b.whoOwnsWhat ?? []).find((w: any) => w.name === who);
  const it = (row?.items ?? []).find((i: any) => i.type === 'COMMITMENT' && i.sessionNumber === session);
  return it ? String(it.text).replace(/^[^"“]*?said,\s*/i, '').replace(/^["“]|["”]$/g, '') : null;
};
const commitmentsOf = (b: any, who: string) => ((b.whoOwnsWhat ?? []).find((w: any) => w.name === who)?.items ?? []).filter((i: any) => i.type === 'COMMITMENT').map((i: any) => i.text);

describe('with Release 1\'s sales board on', () => {
  it('Grace reads Mercy\'s "Will do" as her quote to Peter, and Rose\'s promise is never one of Mercy\'s commitments', async () => {
    const b = await boardAs(run(), ...GRACE);
    expect(willDo(b, 'Mercy Wairimu', 4)).toBe('I will send Peter the quote for 30 units by Friday.');
    expect(commitmentsOf(b, 'Mercy Wairimu').join(' ')).not.toMatch(/Rose/);
    /* Kevin said only Jane's promise: he has no "Will do", and the page says "Will do: did not say". */
    expect(willDo(b, 'Kevin Omondi', 4)).toBeNull();
    /* Rose's words are still on record, as what happened. */
    const mercy = (b.whoOwnsWhat ?? []).find((w: any) => w.name === 'Mercy Wairimu');
    expect(mercy.items.find((i: any) => /Rose/.test(i.text)).type).toBe('PROGRESS');
  });

  it('Mercy reads the same on her own board', async () => {
    const b = await boardAs(run(), ...MERCY);
    expect(willDo(b, 'You', 4)).toBe('I will send Peter the quote for 30 units by Friday.');
    expect(commitmentsOf(b, 'You').join(' ')).not.toMatch(/Rose/);
  });
});

describe('with Release 1\'s sales board off', () => {
  it('the board reads as it did before the switch', async () => {
    const b = await boardAs(run(false), ...GRACE);
    expect(willDo(b, 'Mercy Wairimu', 4)).toBe('Rose said she will buy the two units at the end of the month, on October 30th.');
  });
});
