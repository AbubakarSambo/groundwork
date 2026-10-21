/**
 * ASKING FOR WHAT SOMEBODY LEFT OUT.
 *
 * Week 1 of the weekly plan, 28 September 2026. Two scenarios could not be tested in most runs, and
 * for the same reason: the person said part of it and the check-in never asked for the rest.
 *
 * THE ADVISOR (runs 8, 9 and 10). Grace, the lead, named three banks in her own check-in: "the right
 * decision-makers at Equity, KCB, and Co-op Bank". Peter, the advisor, knows the head of SME lending
 * at Equity and has never worked with the other two. He "does not volunteer limits, but is honest
 * about them when asked a direct question". He talked about Equity Bank in every run, and in four
 * runs of five nobody asked him about KCB or Co-operative Bank. So the one thing the check-in was
 * for - which of the three he can actually do - never reached the record.
 *
 * THE SHOCK (runs 8, 9 and 10). Meridian gave notice. Tobi and Hana each held part of the timeline,
 * and each told it without the when: "The broken export caused them to open many support tickets."
 * "Usage was flat, not falling, so I reported the account as healthy." Tobi "has the dates once he
 * stops explaining", and the check-in did not ask for them.
 *
 * WHAT THIS DOES. It reads the person's answers against what this check-in is about and says, for the
 * next turn, what they have not said yet:
 *
 *   PART OF A SET. The brief, the goals on record, what the team has written down, or the lead's own
 *   words name several things (three banks, four branches), and the person has spoken about some of
 *   them. The next question asks directly about the others, by name.
 *
 *   A STORY WITHOUT DATES. The person described something that happened (a review cancelled, a
 *   champion leaving, tickets going up) and said nothing about when. The next question asks when.
 *
 * CONTEXT, NOT A SCRIPT. The conversation stays model-led: this is a block of facts and one plain
 * instruction, fed in the same way as the plan and what the session still owes, and the model writes
 * the question. The date question in a-period-is-not-a-day is the precedent for a must-ask, and it
 * began the same way: context first, the product's own sentence only after the model had been seen
 * to miss it in live runs. That was a date the product had worked out and had to cite exactly; here
 * there is nothing to cite, so the model's own words are the right ones.
 *
 * AND ONCE ONLY. When a question after they spoke has named the things they left out, or asked when,
 * and they have answered it - even with "I can't" - the line goes. Asking for it again is the other
 * fault this week is about.
 */

export interface ATurn {
  role: 'AI' | 'PERSON';
  content: string;
}

/** Where a set of things was named, said the way the block says it. */
export interface WhereASetWasNamed {
  text: string;
  /** "Grace named", "The brief for this check-in names", "A goal on this check-in names". */
  namedBy: string;
}

/* ------------------------------------------------------------------------------------------------ */
/* PART OF A SET                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

/** Words that name a kind of thing rather than which one: "Co-operative Bank" is found by "co-op". */
const A_KIND_NOT_A_NAME = new Set([
  'bank', 'banks', 'group', 'ltd', 'limited', 'plc', 'inc', 'company', 'branch', 'branches', 'office',
  'the', 'of', 'and', 'plc.', 'ltd.', 'holdings', 'services', 'state', 'region', 'team',
]);

/* Months, days and quarters are when, not which: "in June and September" is two dates, not a set. */
const NOT_A_THING_IN_A_SET =
  /^(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|q[1-4]|h[12]|i|we|you|he|she|they|it|the|a|an|and|or|but|so|if|yes|no|ok|okay|mr|mrs|ms|dr)$/i;

