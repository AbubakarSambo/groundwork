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
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8');

/** The one method allowed to speak to the model directly, because it is the guard. */
const GUARD = 'private async guardedReply(';

describe('every reply that reaches a person goes through the guard', () => {
  it('and only the guard itself calls the model', () => {
    const lines = SRC.split('\n');
    const guardLine = lines.findIndex((l) => l.includes(GUARD));
    expect(guardLine).toBeGreaterThan(-1);

    const offenders: string[] = [];
    lines.forEach((line, i) => {
      if (!/this\.anthropic\.respond\(/.test(line)) return;
      /* The guard's own call. */
      if (i > guardLine && i < guardLine + 12) return;
      /*
       * A call marked NOT-A-REPLY at its own call site: it returns structured fields that get
       * parsed, never prose to a person, so there is nowhere for a mangled name to land. The marker
       * lives in the code rather than in a list here, so whoever adds the next direct call has to
       * say in the open which kind theirs is instead of quietly not matching a pattern.
       */
      if (/NOT-A-REPLY/.test(lines.slice(Math.max(0, i - 8), i + 1).join(' '))) return;
      offenders.push(`line ${i + 1}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('and the guard puts their own word back before anything else reads the reply', () => {
    const body = SRC.slice(SRC.indexOf(GUARD));
    const restore = body.indexOf('restoreTheirWords(');
    const causal = body.indexOf('causalClaimNobodyMade(');
    expect(restore).toBeGreaterThan(-1);
    /*
     * Order matters: both later checks reason about what the model said, so cleaning or reporting
     * before the restoration would have them inspect a string the model did not produce.
     */
    expect(restore).toBeLessThan(causal);
  });

  it('and reports the two it cannot repair', () => {
    const body = SRC.slice(SRC.indexOf(GUARD));
    expect(body).toMatch(/namesWorthReporting\(/);
    expect(body).toMatch(/truncationsOfTheirWords\(/);
  });
});
