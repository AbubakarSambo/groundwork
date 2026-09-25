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
  /** The latest thing they reported, preferring one with a number in it. */
  whereTheySayTheyAre: string | null;
  /** The latest worry or tension they named. */
  whatTheySayIsInTheWay: string | null;
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

const latest = <T extends { session: number }>(xs: T[]): T | undefined => [...xs].sort((a, b) => b.session - a.session)[0];

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

  /* Where they say they stand: the latest progress line with a number in it, else the latest. */
  const progress = said.filter((s) => s.type === 'PROGRESS');
  const withNumber = progress.filter((s) => /\d/.test(s.text));
  const stand = latest(withNumber) ?? latest(progress);

  /*
   * "Named as in the way: you didnt even as me what i do, i dont get you saying that goes on the
   * record, what does that mean." Read on a live board, 23 September 2026. The record no longer
   * carries a remark about the product - see a-remark-about-the-tool-is-not-the-work - and this
   * takes whatever the latest real worry is.
   */
  const worry = latest(said.filter((s) => s.type === 'WORRY' || s.type === 'TENSION'));

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

  const hasGap = !!twoNumbers || !!neverSaid || doesNotAddUp.length > 0;

  return {
    participantId: p.participantId,
    label: p.label,
    isLead: p.isLead,
    whatTheySaidItWasFor: purpose ? clean(purpose.text) : null,
    whereTheySayTheyAre: stand ? clean(stand.text) : null,
    whatTheySayIsInTheWay: worry ? clean(worry.text) : null,
    numbers,
    aNumberSetForThemTheyHaveNeverSaid: neverSaid,
    twoNumbersForOneTarget: twoNumbers,
    whatDoesNotAddUp: doesNotAddUp,
    hasGap,
  };
}
