import { yourBoard } from './your-board';

/**
 * Request 96. As Amani, "What you said you'd do" listed each promise twice: "I will deliver the
 * Tuskys cookers" (on 9 October) and then the same promise said whole. The record holds both rows;
 * the You board serves one, in the person's own fuller words, with its date, in one form.
 */
const SHORT = { id: 'c1', text: 'I will deliver the Tuskys cookers', whenSaid: 'on 9 October' };
const LONG = { id: 'c2', text: 'I will deliver the Tuskys cookers on 9 October and ask for the signed order form that day.', whenSaid: '9 October' };

const board = (commitments: any[], userId = 'u-amani') =>
  yourBoard(
    [
      { id: 'g1', label: 'Sales team, Q3', organizationId: 'o1', initiatorId: 'u-rukia', participants: [{ id: 'p-amani', userId: 'u-amani' }, { id: 'p-rukia', userId: 'u-rukia' }] } as any,
      { id: 'g2', label: 'Leadership, Q3', organizationId: 'o1', initiatorId: 'u-rukia', participants: [{ id: 'p-amani2', userId: 'u-amani' }] } as any,
    ],
    { userId, organizationId: 'o1' },
    { objectives: [], ownedTargets: [], coaching: [], todos: [], commitments: commitments.map((c, i) => ({ groundId: 'g1', participantId: 'p-amani', status: 'UNKNOWN', settledBy: null, createdAt: new Date(`2026-09-2${i}T10:00:00Z`), ...c })) as any },
    new Date('2026-09-29T12:00:00Z'),
  ).saidYoudDo;

describe('the You board, as Amani', () => {
  it('serves the promise once, in her fuller words, with its date in one form', () => {
    const r = board([SHORT, LONG]);
    /* Request 98: the You board now writes a promise as an action ("Deliver ..."), so compare the
       promise without its leading "I will" and its first letter. Still once, the fuller words, one date form. */
    const promise = (t: string) => t.replace(/^\s*i will\s+/i, '').replace(/^./, (c) => c.toLowerCase());
    expect(r.map((x) => [promise(x.text), x.when, x.checkIn])).toEqual([
      ['deliver the Tuskys cookers on 9 October and ask for the signed order form that day.', '9 October', 'Sales team, Q3'],
    ]);
  });

  it('serves the same whichever order the record holds them', () => {
    expect(board([LONG, SHORT]).map((x) => x.id)).toEqual(['c2']);
  });

  it('takes the short one’s date when the fuller one has none', () => {
    const r = board([SHORT, { ...LONG, whenSaid: null }]);
    expect(r).toHaveLength(1);
    expect(r[0].text).toMatch(/ask for the signed order form/);
    expect(r[0].when).toBe('9 October');
  });

  it('does not merge two different promises', () => {
    expect(board([SHORT, { id: 'c3', text: 'I will deliver the Tuskys cookers to Nakuru', whenSaid: 'on 12 October' }, { id: 'c4', text: 'I will collect the van from Nairobi', whenSaid: '10 October' }])).toHaveLength(3);
    expect(board([{ id: 'a', text: 'I will call Amos about the engine', whenSaid: 'Friday' }, { id: 'b', text: 'I will call Amos about the engine and Zawadi about the bundle on Monday', whenSaid: 'Monday' }])).toHaveLength(2);
  });

  it('does not merge a promise in one check-in with the same words in another', () => {
    const r = board([SHORT, { ...LONG, groundId: 'g2', participantId: 'p-amani2' }]);
    expect(r.map((x) => x.checkIn).sort()).toEqual(['Leadership, Q3', 'Sales team, Q3']);
  });

  it('does not fold a settled promise into an open one', () => {
    expect(board([SHORT, { ...LONG, status: 'DONE' }])).toHaveLength(2);
  });

  it('serves four promises as four, not eight', () => {
    const pairs = ['cookers', 'van', 'engine', 'bundle'].flatMap((w, i) => [
      { id: `s${i}`, text: `I will deliver the ${w}`, whenSaid: `on ${9 + i} October` },
      { id: `l${i}`, text: `I will deliver the ${w} on ${9 + i} October and ask for the signed form that day.`, whenSaid: `${9 + i} October` },
    ]);
    expect(board(pairs).map((x) => x.id)).toEqual(['l0', 'l1', 'l2', 'l3']);
  });
});

describe('the You board, as the lead of the same check-in', () => {
  it('holds only her own promises, never Amani’s', () => {
    // The lead reads her own You board; Amani's rows belong to Amani's participant and are not hers.
    const r = board([SHORT, LONG], 'u-rukia');
    expect(r).toEqual([]);
  });

  it('serves her own short and whole promise once, too', () => {
    const r = yourBoard(
      [{ id: 'g1', label: 'Sales team, Q3', organizationId: 'o1', initiatorId: 'u-rukia', participants: [{ id: 'p-rukia', userId: 'u-rukia' }] } as any],
      { userId: 'u-rukia', organizationId: 'o1' },
      { objectives: [], ownedTargets: [], coaching: [], todos: [], commitments: [SHORT, LONG].map((c) => ({ ...c, groundId: 'g1', participantId: 'p-rukia', status: 'UNKNOWN', settledBy: null, createdAt: new Date('2026-09-20T10:00:00Z') })) as any },
      new Date('2026-09-29T12:00:00Z'),
    ).saidYoudDo;
    expect(r.map((x) => x.id)).toEqual(['c2']);
  });
});
