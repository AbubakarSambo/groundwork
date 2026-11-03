/**
 * THE READ-BACK AT THE END OF A CHECK-IN (Hafsah's approval of the plan, 2 November 2026: "a read-back at the end of every setup and
 * check-in ('Here's what I recorded… Anything wrong?'), fixed in one reply").
 *
 * When the check-in reaches its close, what the person reads back is the conversation's own notes (what-we-have-so-far): one line per thing
 * they said, in their words as they typed them, the notes the conversation reasons with turn by turn. It used to be the full assessment,
 * written there and then, and the person waited for it: 52 seconds on gemini-2.5-pro, a 56-second reply (plan round 32). The notes are
 * already there. The close is held once for it (closeHeldAt). Their next reply is read by the model with THE_READ_BACK_WAS_GIVEN: a fix is
 * a claim like any other, checked against the record, proof asked for naturally when it is missing, and said back plainly; then it closes,
 * and the assessment written at the close reads the whole conversation, the fix included, so every page shows it and it is never said again.
 *
 * Only their own words are said back to them, so nothing about them from anybody else, and no judgement, can reach it.
 */
import type { WhatWeHave } from './what-we-have-so-far';

const quoted = (words: string): string => {
  const w = words.replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '');
  return /[.!?]$/.test(w) ? `“${w}”` : `“${w}.”`;
};

/** The read-back, in full sentences, or null when the notes hold nothing of theirs to say back. */
export function theReadBack(notes: WhatWeHave | null): string | null {
  if (!notes) return null;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const c of notes.claims ?? []) {
    const key = String(c.said ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    /* "You said", whatever kind of claim it is: a plan in the notes is not always a promise ("the court deadline is Friday"). */
    lines.push(`You said ${quoted(c.said)}`);
  }
  if (!lines.length) return null;
  return [THE_READ_BACK_OPENS, ...lines, THE_READ_BACK_ASKS].join('\n');
}

export const THE_READ_BACK_OPENS = 'Here’s what I recorded.';
export const THE_READ_BACK_ASKS = 'Is anything wrong? Tell me and I will put it right.';

/** Said to the model on the turns after the read-back. */
export const THE_READ_BACK_WAS_GIVEN = [
  'YOU HAVE SAID BACK WHAT WAS RECORDED AND ASKED WHETHER ANYTHING IS WRONG.',
  'If they say something is wrong, that is a correction, and a correction is a claim like any other: check it against what they said in this conversation and the record above.',
  'If it needs proof that is not here, ask for it once, naturally, without accusing anybody. Then say plainly, in one or two sentences, what you changed, and close with [[SESSION_COMPLETE]].',
  'If they say it is right, or have nothing to change, close now in one short sentence with [[SESSION_COMPLETE]]. If they add something new, take it and carry on.',
  'Never read the list back again.',
].join(' ');
