/**
 * WHAT THE RECORD HOLDS ABOUT ONE PERSON, AS FACTS RATHER THAN AS A PARAGRAPH.
 *
 * This is the first half of `the-finding-per-person`, pulled out and left as data.
 *
 * WHY IT WAS SPLIT. That file did two jobs: it worked out what the record holds about somebody, and
 * it wrote that up. The first job was right and hard-won - six adversarial runs taught it which
 * SUCCESS_DEFINITION to trust, that a number set for somebody they have never said is its own kind
 * of gap, and that a remark about the product is not the work. The second job glued slot names to
 * raw answers and produced, 734 times across twenty-four scenarios:
 *
 *   "Femi Okonkwo said this was for: I'll know when they tell me they have the statements ready.
 *    Where they say they stand now: I have visited many businesses, 46 in total."
 *
 * The answer under "said this was for" was an answer to a different question. The glue could not
 * know that, because glue cannot read.
 *
 * So the extraction stays exactly as it was and keeps its scars. The writing moves to one model call
 * over these facts - see the-picture-in-plain-sentences - which can say "Femi has visited 46
 * businesses. Most of his applications are waiting for customers to send their bank statements."
 * from the same rows.
 */
import { whatDoesNotAddUp, type AThingOnRecord, type ATargetTheyHold } from '../conversation/what-does-not-add-up';
import { aDefinitionOfSuccessHolds } from '../grounds/a-dump-is-many-things';
import { carriesANumber, theNumbersIn } from './a-number-written-as-a-word-is-a-number';

export interface APersonToWriteUp {
  participantId: string;
  /** How this person is named in the report: the label, resolved to a name or "you" at the read. */
  label: string;
  isLead: boolean;
  said: AThingOnRecord[];
  targets: ATargetTheyHold[];
}

/** One number this person holds, and where it came from. */
export interface ANumberTheyHold {
  what: string;
  target: number;
  /** What the record has against it, where anything does. */
  soFar: number | null;
  setBy: 'the lead' | 'them';
}

/**
 * Everything true about one person, with nothing written.
 *
 * Every field is either a quotation from the record or arithmetic over it. Nothing here is a
 * judgement, and nothing here is a sentence the product made up - which is what makes it safe to
 * hand to a model and ask for prose.
 */
