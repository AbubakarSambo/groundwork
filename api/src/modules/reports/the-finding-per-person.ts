/**
 * THE FINDING, PER PERSON, WRITTEN BY THE PRODUCT.
 *
 * Six adversarial runs, 20-21 September 2026. After three sessions with a loan officer, five borrowers,
 * a dead flock, a bike nobody was sure he rode and a farmer who had quietly stopped farming, the shared
 * picture read, in full: "All acknowledge their repayment obligations to the finance company." The
 * board's summary was the same sentence. Every guard had done its job - the sentences counting the
 * people, the numbers nobody said, the quotations, all cut - and what was left after the cuts was a
 * platitude. The product removed the wrong sentences and never wrote the right one, while the facts
 * that made the right one sat in its own tables.
 *
 * So the product writes the finding. For each person: what they said this was for, where they say
 * they stand now with their own numbers, what the lead set for them where that differs, the worries
 * they named, and the gap the record shows between the purpose and the report. Plain sentences, the
 * person's own numbers, nothing the record does not hold. The model's narrative goes UNDER it, never
 * instead of it, and every board tile and session line that describes a person reads from the same
 * paragraph.
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

export interface AFinding {
  participantId: string;
  label: string;
  /** The paragraph, in the product's words. */
  text: string;
  /** True where the record shows a gap worth the lead's attention. */
  hasGap: boolean;
  /** The one line for the overview: "Grace: repaying from a different business than the loan was for." */
  headline: string | null;
}

