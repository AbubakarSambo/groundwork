import {
  whatIsMissing,
  nextAsk,
  isOffLimits,
  NEVER_ASK,
  ALWAYS_WORTH_ASKING,
  type GroundShape,
} from './what-setup-never-asked-for';

/**
 * A FORM WITH MORE FIELDS HAS A BIGGER BLIND SPOT, NOT A SMALLER ONE. (G37, G23)
 *
 * Setup asks a fixed set of questions, so it has a fixed blind spot. On Ground 1
 * the missing thing was which of two measures counted; nobody hid it, and it took
 * seven weeks, because the only place it could have been said was a free-text box
 * nobody thought to use for that.
 *
 * The obvious fix is another field. The obvious fix is wrong twice over: it moves
 * the blind spot rather than closing it, and every field added to setup stands
 * between a lead and starting. So this looks at what the ground already has and
 * asks about the specific hole.
 *
 * THE ASSERTIONS THAT MATTER MOST ARE THE LAST TWO. A chat that asks a lead open
 * questions before anybody has checked in is one short step from a chat that asks
 * a lead about a person, and the lead would answer.
 */

const full: GroundShape = {
  objectivesSet: 3, people: 3, conditionsNamed: 2, hasBaseline: true,
  documents: 2, hasOutcome: true, purpose: 'the migration handover',
};

