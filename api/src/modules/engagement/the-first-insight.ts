import { aNumberInWords } from './a-number-in-words';
import { saysTheSame } from './a-sentence-said-twice';
import { theConversationWorthHavingSaying } from '../grounds/what-is-sent-in-simpler-words';
import { isAWholeSentence } from '../reports/what-people-said-differently-about';
import { A_LINE_WE_COULD_NOT_RESTATE } from '../reports/said-in-its-own-words';

/**
 * THE FIRST MEANINGFUL INSIGHT IS IN THE MAIL (engagement spec section 7; section 36, journey 5).
 *
 * "Your report is ready" is a link to a finding. The lead should read the finding. This is built from the report AS THE READER IS SERVED IT
 * (ReportsService.sessionReport, which is what the report page and the WhatsApp copy read), so it has the privacy and the naming rules that reader has: a
 * colleague's words are walled until the picture is shared, an anonymous picture names nobody, and the lead's own layer is not given to a participant.
 * It uses only fields the report already holds, which the report's own synthesis wrote: how many things are settled and how many are still open, the
 * name of each thing still open, the one conversation worth having, and what the report says would settle the first of them. Nothing is worded by a
 * model here, and no prompt is involved.
 *
 * WHAT IT NEVER DOES. It never makes up a finding: with nothing settled and nothing open it says nothing, and the mail is the one it was. It never quotes a
 * person, never ranks one, and never gives a participant what only the lead is given ("what I would do" is the lead's). The subject names the thing
 * still open for the LEAD only; everybody else's subject stays the count (decision 109 item 3).
 */
export interface TheInsight {
  /** True where the report names something still open, so there is a finding a person can be helped with. */
  hasAFinding?: boolean;
  /** The lead's subject. Null where the report names nothing still open, and the subject is what it was. */
  subjectForTheLead: string | null;
  /** The sentences the mail opens with, in order. */
  lines: string[];
}

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/*
 * WHAT EACH PERSON SAID, NEVER "YOUR ACCOUNT STATES" (Hafsah, 19 October, point 5: "Never ... 'your account states' to the person who
 * runs it."). Grace's shared-picture email of Tuesday 13 October opened "Your account states that no sales have been confirmed with proof
 * of payment, while Kevin Omondi's account states that a 40-unit sale has been closed and paid for". A person said it: "You said that no
 * sales have been confirmed with proof of payment, while Kevin Omondi said that a 40-unit sale has been closed and paid for". For every
 * reader, since "account" is never said about what a person said.
 */
const AN_ACCOUNT_VERB = '(?:states|says|shows|describes|reports|indicates|notes|mentions|claims)';
export function whatEachPersonSaid(t: string): string {
  return String(t ?? '')
    .replace(new RegExp(`\\b((?:[A-Z][\\p{L}'’-]+)(?:\\s+[A-Z][\\p{L}'’-]+)*)['’]s accounts? ${AN_ACCOUNT_VERB}(?:\\s+that)?\\s+`, 'gu'), '$1 said that ')
    .replace(new RegExp(`\\bYour accounts? ${AN_ACCOUNT_VERB}(?:\\s+that)?\\s+`, 'g'), 'You said that ')
    .replace(new RegExp(`\\byour accounts? ${AN_ACCOUNT_VERB}(?:\\s+that)?\\s+`, 'g'), 'you said that ');
}

/** What the report names as still open, cleaned: no full stop or colon at its end, and not longer than a line. */
export function anOpenThing(t: unknown): string | null {
  const x = String(t ?? '').replace(/\s+/g, ' ').trim().replace(/[.:;,\s]+$/, '');
  if (!x) return null;
  /* A sentence is not cut in the middle: it is said whole, or (in a subject) not said. */
  return x.length <= 400 ? x : `${x.slice(0, 400).replace(/\s+\S*$/, '')}...`;
}

/**
 * A STAND-IN IS NEVER SAID AS A FINDING (engine test, second run, Muchemi & Co, Wednesday 14 October). A difference whose words could not
 * be restated without repeating somebody's own is stored as "[One line here repeated somebody's exact words ...]", and Wanjiru's
 * shared-picture email opened with that line, "[...], and one more difference is still open.". It still counts as a difference; it is
 * never the one named, and where it is the only one, the mail says how many the picture found.
 */
