/**
 * AN AIM IS A SENTENCE ABOUT SOMEBODY, BY NAME (review of 1 October 2026).
 *
 * What the lead and every participant read as the names of the targets on the boards of that run:
 *
 *   "I'm aiming for N120 million disbursed this quarter."          (sales: first person, "N120")
 *   "approved facilities"                                           (sales: a fragment)
 *   "I stop being invited to every single call."                    (seniorhire: first person)
 *   "The person wants introductions to decision-makers at Equity Bank, KCB, and Co-operative Bank."
 *   "Tunde owns the technical side ..., enabling the speaker to focus on business growth"
 *
 * The names are written by the extraction that reads the lead's own session (EXPECTATION_PROMPT), so
 * "I", "the person" and "the speaker" are all the person who set the aim. A row that only says what is
 * counted ("approved facilities") is the number somebody holds, so it is said as that person aiming
 * at that number.
 *
 * WRITTEN IN LABELS, THEN NAMED FOR THE READER. The person is written as their label, and the board
 * then puts the text through the same `withNames` every report goes through, so the reader's own label
 * becomes "you" with its verb, a name they may read becomes the name, and one they may not becomes "a
 * colleague". Nothing here decides who may read whose name.
 *
 * It is not a quote: an aim is never served between quotation marks, so changing "I" to the person's
 * name changes no words anybody is shown as having said.
 */

/** A number the way a person reads it: "120 million", "1.5 million", "254,000", "40". */
export function aNumberPeopleCanRead(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  const inUnits = (unit: number, word: string): string | null => {
    const v = n / unit;
    const oneDecimal = Math.round(v * 10) / 10;
    return Math.abs(oneDecimal - v) < 1e-9 ? `${oneDecimal} ${word}` : null;
  };
  if (abs >= 1e9) { const s = inUnits(1e9, 'billion'); if (s) return s; }
  if (abs >= 1e6) { const s = inUnits(1e6, 'million'); if (s) return s; }
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, bn: 1e9, b: 1e9, billion: 1e9 };

/**
 * The numbers inside a sentence, written so a person can read them. "N120 million" and "N120m" are
 * "120 million naira"; "254k" is "254,000"; "120000000" is "120 million". A number under 10,000
 * with no scale is left as it is, so a year, a "40" or a "14" never changes.
 */
export function theNumbersPeopleCanRead(text: string): string {
  if (!text) return text;
  const value = (digits: string, scale?: string) => Number(digits.replace(/,/g, '')) * (scale ? SCALE[scale.toLowerCase()] ?? 1 : 1);
  return text
    /* Naira: "N120 million", "N120m", "₦120m", "N 254,000". */
    .replace(/(?<![\p{L}\p{N}])(?:N|₦)\s?(\d[\d,]*(?:\.\d+)?)(?:\s?(million|thousand|billion|bn|m|k|b)(?![\p{L}]))?/gu,
      (_m, d: string, s?: string) => `${aNumberPeopleCanRead(value(d, s))} naira`)
    /* A scale written as a letter: "254k", "1.5m", "2bn". */
    .replace(/(?<![\p{L}\p{N}.,])(\d[\d,]*(?:\.\d+)?)(k|m|bn)(?![\p{L}\p{N}])/gu,
      (_m, d: string, s: string) => aNumberPeopleCanRead(value(d, s)))
    /* A long bare number: "120000000". */
    .replace(/(?<![\p{L}\p{N}.,])(\d{5,})(?![\p{N},.]\d|[\p{L}])/gu, (_m, d: string) => aNumberPeopleCanRead(Number(d)));
}

const MODALS = new Set(['will', 'would', 'can', 'could', 'should', 'must', 'may', 'might', 'shall', 'did', 'was', 'had']);