/** One item's key: its first word that names which one, lower case, with the spellings of "co-op" as one. */
export function theKeyOf(item: string): string | null {
  const words = item.toLowerCase().replace(/[’']s\b/g, '').split(/\s+/).map((w) => w.replace(/[^a-z0-9&-]/g, '')).filter(Boolean);
  const key = words.find((w) => !A_KIND_NOT_A_NAME.has(w));
  if (!key) return null;
  if (/^co-?op(?:erative)?$|^cooperative$/.test(key)) return 'co-op';
  return key;
}

/**
 * ANOTHER REP'S DEALS ARE NEVER HANDED TO THIS ONE (Drop Access short run, item 6): the names of the customers on record that are
 * not this person's own (another rep's, or nobody's yet).
 */
export function theCustomersThatAreNotTheirs(rows: { name: string; ownerParticipantId: string | null }[], participantId: string | null): string[] {
  const mine = new Set(rows.filter((r) => !!participantId && r.ownerParticipantId === participantId).map((r) => String(r.name ?? '').trim().toLowerCase()));
  return [...new Set(rows.filter((r) => !participantId || r.ownerParticipantId !== participantId).map((r) => String(r.name ?? '').trim()).filter((n) => n && !mine.has(n.toLowerCase())))];
}

/** Where a set was named, with those customers' names taken out, so no set is made of them (the whole name, never a word of it). */
export function withoutTheseCustomers(namedIn: WhereASetWasNamed[], customers: string[]): WhereASetWasNamed[] {
  if (!customers.length) return namedIn;
  const longestFirst = [...customers].sort((a, b) => b.length - a.length);
  return namedIn.map((w) => {
    let text = w.text;
    for (const c of longestFirst) text = text.replace(new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '');
    return { ...w, text };
  });
}

function mentions(text: string, key: string): boolean {
  const t = ` ${(text ?? '').toLowerCase().replace(/co-?operative|cooperative|\bcoop\b/g, 'co-op').replace(/[’']s\b/g, '')} `;
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9-])${k}(?:[^a-z0-9-]|$)`).test(t);
}

/*
 * A list of names: capitalised items, joined by commas and a last "and" or "or". "Equity, KCB, and
 * Co-op Bank", "Equity Bank, KCB, or Co-operative Bank". An item is one to four capitalised words,
 * with "of" allowed inside ("Bank of Industry").
 */
const ITEM = String.raw`(?:[A-Z][A-Za-z0-9&'’-]*)(?:\s+(?:of\s+)?[A-Z][A-Za-z0-9&'’-]*){0,3}`;
const A_LIST = new RegExp(String.raw`(${ITEM})((?:\s*,\s*${ITEM})*)\s*,?\s+(?:and|or)\s+(${ITEM})`, 'g');

/** The sets of named things in a piece of text, two or more to a set. */
export function theSetsNamedIn(text: string): string[][] {
  const sets: string[][] = [];
  for (const m of (text ?? '').matchAll(A_LIST)) {
    const middle = (m[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const items = [m[1], ...middle, m[3]].map((s) => s.trim().replace(/[.,;:]+$/, '').replace(/^the\s+/i, ''));
    const kept = items.filter((i) => !NOT_A_THING_IN_A_SET.test(i.split(/\s+/)[0]) && theKeyOf(i));
    /* One dropped item means this was not a list of names ("In June and September" drops both). */
    if (kept.length !== items.length || kept.length < 2) continue;
    const keys = new Set(kept.map((i) => theKeyOf(i)!));
    if (keys.size < 2) continue;
    sets.push(kept);
  }
  return sets;
}

export interface PartOfASet {
  namedBy: string;
  /** Every item, as fully as it was ever named. */
  all: string[];
  spokeAbout: string[];
  leftOut: string[];
}

/**
 * Which set they have spoken to part of, and what they left out. Null when they have covered it,
 * when they have not come near it at all, or when a question after they spoke already named what
 * they left out and they answered it.
 *
 * @param namedIn where sets were named, in the order they should count (the lead's words first)
 * @param turns this session's turns, the latest last
 * @param notTheseKeys names never to treat as a thing in a set (the people on this check-in)
 */
export function theSetTheySpokeToPartOf(namedIn: WhereASetWasNamed[], turns: ATurn[], notTheseKeys: string[] = []): PartOfASet | null {
  const skip = new Set(notTheseKeys.map((k) => k.toLowerCase()).filter(Boolean));
  /* Sets that share a name are one set: "Equity, KCB, and Co-op Bank" and "Equity Bank, KCB, and
     Co-operative Bank" are the same three banks said twice. */
  const merged: { namedBy: string; byKey: Map<string, string> }[] = [];
  for (const where of namedIn) {
    for (const items of theSetsNamedIn(where.text)) {
      const pairs = items.map((i) => [theKeyOf(i)!, i] as const).filter(([k]) => !skip.has(k));
      if (pairs.length < 2) continue;
      const into = merged.find((s) => pairs.some(([k]) => s.byKey.has(k)));
      if (into) {
        for (const [k, i] of pairs) if (!into.byKey.has(k) || i.length > into.byKey.get(k)!.length) into.byKey.set(k, i);
      } else {
        merged.push({ namedBy: where.namedBy, byKey: new Map(pairs) });
      }
    }
  }
  if (!merged.length) return null;
  const theirs = turns.filter((t) => t.role === 'PERSON');
  for (const set of merged) {
    const keys = [...set.byKey.keys()];
    const firstMention = turns.findIndex((t) => t.role === 'PERSON' && keys.some((k) => mentions(t.content, k)));
    if (firstMention < 0) continue;
    const spoke = keys.filter((k) => theirs.some((t) => mentions(t.content, k)));
    const left = keys.filter((k) => !spoke.includes(k));
    if (!left.length) continue;
    /* Asked once already: an AI question after they first spoke that names any of the rest, with a reply after it. */
    const askedAndAnswered = turns.some((t, i) =>
      i > firstMention && t.role === 'AI' && /\?/.test(t.content) && left.some((k) => mentions(t.content, k))
      && turns.slice(i + 1).some((n) => n.role === 'PERSON'),
    );
    if (askedAndAnswered) continue;
    return {
      namedBy: set.namedBy,
      all: keys.map((k) => set.byKey.get(k)!),
      spokeAbout: spoke.map((k) => set.byKey.get(k)!),
      leftOut: left.map((k) => set.byKey.get(k)!),
    };
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------ */
/* A STORY WITHOUT DATES                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/*
 * Something that happened, said in the past tense. Kept to the things a timeline is made of - a loss,
 * a change, a number moving, a warning raised - so "I met the team" is not asked for a date.
 */
const SOMETHING_HAPPENED = new RegExp(
  [
    String.raw`\b(?:cancel(?:l)?ed|quit|resigned|missed|stopped|dropped|fell|rose|jumped|doubled|tripled|increased|decreased|churned|broke|failed|lost|complained|escalated|flagged|reported|warned|switched|delayed|postponed|walked away|pulled out|gave (?:us )?notice|went (?:up|down) from|went from)\b`,
    /* "left", but not "left out", "is left", "nothing left". */
    String.raw`(?<!\b(?:is|are|was|were|nothing|anything|what's|whats|what is|not much|none)\s)\bleft\b(?!\s+(?:out|over|to do|for us|with))`,
    String.raw`\bnever (?:took|returned|answered|replied|engaged|called|came|rebooked|responded|showed)\b`,
  ].join('|'),
  'i',
);

/* A sentence that is not telling what happened: a promise, a guess about the future, or "I don't know". */
/* A promise, a rule, a thing that did not happen, or something going on now is not a story with a when.
   "I have not escalated the approvals" (pulse, run 10) and "cannot be dropped" (handover) are not events. */
const NOT_A_STORY = /\b(?:will|won't|would|could|might|going to|i'?ll|we'?ll|i'd|we'd|want|wants|cannot|can't|must|should|need to|has to|have to|being|right now)\b|\b(?:have|has|had|did|do|does)\s+not\b|\b(?:haven't|hasn't|hadn't|didn't|don't|doesn't)\b|^\s*(?:i\s+(?:don'?t|do not)\s+know|i'?m not sure)\b|\?\s*$/i;

/** When: a month, a day, a date, a year, a quarter, or a time counted from now. */
/* Month names are read with their capital, so "you may" and "we march on" are not dates. */
const A_MONTH = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/;
const SAYS_WHEN = new RegExp(
  [
    String.raw`\b(?:jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b\.?\s*\d`,
    String.raw`\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|today|tonight|this morning|this afternoon)\b`,
    String.raw`\b(?:last|this|next|that|the same|the following|the previous)\s+(?:week|month|quarter|year|weekend|spring|summer|autumn|winter)\b`,
    String.raw`\b(?:ago|since)\b`,
    /* "in week two" (implementation, run 8), "in the last four weeks" (snapshot, run 8), "after that". */
    String.raw`\bweek (?:one|two|three|four|five|six|\d+)\b|\b(?:first|second|third|fourth|last) (?:week|month|day)\b`,
    String.raw`\b(?:in|over|for|during) the (?:last|past|first|next|previous) (?:\w+ )?(?:days?|weeks?|months?|quarters?|years?)\b`,
    String.raw`\b(?:after|before) that\b`,
    /* "The customer escalated at 08:47" (crisis, run 10). */
    String.raw`\b\d{1,2}:\d{2}\b`,
    String.raw`\b(?:19|20)\d{2}\b`,
    String.raw`\bq[1-4]\b|\bh[12]\b`,
    String.raw`\b\d{1,2}(?:st|nd|rd|th)\b|\b\d{1,2}[/-]\d{1,2}\b`,
    String.raw`\b(?:start|beginning|end|middle) of (?:the )?(?:week|month|quarter|year)\b`,
    String.raw`\b(?:days|weeks|months|years) (?:later|after|before|earlier)\b`,
  ].join('|'),
  'i',
);

export function saysWhen(text: string): boolean {
  return A_MONTH.test(text ?? '') || SAYS_WHEN.test(text ?? '');
}

/* An AI question about when something in the past happened. */
const ASKS_WHEN = /\b(?:when|what date|which date|what month|which month|which week|how long ago)\b[^?]*\?/i;

/* "And I escalated to Mr. Bello" is one sentence (sales, run 10). */
const sentencesOf = (text: string): string[] =>
  (text ?? '').replace(/\s+/g, ' ').split(/(?<!\b(?:Mr|Mrs|Ms|Dr|St))(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

/** Words a sentence is about, for telling whether a later question or answer is about the same thing. */
function aboutWords(text: string): Set<string> {
  const skip = /^(?:that|this|they|them|their|there|then|with|what|when|which|from|have|been|were|about|into|your|just|very|much|many|more|some|also|because|after|before|since|would|could|should|didn'?t|wasn'?t|never)$/;
  return new Set((text ?? '').toLowerCase().match(/[a-z']{4,}/g)?.filter((w) => !skip.test(w)) ?? []);
}

const shareAWord = (a: string, b: string): boolean => {
  const x = aboutWords(a);
  for (const w of aboutWords(b)) if (x.has(w)) return true;
  return false;
};

/**
 * What they told as having happened without saying when, from their latest three answers. A turn
 * that already puts a date on its story ("Sarah left in July. Her replacement never took a call.")
 * is dated as a whole, and so is a thing a date was put on anywhere else in the session. Once a
 * question after it has asked when, and they have answered, it goes.
 */
export function whatTheyToldWithoutWhen(turns: ATurn[]): string[] {
  const theirIndexes = turns.map((t, i) => (t.role === 'PERSON' ? i : -1)).filter((i) => i >= 0).slice(-3);
  const found: string[] = [];
  for (const i of theirIndexes) {
    const said = turns[i].content ?? '';
    if (saysWhen(said)) continue;
    for (const sentence of sentencesOf(said)) {
      if (!SOMETHING_HAPPENED.test(sentence) || NOT_A_STORY.test(sentence)) continue;
      const later = turns.slice(i + 1);
      const askedWhen = later.some((t, j) =>
        t.role === 'AI' && ASKS_WHEN.test(t.content) && (/\b(?:did|was|were|had|happen)/i.test(t.content) || shareAWord(t.content, sentence))
        && later.slice(j + 1).some((n) => n.role === 'PERSON'),
      );
      /* Dated anywhere else in this session, by them or by Groundwork: "Meridian gave notice." after the
         opener said "Meridian gave notice on Friday" (shock, run 10), or "After he escalated" after "The
         customer escalated at 08:47" (crisis, run 10). */
      const datedElsewhere = turns.some((t, k) => k !== i && saysWhen(t.content) && shareAWord(t.content, sentence));
      if (askedWhen || datedElsewhere) continue;
      found.push(sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}...` : sentence);
    }
  }
  return [...new Set(found)].slice(0, 3);
}

/* ------------------------------------------------------------------------------------------------ */
/* THE BLOCK                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

const inWords = (n: number): string => ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);

/** "A", "A and B", "A, B and C". */
export function andList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * What the next turn reads, or nothing. `who` is the person answering, by first name where there is one.
 */
export function askForWhatTheyLeftOut(set: PartOfASet | null, withoutWhen: string[], who: string | null): string {
  if (!set && !withoutWhen.length) return '';
  const name = (who ?? '').trim() || 'They';
  const lines: string[] = [
    'WHAT THEY HAVE NOT SAID YET. Context for your next question, not a script: the question is yours to write, in plain words, one question.',
  ];
  if (set) {
    const others = set.leftOut.length === 1 ? set.leftOut[0] : `the other ${inWords(set.leftOut.length)}, ${andList(set.leftOut)}`;
    lines.push(
      `- ${set.namedBy} ${inWords(set.all.length)}: ${andList(set.all)}. ${name} has spoken about ${andList(set.spokeAbout)} only. Ask directly about ${others}, by name: which of them they can do, and if they cannot, that they say so. People often leave out what they cannot do, and a direct question is how it comes out.`,
    );
  }
  if (withoutWhen.length) {
    lines.push(
      `- ${name} described ${withoutWhen.length === 1 ? 'something that happened' : 'things that happened'} without saying when: ${withoutWhen.map((s) => `"${s}"`).join(' ')} Ask when${withoutWhen.length === 1 ? ' that happened' : ', about the first of these now and the rest after'}, as a month or a date. The order things happened in is what the check-in is building.`,
    );
  }
  lines.push('Ask this before the next question in the plan. Ask it once: when they have answered, take the answer as it is, even if it is "I can\'t" or "I don\'t know", and do not ask for it again.');
  return lines.join('\n');
}
