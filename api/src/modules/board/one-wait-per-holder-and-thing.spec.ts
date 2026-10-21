import { dedupeDependencies, theSameWaitInOtherWords } from './reads';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 9. The record's own waits (ground_dependencies): Mercy on Joseph for "the sample
 * units he promised" (12 October, waiting) and for "the samples for Tuskys Westgate" (14 October, blocking). Every board listed both,
 * and Grace's glance read "5 things are in the way. The one waiting longest is the sample units he promised".
 */
const MERCY = '73cc71dd-246f-4c23-93fc-3a7d1cc95188';
const JOSEPH = 'f87055a6-e165-4384-ba01-d1cb2def3282';
const GRACE = '4c83fe9b-6b9e-4530-a017-f6ea3d4990a3';
const wait = (id: string, from: string, on: string | null, what: string, status: string, day: string, onLabel: string | null = null) =>
  ({ id, fromParticipantId: from, onParticipantId: on, onLabel, what, status, createdAt: new Date(day) }) as any;

describe('one wait per holder and thing', () => {
  it('Mercy\'s two waits on Joseph for the samples are one wait, the fuller words, blocking as said last, raised twice', () => {
    const out = dedupeDependencies([
      wait('d1', MERCY, JOSEPH, 'the sample units he promised', 'WAITING', '2026-10-12T11:06:00Z'),
      wait('d3', MERCY, JOSEPH, 'the samples for Tuskys Westgate', 'BLOCKING', '2026-10-14T11:00:00Z'),
      wait('d7', JOSEPH, GRACE, 'an answer on the KES 4,500 price', 'BLOCKING', '2026-10-14T12:00:00Z'),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].what).toBe('the samples for Tuskys Westgate');
    expect(out[0].status).toBe('BLOCKING');
    expect((out[0] as any).raisedAt).toHaveLength(2);
  });

  it('two different things from the same colleague stay two, and a customer named only by a label is not joined this way', () => {
    expect(theSameWaitInOtherWords(wait('a', MERCY, JOSEPH, 'the samples', 'WAITING', '2026-10-12'), wait('b', MERCY, JOSEPH, 'the price list', 'WAITING', '2026-10-13'))).toBe(false);
    expect(theSameWaitInOtherWords(wait('a', MERCY, null, 'a reply', 'WAITING', '2026-10-12', 'Paul'), wait('b', MERCY, null, 'a reply on samples', 'WAITING', '2026-10-13', 'Paul'))).toBe(false);
  });
});
