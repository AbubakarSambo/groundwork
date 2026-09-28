/**
 * WHAT A PARTICIPANT IS TOLD ABOUT THIS CHECK-IN: THE SITUATION AND THE GOALS, NEVER THE INSTRUCTION.
 *
 * Hafsah, 20 September 2026, looking at a participant's page: "the about-the-check-in is way too
 * long and pulling direct words." Under "About this check-in" the person read the lead's whole
 * brief, verbatim - including "Do not begin by asking them to define their goals", "Follow up on
 * their answers; probe what is unclear", "Pay attention to the difference between what they say they
 * want and what their behaviour suggests". Those sentences are the lead telling the product how to
 * interview this person. The person was reading them before their first answer.
 *
 * The block exists for a fair reason: nobody should be read against a target they were never shown.
 * That reason covers the SITUATION and the GOALS. It does not cover the interviewing instructions,
 * and the lead's own words about the person are the lead's, not a shared fact.
 *
 * So a participant gets: the sentences of the brief that describe the situation (declaratives), the
 * goals that apply to them, and nothing that tells anybody what to do. Decided in code: an
 * imperative is an imperative whatever it is about. The lead still sees their full brief on Setup
 * and Context.
 */

/* A sentence that tells somebody what to do. The verb comes first, or right after "please" / "then". */
const AN_INSTRUCTION =
  /^(?:please\s+|then\s+|also\s+|and\s+)?(?:do not|don't|never|always|help|ask|probe|follow|explore|pay|treat|find|discover|understand|make|get|use|check|look|surface|notice|interrogate|connect|record|note|capture|keep|start|begin|end|avoid|ensure|focus|push|press|challenge|compare|hold|tell|say|give|show|read|watch|listen|see|think|remember|try|consider|identify|establish|determine|confirm|clarify|track|by the end)\b/i;

/* "They should", "the person must", "you should" - an expectation of the reader written as a rule. */
const A_RULE_ABOUT_THEM = /\b(they|the person|you|participants?|people)\s+(should|must|need to|ought to|have to)\b/i;

/* THE LEAD TALKING TO THE PRODUCT IN THE FIRST PERSON. "I want to know what he is actually working on",
   "this time we need something the board can act on", "last year's workshop gave us a word cloud": not
   imperatives, but the lead's aims for the check-in, and the judge read them on 38 participants' screens
   in run 6 (21 Sep 2026) and scored the box 1.4 of 5. A sentence that starts with I or we wanting,
   needing, looking for, hoping or expecting is the lead's, and so is one about what happened last time
   they asked. "Tunde has just joined us" stays: it is about the situation, whoever is speaking. */
const THE_LEAD_TO_THE_PRODUCT =
  /^(?:this time |so |and |but )?(?:i|we)(?:'d|'m|'re| am| are| would| will)? (?:want|need|would like|am looking|are looking|hope|expect|intend|aim|plan|mean|have to|must|should)\b|\b(?:i|we) want to (?:know|see|understand|find out|hear)\b|\blast (?:year|time|quarter|month)'?s? (?:workshop|session|survey|round|meeting|attempt)\b/i;

/* A sentence addressed to the product about the person: "help the person", "the goal should emerge". */
const ABOUT_THE_INTERVIEW = /\b(the (?:goal|answer) should emerge|what they say (?:they want|as the answer)|their behaviour suggests|treat what they say|the interview|this conversation should|in the check-in|during the check-in)\b/i;

const sentencesOf = (text: string): string[] => (text ?? '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);

/** The situation as the brief describes it: declarative sentences only, at most three. */
export function theSituationIn(brief: string | null | undefined, max = 3): string | null {
  const kept = sentencesOf(brief ?? '').filter((s) => !AN_INSTRUCTION.test(s) && !A_RULE_ABOUT_THEM.test(s) && !ABOUT_THE_INTERVIEW.test(s) && !THE_LEAD_TO_THE_PRODUCT.test(s));
  if (!kept.length) return null;
  return kept.slice(0, max).join(' ');
}

export interface AGoalTheyMaySee {
  name: string;
  target: number | null;
  /** Whose goal it is; null for the whole check-in's. */
  ownerParticipantId?: string | null;
}

/*
 * THE PRODUCT WRITES WHAT A PARTICIPANT IS TOLD, ONCE, FROM THE BRIEF.
 *
 * Run 7, 21 Sep 2026: participants read the declarative sentences of the lead's brief, and the judge
 * scored the box 1.2 to 2.0 for the same reason Hafsah had given the day before: "a brief but not
 * verbatim, just key like goals". The situation in the lead's sentences is still the lead's sentence
 * to the product ("Five clients in Kano and Kaduna who took asset loans from us this year - a tractor,
 * a cold store, a delivery motorbike..."), listing the other people's loans to each of them.
 *
 * So the model rewrites the brief for the people taking part, once, when the brief is written, and the
 * product keeps the result on the ground. The rewrite is checked here before it is kept: the same
 * filters that guard the raw brief, plus nothing addressed to the product and nothing that names
 * another person on the check-in. What fails the check is dropped sentence by sentence; a rewrite
 * that leaves nothing falls back to the filtered brief.
 */
export const THE_TELLING_PROMPT = [
  'Write the "About this check-in" box: two or three sentences for a person taking part, read before their first answer.',
  'You are given what the person who set the check-in up wrote. It is addressed to the product, in their voice, and may include instructions on how to interview people. None of that is for the participant.',
  'Write, addressed to the participant as "you":',
  '  1. One sentence on the situation this check-in sits in, in plain words, without naming or listing other people or their affairs.',
  '  2. One sentence on what the check-in is for, as its purpose, not as the lead\'s wish ("This check-in is for seeing how the loan is working for your business, not only whether you are paying" - never "the lead wants to know").',
  /*
   * WHAT THE PERSON ANSWERING ACTUALLY GETS OUT OF IT.
   *
   * Hafsah, 23 September 2026: "why are you saying build a record?" A record is what the product
   * keeps. It is not a reason for a busy person to spend five minutes answering, and on a link sent
   * across a network of strangers it is closer to a warning than an offer. What they get is the
   * consolidated picture back.
   */
  '  3. Optionally one sentence on what taking part involves and what comes back: answering in your own words, and a consolidated report at the end that everybody who took part receives.',
  'The first sentence must name what this check-in is about, in the words of the situation itself: the work, the place, the product, the decision.',
  'A sentence like "This check-in is for understanding your current business situation" names nothing. It fits any check-in ever set up. Somebody reading it before their first answer still does not know why they were asked.',
  /*
   * AND NOT A WORD ON WHAT HAPPENS TO THE ANSWERS.
   *
   * Half of one sixty-word telling went on "Your answers will be used to create a consolidated
   * report that everyone who took part will receive" - which the page says, in its own words, two
   * inches below. Words spent there are words not spent naming what this is about, which is the
   * only thing this box is for.
   */
  'Name the lead\'s own subjects, in their words: the places, the products, the people, the risks they actually listed. A long brief needs at least three of them; a telling that names none of them is refused.',
  'Say nothing about what happens to the answers - not the report, not who receives it, not that it is consolidated. The page already says that.',
  'Rules: no instructions to anybody. No "I" or "we". No numbers or targets (they are shown separately). No names of other participants. Nothing about how the interview will be run. Everyday words, at most 60 words in total. Answer with the sentences only.',
].join('\n');

const ADDRESSED_TO_THE_PRODUCT = /\b(the product|groundwork|the model|the interviewer|the assistant|the lead wants|the lead would like|the lead needs|the manager wants)\b/i;

/*
 * A TELLING THAT WOULD FIT ANY CHECK-IN EVER SET UP IS NOT ABOUT THIS ONE.
 *
 * Read live on an open link, 22 September 2026. The brief named the states, the farmers, traders and
 * distributors, the products and the seasons. The box above the first question said: "This check-in
 * is for understanding your current business situation. Your responses will help build a picture of
 * your needs over time." Every sentence passed every filter here - no instruction, no first person,
 * no name, no number - and said nothing. The rewrite had dropped the subject.
 *
 * So the rewrite has to share at least one distinctive word with what the lead actually wrote. The
 * words this product says about every check-in do not count towards that: a telling that matches the
 * brief only on "business" or "update" is the same filler. Nothing shared means the rewrite is not
 * kept, and the read falls back to the lead's own sentences, which are at least about the subject.
 */
const A_WORD_ANY_CHECK_IN_COULD_HOLD = new Set([
  'about', 'check', 'business', 'situation', 'picture', 'needs', 'update', 'team', 'work', 'working',
  'session', 'response', 'answer', 'question', 'progress', 'goal', 'target', 'people', 'person',
  'thing', 'where', 'their', 'these', 'those', 'which', 'would', 'could', 'should', 'other',
  'something', 'anything', 'everything', 'taking', 'share', 'shared', 'sharing', 'word', 'record',
  'report', 'month', 'week', 'over', 'next', 'first', 'last', 'ground', 'current', 'help', 'build',
  'better', 'understand', 'understanding', 'happening', 'moment', 'today', 'right', 'along', 'given',
  'needs', 'wants', 'knows', 'tracking', 'others', 'yours', 'their', 'refer', 'short', 'regular',
  /* How often is not what about: a telling that matches the brief only on "weekly" names nothing. */
  'weekly', 'monthly', 'daily', 'fortnightly', 'quarterly', 'support', 'progressing', 'review', 'period',
]);

/*
 * A word long enough to carry a subject, singular-stemmed so "markets" and "market" are one word.
 *
 * FIVE LETTERS, NOT FOUR. Read live on a sales and delivery check-in: "It is for tracking what is
 * working, what is not, and what you need from others" was kept, because the brief also contains
 * "need". A four-letter word this common is not the subject of anything.
 */
const theWordsThatNameSomething = (text: string): Set<string> => {
  const out = new Set<string>();
  for (const raw of (text ?? '').toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []) {
    const w = raw.length > 5 && raw.endsWith('s') && !raw.endsWith('ss') ? raw.slice(0, -1) : raw;
    if (w.length < 5 || A_WORD_ANY_CHECK_IN_COULD_HOLD.has(w)) continue;
    out.add(w);
  }
  return out;
};

/*
 * AND A ONE-OFF READ IS NOT DESCRIBED AS A HABIT.
 *
 * Read live, 22 September 2026, on a check-in with exactly one round: "It involves short, regular
 * questions in your own words that build a record you can read at any time." Nothing is regular
 * about it - the person is asked once, and the sentence quietly promises them a subscription.
 */
const A_PROMISE_OF_MORE =
  /\b(regular|regularly|each week|each month|weekly|monthly|fortnightly|ongoing|over time|every week|every month|future sessions?|next session|from time to time|as the weeks)\b/i;

/** Whether the rewrite says anything the lead's own words say. True when there is nothing to check against. */
/**
 * ONE WORD IS ENOUGH FOR A SHORT BRIEF AND NOWHERE NEAR ENOUGH FOR A LONG ONE.
 *
 * Read live on 23 September 2026. Hafsah's brief was four hundred words naming states, markets,
 * products, volumes, quality, farmers, traders, agents, distributors, fraud, theft, weather and
 * inertia. The box above the first question said: "It is for understanding how to help you grow
 * faster with less risk. Your answers will be used to create a consolidated report that everyone
 * who took part will receive." Her words: "The summary is also a bit off, this was a new question."
 *
 * It passed this check, because it shared the word "risk" - and one shared word out of a brief that
 * distinctive is a coincidence, not a subject. So what counts as naming something scales with how
 * much the lead actually named: a sentence of a brief needs one word, a page of it needs three.
 *
 * NOT MORE THAN THREE, and not a proportion. The telling is sixty words and its job is to say what
 * this is about, not to summarise a page. Three of the lead's own subjects is the difference between
 * "how to help you grow faster" and "where you want to expand, and the traders and distributors you
 * need to get there" - and past three the requirement would start refusing good tellings.
 */
export function howManyOfTheirWordsItNeeds(about: string | null | undefined): number {
  const theirs = theWordsThatNameSomething(about ?? '');
  /* Thirty is the boundary, measured: her brief carries thirty-nine distinctive words, and a brief
     that names thirty separate things is one where a single shared word proves nothing. */
  if (theirs.size >= 30) return 3;
  if (theirs.size >= 12) return 2;
  return 1;
}

export function itNamesWhatThisIsAbout(told: string | null | undefined, about: string | null | undefined): boolean {
  const theirs = theWordsThatNameSomething(about ?? '');
  if (!theirs.size) return true;
  let shared = 0;
  for (const w of theWordsThatNameSomething(told ?? '')) if (theirs.has(w)) shared += 1;
  return shared >= howManyOfTheirWordsItNeeds(about);
}

/** The model's rewrite, checked sentence by sentence; null when nothing survives. */
export function theTellingHolds(rewrite: string | null | undefined, opts?: { otherNames?: string[]; max?: number; about?: string | null; rounds?: number | null }): string | null {
  const names = (opts?.otherNames ?? []).map((n) => n.trim()).filter((n) => n.length >= 3);
  const namesAName = (t: string) => names.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t));
  /* The heading is already on the page; the model repeats it ("About this check-in: This check-in is for..."). */
  const kept = sentencesOf((rewrite ?? '').replace(/^["'\s]+|["'\s]+$/g, '').replace(/^about this check-in:?\s*/i, ''))
    .filter((t) => !AN_INSTRUCTION.test(t) && !A_RULE_ABOUT_THEM.test(t) && !ABOUT_THE_INTERVIEW.test(t) && !THE_LEAD_TO_THE_PRODUCT.test(t))
    .filter((t) => !ADDRESSED_TO_THE_PRODUCT.test(t) && !/\b(i|we|my|our|us)\b/i.test(t) && !namesAName(t))
    /* Numbers are shown separately, as the goals; a figure in the telling is a claim nobody checked. */
    .filter((t) => !/\d/.test(t))
    /* One round is one conversation, and the telling does not promise a second - see A_PROMISE_OF_MORE. */
    .filter((t) => !(opts?.rounds != null && opts.rounds <= 1 && A_PROMISE_OF_MORE.test(t)));
  if (!kept.length) return null;
  const told = kept.slice(0, opts?.max ?? 3).join(' ');
  /* Checked against the subject as a whole, not sentence by sentence: only one sentence has to name it. */
  if (opts?.about !== undefined && !itNamesWhatThisIsAbout(told, opts.about)) return null;
  return told;
}

/**
 * The whole block for a participant: what they are told (the product's rewrite where there is one,
 * else the situation in the brief), then the goals they may see: theirs first, then the check-in's.
 * `goals` is already filtered by whose-number-is-whose-business; this only says them.
 */
export function whatAParticipantIsToldAboutThis(
  brief: string | null | undefined,
  goals: AGoalTheyMaySee[],
  opts?: { told?: string | null; readerParticipantId?: string | null },
): string | null {
  const parts: string[] = [];
  const told = (opts?.told ?? '').trim();
  const situation = told || theSituationIn(brief);
  if (situation) parts.push(situation);
  const say = (g: AGoalTheyMaySee) => (g.target != null ? `${g.name.trim().replace(/[.]+$/, '')} (${g.target.toLocaleString('en-GB')})` : g.name.trim().replace(/[.]+$/, ''));
  const named = (goals ?? []).filter((g) => g?.name?.trim());
  const mine = opts?.readerParticipantId ? named.filter((g) => g.ownerParticipantId === opts.readerParticipantId) : [];
  const shared = named.filter((g) => !mine.includes(g));
  if (mine.length) parts.push(`${mine.length === 1 ? 'Your goal' : 'Your goals'}: ${mine.slice(0, 4).map(say).join('; ')}.`);
  if (shared.length) {
    parts.push(`${shared.length === 1 ? (mine.length ? 'The goal for the whole check-in' : 'The goal on this check-in') : (mine.length ? 'The goals for the whole check-in' : 'The goals on this check-in')}: ${shared.slice(0, 4).map(say).join('; ')}.`);
  }
  return parts.length ? parts.join(' ') : null;
}
