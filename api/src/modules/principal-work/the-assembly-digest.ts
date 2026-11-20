/**
 * THE WEEKLY REPORT FROM THE NATIONAL ASSEMBLY, READ AND SAID (Fatima, increment 6b; plan section 13): what the report says, with its source and date;
 * how it compares with the weeks before; what it touches in the work already on the record; and what is suggested, which stays a suggestion until she
 * confirms it. Three things are kept apart in the words: what the REPORT says, what the OFFICE has done (only ever read from the record), and what is PROPOSED.
 * This file is the rules and the words, with no database and no model.
 */
import * as crypto from 'crypto';
import { dayWords, MONTHS } from '../year-end/the-year-end-content';
import { readDate } from './the-payments-tracker';
import type { ADevelopmentRead, AReportRead, AnEngagement } from './the-work-reader';

/* ------------------------------------------------------------------ weeks */

/** The ISO week a date is in, "2026-W46". */
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)).padStart(2, '0')}`;
}
/** The Monday of that week. */
export function weekStartOf(d: Date): Date {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() || 7) - 1));
  return t;
}

/* ------------------------------------------------------------------ reading, and keeping the model honest */

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();

/**
 * A development stays only if the words it quotes are in the report. What a model "said" a report said, with nothing in the report to point to, is
 * dropped here, so the briefing cannot say more than the report does. The source of each one is the file it was in and the date on it.
 */
export function keepWhatTheReportSays(read: AReportRead, sourceText: string, engagementKeys: string[]): AReportRead {
  const hay = norm(sourceText);
  const developments = read.developments.filter((d) => d.quote.length >= 12 && hay.includes(norm(d.quote)));
  const moved = new Map<number, number>();
  read.developments.forEach((d, i) => { const at = developments.indexOf(d); if (at >= 0) moved.set(i, at); });
  return {
    ...read,
    developments: developments.map((d) => ({ ...d, relatedKeys: d.relatedKeys.filter((k) => engagementKeys.includes(k)) })),
    followUps: read.followUps.filter((f) => f.about === null || moved.has(f.about)).map((f) => ({ ...f, about: f.about === null ? null : moved.get(f.about)! })),
  };
}

/** The reading that stands in with no model: each line that is a bullet, a number or a full sentence is a development, quoted as it is. */
export function readAReportPlainly(text: string, fileName: string, receivedOn: string): AReportRead | null {
  const institution = /\b(National Assembly|Senate|House of Representatives)\b/i.exec(text)?.[1] ?? null;
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items = lines.filter((l) => /^(?:[-*•]|\d+[.)])\s+/.test(l) && l.length >= 25).map((l) => l.replace(/^(?:[-*•]|\d+[.)])\s+/, ''));
  if (!institution || !items.length) return null;
  const found = /\b(\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b/.exec(text)?.[1];
  const date = (found ? readDate(found) : null) ?? readDate(receivedOn);
  return {
    isWeeklyReport: true, institution: /senate/i.test(institution) ? 'Senate' : /house/i.test(institution) ? 'House of Representatives' : 'National Assembly', reportDate: date ? date.toISOString().slice(0, 10) : null,
    developments: items.slice(0, 30).map((l) => ({ title: l.length > 110 ? `${l.slice(0, 107).trim()}...` : l, said: l, quote: l, date: null, relatedKeys: [] })),
    followUps: [],
  };
}

const STOP = new Set('the and for that with from this have been will were their which about into over under after before also than then they them would could should shall committee house senate national assembly bill report week'.split(' '));
const tokensOf = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length >= 4 && !STOP.has(w)));
const billIds = (s: string) => new Set([...s.matchAll(/\b(HB|SB|HR|S\.?B\.?|H\.?B\.?)\s*\.?\s*(\d{1,4})\b/gi)].map((m) => `${m[1].replace(/\./g, '').toUpperCase()}${m[2]}`));

/** Two developments are the same matter when they share a bill number, or enough of their words. */
export function sameMatter(a: { title: string; quote: string }, b: { title: string; quote: string }): boolean {
  const ia = billIds(`${a.title} ${a.quote}`);
  const ib = billIds(`${b.title} ${b.quote}`);
  if ([...ia].some((x) => ib.has(x))) return true;
  const ta = tokensOf(`${a.title} ${a.quote}`);
  const tb = tokensOf(`${b.title} ${b.quote}`);
  const shared = [...ta].filter((w) => tb.has(w)).length;
  return shared >= 3 && shared / Math.min(ta.size, tb.size) >= 0.5;
}

export interface AnEarlierWeek { weekKey: string; developments: ADevelopmentRead[] }
export interface TheComparison { each: ({ kind: 'new' } | { kind: 'again'; weekKey: string; /** What that week's report said about it, in its words. */ was?: string })[]; notMentioned: { title: string; weekKey: string }[]; hadEarlier: boolean }

export function compareWithEarlier(now: ADevelopmentRead[], earlier: AnEarlierWeek[]): TheComparison {
  const sorted = [...earlier].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  const each = now.map((d) => {
    for (const w of sorted) { const e = w.developments.find((x) => sameMatter(d, x)); if (e) return { kind: 'again' as const, weekKey: w.weekKey, was: e.quote }; }
    return { kind: 'new' as const };
  });
  const last = sorted[0];
  const notMentioned = last ? last.developments.filter((e) => !now.some((d) => sameMatter(d, e))).slice(0, 3).map((e) => ({ title: e.title, weekKey: last.weekKey })) : [];
  return { each, notMentioned, hadEarlier: sorted.length > 0 };
}

/** The office's own items a development touches, when the model did not say: two shared words that are not common ones. */
export function touchesPlainly(d: { title: string; quote: string }, engagements: AnEngagement[]): string[] {
  const t = tokensOf(`${d.title} ${d.quote}`);
  return engagements.filter((e) => [...tokensOf(`${e.item} ${e.workstream ?? ''}`)].filter((w) => t.has(w)).length >= 2).map((e) => e.key).slice(0, 3);
}

export const contentHashOf = (read: AReportRead): string => crypto.createHash('sha256').update(JSON.stringify(read.developments.map((d) => [d.title, d.quote]))).digest('hex').slice(0, 32);

/* ------------------------------------------------------------------ the words */

export interface ARowItTouches { key: string; item: string; status: string; owner: string }

const SAYS_STATUS: Record<string, string> = {
  open: 'open', 'in progress': 'in progress', blocked: 'blocked', 'awaiting decision': 'waiting for a decision', 'awaiting external party': 'waiting for somebody outside the office',
  completed: 'done', cancelled: 'cancelled', unverified: 'said to be done, with nothing shown yet',
};
const ownedBy = (owner: string) => (owner === 'unconfirmed' ? 'with no owner confirmed yet' : `owned by ${owner}`);
const week = (key: string, institution: string) => { void institution; const [y, w] = key.split('-W'); const jan4 = new Date(Date.UTC(+y, 0, 4)); const start = new Date(weekStartOf(jan4).getTime() + (Number(w) - 1) * 7 * 86_400_000); return dayWords(start); };
const bare = (s: string) => s.trim().replace(/[.!?]+$/, '');
const sentence = (s: string) => { const t = bare(s); return t ? `${t}.` : ''; };

export interface TheBriefingIn {
  institution: string;
  weekKey: string;
  forwardedOn: Date;
  fileName: string;
  developments: ADevelopmentRead[];
  comparison: TheComparison;
  /** Null for somebody who may not read her engagements: those parts are then left out, not softened. */
  touches: Map<number, ARowItTouches[]> | null;
  followUps: { text: string }[];
  reportDate: Date | null;
  alreadyHad: boolean;
}

export const NO_DEVELOPMENTS_I_CAN_QUOTE = (file: string) => `I read ${file}, and I could not find anything in it that I can point to word for word, so I have kept nothing from it. If it is the weekly report, please send it again as a text, Word, PDF or Excel file.`;
export const ALREADY_HAVE_THIS_WEEK = (institution: string, weekKey: string) => `I already have the ${institution} report for the week of ${week(weekKey, institution)}, and it has not changed, so I have not made a second briefing.`;

/** "2026-12-01" is written as a person says it: "1 December" in the year of the report, and with the year when it is another year. */
export const asADayPeopleSay = (iso: string, yearOfTheReport: number | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? '').trim());
  if (!m) return String(iso);
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return String(iso);
  return `${Number(m[3])} ${month}${yearOfTheReport === Number(m[1]) ? '' : ` ${m[1]}`}`;
};
const sourceOf = (d: ADevelopmentRead, file: string, fallback: Date | null) => `From ${file}${d.date ? `, dated ${asADayPeopleSay(d.date, fallback ? fallback.getUTCFullYear() : null)}` : fallback ? `, dated ${dayWords(fallback)}` : ''}.`;

function thePlaces(b: TheBriefingIn): string[] {
  const lines: string[] = [];
  b.developments.forEach((d, i) => {
    const c = b.comparison.each[i];
    if (c?.kind === 'again') {
      /* Said as what changed, in the report's own words, and not only that the matter was there before (Fatima round 6: the hearing date had moved, and the line said it was "also in the report"). */
      const then = norm(c.was ?? ''); const now = norm(d.quote);
      const clip = (t: string) => (t.length > 170 ? `${t.slice(0, 169).replace(/\s+\S*$/, '')}…` : t);
      lines.push(!c.was || then === now
        ? `${bare(d.title)} was in the report for the week of ${week(c.weekKey, b.institution)} too, and what the report says has not changed.`
        : `${bare(d.title)} was in the report for the week of ${week(c.weekKey, b.institution)} too, but it now reads differently. Then it said: "${clip(bare(c.was))}". Now it says: "${clip(bare(d.quote))}".`);
    }
  });
  return lines;
}

export function theQuestion(b: TheBriefingIn): string | null {
  if (!b.developments.length) return null;
  if (b.touches) {
    const unlinked = b.developments.findIndex((_, i) => !(b.touches!.get(i)?.length));
    if (unlinked >= 0) return `Does the office need to follow "${bare(b.developments[unlinked].title)}", or can I leave it out of the briefings from now on?`;
  }
  const gone = b.comparison.notMentioned[0];
  if (gone) return `The report for the week of ${week(gone.weekKey, b.institution)} mentioned "${bare(gone.title)}", and this week's does not. Has that been dealt with, or should I keep watching it?`;
  return null;
}