export const isAStandIn = (t: string): boolean => {
  const x = String(t ?? '').trim();
  return x.includes(A_LINE_WE_COULD_NOT_RESTATE.slice(1, 40)) || /^\[[^\]]*\]\.?$/.test(x);
};
/** The things open, the ones that can be named first, so a stand-in is never the one said. */
const nameableFirst = (open: string[]) => [...open.filter((t) => !isAStandIn(t)), ...open.filter(isAStandIn)];

/** A thing the report names, as it is quoted. */
export function aTopicQuoted(t: unknown): string | null {
  const x = anOpenThing(t);
  return x ? `"${x}"` : null;
}

/*
 * A SENTENCE THE REPORT WROTE IS NEVER PUT AFTER A COMMA (release test, 21 November 2026, bug 38). It was, with a word list deciding which
 * first words to lower: "In "Sales team, Q4", One participant's count of signed shops..." got through because "One" was not on the list,
 * and the next new first word would too. The sentence now leads, as written, and the check-in follows it: "..., in "Sales team, Q4"".
 */
const withoutItsStop = (s: string) => capital(String(s ?? '').trim().replace(/[.!?]+$/, ''));

/**
 * The first thing open, said as the report says it. The report writes a difference either as a noun phrase ("the unit of measurement for success") or as a
 * whole sentence ("Who owns the next step with the distributor is not agreed upon by the team."), and a sentence does not follow "differ on". So a phrase is
 * "The people in "X" differ on "T"" and a sentence is said as itself: "In "X", who owns the next step ... is not agreed upon by the team". The same test the
 * report's own tile uses (isAWholeSentence), so the mail and the page say it the same way.
 */
function firstOpenSaid(label: string, items: string[], capitalised: boolean): string {
  const first = items[0];
  const more = items.length - 1;
  const rest = more > 0 ? `, and ${aNumberInWords(more)} more ${more === 1 ? 'difference is' : 'differences are'} still open` : '';
  if (isAWholeSentence(first)) {
    return capitalised ? `${capital(first)}${rest}.` : `${withoutItsStop(first)}, in "${label}"${rest}`;
  }
  return `The people in "${label}" differ on "${first}"${rest}${capitalised ? '.' : ''}`;
}

/** A subject is read in a list, so it is short; where the finding does not fit, the count says it and the body says the rest. */
export const A_SUBJECT_FITS = 150;
export const aSubjectThatFits = (said: string, instead: string) => (said.length <= A_SUBJECT_FITS ? said : instead);

const cutLabel = (label: string, max: number) => (label.length <= max ? label : `${label.slice(0, max).replace(/\s+\S*$/, '')}...`);

/**
 * The insight for one reader from the report they are served. Null where the report has nothing settled and nothing open yet (it is still forming, or
 * nobody has said enough to name either), so nothing is claimed.
 */
/**
 * The finding, and what to do about it, and nothing else. No count of things settled and still open, no "a conversation worth having"
 * before the question, and "the report", never "the shared picture".
 */
