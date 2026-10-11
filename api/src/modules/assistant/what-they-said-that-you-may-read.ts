/**
 * "WHAT DID FEMI SAY LAST WEEK?" IS ANSWERED WITH WHAT THIS READER MAY ALREADY READ OF FEMI'S WORDS,
 * AND NOTHING WIDER (week 17).
 *
 * THE WHOLE SAFETY OF IT IS THAT THIS FILE READS NOTHING ABOUT A PERSON ITSELF. It lists the
 * check-ins the reader may read at all (the one rule in who-may-read-this-check-in, so an admin with
 * no access to a performance plan gets nothing from it), and for each asks the report for the round
 * AS THAT READER (`ReportsService.sessionReport` with the reader's own user id). That read already
 * decides, for this reader and this check-in:
 *
 *   - whether another person's own lines are served at all (before release they are walled, and in
 *     an evaluation check-in a colleague's exact words go only to the manager);
 *   - whether a person is named, or is "a colleague";
 *   - what the report says of them in its own words.
 *
 * So Femi's lines are quoted word for word only when that read serves them to this reader; otherwise
 * what the report says is given; otherwise "I cannot show you that." The sentence is the same
 * whether Femi has said nothing or has said something this reader may not read, so the answer never
 * tells somebody that a check-in they cannot read exists.
 *
 * WHAT IS NEVER OPENED HERE: Femi's own report, the questions anybody put to Ask Groundwork, a
 * lead's private notes, the lead's judgement, or how many check-ins Femi is in. There is no query
 * against those tables in this file, and a test reads this file's source to keep it that way.
 */
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { whatTheyMayRead } from '../grounds/who-may-read-this-check-in';
import { quotedThenEnding } from './a-quote-takes-no-second-mark';
import { aCheckInSource } from './a-source-says-where-it-came-from';
import { Reply, SourceBlock, rules, text } from './a-reply-is-a-payload-not-a-string';
import { WHAT_THEY_SAID_OPENS_WHEN_SHARED } from '../reports/the-session-report';

export const I_CANNOT_SHOW_YOU_THAT = 'I cannot show you that.';

/** How many check-ins, and how many rounds of each, are looked at. A question about last week does not read a year. */
const CHECK_INS_LOOKED_AT = 12;
const ROUNDS_LOOKED_AT = 2;
/** How many check-ins one answer reads out. */
const ENTRIES_READ_OUT = 3;

export type Window = 'today' | 'yesterday' | 'this_week' | 'last_week' | null;

/** The days each way of saying "when" reaches back. "Last week" is fourteen days because it is said loosely. */
const DAYS_BACK: Record<Exclude<Window, null>, number> = { today: 1, yesterday: 2, this_week: 7, last_week: 14 };

export function whenTheyAsked(message: string): Window {
  const m = (message ?? '').toLowerCase();
  if (/\blast\s+week\b/.test(m)) return 'last_week';
  if (/\bthis\s+week\b/.test(m)) return 'this_week';
  if (/\byesterday\b/.test(m)) return 'yesterday';
  if (/\btoday\b/.test(m)) return 'today';
  return null;
}

const SAID_OF_WINDOW: Record<Exclude<Window, null>, string> = {
  today: 'today', yesterday: 'yesterday', this_week: 'this week', last_week: 'last week',
};

