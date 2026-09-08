import { readFileSync } from 'fs';
import { join } from 'path';
import { onlyTheFirstQuestion, OneQuestionPerTurn } from './one-question-per-turn';
import { screen, SentenceGate } from './nothing-invented-reaches-them';

/**
 * "THE CHAT READS LIKE A COURT ROOM. DOES IT ACTUALLY TAP INTO THE ENGINE?"
 *
 * Traced before changing anything, and it does: `forHumans` runs on the streamed path and the
 * unstreamed one, the scenario pack loads, the opener is model-written rather than canned. The
 * engine was never being bypassed.
 *
 * What makes it a cross-examination is the shape of a turn, and the shape had nothing checking it:
 *
 *   "...so let's get your version down. What does 'overhaul the tech' look like in practice? Are you
 *    rebuilding something that exists, replacing it entirely, or something else?"
 *
 * The rule exists in prompt-library.ts and could not be plainer - "Ask one question per response.
 * Always... Not two questions. Not three. One." It is prose competing with several thousand words of
 * other prose, and it loses, exactly as the entry chat's closer rule lost to the extraction gate.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LIB = strip(readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8'));

describe('a turn asks one thing', () => {
  it('keeps the first question and drops a second standing on its own', () => {
    const { kept, dropped } = onlyTheFirstQuestion([
      "So let's get your version down. ",
      "What does that look like in practice? ",
      'Are you rebuilding, replacing, or something else? ',
    ]);
    expect(kept).toHaveLength(2);
    expect(kept.join('')).toContain('look like in practice?');
    expect(dropped.join('')).toContain('rebuilding, replacing');
  });

  it('the FIRST, not the sharper one, because that is the only choice that cannot change the subject', () => {
    /* Keeping a narrowing follow-up and dropping the opening ask leaves a reply refining a question
       nobody was asked. */
    const { kept } = onlyTheFirstQuestion(['What happened with the handover? ', 'Was it Tuesday or Wednesday? ']);
    expect(kept.join('')).toBe('What happened with the handover? ');
  });

  it('leaves a turn that asks once completely alone', () => {
    const only = ['That is worth pinning down. ', 'What would you sign? '];
    expect(onlyTheFirstQuestion(only).kept).toEqual(only);
    expect(onlyTheFirstQuestion(only).dropped).toEqual([]);
  });

  it('and the prompt\'s own exception survives by construction, not by a special case', () => {
    /*
     * The prompt allows two asks "only where the two are halves of one fact and neither is usable
     * alone", and requires them "in one sentence". This counts sentences, so a legitimate double ask
     * is one sentence with one question mark and never reaches the rule.
     */
    expect(LIB).toContain('Ask one question per response');
    const both = ['What is it, and by when? '];
    expect(onlyTheFirstQuestion(both).dropped).toEqual([]);
  });

  it('a rhetorical tag inside a sentence passes for the same reason', () => {
    const s = ["That is the heart of it, isn't it? "];
    expect(onlyTheFirstQuestion(s).dropped).toEqual([]);
  });

  it('and the counter is per reply, never shared between them', () => {
    /* One instance per reply. Sharing one would mean a check-in asked one question all session. */
    const a = new OneQuestionPerTurn();
    expect(a.isASecondQuestion('First? ')).toBe(false);
    const b = new OneQuestionPerTurn();
    expect(b.isASecondQuestion('First of the next reply? ')).toBe(false);
  });
});

describe('and the door holds it on both paths', () => {
  it('the whole reply in hand', () => {
    const out = screen('What does that look like in practice? Are you rebuilding or replacing? ', []);
    expect(out.text).toContain('look like in practice?');
    expect(out.text).not.toContain('rebuilding or replacing');
    expect(out.dropped).toHaveLength(1);
  });

  it('and the streamed one, a sentence at a time', () => {
    /*
     * The path that actually runs. It judges each sentence with no view of the rest, which is why
     * the rule is a stateful object rather than a function over the reply.
     */
    const gate = new SentenceGate([]);
    const out =
      gate.push('What does that look like in practice? Are you rebuilding or replacing? ') + gate.flush();
    expect(out).toContain('look like in practice?');
    expect(out).not.toContain('rebuilding or replacing');
  });
});
