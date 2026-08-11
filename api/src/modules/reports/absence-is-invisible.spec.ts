import {
  whatALeaderCanWeigh,
  headingFor,
  WEIGHABLE,
  THIS_IS_MATERIAL_NOT_A_VERDICT,
  type WeighInput,
  type WeighableEntry,
} from './what-a-leader-can-weigh';

/**
 * ABSENCE IS INVISIBLE, WHICH IS WHY PART THREE EARNS THE SECTION. (G10)
 *
 * A ground is opened to answer a question, usually "should we keep going with
 * this person or this work". Twelve weeks later the report tells the story
 * accurately and the decision gets made against prose, with nothing laying out the
 * thing actually being decided.
 *
 * Parts one and two of this section are a tidy summary and a leader could build
 * them themselves. Part three they cannot: nobody notices the standard that
 * twelve weeks of accounts never touched, because absence does not appear on a
 * page unless something puts it there - and that standard is usually the one the
 * decision turns on.
 *
 * THE EXCLUSIONS ARE ENFORCED HERE AND ANNOUNCED NOWHERE. A "what not to weigh"
 * list on the screen draws attention to precisely the thing it warns against. So
 * the filter lives in the function and the reasoning lives in these tests.
 */

const entry = (kind: WeighableEntry['kind'], text = 'x'): WeighableEntry => ({ kind, text, session: 4 });

const base: WeighInput = {
  statedStandards: [
    { text: 'owning at least one client relationship end to end by month three', session: 1 },
    { text: 'judgement, not just delivery', session: 1 },
  ],
  entries: [entry('SUCCESS_DEFINITION'), entry('WORRY'), entry('ASK')],
  standardsTouched: ['owning at least one client relationship end to end by month three'],
  isClosing: true,
};

describe('when it appears at all', () => {
  it('not before the closing round', () => {
    // THE REGRESSION. The overview is seen every week. A "what to weigh about
    // this person" panel sitting there from week two turns every visit into an
    // evaluation exercise and invites a verdict long before the record can
    // support one.
    expect(whatALeaderCanWeigh({ ...base, isClosing: false })).toBeNull();
  });

  it('and not at all where nobody stated a standard', () => {
    // Without a yardstick this is just the record again, arranged to look like
    // grounds for a decision - which is worse than not showing it.
    expect(whatALeaderCanWeigh({ ...base, statedStandards: [] })).toBeNull();
  });
});

describe('what nobody has evidence for', () => {
  it('names the standard the record never reached', () => {
    const out = whatALeaderCanWeigh(base)!;
    expect(out.whatNobodyHasEvidenceFor).toEqual(['judgement, not just delivery']);
  });

  it('and says what that does and does not mean', () => {
    // THE SENTENCE THE WHOLE SECTION TURNS ON. An untouched standard reads as a
    // failure unless something says otherwise, and it is not one - it is the
    // record being unable to answer.
    const { note } = whatALeaderCanWeigh(base)!;
    expect(note).toMatch(/not evidence against anyone/);
    expect(note).toMatch(/a decision that rests on it is resting on something else/);
  });

  it('matches case-insensitively, so a capital does not read as untouched', () => {
    const out = whatALeaderCanWeigh({
      ...base,
      standardsTouched: base.statedStandards.map((s) => s.text.toUpperCase()),
    })!;
    expect(out.whatNobodyHasEvidenceFor).toEqual([]);
    expect(out.note).toMatch(/Read the entries, not this summary/);
  });
});

describe('what may be weighed', () => {
  it('keeps the kinds that are somebody\'s own words', () => {
    const out = whatALeaderCanWeigh(base)!;
    expect(out.whatTheRecordHolds).toHaveLength(3);
  });

  it('drops anything else, and drops it here rather than at the call site', () => {
    // THE REGRESSION THIS GUARDS. A future caller passing a wider list must not
    // be able to get the specificity label, a session count, or a pattern-feed
    // shape into a decision panel by handing over more than was asked for.
    const out = whatALeaderCanWeigh({
      ...base,
      entries: [
        ...base.entries,
        { kind: 'SPECIFICITY' as any, text: 'low', session: 1 },
        { kind: 'SESSION_COUNT' as any, text: '12', session: 1 },
        { kind: 'PATTERN' as any, text: 'quiet for three weeks', session: 1 },
      ],
    })!;
    expect(out.whatTheRecordHolds).toHaveLength(3);
    expect(out.whatTheRecordHolds.map((e) => e.kind)).not.toContain('SPECIFICITY');
  });

  it('and the list itself holds only kinds that came from a person', () => {
    // Each one is either somebody's stated standard or something they put on the
    // record themselves. Nothing here is the product's opinion of anybody.
    expect(WEIGHABLE).toContain('SUCCESS_DEFINITION');
    expect(WEIGHABLE).toContain('WORRY');
    expect(WEIGHABLE).not.toContain('SPECIFICITY' as any);
  });

  it('says nothing on screen about what it excluded', () => {
    // BY OMISSION, DELIBERATELY. A visible "we do not weigh specificity here"
    // teaches a reader that specificity is the sort of thing one might weigh.
    const out = whatALeaderCanWeigh(base)!;
    const everything = JSON.stringify(out) + THIS_IS_MATERIAL_NOT_A_VERDICT;
    for (const p of [/specificity/i, /session count/i, /do not weigh/i, /should not be used/i]) {
      expect({ p: String(p), hit: p.test(everything) }).toMatchObject({ hit: false });
    }
  });
});

describe('who reads it, and under what heading', () => {
  it('the lead sees what they asked for', () => {
    expect(headingFor('the lead')).toMatch(/What you said you were looking for/);
  });

  it('the subject sees the same content, not addressed at them', () => {
    // Everything in it comes from shared entries and the lead's own definition,
    // so there is nothing here the subject has not effectively seen. But "what
    // your manager is weighing about you", read alone the night before a
    // decision, is a heavy thing to hand somebody with no conversation attached.
    expect(headingFor('the subject')).toBe('What this ground was measured against');
  });

  it('and a colleague sees nothing', () => {
    // The material behind a decision about somebody else is the thing the whole
    // wall exists to prevent.
    expect(headingFor('somebody else')).toBeNull();
  });

  it('the section says it is material, not an answer', () => {
    expect(THIS_IS_MATERIAL_NOT_A_VERDICT).toMatch(/does not add up to an answer/);
    expect(THIS_IS_MATERIAL_NOT_A_VERDICT).toMatch(/the conversation starts from the same place the ground did/);
  });
});
