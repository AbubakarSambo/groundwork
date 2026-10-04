import { RecordEntryType } from '@prisma/client';
import { aDefinitionOfSuccessHolds } from '../grounds/a-dump-is-many-things';

/**
 * THE ONE THING THE PLATFORM ASKS FOR AND THEN NEVER SHOWS YOU AGAINST.
 *
 * Her words: "The one thing the platform asks you for is how you define success but does not tell
 * you on any report or board where you are on that success chart or where your team indicates you
 * are."
 *
 * She is right, and the parts were all already in the database, never introduced to each other:
 *
 *   - `GroundBaseline.successLooksLike` and `conditions` - what the lead says success is, stated on
 *     Setup, versioned, with a reason when it changes.
 *   - `RecordEntryType.SUCCESS_DEFINITION` - what EACH PERSON says success is, taken from their own
 *     check-in, in their own words.
 *   - Commitments, tensions and worries, per person, per session.
 *
 * The lead's statement was read back only on the page where it was typed. Everybody else's was
 * extracted and stored and read by nothing at all. So the product asked two sides the same question
 * and never once put the answers on the same page.
 *
 * WHAT THIS REFUSES TO DO, AND WHY THE REFUSALS ARE THE DESIGN.
 *
 * No score. No percentage complete. No red/amber/green per person. Each of those turns a shared
 * picture into a verdict, and a verdict is the thing this product exists not to issue - the whole
 * argument is that a report shows where accounts agree and differ and lets people decide.
 *
 * No "met". Whether a condition has actually been satisfied is a judgement about the world, and
 * nothing in the record can carry it - a commitment to do a thing is not the thing being done. The
 * vocabulary stops at what the record can support: somebody has committed to it, somebody has
 * flagged trouble with it, or nobody has spoken to it at all. "Nobody has spoken to it" is the
 * finding a lead can act on today, and it is the one no surface was making.
 *
 * No alignment verdict between the two definitions. The report already has an engine that decides
 * what agrees and what diverges, reading the whole account. Deciding it a second time here, from
 * word overlap, would give the product two answers to one question - and the worse one would be the
 * one printed next to the definitions. So this places them side by side and says nothing about
 * them. The reader is looking at both; that was the entire problem.
 */

/** What the record can support about a condition. Deliberately three words, and none is a verdict. */
export type ConditionState =
  /** Somebody has committed to something that speaks to it. */
  | 'moving'
  /** Somebody has raised a tension or a worry against it. */
  | 'stuck'
  /** Nobody has said anything that touches it. The finding nothing else was making. */
  | 'unspoken';

export interface ConditionStanding {
  text: string;
  state: ConditionState;
  /** The line that put it in that state, so the reader can judge the match rather than trust it. */
  why: string | null;
  who: string | null;
}

export interface OwnDefinition {
  /**
   * NULL MEANS THE READER'S OWN, and that is deliberate rather than missing.
   *
   * The session report's name resolution answers null for your own entries on purpose - your own
   * report does not attribute your own lines back at you. This turned every one of the lead's own
   * definitions into "Somebody", seen on his own session report while the board, which resolves
   * names differently, said "Demo" for the same rows. So null is carried through and the page says
   * "You", which is what it means.
   */
  who: string | null;
  text: string;
}

export interface WhereAgainstSuccess {
  /** The standard was read from the brief, not set on Setup. */
  statedFromBrief?: boolean;
  /**
   * WHOSE ACCOUNTS THIS READ COULD SEE, WHICH CHANGES WHAT ITS WORDS MEAN.
   *
   * Before the report releases, a party may read their own entries and nobody else's - the wall the
   * whole product rests on. Run against that slice, a condition nobody has visibly spoken to comes
   * back "unspoken", and shown to her unqualified that is a false statement about people whose
   * accounts she is not allowed to see. Caught on Zainab's own record: three conditions, all
   * reading "nobody has spoken to it", while the lead had spoken to two of them.
   *
   * So the read says what it was allowed to look at, and the words change with it: "nobody" when it
   * saw everyone, "you have not" when it saw one person's own rows.
   */
  counting: 'everyone' | 'only-yours';
  /** What the lead said success looks like, at the version in force. */
  stated: string | null;
  version: number | null;
  conditions: ConditionStanding[];
  /** Of the conditions named, how many anybody has spoken to at all. */
  spokenTo: { count: number; of: number };
  /** What each person said success is, in their own words, from their own check-in. */
  definitions: OwnDefinition[];
  /**
   * Presence, not agreement. Which sides have answered the question at all - see the refusal above.
   */
  sides: 'nobody' | 'only-the-lead' | 'only-the-parties' | 'both';
  /** One sentence, when there is not enough to show. Null when there is. */
  saying: string | null;
}

