/**
 * A QUARTERLY OR AN ANNUAL REPORT, ASKED FOR BY SAYING SO (chat is king, section 8).
 *
 * "Get me a quarterly report" is answered from three places, each read as the asker may read it and no further: the finished check-ins and
 * boards of the check-ins they run (an admin: the ones the organisation lets them read), the Company page (the Desk), and what is written
 * in References and resources for those check-ins for everyone. It names where each part came from, and it says plainly when a part has
 * nothing in it. It writes nothing and sends nothing.
 */

/** Narrow: the word quarterly, annual or yearly beside report, or a report or summary of the quarter or the year. */
export const A_PERIOD_REPORT_PATTERNS: RegExp[] = [
  /\b(?:quarterly|annual|yearly|year[\s-]?end|half[\s-]?year(?:ly)?)\s+(?:report|summary|review|update)\b/i,
  /\b(?:report|summary|summarise|summarize|write\s+up|roundup|round[\s-]up)\s+(?:of|for|on)\s+(?:the\s+|this\s+|last\s+|our\s+)?(?:quarter|year|q[1-4])\b/i,
  /\b(?:summarise|summarize|sum\s+up)\s+(?:the\s+|this\s+|last\s+|our\s+)?(?:quarter|year)\b/i,
  /\bwhat\s+(?:did\s+we|have\s+we)\s+(?:get\s+done|achieve|do)\s+(?:this|last)\s+(?:quarter|year)\b/i,
];

export interface APeriod { from: Date; to: Date; said: string; kind: 'quarter' | 'year' }

const MONTHS_OF = (q: number) => [0, 3, 6, 9][q];

/** The quarter or the year asked about, as calendar months, defaulting to the quarter now under way. */
export function thePeriodAskedAbout(message: string, now: Date): APeriod {
  const t = (message ?? '').toLowerCase();
  const y = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3);
  const explicit = /\bq([1-4])\b(?:\s*(20\d\d))?/.exec(t);
  const yearWord = /\b(annual|yearly|year[\s-]?end|(?:this|last|the|our)\s+year)\b/.test(t) && !/\bquarter/.test(t);
  if (yearWord) {
    const year = /\blast\s+year\b/.test(t) ? y - 1 : y;
    return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1)), said: `${year}`, kind: 'year' };
  }
  let qi = q; let year = y;
  if (explicit) { qi = Number(explicit[1]) - 1; year = explicit[2] ? Number(explicit[2]) : y; }
  else if (/\blast\s+quarter\b/.test(t)) { qi = q - 1; if (qi < 0) { qi = 3; year = y - 1; } }
  const from = new Date(Date.UTC(year, MONTHS_OF(qi), 1));
  const to = new Date(Date.UTC(year, MONTHS_OF(qi) + 3, 1));
  return { from, to, said: `Q${qi + 1} ${year}`, kind: 'quarter' };
}

export interface APeriodPartOne {
  label: string;
  /** Rounds finished in the period, and how many people took part across them. */
  roundsFinished: number;
  peopleTookPart: number;
  /** The board's own sentence on how it is going, or null. */
  summary: string | null;
  /** What is written in References and resources for everyone: rules and decisions. */
  rulesWritten: number;
  decisionsOpen: number;
}

export interface APeriodReportFacts {
  period: APeriod;
  parts: APeriodPartOne[];
  /** The Company page as this reader may read it, already in words, or null if they may not read it. */
  desk: string | null;
}

export const NOTHING_TO_REPORT_FROM = (said: string) =>
  `There is no check-in you can read to report on for ${said}. A check-in you run, or that your organisation lets you read, gives me something to write from.`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const full = (s: string) => { const t = String(s ?? '').trim(); return /[.!?]["”']?$/.test(t) ? t : `${t}.`; };

export function aPeriodReportSaid(f: APeriodReportFacts): string {
  const kindWord = f.period.kind === 'year' ? 'annual' : 'quarterly';
  const out: string[] = [`Here is your ${kindWord} report for ${f.period.said}, written from what is on record for the check-ins you can read.`];
  for (const p of f.parts) {
    const lines: string[] = [];
    if (p.roundsFinished > 0) lines.push(`${plural(p.roundsFinished, 'round was', 'rounds were')} finished in this time, with ${plural(p.peopleTookPart, 'person', 'people')} taking part.`);
    else lines.push('No round was finished in this time.');
    if (p.summary) lines.push(full(p.summary));
    if (p.rulesWritten > 0 || p.decisionsOpen > 0) {
      const bits: string[] = [];
      if (p.rulesWritten > 0) bits.push(`${plural(p.rulesWritten, 'rule is', 'rules are')} written down for everyone`);
      if (p.decisionsOpen > 0) bits.push(`${plural(p.decisionsOpen, 'decision is', 'decisions are')} still open`);
      lines.push(`In References and resources, ${bits.join(' and ')}.`);
    }
    out.push(`${p.label}. ${lines.join(' ')}`);
  }
  if (f.desk) out.push(`On the Desk, ${f.desk.replace(/^./, (c) => c.toLowerCase())}`);
  const names = f.parts.map((p) => `"${p.label}"`);
  out.push(`This comes from the finished check-ins and boards of ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}${f.desk ? ', from the Desk,' : ''} and from References and resources.`);
  return out.join('\n\n');
}

import { readTheCompanyPage } from '../grounds/company.service';

/**
 * The Company page (the Desk) as this reader may read it, in one sentence, or null where they may not read it or it has nothing.
 * The same read the Company page and the "company priorities" lane use, so nothing here is a second reading of it.
 */
export async function theDeskInOneSentence(prisma: any, grounds: any, reader: { userId: string | null; email?: string; organizationId: string; role: string }): Promise<string | null> {
  if (!reader.userId) return null;
  try {
    const page: any = await readTheCompanyPage(prisma, grounds, { userId: reader.userId, email: reader.email ?? '', organizationId: reader.organizationId, role: reader.role });
    const titles: string[] = (page.priorities ?? []).map((p: any) => String(p.title ?? '').trim()).filter(Boolean);
    if (!titles.length) return null;
    const named = titles.map((t) => `"${t}"`);
    return `the company’s priorities are ${named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : named[0]}.`;
  } catch {
    return null;
  }
}
