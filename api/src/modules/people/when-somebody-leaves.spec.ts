import {
  clampRetention, windowHasClosed, collapsedAttribution, readyToAgeOut,
  RETENTION_FLOOR_DAYS, RETENTION_CEILING_DAYS, RETENTION_DEFAULT_DAYS,
} from './when-somebody-leaves';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe('the window a customer may choose', () => {
  it('cannot be set to zero', () => {
    /*
     * Zero deletes the substrate the moment somebody leaves, and the findings about the objectives
     * they touched stop being explicable to the people still working on them.
     */
    expect(clampRetention(0)).toBe(RETENTION_FLOOR_DAYS);
    expect(clampRetention(-100)).toBe(RETENTION_FLOOR_DAYS);
  });

  it('and cannot be set to forever', () => {
    /* A retention policy that can be set to forever is not a retention policy. It is a setting that
       looks like one in a security review. */
    expect(clampRetention(99_999)).toBe(RETENTION_CEILING_DAYS);
    expect(clampRetention(Infinity)).toBe(RETENTION_DEFAULT_DAYS);
  });

  it('and an unset policy is a real number, not unbounded', () => {
    expect(clampRetention(null)).toBe(RETENTION_DEFAULT_DAYS);
    expect(clampRetention(undefined)).toBe(RETENTION_DEFAULT_DAYS);
    expect(RETENTION_DEFAULT_DAYS).toBeGreaterThanOrEqual(RETENTION_FLOOR_DAYS);
    expect(RETENTION_DEFAULT_DAYS).toBeLessThanOrEqual(RETENTION_CEILING_DAYS);
  });

  it('and a value inside the bounds is honoured', () => {
    expect(clampRetention(90)).toBe(90);
  });
});

describe('when the window closes', () => {
  it('is measured from the departure, not the last thing they said', () => {
    /*
     * Somebody who stopped talking six months before they left has already had their exposure
     * running for six months. Dating it from their last message extends it for the person who went
     * quiet, which is exactly backwards.
     */
    expect(windowHasClosed(daysAgo(RETENTION_DEFAULT_DAYS + 1), RETENTION_DEFAULT_DAYS, NOW)).toBe(true);
    expect(windowHasClosed(daysAgo(RETENTION_DEFAULT_DAYS - 1), RETENTION_DEFAULT_DAYS, NOW)).toBe(false);
  });

  it('and an out-of-range policy is clamped here too, not only where it is set', () => {
    /* Otherwise a row written before the clamp existed, or by a migration, is unbounded forever. */
    expect(windowHasClosed(daysAgo(40), 0, NOW)).toBe(true);
    expect(windowHasClosed(daysAgo(40), 99_999, NOW)).toBe(false);
  });
});

describe('what a finding says once the person has gone', () => {
  it('names the role, not them', () => {
    /*
     * The finding still matters - it explains why an objective went the way it did - but the name in
     * it is a statement about somebody no longer here to answer it, in a record their former
     * colleagues read.
     */
    expect(collapsedAttribution('Head of Partnerships')).toBe('the person who held Head of Partnerships');
  });

  it('and says something rather than nothing when the role is unknown', () => {
    expect(collapsedAttribution(null)).toBe('someone who has since left');
    expect(collapsedAttribution(null)).not.toMatch(/null|undefined/);
  });
});

describe('what the sweep picks up', () => {
  const dep = (o: any = {}) => ({ personExternalId: 'gone', departedAt: daysAgo(200), turnsDeletedAt: null, ...o });

  it('departures past the window whose turns are still here', () => {
    expect(readyToAgeOut([dep()], RETENTION_DEFAULT_DAYS, NOW)).toHaveLength(1);
  });

  it('and never one it has already done', () => {
    /* Otherwise the job runs every night against the same departure forever, and the audit record
       says it deleted turns that were gone months ago. */
    expect(readyToAgeOut([dep({ turnsDeletedAt: daysAgo(1) })], RETENTION_DEFAULT_DAYS, NOW)).toEqual([]);
  });

  it('and never one still inside its window', () => {
    expect(readyToAgeOut([dep({ departedAt: daysAgo(10) })], RETENTION_DEFAULT_DAYS, NOW)).toEqual([]);
  });
});
