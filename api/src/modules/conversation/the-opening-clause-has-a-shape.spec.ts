import { OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, SCENARIO_PACKS } from './prompt-library';

/**
 * THE RULE AGAINST SAYING THEIR ANSWER BACK HAS LOST EVERY TIME IT HAS BEEN MEASURED.
 *
 * Four turns of one live conversation, four openings: "Sahar with 25 and Amina with 15.", "That
 * monthly restock schedule is a bottleneck", "The distributor's list.", "A second distributor for
 * Kano." The guard caught three of them, asked again, and the second try was no better every time,
 * so the original shipped.
 *
 * A prohibition tells the model what not to do and leaves it to invent what to do instead, which
 * under pressure is the thing it already knows. So the rule carries a shape now, and four turns
 * written in it, because one example reads as a special case and four read as a voice.
 */
describe('the opening clause has a shape', () => {
  it('names the three things a reply may open on', () => {
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/WHAT THE FIRST CLAUSE IS INSTEAD/);
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/the question itself, with nothing in front of it/);
  });

  it('and shows four turns doing it', () => {
    const turns = OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE.match(/They: "/g) ?? [];
    expect(turns.length).toBe(4);
    /* Each one answers a line from the conversation this was written from. */
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toContain('Telling them is the part that makes those real.');
    /* The fourth turn used to answer "Honestly I do not know" with "That is a real answer and it goes down as it is."
       That is a comment on the answer, which the standard forbids and which the model then copied ("That is a real
       answer, as it stands"), so the example now shows the question alone. */
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toContain('You:  "Who would know?"');
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).not.toContain('That is a real answer');
  });

  it('and stops the product narrating what it is doing with their words', () => {
    /* "That is noted", "To make sure your record is clear" - both read off live turns. */
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toMatch(/NEVER NARRATE WHAT YOU ARE DOING WITH WHAT THEY SAID/);
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toContain('that is noted');
    expect(OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE).toContain('to make sure your record is clear');
  });
});

/**
 * AND THE QUESTION SHE SAYS THE TOOL MUST ASK.
 *
 * Twice now the useful finding in a report existed only because she had volunteered it herself.
 * Answering like a real person - terse, not helpful - the question never came.
 */
describe('a number with somebody name on it is asked about', () => {
  it('the goals pack asks whether that person has been told', () => {
    const pack = SCENARIO_PACKS.OKR_ALIGNMENT;
    expect(pack).toMatch(/HAVE THEY BEEN TOLD, AND THIS IS NOT OPTIONAL/);
    expect(pack).toMatch(/does Amina know that is her number yet/);
  });

  it('and takes "not yet" as an answer rather than a failing', () => {
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).toMatch(/is never a failing/);
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).toMatch(/never ask a second time in the same session/);
  });
});
