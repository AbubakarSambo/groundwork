import { THE_ASSESSMENT_PROMPT } from './the-assessment';
import { ENGINE_RULES, SESSION_CLOSE_MARKER } from './prompt-library';
import { THE_LEAN_CORE } from './the-lean-conversation';
import { THE_PERSON_MAY_BE_DONE } from './a-typed-finish-is-a-finish';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHAT THE MODEL IS TOLD (end-to-end check of 17 November, issues 3 and M-5). Nothing here matches a person's words: the model reads them.
 */
describe('a courtesy answer', () => {
  it('is read with the question it answered, and is nothing to record, not a claim or a side of a difference', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain('Read each message together with the question it answered');
    expect(THE_ASSESSMENT_PROMPT).toContain('"No, nothing is wrong" after "Is anything in the way?"');
    expect(THE_ASSESSMENT_PROMPT).toContain('never a claim, a position or a fact about any topic');
    expect(THE_ASSESSMENT_PROMPT).toContain('and never goes under everythingElse');
  });
});

describe('a typed "That\'s right, finish." at any point in a check-in', () => {
  it('is a finish: the check-in is told, in the part read last, to close and never to ask what is meant', () => {
    expect(THE_PERSON_MAY_BE_DONE).toContain('"That\u2019s right, finish."');
    expect(THE_PERSON_MAY_BE_DONE).toContain('Do not ask what they mean');
    expect(THE_PERSON_MAY_BE_DONE).toContain(`write ${SESSION_CLOSE_MARKER} at the very end`);
    expect(THE_PERSON_MAY_BE_DONE).toContain('A "No" in answer to "Is anything wrong?"');
  });
  it('is said once: the engine rules and the lean conversation no longer carry a second copy', () => {
    expect(ENGINE_RULES).not.toContain('People often type the words of the button');
    expect(THE_LEAN_CORE).not.toContain('never ask what they mean');
  });
  it('is handed to every turn of the check-in, after everything else', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toMatch(/THE_PERSON_MAY_BE_DONE,\s*\]\.filter\(Boolean\)/);
  });
});

describe('"No, that is right." to "Is anything wrong?" (run 4, 18 November)', () => {
  it('is read as agreement, with the question it answered, not as a correction that needs a line named', async () => {
    const { understandTheMessage, UNDERSTAND_PROMPT } = await import('../assistant/ask-understands-with-the-model');
    expect(UNDERSTAND_PROMPT).toContain('- agreement:');
    expect(UNDERSTAND_PROMPT).toContain('A "no" that answers "Is anything wrong?" is this, not a correction.');
    let handed = '';
    const engine = { extract: async (_p: string, h: { content: string }[]) => { handed = h[0].content; return { kind: 'agreement' }; } };
    const said = await understandTheMessage(engine as any, null, 'No, that is right.', 'Is anything wrong? Tell me and I will put it right.');
    expect(said?.kind).toBe('agreement');
    expect(handed).toBe('Groundwork had just asked them: "Is anything wrong? Tell me and I will put it right."\nThey answered: No, that is right.');
  });
  it('closes the check-in when the model reads it as agreement: "Understood." and the close marker, no question', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toContain("if (understood?.kind === 'agreement') return `Understood. ${SESSION_CLOSE_MARKER}`;");
  });
  it('is asked with the read-back\'s own question', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toContain('understandTheMessage(this.anthropic as any, this.prompts as any, message, THE_READ_BACK_ASKS)');
  });
});
