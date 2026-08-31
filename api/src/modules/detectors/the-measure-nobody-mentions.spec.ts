import {
  findMeasureGaps, measureCameUp, sayIt, MENTIONS_BEFORE_IT_MEANS_ANYTHING,
  MeasuredSubject, Mention, TheirFigure,
} from './nobody-mentions-what-it-is-measured-by';

/**
 * THE OBJECTIVE IS DISCUSSED AND THE THING IT IS JUDGED BY IS NOT.
 *
 * "How can our tool auto detect what they measure and help, or do we need their devs to tell us?"
 * Both. We cannot invent a measure - we only see what is sent. But once it is sent we can compare
 * it against what people actually talk about, and that comparison had never been made.
 */
const NOW = new Date('2026-06-01T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const subject = (over: Partial<MeasuredSubject> = {}): MeasuredSubject => ({
  externalId: 'OKR-1', title: 'Grow the pipeline', measure: 'pipeline value', target: '2m', ...over,
});

const saying = (texts: string[]): Mention[] =>
  texts.map((text, i) => ({ subjectExternalId: 'OKR-1', text, at: daysAgo(i + 1) }));

describe('the measure nobody mentions', () => {
  it('fires when an objective is talked about and its measure never is', () => {
    const gaps = findMeasureGaps([subject()], saying([
      'We got three demos out this week and the deck is finally right.',
      'Two more intros from the conference, both warm.',
      'Spent most of the week on the follow-up sequence.',
    ]));
    expect(gaps).toHaveLength(1);
    expect(gaps[0].mentions).toBe(3);
    expect(gaps[0].measure).toBe('pipeline value');
  });

  it('is silent when the measure does come up', () => {
    const gaps = findMeasureGaps([subject()], saying([
      'Pipeline value is sitting at about half where we need it.',
      'Three demos out.',
      'Follow-up sequence rewritten.',
    ]));
    expect(gaps).toEqual([]);
  });

  it('counts a number as the measure coming up, even without the words', () => {
    /*
     * An objective measured by "pipeline value in dollars" is being measured when somebody says
     * "we are at 240k". Insisting on the words would fire hardest on the teams doing this best.
     */
    expect(measureCameUp('pipeline value in dollars', 'we are at 240k, up from 180k')).toBe(true);
    expect(measureCameUp('response time', 'down to 300ms on the p95')).toBe(true);
    expect(measureCameUp('pipeline value', 'the deck is finally right')).toBe(false);
    /*
     * And a bare count is not a measurement. "We shipped 3 things" would otherwise suppress the
     * finding on exactly the teams that need it - busy, talking, and never near the number.
     */
    expect(measureCameUp('pipeline value', 'we shipped 3 things this week')).toBe(false);
    expect(measureCameUp('pipeline value', 'closed 2 of the 4 demos')).toBe(false);
    expect(measureCameUp('pipeline value', 'we are at $240,000 committed')).toBe(true);
  });

  it('ignores measure words the title already contains', () => {
    /*
     * FOUND BY RUNNING IT, not by reading it. "Grow the pipeline" measured by "pipeline value"
     * could never fire: saying the objective's name counted as saying its measure, so every mention
     * matched and the gap was invisible on exactly the objectives whose measure restates their
     * name. Only the words the measure adds are looked for.
     */
    const gaps = findMeasureGaps([subject({ title: 'Grow the pipeline', measure: 'pipeline value' })], saying([
      'Spent the week on grow the pipeline - three demos out.',
      'More on grow the pipeline: two warm intros.',
      'Grow the pipeline again, rewrote the follow-up.',
    ]));
    expect(gaps).toHaveLength(1);

    /* And it still stays quiet once the added word turns up. */
    expect(findMeasureGaps([subject({ title: 'Grow the pipeline', measure: 'pipeline value' })], saying([
      'Grow the pipeline - value is at half of where we need it.',
      'More on grow the pipeline.',
      'Grow the pipeline again.',
    ]))).toEqual([]);
  });

  it('says nothing when the measure is only the title again', () => {
    /*
     * "Grow the pipeline" measured by "pipeline" is not a measure, and it is a real gap - but it is
     * about the record rather than the conversation, which is `unowned_gap`'s kind. Two detectors
     * arguing about the same objective is worse than one of them staying quiet.
     */
    expect(findMeasureGaps([subject({ title: 'Grow the pipeline', measure: 'pipeline' })], saying([
      'grow the pipeline a', 'grow the pipeline b', 'grow the pipeline c',
    ]))).toEqual([]);
  });

  it('says nothing about an objective with no measure on it', () => {
    /* Nothing was declared, so there is nothing to have gone missing. `unowned_gap` owns that. */
    expect(findMeasureGaps([subject({ measure: null })], saying(['a', 'b', 'c']))).toEqual([]);
    expect(findMeasureGaps([subject({ measure: '   ' })], saying(['a', 'b', 'c']))).toEqual([]);
  });

  it('waits for a pattern rather than firing on a quiet fortnight', () => {
    const twice = findMeasureGaps([subject()], saying(['the deck is right', 'more intros']));
    expect(twice).toEqual([]);
    expect(MENTIONS_BEFORE_IT_MEANS_ANYTHING).toBe(3);
  });

  it('is not objective_unmentioned - it needs the objective to be discussed', () => {
    /*
     * The opposite situation and a more uncomfortable one: this is being worked on, it is being
     * talked about, and the number on it has never come up. That is how a team ends up busy and
     * behind at the same time.
     */
    expect(findMeasureGaps([subject()], [])).toEqual([]);
  });

  it('refuses to choose between the two readings, and names nobody', () => {
    const [gap] = findMeasureGaps([subject()], saying(['a deck', 'some intros', 'a sequence']));
    const said = sayIt(gap);

    expect(said).toContain('Either it is not really how this is judged, or the work has moved away from it');
    /* The gap is between a field and a conversation. It is not anybody's fault. */
    expect(said).not.toMatch(/\b(they|he|she|nobody is|failing|behind on|has not been doing)\b/i);
    expect(said).toContain('pipeline value');
    expect(said).toContain('target of 2m');
  });

  /*
   * WHEN THEIR OWN SYSTEM IS PUSHING THE NUMBER.
   *
   * This is the case the CRM path made possible and the one this detector used to get wrong. It
   * was written to catch a measure nobody says. With a feed running, the common failure inverts:
   * the number is known, it is current, it moves every night, and it has still never reached a
   * conversation. Same silence, opposite cause, and the old sentence blamed the wrong thing.
   */
  describe('when their own system is pushing the figure', () => {
    const figure = (over: Partial<TheirFigure> = {}): TheirFigure => ({
      subjectExternalId: 'OKR-1',
      state: '{"committed":"1.1m","deals":"7"}',
      observedAt: daysAgo(1),
      ...over,
    });

    const quiet = () => saying([
      'We got three demos out this week and the deck is finally right.',
      'Two more intros from the conference, both warm.',
      'Spent most of the week on the follow-up sequence.',
    ]);

    it('carries their figure onto the gap', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [figure()]);
      expect(gap.theirFigure?.state).toBe('{"committed":"1.1m","deals":"7"}');
    });

    it('stops hedging about whether the measure is real', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [figure()]);
      const said = sayIt(gap);
      /*
       * The hedge is not caution here, it is wrong: nobody wires up a nightly feed for a measure
       * they do not believe in. Saying it anyway teaches people to stop reading these.
       */
      expect(said).not.toContain('not really how this is judged');
      expect(said).toContain('being kept and not discussed');
      /* Their keys, their values, in a sentence rather than as a JSON dump - see `readable`. */
      expect(said).toContain('committed 1.1m, deals 7');
      expect(said).not.toContain('{"committed"');
    });

    it('prints a bare figure exactly as they sent it', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [figure({ state: '1.1m' })]);
      expect(sayIt(gap)).toContain('tracking Grow the pipeline at 1.1m');
    });

    it('never renders an object at somebody', () => {
      /* The bug this guards is "[object Object]" in a sentence about their pipeline. */
      const [gap] = findMeasureGaps([subject()], quiet(), [
        figure({ state: '{"nested":{"a":1},"committed":"1.1m"}' }),
      ]);
      const said = sayIt(gap);
      expect(said).toContain('committed 1.1m');
      expect(said).not.toContain('[object');
    });

    it('quotes their observation time, not ours', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [figure({ observedAt: daysAgo(30) })]);
      /* A month-old feed has to read as a month old, or the finding launders staleness as now. */
      expect(sayIt(gap)).toContain('last seen 2026-05-02');
    });

    it('says the figure and not the date when they sent no time', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [figure({ observedAt: null })]);
      const said = sayIt(gap);
      expect(said).toContain('1.1m');
      expect(said).not.toContain('last seen');
      /* The epoch is the bug this guards: 1970 in a sentence about their pipeline. */
      expect(said).not.toContain('1970');
    });

    it('takes the freshest when several arrived', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [
        figure({ state: 'old', observedAt: daysAgo(20) }),
        figure({ state: 'current', observedAt: daysAgo(2) }),
      ]);
      expect(gap.theirFigure?.state).toBe('current');
    });

    it('ignores a figure for a different objective', () => {
      const [gap] = findMeasureGaps([subject()], quiet(), [figure({ subjectExternalId: 'OKR-9' })]);
      expect(gap.theirFigure).toBeNull();
      expect(sayIt(gap)).toContain('not really how this is judged');
    });

    it('still says nothing when the measure did come up', () => {
      /* A feed is not a reason to fire. The finding is about silence, not about integration. */
      expect(findMeasureGaps([subject()], saying([
        'pipeline value is at 1.1m now', 'two intros', 'the sequence',
      ]), [figure()])).toEqual([]);
    });
  });
});