export interface PersonFacts {
  participantId: string;
  label: string;
  isLead: boolean;
  /** Their earliest definition of success, in their own words. Null when they never gave one that holds. */
  whatTheySaidItWasFor: string | null;
  /** The latest thing they reported, preferring one with a number in it, digits or words. */
  whereTheySayTheyAre: string | null;
  /**
   * AN EARLIER FIGURE THEY GAVE, WHERE IT IS NOT THE ONE THEY GIVE NOW, in their own words.
   *
   * Kwame, run 8: "All 22 facilities were pretty smooth" in session 2, and "I have three approved
   * facilities already" in session 3, against a target of 14 approved. Only one line reached the
   * paragraph, so the difference between 22 handled and three approved, which is the whole finding,
   * could not be written by anybody downstream. The latest progress line from an earlier session
   * than `whereTheySayTheyAre`'s that carries a number the later one does not. Null otherwise.
   */
  anEarlierFigureTheyGave: string | null;
  /** The week each of those two was said in, so the picture names the weeks and never merges them (Hafsah, 12 October). */
  weekOfWhereTheyAre?: string | null;
  weekOfTheEarlierFigure?: string | null;
  /** The latest worry or tension they named, preferring one in that session with a detail in it. */
  whatTheySayIsInTheWay: string | null;
  /**
   * WHY THEY SAY THEY ARE ON THIS WORK RATHER THAN SOMETHING ELSE, in their own words.
   *
   * The realign scenario is what this is for. Three engineers were each working on something other
   * than the priority their lead had set, and they said why, plainly and repeatedly: "The CEO
   * asked me to on September 2nd and said it was urgent", "The CEO mentioned it to me at dinner".
   * Those lines are on the record, typed INTENT, three or four of them per run.
   *
   * INTENT was read by nothing here. The picture is written from these fields, so the paragraph
   * came out as "their goal is for the referral scheme to be live, and they began work on it on
   * September 2nd" - the work, the date, and not who asked. The judgement is built from those
   * paragraphs, so by then the only fact that explained the whole check-in was gone, and no
   * instruction downstream could put it back: the CEO appeared zero times in twelve samples across
   * three different judgement instructions.
   *
   * It reached the report once in three runs, and only because one person happened to repeat it
   * inside a PROGRESS line, which IS read. That is the fact arriving by accident.
   */
  whyTheySayTheyAreOnIt: string | null;
  /**
   * HOW THEY SAY THE WORK REALLY RUNS, WHERE THAT IS NOT HOW IT IS SUPPOSED TO, in their own words.
   * Up to two, and an empty list where they said nothing of the kind.
   *
   * These are OPERATING_DIFFERENCE lines, and until 26 September nothing here read them. Run 6
   * stored fifteen of them across the twenty-four scenarios and every one was lost before the
   * paragraph was written, which means before the judgement was written, because the judgement is
   * built from the paragraphs. Among the fifteen were the facts four right answers rest on:
   *
   *   "I have a verbal 60-day payment arrangement with our main printing supplier, which I agreed
   *    with their MD in 2022; our written terms state 30 days." (Patience, handing over. Her
   *    paragraph said something minor about following up purchases instead.)
   *   "Since March 11th, I've been almost entirely focused on inbound sales support as requested by
   *    Nadia, which has meant no progress on the three partnerships." (Zainab. The judgement said
   *    she had been "asked by somebody else", with the name and the date gone.)
   *   "I'm faster at them, so it's quicker for me to just handle them." (Daniel, the new manager.
   *    That sentence is, nearly word for word, the scenario's right answer.)
   *   "Nobody explained that the repayments started immediately." (The loans scenario.)
   *
   * It is the same defect the INTENT field above was added for, one type along: the record held it,
   * the writer was never given it, and no instruction downstream can put back what was never passed.
   * The entries the conversation service writes against the company's written process are long
   * "This is what they described... This is what the written process says..." sentences; they are
   * passed through as they are.
   */
  howTheySayTheWorkReallyRuns: string[];
  numbers: ANumberTheyHold[];
  /** A number the lead set for them that they have never once mentioned. */
  aNumberSetForThemTheyHaveNeverSaid: { what: string; target: number } | null;
  /** Two numbers for one target: the lead's and their own. */
  twoNumbersForOneTarget: { what: string; theLeads: number; theirs: number } | null;
  /** What the record itself shows does not add up, already worded by that engine. */
  whatDoesNotAddUp: string[];
  /** True where any of the above is something the lead should look at. */
  hasGap: boolean;
}

