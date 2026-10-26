/**
 * SETUP NEVER ASKS WHAT WAS ALREADY ANSWERED (Hafsah, 26 October 2026).
 *
 * Grace wrote "It is a new target for this quarter, and I run the team" in her first message, and was asked "What makes this the right
 * time to set up a check-in?" and "What is your part in it? Are you running the team?" on the next two turns. The prompt already says
 * never to ask twice, and the model still did. So the product checks: when the reply asks why now, or the lead's own part, and that is
 * already answered (read from this conversation or from their own words), the reply is written again without it, and if it still asks,
 * that question is taken out.
 */

export interface WhatIsAnswered { whyNow: string | null; theirPart: string | null }

const THEIR_PART_IN_THEIR_WORDS = /\bI\s+(?:run|manage|lead|head|look after|am in charge of|oversee|supervise|own)\b[^.!?\n]*/i;
const WHY_NOW_IN_THEIR_WORDS = /\b(?:new (?:target|quarter|year|role|team|project|hire|client)|(?:this|next) quarter|just (?:started|hired|joined|launched)|because\b)[^.!?\n]*/i;

/** What setup already has for why now and the lead's own part: from what the conversation read, or from their own words. */
export function whatIsAnswered(read: { decision?: string | null; yourRole?: string | null } | null | undefined, theirWords: string): WhatIsAnswered {
  const words = String(theirWords ?? '');
  return {
    whyNow: (read?.decision ?? '').trim() || WHY_NOW_IN_THEIR_WORDS.exec(words)?.[0]?.trim() || null,
    theirPart: (read?.yourRole ?? '').trim() || THEIR_PART_IN_THEIR_WORDS.exec(words)?.[0]?.trim() || null,
  };
}

const ASKS_WHY_NOW = /\b(?:right time|why now|what (?:prompted|brought (?:this|it) on|made you|is driving|'s driving)|driving this timing|the timing)\b/i;
const ASKS_THEIR_PART = /\byour (?:own )?(?:part|role)\b|\bare you (?:running|managing|leading|selling|doing)\b/i;

/** The questions in this reply that ask again for what is answered. */
export function whatItAsksAgain(reply: string, answered: WhatIsAnswered): string[] {
  const asked = (String(reply ?? '').match(/[^.!?\n]*\?/g) ?? []).map((q) => q.trim());
  const again: string[] = [];
  if (answered.whyNow && asked.some((q) => ASKS_WHY_NOW.test(q))) again.push('why now');
  if (answered.theirPart && asked.some((q) => ASKS_THEIR_PART.test(q))) again.push('their own part');
  return again;
}

/** Said to the model when it is asked to write the reply again. */
export function doNotAskAgain(answered: WhatIsAnswered, again: string[]): string {
  const lines = [
    'THEY HAVE ALREADY ANSWERED THIS. Do not ask it again, in any words.',
    ...(again.includes('why now') && answered.whyNow ? [`Why now: "${answered.whyNow}".`] : []),
    ...(again.includes('their own part') && answered.theirPart ? [`Their own part: "${answered.theirPart}".`] : []),
    'Ask the next thing the board still needs instead, in one question.',
  ];
  return lines.join(' ');
}

/** The last resort: the question that asks again is taken out. If no question is left, the first update is asked for. */
export function withoutAskingAgain(reply: string, answered: WhatIsAnswered): string {
  const kept = String(reply ?? '').split(/(?<=[.!?])\s+/).filter((s) => {
    if (!/\?\s*$/.test(s)) return true;
    if (answered.whyNow && ASKS_WHY_NOW.test(s)) return false;
    if (answered.theirPart && ASKS_THEIR_PART.test(s)) return false;
    return true;
  }).join(' ').trim();
  return /\?/.test(kept) ? kept : `${kept ? `${kept} ` : ''}Where do things stand today, and what is still open?`.trim();
}

/*
 * AND NOT THE SAME QUESTION TWICE (26 October 2026). Grace did not give a number per person, and was asked "how many lamps is each person
 * looking to sell" three turns running. A question she has been asked and passed over is left; she is not asked it again.
 */
const wordsOf = (t: string) => new Set(String(t ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 4));
const questionsIn = (t: string) => (String(t ?? '').match(/[^.!?\n]*\?/g) ?? []).map((q) => q.trim()).filter(Boolean);
function alike(a: string, b: string): boolean {
  const x = wordsOf(a), y = wordsOf(b);
  if (x.size < 3 || y.size < 3) return false;
  let both = 0;
  x.forEach((w) => { if (y.has(w)) both++; });
  return both / Math.min(x.size, y.size) >= 0.6;
}

/** The earlier question of setup's that this reply asks again, if any. */
export function theQuestionAskedBefore(reply: string, earlierTurns: readonly string[]): string | null {
  const before = earlierTurns.flatMap(questionsIn);
  for (const q of questionsIn(reply)) {
    const same = before.find((b) => alike(q, b));
    if (same) return same;
  }
  return null;
}

export function doNotAskThatAgain(question: string): string {
  return `YOU ALREADY ASKED THIS: "${question}". They passed over it, so leave it. Do not ask it again, in any words. Ask the next thing the board still needs instead, in one question.`;
}

/** The last resort: the repeated question comes out, and the next thing is asked. */
export function withoutTheSameQuestion(reply: string, earlierTurns: readonly string[], theyHaveSaidALot: boolean): string {
  const before = earlierTurns.flatMap(questionsIn);
  const kept = String(reply ?? '').split(/(?<=[.!?])\s+/).filter((s) => !(/\?\s*$/.test(s) && before.some((b) => alike(s, b)))).join(' ').trim();
  if (/\?/.test(kept)) return kept;
  return `${kept ? `${kept} ` : ''}${theyHaveSaidALot ? 'Anything else I should know?' : 'Where do things stand today, and what is still open?'}`.trim();
}