/** The verb that goes with one person: "stop" -> "stops", "need" -> "needs", "have" -> "has". */
function forOnePerson(verb: string): string {
  const w = verb.toLowerCase();
  if (MODALS.has(w)) return verb;
  if (w === 'am' || w === 'are') return 'is';
  if (w === 'were') return 'was';
  /* A verb in the past is the same for one person: "needed", "said", "wanted". */
  if ((/ed$/.test(w) && !/^(?:need|feed|speed|proceed|succeed|exceed|seed|heed|bleed|breed|plead|lead|read|spread|head|shed|embed)$/.test(w)) || ['said', 'had', 'did', 'got', 'made', 'set', 'sent', 'met', 'kept', 'told', 'thought', 'felt', 'went', 'took', 'gave'].includes(w)) return verb;
  if (w === 'have') return 'has';
  if (w === 'do') return 'does';
  if (w === "don't") return "doesn't";
  if (w === 'go') return 'goes';
  if (/(?:s|sh|ch|x|z|o)$/.test(w)) return `${verb}es`;
  if (/[^aeiou]y$/.test(w)) return `${verb.slice(0, -1)}ies`;
  return `${verb}s`;
}

/**
 * "I'm aiming for", "I stop", "the speaker", "the person", "my", "me" become the person who set the
 * aim, as their label, with the verb for one person. Only "I" and its forms, and only these two
 * phrases for the speaker, so nothing else in the sentence moves.
 */
