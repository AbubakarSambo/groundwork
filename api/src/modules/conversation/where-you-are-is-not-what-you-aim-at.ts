/**
 * "MY 3000 IS SHORT. I AM AT ABOUT 900 UNITS."
 * "The supermarket chain moving to Sahar means your 3000-unit target is now 900."
 *
 * Read in a browser, on a live session 2. She said where she stands; it told her what she is now
 * aiming at. Those are opposite claims about the same figure, and this one is the dangerous
 * direction: a target quietly rewritten downward to match progress means nothing is ever behind,
 * and the whole record stops being able to say whether anybody delivered.
 *
 * NOTHING ELSE CATCHES IT. The figure is real, she said it, so the quote gate and the invention
 * gate both pass it. It is not long, it asks a question, it restates nothing. It is simply untrue,
 * and it is untrue in the one way this product cannot afford.
 *
 * WHAT COUNTS AS THE FAULT: a sentence that says their target IS, or IS NOW, a number they gave as
 * where they stand. Not "you are at 900 of 3,000", which is the same two numbers said correctly and
 * is exactly what the give-back is for.
 */

/** Figures in a piece of text, as written. */
const figuresIn = (s: string): number[] =>
  [...(s ?? '').matchAll(/\b(\d{1,3}(?:,\d{3})+|\d+)\b/g)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

/**
 * THE SENTENCE THAT MOVES THE GOALPOST, or null.
 *
 * `theyStandAt` is the figure they gave for where they are. `theirTarget` is what the record says
 * they are aiming at.
 */
export function movedTheirTargetToWhereTheyAre(
  reply: string,
  theyStandAt: number | null,
  theirTarget: number | null,
): string | null {
  if (theyStandAt == null || theirTarget == null) return null;
  if (theyStandAt >= theirTarget) return null;

  for (const sentence of (reply ?? '').match(/[^.!?\n]+[.!?]*/g) ?? []) {
    if (!/\b(target|goal|objective|number)\b/i.test(sentence)) continue;
    /* "is now 900", "becomes 900", "drops to 900", "is 900" - all the same claim. */
    const claims = /\b(?:is|becomes|drops to|falls to|goes to|is now|now stands at|changes to)\s+(?:about\s+|around\s+)?([\d,]+)/i.exec(sentence);
    if (!claims) continue;
    const said = Number(claims[1].replace(/,/g, ''));
    if (said !== theyStandAt) continue;
    /* "You are at 900 of 3,000" says both numbers in the right places and is not this fault. */
    if (figuresIn(sentence).includes(theirTarget) && /\b(of|out of|towards?|against)\b/i.test(sentence)) continue;
    return sentence.trim();
  }
  return null;
}

export const A_STANDING_IS_NOT_A_TARGET = (standsAt: number, target: number) =>
  `YOUR REPLY MOVED THEIR TARGET TO WHERE THEY ARE STANDING, AND THOSE ARE OPPOSITE THINGS.

They said they are at ${standsAt.toLocaleString('en-US')}. The record says they are aiming at ${target.toLocaleString('en-US')}. You wrote that the target is now ${standsAt.toLocaleString('en-US')}, which is a change to what they are held to, and nobody said it.

A target only changes when somebody says it has changed. Where somebody is against it is not that.

Write the reply again. You may say where they are against the number - "${standsAt.toLocaleString('en-US')} of ${target.toLocaleString('en-US')}" - and you may ask what they think it will take. Do not restate the target as anything but ${target.toLocaleString('en-US')}.`;