/** The full briefing, for email. Sections only for what there is. */
export function theFullBriefing(b: TheBriefingIn): string {
  const parts: string[] = [];
  parts.push(`Here is the ${b.institution} briefing for the week of ${week(b.weekKey, b.institution)}, from the report you forwarded on ${dayWords(b.forwardedOn)}.`);
  parts.push(['What the report says', ...b.developments.map((d, i) => `${i + 1}. ${sentence(d.title)} ${d.said && norm(d.said) !== norm(d.title) ? `${sentence(d.said)} ` : ''}${sourceOf(d, b.fileName, b.reportDate)}`)].join('\n'));
  const compared = thePlaces(b);
  const newOnes = b.developments.filter((_, i) => b.comparison.each[i]?.kind === 'new').length;
  parts.push(['Compared with earlier weeks', ...(b.comparison.hadEarlier ? [...(newOnes ? [`${newOnes === 1 ? 'One development is' : `${newOnes} developments are`} new this week.`] : []), ...compared, ...b.comparison.notMentioned.map((n) => `${bare(n.title)} was in the report for the week of ${week(n.weekKey, b.institution)} and is not in this one.`)] : [`I have no earlier week from the ${b.institution} to compare with yet. I will compare from the next report.`])].join('\n'));
  if (b.touches) {
    const touched = b.developments.flatMap((d, i) => (b.touches!.get(i) ?? []).map((r) => `${sentence(d.title)} It touches "${r.item}", which is ${SAYS_STATUS[r.status] ?? r.status} and ${ownedBy(r.owner)}.`));
    parts.push(['What it touches in your work', ...(touched.length ? touched : ['None of these match anything on the record yet.'])].join('\n'));
    const done = [...new Map([...b.touches.values()].flat().map((r) => [r.key, r])).values()];
    parts.push(['What the office has done', `This briefing says what the ${b.institution}'s report says. It does not say what the office has done. From the record, ${done.length ? done.map((r) => `"${r.item}" is ${SAYS_STATUS[r.status] ?? r.status}`).join(', and ') : 'the office has nothing yet on any of these developments'}.`].join('\n'));
    if (b.followUps.length) parts.push(['What I suggest, and have not done', ...b.followUps.map((f) => `- ${sentence(f.text)}`), 'These are only suggestions until you confirm them.'].join('\n'));
  }
  const q = theQuestion(b);
  if (q) parts.push(q);
  return parts.join('\n\n');
}