/**
 * WORDS THAT CARRY NO SUBJECT. A condition and an entry sharing "the" or "should" share nothing;
 * matching on those puts every entry against every condition and the whole read becomes noise.
 */
const CARRIES_NO_SUBJECT = new Set([
  'about', 'after', 'again', 'against', 'along', 'also', 'another', 'because', 'been', 'before',
  'being', 'between', 'both', 'came', 'come', 'could', 'does', 'doing', 'done', 'down', 'during',
  'each', 'else', 'enough', 'even', 'ever', 'every', 'from', 'further', 'gets', 'give', 'given',
  'goes', 'going', 'gone', 'have', 'having', 'here', 'into', 'itself', 'just', 'keep', 'kept',
  'like', 'made', 'make', 'making', 'many', 'more', 'most', 'much', 'must', 'need', 'needs',
  'never', 'next', 'nothing', 'only', 'other', 'others', 'over', 'own', 'part', 'past', 'people',
  'perhaps', 'place', 'point', 'put', 'quite', 'rather', 'really', 'right', 'said', 'same', 'says',
  'see', 'seen', 'shall', 'should', 'since', 'some', 'something', 'still', 'such', 'sure', 'take',
  'taken', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'thing', 'things',
  'this', 'those', 'though', 'through', 'time', 'under', 'until', 'upon', 'used', 'very', 'want',
  'wants', 'well', 'went', 'were', 'what', 'when', 'where', 'which', 'while', 'will', 'with',
  'within', 'without', 'work', 'working', 'would', 'your', 'yours',
]);

/**
 * The words in a line that could identify what it is ABOUT.
 *
 * Four characters and up, because "due" and "own" and "the" match everywhere - EXCEPT an acronym,
 * which is short precisely because it is the most specific word in the sentence. Found on a real
 * check-in: a condition about the CRM and a worry about the CRM did not match each other, because
 * CRM is three letters. KPI, API, P&L, EOD and every product's own three-letter noun would have
 * gone the same way, and the failure is silent - the condition just reads "nobody has spoken to
 * it", which is a false statement about somebody who plainly did.
 *
 * So case is read before it is thrown away: two or more capitals in a row is an acronym and is
 * kept whatever its length. Everything else needs four characters and must not be in the list
 * above. Numbers count too, because "fifteen meetings" and "15 meetings" are the same condition and
 * targets are mostly written as digits.
 */
