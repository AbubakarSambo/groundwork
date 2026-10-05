/**
 * ONE MODEL CALL TURNS THE FACTS INTO SENTENCES A PERSON CAN READ.
 *
 * What this replaces: `thePictureTheProductWrites`, which joined slot names to raw answers. Across
 * the twenty-four-scenario run of 25 September 2026 that produced 734 lines of the shape
 * "Femi Okonkwo said this was for: I'll know when they tell me they have the statements ready",
 * and, at the top of every one of them, a fixed sentence that said the accounts did not contradict
 * each other immediately before listing the contradictions.
 *
 * THE FACTS DO NOT CHANGE. The same rows go in - see the-facts-about-a-person, whose extraction is
 * untouched. What changes is that something that can read writes the prose, so an answer filed under
 * "what this was for" that is plainly an answer to a different question is written as what it
 * actually says.
 *
 * ONE CALL FOR THE WHOLE PICTURE, not one per person. The opening has to describe what is true
 * across everybody ("All four people have checked in. They disagree on two things"), which cannot
 * be written by anybody who has only seen one person - and four calls would let four paragraphs
 * disagree about how many people answered.
 *
 * IT MAY NEVER FAIL THE REPORT. A report that will not load because a wording call timed out is
 * strictly worse than one that reads plainly but flatly. So there is a deterministic fallback, and
 * the one thing that fallback is not allowed to do is glue slot names - see `plainlyWithoutAModel`.
 */
import type { PersonFacts } from './the-facts-about-a-person';
import { PLAIN_WORDS_WITH_EXAMPLES, WRITTEN_ONCE_FOR_SEVERAL_READERS, EVERY_VERB_KEEPS_ITS_SUBJECT } from '../conversation/plain-words';

export interface ThePicture {
  /** What is true across everybody, in one or two sentences. Never a fixed sentence. */
  opening: string;
  /** One paragraph per person, in the same order they were given. */
  perPerson: { participantId: string; text: string; headline: string | null }[];
}

/**
 * WHAT THE MODEL IS ASKED FOR.
 *
 * `differences` is passed as a count and as the topics, because the opening has to be able to say
 * "They disagree on two things: where the work is stuck, and how many applications are open" -
 * which needs the topics, and which the old fixed sentence could not say at any price.
 */