/** The short one, for WhatsApp: the first three developments, the comparison in a line, and the question. */
export function theShortBriefing(b: TheBriefingIn): string {
  const top = b.developments.slice(0, 3);
  const more = b.developments.length - top.length;
  const parts = [`${b.institution}, week of ${week(b.weekKey, b.institution)}. From the report you forwarded on ${dayWords(b.forwardedOn)}, the report says:`];
  parts.push(top.map((d, i) => `${i + 1}. ${sentence(d.title)}`).join('\n') + (more > 0 ? `\nAnd ${more} more, which I have kept.` : ''));
  const newOnes = b.developments.filter((_, i) => b.comparison.each[i]?.kind === 'new').length;
  parts.push(b.comparison.hadEarlier ? `${newOnes === 1 ? 'One is' : `${newOnes} are`} new compared with last time${b.comparison.notMentioned.length ? `, and ${b.comparison.notMentioned.length} from before ${b.comparison.notMentioned.length === 1 ? 'is' : 'are'} not in this one` : ''}.` : 'I have no earlier week to compare with yet.');
  if (b.touches) {
    const n = [...b.touches.values()].filter((r) => r.length).length;
    parts.push(n ? `${n === 1 ? 'One touches' : `${n} touch`} work already on your record. I have suggested follow-ups, and I have not done any of them until you confirm them.` : 'None of it matches work on your record yet. I have not done anything about it.');
  }
  const q = theQuestion(b);
  if (q) parts.push(q);
  return parts.join('\n\n');
}