export function whatThisIsAbout(text: string): Set<string> {
  const about = new Set<string>();
  for (const raw of text.match(/[A-Za-z][A-Za-z'-]*|\d+/g) ?? []) {
    const w = raw.toLowerCase().replace(/'s$/, '');
    /* An acronym, kept whatever its length: two or more capitals with nothing lowercase between. */
    if (/^[A-Z]{2,}$/.test(raw)) { about.add(w); continue; }
    if (/^\d+$/.test(raw)) { about.add(w); continue; }
    if (w.length >= 4 && !CARRIES_NO_SUBJECT.has(w)) about.add(w);
  }
  return about;
}

/**
 * Whether a line speaks to a condition. TWO shared subject words, not one: a single shared word is
 * how "ship the pricing page" gets attached to "pricing is agreed with finance" and to every other
 * condition with "pricing" in it. Two is still a guess, which is why the line that produced the
 * match is always shown with the result - the reader judges it, the product does not assert it.
 */
export function speaksTo(condition: string, line: string): boolean {
  const about = whatThisIsAbout(condition);
  if (about.size === 0) return false;
  let shared = 0;
  for (const w of whatThisIsAbout(line)) {
    if (about.has(w) && ++shared >= 2) return true;
  }
  return false;
}

/** The first sentence of a brief that carries a number: "Jamie is to get 10 clients on the platform." */
export function sentenceWithANumber(brief: string | null | undefined): string | null {
  if (!brief?.trim()) return null;
  const sentences = brief.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  const hit = sentences.find((x) => /\b\d+\b/.test(x) && x.trim().length >= 12 && x.trim().length <= 240);
  return hit ? hit.trim() : null;
}

export interface WhereAgainstSuccessInputs {
  /** True when `stated` was read from the brief rather than set on Setup. */
  statedFromBrief?: boolean;
  /** See `counting` on the result: whether this read could see every account or only the reader's. */
  counting: 'everyone' | 'only-yours';
  stated: string | null;
  /**
   * WHETHER THE LEAD HAS SAID IT IN THEIR OWN CHECK-IN, which is not the same as having set it.
   *
   * `stated` is the Setup field. With it empty, this read used to say "The person running this has
   * not stated theirs, so there is nothing to read them against" - and on a real cohort board that
   * sentence sat directly above "Tunde Alabi - What I want by the end of the quarter is each of
   * them at eight closed deals", which he had said in every session for twelve weeks. The sentence
   * was true about the field and false about the man, and the list underneath it proved so.
   */
  leadHasSaidIt?: boolean;
  /** True when the reader is the person who runs this check-in, who is spoken to as "you". */
  readerIsTheLead?: boolean;
  /** True when the lead is the only person in the check-in (request 136 item 6): "nobody answering this check-in" is then nobody. */
  onlyTheLeadIsHere?: boolean;
  /** The name the reader may read for the person who runs it, for the sentence that speaks about them. */
  leadName?: string | null;
  version: number | null;
  conditions: string[];
  /** Every entry that could speak to a condition, across every session so far. */
  entries: { type: RecordEntryType; text: string; who: string | null }[];
}

/**
 * THE ONE SENTENCE ABOUT SUCCESS BEING SAID BUT NEVER SET, told to whoever reads it. The tab is "People and
 * setup" (request 75). The person who runs the check-in is spoken to; anybody else reads the same in the
 * third person, with the lead's name where they may read one.
 */
function theLeadSaidItButNeverSetIt(input: { readerIsTheLead?: boolean; leadName?: string | null }): string {
  if (input.readerIsTheLead) {
    return 'You said what success looks like in your own check-in, and it is in the list below. You have not set it as the standard yet, so nothing is measured against it. You can set it on People and setup.';
  }
  const name = input.leadName?.trim() || 'The person running this';
  return `${name} said what success looks like in their own check-in, and it is in the list below. ${name} has not set it as the standard yet, so nothing is measured against it. They can set it on People and setup.`;
}

/**
 * NOBODY HAS SAID WHAT SUCCESS LOOKS LIKE, TOLD TO WHOEVER READS IT (request 107 b). It read "Nobody has
 * said what success looks like yet - not the person running this, and not anyone answering it." to the
 * person running it, with a dash. Now in full sentences, with "you" for the reader and the lead's name
 * where the reader may read it.
 */
function nobodyHasSaidIt(input: { counting: 'everyone' | 'only-yours'; readerIsTheLead?: boolean; leadName?: string | null; onlyTheLeadIsHere?: boolean }): string {
  const lead = input.leadName?.trim() || 'The person running this check-in';
  if (input.readerIsTheLead && input.onlyTheLeadIsHere) {
    return 'You have not said what success looks like yet. It appears here as soon as you do. Until then, the report can say what you have said, but not whether things are going well.';
  }
  if (input.readerIsTheLead) {
    return 'Nobody has said what success looks like yet. You have not said it, and nobody answering this check-in has said it either. Until somebody does, the report can say where people said different things, but not whether things are going well.';
  }
  if (input.counting === 'only-yours') {
    return `Nothing has been said yet about what success looks like. ${lead} has not said it, and you have not said it either. It appears here as soon as either of you does.`;
  }
  return `Nobody has said what success looks like yet. ${lead} has not said it, and nobody answering this check-in has said it either. Until somebody does, the report can say where people said different things, but not whether things are going well.`;
}

export function whereYouAreAgainstWhatYouNamed(
  input: WhereAgainstSuccessInputs,
): WhereAgainstSuccess {
  const stated = input.stated?.trim() || null;

  /**
   * EACH PERSON'S OWN ANSWER TO THE SAME QUESTION. Extracted at every check-in since the product
   * shipped, stored on the entry, and read by nothing until now.
   */
  const definitions: OwnDefinition[] = [];
  const alreadySaid = new Set<string>();
  /*
   * "HORTICULTURE" IS NOT A DEFINITION OF SUCCESS.
   *
   * Read on a live board, 23 September 2026, under "And what each person says it is": nine raw
   * answers listed as success definitions - "horticulture", "sales records", "Yield too", "no
   * specific states but they have to be woemn". They were answers to whatever the last question
   * was, typed SUCCESS_DEFINITION by the extractor, and printed as though each one were somebody's
   * account of what good looks like. Hafsah: "I can make [no] inferences from it."
   *
   * The bar already mostly existed - see aDefinitionOfSuccessHolds, which refuses a fragment, an
   * instruction and a slash list. It is a floor and not a judgement: a real definition of success
   * in somebody's own words passes it, and "Yield too" does not and never did.
   */
  for (const e of input.entries) {
    if (e.type !== RecordEntryType.SUCCESS_DEFINITION) continue;
    const text = aDefinitionOfSuccessHolds(e.text);
    if (!text) continue;
    /*
     * EVERY DISTINCT THING A PERSON SAID SUCCESS IS, NOT THE LAST ONE.
     *
     * This kept one line per person, on the reasoning that a later answer replaces an earlier one.
     * Run against a real check-in it dropped half the content: the lead had said success was
     * "fifteen qualified meetings a month by month three" AND "the CRM kept current every Friday",
     * two different standards given in the same session, and only the second survived. Almost
     * nobody answers "what does doing well look like" with one thing.
     *
     * Deduplicated on the words themselves, so somebody restating the same standard in a later
     * session does not get two lines - which is the case the collapsing was reaching for.
     */
    const key = `${e.who ?? ''}::${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
    if (alreadySaid.has(key)) continue;
    alreadySaid.add(key);
    definitions.push({ who: e.who, text });
  }

  const conditions: ConditionStanding[] = input.conditions
    .map((c) => c.trim())
    .filter(Boolean)
    .map((text) => {
      /* The harder read wins. A condition somebody has committed to AND raised a worry about is
         not "moving" - the worry is the thing the lead needs to see, and a green word over the top
         of it would be the product deciding which of two accounts to believe. */
      const trouble = input.entries.find(
        (e) =>
          (e.type === RecordEntryType.TENSION || e.type === RecordEntryType.WORRY) &&
          speaksTo(text, e.text),
      );
      if (trouble) return { text, state: 'stuck' as const, why: trouble.text, who: trouble.who };

      const moving = input.entries.find(
        (e) => e.type === RecordEntryType.COMMITMENT && speaksTo(text, e.text),
      );
      if (moving) return { text, state: 'moving' as const, why: moving.text, who: moving.who };

      return { text, state: 'unspoken' as const, why: null, who: null };
    });

  const sides: WhereAgainstSuccess['sides'] =
    stated && definitions.length ? 'both'
      : stated ? 'only-the-lead'
        : definitions.length ? 'only-the-parties'
          : 'nobody';

  return {
    statedFromBrief: !!input.statedFromBrief && !!stated,
    counting: input.counting,
    stated,
    version: input.version,
    conditions,
    spokenTo: {
      count: conditions.filter((c) => c.state !== 'unspoken').length,
      of: conditions.length,
    },
    definitions,
    sides,
    saying:
      sides === 'nobody'
        ? nobodyHasSaidIt(input)
        : sides === 'only-the-lead' && !conditions.length
          ? input.counting === 'only-yours'
            ? 'What success looks like is stated. What you say about it appears here once you have checked in; everybody else\'s arrives with the report.'
            : 'What success looks like is stated, but nobody has said anything about it in a check-in yet. It fills in as people check in.'
          : sides === 'only-the-parties'
            ? input.leadHasSaidIt
              /* Said in a check-in but never set as the yardstick. Naming that difference is the
                 useful thing: the words are right there, they are simply not what anybody is being
                 read against, and one person can change it in a minute. */
              ? theLeadSaidItButNeverSetIt(input)
              : input.readerIsTheLead
                ? 'No standard is set. You have not said what success looks like, so nobody is being measured against anything yet.'
                : `No standard is set. ${input.leadName?.trim() || 'The person running this'} has not said what success looks like, so nobody is being measured against anything yet.`
            : null,
  };
}
