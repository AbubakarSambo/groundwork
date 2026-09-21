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

  it('and any other "you said" before they have said anything', () => {
    const r = nothingSaidYetCannotBeQuoted('You mentioned that the first quarter is about landing. What does landing look like?', 0);
    expect(r.text).toBe('the person who set this up said that the first quarter is about landing. What does landing look like?');
  });

  it('leaves a later turn alone: by then they have said things', () => {
    const r = nothingSaidYetCannotBeQuoted('You said two proposals went out on Wednesday. Which day did the first go?', 3);
    expect(r.changed).toBe(false);
  });
});
