import { nothingSaidYetCannotBeQuoted } from './nothing-said-yet-cannot-be-quoted';

/** 21 Sep 2026: a new hire's first screen said "you described your role as..." before he had typed a word. */
describe('nothing said yet cannot be quoted back', () => {
  it('rewrites the attribution on the opener and leaves the question', () => {
    const r = nothingSaidYetCannotBeQuoted(
      'As Engagement Director, you described your role as bringing in research projects and interventions and building relationships. This session is for us to build your version of that role. What did you understand your role in this to be?',
      0,
    );
    expect(r.changed).toBe(true);
    expect(r.text).toBe('As Engagement Director, your role here was set out as bringing in research projects and interventions and building relationships. This session is for us to build your version of that role. What did you understand your role in this to be?');
  });

  /*
   * CHANGED 25 SEPTEMBER 2026. This pinned the replacement as "the person who set this up said",
   * which is an internal label dropped into the middle of a sentence - and the sentence then starts
   * in lower case. On the sales scenario the first thing the product ever said to somebody was
   * "...this quarter. the person who set this up said your target is 12 approved facilities."
   * Three of the twelve problems in one clause. Whoever set it up has a name; it is used.
   */
  it('and any other "you said" becomes whoever actually set it up, by name', () => {
    const r = nothingSaidYetCannotBeQuoted('You mentioned that the first quarter is about landing. What does landing look like?', 0, 'Bisi Adeyemi');
    expect(r.text).toBe('Bisi Adeyemi says that the first quarter is about landing. What does landing look like?');
  });

  it('and where no name is known, nothing is attributed to anybody', () => {
    const r = nothingSaidYetCannotBeQuoted('You mentioned that the first quarter is about landing.', 0);
    expect(r.text).toBe('The record says that the first quarter is about landing.');
    expect(r.text).not.toContain('the person who set this up');
  });

  it('and a rewrite landing mid-paragraph leaves a capital behind it', () => {
    const r = nothingSaidYetCannotBeQuoted('We are tracking credit sales this quarter. You said your target is 12 approved facilities.', 0, 'Bisi');
    expect(r.text).toBe('We are tracking credit sales this quarter. Bisi says your target is 12 approved facilities.');
  });

  it('leaves a later turn alone: by then they have said things', () => {
    const r = nothingSaidYetCannotBeQuoted('You said two proposals went out on Wednesday. Which day did the first go?', 3);
    expect(r.changed).toBe(false);
  });
});