/** The words of the name the reader typed, without any word that is about when. */
export function theNameAsked(subject: string | undefined): string {
  return (subject ?? '')
    .replace(/[?.!,]+$/g, '')
    .replace(/['’]s$/i, '')
    .replace(/\b(?:last|this)\s+week\b|\byesterday\b|\btoday\b/gi, '')
    .trim();
}

/**
 * THE SUBJECT THE READER ASKED ABOUT, when they named one: "What did Amani say about pricing approvals?" is about
 * pricing approvals (B-125). Nothing is returned when no subject was named, or when what follows "about" is only a
 * word about when ("last week"), so the question that names nobody's subject is answered as before.
 */
const NOT_A_SUBJECT = new Set(['the', 'a', 'an', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'those', 'these', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with', 'last', 'week', 'today', 'yesterday', 'recently', 'lately', 'earlier', 'check', 'checkin', 'session', 'time', 'it', 'them', 'things', 'thing']);
const stemOf = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/s$/, ''));
export function theSubjectAsked(message: string): { said: string; stems: string[] } | null {
  const m = /\babout\s+(.+?)\s*[?.!]*\s*$/i.exec(message ?? '');
  if (!m) return null;
  const said = m[1].replace(/\b(?:last|this)\s+week\b|\byesterday\b|\btoday\b/gi, '').replace(/\s+/g, ' ').trim();
  const stems = said.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3 && !NOT_A_SUBJECT.has(w)).map(stemOf);
  return stems.length ? { said, stems } : null;
}
const aboutIt = (line: string, stems: string[]) => { const l = line.toLowerCase(); return stems.some((s) => l.includes(s)); };

const lower = (s: string) => s.toLowerCase().replace(/[’]/g, "'");

/** A served name matches what was typed when every word typed starts a word of the name. "Femi" finds "Femi Adeyemi". */
export function nameMatches(served: string, asked: string): boolean {
  const have = lower(served).split(/\s+/).filter(Boolean);
  const want = lower(asked).split(/\s+/).filter(Boolean);
  if (!want.length || !have.length) return false;
  return want.every((w) => have.some((h) => h === w || (w.length >= 2 && h.startsWith(w))));
}

export interface AReaderAsking {
  userId: string | null;
  organizationId: string;
  role: string | null;
}

export interface WhatItReads {
  ground: {
    findMany(args: any): Promise<any[]>;
  };
  checkIn: { findMany(args: any): Promise<any[]> };
  person: { findMany(args: any): Promise<any[]> };
}

export interface TheServedRounds {
  sessionReport(groundId: string, sessionNumber: number, requestingUserId: string, requestingUserOrgId?: string): Promise<any>;
}

interface Found {
  groundId: string;
  label: string;
  sessionNumber: number;
  on: Date | null;
  row: { who: string; isYou: boolean; lines?: string[]; saying?: string; finding?: string };
}

/** The check-ins this reader may read at all, by the one rule. Nothing else is looked at. */
export async function checkInsTheyMayRead(db: WhatItReads, reader: AReaderAsking & { userId: string }) {
  const grounds = await db.ground.findMany({
    where: { organizationId: reader.organizationId },
    select: {
      id: true, label: true, organizationId: true, scenario: true, initiatorId: true, createdByUserId: true,
      participants: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  /* A lead reads the check-ins run from their own department (who-may-read-this-check-in). The department is the only
     thing asked of the people list here, and only for a lead. */
  const departments = new Map<string, string | null>();
  if (reader.role === 'LEAD') {
    const ids = [reader.userId, ...grounds.map((g) => g.initiatorId).filter(Boolean)];
    const people = await db.person.findMany({
      where: { organizationId: reader.organizationId, linkedUserId: { in: ids } },
      select: { linkedUserId: true, department: true },
    });
    for (const p of people) departments.set(p.linkedUserId, p.department?.trim() || null);
  }

  const viewer = { userId: reader.userId, role: reader.role, organizationId: reader.organizationId, department: departments.get(reader.userId) ?? null };
  return grounds
    .filter((g) => whatTheyMayRead(reader.userId, viewer, { ...g, leadDepartment: g.initiatorId ? departments.get(g.initiatorId) ?? null : null }) !== null)
    .slice(0, CHECK_INS_LOOKED_AT);
}

/** The latest rounds of a check-in that somebody finished, newest first, each with the day it was finished. */
export async function latestRounds(db: WhatItReads, groundId: string): Promise<{ sessionNumber: number; on: Date | null }[]> {
  const rows = await db.checkIn.findMany({
    where: { groundId, status: 'COMPLETED' },
    select: { sessionNumber: true, completedAt: true },
    orderBy: { sessionNumber: 'desc' },
    take: 60,
  });
  const byRound = new Map<number, Date | null>();
  for (const r of rows) {
    const at = r.completedAt ? new Date(r.completedAt) : null;
    const seen = byRound.get(r.sessionNumber);
    if (seen === undefined || (at && (!seen || at > seen))) byRound.set(r.sessionNumber, at);
  }
  return [...byRound.entries()].map(([sessionNumber, on]) => ({ sessionNumber, on })).sort((a, b) => b.sessionNumber - a.sessionNumber).slice(0, ROUNDS_LOOKED_AT);
}

export async function whatSomeoneSaid(
  deps: { db: WhatItReads; reports: TheServedRounds | undefined },
  reader: AReaderAsking,
  subject: string | undefined,
  message: string,
  now: Date = new Date(),
): Promise<Reply> {
  const lane = 'what_did_they_say';
  const asked = theNameAsked(subject);
  const nothing = rules(lane, text(asked ? `${I_CANNOT_SHOW_YOU_THAT} I have nothing from ${asked} in the check-ins you can read.` : `${I_CANNOT_SHOW_YOU_THAT} Tell me whose words you mean.`));
  if (!asked || !reader.userId || !deps.reports) return nothing;

  const asker = { ...reader, userId: reader.userId };
  const subjectAsked = theSubjectAsked(message);
  const found: Found[] = [];
  for (const g of await checkInsTheyMayRead(deps.db, asker)) {
    for (const round of await latestRounds(deps.db, g.id)) {
      let served: any;
      try {
        served = await deps.reports.sessionReport(g.id, round.sessionNumber, asker.userId, asker.organizationId);
      } catch {
        /* The served read refused this reader or could not be made: it is not theirs to read, and nothing is said about why. */
        continue;
      }
      for (const row of Array.isArray(served?.whatEachPersonSaid) ? served.whatEachPersonSaid : []) {
        if (!row || typeof row.who !== 'string' || !nameMatches(row.who, asked)) continue;
        const allLines = Array.isArray(row.lines) ? row.lines.filter((l: unknown) => typeof l === 'string' && l.trim()) : [];
        /* Only what was said about the subject asked about, where one was named (B-125); a round with nothing on it is left out. */
        const lines = subjectAsked ? allLines.filter((l: string) => aboutIt(l, subjectAsked.stems)) : allLines;
        if (subjectAsked && allLines.length && !lines.length) continue;
        const saying = typeof row.saying === 'string' && row.saying.trim() ? row.saying.trim() : undefined;
        const finding = typeof row.finding === 'string' && row.finding.trim() ? row.finding.trim() : undefined;
        if (!lines.length && !saying && !finding) continue;
        found.push({ groundId: g.id, label: g.label, sessionNumber: round.sessionNumber, on: round.on, row: { who: row.who, isYou: !!row.isYou, lines, saying, finding } });
      }
    }
  }
  if (!found.length) {
    /* Said as the same refusal whether nothing was said about it or it is not theirs to read (the answer never shows a check-in they cannot read exists). */
    return subjectAsked ? rules(lane, text(`${I_CANNOT_SHOW_YOU_THAT} I have nothing from ${asked} about ${subjectAsked.said} in the check-ins you can read.`)) : nothing;
  }

  const people = [...new Set(found.map((f) => f.row.who))];
  if (people.length > 1) {
    return rules(lane, text(`More than one person matches ${asked}: ${people.join(' and ')}. Which do you mean?`));
  }

  /*
   * THE NEWEST ROUND OF EACH CHECK-IN, NEWEST FIRST, AT MOST THREE. Somebody in two check-ins with the
   * same person asked about one person, not one check-in, and is told about both. When they named a
   * time, only rounds inside it are read out; if there are none, the newest one is given, dated, after
   * a sentence saying that nothing fits what they asked.
   */
  const newestOfEach = new Map<string, Found>();
  for (const f of found) {
    const seen = newestOfEach.get(f.groundId);
    if (!seen || f.sessionNumber > seen.sessionNumber) newestOfEach.set(f.groundId, f);
  }
  const ordered = [...newestOfEach.values()].sort((a, b) => (b.on?.getTime() ?? 0) - (a.on?.getTime() ?? 0));
  const window = whenTheyAsked(message);
  const inTime = window ? ordered.filter((f) => f.on && now.getTime() - f.on.getTime() <= DAYS_BACK[window] * 86_400_000) : ordered;
  const chosen = (inTime.length ? inTime : ordered.slice(0, 1)).slice(0, ENTRIES_READ_OUT);

  const parts: string[] = [];
  const sources: SourceBlock[] = [];
  if (window && !inTime.length) {
    const who = chosen[0].row.isYou ? 'you' : chosen[0].row.who;
    parts.push(`I cannot find anything ${who} said ${SAID_OF_WINDOW[window]} in a check-in you can read. The most recent I can show you is below.`);
  }
  for (const f of chosen) {
    const whose = f.row.isYou ? null : f.row.who;
    const source = aCheckInSource({ whose, on: f.on, label: f.label, groundId: f.groundId, sessionNumber: f.sessionNumber });
    const at = f.on ? ` of ${whenItWas(f.on, 'dayAndMonthLong')}` : '';
    const inIt = `${whose ? 'their' : 'your'} check-in${at} on ${f.label}`;
    const entry: string[] = [];
    if (f.row.lines?.length) {
      entry.push(`Here is what ${f.row.isYou ? 'you' : f.row.who} said in ${inIt}.`);
      entry.push(f.row.lines.map((l) => `- ${quotedThenEnding(l)}`).join('\n'));
    } else {
      /* Not served as words to this reader: the report's own sentence, or the wall's, and never a guess at what was said. */
      if (f.row.saying === WHAT_THEY_SAID_OPENS_WHEN_SHARED) {
        /* The wall before the team's report is shared: said once, by name, as it is (user journeys, F-12). Not "nothing specific enough to record", which is untrue, and not twice. */
        const named = /^\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)+$/u.test(f.row.who) && !/^(?:Participant|The)\b/.test(f.row.who) ? f.row.who.split(/\s+/)[0] : f.row.who;
        entry.push(`${named}'s words open to you when the team's report is shared.`);
      } else {
        entry.push(`I cannot show you ${f.row.who}'s words from ${inIt}.`);
        if (f.row.saying) entry.push(f.row.saying);
      }
      if (f.row.finding) entry.push(`What the report says: ${f.row.finding}`);
    }
    /*
     * "THIS IS ABOUT", NOT "THIS IS FROM", WHERE THE WORDS ARE NOT SHOWN (B-168). Esther was told "Kwesi's words open to you when the team's report is
     * shared." and, on the next line, "This is from Kwesi Boateng's check-in of 26 September ...", which reads as if those words had just been shown.
     */
    const shown = source.kind === 'check_in' && !!f.row.lines?.length;
    const theSource = shown ? source : { ...source, says: `This is about ${source.label}.` };
    entry.push(theSource.says);
    parts.push(entry.join('\n'));
    sources.push(theSource);
  }
  return rules(lane, text(parts.join('\n\n')), ...sources);
}