const clean = (t: string): string =>
  (t ?? '').replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\[INFERRED:[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().replace(/[.]+$/, '');

/** Their own words, with every bracket the extraction added taken out, are fewer than four words and carry no number. */
export const onlyAFragment = (t: string): boolean => {
  const own = (t ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim();
  return !carriesANumber(own) && own.split(/\s+/).filter(Boolean).length < 4;
};

const latest = <T extends { session: number }>(xs: T[]): T | undefined => [...xs].sort((a, b) => b.session - a.session)[0];

/** A figure, a date, or somebody's name in the middle of the sentence. */
const carriesASpecific = (t: string): boolean => /\d/.test(t) || /[a-z,;:]\s+(?!I\b)[A-Z][A-Za-z]+/.test(t);

/** Has this person said the figure, in any of its shapes: 400,000, 400k, $400,000, 0.4m? */
const SCALE: Record<string, number> = { k: 1e3, m: 1e6, mn: 1e6, bn: 1e9, thousand: 1e3, million: 1e6, billion: 1e9 };
export function everMentioned(said: AThingOnRecord[], figure: number): boolean {
  for (const s of said) {
    for (const m of (s.text ?? '').matchAll(/(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m|mn|bn|thousand|million|billion)?\b/gi)) {
      const n = Number(m[1].replace(/,/g, '')) * (SCALE[(m[2] ?? '').toLowerCase()] ?? 1);
      if (Number.isFinite(n) && Math.abs(n - figure) < Math.max(1, figure * 0.005)) return true;
    }
  }
  return false;
}

/**
 * THE FACTS, AND NOT ONE WORD MORE.
 *
 * Returns null where the record holds nothing about them, which is different from holding nothing
 * interesting: somebody who answered and said little still gets a row, because "they answered and
 * said little" is a fact the lead needs.
 */
export function factsAbout(p: APersonToWriteUp, thisSession: number): PersonFacts | null {
  const said = p.said.filter((s) => s.text?.trim());
  if (!said.length) return null;

  /*
   * AND THE PURPOSE HAS TO BE ONE. This took the earliest SUCCESS_DEFINITION whatever it was, so a
   * board read "Hafsah said this was for: I plan to run interventions to impact 30k women farmers"
   * from an answer to a different question, and elsewhere the same list printed "horticulture" and
   * "Yield too" as definitions. Same bar as the board's - see aDefinitionOfSuccessHolds.
   */
  const purpose = said
    .filter((s) => s.type === 'SUCCESS_DEFINITION' && aDefinitionOfSuccessHolds(s.text))
    .sort((a, b) => a.session - b.session)[0];

  /* Where they say they stand: the latest progress line with a number in it, else the latest.
     A number written as a word counts: "three approved" lost to "22" on run 8 because it did not. */
  /* A line whose own words are only a few words with no number ("The owners.", the extraction's "[The conversations were
     with]" in front) says nothing on its own: night quality run 1 wrote "Jared's latest report is The owners." from it. */
  const progress = said.filter((s) => s.type === 'PROGRESS' && !onlyAFragment(s.text));
  const withNumber = progress.filter((s) => carriesANumber(s.text));
  const stand = latest(withNumber) ?? latest(progress);
  /* And the figure they gave before it, where it differs. See the field's note. */
  const nowSays = new Set(stand ? theNumbersIn(stand.text) : []);
  const earlier = stand
    ? latest(withNumber.filter((s) => s.session < stand.session && theNumbersIn(s.text).some((n) => !nowSays.has(n))))
    : undefined;

  /*
   * "Named as in the way: you didnt even as me what i do, i dont get you saying that goes on the
   * record, what does that mean." Read on a live board, 23 September 2026. The record no longer
   * carries a remark about the product - see a-remark-about-the-tool-is-not-the-work - and this
   * takes whatever the latest real worry is.
   */
  /*
   * AND THE WORRY WITH THE DETAIL IN IT. run-7, the pulse scenario: Fatima's record held "some
   * approvals are stalled", "Four purchase approvals have been sitting since the 9th, waiting for
   * Ahmed's manager" and "Ahmed's manager is on leave until the 28th", all in one session. `latest`
   * keeps the first of equals, so the finding read "some approvals are stalled" and lost the fact
   * the right answer turns on. Within the latest session, one carrying a specific is preferred -
   * the same test as how the work really runs, below - and otherwise it is as before.
   */
  const worries = said.filter((s) => s.type === 'WORRY' || s.type === 'TENSION');
  const latestWorry = latest(worries);
  const worry = latestWorry
    ? worries.find((s) => s.session === latestWorry.session && carriesASpecific(clean(s.text))) ?? latestWorry
    : undefined;

  /*
   * AND WHY THEY ARE ON IT, which is an INTENT line and was read by nothing. See the field's note.
   * The latest one that names somebody or something as the reason is preferred over the latest
   * plain one: "I took that as direction" is an intent, and "the CEO asked me to on September 2nd"
   * is the one that explains the check-in.
   */
  const intents = said.filter((s) => s.type === 'INTENT');
  const namesAReason = intents.filter((s) => /\b(asked|told|said to|requested|instructed|direction from|came from|mentioned it to me|brought it up)\b/i.test(s.text));
  const why = latest(namesAReason) ?? latest(intents);

  /*
   * AND HOW THEY SAY THE WORK REALLY RUNS. See the field's note. Two at most, so one person's
   * paragraph is not buried under them. The ones carrying a specific come first - a figure, a date,
   * or somebody's name in the middle of the sentence - because "our written terms state 30 days" and
   * "as requested by Nadia" are the lines the finding turns on, and "things are a bit informal here"
   * is not. Among equals, the latest session wins, and the same sentence said twice counts once.
   */
  const ranked = said
    .filter((s) => s.type === 'OPERATING_DIFFERENCE')
    .map((s) => ({ session: s.session, text: clean(s.text) }))
    .filter((s) => s.text)
    .sort((a, b) => Number(carriesASpecific(b.text)) - Number(carriesASpecific(a.text)) || b.session - a.session)
    .map((s) => s.text);
  const howItReallyRuns = ranked
    .filter((t, i) => ranked.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i)
    .slice(0, 2);

  const setForThem = p.targets.filter((t) => t.yours && !t.setByThem && t.target != null);
  const own = p.targets.filter((t) => t.yours && t.setByThem && t.target != null);

  let twoNumbers: PersonFacts['twoNumbersForOneTarget'] = null;
  let neverSaid: PersonFacts['aNumberSetForThemTheyHaveNeverSaid'] = null;
  const numbers: ANumberTheyHold[] = [];

  for (const lead of setForThem.slice(0, 1)) {
    const theirs = own.find((t) => t.target !== lead.target);
    if (theirs) {
      twoNumbers = { what: clean(lead.name), theLeads: lead.target as number, theirs: theirs.target as number };
    } else if (!own.length && !everMentioned(said, lead.target as number)) {
      /* A NUMBER SET FOR THEM THAT THEY HAVE NEVER SAID IS A GAP OF ITS OWN KIND. The new-hire board
         showed "$400,000 in new business" as a shared objective and "no gap" (run 10, 21 Sep 2026),
         because Tunde had no number of his own to differ with. He had never said the figure at all. */
      neverSaid = { what: clean(lead.name), target: lead.target as number };
    } else {
      numbers.push({ what: clean(lead.name), target: lead.target as number, soFar: lead.count ?? null, setBy: 'the lead' });
    }
  }
  for (const t of own) {
    numbers.push({ what: clean(t.name), target: t.target as number, soFar: t.count ?? null, setBy: 'them' });
  }

  const diffs = whatDoesNotAddUp({ said, thisSession, targets: p.targets, sessionsLeft: null, aiTurnsThisSession: [] });
  const doesNotAddUp = diffs.slice(0, 2).map((d) => clean(d.lines[2] ?? d.lines[0] ?? '')).filter(Boolean);

  /* A difference between how the work runs and how it is supposed to run is something the lead
     should look at, whoever turns out to be right about it. */
  const hasGap = !!twoNumbers || !!neverSaid || doesNotAddUp.length > 0 || howItReallyRuns.length > 0;

  return {
    participantId: p.participantId,
    label: p.label,
    isLead: p.isLead,
    whatTheySaidItWasFor: purpose ? clean(purpose.text) : null,
    whereTheySayTheyAre: stand ? clean(stand.text) : null,
    anEarlierFigureTheyGave: earlier ? clean(earlier.text) : null,
    weekOfWhereTheyAre: stand?.week ?? null,
    weekOfTheEarlierFigure: earlier?.week ?? null,
    whatTheySayIsInTheWay: worry ? clean(worry.text) : null,
    whyTheySayTheyAreOnIt: why ? clean(why.text) : null,
    howTheySayTheWorkReallyRuns: howItReallyRuns,
    numbers,
    aNumberSetForThemTheyHaveNeverSaid: neverSaid,
    twoNumbersForOneTarget: twoNumbers,
    whatDoesNotAddUp: doesNotAddUp,
    hasGap,
  };
}