export function thePictureInstruction(a: {
  peopleAnswered: number;
  peopleExpected: number;
  differenceTopics: string[];
  aboutOnePerson: boolean;
}): string {
  const single = a.aboutOnePerson
    ? `

THIS CHECK-IN IS ABOUT ONE PERSON. Write the opening and every paragraph as facts about what has
happened and what each person has said. Do not write anybody's reading of the person this is about,
do not say what should be decided, and do not repeat a number as though it were settled when the
facts say it was never written down. The person this is about will read this.`
    : '';

  return `${PLAIN_WORDS_WITH_EXAMPLES}

${WRITTEN_ONCE_FOR_SEVERAL_READERS}

${EVERY_VERB_KEEPS_ITS_SUBJECT}

WHAT YOU ARE WRITING

You are given the facts this product holds about each person on a check-in. Every one of them is
either a quotation from what that person said or arithmetic over the record. Nothing has been
interpreted yet.

Write two things.

THE OPENING. Two or three sentences saying what is actually true across everybody. How many have
checked in, what they agree on, and what they disagree about if they disagree.

AND THE FACT THAT EXPLAINS THE DISAGREEMENT MUST BE IN IT. Where the facts below show TWO NUMBERS
FOR ONE THING, or A NUMBER SET FOR SOMEBODY THEY HAVE NEVER MENTIONED, that is almost always the
reason people disagree, and leaving it out produces an opening that does not make sense. A picture
saying the target was five, that they have done six, and that somebody says they are behind, is a
picture with the explanation cut out of it. Say the other number, and say plainly that it was never
written down or given to them. Open with this sentence, exactly as it is: "${howManyAnsweredInWords(a.peopleAnswered, a.peopleExpected)}"
${a.differenceTopics.length
    ? `People disagree on ${a.differenceTopics.length}: ${a.differenceTopics.join('; ')}.`
    : 'Nothing in the record yet shows one account disagreeing with another, so say that plainly.'}

Never write a sentence claiming the accounts do not contradict each other. Say what the accounts
actually do.

ONE PARAGRAPH PER PERSON. Two or three sentences. What they have done, with their own numbers. What
they are waiting on. Where the record shows two numbers for one thing, or a number set for them they
have never mentioned, say so as a plain fact about what was and was not said - never as a criticism
of them.

AND WHO ASKED THEM FOR IT, WHERE THEY SAID. If somebody's account gives a reason they are doing
this work rather than something else - a person who asked them, a request, an instruction, a
conversation - that reason goes in their paragraph, named. It is usually the single most useful
fact in the whole account, and it is the one most easily lost, because it sits next to the work
rather than in it.

A live example, and the paragraph that dropped it. Three engineers were each working on something
different from the priority their lead had set, and two of them said in their own words that the
company's chief executive had asked them to, on a named date. The paragraph came out as "their goal
is for the referral scheme to be live, and they began work on it on 2 September" - the work, the
date, and not a word about who asked. Everything downstream then reads as three people ignoring
their lead, when the record says they were following somebody else. Keep the work AND keep who
asked for it.

AND KEEP HOW THEY SAY THE WORK REALLY RUNS. Where a person's facts include a line saying how the
work really runs, keep it in their paragraph with its names, dates and figures. It is often the
whole finding.

AND KEEP BOTH FIGURES. Where a person gave two different figures for the same work, keep both in
their paragraph, because the difference is often the finding.

Use the label you are given for each person, exactly. The product turns it into a name, or into
"you" for whoever is reading, when the report is served.

WHAT SOMEBODY REPORTS ABOUT A CUSTOMER STAYS THE CUSTOMER'S (run 32, the discovery report). Martin
told the check-in what a prospect had said, and his paragraph came back "You are a solutions
engineer, and you want to expand your use of data analytics... You are worried that you will not be
able to hire enough analysts." That is the prospect's job, the prospect's wish and the prospect's
worry, all put in Martin's mouth as his own. Where somebody is relaying what a customer, a
supplier, a partner or anybody outside this check-in said, write it as what they reported: "Martin
says the customer cannot hire enough analysts", never "Martin cannot hire enough analysts". If you
cannot tell whose it is, it is theirs to report and not theirs to own.

AND A HEADLINE PER PERSON, only where the record shows something the lead should look at. One plain
sentence, not a label. Null where there is nothing.

USE THE NOUNS THE PEOPLE USED. Their own words for the thing are in the quotations below. If they
said "renewals", write "renewals" - not "the performance target", not "the initial success metric",
not "the delivery objective". A noun nobody in the room used is jargon even when it is accurate.${single}`;
}

export const THE_PICTURE_SCHEMA = {
  name: 'write_the_picture',
  description: 'The opening, and one plain paragraph per person, from the facts given.',
  input_schema: {
    type: 'object',
    properties: {
      opening: {
        type: 'string',
        description: 'One or two plain, full sentences saying what is true across everybody. Never a fixed sentence, never a claim that accounts do not contradict each other.',
      },
      perPerson: {
        type: 'array',
        description: 'One entry per person given, in the same order.',
        items: {
          type: 'object',
          properties: {
            participantId: { type: 'string', description: 'Exactly the id given for this person.' },
            text: { type: 'string', description: 'Two or three plain, full sentences about what this person has done and is waiting on. Uses their name.' },
            headline: { type: ['string', 'null'], description: 'One plain full sentence where the record shows something the lead should look at. Null otherwise. Never a label.' },
          },
          required: ['participantId', 'text'],
        },
      },
    },
    required: ['opening', 'perPerson'],
  },
} as const;

