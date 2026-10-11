/**
 * A CLAIM THE NUMBERS DO NOT SUPPORT COMES OUT BEFORE IT SHIPS.
 *
 * Adversarial run 2, 20 Sep 2026, the credit rep: "it means you are past the N40m target you set for
 * the end of the month", said twice, to a man who had said N26m. And on the same run, openers that
 * began "Last time you said..." followed by a number nobody had said. Both are the model doing
 * arithmetic or memory in prose, and both are the kind of sentence a person reads and stops trusting
 * the rest for.
 *
 * Two narrow checks, both on sentences only:
 *
 *   1. A sentence that says somebody is PAST, AHEAD OF, ABOVE or has EXCEEDED a number, where no
 *      number they have said is at least that number. The sentence comes out.
 *   2. A sentence that recalls something ("last time you said", "you mentioned", "earlier you told
 *      me") and carries a number that appears in nothing they have said, this session or before.
 *      The sentence comes out.
 *
 * Cutting rather than asking again, for the same reason a-promise-they-never-made cuts: a model that
 * has just got the arithmetic wrong is not the thing to ask for a better sentence. Everything else in
 * the reply stands.
 */

const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, bn: 1e9, billion: 1e9 };

/** Every number in a text, scaled: "N26m" is 26,000,000, "1,200" is 1200, "40%" is 40. */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  /* "50kg bags" is fifty of something, not fifty thousand: a scale letter only counts when no letter follows it. */
  const re = /(\d[\d,]*(?:\.\d+)?)(?:\s*(k|m|bn|million|thousand|billion)(?![a-z]))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? ''))) {
    const v = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? SCALE[m[2].toLowerCase()] ?? 1 : 1);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

const sentencesOf = (text: string): string[] => (text ?? '').split(/(?<=[.!?])\s+/).filter((s) => s.trim());

const CLAIMS_TO_BE_PAST = /\b(past|ahead of|above|beyond|exceed(?:ed|s)?|surpass(?:ed|es)?|over|cleared|hit|reached|met)\b[^.!?]*\b(target|goal|number|figure|mark)\b|\b(target|goal)\b[^.!?]*\b(exceeded|met|hit|reached|cleared|surpassed)\b/i;

/*
 * AND THE OTHER DIRECTION. "Some farmers waiting means you did not hit the 40 farmers a season goal" -
 * to a miller who had milled for 46 (run 11, 22 Sep 2026). A shortfall the model inferred from a
 * sentence with no number in it. A sentence that says they MISSED, FELL SHORT OF or DID NOT HIT a
 * number stands only when they have said a figure below it, or said in their own words that they
 * fell short.
 */
const CLAIMS_TO_HAVE_MISSED = /\b(?:did not|didn't|have not|haven't|never|not)\s+(?:hit|reach(?:ed)?|meet|met|make|made|get to|got to)\b[^.!?]*\b(?:target|goal|number|figure|mark)\b|\b(?:missed|fell short of|short of|below|under|behind on)\b[^.!?]*\b(?:target|goal|number|figure|mark)\b/i;
const SAID_THEY_FELL_SHORT = /\b(missed|short|behind|below|under|did not (?:hit|reach|make|meet)|didn't (?:hit|reach|make|meet)|not (?:hit|reached|met|made))\b/i;

const RECALLS = /^(last (time|session|week|month)|previously|earlier|before,? you|you (said|mentioned|told|gave|named)|at the (start|beginning)|when we (last|first) spoke|the last time)/i;

const CLAIMS_A_COST = /\b(?:is|are|was|were|has been|have been)\s+(?:stopping|costing|blocking|holding back|keeping|preventing)\b/i;
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
/** A count written as a word, "six shops", as a number. "one" is left out: it is as often "one of" as a count. */
export function numberWordsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of (text ?? '').toLowerCase().matchAll(/\b([a-z]+)\b/g)) {
    const i = NUMBER_WORDS.indexOf(m[1]);
    if (i >= 2) out.push(i);
  }
  return out;
}

export interface WhatTheyHaveSaid {
  /** Everything this person has said, this session and in their earlier sessions' entries. */
  theirWords: string[];
}

