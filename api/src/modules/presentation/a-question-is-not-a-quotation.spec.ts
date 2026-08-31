import { withoutQuotedQuestions } from './outbound';

describe('a question the engine asks is not a quotation', () => {
  it('unwraps a whole sentence the model put in quotes', () => {
    /*
     * Every scenario pack writes its example questions in quotes, because that is how you show
     * somebody a form of words. The model copies the punctuation with the question, and the reply
     * arrives reading as though it is quoting somebody. It is asking. Nobody said it.
     */
    expect(withoutQuotedQuestions('That is the data. "In your own words, what matters most?"'))
      .toBe('That is the data. In your own words, what matters most?');
  });

  it('and one that opens the reply', () => {
    expect(withoutQuotedQuestions('"What would tell you that was met?"'))
      .toBe('What would tell you that was met?');
  });

  it('but leaves a real quotation inside a sentence alone', () => {
    /* Somebody's own words, quoted back at them, are the one thing this must not touch - the whole
       product is built on what people actually said. */
    const said = 'You said "it slipped again" and I want to understand that.';
    expect(withoutQuotedQuestions(said)).toBe(said);
  });

  it('and leaves a short quoted phrase alone', () => {
    const said = 'What does "ready" mean here?';
    expect(withoutQuotedQuestions(said)).toBe(said);
  });

  it('and handles curly quotes, which houseStyle produces', () => {
    expect(withoutQuotedQuestions('Right. “What is in the way of the remaining four?”'))
      .toBe('Right. What is in the way of the remaining four?');
  });
});

describe('the malformed case, which is the common one', () => {
  it('strips quotes entirely when they do not balance', () => {
    /*
     * Verbatim from a real check-in: an opening quote that never closes, then another. The
     * pair-matcher cannot see it because there is no pair, and a dangling quote mid-sentence makes
     * the engine look like it is reporting speech nobody made.
     */
    const broken = 'Let us get your objectives down. "What are you focused on?';
    expect(withoutQuotedQuestions(broken)).toBe('Let us get your objectives down. What are you focused on?');
  });

  it('and leaves balanced quotes alone', () => {
    const fine = 'You said "it slipped" and I want to understand that.';
    expect(withoutQuotedQuestions(fine)).toBe(fine);
  });
});
