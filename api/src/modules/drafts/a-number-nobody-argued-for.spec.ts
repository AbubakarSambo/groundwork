/**
 * Agreement is not the same as the objective being any good.
 */
import {
  whatToAskForNext,
  whyThatIsNotAnAnswer,
  whyThisIsNotReadyToSeed,
} from './a-number-nobody-argued-for';

const full = {
  proposedMeasure: 'Companies onboarded and using it',
  proposedTarget: 'Ten by 31 October',
  proposedJustification: 'Ten is what the pipeline can actually carry this quarter.',
  proposedApproach: 'Sahar works the target list, two a week, and Abubakar clears blockers.',
};

describe('what a draft asks for next', () => {
  it('asks one thing at a time, in the order somebody can answer', () => {
    /* A conversation asking four questions at once gets one answer covering
       the easiest of them. */
    expect(whatToAskForNext({})!.piece).toBe('measure');
    expect(whatToAskForNext({ proposedMeasure: 'x' })!.piece).toBe('target');
    expect(whatToAskForNext({ proposedMeasure: 'x', proposedTarget: 'y' })!.piece).toBe('justification');
    expect(whatToAskForNext({ ...full, proposedApproach: null })!.piece).toBe('approach');
  });

  it('and stops asking once all four are there', () => {
    expect(whatToAskForNext(full)).toBeNull();
  });

  it('and never asks why before there is a number to ask why about', () => {
    /* "Why that number" is unanswerable before the number exists, and asking it
       first teaches somebody the questions are a form. */
    expect(whatToAskForNext({ proposedJustification: full.proposedJustification })!.piece).toBe('measure');
  });
});

describe('an answer that is not an answer', () => {
  it('refuses a word where a reason was asked for', () => {
    expect(whyThatIsNotAnAnswer('justification', 'Revenue', {})).toContain('not a reason');
  });

  it('and a word where a plan was asked for', () => {
    expect(whyThatIsNotAnAnswer('approach', 'Sell more', {})).toContain('not a plan');
  });

  it('and the target said back with a "because" in front of it', () => {
    /* Passes every length check, and says nothing. */
    const said = whyThatIsNotAnAnswer('justification', 'Because we need ten by 31 October', {
      target: 'ten by 31 October',
    });
    expect(said).toContain('again with a "because"');
  });

  it('but takes a real sentence', () => {
    expect(whyThatIsNotAnAnswer('justification', full.proposedJustification, { target: full.proposedTarget })).toBeNull();
    expect(whyThatIsNotAnAnswer('approach', full.proposedApproach, { target: full.proposedTarget })).toBeNull();
  });
});

describe('seeding a draft nobody contested', () => {
  it('is refused while nobody has said why the number matters', () => {
    const said = whyThisIsNotReadyToSeed({ ...full, proposedJustification: null });
    expect(said).toContain('agreed by everybody and justified by nobody');
  });

  it('and refused while nobody has said how it will be moved', () => {
    expect(whyThisIsNotReadyToSeed({ ...full, proposedApproach: null })).toContain('not a plan for hitting it');
  });

  it('and allowed once both are there', () => {
    expect(whyThisIsNotReadyToSeed(full)).toBeNull();
  });
});