/** The facts for one person, as the model sees them. Plain lines, no slot names, no prose. */
export function factsAsLines(f: PersonFacts, nameFor: (label: string) => string): string {
  const who = nameFor(f.label);
  const lines: string[] = [`PERSON id=${f.participantId} name=${who}${f.isLead ? ' (runs this check-in)' : ''}`];
  if (f.whatTheySaidItWasFor) lines.push(`  they said this was for, in their words: "${f.whatTheySaidItWasFor}"`);
  if (f.whereTheySayTheyAre) lines.push(`  the latest thing they reported, in their words: "${f.whereTheySayTheyAre}"`);
  /* The figure they gave before, where it differs. Kwame's 22 handled and three approved. */
  if (f.anEarlierFigureTheyGave) lines.push(`  earlier they reported, in their words: "${f.anEarlierFigureTheyGave}"`);
  if (f.whatTheySayIsInTheWay) lines.push(`  what they named as being in the way, in their words: "${f.whatTheySayIsInTheWay}"`);
  /* Why they are on this work rather than something else. See whyTheySayTheyAreOnIt: an INTENT
     line, read by nothing until 26 September, and on the realign scenario it is the whole answer. */
  if (f.whyTheySayTheyAreOnIt) lines.push(`  why they say they are on this work, in their words: "${f.whyTheySayTheyAreOnIt}"`);
  /* How they say the work really runs, where that differs from how it is supposed to. See
     howTheySayTheWorkReallyRuns: OPERATING_DIFFERENCE lines, read by nothing until 26 September. */
  for (const r of f.howTheySayTheWorkReallyRuns ?? []) lines.push(`  how they say the work really runs, in their words: "${r}"`);
  for (const n of f.numbers) {
    lines.push(`  a number: ${n.what} - target ${n.target}${n.soFar != null ? `, record has ${n.soFar}` : ''}, set by ${n.setBy}`);
  }
  if (f.twoNumbersForOneTarget) {
    lines.push(`  TWO NUMBERS FOR ONE THING: ${f.twoNumbersForOneTarget.what} - the lead says ${f.twoNumbersForOneTarget.theLeads}, they say ${f.twoNumbersForOneTarget.theirs}`);
  }
  if (f.aNumberSetForThemTheyHaveNeverSaid) {
    lines.push(`  A NUMBER SET FOR THEM THEY HAVE NEVER MENTIONED: ${f.aNumberSetForThemTheyHaveNeverSaid.what} - ${f.aNumberSetForThemTheyHaveNeverSaid.target}. They have not said this figure once.`);
  }
  for (const d of f.whatDoesNotAddUp) lines.push(`  the record does not add up: ${d}`);
  return lines.join('\n');
}

/**
 * WHEN THE PICTURE CANNOT BE WRITTEN, SAY SO IN ONE SENTENCE AND STOP.
 *
 * The first version of this tried to keep writing: a flat sentence per person, built from the same
 * facts, with connectors instead of slot names. Hafsah asked to see it, which is how it was caught.
 * Forced live on the sales ground, it produced:
 *
 *   "the initiator reported this: We have a total of 25 facilities in the pipeline right now."
 *   "Relationship officer, Lagos mainland. Target 12 approved facilities this quarter. reported
 *    this: I have visited many businesses, 46 in total."
 *
 * That is the same defect wearing a different connector. "reported this:" is a slot name; the label
 * is a job description with full stops inside it, printed twice a sentence; and the whole thing
 * starts in lower case. A fallback that reproduces four of the twelve problems is not a fallback,
 * it is the bug with a fresh coat on.
 *
 * SO IT SAYS THE TRUE THING AND STOPS. Her words: "If the fallback can only say little, a short
 * honest sentence is better." Nothing is lost by this - the model's own synthesis still follows
 * underneath, every person's own words are still on their own record, and the hourly sweep
 * re-synthesises a report that is behind, so this is what the lead reads for an hour at worst.
 *
 * The count is still exact, because the count is arithmetic and was never the part that failed.
 */
