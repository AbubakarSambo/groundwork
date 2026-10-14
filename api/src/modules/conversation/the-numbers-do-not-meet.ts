/**
 * THE GAP THAT WAS ON THE SCREEN AND NOBODY MENTIONED.
 *
 * Read off a live check-in. The objective on it was 10,000 units of tea. In her own session she
 * said "my target is 150 bags" and "they are meant to sell 50 bags each". Two orders of magnitude
 * apart, in one person's own conversation, against a number that was already in the band at the
 * top of her screen. The interview asked what would tell her the pricing sheet was being used.
 *
 * Her words: the chat "had contexts on us not being aligned on who is doing what and the gap
 * between what we said and what needs to be met and didnt point it out or ask us to clarify".
 *
 * NO PRIVACY PROBLEM HERE, which is why this can be done at all. It compares what THIS person says
 * against the objective on the check-in - a number they have already been shown - and never
 * against anybody else's account.
 *
 * IT ASKS, IT NEVER CONCLUDES. Two numbers that do not meet has three innocent explanations: their
 * number is a part of the whole, the objective is somebody else's to hit, or one of them is wrong.
 * The product cannot tell which and does not try. It says both numbers and asks which it is.
 */

export interface ANumberOnRecord {
  name: string;
  target: number | null;
  ownerParticipantId?: string | null;
}

/*
 * A DATE IS NOT A TARGET, WHICH THIS LEARNED THE HARD WAY.
 *
 * Driven live the day it was written: "I will give Sahar and Amina their numbers by Friday the
 * 25th" came back as "you have said 25 - is that your own part of the 10,000?" A day of the month,
 * read as a goal, in answer to the most cooperative sentence in the conversation.
 *
 * So anything that reads as a date is out: an ordinal, a number next to a weekday or a month, and
 * a number introduced by "by the" or "on the", which is how a deadline is written.
 */
const READS_AS_A_DATE = new RegExp(
  '(\\d+)(st|nd|rd|th)\\b'
  + '|\\b(mon|tues|wednes|thurs|fri|satur|sun)day\\s+(the\\s+)?(\\d+)'
  + '|\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+(\\d+)'
  + '|(\\d+)\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
  + '|\\b(by|on)\\s+the\\s+(\\d+)',
  'gi',
);

