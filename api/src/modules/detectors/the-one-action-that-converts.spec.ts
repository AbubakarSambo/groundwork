import {
  findNeglectedPrimary, currentPeriod, pastMidpoint, roleFor, sayNeglectedPrimary,
  CADENCE_DAYS, GRACE_PERIODS, RoleRow,
} from './the-one-action-that-converts';

const DAY = 86_400_000;
const at = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY);
const NOW = new Date('2026-06-01T12:00:00Z');

const ROLE: RoleRow = {
  key: 'account-lead',
  name: 'Account lead',
  primaryActionKey: 'customer-visit',
  primaryActionName: 'Sitting with a customer',
  primaryActionCadence: 'FORTNIGHTLY',
};

const inputs = (over: Partial<Parameters<typeof findNeglectedPrimary>[0]> = {}) => ({
  roles: [ROLE],
  /* 64 days is four full fortnights plus eight, so the current period is past its midpoint - the
     default fixture has to be a case the detector actually speaks about. At 60 it was four days in
     and silent, which is the rule working rather than a bug, and it took three failing tests to
     see that. */
  assignments: [{ personExternalId: 'u-1', roleName: 'Account lead', startedAt: at(64) }],
  events: [],
  activePeople: new Set(['u-1']),
  now: NOW,
  ...over,
});

describe('the one action that converts', () => {
  it('says nothing before the period is half gone', () => {
    /*
     * THE RULE THE WHOLE DETECTOR TURNS ON. A fortnightly action not done on day two is not
     * neglected, it is day two. A detector that is right eventually and wrong all fortnight is one
     * people stop reading, and they stop reading it in the first fortnight.
     */
    const startedAt = at(28); // exactly two full periods, so today is day 0 of the third
    expect(findNeglectedPrimary(inputs({ assignments: [{ personExternalId: 'u-1', roleName: 'Account lead', startedAt }] }))).toEqual([]);

    const sixDaysIn = new Date(startedAt.getTime() + 28 * DAY + 6 * DAY);
    expect(findNeglectedPrimary(inputs({
      assignments: [{ personExternalId: 'u-1', roleName: 'Account lead', startedAt }], now: sixDaysIn,
    }))).toEqual([]);

    const eightDaysIn = new Date(startedAt.getTime() + 28 * DAY + 8 * DAY);
    expect(findNeglectedPrimary(inputs({
      assignments: [{ personExternalId: 'u-1', roleName: 'Account lead', startedAt }], now: eightDaysIn,
    }))).toHaveLength(1);
  });

  it('says nothing in somebody\'s first period in the role', () => {
    /* That clock started before they were there. Flagging it judges them for somebody else's time. */
    const found = findNeglectedPrimary(inputs({
      assignments: [{ personExternalId: 'u-1', roleName: 'Account lead', startedAt: at(10) }],
    }));
    expect(found).toEqual([]);
    expect(GRACE_PERIODS).toBe(1);
  });

  it('says nothing about somebody who has done nothing at all', () => {
    /*
     * Silence from a person with no activity is a different finding with a different answer - they
     * may have left, or be on leave, or be blocked on something nobody wrote down. no_checkin owns
     * that, and answering it with a coaching nudge about their hardest action is the wrong reply to
     * somebody nobody has spoken to.
     */
    expect(findNeglectedPrimary(inputs({ activePeople: new Set() }))).toEqual([]);
  });

  it('fires when the action is missing from this period, and carries the last time it happened', () => {
    const found = findNeglectedPrimary(inputs({
      events: [{ personExternalId: 'u-1', actionKey: 'customer-visit', occurredAt: at(40) }],
    }));
    expect(found).toHaveLength(1);
    expect(found[0].lastDoneAt).toEqual(at(40));
    expect(found[0].actionName).toBe('Sitting with a customer');
  });

  it('is satisfied by the action happening once in the period, however late', () => {
    const found = findNeglectedPrimary(inputs({
      events: [{ personExternalId: 'u-1', actionKey: 'customer-visit', occurredAt: at(1) }],
    }));
    expect(found).toEqual([]);
  });

  it('does not count somebody else\'s action, or a different action', () => {
    expect(findNeglectedPrimary(inputs({
      events: [{ personExternalId: 'u-2', actionKey: 'customer-visit', occurredAt: at(1) }],
    }))).toHaveLength(1);
    expect(findNeglectedPrimary(inputs({
      events: [{ personExternalId: 'u-1', actionKey: 'wrote-a-report', occurredAt: at(1) }],
    }))).toHaveLength(1);
  });

  it('stays silent on a role nobody has given a primary action', () => {
    const bare = { ...ROLE, primaryActionKey: null, primaryActionCadence: null };
    expect(findNeglectedPrimary(inputs({ roles: [bare] }))).toEqual([]);
    /* And on an assignment naming a role that has never been configured, which is not an error. */
    expect(findNeglectedPrimary(inputs({ roles: [] }))).toEqual([]);
  });

  it('matches an assignment to a role by key or by name, either case', () => {
    expect(roleFor('Account lead', [ROLE])?.key).toBe('account-lead');
    expect(roleFor('account-lead', [ROLE])?.key).toBe('account-lead');
    expect(roleFor('ACCOUNT LEAD', [ROLE])?.key).toBe('account-lead');
    expect(roleFor('  Account lead  ', [ROLE])?.key).toBe('account-lead');
    expect(roleFor('Something else', [ROLE])).toBeNull();
    expect(roleFor('', [ROLE])).toBeNull();
  });

  it('counts periods from when they took the role, not from the calendar', () => {
    /*
     * A calendar month judges somebody who started on the 28th on three days of it, and a quarter
     * is four dates a year that have nothing to do with when this person picked up this work.
     */
    const started = new Date('2026-01-15T09:00:00Z');
    const p = currentPeriod(started, 'MONTHLY', new Date('2026-03-20T09:00:00Z'));
    expect(p.index).toBe(2);
    expect(p.start).toEqual(new Date(started.getTime() + 2 * 30 * DAY));
    expect(pastMidpoint(p, new Date(p.start.getTime() + 16 * DAY))).toBe(true);
    expect(pastMidpoint(p, new Date(p.start.getTime() + 14 * DAY))).toBe(false);
  });

  it('states what did not happen, and never why', () => {
    const [n] = findNeglectedPrimary(inputs());
    const said = sayNeglectedPrimary(n);

    expect(said).toContain('Sitting with a customer');
    expect(said).toContain('once a fortnight');
    expect(said).toContain('no record of it having happened at all');
    /* No motive, no verdict, no pattern claimed from one period. */
    expect(said).not.toMatch(/avoid|refus|unwilling|lazy|excuse|pattern|always|never bothers/i);
  });

  it('has a period length for every cadence it accepts', () => {
    for (const c of ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY'] as const) {
      expect(CADENCE_DAYS[c]).toBeGreaterThan(0);
    }
  });
});
