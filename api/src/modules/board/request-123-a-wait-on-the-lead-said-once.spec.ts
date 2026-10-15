import { BISI, KWAME, SALES_RUN, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 123, ITEMS 4 AND 5. A new hire waiting on "the lead" for one thing, written four ways. Amina read "waiting on
 * the lead" four times; Tobi read "Waiting on: the lead". Now it is one wait, on Amina, said as "you" to her and by her
 * name to him.
 */
const wait = (id: string, what: string, at: string) => ({
  id, groundId: 'g-1', fromParticipantId: 'p-kwame', onParticipantId: null, onLabel: 'the lead', what, status: 'WAITING', blockerKind: null,
  escalatedAt: null, triedSaid: null, dueSaid: null, dueOn: null, namedTheThing: true, sourceCheckInId: null, clearedAt: null, then: null,
  createdAt: new Date(at), updatedAt: new Date(at),
});
const FOUR: Setup = {
  ...SALES_RUN,
  dependencies: [
    wait('w1', 'the commercial terms for each client, including pricing structures and renewal processes', '2026-09-02T18:00:00Z'),
    wait('w2', 'any historical data related to these aspects', '2026-09-09T18:00:00Z'),
    wait('w3', 'the commercial terms and historical data', '2026-09-16T18:00:00Z'),
    wait('w4', 'the commercial and historical data', '2026-09-16T19:00:00Z'),
  ],
};

describe('a wait on "the lead", written four ways', () => {
  it('the lead reads one wait, on her, and never "the lead"', async () => {
    const b = JSON.stringify(await boardAs(FOUR, ...BISI));
    expect(b).not.toMatch(/waiting on the lead|Waiting on: the lead|on the lead for/i);
    expect(b).toMatch(/Kwame Mensah says the work is waiting on you for/);
    const board: any = await boardAs(FOUR, ...BISI);
    expect((board.whoWaitedOnWhom ?? []).length).toBe(1);
    expect((board.blockers ?? []).length).toBe(1);
  });

  it('the new hire reads that he is waiting on Bisi, and never "the lead"', async () => {
    const b = JSON.stringify(await boardAs(FOUR, ...KWAME));
    expect(b).not.toMatch(/waiting on the lead|Waiting on: the lead|on the lead for/i);
    expect(b).toMatch(/You are waiting on Bisi/);
  });
});

/**
 * REQUEST 125, FINDING 8. "My manager", "the boss" and "my supervisor" are somebody's own manager, who may not run this check-in at all.
 * They were read as the check-in's lead and put on Bisi by name. Only "the lead", and "your lead", "my lead" and "our lead", mean her.
 */
describe('a wait on somebody else’s manager is not a wait on the lead', () => {
  const on = (label: string): Setup => ({ ...SALES_RUN, dependencies: [{ ...wait('w1', 'the signed agreement', '2026-09-02T18:00:00Z'), onLabel: label }] });

  it.each(['my manager', 'the boss', 'my supervisor', 'my line manager'])('"%s" stays as said, and is not put on Bisi', async (label) => {
    for (const b of [JSON.stringify(await boardAs(on(label), ...BISI)), JSON.stringify(await boardAs(on(label), ...KWAME))]) {
      expect(b).toContain(label.replace(/^(?:my|the)\s+/, ''));
      expect(b).not.toMatch(/waiting on you for|waiting on Bisi/);
    }
  });

  it.each(['the lead', 'your lead', 'my lead', 'our lead', 'the team lead'])('"%s" is a wait on the lead', async (label) => {
    expect(JSON.stringify(await boardAs(on(label), ...BISI))).toMatch(/waiting on you for/);
    expect(JSON.stringify(await boardAs(on(label), ...KWAME))).toMatch(/You are waiting on Bisi/);
  });
});
