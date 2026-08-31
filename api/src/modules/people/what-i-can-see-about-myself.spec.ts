import { forTheirOwnEyes, whyWithheld, NEVER_ABOUT_YOURSELF } from './what-i-can-see-about-myself';

describe('the exclusions apply to their own view too', () => {
  it('a writing-quality score is not shown to the person it is about', () => {
    /*
     * The reading people get backwards, because a subject-access request feels like it should
     * override everything. The reason those things never leave is that they should not exist as a
     * judgement about a person at all, and showing them to the person does not make them true.
     */
    const { value, withheld } = forTheirOwnEyes({ text: 'ok', clarityScore: 0.4 });
    expect(value).toEqual({ text: 'ok' });
    expect(withheld).toContain('clarityScore');
  });

  it('and neither is a verdict or a recommendation about them', () => {
    const { value } = forTheirOwnEyes({ verdict: 'exit', recommendation: 'PIP', keep: 1 });
    expect(value).toEqual({ keep: 1 });
  });

  it('and it catches the field however it is spelled', () => {
    for (const key of ['score', 'writingQualityScore', 'RANK', 'percentile']) {
      expect(Object.keys(forTheirOwnEyes({ [key]: 1, safe: 2 }).value)).toEqual(['safe']);
    }
    expect(NEVER_ABOUT_YOURSELF.length).toBeGreaterThan(0);
  });
});

describe('a record that names them can be about somebody else', () => {
  it('so a divergence finding does not hand them the other person\'s read', () => {
    const { value, withheld } = forTheirOwnEyes({
      key: 'goal_divergence', says: 'this objective is described as different work', diverging: 3,
    });
    expect(value).toEqual({ key: 'goal_divergence', says: 'this objective is described as different work' });
    expect(withheld).toContain('diverging');
  });

  it('and strips them at any depth', () => {
    const { value } = forTheirOwnEyes({ a: { b: [{ speakers: ['x'], keep: 1 }] } });
    expect(value).toEqual({ a: { b: [{ keep: 1 }] } });
  });

  it('and leaves dates alone rather than turning them into objects', () => {
    const d = new Date('2026-03-01T00:00:00Z');
    expect(forTheirOwnEyes({ at: d }).value.at).toBe(d);
  });
});

describe('saying what was withheld and why', () => {
  it('gives a reason, not a list of field names', () => {
    /* Somebody who asked for everything about themselves and got a list of keys they cannot see has
       been told less than nothing. */
    const why = whyWithheld(['clarityScore', 'diverging']);
    expect(why).toHaveLength(2);
    expect(why[0]).toMatch(/never leave this product for anyone/);
    expect(why[1]).toMatch(/their account of their own work is theirs/);
  });

  it('and distinguishes the two reasons, because only one is about them', () => {
    expect(whyWithheld(['clarityScore'])).toHaveLength(1);
    expect(whyWithheld(['diverging'])[0]).toMatch(/name other people/);
  });

  it('and says nothing when nothing was withheld', () => {
    expect(whyWithheld([])).toEqual([]);
  });
});