/** The sentences that do not hold, with why, so the log can carry it. */
export function claimsTheNumbersDoNotSupport(reply: string, said: WhatTheyHaveSaid): { sentence: string; why: string }[] {
  const theirNumbers = new Set(said.theirWords.flatMap(numbersIn));
  /* What they have REACHED, for the past-the-target check: a number they said as their target, their
     aim or what they need is not a number they have got to. "My target is N40m" does not put them past N40m. */
  const reached = said.theirWords
    .flatMap(sentencesOf)
    .filter((s) => !/\b(target|goal|aim(?:ing)?|need(?:s|ed)? to|by the end|should|want(?:ed)? to|hoping|plan(?:ning)? to|expect(?:ed)? to)\b/i.test(s))
    .flatMap(numbersIn);
  const theirMax = reached.length ? Math.max(...reached) : 0;
  const out: { sentence: string; why: string }[] = [];
  const theirs = said.theirWords.join('\n').toLowerCase();
  for (const s of sentencesOf(reply)) {
    /* "YOU HAVE ASKED FOR THAT BEFORE, THREE TIMES" to a man who had asked once, in the conversation it was
       said in (run 7, 21 Sep 2026). A count of how often THEY did something is a claim about the record; it
       stands only where they said the count themselves. */
    const howOften = /\byou(?:'ve| have)? (?:asked|said|told|raised|mentioned|tried|chased|followed up|reminded)\b[^.!?]*\b(twice|three times|four times|five times|several times|many times|\d+ times)\b/i.exec(s);
    if (howOften && !theirs.includes(howOften[1].toLowerCase())) {
      out.push({ sentence: s, why: `says they did that ${howOften[1]}, which they never said` });
      continue;
    }
    const nums = numbersIn(s);
    if (!nums.length && !(CLAIMS_A_COST.test(s) && numberWordsIn(s).length)) continue;
    if (CLAIMS_TO_BE_PAST.test(s)) {
      const claimed = Math.max(...nums);
      if (theirMax < claimed) {
        out.push({ sentence: s, why: `says they are past ${claimed} and the most they have said is ${theirMax}` });
        continue;
      }
    }
    if (CLAIMS_TO_HAVE_MISSED.test(s) && !SAID_THEY_FELL_SHORT.test(theirs)) {
      const target = Math.max(...nums);
      if (!reached.some((n) => n < target)) {
        out.push({ sentence: s, why: `says they fell short of ${target} and they have said no figure below it, nor that they fell short` });
        continue;
      }
    }
    /* B-016: "That stock is stopping six shops from happening." to Amani, who had said 15 a week and about 9;
       six is only the gap, and she named stock as one cause. A sentence that says something is stopping,
       costing or blocking a number of things stands only where they said that number. */
    if (CLAIMS_A_COST.test(s)) {
      const unsaid = [...nums, ...numberWordsIn(s)].filter((n) => !theirNumbers.has(n));
      if (unsaid.length) {
        out.push({ sentence: s, why: `says something is costing them ${unsaid.join(', ')}, which they never said` });
        continue;
      }
    }
    if (RECALLS.test(s.trim())) {
      const unheard = nums.filter((n) => !theirNumbers.has(n) && !(n >= 1900 && n <= 2100) && !(n >= 1 && n <= 31));
      if (unheard.length) out.push({ sentence: s, why: `recalls ${unheard.join(', ')}, which they never said` });
    }
  }
  return out;
}

/** The reply with those sentences taken out; unchanged when there is nothing to take, or nothing would be left. */
export function withoutTheClaimsTheNumbersDoNotSupport(reply: string, said: WhatTheyHaveSaid): { text: string; cut: { sentence: string; why: string }[] } {
  const cut = claimsTheNumbersDoNotSupport(reply, said);
  if (!cut.length) return { text: reply, cut };
  const gone = new Set(cut.map((c) => c.sentence));
  const kept = sentencesOf(reply).filter((s) => !gone.has(s)).join(' ').trim();
  return kept ? { text: kept, cut } : { text: reply, cut: [] };
}
