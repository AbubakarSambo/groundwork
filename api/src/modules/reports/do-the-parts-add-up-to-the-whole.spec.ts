import { howTheNumbersSit } from './do-the-parts-add-up-to-the-whole';

/*
 * "The shared report has no reasoning at all. And doesnt tell us to go work out individual targets
 * and also the fact that all of us are listing goals too low to meet the objective."
 *
 * Read off a real report on 15 September 2026: the objective was 10,000 units of tea, the three
 * people in it had described 2,000 units, 150 bags and 50 bags each, and the report's finding was
 * that the role was never clearly defined.
 */
describe('do the parts add up to the whole', () => {
  const whole = (n: number, name = `${n} contracts`) => ({ name, target: n, ownerParticipantId: null });
  const part = (n: number, who: string, name = `Carry ${n} contracts`) => ({ name, target: n, ownerParticipantId: who });

  it('says how far short the individual numbers fall, and what to do about it', () => {
    const out = howTheNumbersSit([whole(500), part(150, 'a'), part(150, 'b')], 4);
    expect(out.says).toContain('500');
    expect(out.says).toContain('300');
    expect(out.says).toContain('200 short');
    expect(out.says).toMatch(/agree who carries/);
    expect(out.partsTotal).toBe(300);
  });

  it('and says when nobody has a number at all, which is its own finding', () => {
    const out = howTheNumbersSit([whole(10000, '10,000 packs of tea')], 3);
    expect(out.says).toMatch(/nobody in this check-in has a number of their own/);
    expect(out.says).toMatch(/agreeing who carries how much is the thing to do next/);
    expect(out.peopleWithATarget).toBe(0);
  });

  it('refuses to add numbers that count different things, which is what hers did', () => {
    const out = howTheNumbersSit(
      [whole(10000, '10,000 units of tea'), part(2000, 's', '2000 units of tea crm'), part(150, 'h', '150 bags')],
      3,
    );
    expect(out.comparable).toBe(false);
    expect(out.partsTotal).toBeNull();
    expect(out.says).toMatch(/cannot be added up/);
    expect(out.says).toMatch(/agreeing one way of counting/);
    /* 2,150 is a number nobody said. It must not appear. */
    expect(out.says).not.toContain('2,150');
  });

  it('says so when the parts reach the whole, because that is the one case needing no conversation', () => {
    const out = howTheNumbersSit([whole(300), part(150, 'a'), part(150, 'b')], 2);
    expect(out.says).toMatch(/exactly the objective/);
  });

  it('and names an overshoot without calling it a problem', () => {
    const out = howTheNumbersSit([whole(300), part(200, 'a'), part(200, 'b')], 2);
    expect(out.says).toMatch(/100 more than the objective/);
    expect(out.says).toMatch(/not a problem in itself/);
  });

  it('says nothing where there is nothing true to say', () => {
    expect(howTheNumbersSit([], 3).says).toBeNull();
    expect(howTheNumbersSit([part(150, 'a')], 3).says).toBeNull();
    /* A target with no number is not arithmetic. */
    expect(howTheNumbersSit([{ name: 'ship the thing', target: null, ownerParticipantId: null }], 2).says).toBeNull();
  });

  it('never reads as a judgement about a person', () => {
    const out = howTheNumbersSit([whole(500), part(150, 'a')], 4);
    for (const blame of ['behind', 'failing', 'should have', 'not enough effort', 'underperform']) {
      expect(out.says!.toLowerCase()).not.toContain(blame);
    }
  });
});
