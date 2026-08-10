import {
  worryMayReach,
  worryIsReadableBy,
  neutralProbeFrom,
  worryLeakIn,
  type Worry,
  type Surface,
} from './a-worry-steers-questions-not-findings';

/**
 * THE PRODUCT MUST NOT BECOME A PLACE TO FILE PRIVATE COMPLAINTS ABOUT COLLEAGUES.
 *
 * A worry is the most prejudicial data in this system: one person's private,
 * unverified concern about a named colleague, written down before that colleague
 * has said a word. And by a decision taken on 9 August 2026, the subject is never
 * told it exists - because being told a note exists that you cannot see creates
 * worry with no remedy, and it would change what somebody writes in the very
 * check-in the note is meant to inform.
 *
 * THAT DECISION IS WHY THIS FILE IS AS LONG AS IT IS. The subject cannot object
 * to, correct, or weigh what they cannot see, so these rules are the only thing
 * protecting them and there is no human backstop behind them. "We told the model
 * not to" is not an answer, and two prompt-only guardrails on this product leaked
 * in a single day.
 */

const worry: Worry = {
  authorParticipantId: 'lead',
  aboutParticipantId: 'hire',
  text: 'I am worried he waits to be told rather than taking anything on himself, and I think he is going to coast',
};

const aboutTheWork: Worry = {
  authorParticipantId: 'hire',
  aboutParticipantId: null,
  text: 'I am worried nobody has told me what the actual target is and I will be judged on the wrong thing',
};

describe('rule 1 and 3: where a worry may go', () => {
  const everySurface: Surface[] = [
    'shared-report',
    'board',
    'post-report-guide',
    'solo-artifact',
    'probe-selection',
    'closed-context',
  ];

  it('reaches exactly two surfaces out of six', () => {
    const allowed = everySurface.filter(worryMayReach);
    expect(allowed).toEqual(['probe-selection', 'closed-context']);
  });

  it('never the shared report', () => {
    // THE REGRESSION THAT MATTERS MOST. A worry in a report is an unverified
    // accusation with the product's name on it.
    expect(worryMayReach('shared-report')).toBe(false);
  });

  it('never the private guide, which is the one people assume is safe', () => {
    // The guide goes to ONE person - so it feels like a safe destination. It is
    // the worst one: it would deliver a colleague's private worry straight to its
    // subject, framed as coaching.
    expect(worryMayReach('post-report-guide')).toBe(false);
  });

  it('never the board, even though the lead wrote it', () => {
    // The case people forget. The lead already knows what they wrote; putting it
    // on a screen beside a read of the person it is about is how a question
    // becomes a case.
    expect(worryMayReach('board')).toBe(false);
  });

  it('never the solo artifact', () => {
    expect(worryMayReach('solo-artifact')).toBe(false);
  });
});

describe('rule 2: who can read one', () => {
  it('its author', () => {
    expect(worryIsReadableBy(worry, 'lead')).toBe(true);
  });

  it('NOT the person it is about', () => {
    // THE REGRESSION. And they are not told it exists either, which is why the
    // rest of this file has to hold.
    expect(worryIsReadableBy(worry, 'hire')).toBe(false);
  });

  it('not another participant', () => {
    expect(worryIsReadableBy(worry, 'someone-else')).toBe(false);
  });

  it('and not the lead when somebody else wrote it', () => {
    // A participant's worry about the work is not material for the person running
    // the ground. Easy to get wrong, because "the lead sees everything" is true
    // of almost every other surface in this product.
    expect(worryIsReadableBy(aboutTheWork, 'lead')).toBe(false);
    expect(worryIsReadableBy(aboutTheWork, 'hire')).toBe(true);
  });

  it('and nobody at all when there is no reader', () => {
    expect(worryIsReadableBy(worry, null)).toBe(false);
  });
});

describe('rule 3: what a worry turns into', () => {
  const probe = neutralProbeFrom(worry, 'the Brightwater account');

  it('a question about the work, which would be fair to ask anybody', () => {
    expect(probe).toBe('Which parts of the Brightwater account are yours to decide, and which do you take to somebody else?');
  });

  it('carries no trace of the worry, not even that one exists', () => {
    // "Somebody has raised concerns about your ownership" is an accusation wearing
    // a question mark, and the person would answer the accusation instead of the
    // question.
    const lowered = probe.toLowerCase();
    for (const word of ['worried', 'worry', 'concern', 'coast', 'waits', 'told rather']) {
      expect({ word, present: lowered.includes(word) }).toMatchObject({ present: false });
    }
  });

  it('and shares no six-word run with what was written', () => {
    expect(worryLeakIn(probe, [worry])).toBeNull();
  });

  it('the test of neutrality: it is worth asking even if the worry is wrong', () => {
    // Stated as an assertion rather than a comment, because it is the actual
    // design rule. A question that only makes sense if the worry is TRUE is not a
    // probe, it is an interrogation.
    expect(probe).toMatch(/^Which parts of/);
    expect(probe).not.toMatch(/why|failed|have not|do you not/i);
  });
});

describe('the last-line detector, on what actually comes out', () => {
  /**
   * The model has the closed context in its window while it writes, so the only
   * reliable check is on the output. Same principle as the forensic-voice and
   * counts-accounts detectors.
   */
  it('catches the phrasing a leak actually takes', () => {
    for (const text of [
      'There are concerns about whether he is taking ownership.',
      'The lead has raised a concern about pace.',
      'It has been noted that ownership is unclear.',
      'There are doubts about his initiative.',
      'Privately, this has come up more than once.',
    ]) {
      expect({ text, hit: worryLeakIn(text, [worry]) }).not.toMatchObject({ hit: null });
    }
  });

  it('catches a phrase lifted straight out of what somebody wrote', () => {
    const paraphrase = 'His account suggests he waits to be told rather than taking anything on himself.';
    expect(worryLeakIn(paraphrase, [worry])).toBeTruthy();
  });

  it('leaves an ordinary finding alone', () => {
    const fine = 'Nobody has named an owner for the customer migration, and it has come up three times.';
    expect(worryLeakIn(fine, [worry])).toBeNull();
  });

  it('and is deliberately noisy rather than clever', () => {
    // A false positive costs a log line. A false negative costs somebody their
    // standing with their colleagues. The trade is not close.
    expect(worryLeakIn('I am worried about the deadline', [])).toBeTruthy();
  });

  it('survives empty input', () => {
    expect(worryLeakIn('', [worry])).toBeNull();
    expect(worryLeakIn('anything', [])).toBeNull();
  });
});
