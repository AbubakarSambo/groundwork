import { SuggestionsListener } from './suggestions.listener';
import { SuggestionsService } from './suggestions.service';
import { SUGGESTION_THRESHOLDS_KEY } from './thresholds';

/**
 * WEEK 10, WIRED IN: reachFromTheRecord runs once per person, when a round of a check-in
 * completes - never when a page is opened, and never twice over for the same round.
 *
 * Atlas Logistics. Wairimu runs "Tobi, the next few weeks" (managing only, no account of his
 * own), Tobi is the one participant with a real check-in.
 */
const ground = {
  id: 'g-tobi',
  scenario: 'PIP',
  participants: [
    { id: 'p-wairimu', partyType: 'INITIATOR', roleAsDescribed: null, email: 'wairimu@atlas.test', managingOnly: true, createdAt: new Date(2026, 8, 1), nameGiven: null, user: { firstName: 'Wairimu', lastName: 'X', email: 'wairimu@atlas.test' } },
    { id: 'p-tobi', partyType: 'PARTICIPANT', roleAsDescribed: null, email: 'tobi@atlas.test', managingOnly: false, createdAt: new Date(2026, 8, 2), nameGiven: null, user: { firstName: 'Tobi', lastName: 'X', email: 'tobi@atlas.test' } },
  ],
};

function commitmentRows(kept: number, notDone: number, recentAt: Date) {
  return [
    ...Array.from({ length: kept }, () => ({ status: 'DONE', createdAt: recentAt })),
    ...Array.from({ length: notDone }, () => ({ status: 'NOT_DONE', createdAt: recentAt })),
  ];
}

function setup(opts: { thresholdRow?: any; kept?: number; notDone?: number }) {
  const suggestions: any[] = [];
  let n = 0;
  /* Three days before the run, so it stays inside the last four weeks whatever day the spec runs (it was a fixed 15 September). */
  const recentAt = new Date(Date.now() - 3 * 24 * 3_600_000);
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]: [string, any]) => (row[k] ?? null) === (v ?? null));
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async ({ select }: any) => {
        const wanted = select?.participants?.where;
        const participants = wanted
          ? ground.participants.filter((p) => Object.entries(wanted).every(([k, v]) => (p as any)[k] === v))
          : ground.participants;
        return { ...ground, participants };
      }),
    },
    groundParticipant: { findFirst: jest.fn(async ({ where }: any) => ground.participants.find((p) => p.id === where.id) ?? null) },
    groundCommitment: { findMany: jest.fn(async () => []) },
    checkIn: { findFirst: jest.fn(async () => ({ turns: [{ content: 'Most of my time has gone on the new routes.' }] })) },
    organizationMembership: { findUnique: jest.fn(async () => null) },
    user: { findMany: jest.fn(async () => []) },
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === SUGGESTION_THRESHOLDS_KEY ? (opts.thresholdRow ?? null) : null)),
    },
    suggestion: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `s-${++n}`, decision: null, createdAt: new Date(2026, 8, 1), ...data };
        suggestions.push(row);
        return { id: row.id };
      }),
      findFirst: jest.fn(async ({ where }: any) => suggestions.find((r) => matches(r, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => suggestions.filter((r) => matches(r, where))),
    },
  };
  /* Only the real participant, Tobi, has commitments in the record. */
  prisma.groundCommitment.findMany = jest.fn(async ({ where }: any) =>
    where.participantId === 'p-tobi' ? commitmentRows(opts.kept ?? 2, opts.notDone ?? 6, recentAt) : [],
  );
  const suggestionsService = new SuggestionsService(prisma);
  const listener = new SuggestionsListener(prisma, suggestionsService);
  return { listener, prisma, suggestions };
}

const event = { checkInId: 'c-1', groundId: 'g-tobi', participantId: 'p-tobi', sessionNumber: 1 } as any;

describe('the listener runs when a round comes in, never when a page is opened', () => {
  /* CHANGED 1 October: "no row" used to mean nothing set; decision 61 sets the first threshold from the start (see thresholdsInForce). */
  it('with the threshold emptied by an admin, nothing is written for anybody (decision 33)', async () => {
    const { listener, suggestions } = setup({ thresholdRow: { value: {} } });
    await listener.onCheckInCompleted(event);
    expect(suggestions).toHaveLength(0);
  });

  it('with no settings row at all, decision 61\'s threshold is the one in force', async () => {
    const { listener, suggestions } = setup({ kept: 2, notDone: 6 });
    await listener.onCheckInCompleted(event);
    expect(suggestions).toHaveLength(1);
  });

  it('with a threshold set and crossed, one suggestion is written, about the person it crosses for', async () => {
    const thresholdRow = { value: { support: { keptBelow: 0.6, overPeriods: 4 } } };
    const { listener, suggestions } = setup({ thresholdRow, kept: 2, notDone: 6 });
    await listener.onCheckInCompleted(event);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].aboutParticipantId).toBe('p-tobi');
    expect(suggestions[0].verdict).toBe('support');
  });

  it('tries every participant, not just the one whose check-in completed, and skips managing-only leads', async () => {
    const thresholdRow = { value: { support: { keptBelow: 0.6, overPeriods: 4 } } };
    const { listener, prisma } = setup({ thresholdRow, kept: 6, notDone: 2 });
    await listener.onCheckInCompleted(event);
    /* Wairimu is managing-only and never gets a commitments lookup at all. */
    const tried = prisma.groundCommitment.findMany.mock.calls.map((c: any[]) => c[0].where.participantId);
    expect(tried).toEqual(['p-tobi']);
  });

  it('does not write a second suggestion for the same person when the round comes in twice (confirmed item 17)', async () => {
    const thresholdRow = { value: { support: { keptBelow: 0.6, overPeriods: 4 } } };
    const { listener, suggestions } = setup({ thresholdRow, kept: 2, notDone: 6 });
    await listener.onCheckInCompleted(event);
    await listener.onCheckInCompleted(event);
    expect(suggestions).toHaveLength(1);
  });

  it('a failure for one person is caught and logged, and never rejects the event handler', async () => {
    const thresholdRow = { value: { support: { keptBelow: 0.6, overPeriods: 4 } } };
    const { listener, prisma, suggestions } = setup({ thresholdRow, kept: 2, notDone: 6 });
    /* CHANGED 1 October: the last thing they typed is no longer read (see the listener), so the failure is the commitments lookup. */
    prisma.groundCommitment.findMany = jest.fn(async () => { throw new Error('boom'); });
    await expect(listener.onCheckInCompleted(event)).resolves.toBeUndefined();
    /* The lookup failing is caught per person, not fatal. */
    expect(suggestions).toHaveLength(0);
  });
});