export function whenThePictureCannotBeWritten(peopleAnswered: number, peopleExpected: number): ThePicture {
  const count = howManyAnsweredInWords(peopleAnswered, peopleExpected);
  return {
    opening: `${count} The full picture could not be written just now, and will appear here shortly.`,
    perPerson: [],
  };
}

/**
 * AND THE COUNT THE OPENING STARTS WITH IS THE PRODUCT'S, WHATEVER THE MODEL WROTE.
 *
 * The prompt gives the sentence to open with. A model may still write its own - "All two people have
 * answered." reached a participant's report on seniorhire, run 10 - so a first sentence that is a
 * count of who has answered or checked in is replaced with the product's count, which is arithmetic
 * and always reads right: "One person has answered.", "Both people have answered.", "All three people
 * have answered.", "Two of the five people have answered so far." An opening that does not start
 * with a count is left exactly as it is.
 */
/* Only a sentence that is nothing but the count: "Both people have checked in, and they agree on the
   target" says more than the count and is left alone. */
const A_COUNT_SENTENCE = /^\s*(?:all|both|nobody|no one|one|two|three|four|five|six|seven|eight|nine|ten|\d+)(?: (?:of (?:the |all )?)?(?:\w+ )?(?:people|person|of them|parties))? (?:have|has)(?: (?:now|all|both|already))? (?:answered|checked in|given (?:an |their )?accounts?|responded)(?: (?:so far|yet|now|this (?:check-in|round|session)))?(?:,? of (?:the )?\w+)?[.!?](?:\s+|$)/i;
export function theCountSaidRight(opening: string, answered: number, expected: number): string {
  if (!opening) return opening;
  /* Whatever else the model wrote around a count, it is in one form of number (request 90). */
  if (!A_COUNT_SENTENCE.test(opening)) return inOneFormOfNumber(opening);
  return inOneFormOfNumber(opening.replace(A_COUNT_SENTENCE, (m) => `${howManyAnsweredInWords(answered, expected)}${(m.match(/\s*$/) ?? [''])[0]}`));
}

/**
 * A SUMMARY ON A LIST OR A BOARD HEADER DOES NOT CARRY A COUNT OF WHO HAS ANSWERED (request 97b).
 *
 * The opening is written once, when the round's report is taken, and says "All three people have
 * answered." Six people were in the check-in by the time Today read it, and four had answered, so
 * Today said "The report for Sales team, Q3 is ready. All three people have answered." The count is
 * stored in the sentence and goes stale the moment somebody is added. The live count is served beside
 * it (glance.progress), so a summary served on a list or a board does not repeat a stored one: a first
 * sentence that is only a count is left out, and what follows it is read first.
 */
export function withoutAStoredCount(text: string): string {
  if (!text) return text;
  const rest = text.replace(A_COUNT_SENTENCE, '').trim();
  return rest;
}

/**
 * HOW MANY PEOPLE, IN WORDS, AND NEVER "1 people".
 *
 * Forty-two lines across seven scenarios read "1 people answered this check-in" or "1 of 1 people
 * have given an account". Both halves are wrong: the plural, and counting a total that is true by
 * construction.
 */
