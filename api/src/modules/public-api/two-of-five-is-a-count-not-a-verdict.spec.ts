import { whereItStands, mayMarkMet, Criterion, NEEDS_A_REASON, NEVER_CONCLUDE_FROM_CRITERIA } from './what-would-have-to-be-true';

const c = (over: Partial<Criterion> & { ordinal: number }): Criterion => ({
  text: 'the scenario runs end to end on a real vehicle',
  metAt: null, metBecause: null, ...over,
});

describe('what would have to be true, held across sessions', () => {
  it('counts what is met against what was agreed', () => {
    const out = whereItStands([
      c({ ordinal: 1, metAt: new Date(), metBecause: 'run 412 passed on the rig' }),
      c({ ordinal: 2 }),
      c({ ordinal: 3 }),
    ]);
    expect(out.met).toBe(1);
    expect(out.total).toBe(3);
    expect(out.says[0]).toBe('1 of 3 met.');
  });

  it('names what is still open, because that is the part anybody can act on', () => {
    const out = whereItStands([
      c({ ordinal: 1, text: 'hardware pairing works', metAt: new Date(), metBecause: 'x' }),
      c({ ordinal: 2, text: 'telemetry captured' }),
    ]);
    /* Checked on the still-open line alone: the met one appears elsewhere, in the line saying what
       was accepted as showing it, and scanning the whole output cannot tell those two apart. */
    const stillOpen = out.says.find((l) => l.startsWith('Still open:'))!;
    expect(stillOpen).toContain('"telemetry captured"');
    expect(stillOpen).not.toContain('hardware pairing');
  });

  it('says what was accepted as showing the met ones', () => {
    /* A reader who cannot check the work can at least see what somebody accepted as proof. */
    const out = whereItStands([c({ ordinal: 1, metAt: new Date(), metBecause: 'run 412 passed on the rig' })]);
    expect(out.says.join(' ')).toContain('on the strength of: run 412 passed on the rig');
  });

  it('reads them in the order they were agreed, not the order they arrived', () => {
    const out = whereItStands([c({ ordinal: 2, text: 'second' }), c({ ordinal: 1, text: 'first' })]);
    expect(out.says.join(' ').indexOf('first')).toBeLessThan(out.says.join(' ').indexOf('second'));
  });

  it('says nothing at all when nothing was agreed', () => {
    expect(whereItStands([]).says).toEqual([]);
  });
});

describe('a tick needs something behind it', () => {
  it('refuses a met with no reason', () => {
    expect(mayMarkMet(null).may).toBe(false);
    expect(mayMarkMet('   ').may).toBe(false);
    expect(mayMarkMet(undefined).why).toBe(NEEDS_A_REASON);
  });

  it('accepts one with a reason', () => {
    expect(mayMarkMet('run 412 passed on the rig').may).toBe(true);
  });

  it('says why it is refusing, in terms of what the refusal protects', () => {
    expect(NEEDS_A_REASON).toContain('records somebody\'s belief as a fact');
  });
});

describe('and the count decides nothing', () => {
  it('forbids reading a person out of it', () => {
    for (const phrase of ['never a measure of anybody', 'may have chosen badly', 'behind, ']) {
      expect(NEVER_CONCLUDE_FROM_CRITERIA).toContain(phrase);
    }
  });

  it('names the three things it cannot tell you', () => {
    expect(NEVER_CONCLUDE_FROM_CRITERIA).toContain('whether the remaining three are late');
    expect(NEVER_CONCLUDE_FROM_CRITERIA).toContain('marked fairly');
    expect(NEVER_CONCLUDE_FROM_CRITERIA).toContain('the right five');
  });
});