describe('it asks about the hole this ground actually has', () => {
  it('says nothing to a ground with nothing missing', () => {
    // The state that makes this bearable to use. A chat that always has a
    // question is a form that never ends.
    expect(whatIsMissing(full)).toEqual([]);
  });

  it('asks first about the objective nobody stated', () => {
    // The most expensive absence in the product, and the finding Ground 1
    // produced eleven weeks late. First even though it is the hardest to answer.
    const [first] = whatIsMissing({ ...full, objectivesSet: 1 });
    expect(first.id).toBe('objectives');
    expect(first.question).toMatch(/2 of the people/);
  });

  it('quotes the ground back so the question is about this work', () => {
    expect(whatIsMissing({ ...full, objectivesSet: 0 })[0].question)
      .toMatch(/for "the migration handover"/);
  });

  it('and copes with a ground that was never described', () => {
    const q = whatIsMissing({ ...full, objectivesSet: 0, purpose: null })[0].question;
    expect(q).not.toMatch(/for ""|undefined|null/);
  });

  it('asks what has to be true that is nobody here\'s doing', () => {
    expect(whatIsMissing({ ...full, conditionsNamed: 0 })[0].question)
      .toMatch(/nobody in this ground's doing/);
  });

  it('asks for the baseline before anything happens, and says why', () => {
    expect(whatIsMissing({ ...full, hasBaseline: false })[0].question)
      .toMatch(/before anything happens/);
  });

  it('says what happens after the report, and allows "nothing" as an answer', () => {
    // The one a lead would rather leave vague, and the one the people checking in
    // are most entitled to.
    const q = whatIsMissing({ ...full, hasOutcome: false })[0].question;
    expect(q).toMatch(/nothing in particular are all real answers/);
  });
});

describe('naming the document, which is the whole of G23', () => {
  it('never says "anything relevant"', () => {
    // THE REGRESSION. "Attach anything relevant" produces an empty documents tab
    // every time, because the lead does not know what counts and the cost of
    // guessing wrong is looking foolish.
    const ask = whatIsMissing({ ...full, documents: 0 }).find((a) => a.id === 'materials')!;
    expect(ask.question).not.toMatch(/anything relevant|any documents|as appropriate/i);
    expect(ask.material).toMatch(/The brief you sent them/);
  });

  it('says what the document is FOR, not that it is for the file', () => {
    const ask = whatIsMissing({ ...full, documents: 0 }).find((a) => a.id === 'materials')!;
    expect(ask.question).toMatch(/Not for the file/);
    expect(ask.question).toMatch(/two people describe the same thing differently/);
  });

  it('asks for no document where no document would help', () => {
    // Honest, and it stops the chat asking for paperwork to fill a silence.
    // Conditions live in people's heads; asking for a doc produces an apology.
    for (const id of ['conditions', 'baseline', 'outcome']) {
      const ask = whatIsMissing({ ...full, conditionsNamed: 0, hasBaseline: false, hasOutcome: false })
        .find((a) => a.id === id)!;
      expect({ id, material: ask.material }).toMatchObject({ material: null });
    }
  });
});

describe('one at a time', () => {
  const empty: GroundShape = {
    objectivesSet: 0, people: 2, conditionsNamed: 0, hasBaseline: false,
    documents: 0, hasOutcome: false, purpose: null,
  };

  it('offers the most valuable one first', () => {
    expect(nextAsk(empty)!.id).toBe('objectives');
  });

  it('moves on once something has been asked', () => {
    expect(nextAsk(empty, ['objectives'])!.id).toBe('conditions');
  });

  it('and runs out rather than repeating itself', () => {
    // A lead who abandons this after two answers keeps those two, because the
    // ordering put the cheap losses last. Five questions at once loses the first
    // one too.
    expect(nextAsk(empty, ['objectives', 'conditions', 'baseline', 'materials', 'outcome'])).toBeNull();
  });
});

describe('the questions this chat is never allowed to ask', () => {
  it('refuses the ones that collect a verdict, or the conclusion in advance', () => {
    for (const q of [
      'Before we start, how is Tobi doing?',
      'Is anybody underperforming?',
      'What do you expect this report to show?',
      'Where are their weaknesses?',
      'How would you describe him?',
      'Rate her out of five on ownership.',
    ]) {
      expect({ q, hit: isOffLimits(q) }).not.toMatchObject({ hit: null });
    }
  });

  it('and ASKS the ones I wrongly banned, which are why the ground exists', () => {
    /**
     * I DREW THIS LINE IN THE WRONG PLACE, and Hafsah named it: a lead can state
     * targets they gave, their check-ins shape evolving priorities, and their entry
     * is the starting context. Three patterns came off the list:
     *
     *   "what do you think the problem is"  the reason they opened the ground.
     *                                       Banning it meant setup could not ask.
     *   "concerns about"                    "what are you concerned about in the
     *                                       handover" is a question about work. The
     *                                       pattern could not tell that from
     *                                       "concerns about Tobi" - the fifth time
     *                                       in one sitting a blacklist was asked
     *                                       what a word was about.
     *   "worried about"                     same, and WORRY is a record entry type
     *                                       this product collects on purpose.
     */
    for (const q of [
      'What do you think the problem is here?',
      'What are you most concerned about in the handover?',
      'What has changed about what matters since you opened this?',
      'What did you ask them to do, and by when?',
      'What are you worried might slip?',
    ]) {
      expect({ q, hit: isOffLimits(q) }).toMatchObject({ hit: null });
    }
  });

  it('leaves the real questions alone', () => {
    for (const ask of whatIsMissing({
      objectivesSet: 0, people: 2, conditionsNamed: 0, hasBaseline: false,
      documents: 0, hasOutcome: false, purpose: 'a client handover',
    })) {
      expect({ id: ask.id, hit: isOffLimits(ask.question) }).toMatchObject({ hit: null });
    }
  });

  it('and the other half is written down too, because a list of prohibitions teaches the wrong lesson', () => {
    expect(ALWAYS_WORTH_ASKING).toContain('what the situation is, including what the lead thinks is going wrong');
    expect(ALWAYS_WORTH_ASKING).toContain('what has changed about what matters since the ground opened');
  });

  it('and the rule is written down where a person will read it', () => {
    // The list is data rather than a comment because the model writing its own
    // follow-up is where this actually breaks, and a comment cannot be given to
    // a model or asserted against.
    expect(NEVER_ASK).toContain('anything the lead would not say in front of the person it is about');
  });
});