const INWORDS = ['nobody', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export function howManyAnsweredInWords(answered: number, expected: number): string {
  const n = INWORDS[answered] ?? String(answered);
  if (answered === 0) return 'Nobody has answered yet.';
  if (expected > 0 && answered >= expected) {
    /* "All two people have answered" was the model's, three times on seniorhire (run 10), from the
       example "All four people have checked in". Two is "both", in English, always. */
    if (answered === 1) return 'One person has answered.';
    if (answered === 2) return 'Both people have answered.';
    return `All ${INWORDS[answered]?.toLowerCase() ?? answered} people have answered.`;
  }
  /*
   * ALL IN WORDS OR ALL IN FIGURES, NEVER BOTH IN ONE SENTENCE. "Four of the 6 people" was read on a
   * live board (screens request 69, 28 September 2026). Up to ten, both are words; past that, both
   * are figures, because "Twelve of the forty-one" is harder to read than "12 of the 41".
   */
  const inWords = answered <= 10 && expected <= 10;
  const first = inWords ? n : String(answered);
  const total = inWords ? (INWORDS[expected] ?? String(expected)).toLowerCase() : String(expected);
  return answered === 1
    ? `${inWords ? 'One' : '1'} of the ${total} people has answered so far.`
    : `${first} of the ${total} people have answered so far.`;
}

/**
 * ONE FORM OF NUMBER IN ONE COUNT (screens request 90).
 *
 * "Four of the 6 people have answered so far." was read at the top of a lead's board, with "4 of 6
 * people have answered this round." under it. The opening's count is the product's own
 * (`theCountSaidRight`), but the sentence a model wrote around it, or a report stored before that
 * rule, can still mix a word and a figure. Every "<number> of <the> <number>" is put into one form,
 * wherever it is read: both in words where both are ten or under, both in figures past that, the
 * same rule `howManyAnsweredInWords` follows.
 */
const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const A_COUNT_OF_A_COUNT = new RegExp(`\\b(${COUNT_WORDS.slice(1).join('|')}|\\d+)( of (?:the |all )?)(${COUNT_WORDS.slice(1).join('|')}|\\d+)\\b`, 'gi');
export function inOneFormOfNumber(text: string): string {
  if (!text) return text;
  return text.replace(A_COUNT_OF_A_COUNT, (m: string, a: string, of: string, b: string, offset: number, whole: string) => {
    const aIsFigure = /^\d+$/.test(a);
    if (aIsFigure === /^\d+$/.test(b)) return m;
    const na = aIsFigure ? Number(a) : COUNT_WORDS.indexOf(a.toLowerCase());
    const nb = /^\d+$/.test(b) ? Number(b) : COUNT_WORDS.indexOf(b.toLowerCase());
    const inWords = na >= 1 && na <= 10 && nb >= 1 && nb <= 10;
    const startsASentence = !whole.slice(0, offset).trim() || /[.!?]["')\]]?\s+$/.test(whole.slice(0, offset));
    let first = inWords ? COUNT_WORDS[na] : String(na);
    if (inWords && startsASentence) first = `${first[0].toUpperCase()}${first.slice(1)}`;
    return `${first}${of}${inWords ? COUNT_WORDS[nb] : String(nb)}`;
  });
}

/**
 * A STORY THAT OPENS WITH "They" HAS NOBODY FOR "They" TO POINT TO (screens request 88).
 *
 * The participant's story opened "They disagree on ..." because the count sentence that came before
 * it is not the participant's to read, so the sentence that was second became first. Where the story
 * starts with "They" and a verb about people together, it says "People" instead. Anywhere after the
 * first sentence "They" has its people to point to and is left as it is.
 */
import { theThingsTheyDisagreeOnAreSentences } from './the-things-people-disagree-on-are-sentences';

export function theStoryHasSomeoneToPointTo(text: string): string {
  if (!text) return text;
  /*
   * AND NO COLON AFTER HOW MANY THINGS THEY DISAGREE ON (requests 107 b and 109 f). The board's headline
   * read "They disagree on one thing: there is no shared understanding ...": two pieces joined with a
   * colon. What they disagree on is said as a sentence of its own, as written.
   */
  const noColon = theThingsTheyDisagreeOnAreSentences(text);
  return noColon.replace(/^(\s*)They (disagree|differ|agree|both|all|each)\b/, (_m, lead: string, verb: string) => `${lead}People ${verb}`);
}