const clean = (t: string): string => (t ?? '').replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\[INFERRED:[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().replace(/[.]+$/, '');
const short = (t: string, max = 160): string => (t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t);
const fmt = (n: number): string => (Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n));
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

export function findingFor(p: APersonToWriteUp, thisSession: number): AFinding | null {
  const said = p.said.filter((s) => s.text?.trim());
  if (!said.length) return null;
  /* The label without its trailing stop, so the read can swap it for a name or "you". */
  const who = clean(p.label);
  const sentences: string[] = [];
  let hasGap = false;
  let headline: string | null = null;

  /* What they said this was for: the earliest definition of success, in their words. */
  /*
   * AND THE PURPOSE HAS TO BE ONE. This took the earliest SUCCESS_DEFINITION whatever it was, so a
   * board read "Hafsah said this was for: I plan to run interventions to impact 30k women farmers"
   * from an answer to a different question, and elsewhere the same list printed "horticulture" and
   * "Yield too" as definitions. Same bar as the board's - see aDefinitionOfSuccessHolds.
   */
  const purpose = said
    .filter((s) => s.type === 'SUCCESS_DEFINITION' && aDefinitionOfSuccessHolds(s.text))
    .sort((a, b) => a.session - b.session)[0];
  if (purpose) sentences.push(`${who} said this was for: ${short(clean(purpose.text))}.`);

  /* Where they say they stand: the latest progress line with a number in it, else the latest progress line. */
  const progress = said.filter((s) => s.type === 'PROGRESS');
  const withNumber = progress.filter((s) => /\d/.test(s.text));
  const stand = latest(withNumber) ?? latest(progress);
  /* The lead's progress lines are mostly about other people ("Dayo has N22m"), so theirs read as a report, not a standing. */
  if (stand) sentences.push(`${p.isLead ? 'What they report' : 'Where they say they stand now'}: ${short(clean(stand.text))}.`);

  /* The number set for them by the lead, and their own, where the two differ. */
  const setForThem = p.targets.filter((t) => t.yours && !t.setByThem && t.target != null);
  const own = p.targets.filter((t) => t.yours && t.setByThem && t.target != null);
  for (const lead of setForThem.slice(0, 1)) {
    const theirs = own.find((t) => t.target !== lead.target);
    if (theirs) {
      sentences.push(`The lead set ${fmt(lead.target as number)} for them (${clean(lead.name)}); their own number is ${fmt(theirs.target as number)} (${clean(theirs.name)}).`);
      hasGap = true;
      headline = headline ?? `${who}: two numbers for one target, ${fmt(lead.target as number)} from the lead and ${fmt(theirs.target as number)} from them`;
    } else if (!own.length && !everMentioned(said, lead.target as number)) {
      /* A NUMBER SET FOR THEM THAT THEY HAVE NEVER SAID IS A GAP OF ITS OWN KIND. The new-hire board showed
         "$400,000 in new business" as a shared objective and "no gap" (run 10, 21 Sep 2026), because Tunde
         had no number of his own to differ with. He had never said the figure at all; Funmi had said "he
         knows". Set by the lead, not yet said by them: that is the finding. */
      sentences.push(`The lead set ${fmt(lead.target as number)} for them (${clean(lead.name)}); nothing they have said mentions that figure.`);
      hasGap = true;
      headline = headline ?? `${who}: ${fmt(lead.target as number)} set by the lead, not yet said by them`;
    } else if (lead.count > 0) {
      sentences.push(`Against the ${fmt(lead.target as number)} the lead set, the record has ${fmt(lead.count)}.`);
    }
  }

  /* The worries they named, latest first. */
  const worries = said.filter((s) => s.type === 'WORRY' || s.type === 'TENSION');
  const worry = latest(worries);
  /*
   * "Named as in the way: you didnt even as me what i do, i dont get you saying that goes on the
   * record, what does that mean." Read on a live board, 23 September 2026. Two faults in one line:
   * the sentence is not English - it is the end of a phrase whose beginning was in the variable
   * name - and the thing it quoted was a remark about the product, which the record no longer
   * carries (see a-remark-about-the-tool-is-not-the-work).
   */
  if (worry) sentences.push(`What they say is in the way: ${short(clean(worry.text), 120)}.`);

  /* The gaps the record itself shows. */
  const diffs = whatDoesNotAddUp({ said, thisSession, targets: p.targets, sessionsLeft: null, aiTurnsThisSession: [] });
  for (const d of diffs.slice(0, 2)) {
    hasGap = true;
    if (d.kind === 'counted differently') {
      sentences.push(`${d.lines[2].replace(/^That is /, 'The count moved: ')}`);
      headline = headline ?? `${who}: ${d.lines[2].replace(/^That is /, '').replace(/\.$/, '')}`;
    } else if (d.kind === 'what it was for has gone quiet') {
      sentences.push('Nothing they have reported since mentions the thing they said this was for.');
      headline = headline ?? `${who}: what they report has moved away from what this was for`;
    } else if (d.kind === 'two numbers for one target' && !headline) {
      headline = `${who}: two numbers for one target`;
    }
  }

  if (!sentences.length) return null;
  return { participantId: p.participantId, label: p.label, text: sentences.join(' '), hasGap, headline };
}

/**
 * THE OVERVIEW, ONE OR TWO SENTENCES, FROM THE FINDINGS. Counts the product can stand behind: how many
 * people have a gap the record shows, and who. Never "all".
 */
export function theOverview(findings: AFinding[], peopleAnswered: number, differencesBetweenAccounts = 0): string {
  const withGap = findings.filter((f) => f.hasGap);
  if (!findings.length) return '';
  if (withGap.length) {
    return `The record shows a gap for ${withGap.length} of the ${peopleAnswered} people who answered: ${withGap.map((f) => f.headline ?? f.label).join('; ')}.`;
  }
  /*
   * WHAT THIS CHECK ACTUALLY COMPARED, AND NOTHING WIDER.
   *
   * Live run, 24 September 2026: a consultant who had done almost none of the job he was hired for,
   * and the first line of his client's report was "the record shows no gap between what each said
   * this was for and what they report". It was not a lie about him - every finding here reads one
   * person against their OWN stated purpose and their own numbers, and his account is perfectly
   * consistent with itself. It was a lie about the check, which the reader has no way to see. A man
   * can be entirely consistent about sending letters for three months.
   *
   * So the sentence says which comparison it made, and where the two accounts differ it says that
   * instead of "no gap" - because a difference between the accounts IS the gap, and it is the next
   * thing on the page.
   */
  const consistent = `${findings.length} of ${peopleAnswered} people have given an account, and nothing in any single account contradicts what that person said it was for.`;
  if (differencesBetweenAccounts > 0) {
    return `${consistent} The accounts differ on ${differencesBetweenAccounts} ${differencesBetweenAccounts === 1 ? 'thing' : 'things'}, below.`;
  }
  return `${consistent} Nobody has been read against anybody else's account of what they did.`;
}

/** The whole product-written half of the picture: the overview, then each person. */
export function thePictureTheProductWrites(findings: AFinding[], peopleAnswered: number, differencesBetweenAccounts = 0): string {
  if (!findings.length) return '';
  return [theOverview(findings, peopleAnswered, differencesBetweenAccounts), ...findings.map((f) => f.text)].filter(Boolean).join('\n\n');
}
