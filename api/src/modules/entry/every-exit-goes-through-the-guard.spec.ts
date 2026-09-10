import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * NOTHING CAUGHT `onboard()` CALLING THE MODEL DIRECTLY, AND THAT IS THE POINT.
 *
 * The word-restoration guard has now been missed three separate times, each in a different path:
 * first the check-in fix that did not reach /entry, then `chat()` fixed while `onboard()` was left
 * out, then the streaming path that ChatPage actually calls. Each time the guard itself was correct
 * and its own unit tests passed. Wiring is what no test of a guard can check.
 *
 * `guardedReply` exists so that a new exit is guarded by default and forgetting is the unusual act.
 * This is the half that makes forgetting visible: every call into the model from this service has to
 * go through it, and adding one that does not fails here rather than in front of a stranger who
 * typed their company name.
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The one method allowed to speak to the model directly, because it is the guard. */
const GUARD = 'private async guardedReply(';

describe('every reply that reaches a person goes through the guard', () => {
  it('and only the guard itself calls the model', () => {
    const lines = SRC.split('\n');
    const guardLine = lines.findIndex((l) => l.includes(GUARD));
    expect(guardLine).toBeGreaterThan(-1);

    const offenders: string[] = [];
    lines.forEach((line, i) => {
      /* Streamed or not, it is the same model and the same rule. */
      if (!/this\.anthropic\.respond(Stream)?\(/.test(line)) return;
      /* The guard's own call. */
      if (i > guardLine && i < guardLine + 12) return;
      /*
       * A call whose RESULT IS NAMED as not being a reply: it returns structured fields that get
       * parsed, never prose to a person, so there is nowhere for a mangled name to land.
       *
       * The marker was a comment until the repo-wide rule stripped comments out of source assertions
       * - correctly, since a sentence quoting code passes a scanner after the code has gone. A
       * variable name survives that and reads better at the call site anyway.
       */
      if (/notAReplyToAnybody/.test(lines[i])) return;
      offenders.push(`line ${i + 1}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('and screens the reply before anything else reads it', () => {
    /*
     * This used to assert `restoreTheirWords` ran first. It still does - inside `screen` - and the
     * rule got stronger: a sentence naming somebody who does not exist is now DROPPED rather than
     * logged and shown. Order still matters, because the later checks reason about what the model
     * said and would otherwise inspect a string it did not produce.
     */
    const body = SRC.slice(SRC.indexOf(GUARD));
    expect(body.indexOf('screen(')).toBeGreaterThan(-1);
    expect(body.indexOf('screen(')).toBeLessThan(body.indexOf('causalClaimNobodyMade('));
    /* And nothing survives means asking again, not an empty reply. */
    expect(body).toMatch(/ASK_AGAIN/);
  });

  it('and reports the ones it does not drop', () => {
    /* A shortened version of their own word and a causal claim they did not make are real faults and
       neither is an invented person, so neither justifies deleting a sentence. */
    const body = SRC.slice(SRC.indexOf(GUARD));
    expect(body).toMatch(/truncationsOfTheirWords\(/);
    expect(body).toMatch(/causalClaimNobodyMade\(/);
  });
});
