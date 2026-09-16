import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE READER IS ON THE PATH PEOPLE ACTUALLY TAKE, AND FOR TWO DAYS IT WAS NOT.
 *
 * `readBeforeSending` was wired into `sendMessage` and not into `sendMessageStream`. Every real
 * check-in streams - ChatPage calls `streamMessage` and the non-streaming send is only the fallback
 * for when the stream will not start - so a reader proved in the lead's setup chat reached no
 * participant at all. Nothing failed: both paths existed, both worked, and the one with the fix was
 * the one nobody used.
 *
 * Read live on the streaming path, through all nine guards: "She called the owners herself and went
 * on a market day. That's a specific approach..." - the person's own sentence read back, then a
 * grade on their answer.
 *
 * So both call sites are asserted. A third path that reaches a person has to appear here too.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('every reply a person reads is read first', () => {
  it('runs on the turn path', () => {
    const turn = SRC.slice(SRC.indexOf('async sendMessage('), SRC.indexOf('async *sendMessageStream('));
    expect(turn).toContain('this.readBeforeSending(');
  });

  it('and on the streaming path, which is the one every check-in takes', () => {
    const stream = SRC.slice(SRC.indexOf('async *sendMessageStream('));
    /* If this fails: sendMessageStream does not read the reply before sending it, so the reader
       reaches nobody who actually uses the product. */
    expect(stream).toContain('this.readBeforeSending(');
  });

  /*
   * A stream cannot be unsent, so the rewrite travels in `done` - which ChatPage already uses to
   * replace what it streamed, for the whole-reply screen and the close-ask. If that stopped being
   * the last thing yielded, a rewrite would be computed and never shown.
   */
  it('and the corrected reply is what the done event carries', () => {
    const stream = SRC.slice(SRC.indexOf('async *sendMessageStream('));
    const readAt = stream.indexOf('this.readBeforeSending(');
    /* The LAST one. There is an earlier `done` for the repeat-answer reply, which is a fixed
       sentence this file wrote rather than anything the model said - nothing there to read. */
    const doneAt = stream.lastIndexOf("type: 'done', reply");
    expect(readAt).toBeGreaterThan(-1);
    expect(doneAt).toBeGreaterThan(readAt);
  });
});