/** Numbers in what somebody typed: "150 bags", "10,000 units", "2000". Never a date. */
export function theNumbersIn(said: string): number[] {
  const text = said ?? '';

  /* Every number that belongs to a date, collected first so they can be left alone. */
  const dated = new Set<number>();
  for (const m of text.matchAll(READS_AS_A_DATE)) {
    for (const g of m.slice(1)) {
      const n = Number(g);
      if (Number.isFinite(n)) dated.add(n);
    }
  }

  const out: number[] = [];
  /* NOT \b BEFORE THE DIGIT: "N6.2m" has no word boundary after the N, so the match began at ".2m" and Bola
     was told she had said 2,000,000 (run 8, 21 Sep 2026). A digit or a dot before it is what rules a start out. */
  for (const m of text.matchAll(/(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(k|m|mn|bn)?\b(\s(?:thousand|million|billion)\b)?/gi)) {
    /* "13m" IS THIRTEEN MILLION. Emeka said "It's 13m now" against the team's 180,000,000 and was asked
       whether 13 was his own part of it (smoke run 7, 21 Sep 2026). */
    const n = Number(m[1].replace(/,/g, '')) * (({ k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, bn: 1e9, billion: 1e9 } as Record<string, number>)[(m[2] ?? (m[3] ?? '').trim()).toLowerCase()] ?? 1);
    /* Years and small counts are not targets. "2026" is a date and "2 of the biggest customers"
       is not a goal; a target somebody is working towards is bigger than a handful. */
    if (!Number.isFinite(n) || n < 10) continue;
    /* A PERCENTAGE IS A RATE, NOT A PART. "Dayo's arrears are at 18%" was read as 18 against 180,000,000
       and the manager was asked whether 18 was her own part of it (run 3, 20 Sep 2026). */
    const tail = text.slice((m.index ?? 0) + m[0].length);
    if (/^\s*(%|percent|per cent|pc\b)/i.test(tail)) continue;
    /* A SPAN OF TIME OR A HEADCOUNT IS NOT A PART OF A TARGET. "Greenfield's terms are 30 days" was read
       as 30 against 180,000,000 (smoke run 7). */
    if (/^\s*(days?|weeks?|months?|years?|hours?|minutes?|people|persons?|reps?|dealers?|accounts?|customers?|clients?|calls?|visits?|farmers?|members?|staff|of (?:the|them|my|our))\b/i.test(tail)) continue;
    if (dated.has(n)) continue;
    /*
     * A FOUR-DIGIT NUMBER IN YEAR RANGE IS USUALLY A YEAR AND SOMETIMES A TARGET.
     *
     * Excluding the whole range took "Sahar does 2000 units" with it, which is the exact sentence
     * this exists to read. What separates them is the word after: a year stands alone or ends the
     * sentence, a target is counting something. "2000 units" is a target, "in 2026" is not.
     */
    if (n >= 1900 && n <= 2100) {
      const after = text.slice((m.index ?? 0) + m[0].length).match(/^\s+([a-z]+)/i)?.[1]?.toLowerCase();
      const counting = after && !['and', 'or', 'we', 'i', 'they', 'it', 'is', 'was', 'to', 'by', 'at', 'the', 'but', 'so', 'then', 'when'].includes(after);
      if (!counting) continue;
    }
    out.push(n);
  }
  return out;
}

export interface WhatDoesNotMeet {
  theirs: number;
  objective: number;
  objectiveName: string;
}

/**
 * @param objectives every objective on the check-in
 * @param theyJustSaid what this person typed
 * @param theirOwnTargets the numbers already recorded as theirs, which explain a smaller number
 */
export function theNumbersDoNotMeet(
  objectives: ANumberOnRecord[],
  theyJustSaid: string,
  theirOwnTargets: number[] = [],
  /**
   * WHAT THE PRODUCT HAS ALREADY ASKED THIS SESSION. "Is that your own part of it?" went out four times
   * running to one person who had answered it three times (smoke run, 20 Sep 2026): the instruction told
   * the model to say nothing if they had explained it, and the model copied the product's sentence
   * instead. Once the two numbers have been put in one earlier turn, this is settled for the session.
   */
  earlierAiTurns: string[] = [],
): WhatDoesNotMeet | null {
  const whole = (objectives ?? []).find((o) => !o.ownerParticipantId && typeof o.target === 'number' && o.target! >= 10);
  if (!whole) return null;
  const objectiveFigure = String(whole.target);
  if ((earlierAiTurns ?? []).some((t) => (t ?? '').replace(/,/g, '').includes(objectiveFigure) && /your own part of it|something else\?/i.test(t ?? ''))) return null;

  const said = theNumbersIn(theyJustSaid);
  if (!said.length) return null;

  /*
   * A NUMBER THAT IS ALREADY THEIRS EXPLAINS ITSELF. Somebody who has been given 150 of the 10,000
   * and says "150" is answering correctly, and asking them about it is the product forgetting what
   * it gave them.
   */
  const unexplained = said.filter((n) => !theirOwnTargets.includes(n));
  if (!unexplained.length) return null;

  /*
   * THE TEST IS ORDER OF MAGNITUDE, NOT DIFFERENCE. A part is meant to be smaller than the whole,
   * so 150 of 500 is the system working. 150 against 10,000 is somebody describing a different
   * thing, and that is the case worth one question.
   */
  const biggest = Math.max(...unexplained);
  if (biggest >= whole.target!) return null;
  if (whole.target! / biggest < 10) return null;

  return { theirs: biggest, objective: whole.target!, objectiveName: whole.name };
}

export function askWhichItIs(gap: WhatDoesNotMeet): string {
  const theirs = gap.theirs.toLocaleString('en-US');
  const objective = gap.objective.toLocaleString('en-US');
  return `THE NUMBER THEY JUST SAID AND THE OBJECTIVE ON THIS CHECK-IN DO NOT MEET.

This check-in is aiming at ${objective} (${gap.objectiveName}). They have just described ${theirs}, which is a fraction of it, and nothing on record says the rest belongs to anybody else.

Ask about it once, in your next reply, with BOTH numbers in the sentence: "This check-in is aiming at ${objective}. You have said ${theirs} - is that your own part of it, or is the ${objective} something else?"

DO NOT CONCLUDE ANYTHING. There are three innocent answers - their number is their share, the objective is somebody else's to hit, or one of the two is wrong - and you cannot tell which. You are not saying they are behind, you are not scoring anybody, and you are not implying somebody has failed to divide the work up. Both numbers, one question, and take whatever they say.

If they have already explained it in this conversation, say nothing about it at all.`;
}

/** Did the reply actually put both numbers in front of them? */
export function saidBothNumbers(reply: string, gap: WhatDoesNotMeet): boolean {
  const text = (reply ?? '').replace(/,/g, '');
  return text.includes(String(gap.theirs)) && text.includes(String(gap.objective));
}

/** The question the product asks when the model will not. Same decision as the date. */
export function theQuestionAboutTheNumbers(gap: WhatDoesNotMeet): string {
  return `This check-in is aiming at ${gap.objective.toLocaleString('en-US')}. You said ${gap.theirs.toLocaleString('en-US')}. Is that your own part of it, or is the ${gap.objective.toLocaleString('en-US')} something else?`;
}