export function aboutTheSpeaker(text: string, speaker: string): string {
  const S = speaker;
  let out = text
    .replace(/(^|[^\p{L}'’])I(?:'|’)m\b/gu, `$1${S} is`)
    .replace(/(^|[^\p{L}'’])I am\b/gu, `$1${S} is`)
    .replace(/(^|[^\p{L}'’])I(?:'|’)ve\b/gu, `$1${S} has`)
    .replace(/(^|[^\p{L}'’])I(?:'|’)ll\b/gu, `$1${S} will`)
    .replace(/(^|[^\p{L}'’])I(?:'|’)d\b/gu, `$1${S} would`)
    /* A small word between "I" and the verb stays as it is (item 21, the support desk board): "I still do about 30 of
       those a week myself" read "Daniel Park stills do about 30 of those a week myself". */
    .replace(/(^|[^\p{L}'’])I ((?:(?:still|also|just|really|always|never|often|usually|already|only|now|then|actually|definitely|probably|mostly|sometimes|even) )*)([a-z][a-z'’]*)\b/gu,
      (_m, before: string, small: string, verb: string) => `${before}${S} ${small}${forOnePerson(verb)}`)
    /* "myself" said about them is left out: "Daniel Park still does about 30 of those a week." */
    .replace(/,?\s+myself\b/g, '')
    .replace(/\bthe speaker(?:'|’)s\b/gi, `${S}'s`)
    .replace(/\bthe speaker\b/gi, S)
    .replace(/^The person\b/, S)
    /* "They want to get 12 shops onboarded." has nobody for "they" to be: it is the person who set it (request 107 b). */
    .replace(/^They(?:'|’)re\b/, `${S} is`)
    .replace(/^They are\b/, `${S} is`)
    .replace(/^They(?:'|’)ve\b/, `${S} has`)
    .replace(/^They(?:'|’)ll\b/, `${S} will`)
    .replace(/^They ([a-z][a-z'’]*)\b/u, (_m, verb: string) => `${S} ${forOnePerson(verb)}`)
    .replace(/(^|[.!?]\s+)My\b/g, `$1${S}'s`)
    .replace(/\bmy\b/g, `${S}'s`)
    .replace(/\bme\b/g, S);
  if (out !== text) out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

/*
 * A NAME WITH NO VERB IS NOT A SENTENCE (review of 1 October 2026). "Spending on field visits." has a
 * full stop and four words, and was left as it was: a fragment on the board, and in the check-in "Spending
 * on field visits. The number 180,000 is a limit not to go over." A name is a sentence only where it has
 * somebody doing something in it: a person ("I", "the speaker") or a verb from this list. Anything else
 * says only what is counted, and is said as whoever holds it aiming for it, or keeping it under a limit.
 */
const A_PERSON_OR_A_VERB = new RegExp(String.raw`(?:^|[^\p{L}'’])(?:I|we|you|he|she|they|it|the speaker|the person|is|are|am|was|were|be|been|being|will|would|should|must|can|could|may|might|shall|has|have|had|do|does|did|need|needs|want|wants|aim|aims|aiming|plan|plans|hope|hopes|expect|expects|owns|runs|leads|manages|stop|stops|keep|keeps|get|gets|make|makes|reach|reaches|hit|hits|close|closes|sell|sells|deliver|delivers|bring|brings|grow|grows|cut|cuts|takes|gives|sends|joins|signs|wins|holds|uses|sees|knows|says|becomes|stays|moves|starts|finishes|ships|launches|reports|works|attends|chairs|presents|answers|handles|covers|approves|decides|sets|writes|builds|hires|trains|supports)(?:(?:'|’)(?:m|re|ve|ll|d|s))?(?![\p{L}])`, 'iu');

const AN_INSTRUCTION_STARTS = new Set(('decide achieve confirm hire build launch close sign win deliver reach hit grow cut reduce increase improve finish '
  + 'complete ship raise land onboard bring book recover collect make get keep run lead own manage find secure set open train write '
  + 'design review agree create migrate move hand pass submit approve disburse sell recruit support help double triple maintain ensure '
  + 'establish develop define prepare plan introduce publish release deploy test fix resolve reconcile settle renew retain convert '
  + 'visit call meet attend stop start take give send pay spend save do be have go see stay hold cover handle drive clear').split(' '));

/*
 * AND THESE, ONLY IN A SENTENCE WITH ITS OWN FULL STOP AND AT LEAST FOUR WORDS (item 21, the founder's board).
 * "Provide the final details for the paperwork to my lawyer." read "The team is working on provide the final
 * details ...", and "Draft the formal co-founder agreement for Tunde, ..." read "The team is aiming for 25 draft
 * ...". Several of these are nouns too ("Share of wallet", "Schedule adherence"), which is why a counted name
 * without a full stop is never read as one of them.
 */
const AN_INSTRUCTION_WITH_A_STOP_STARTS = new Set(('provide draft let prioritize prioritise schedule share formalize formalise clarify '
  + 'delegate assess document outline propose discuss align sort follow chase update check ask tell invite present arrange '
  + 'organise organize finalize finalise negotiate identify map track measure monitor hand iron').split(' '));

/** A row that only says what is counted: "approved facilities", "Contracts", "Spending on field visits.". Never a sentence. */
export function onlySaysWhatIsCounted(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  if (/^[\p{Ll}\p{N}]/u.test(t)) return true;
  if (!/[.!?]$/.test(t) && t.split(/\s+/).length <= 3) return true;
  /* An instruction is a sentence too: "Decide whether to confirm Aisha in her role", "Consistently achieve
     eight renewals per quarter". */
  const first = (t.split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (AN_INSTRUCTION_STARTS.has(first) || /ly$/.test(first)) return false;
  if (AN_INSTRUCTION_WITH_A_STOP_STARTS.has(first) && /[.!?]$/.test(t) && t.split(/\s+/).length >= 4) return false;
  return !A_PERSON_OR_A_VERB.test(t);
}

export interface WhoAnAimIsAbout {
  /** The label of the person who set it, for "I", "the speaker" and "the person". */
  speaker: string | null;
  /** The label of the person who holds the number, or null for the team. */
  holder: string | null;
  target: number | null;
  /** The lead's kind for this number (decision 69, and decision 75 item 17's five kinds). Null: not said. */
  direction?: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null;
  /**
   * The person who holds this number set it themselves, in their own check-in, and they are not the
   * person who runs the check-in (decision 75, item 37). Their own aim is said as theirs, never as a
   * number somebody set for them: "You set yourself an aim of 3 shops in Kilimani." to them, and
   * "Amani Wekesa set an aim of 3 shops in Kilimani for their own work." to anybody else.
   */
  setByTheHolder?: boolean;
  /** The day the aim is due by, in words ("20 December"), kept apart from its name (request 117, part 11). */
  dueOnSays?: string | null;
}

/**
 * Whether a stored target is a person's own aim: they hold it, they set it, and they do not run the
 * check-in. A target with no setter (made on the setup form) or set by the lead is never one.
 */
export function anAimTheHolderSet(row: { ownerParticipantId?: string | null; setByParticipantId?: string | null }, leadsRow: string | null | undefined): boolean {
  return !!row.ownerParticipantId && row.setByParticipantId === row.ownerParticipantId && row.ownerParticipantId !== (leadsRow ?? null);
}

/**
 * Words that make a phrase somebody's own sentence rather than the thing aimed for. "I'm" and "I've" too (run-25,
 * sales): "42 million naira, and I'm aiming to achieve that by the end of the quarter" passed as the thing aimed
 * for, because the apostrophe after "I" hid it, and Bisi read "Kwame Mensah's own aim is 42 million naira, and I'm
 * aiming to achieve that by the end of the quarter."
 */
const A_PERSON_IN_IT = /(?:^|[^\p{L}'’])(?:I|me|my|we|our|us|you|your)(?![\p{L}])/iu;

const A_NUMBER_IN_WORDS = /^(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a\s+hundred|hundred|a\s+thousand|a\s+dozen|dozen)\b/i;

/* "42 million naira, and I'm aiming to achieve that ...": the thing aimed for is the first part, where only the rest is somebody's own words. */
const theFirstPartAlone = (what: string): string | null => {
  const m = /^(.+?)\s*(?:,|;|\s-\s)\s*(?:and|but|so|which)?\s*(?=\S)/i.exec(what);
  const first = m ? m[1].trim() : null;
  return first && !A_PERSON_IN_IT.test(first) && first.split(/\s+/).length >= 1 ? first : null;
};

/**
 * THE THING AIMED FOR, WITH ITS NUMBER: "3 shops in Kilimani" from "I am aiming for 3 shops in
 * Kilimani." or from "shops in Kilimani" with a target of 3. Null where it cannot be said without
 * guessing; the caller then keeps the aim's own sentence.
 */
/*
 * AN AIM IS A THING, NEVER A WHOLE SENTENCE (night quality run 1, problem 8). Hassan's aim was stored as "my plan is five kits to
 * the shops and three to households." and Collins's as "This week I will do twelve kits, six for the women's group on Wednesday
 * and the Oyugis stockist, this time for sure.", and the board read "Hassan Mwenda is aiming for 8 my plan is five kits ...".
 * Where the name is somebody's own sentence, the thing counted is the word after its first number ("kits"). Their sentence stays
 * in their check-in, word for word; only the aim's name is the thing. Empty when no thing can be found.
 */
const THEIR_OWN_SENTENCE = /^(?:i|i'm|i'll|i've|my|we|we'll|our|this week|next week|today|tomorrow)\b|\b(?:i will|i'll|i can|i am|i'm|my plan)\b/i;
const A_NUMBER = '(?:\\d+(?:[.,]\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred)';
/**
 * THE THING A NUMBER COUNTS, the word after the aim's first number ("kits" in "five kits to the shops", "drop" in "Activate 4 Drop
 * Access points"), or null where the number counts nothing named ("on track for 30", "30 by October", "30 per week").
 */
export function theThingItsNumberCounts(name: string): { word: string; at: number; length: number } | null {
  const t = String(name ?? '').replace(/\s+/g, ' ').trim();
  const m = new RegExp(`\\b${A_NUMBER}\\s+([a-z][a-z'-]*)`, 'i').exec(t);
  if (!m || /^(to|for|of|and|or|a|the|on|in|by|this|next|more|times?|per|each|every)$/i.test(m[1])) return null;
  return { word: m[1], at: m.index, length: m[0].length };
}

export function anAimIsAThing(name: string): string {
  const t = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!THEIR_OWN_SENTENCE.test(t)) return t;
  const thing = theThingItsNumberCounts(t);
  if (!thing) return '';
  /* The place they named stays with the thing ("3 shops in Kilimani" is "shops in Kilimani"): it is their own words. */
  const where = /^\s+((?:in|at|across|around)\s+\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*)*)/u.exec(t.slice(thing.at + thing.length));
  return thing.word.toLowerCase() + (where ? ` ${where[1]}` : '');
}

/*
 * THEIR SENTENCE, ALWAYS, AND THE LABEL ONLY BESIDE IT (Hafsah, 12 October 2026). An aim is stored as the person said it.
 * Where it is their own sentence ("I am aiming for 3 shops in Kilimani.", "my plan is five kits to the shops and three to
 * households."), every surface shows it in quotation marks as their words, word for word, with the short label beside it.
 * It is never spliced into "is aiming for": the run read "Hassan Mwenda is aiming for 8 my plan is five kits ...".
 */
export function theirOwnSentence(name: string | null | undefined): string | null {
  const t = String(name ?? '').replace(/\s+/g, ' ').trim();
  return t && THEIR_OWN_SENTENCE.test(t) ? t : null;
}

/**
 * An aim a person set in their own check-in is their words, whatever the sentence: "This coming week I am targeting twelve
 * kits." is quoted as it is, never with "I" changed to their name (Hafsah, 12 October). Only a bare thing ("shops in
 * Kilimani") is not a sentence to quote.
 */
export function theirWordsWhenTheySetIt(name: string | null | undefined): string | null {
  const t = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return theirOwnSentence(t) ?? (onlySaysWhatIsCounted(t) ? null : t);
}

/** "Hassan Mwenda said, \"my plan is five kits to the shops and three to households.\"" Their words are not changed. */
export function inTheirWords(who: string, sentence: string): string {
  /* The full stop goes after the quotation mark, so a sentence that follows never reads '."."'. Their words are as they said them. */
  const t = sentence.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  return `${who} said, "${t}".`;
}

export function theAimItself(name: string, target: number | null): string | null {
  /* Read from their whole sentence first ("My goal is 14 approved facilities this quarter" is "14 approved facilities this
     quarter", never "approved"); only where that finds nothing, from the thing after its first number ("8 kits"). */
  const fromTheSentence = theAimFrom(name, target);
  if (fromTheSentence) return fromTheSentence;
  const thing = anAimIsAThing(name);
  return thing && thing !== String(name ?? '').replace(/\s+/g, ' ').trim() ? theAimFrom(thing, target) : null;
}

function theAimFrom(name: string, target: number | null): string | null {
  /* "Sell 40 units" and "Open 10 new leads weekly" (Drop Access, 16 October) read "You are aiming for 40 Sell 40 units": an aim
     said as a thing to do is the thing it counts, "40 units". */
  const t = aThingToDoIsWhatItCounts(theNumbersPeopleCanRead((name ?? '').trim()).replace(/[.!?\s]+$/, ''));
  if (!t) return null;
  let what: string | null = null;
  if (onlySaysWhatIsCounted(t)) {
    const words = t.replace(/[.,;:]+$/, '').split(/\s+/);
    if (words.length > 1 && /(?:'|’)s$/i.test(words[0])) words.shift();
    if (/^\p{Lu}\p{Ll}*(?:-\p{Ll}+)*$/u.test(words[0] ?? '') && (words.length === 1 || /^\p{Ll}/u.test(words[1]))) words[0] = words[0].toLowerCase();
    what = words.join(' ');
  } else {
    const m = /\b(?:am|is|are|['’]m|['’]re)\s+aiming\s+(?:for|at|to\s+(?:get|reach|hit|close|sign|onboard|make|do))\s+(.+)$/i.exec(t)
      ?? /\b(?:want|wants|aim|aims|plan|plans|hope|hopes|need|needs)\s+(?:to\s+(?:get|reach|hit|close|sign|onboard|make|do)\s+)?(.+)$/i.exec(t)
      ?? /\b(?:goal|aim|target)\s+is\s+(?:to\s+(?:get|reach|hit|close|sign|onboard|make|do)\s+)?(.+)$/i.exec(t)
      /* "I'm working on getting twelve approved facilities this quarter" (run-25): it read "Femi Okonkwo is working on
         getting twelve approved facilities this quarter. Femi Okonkwo set this aim.", the name twice. */
      ?? /\b(?:am|is|are|['’]m|['’]re)\s+(?:working\s+(?:on|towards?)|trying\s+to)\s+(?:getting|get|reaching|reach|hitting|hit|closing|close|signing|sign|onboarding|onboard|a\s+(?:personal\s+)?target\s+of)\s+(.+)$/i.exec(t);
    what = m ? m[1].trim() : null;
  }
  if (what && A_PERSON_IN_IT.test(what)) what = theFirstPartAlone(what);
  if (!what) return null;
  /* "twelve approved facilities" already says its number: never "12 twelve approved facilities". */
  if (target != null && !/^\d/.test(what) && !A_NUMBER_IN_WORDS.test(what)) {
    const n = aNumberPeopleCanRead(target);
    if (!what.includes(n)) what = `${n} ${what}`;
  }
  return what;
}

/**
 * A person's own aim, in labels: "Participant A's own aim is 3 shops in Kilimani by 20 December." (request 117,
 * part 11). It read "Amani Wekesa set an aim of 3 shops in Kilimani by 20 December for their own work.", which
 * reads badly and guesses nothing better: "set herself" would guess a pronoun. The reader's own reads "Your own aim
 * is 3 shops in Kilimani by 20 December." The day comes from the target's own date where it has one, so the name
 * holds only the thing counted.
 */
function anAimTheySetThemselves(sentence: string, name: string, who: WhoAnAimIsAbout): string {
  const holder = who.holder as string;
  const whose = /^you$/i.test(holder) ? 'Your' : `${holder}'s`;
  /* Where there is no thing to name, the sentence stays and says who set it, with no possessive to repeat. */
  const theirs = theirWordsWhenTheySetIt(name);
  if (who.direction === 'LIMIT') return theirs ? `${holder} set this limit. ${inTheirWords(holder, theirs)}` : `${sentence} ${holder} set this limit.`;
  const what = theAimItself(name, who.target);
  if (!what) return theirs ? `${holder} set this aim. ${inTheirWords(holder, theirs)}` : `${sentence} ${holder} set this aim.`;
  const by = who.dueOnSays && !/\bby\b/i.test(what) ? ` by ${who.dueOnSays}` : '';
  /* The label, then their own sentence beside it: never the label alone. */
  return `${whose} own aim is ${what}${by}.${theirs ? ` ${inTheirWords(holder, theirs)}` : ''}`;
}

/**
 * THE DAY KEPT APART FROM THE NAME (request 117, part 11). "3 shops in Kilimani by 20 December" is the thing
 * counted and the day it is due by: the name keeps "3 shops in Kilimani", and the day goes to the target's date.
 * Only a day somebody can read back ("by 20 December", "by Friday", "by the end of the quarter"); `day` turns it
 * into a date, and where it cannot, the name is left whole.
 */
export function theDayKeptApart(name: string, day: (said: string) => Date | null): { name: string; dueOn: Date | null } {
  const t = (name ?? '').trim();
  const m = /^(.*\S)\s+by\s+((?:the\s+)?[^,;]+?)[.!]?$/i.exec(t)
    /* And a day said with no "by" at the end ("I will visit two shops in Westlands tomorrow."), kept as the day so a
       board reads it as due, and later as past due, never as "tomorrow" for ever (reviewer, 14 October). */
    ?? /^(.*\S)\s+((?:today|tonight|tomorrow|(?:on\s+|this\s+|next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)))[.!]?$/i.exec(t);
  if (!m) return { name: t, dueOn: null };
  const when = day(m[2]);
  return when ? { name: m[1].replace(/[,;]+$/, '').trim(), dueOn: when } : { name: t, dueOn: null };
}

/** "Tobi to close 8 renewals per quarter": a person's name, then "to" and a verb for what they are to do. */
export const THE_NAME_TO_DO = /^(\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)?)\s+to\s+((?:close|meet|hit|reach|sign|get|make|bring|win|sell|onboard|complete|finish|deliver|raise|cut|reduce|keep|build|launch|hire|run|do|achieve|generate|secure|renew|collect|grow|increase|improve|lead|manage|take|visit|call|send|cover|recruit|train|open|resolve|clear|handle)\b.*)$/u;

/**
 * The name of an aim, as one full sentence about a person, in labels. The board names it for the
 * reader with `withNames` after this.
 */
/*
 * A THING TO DO IS WHAT IT COUNTS (Drop Access re-read, 22 November 2026). "Sell 8 freezers per week" is "8 freezers per week", and so
 * is any doing word before the number: "Activate 4 Drop Access points per week" read "Brian Otieno is aiming for 4 Activate 4 Drop Access
 * points per week." because only a few doing words were known. The one word before the number goes, unless it says how big the number is
 * ("over 5", "about 20") or is written in capitals ("KES 600,000").
 */
export function aThingToDoIsWhatItCounts(t: string): string {
  const m = /^([A-Za-z][a-z]+)(?:\s+(?:in|on|up|out))?\s+(?=\d|(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty)\b)/.exec(t);
  if (!m || /^(?:over|under|about|around|up|at|only|below|above|nearly|almost|exactly|roughly|some|least|most|by|in|on|for|to)$/i.test(m[1])) return t;
  return t.slice(m[0].length);
}

export function anAimAsASentence(name: string, who: WhoAnAimIsAbout): string {
  let t = aThingToDoIsWhatItCounts(theNumbersPeopleCanRead((name ?? '').trim()));
  if (!t) return t;
  /* Their own sentence that would read as a thing ("my plan is five kits ...") is quoted as theirs, with the label beside it. */
  const theirs = theirOwnSentence(name);
  const whoSaidIt = who.holder ?? who.speaker;
  if (theirs && whoSaidIt && !who.setByTheHolder && onlySaysWhatIsCounted(t)) {
    const what = theAimItself(name, who.target);
    const aim = what && (who.direction == null || who.direction === 'AIM') ? `${whoSaidIt} is aiming for ${what}. ` : '';
    const said = `${aim}${inTheirWords(whoSaidIt, theirs)}`;
    return said.charAt(0).toUpperCase() + said.slice(1);
  }
  if (onlySaysWhatIsCounted(t)) {
    const holder = who.holder ?? 'the team';
    /* "Aisha’s sales" held by Aisha is "sales": the holder is already said. A first word is made lower
       case only where it is an ordinary word ("Sales", "Contracts"), not part of a name ("Equity Bank"). */
    const words = t.replace(/[.,;:]+$/, '').split(/\s+/);
    /* "Aisha’s share", held by Aisha: "Aisha's share is 12." (and "Your share is 12." to her). A word
       that is a number of things ("Aisha’s sales") is "Aisha is aiming for 5 sales.", below. */
    if (words.length > 1 && /(?:'|’)s$/i.test(words[0]) && who.holder && /^(?:share|target|quota|number|part|portion)$/i.test(words.slice(1).join(' '))) {
      const rest = words.slice(1).join(' ').toLowerCase();
      t = who.target != null ? `${who.holder}'s ${rest} is ${aNumberPeopleCanRead(who.target)}.` : `This is ${who.holder}'s ${rest}.`;
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    if (words.length > 1 && /(?:'|’)s$/i.test(words[0]) && who.holder) words.shift();
    if (/^\p{Lu}\p{Ll}*(?:-\p{Ll}+)*$/u.test(words[0] ?? '') && (words.length === 1 || /^\p{Ll}/u.test(words[1]))) words[0] = words[0].toLowerCase();
    const what = words.join(' ');
    const howMany = who.target != null && !/^\d/.test(what) && !A_NUMBER_IN_WORDS.test(what) ? `${aNumberPeopleCanRead(who.target)} ` : '';
    /* A limit the lead set is not something anybody is aiming for (decision 69), and each of the other
       kinds says what it is (decision 75, item 17). */
    t = who.direction === 'ZERO' ? `${holder} is keeping ${what} at zero.`
      : who.direction === 'DEADLINE' ? `${holder} has a date to meet for ${what}.`
        : who.target != null && who.direction === 'RATE' ? `${holder} is aiming to keep ${what} at ${aNumberPeopleCanRead(who.target)}% or more.`
          : who.target != null && who.direction === 'LIMIT'
            ? `${holder} is keeping ${what} to no more than ${aNumberPeopleCanRead(who.target)}.`
            : who.target != null ? `${holder} is aiming for ${howMany}${what}.` : `${holder} is working on ${what}.`;
  } else if (who.holder && /^They\b/.test(t)) {
    /* "They" with nobody before it is whoever holds the number, where somebody does (request 107 b). */
    t = aboutTheSpeaker(t, who.holder);
  } else if (who.speaker) {
    t = aboutTheSpeaker(t, who.speaker);
  }
  /* "Tobi to close 8 renewals per quarter." is a note, not a sentence: said to Tobi it read "You to close ...". */
  t = t.replace(THE_NAME_TO_DO, (_m, name: string, rest: string) => `${name} needs to ${rest}`);
  t = t.charAt(0).toUpperCase() + t.slice(1);
  const sentence = /[.!?]$/.test(t) ? t : `${t}.`;
  return who.setByTheHolder && who.holder ? anAimTheySetThemselves(sentence, name, who) : sentence;
}

/**
 * "You need to meet her renewal targets" is the reader's own targets: once the sentence is about the
 * reader ("You ..." at its start), "his" or "her" before a word is theirs, so it is "your". Only where
 * nobody else is named in it, so "You agree with Tobi on his plan" is left as it is.
 */
export function yourOwnWhereYouAreTheSubject(text: string, otherNames: Iterable<string>): string {
  text = yourOwnAimIsYours(text);
  if (!/^You\b/.test(text)) return theirOwnIsThe(text);
  for (const n of otherNames) {
    const name = (n ?? '').trim();
    if (name.length > 1 && new RegExp(`(?<![\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').test(text)) return text;
  }
  return text.replace(/\b(?:his|her)\s+(?=\p{Ll})/gu, 'your ');
}

/**
 * "MY TEAM" IS NOT "BISI'S TEAM" IN A SENTENCE ABOUT BISI (review of 1 October 2026). "I need my team to
 * stop missing documents", set by Bisi, came out "Bisi needs Bisi's team to stop missing documents." A
 * pronoun is never guessed, so where the sentence is about a person, their own name again as a
 * possessive is "the": "Bisi needs the team to stop missing documents." To Bisi herself the naming
 * already reads "You need your team to stop missing documents."
 */
export function theirOwnIsThe(text: string): string {
  const subject = /^((?:A|a) colleague|[\p{Lu}][\p{L}-]*)(?=[\s'’])/u.exec(text ?? '');
  if (!subject || /^(?:The|A|An|This|That|It|There)$/.test(subject[1])) return text;
  const who = subject[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const again = new RegExp(String.raw`(?<=\s)${who}(?:\s[\p{Lu}][\p{L}-]*)?(?:'|’)s\b`, 'giu');
  const head = text.slice(0, subject[1].length);
  return head + text.slice(subject[1].length).replace(again, 'the');
}

/**
 * A person's own aim, read by that person (decision 75, item 37): "You set yourself an aim of 3 shops
 * in Kilimani.", not "You set an aim of 3 shops in Kilimani for their own work.".
 */
export function yourOwnAimIsYours(text: string): string {
  return (text ?? '')
    /* "Participant A's own aim is ...", named for Participant A, is "your own aim is ..." (request 117, part 11). */
    .replace(/(^|[.!?]\s+)your own (aim|limit)\b/g, '$1Your own $2')
    .replace(/(^|[.!?]\s+)You set an aim of (.+?) for their own work\./g, '$1You set yourself an aim of $2.')
    .replace(/(^|[.!?]\s+)You set this (aim|limit) for their own work\./g, '$1You set yourself this $2.');
}

/**
 * A PROMISE TO DO SOMETHING IS NOT AN AIM (run-25, sales). Femi said "I will follow up with my customers to get five
 * bank statements by next Friday." The record kept it as his commitment, which is right, and also as a target of his
 * with the number 5, so Bisi's board listed it among the aims: "Femi Okonkwo will follow up with the customers to get
 * five bank statements. Femi Okonkwo set this aim." It is something he said he would do, and it is already on the
 * board as that. An aim says what somebody is trying to reach; this says what somebody will do next.
 *
 * Only a sentence that opens with somebody promising one of these actions ("I will follow up", "I'll call", "We are
 * going to visit"). "I will get 12 shops", "I'll close 5 deals" and "I'm aiming for
 * 14 facilities" are aims, and stay.
 */
const A_PROMISED_ACTION = '(?:follow(?:\\s+up)?|call|phone|ring|visit|chase|remind|email|e-mail|text|message|write|send|ask|check|talk|speak|meet|escalate|contact|reach\\s+out|push|look\\s+into|continue|keep\\s+(?:calling|chasing|following)|try)';
const A_PROMISE = new RegExp(
  String.raw`^\s*(?:I|we)\s*(?:will|shall|'ll|’ll|am\s+going\s+to|are\s+going\s+to|'m\s+going\s+to|’m\s+going\s+to|'re\s+going\s+to)\s+(?:also\s+|then\s+)?${A_PROMISED_ACTION}(?![-\w])`,
  'i',
);

export function aPromiseNotAnAim(name: string | null | undefined): boolean {
  return A_PROMISE.test((name ?? '').trim());
}
