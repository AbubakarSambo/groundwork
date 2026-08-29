import { DependencyStatus } from '@prisma/client';
import {
  OrgDependency,
  daysWaiting,
  whatThePlaceIsWaitingOn,
  whoIsBeingWaitedOn,
} from './what-the-whole-place-is-waiting-on';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const dep = (o: Partial<OrgDependency> = {}): OrgDependency => ({
  fromParticipantId: 'p1',
  onParticipantId: 'p2',
  onLabel: null,
  what: 'the paying-user pricing decision',
  status: DependencyStatus.WAITING,
  createdAt: daysAgo(3),
  groundId: 'g1',
  groundLabel: 'Q1 launch',
  fromPersonKey: 'ada@x.com',
  onPersonKey: 'kofi@x.com',
  ...o,
});

describe('a wait is measured from when it was first described', () => {
  it('not from the latest time somebody repeated it', () => {
    /*
     * The whole point of the measure, and the easy thing to get backwards. Someone saying "still
     * waiting on the pricing" every week for six weeks has waited six weeks. Dating it from the
     * newest mention makes the most persistent case look like the freshest one.
     */
    const [w] = whatThePlaceIsWaitingOn(
      [
        dep({ createdAt: daysAgo(42), what: 'the paying-user pricing decision' }),
        dep({ createdAt: daysAgo(1), what: 'paying user pricing' }),
      ],
      NOW,
    );
    expect(w.waitingDays).toBe(42);
  });

  it('and an undated handoff is zero rather than as old as the epoch', () => {
    expect(daysWaiting(undefined, NOW)).toBe(0);
  });

  it('and a wait recorded in the future does not read as negative', () => {
    expect(daysWaiting(new Date(NOW.getTime() + 86_400_000), NOW)).toBe(0);
  });
});

describe('the same wait in two grounds is one wait', () => {
  it('because counting it twice makes one stuck handoff look like a spreading problem', () => {
    const out = whatThePlaceIsWaitingOn(
      [
        dep({ groundId: 'g1', fromParticipantId: 'p-in-g1', createdAt: daysAgo(10) }),
        dep({ groundId: 'g2', fromParticipantId: 'p-in-g2', createdAt: daysAgo(4) }),
      ],
      NOW,
    );
    expect(out).toHaveLength(1);
    /* And it keeps the older date - the person has been waiting ten days, not four. */
    expect(out[0].waitingDays).toBe(10);
  });

  it('while two different people waiting on the same thing stay two waits', () => {
    const out = whatThePlaceIsWaitingOn(
      [dep({ fromPersonKey: 'ada@x.com' }), dep({ fromPersonKey: 'lin@x.com' })],
      NOW,
    );
    expect(out).toHaveLength(2);
  });
});

describe('it applies the board rules rather than restating them', () => {
  it('drops a throwaway mention that names nothing specific', () => {
    expect(whatThePlaceIsWaitingOn([dep({ what: 'stuff' })], NOW)).toHaveLength(0);
  });

  it('drops a wait on yourself', () => {
    /* Naming your own outstanding decision is a normal thing to say, and being blocked switches off
       every negative read about a person. Waiting on yourself must not buy that. */
    expect(
      whatThePlaceIsWaitingOn([dep({ onPersonKey: 'ada@x.com', onParticipantId: 'p1', fromParticipantId: 'p1' })], NOW),
    ).toHaveLength(0);
  });

  it('drops one already cleared', () => {
    expect(whatThePlaceIsWaitingOn([dep({ status: DependencyStatus.CLEARED })], NOW)).toHaveLength(0);
  });
});

describe('who is being waited on', () => {
  /*
   * The "outside" case is guarded by the type system rather than by this test: `onPersonKey` is
   * `string | null`, and removing the null check does not compile. That is the stronger guard of the
   * two, so this asserts the behaviour rather than pretending to be what protects it.
   */
  it('names nobody for a wait on something outside the organisation', () => {
    /* Inventing an owner would point the finger at whoever happened to be nearby. */
    const waiting = whatThePlaceIsWaitingOn(
      [dep({ onPersonKey: null, onParticipantId: null, onLabel: 'the bank' })],
      NOW,
    );
    expect(waiting).toHaveLength(1);
    expect(whoIsBeingWaitedOn(waiting)).toHaveLength(0);
  });

  it('puts the longest wait first, not the biggest pile', () => {
    /*
     * Somebody holding one handoff for a month is a worse problem than somebody holding three for a
     * day, and sorting by count would put the second one on top.
     */
    const waiting = whatThePlaceIsWaitingOn(
      [
        dep({ fromPersonKey: 'a@x', onPersonKey: 'busy@x', what: 'the launch copy sign off', createdAt: daysAgo(2) }),
        dep({ fromPersonKey: 'b@x', onPersonKey: 'busy@x', what: 'the vendor contract review', createdAt: daysAgo(1) }),
        dep({ fromPersonKey: 'c@x', onPersonKey: 'slow@x', what: 'the pricing decision itself', createdAt: daysAgo(30) }),
      ],
      NOW,
    );
    const out = whoIsBeingWaitedOn(waiting);
    expect(out.map((o) => o.personKey)).toEqual(['slow@x', 'busy@x']);
    expect(out[0].longestDays).toBe(30);
  });

  it('carries a count and a longest wait and nothing that ranks people', () => {
    const [first] = whoIsBeingWaitedOn(whatThePlaceIsWaitingOn([dep()], NOW));
    expect(Object.keys(first).sort()).toEqual(['longestDays', 'personKey', 'waiting']);
  });
});
