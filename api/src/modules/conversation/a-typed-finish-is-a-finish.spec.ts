/**
 * A TYPED "THAT'S RIGHT, FINISH" IS A FINISH (end-to-end check of 16 November, M-5).
 *
 * Reads what the model is handed for the turn after the summary was shown: that a summary is on the screen, and what to do with a
 * message that approves it, changes it, or is unclear about it. And that it is handed only when the last thing Groundwork said carried
 * that summary.
 */
import { THE_SUMMARY_IS_ON_THE_SCREEN } from './a-typed-finish-is-a-finish';
import { SESSION_CLOSE_MARKER } from './prompt-library';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('what the model is told about the summary on the screen', () => {
  it('says the summary is shown and not in the conversation, and what each kind of reply means', () => {
    expect(THE_SUMMARY_IS_ON_THE_SCREEN).toContain('is not in this conversation');
    expect(THE_SUMMARY_IS_ON_THE_SCREEN).toContain('"That’s right, finish"');
    expect(THE_SUMMARY_IS_ON_THE_SCREEN).toContain(`write ${SESSION_CLOSE_MARKER} at the very end`);
    expect(THE_SUMMARY_IS_ON_THE_SCREEN).toContain('changes or adds something, take it');
    expect(THE_SUMMARY_IS_ON_THE_SCREEN).toContain('do not write the marker');
  });

  it('is handed to the check-in\'s prompt only when the last thing Groundwork said carried the summary', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toContain("lastAiTurn?.endCard ? THE_SUMMARY_IS_ON_THE_SCREEN : ''");
    expect(src).toContain('select: { content: true, endCard: true }');
  });
});