export function theFirstInsight(report: any, label: string, reader: { isTheLead: boolean; simplerWords?: boolean | null }): TheInsight | null {
  const stand = report?.whereThingsStand;
  if (!stand || report?.withheldUntilYouAnswer) return null;
  const settled = Array.isArray(stand.settled) ? stand.settled.length : Number(stand.agreed) || 0;
  const open: string[] = (Array.isArray(stand.differences) ? stand.differences : Array.isArray(stand.open) ? stand.open : []).map(anOpenThing).filter((t: string | null): t is string => !!t).map(whatEachPersonSaid);
  if (settled === 0 && open.length === 0) return null;

  const lines: string[] = [];
  const name = cutLabel(label, 60);
  const ordered = nameableFirst(open);
  const noneNameable = open.length > 0 && isAStandIn(ordered[0]);
  const theCount = (l: string) => `The report for "${l}" found ${aNumberInWords(open.length)} ${open.length === 1 ? 'difference' : 'differences'} still open`;
  if (open.length) lines.push(noneNameable ? `${theCount(name)}.` : firstOpenSaid(name, ordered, true));
  /* What the report holds open is where people see things differently, never the waits: "Nothing ... is still open" sat under "Four
     handoffs are still waiting" (release test, 22 November 2026, bug 20). So it says which it is. */
  else lines.push(`The report for "${name}" found nothing that people see differently.`);
  const question = whatEachPersonSaid(String(report?.theConversationWorthHaving ?? '').replace(/\s+/g, ' ').trim());
  /* What the report writes about one finding can say it in all three places; a line that repeats one already in the mail is left out (a-sentence-said-twice.ts). */
  if (question && !lines.some((l) => saysTheSame(l, question))) lines.push(/[.!?]$/.test(question) ? question : `${question}.`);

  if (reader.isTheLead && open.length) {
    /* What would settle the one named first, never a stand-in's. */
    const reasons: any[] = Array.isArray(stand.openWithReasons) ? stand.openWithReasons : [];
    const first = noneNameable ? null : reasons.find((r) => !isAStandIn(String(r?.topic ?? '')) && anOpenThing(r?.topic) === anOpenThing(ordered[0])) ?? reasons.find((r) => !isAStandIn(String(r?.topic ?? '')));
    const settledBy = whatEachPersonSaid(String(first?.settledBy ?? '').replace(/\s+/g, ' ').trim());
    if (settledBy && lines.some((l) => saysTheSame(l, settledBy))) {
      /* It says what the mail already says, so it is not said again. */
    } else {
      lines.push(
        settledBy
          ? `Here is what I would do first. ${/[.!?]$/.test(settledBy) ? settledBy : `${settledBy}.`}`
          : question ? 'What I would do is bring the people involved together on that one question.' : 'What I would do is start with the first of these.',
      );
    }
  }

  return {
    hasAFinding: open.length > 0,
    subjectForTheLead: reader.isTheLead && open.length ? (noneNameable ? theCount(cutLabel(label, 40)) : aSubjectThatFits(firstOpenSaid(cutLabel(label, 40), ordered, false), theCount(cutLabel(label, 40)))) : null,
    lines,
  };
}

/**
 * The first thing the served report names as still open, as a whole sentence: the report's sentence as written, or "The people differ on "T".". Null where the report names nothing open.
 */
export function theFirstOpenDifference(report: any): string | null {
  if (!report?.whereThingsStand || report?.withheldUntilYouAnswer) return null;
  const open: unknown[] = Array.isArray(report.whereThingsStand.differences) ? report.whereThingsStand.differences : Array.isArray(report.whereThingsStand.open) ? report.whereThingsStand.open : [];
  for (const t of open) {
    const x = anOpenThing(t);
    if (x && !isAStandIn(x)) return isAWholeSentence(x) ? `${withoutItsStop(x)}.` : `The people differ on "${x}".`;
  }
  return null;
}

/**
 * THE ONE FINDING, ON ITS OWN (screens request 198). The first thing the served report names as still open, said as a whole sentence that stands without the
 * mail around it: a sentence the report wrote is itself with a capital and a full stop, and a phrase is "The people in "X" differ on "T"." It is the same
 * finding the first-insight mail's subject says, from the same report as the reader is served it, so it carries the same walls. Null where nothing is open
 * or the reader's picture is still withheld.
 */
export function theFindingOnItsOwn(report: any, label: string): { finding: string; moreStillOpen: number; conversationWorthHaving: string | null } | null {
  if (!report?.whereThingsStand || report?.withheldUntilYouAnswer) return null;
  const open: string[] = (Array.isArray(report.whereThingsStand.differences) ? report.whereThingsStand.differences : Array.isArray(report.whereThingsStand.open) ? report.whereThingsStand.open : []).map(anOpenThing).filter((t: string | null): t is string => !!t);
  const first = open.find((t) => !isAStandIn(t));
  if (!first) return null;
  const finding = isAWholeSentence(first) ? `${capital(first)}.` : `The people in "${cutLabel(label, 60)}" differ on "${first}".`;
  const question = String(report.theConversationWorthHaving ?? '').replace(/\s+/g, ' ').trim();
  return { finding, moreStillOpen: open.length - 1, conversationWorthHaving: question || null };
}
