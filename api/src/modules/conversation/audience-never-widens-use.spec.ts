import { buildIntakeBlock } from './prompt-library';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WIDENING WHO READS SOMETHING NEVER WIDENS WHAT IT PROVES.
 *
 * The shared note is the first thing in this product that everyone can read and nobody may quote. The
 * two were conflated before, which is why a shared note felt impossible to add at all: "everyone can
 * see it" sounded like "it can be used against somebody". They are separate axes.
 *
 *   WHO CAN SEE IT  is a choice, made per item.
 *   WHETHER IT CAN BE QUOTED  is fixed by what KIND of thing it is.
 *
 * A document can be evidence. Words somebody typed about a situation cannot be, however widely they
 * are read. So the limit is attached to the note's own text in the assembled prompt rather than
 * stated once somewhere else - the model has the sentence in front of it and no memory of where it
 * came from, which is precisely where a rule stated elsewhere stops holding. This repository has
 * watched prompt-only guardrails leak twice.
 */
const SRC = fs
  .readFileSync(path.join(__dirname, 'prompt-library.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('audience never widens use', () => {
  /** ASSERTED ON THE ASSEMBLED PROMPT, not on the source that builds it. */
  const withNote = buildIntakeBlock({
    scenario: 'NEW_PROJECT',
    partyType: 'INITIATOR',
    sessionNumber: 1,
    sharedNote: 'We are deciding whether to renew.',
  } as any);

  const withoutNote = buildIntakeBlock({
    scenario: 'NEW_PROJECT',
    partyType: 'INITIATOR',
    sessionNumber: 1,
  } as any);

  it('the framing reaches the session', () => {
    expect(withNote).toContain('We are deciding whether to renew.');
  });

  it('and its limit is in the same block, not somewhere else in the prompt', () => {
    const i = withNote.indexOf('We are deciding whether to renew.');
    const block = withNote.slice(i, i + 700);
    expect(block).toMatch(/never quote it/i);
    expect(block).toMatch(/never attribute it/i);
    expect(block).toMatch(/NOT evidence/i);
  });

  /**
   * The failure this guards is subtle: a lead's framing read back to a party as though the party held
   * that view. It is the lead's words, in the party's session.
   */
  it('says outright it is not this person\'s own view', () => {
    const i = withNote.indexOf('We are deciding whether to renew.');
    expect(withNote.slice(i, i + 700)).toMatch(/never treat it as this person's own view/i);
  });

  /** And when the two disagree, the person's account wins. */
  it('and that their account outranks it when they conflict', () => {
    const i = withNote.indexOf('We are deciding whether to renew.');
    expect(withNote.slice(i, i + 700)).toMatch(/what they tell you is their account/i);
  });

  it('nothing is rendered when there is no shared note', () => {
    expect(withoutNote).not.toContain('SHARED_NOTE -');
  });

  /** The private notes keep their own path; they must never arrive through this one. */
  it('the query that feeds it is filtered to the shared audience', () => {
    const CONV = fs
      .readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(CONV).toContain('where: { audience: ContextNoteAudience.EVERYONE, participantId: null }');
  });
});
