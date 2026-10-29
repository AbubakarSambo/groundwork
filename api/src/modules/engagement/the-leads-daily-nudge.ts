import { theInvoicesLateToRaiseFor } from '../board/raising-invoices-on-time';
import { rebuildThePersonsRecords } from '../board/the-persons-record-store';
import { theFeeNotesThatFellDueOnAnEvent } from '../board/a-fee-note-that-fell-due-said-to-the-lead';
import { theNewsThesePromisesWaitOn, type TheNewsGiven } from './a-promise-that-waits-on-news';
import { theSalesMorning } from './the-sales-morning-from-the-record';
import { withWhatTheBoardsSay, type TheLeadsBoard, type TheRecordBesideTheBoard } from './the-summary-reads-the-board';
import { DependencyStatus, GroundStatus } from '@prisma/client';
import { whichOfThesePromisesAreDone, whoThesePromisesAreAbout } from '../conversation/a-promise-said-done-is-kept';
import { theDealsThatHaveStalled } from '../board/the-deals-that-have-stalled';
import { theConfirmedWaits, whatTheyTriedInFull, theNoteBesideTheClaim } from '../grounds/a-wait-is-the-speakers-account';
import { theReleaseOneSalesBoardIsOn } from '../board/release-one-sales-board';
import { A_GROUND_NO_MESSAGE_IS_ABOUT, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';
import { organisationsThatTurnedWhatsAppOn } from '../whatsapp/only-where-whatsapp-is-turned-on';
import { A_TEMPLATE_BODY_LIMIT, TEMPLATES, oneLine, NOT_TODAY, THEY_SAID_NOT_NOW, NOT_TURNED_ON_QUIETLY } from '../whatsapp/a-message-outside-the-window';
import { ITS_OWN_WORDS_AT_MOST } from '../whatsapp/the-first-message-to-a-number';
import { whatWaitsForYouToDecide, type TheBoards } from '../suites/what-waits-for-you-to-decide';
import { whatWaitsInASentence } from '../whatsapp/the-leads-daily-summary';
import { THEY_HAD_ONE_TODAY } from './one-routine-message-a-day';
import { theirApprovedLeave, fallsInLeave, whoOnACheckInIsAway } from '../suites/who-is-away';
import { theirRosterEntry } from '../suites/a-roster-entry-and-its-sign-in';
import { isAWorkingDay } from '../grounds/which-days-this-team-works';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { theDayIn } from '../grounds/when-a-handoff-is-due';
import { totalSessionsFor } from '../grounds/session-count';
import { whereThisTargetStands, theDirectionToReadIn } from '../board/the-headline-and-where-each-target-stands';
import { asADirection, theDayItIsDue } from '../board/an-aim-or-a-limit';
import { aDateOnly } from '../board/the-day-in-words';
import { blockerHasSubstance, dedupeDependencies } from '../board/reads';
import { withoutTheWaitsOnCustomers } from '../board/a-customers-reply-is-on-its-deal';
import { oneBlockerPerThingWaitedOn, theyNamedWhatTheyAreWaitingOn } from '../board/a-blocker-with-nothing-in-it-is-the-same-blocker';
import { startsWithAPronoun } from '../grounds/a-blocker-that-says-her-or-his';
import { theWaitSaid } from '../board/a-wait-said-in-full';
import { BILL, theBillThisWaitIsPaidOn } from '../board/the-collections-record';
import { aHolderSaidWithWhose } from '../board/a-holder-in-their-own-words';
import { ESCALATE_AFTER_DAYS } from '../webhooks/a-handoff-that-has-sat-too-long';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { nameToCall, SOMEONE } from './a-name-to-call-them';
import { aNumberInWords } from './a-number-in-words';
import { theEngagementMoment } from './the-engagement-release-moment';
import { theQuietIn, quietIn } from './who-has-gone-quiet';
import { whoHasMissedCheckIns, whatTheLeadReads, TOLD_THE_LEAD } from '../grounds/missed-check-ins';
import { isAlreadyHeld, hasBeenToldOnce, nowToldOnce } from './a-message-sent-once';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { theDirectMorningFor, theParagraph, theEmailParts, theSubject, type TheDirectMorning } from './the-direct-morning';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';

/**
 * THE LEAD'S DAILY NUDGE ABOUT WHAT IS OUTSTANDING (decision 120).
 *
 * Every lead, automatically, with no setting. Once each morning, and only when something is outstanding. On WhatsApp if the lead has a number and WhatsApp is on for
 * them, otherwise by email. It is the lead's one routine message that day and it never adds a second: it takes the place of the WhatsApp daily summary, and because it goes
 * early in the morning the one-a-day rule (decision 109 item 6) holds back the "has not started" email and the other routine mail that day. Approvals that go straight
 * away are a separate message by decision 92 and stay one.
 *
 * Three parts, most important first, at most three lines each, then a link to see everything:
 *   "Needs you": what waits for the lead to approve, a decision she owes, and her own commitments that are overdue.
 *   "Overdue on your team": who, what and how late, the most overdue first.
 *   "Risks": a target that is behind, a wait that has gone on too long, a check-in where people have gone quiet.
 * Only what the lead may read, as a plain fact about one thing, never a comparison between people and never a label on a person. Nothing a person said in a check-in
 * that is kept in the app goes to a phone. When nothing is outstanding, nothing is sent.
 */
export const NUDGE_SENDER = 'sendTheLeadsDailyNudge';
export const NUDGE_KIND = 'lead-summary';
const DAY = 86_400_000;
const AT_MOST = 3;

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const quoted = (x: string) => `“${x.replace(/[.\s]+$/, '')}”`;
const sentence = (s: string) => (/[.!?][”"’)]?$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** One thing that is outstanding, said as a full sentence. `late` orders the overdue ones; `keptInTheApp` keeps it off a phone. */
export interface AThingOutstanding {
  text: string;
  late?: number;
  /** Within "Needs you": what waits for her to approve comes first (0), then a decision she owes (1), then her own commitments that are late (2). */
  group?: number;
  keptInTheApp?: boolean;
  /** The check-in it is about. Said (" in \u201cSales team, Q3\u201d" at the {in} mark) only when the lead is being told about more than one. */
  place?: string;
  /** The check-in it comes from, and how many days past its day it is, so a long-overdue item can be left out for a check-in made before the release (decision 121, item 6). */
  groundId?: string;
  daysOverdue?: number;
  /** For a wait or blocker with no day of its own: how many days it has been open, so one more than a month old can be left out for a check-in made before the release (decision 121, item 6). */
  daysOpen?: number;
  /**
   * WHAT IT IS ABOUT, for a screen to match it against its own rows by the thing and not by its words (request 205). `kind` is one of
   * `wait`, `decision`, `promise`, `requests`, `plan-decision`, `target`, `quiet`; `ids` are the ids of the records it is about (a wait's or a
   * promise's own id, or `leave:<id>`, `hours:<ref>`, `spend:<id>` for each request that waits for her).
   */
  about?: { kind: string; ids: string[] };
  /** Said in the daily message once only (decision 136: once per run of missed check-ins, and once again at each next step). Today's page keeps it while it is true. */
  onceKey?: string;
  /** Who is waiting, for a decision she owes; who a promise of hers is owed to, and its day in words: so her promise and the decision it answers are one item (item 14). Never said. */
  from?: string | null;
  owedTo?: string | null;
  dueSaid?: string;
  /** For a wait: what is waited for, as it was said, so the board's sentence about the same wait is not said again (the-summary-reads-the-board). Never said. */
  waitFor?: string;
}

const THE_PLACE_MARK = '{in}';
/** The same, at the front of a sentence ("In \u201cRenewal push\u201d, Pia said ..."). */
const THE_PLACE_FIRST = '{In}';

/** Puts the check-in's name where {in} stands when, and only when, the things told are about more than one check-in. */
export function withPlacesWhereTheyTellApart(o: WhatIsOutstanding): WhatIsOutstanding {
  const all = [...o.needsYou, ...o.overdueOnYourTeam, ...o.risks];
  const several = new Set(all.map((t) => t.place).filter(Boolean)).size > 1;
  const say = (t: AThingOutstanding): AThingOutstanding => {
    const named = several && t.place;
    /* At the front, "You" is "you" after the name of the check-in. */
    const text = t.text.replace(THE_PLACE_FIRST + 'You ', named ? `In ${quoted(t.place!)}, you ` : 'You ').split(THE_PLACE_FIRST).join(named ? `In ${quoted(t.place!)}, ` : '');
    return { ...t, text: text.split(THE_PLACE_MARK).join(named ? ` in ${quoted(t.place!)}` : '') };
  };
  return { ...o, needsYou: o.needsYou.map(say), overdueOnYourTeam: o.overdueOnYourTeam.map(say), risks: o.risks.map(say), ...(o.dueToday ? { dueToday: o.dueToday.map(say) } : {}) };
}

export interface TheAbout { kind: string; ids: string[]; groundId?: string }

export interface WhatIsOutstanding {
  needsYou: AThingOutstanding[];
  overdueOnYourTeam: AThingOutstanding[];
  risks: AThingOutstanding[];
  /**
   * ON A SALES CHECK-IN WITH RELEASE 1'S SWITCH ON (quality pass, 18 October, M-1 and M-3): what is due today and tomorrow, said after what
   * needs her, and "Needs you" opened with how many things need her ("Two things need you today."). Absent everywhere else.
   */
  dueToday?: AThingOutstanding[];
  saidAsACount?: boolean;
  /**
   * Release 1's sales board is on for the lead's organisation (release-one-sales-board). Only then are the lines chosen part by part
   * and the subject's counts said in one form; off, the message is put together as before. Never said.
   */
  releaseOne?: boolean;
}

export const theseAreOutstanding = (o: WhatIsOutstanding): boolean => o.needsYou.length + o.overdueOnYourTeam.length + o.risks.length + (o.dueToday ?? []).length > 0;

/** The same facts without anything from a check-in kept in the app: what a phone may be given. */
export const theseForAPhone = (o: WhatIsOutstanding): WhatIsOutstanding => ({
  ...o,
  ...(o.dueToday ? { dueToday: o.dueToday.filter((t) => !t.keptInTheApp) } : {}),
  needsYou: o.needsYou.filter((t) => !t.keptInTheApp),
  overdueOnYourTeam: o.overdueOnYourTeam.filter((t) => !t.keptInTheApp),
  risks: o.risks.filter((t) => !t.keptInTheApp),
});

/** At most three lines. When there are more, the third says how many are not listed. */
export function atMostThreeLines(things: AThingOutstanding[]): string[] {
  const lines = things.map((t) => sentence(t.text.split(THE_PLACE_FIRST).join('').split(THE_PLACE_MARK).join('')));
  if (lines.length <= AT_MOST) return lines;
  const left = lines.length - (AT_MOST - 1);
  return [...lines.slice(0, AT_MOST - 1), `${capital(aNumberInWords(left))} more are not listed here.`];
}

export interface TheNudgeParts {
  needsYou: string[];
  overdueOnYourTeam: string[];
  risks: string[];
}

export const theNudgeParts = (o: WhatIsOutstanding): TheNudgeParts => ({
  needsYou: atMostThreeLines(o.needsYou),
  overdueOnYourTeam: atMostThreeLines(o.overdueOnYourTeam),
  risks: atMostThreeLines(o.risks),
});

const HEADINGS = { needsYou: 'Needs you', overdueOnYourTeam: 'Overdue on your team', risks: 'Risks' } as const;

/** The email's subject: how many things, in each part, as a plain fact. */
export function theNudgeSubject(o: WhatIsOutstanding): string {
  const bits: string[] = [];
  const n = o.needsYou.length;
  const t = o.overdueOnYourTeam.length;
  const r = o.risks.length;
  /* One sentence, its counts in one form (Drop Access run 1, item 20), where Release 1's switch is on; off, as before. */
  const said = o.releaseOne && [n, t, r].some((x) => x > 10) ? (x: number) => String(x) : aNumberInWords;
  if (n) bits.push(`${said(n)} ${n === 1 ? 'thing needs' : 'things need'} you`);
  if (t) bits.push(`${said(t)} ${t === 1 ? 'is' : 'are'} overdue on your team`);
  if (r) bits.push(`${said(r)} ${r === 1 ? 'risk is' : 'risks are'} open`);
  const joined = bits.length < 2 ? bits.join('') : `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
  return capital(joined);
}

/**
 * The message as an ordinary WhatsApp message, for a lead who wrote to Groundwork in the last 24 hours: each part on its own, each line on its own line.
 */
export function theWindowForm(firstName: string | null | undefined, o: WhatIsOutstanding, link: string): string {
  const p = theNudgeParts(o);
  const blocks: string[] = [`Good morning ${firstName?.trim() || 'there'}. Here is what is outstanding today.`];
  for (const key of ['needsYou', 'overdueOnYourTeam', 'risks'] as const) {
    if (p[key].length) blocks.push([HEADINGS[key], ...p[key]].join('\n'));
    if (key === 'needsYou' && (o.dueToday ?? []).length) blocks.push(['Due today and tomorrow', ...atMostThreeLines(o.dueToday!)].join('\n'));
  }
  blocks.push(`You can see everything here ${link}`);
  return blocks.join('\n\n');
}

/**
 * {{2}} of `lead_daily_summary`, unchanged as a template: ONE paragraph with no line break, in whole sentences, most important first, short enough that the whole message
 * fits in the 1,024 characters Meta allows. What does not fit is left out whole, never cut in the middle, and the last sentence says there is more.
 */
export function theTemplateParagraph(firstName: string | null | undefined, o: WhatIsOutstanding, link: string): { params: string[]; text: string } {
  const body = TEMPLATES[NUDGE_KIND].body;
  const first = firstName?.trim() || 'there';
  const fixed = body.replace(/\{\{\d+\}\}/g, '').length + oneLine(first).length + oneLine(link).length;
  const more = 'There is more, and the link shows all of it.';
  /* The whole message must fit inside Meta's 1,024 characters, and also inside the 800 the very first message to a number may carry (decision 106 item 2), or its end, with the link, would be cut. */
  const room = Math.min(A_TEMPLATE_BODY_LIMIT, ITS_OWN_WORDS_AT_MOST) - fixed - 4;
  const p = theNudgeParts(o);
  const lead: Record<keyof TheNudgeParts | 'dueToday', string> = {
    /* Quality pass, 18 October, M-1: on a sales check-in with Release 1's switch on, "Two things need you today." in place of "These need you." */
    needsYou: o.saidAsACount ? `${capital(aNumberInWords(o.needsYou.length))} ${o.needsYou.length === 1 ? 'thing needs' : 'things need'} you today.` : 'These need you.',
    overdueOnYourTeam: 'These are overdue on your team.',
    risks: 'These are risks.',
    /* What is due says its own day ("Tomorrow, ..."), so it has no opening of its own (M-3). */
    dueToday: '',
  };
  /*
   * EVERY PART GETS ITS FIRST LINE BEFORE ANY PART GETS ITS SECOND (Drop Access run 1, item 15). The lines were taken part by part,
   * and "These need you" and "These are overdue on your team" used the room every morning, so "These are risks" never once appeared in
   * ten days. Lines are now chosen first line of each part, then second lines, then third, while they fit; they are still said part by
   * part, most important first.
   */
  const KEYS = ['needsYou', 'dueToday', 'overdueOnYourTeam', 'risks'] as const;
  const lines: Record<(typeof KEYS)[number], string[]> = { needsYou: [], dueToday: [], overdueOnYourTeam: [], risks: [] };
  const parts: Record<(typeof KEYS)[number], string[]> = { ...p, dueToday: atMostThreeLines(o.dueToday ?? []) };
  let left = false;
  for (const key of KEYS) {
    for (const line of parts[key]) {
      /* "Three more are not listed here" is for the message with lines; this one has its own closing sentence. */
      if (/ more are not listed here\.$/.test(line)) { left = true; continue; }
      lines[key].push(oneLine(line));
    }
  }
  const chosen: Record<(typeof KEYS)[number], string[]> = { needsYou: [], dueToday: [], overdueOnYourTeam: [], risks: [] };
  let used = 0;
  const deepest = Math.max(...KEYS.map((k) => lines[k].length));
  if (o.releaseOne) {
    for (let i = 0; i < deepest; i += 1) {
      for (const key of KEYS) {
        const line = lines[key][i];
        if (!line) continue;
        const add = `${chosen[key].length || !lead[key] ? '' : `${lead[key]} `}${line}`;
        /* Keep room for the closing sentence whenever something has to be left out. */
        if (used + add.length + 1 > room - more.length - 1) { left = true; continue; }
        chosen[key].push(line);
        used += add.length + 1;
      }
    }
  } else {
    /* Without Release 1's switch, as before: part by part, and nothing more once a line does not fit. */
    outer: for (const key of KEYS) {
      for (const line of lines[key]) {
        const add = `${chosen[key].length || !lead[key] ? '' : `${lead[key]} `}${line}`;
        if (used + add.length + 1 > room - more.length - 1) { left = true; break outer; }
        chosen[key].push(line);
        used += add.length + 1;
      }
    }
  }
  const pieces = KEYS.flatMap((key) => chosen[key].map((line, i) => `${i || !lead[key] ? '' : `${lead[key]} `}${line}`));
  const paragraph = [...pieces, ...(left ? [more] : [])].join(' ');
  const params = [first, paragraph, link];
  return { params, text: body.replace(/\{\{(\d+)\}\}/g, (_m, n) => params[Number(n) - 1] ?? '') };
}

/** A commitment is "said" when it is stored in the person's own first-person words ("I will chase legal on Monday"), and "committed to" when it is the thing itself ("send the supplier list"). */
const FIRST_PERSON = /\b(?:i|i[\u2019']\w+|me|my|mine|myself|we|we[\u2019']\w+|our|ours)\b/i;
const theyCommitted = (who: string, text: string) => (FIRST_PERSON.test(text.trim()) ? `${who} said ${quoted(text.trim())}` : `${who} committed to ${quoted(text.trim())}`);

/**
 * ONLY A WAIT THAT READS AS A SENTENCE IS TOLD (found on a copy of an existing client's data, 8 October). A wait is kept as the person said it, and said that way in a
 * message to somebody else it read "Segun has been waiting on Amaka and Chidinma's decision for in writing whether the 30 September close is mine", "Aisha has been
 * waiting on funding for funding for the solar", and "has been waiting on whoever needs to make the connection clear for how this connects to anything". So a wait is
 * told only when the person named what they wait for, said it in nobody's first person and not as "her" or "his", named who holds it, and the thing is not the holder said
 * again. Anything else is still on the board, where the person's own words stand with the rest of what they said.
 */
const THE_WORDS = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w));
export function aWaitReadsAsASentence(w: { what: string; namedTheThing?: boolean | null; onLabel?: string | null; onParticipant?: unknown }): boolean {
  const what = (w.what ?? '').trim();
  if (!what || what.length > 120) return false;
  if (!theyNamedWhatTheyAreWaitingOn(w as any)) return false;
  if (FIRST_PERSON.test(what) || startsWithAPronoun(what)) return false;
  /* A clause and not a thing ("how this connects to anything", "whether it is mine"), or one that points at something not said ("this", "it", "them"). */
  if (/^(?:how|whether|why|if|when|what)\b/i.test(what) || /\b(?:this|it|them)\b/i.test(what)) return false;
  const holder = (w.onLabel ?? '').trim();
  /* Somebody outside the check-in with no name is not a holder; a person in it is. */
  if (!w.onParticipant && !holder) return false;
  if (!w.onParticipant && holder) {
    const h = THE_WORDS(holder);
    const t = new Set(THE_WORDS(what));
    if (h.length && h.every((x) => t.has(x))) return false;
  }
  return true;
}

const lateWords = (n: number) => (n === 1 ? 'one day late' : `${aNumberInWords(n)} days late`);

/** The days between a day that has passed and today in Lagos. Zero or less is not late. */
const daysLate = (due: Date | string | null | undefined, today: Date): number => {
  const d = aDateOnly(due);
  return d ? Math.round((today.getTime() - d.getTime()) / DAY) : 0;
};
const theDay = (d: Date | string) => whenItWas(aDateOnly(d) ?? new Date(d), 'weekdayAndDay');

const TERMINAL: GroundStatus[] = A_GROUND_NO_MESSAGE_IS_ABOUT;
const HELD: GroundStatus[] = A_GROUND_IS_HELD;
const OPEN_WAIT = [DependencyStatus.BLOCKING, DependencyStatus.WAITING];

const PERSON = {
  userId: true, email: true, nameGiven: true, managingOnly: true, leftAt: true,
  user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } },
};

/**
 * EVERYTHING OUTSTANDING FOR ONE LEAD, from the record, as sentences. Reads only check-ins she runs (and her own commitments), never a check-in about one person's
 * performance, promotion or renewal. A promise a lead wrote for somebody who has not been told is not counted as theirs.
 */
/** More than a month past its day is long overdue (decision 121, item 6). */
export const LONG_OVERDUE_AFTER_DAYS = 30;

/**
 * FOR EXISTING CLIENTS, WHAT IS MORE THAN A MONTH OVERDUE IS LEFT OUT (decision 121, item 6), AND SO IS A WAIT OR BLOCKER OPEN FOR MORE THAN A MONTH. A check-in made before the engagement messages
 * began (the same moment the other engagement messages use) carries a history nobody can act on every morning, so the daily nudge does not
 * open with it. Check-ins made since are untouched, and an item with no day, or with a day not yet a month gone, always stays.
 */
async function leaveOutWhatIsLongOverdueOnOldCheckIns(prisma: any, o: WhatIsOutstanding, release: Date | null): Promise<WhatIsOutstanding> {
  if (!release) return o;
  const long = (t: AThingOutstanding) => !!t.groundId && ((t.daysOverdue ?? 0) > LONG_OVERDUE_AFTER_DAYS || (t.daysOpen ?? 0) > LONG_OVERDUE_AFTER_DAYS);
  const ids = [...new Set([...o.needsYou, ...o.overdueOnYourTeam, ...o.risks].filter(long).map((t) => t.groundId!))];
  if (!ids.length) return o;
  const made: any[] = await prisma.ground.findMany({ where: { id: { in: ids } }, select: { id: true, createdAt: true } }).catch(() => []);
  const old = new Set(made.filter((g) => g.createdAt && new Date(g.createdAt).getTime() < release.getTime()).map((g) => g.id));
  if (!old.size) return o;
  const keep = (t: AThingOutstanding) => !(long(t) && old.has(t.groundId!));
  return { ...o, needsYou: o.needsYou.filter(keep), overdueOnYourTeam: o.overdueOnYourTeam.filter(keep), risks: o.risks.filter(keep) };
}

export async function whatIsOutstandingFor(
  prisma: any,
  lead: { userId: string; organizationId: string; grounds: { id: string; label: string; scenario: any; overWhatsApp: boolean | null; timelineDays: number | null; cadence: any }[] },
  deps: { boards: TheBoards; release: Date | null },
  now: Date,
): Promise<WhatIsOutstanding> {
  /* What Release 1 adds to the summary is read only where its switch is on for her organisation (release-one-sales-board). */
  const releaseOne = await theReleaseOneSalesBoardIsOn(prisma, lead.organizationId).catch(() => false);
  /* With the direct morning on, a missed check-in is the fact, the reason and what to do, and a wait carries what they tried in full rather than "Not backed". */
  const direct = await theDirectMorningIsOn(prisma, lead.organizationId).catch(() => false);
  const out: WhatIsOutstanding = { needsYou: [], overdueOnYourTeam: [], risks: [], ...(releaseOne ? { releaseOne: true } : {}) };
  const today = theDayIn('Africa/Lagos', now);
  const grounds = lead.grounds.filter((g) => !isEvaluationCheckIn(g.scenario));
  const ids = grounds.map((g) => g.id);
  const labelOf = new Map(grounds.map((g) => [g.id, g.label]));
  const kept = (groundId: string) => keptOffThePhone(grounds.find((g) => g.id === groundId));

  /* NEEDS YOU, first: what waits for her to approve. */
  const waiting = await whatWaitsForYouToDecide({ userId: lead.userId, organizationId: lead.organizationId }, deps.boards).catch(() => []);
  const approvals = whatWaitsInASentence(waiting);
  if (approvals) out.needsYou.push({ text: approvals, group: 0, about: { kind: 'requests', ids: waiting.map((w) => `${w.kind}:${w.ref}`) } });

  /* Who is on her check-ins, and what is open on each of them. */
  const mine = ids.length
    ? await prisma.groundParticipant.findMany({ where: { groundId: { in: ids }, partyType: { not: 'INITIATOR' }, leftAt: null }, select: { id: true, groundId: true, ...PERSON } }).catch(() => [])
    : [];
  const people = new Map<string, any>((mine as any[]).map((p) => [p.id, p]));
  const letIn = (p: any) => !!p && !p.managingOnly && !p.leftAt && !isNotLetInYet(p);
  const herself = ids.length
    ? await prisma.groundParticipant.findMany({ where: { groundId: { in: ids }, userId: lead.userId }, select: { id: true, groundId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } }).catch(() => [])
    : [];
  const hers = new Set<string>((herself as any[]).map((p) => p.id));
  /* Her own names, so a promise about her is told to her as "about you" (messages test, fourth run: "Joseph said “I'll speak to her tomorrow” about Grace."). */
  const herNames = new Set<string>((herself as any[]).flatMap((p) => {
    const first = String(p.user?.firstName ?? '').trim();
    const last = String(p.user?.lastName ?? '').trim();
    return [first, `${first} ${last}`.trim(), String(p.nameGiven ?? '').trim()];
  }).filter(Boolean).map((n) => n.toLowerCase()));
  const aboutHer = (who: string | undefined) => (who && herNames.has(who.trim().toLowerCase()) ? 'you' : who);

  /* WHAT HAS NO DAY IS NEVER LATE. Promises with a real date that has passed, hers first. */
  const promises: any[] = await prisma.personObjective.findMany({
    where: {
      status: 'OPEN', kind: { in: ['COMMITMENT', 'TODO'] }, dueDate: { lt: today },
      OR: [
        { participant: { userId: lead.userId, ground: { status: { notIn: [...TERMINAL, ...HELD] }, organizationId: lead.organizationId } } },
        ...(ids.length ? [{ groundId: { in: ids } }] : []),
      ],
    },
    select: { id: true, text: true, dueDate: true, groundId: true, authoredBy: true, seenBySubject: true, participantId: true, owedToParticipantId: true, createdAt: true, participant: { select: { ground: { select: { id: true, label: true, scenario: true, overWhatsApp: true } }, ...PERSON } } },
  }).catch(() => []);
  /* A PROMISE SAID DONE IS NEVER LATE (Drop Access run 1, item 13): by its maker, by the person it was for, or by the wait on its maker
     for the same thing being cleared. Read here from the record too, so a promise the record says is done is never told as overdue. */
  const saidDone = await whichOfThesePromisesAreDone(prisma, (promises as any[]).filter((p) => p.groundId && p.createdAt)).catch(() => new Set<string>());
  /* "I'll follow up with her tomorrow" says who "her" is, from the check-in it was said in (messages test, third run, item 2). */
  const aboutWhom = await whoThesePromisesAreAbout(prisma, (promises as any[]).filter((p) => p.groundId && p.createdAt && !saidDone.has(p.id))).catch(() => new Map<string, string>());
  /* A promise to check for news somebody else already gave is never late (Hafsah, 19 October, FN-005): see a-promise-that-waits-on-news. */
  const theNews = await theNewsThesePromisesWaitOn(prisma, lead.organizationId, (promises as any[]).filter((p) => p.groundId && p.createdAt && !saidDone.has(p.id)).map((p) => ({ id: p.id, text: p.text ?? '', participantId: p.participantId, groundId: p.groundId, createdAt: p.createdAt, userId: p.participant?.userId ?? null }))).catch(() => new Map<string, TheNewsGiven>());
  for (const pr of promises) {
    if (saidDone.has(pr.id)) continue;
    const g = pr.participant?.ground;
    if (!g || isEvaluationCheckIn(g.scenario) || !pr.text?.trim()) continue;
    const late = daysLate(pr.dueDate, today);
    if (late < 1) continue;
    const about = aboutHer(aboutWhom.get(pr.id));
    /* "Brian said on Wednesday 14 October that it was filed; Njeri hasn't been told." Once their next check-in has told them, nothing. */
    const news = theNews.get(pr.id);
    if (news) {
      if (news.told || pr.participant?.userId === lead.userId) continue;
      if (!(ids.includes(pr.groundId) && letIn(pr.participant) && (pr.authoredBy === 'self' || pr.seenBySubject))) continue;
      const maker = nameToCall(pr.participant);
      if (maker === SOMEONE) continue;
      const reporter = news.byUserId === lead.userId ? 'You' : (news.byName ?? 'Somebody');
      out.needsYou.push({ text: `${THE_PLACE_FIRST}${theyCommitted(maker, pr.text)}${about ? ` about ${about}` : ''}. ${reporter} said on ${theDay(news.at)} that it ${news.happened}; ${maker} hasn't been told.`, late: 0, group: 1, keptInTheApp: keptOffThePhone(g), place: g.label, groundId: g.id, about: { kind: 'promise', ids: [pr.id] } });
      continue;
    }
    const text = (who: string) => `${THE_PLACE_FIRST}${theyCommitted(who, pr.text)}${about ? ` about ${about}` : ''}. That was due by ${theDay(pr.dueDate)} and is ${lateWords(late)}.`;
    /* "Someone" is the word for a person nobody has a name for (decision 115): a lead cannot act on it, so it is not told. */
    if (pr.participant?.userId !== lead.userId && nameToCall(pr.participant) === SOMEONE) continue;
    if (pr.participant?.userId === lead.userId) out.needsYou.push({ text: text('You'), late, group: 2, keptInTheApp: keptOffThePhone(g), place: g.label, groundId: g.id, daysOverdue: late, about: { kind: 'promise', ids: [pr.id] }, owedTo: pr.owedToParticipantId ?? null, dueSaid: theDay(pr.dueDate) });
    else if (ids.includes(pr.groundId) && letIn(pr.participant) && (pr.authoredBy === 'self' || pr.seenBySubject)) out.overdueOnYourTeam.push({ text: text(nameToCall(pr.participant)), late, keptInTheApp: keptOffThePhone(g), place: g.label, groundId: g.id, daysOverdue: late, about: { kind: 'promise', ids: [pr.id] } });
  }

  /* Waits on her people's work: open, named, in her check-ins. */
  const waits: any[] = ids.length
    ? await prisma.groundDependency.findMany({
        where: { groundId: { in: ids }, status: { in: OPEN_WAIT }, clearedAt: null },
        select: {
          id: true, groundId: true, what: true, namedTheThing: true, onLabel: true, status: true, createdAt: true, dueOn: true, blockerKind: true, fromParticipantId: true, onParticipantId: true, triedSaid: true, sourceCheckInId: true,
          fromParticipant: { select: PERSON }, onParticipant: { select: PERSON },
        },
      }).catch(() => [])
    : [];
  /* A customer's reply is on its deal, not a wait on the team, unless it was said to stop the deal (a-customers-reply-is-on-its-deal). */
  const real = (await withoutTheWaitsOnCustomers(prisma, oneBlockerPerThingWaitedOn(dedupeDependencies(waits as any)).filter(blockerHasSubstance) as any[]).catch(() => oneBlockerPerThingWaitedOn(dedupeDependencies(waits as any)).filter(blockerHasSubstance) as any[])) as any[];
  /* A wait for the payment of a bill the record marks Paid is over (theBillThisWaitIsPaidOn): never told as late (Hafsah, 19 October, point 4). */
  const bills: any[] = ids.length ? ((await Promise.resolve(prisma.workItem?.findMany?.({ where: { groundId: { in: ids }, kind: BILL }, select: { groundId: true, name: true, stage: true, fields: true } })).catch(() => [])) ?? []) : [];
  for (let i = real.length - 1; i >= 0; i--) if (theBillThisWaitIsPaidOn(real[i].what, bills.filter((b) => b.groundId === real[i].groundId))) real.splice(i, 1);
  const saidWait = (w: any, isAre: string): string => {
    const from = hers.has(w.fromParticipantId) ? 'You' : nameToCall(w.fromParticipant);
    /* "my supervisor" is the waiting person's, named (Hafsah, 19 October, point 6). */
    const on = hers.has(w.onParticipantId) ? 'you' : w.onParticipant ? nameToCall(w.onParticipant) : aHolderSaidWithWhose((w.onLabel ?? '').trim(), from === 'You' ? null : from, from === 'You');
    const verb = from === 'You' ? (isAre === 'has been' ? 'have been' : 'are') : isAre;
    return theWaitSaid(from, verb, on, w.what).replace(/\.$/, '');
  };
  /* A wait on one of her people is late against them only when they said it is theirs to give (decision 137). */
  const confirmedWaits = await theConfirmedWaits(prisma, real.filter((w) => !hers.has(w.onParticipantId)));
  /* "Kofi says the work is waiting on Omar for the stock count. Not backed: no attempt to unblock mentioned." */
  const theirAccountOfAWait = (w: any, since?: string): string => {
    const from = hers.has(w.fromParticipantId) ? 'You' : nameToCall(w.fromParticipant);
    const on = w.onParticipant ? nameToCall(w.onParticipant) : aHolderSaidWithWhose((w.onLabel ?? '').trim(), from === 'You' ? null : from, from === 'You');
    /* What they said they tried, in full with its day, or nothing beside the claim (Drop Access run 1, item 18), where Release 1's switch
       is on; off, the note beside the claim as before. */
    const tried = releaseOne || direct ? whatTheyTriedInFull(w, from) : theNoteBesideTheClaim(w, { by: from, on, lead: 'you' });
    return `${from} ${from === 'You' ? 'say' : 'says'} the work ${since ? 'has been' : 'is'} waiting on ${on} for ${String(w.what ?? '').trim().replace(/[.\s]+$/, '')}${THE_PLACE_MARK}${since ? ` since ${since}` : ''}.${tried ? ` ${tried}` : ''}`;
  };
  const counted = new Set<string>();
  for (const w of real) {
    if (!letIn(w.fromParticipant) && !hers.has(w.fromParticipantId)) continue;
    if (!aWaitReadsAsASentence(w)) continue;
    if ((!hers.has(w.fromParticipantId) && nameToCall(w.fromParticipant) === SOMEONE) || (w.onParticipant && !hers.has(w.onParticipantId) && nameToCall(w.onParticipant) === SOMEONE)) continue;
    const onHer = hers.has(w.onParticipantId);
    const late = daysLate(w.dueOn, today);
    /* A decision she owes: somebody is waiting for her to decide it. And an answer she owes with no day of its own (Drop Access,
       16 October): Joseph waited on Grace for "an answer about the KES 4,500 price", it was read with no kind, and her morning
       summary left out the one thing that needed her. */
    if (onHer && (w.blockerKind === 'DECISION' || (releaseOne && !w.dueOn))) {
      const since = `since ${theDay(w.createdAt)}`;
      out.needsYou.push({ text: `${saidWait(w, 'is')}${THE_PLACE_MARK} ${since}.`, late: late > 0 ? late : 0, group: 1, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId), groundId: w.groundId, daysOverdue: Math.max(0, late), about: { kind: 'decision', ids: w.ids ?? [w.id] }, from: w.fromParticipantId, waitFor: String(w.what ?? '') });
      counted.add(w.id);
      continue;
    }
    if (late < 1) continue;
    const text = `${saidWait(w, 'is')}${THE_PLACE_MARK}, which was due on ${theDay(w.dueOn)} and is ${lateWords(late)}.`;
    if (onHer) out.needsYou.push({ text, late, group: 2, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId), groundId: w.groundId, daysOverdue: late, about: { kind: 'wait', ids: w.ids ?? [w.id] }, waitFor: String(w.what ?? '') });
    /* Somebody's word alone is not a late mark on a colleague: Juma was shown "ten days late" every morning for shops he had sent. The claim stays,
       as the speaker's account with the note beside it, and with no day or lateness against the colleague (Hafsah, change 4). */
    else if (w.onParticipant && !confirmedWaits.has(w.id)) {
      if (letIn(w.onParticipant)) out.risks.push({ text: theirAccountOfAWait(w), keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId), groundId: w.groundId, about: { kind: 'wait', ids: w.ids ?? [w.id] } });
      else continue;
    }
    else if (w.onParticipant && letIn(w.onParticipant)) out.overdueOnYourTeam.push({ text, late, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId), groundId: w.groundId, daysOverdue: late, about: { kind: 'wait', ids: w.ids ?? [w.id] } });
    /* A WAIT PAST ITS DAY ON SOMEBODY OUTSIDE THE CHECK-IN IS A RISK (Drop Access run 1, item 15): Mercy waiting on Accounts for
       confirmation of Rose's deposit, due on 23 October, was never said anywhere. A customer's wait is on its deal, never here. */
    else if (releaseOne && !w.onParticipant && (w.onLabel ?? '').trim()) out.risks.push({ text, late, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId), groundId: w.groundId, daysOverdue: late, about: { kind: 'wait', ids: w.ids ?? [w.id] } });
    else continue;
    counted.add(w.id);
  }
  /* A decision that is hers in the plan: owned by her, with its day gone by and not done. */
  const entry = await theirRosterEntry(prisma, lead.organizationId, lead.userId, { externalId: true }).catch(() => null);
  if (entry?.externalId) {
    const decisions: any[] = await prisma.subject.findMany({
      where: { organizationId: lead.organizationId, type: 'DECISION', ownerExternalId: entry.externalId, sourceDeletedAt: null, dueDate: { lt: today } },
      select: { id: true, title: true, dueDate: true, status: true },
    }).catch(() => []);
    for (const d of decisions) {
      if (/^(done|decided|closed|complete|completed|met|dropped|cancelled|canceled)$/i.test((d.status ?? '').trim()) || !d.title?.trim()) continue;
      const late = daysLate(d.dueDate, today);
      if (late < 1) continue;
      out.needsYou.push({ text: `The decision ${quoted(d.title.trim())} is yours, and it was due on ${theDay(d.dueDate)}, so it is ${lateWords(late)}.`, late, group: 1, about: { kind: 'plan-decision', ids: [d.id].filter(Boolean) } });
    }
  }

  /* RISKS. A target that is behind: only a team target, read the way the board reads it, and only with a number. */
  for (const g of grounds) {
    const objectives: any[] = await prisma.groundObjective.findMany({ where: { groundId: g.id, ownerParticipantId: null, isADecisionAboutAPerson: false }, select: { id: true, name: true, target: true, count: true, direction: true, dueOn: true } }).catch(() => []);
    if (!objectives.length) continue;
    const snaps: any[] = await prisma.groundObjectiveSnapshot.findMany({ where: { groundId: g.id }, select: { objectiveId: true, sessionNumber: true, count: true } }).catch(() => []);
    const planned = totalSessionsFor(g.timelineDays, g.cadence) ?? null;
    for (const o of objectives) {
      if (typeof o.target !== 'number' || !o.name?.trim()) continue;
      const counts = snaps.filter((s) => s.objectiveId === o.id && typeof s.sessionNumber === 'number');
      const first = [...counts].sort((a, b) => a.sessionNumber - b.sessionNumber)[0];
      const direction = theDirectionToReadIn(asADirection(o.direction), o.name);
      const stands = whereThisTargetStands(
        { id: o.id, target: o.target, count: o.count ?? 0, start: first?.count ?? null, direction, journeyDirection: 'unknown', notSettled: null, dueDay: theDayItIsDue(o.dueOn, now), isPast: !!o.dueOn && daysLate(o.dueOn, today) >= 1 },
        counts, planned,
      );
      if (stands?.word !== 'Behind' && stands?.word !== 'Over limit') continue;
      const is = stands.word === 'Behind' ? 'is behind' : 'is over its limit';
      out.risks.push({ text: `The target ${quoted(o.name.trim())} in ${quoted(g.label)} ${is}. ${sentence(stands.says)}`, late: 1_000_000, keptInTheApp: keptOffThePhone(g), place: g.label, groundId: g.id, daysOverdue: o.dueOn ? Math.max(0, daysLate(o.dueOn, today)) : 0, about: { kind: 'target', ids: [o.id] } });
    }
  }
  /*
   * A DEAL AT THE STALL RULE (Drop Access run 1, item 15): the customer has not answered for three working days, read exactly as the
   * board reads it (the-deals-that-have-stalled.ts). Never a dropped deal and never a won one.
   */
  for (const g of releaseOne ? grounds : []) {
    const stalled = await theDealsThatHaveStalled(prisma, { id: g.id, organizationId: lead.organizationId, workStages: (g as any).workStages }, now).catch(() => []);
    const who = new Map<string, any>((mine as any[]).filter((p) => p.groundId === g.id).map((p) => [p.id, p]));
    for (const d of stalled) {
      const owner = d.ownerParticipantId ? (hers.has(d.ownerParticipantId) ? 'you' : who.get(d.ownerParticipantId) ? nameToCall(who.get(d.ownerParticipantId)) : null) : null;
      if (owner === SOMEONE) continue;
      out.risks.push({ text: `${d.name} has not answered ${owner ?? 'the team'}${THE_PLACE_MARK} since ${theDay(d.since)}.`, keptInTheApp: keptOffThePhone(g), place: g.label, groundId: g.id, daysOpen: Math.floor((now.getTime() - d.since.getTime()) / DAY), about: { kind: 'deal', ids: [d.id] } });
    }
  }
  /* A wait that has gone on too long, the oldest first, if it is not already said as overdue. */
  const tooLong = real
    .filter((w) => !counted.has(w.id) && aWaitReadsAsASentence(w) && letIn(w.fromParticipant) && (hers.has(w.fromParticipantId) || nameToCall(w.fromParticipant) !== SOMEONE) && !(w.onParticipant && !hers.has(w.onParticipantId) && nameToCall(w.onParticipant) === SOMEONE) && Math.floor((now.getTime() - new Date(w.createdAt).getTime()) / DAY) >= ESCALATE_AFTER_DAYS)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const w of tooLong) {
    out.risks.push({ text: w.onParticipant && !hers.has(w.onParticipantId) && !confirmedWaits.has(w.id) ? theirAccountOfAWait(w, theDay(w.createdAt)) : `${saidWait(w, 'has been')}${THE_PLACE_MARK} since ${theDay(w.createdAt)}.`, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId), groundId: w.groundId, daysOpen: Math.floor((now.getTime() - new Date(w.createdAt).getTime()) / DAY), about: { kind: 'wait', ids: [w.id] } });
  }
  /* A check-in where people have gone quiet. Not about a check-in that began before the engagement messages did. */
  if (deps.release) {
    for (const g of grounds) {
      const rows: any[] = await prisma.checkIn.findMany({
        where: { groundId: g.id },
        select: { participantId: true, sessionNumber: true, status: true, createdAt: true, availableFrom: true, closedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } }, participant: { select: { userId: true, managingOnly: true, leftAt: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } } },
      }).catch(() => []);
      const away = await Promise.resolve(whoOnACheckInIsAway(prisma, g.id, now)).catch(() => new Map());
      const q = theQuietIn(rows, g.label, lead.userId, now, deps.release, new Set([...(away as Map<string, unknown>).keys()]));
      const n = q ? quietIn(q) : 0;
      if (!q || n < 1) continue;
      const who = n >= q.ofHowMany
        ? (q.ofHowMany === 1 ? 'The one person who can answer' : q.ofHowMany === 2 ? 'Both people' : `All ${aNumberInWords(q.ofHowMany)} people`)
        : `${capital(aNumberInWords(n))} of the ${aNumberInWords(q.ofHowMany)} people`;
      out.risks.push({ text: `${who} in ${quoted(g.label)} ${n === 1 ? 'has' : 'have'} not answered a check-in for more than a week.`, keptInTheApp: keptOffThePhone(g), groundId: g.id, about: { kind: 'quiet', ids: [g.id] } });
    }
  }

  /*
   * THE CHECK-IN RUNS OUT SOON (Drop Access run 1, item 16) is not said here (Release 1, pull request 5): "runs out in 7 days" stays an
   * email of its own, the only warning before a check-in is stalled, because the lines here can be cut for room. It no longer holds this
   * summary back (one-routine-message-a-day). See docs/release-questions.md.
   */

  /* MISSED CHECK-INS (decision 136): three of the last four missed, said as facts and what they do, never a label. Never the lead's own sessions
     (whoHasMissedCheckIns leaves the lead out), never a session in approved leave. */
  const missedLines: AThingOutstanding[] = [];
  for (const m of await whoHasMissedCheckIns(prisma, ids, now).catch(() => [])) {
    if (m.stand.stage < TOLD_THE_LEAD || m.name === SOMEONE) continue;
    const g = grounds.find((x) => x.id === m.groundId);
    if (!g) continue;
    missedLines.push({
      text: whatTheLeadReads(m.name, m.stand, g.label, direct),
      keptInTheApp: keptOffThePhone(g),
      groundId: g.id,
      about: { kind: 'missed', ids: [m.participantId] },
      onceKey: `missed.lead.${m.participantId}.${m.stand.streakFrom ?? 0}.${m.stand.stage}`,
    });
  }
  /* First among the risks, so the three lines the message has room for always carry it on the day it is said. */
  out.risks.unshift(...missedLines);

  /*
   * ON A SALES CHECK-IN WITH RELEASE 1'S SWITCH ON (quality pass, 18 October, M-1 to M-3; the-sales-morning-from-the-record): an answer
   * someone waits on her for says the deal it decides, a decision she said she would make is told, and what is due today and tomorrow
   * is said after what needs her. Every other check-in reads as before.
   */
  for (const g of grounds) {
    const morning = await theSalesMorning(prisma, g.id, lead.userId, now).catch(() => null);
    if (!morning) continue;
    out.saidAsACount = true;
    for (const t of out.needsYou) {
      const id = t.about?.kind === 'decision' ? (t.about.ids ?? []).find((x) => morning.forAWaitOnHer.has(x)) : undefined;
      if (id) t.text = `${morning.forAWaitOnHer.get(id)!.replace(/\.$/, '')}${THE_PLACE_MARK}.`;
    }
    for (const d of morning.decisionsSheOwes) out.needsYou.push({ text: `${d.text.replace(/\.$/, '')}${THE_PLACE_MARK}.`, group: 1, keptInTheApp: kept(g.id), place: g.label, groundId: g.id, about: { kind: 'decision', ids: [d.dealId] } });
    out.dueToday = [...(out.dueToday ?? []), ...morning.due.map((text) => ({ text, keptInTheApp: kept(g.id), place: g.label, groundId: g.id, about: { kind: 'due', ids: [g.id] } }))];
  }

  /*
   * ONE ITEM FOR ONE DECISION (Drop Access run 1, item 14). Grace's summary said Joseph was waiting on her for the KES 4,500 price, and
   * then, as a line of its own, "You said “I need to decide on Joseph's pricing request for Juja Hardware”. That was due by Friday 16
   * October and is ten days late." Her promise to Joseph is the decision he waits on her for: it is said once, in that decision's line,
   * with the day she gave. Matched by the record (the promise is owed to the person waiting, or names them), never by the words alone.
   */
  for (const pr of releaseOne ? out.needsYou.filter((t) => t.group === 2 && t.about?.kind === 'promise' && t.owedTo) : []) {
    const decision = out.needsYou.find((t) => t.about?.kind === 'decision' && t.from && t.groundId === pr.groundId && t.from === pr.owedTo);
    if (!decision) continue;
    decision.text = `${decision.text.replace(/\.$/, '')}. You said you would do it by ${pr.dueSaid}, so it is ${lateWords(pr.late ?? 0)}.`;
    decision.late = Math.max(decision.late ?? 0, pr.late ?? 0);
    decision.about = { kind: 'decision', ids: [...(decision.about?.ids ?? []), ...(pr.about?.ids ?? [])] };
    out.needsYou = out.needsYou.filter((t) => t !== pr);
  }
  /*
   * A FEE NOTE THAT FELL DUE ON AN EVENT, OR CAN NOW BE RAISED (messages test, 19 October, finding 4), where Release 2 is on: said in the
   * week after the event was reported, while the fee note waits to be followed up or raised. See a-fee-note-that-fell-due-said-to-the-lead.
   */
  /*
   * RELEASE 3, RAISING INVOICES ON TIME, where it is on: each invoice in her check-ins that is late to raise, with the day it was due to
   * go out, why, and who has not said it is raised (board/raising-invoices-on-time). It replaces Release 2's "can be raised now" line for
   * the same bill, so a bill is said once. No new message: this is a line in the morning she already gets.
   */
  const lateToRaise = await theInvoicesLateToRaiseFor(prisma, lead.organizationId, ids, now).catch(() => []);
  for (const l of lateToRaise) {
    out.needsYou.push({ text: l.text, group: 0, late: l.daysLate, keptInTheApp: kept(l.groundId), place: labelOf.get(l.groundId), groundId: l.groundId, about: { kind: 'fee-note', ids: [l.billId] } });
  }
  const saidAlready = new Set(lateToRaise.map((l) => l.billId));
  for (const f of await theFeeNotesThatFellDueOnAnEvent(prisma, { userId: lead.userId, organizationId: lead.organizationId }, ids, new Date(now.getTime() - 7 * DAY)).catch(() => [])) {
    if (saidAlready.has(f.billId)) continue;
    out.needsYou.push({ text: f.text, group: 0, keptInTheApp: kept(f.groundId), place: labelOf.get(f.groundId), groundId: f.groundId, about: { kind: 'fee-note', ids: [f.billId] } });
  }
  /* Most important first within a part: in "Needs you" what waits for her to approve, then a decision she owes, then her own late commitments; always the most overdue first. */
  const byLate = (a: AThingOutstanding, b: AThingOutstanding) => (b.late ?? 0) - (a.late ?? 0);
  out.needsYou.sort((a, b) => (a.group ?? 9) - (b.group ?? 9) || byLate(a, b));
  out.overdueOnYourTeam.sort(byLate);
  return await leaveOutWhatIsLongOverdueOnOldCheckIns(prisma, out, deps.release);
}

/**
 * EVERYTHING THE NUDGE COULD HAVE SAID, FOR THE PAGE ITS LINK GOES TO (Today). The same facts in the same sentences, none left out for lack of room, with the check-in
 * named wherever she is told about more than one. Served only to the lead herself, for the check-ins she runs, so it is the nudge's own wall. Null when nothing is outstanding.
 */
export async function everythingOutstandingFor(
  prisma: any,
  reader: { userId: string; organizationId: string },
  deps: { boards: TheBoards },
  now: Date = new Date(),
): Promise<{ needsYou: string[]; overdueOnYourTeam: string[]; risks: string[]; about: { needsYou: TheAbout[]; overdueOnYourTeam: TheAbout[]; risks: TheAbout[] } } | null> {
  const grounds: any[] = await prisma.ground.findMany({
    where: { initiatorId: reader.userId, organizationId: reader.organizationId, status: { notIn: [...TERMINAL, ...HELD, GroundStatus.AWAITING_APPROVAL] } },
    select: { id: true, label: true, scenario: true, organizationId: true, overWhatsApp: true, initiatorId: true, timelineDays: true, cadence: true, workStages: true, endsAt: true, createdAt: true, startsAt: true, runsUntilEnded: true },
  });
  if (!grounds.length) return null;
  const release = await theEngagementMoment(prisma, now).catch(() => null);
  const found = await whatIsOutstandingFor(prisma, { userId: reader.userId, organizationId: reader.organizationId, grounds }, { boards: deps.boards, release }, now);
  if (!theseAreOutstanding(found)) return null;
  const said = withPlacesWhereTheyTellApart(found);
  const lines = (things: AThingOutstanding[]) => things.map((t) => sentence(t.text));
  /* One entry for each sentence, in the same order: what it is about, so Today can match a sentence to its own row by the thing and not by the words (request 205). */
  const about = (things: AThingOutstanding[]): TheAbout[] => things.map((t) => ({ kind: t.about?.kind ?? 'other', ids: t.about?.ids ?? [], ...(t.groundId ? { groundId: t.groundId } : {}) }));
  return { needsYou: lines(said.needsYou), overdueOnYourTeam: lines(said.overdueOnYourTeam), risks: lines(said.risks), about: { needsYou: about(said.needsYou), overdueOnYourTeam: about(said.overdueOnYourTeam), risks: about(said.risks) } };
}

/** Each lead, from every check-in that is running: who runs what. */
async function theLeadsAndTheirCheckIns(prisma: any) {
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { status: { notIn: [...TERMINAL, ...HELD, GroundStatus.AWAITING_APPROVAL] } },
    select: { id: true, label: true, scenario: true, organizationId: true, overWhatsApp: true, initiatorId: true, timelineDays: true, cadence: true, workingDays: true, workStages: true, endsAt: true, createdAt: true, startsAt: true, runsUntilEnded: true },
    orderBy: { id: 'asc' },
    ...page,
  }), 1000);
  const byLead = new Map<string, { userId: string; organizationId: string; grounds: any[] }>();
  for (const g of grounds) {
    const key = `${g.organizationId}|${g.initiatorId}`;
    const lead: { userId: string; organizationId: string; grounds: any[] } = byLead.get(key) ?? { userId: g.initiatorId, organizationId: g.organizationId, grounds: [] };
    lead.grounds.push(g);
    byLead.set(key, lead);
  }
  return [...byLead.values()];
}

export interface TheNudgeDoors {
  prisma: any;
  whatsapp: { sendFor: (organizationId: string, phone: string, text: string, ctx: { kind: string; params: string[] }) => Promise<any>; isEnabled(): Promise<boolean>; hasSaidStop?: (phone: string) => Promise<boolean> };
  email: {
    sendTheLeadsDailyNudge: (to: string, subject: string, parts: TheNudgeParts, firstName: string | null | undefined, linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown>;
    /* The direct morning by email (the-direct-morning.ts), where the organisation's switch is on. */
    sendTheDirectMorning?: (to: string, subject: string, firstName: string | null | undefined, parts: { heading: string; lines: string[] }[], linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown>;
  };
  boards: TheBoards;
  frontendUrl: string;
  /* The lead's own board, as she opens it, for what her summary says (the-summary-reads-the-board.ts). Without it, the summary reads the record alone, as before. */
  board?: { get(groundId: string, requestingUserId: string): Promise<any> };
}

/** Each of the lead's boards, as she is served it, for her summary. A board that cannot be read adds nothing. */
async function theLeadsBoards(door: NonNullable<TheNudgeDoors['board']>, lead: { userId: string; grounds: any[] }, prisma?: any): Promise<TheLeadsBoard[]> {
  const out: TheLeadsBoard[] = [];
  for (const g of lead.grounds.filter((x) => !isEvaluationCheckIn(x.scenario))) {
    const board = await door.get(g.id, lead.userId).catch(() => null);
    if (board) out.push({ label: g.label, groundId: g.id, keptInTheApp: keptOffThePhone(g), board, ...(prisma ? { record: await theRecordBesideTheBoard(prisma, g.id, lead.userId).catch(() => undefined) } : {}) });
  }
  return out;
}

/** What was said in one of her check-ins, and who said it, for a decision said with its customer, its person and its day. */
async function theRecordBesideTheBoard(prisma: any, groundId: string, leadUserId: string): Promise<TheRecordBesideTheBoard | undefined> {
  const people: any[] = (await Promise.resolve(prisma.groundParticipant?.findMany?.({ where: { groundId }, select: { id: true, userId: true, leftAt: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } })).catch(() => [])) ?? [];
  const lines: any[] = (await Promise.resolve(prisma.recordEntry?.findMany?.({ where: { disputedAt: null, participant: { groundId } }, select: { text: true, type: true, participantId: true, createdAt: true } })).catch(() => [])) ?? [];
  if (!Array.isArray(people) || !Array.isArray(lines) || !lines.length) return undefined;
  const byId = new Map(people.map((p) => [p.id, p]));
  return {
    lines: lines.map((l) => ({ text: String(l.text ?? '').replace(/\s*\[[^\]]*\]/g, '').trim(), type: l.type ?? null, participantId: l.participantId, createdAt: l.createdAt })).filter((l) => l.text),
    nameOf: (id: string) => {
      const p = byId.get(id);
      if (!p || p.userId === leadUserId) return null;
      const n = nameToCall(p);
      return n === SOMEONE ? null : n;
    },
    hers: new Set(people.filter((p) => p.userId === leadUserId).map((p) => p.id)),
  };
}

/**
 * THE BOARD THE MORNING MESSAGE LINKS TO (Drop Access short run, item 11; engine test, second run). `lead_daily_summary` says "You can
 * open your board for the full picture here {{3}}", and {{3}} was Today. The template is unchanged; its link is a board: the one
 * check-in its facts come from, or her only check-in. Where the facts come from more than one check-in, it is the board of the
 * check-in the message's first line is about, in the order the message says them (what needs her, what is due, what is overdue, the
 * risks): Wanjiru runs two check-ins, and from Tuesday 13 October her link went to the list of her check-ins, which is not her board.
 * Only where no line says which check-in it is about, and she runs several, it is Today, where everything is.
 */
export function theBoardTheMessageIsAbout(base: string, grounds: { id: string }[], facts: WhatIsOutstanding): string {
  const inOrder = [...facts.needsYou, ...(facts.dueToday ?? []), ...facts.overdueOnYourTeam, ...facts.risks];
  const about = [...new Set(inOrder.map((t) => t.groundId).filter((g): g is string => !!g))];
  const one = about.length ? about[0] : grounds.length === 1 ? grounds[0].id : null;
  return one ? `${base}/grounds/${one}/board` : `${base}/today`;
}

/**
 * THE DAY'S OWN LIMITS: the only reasons a message to the phone did not go that mean nothing more today. Every other
 * "not sent" (outside the 24 hours, a first message not approved, STOP, a refusal by Meta itself, WhatsApp not
 * configured, keys that cannot be opened, a held add-on) leaves the lead still owed her nudge, by email (Drop Access,
 * October). It used to be the other way round, a short list of reasons that sent the email, so a refusal by Meta sent
 * nothing at all. Still one routine message a day: a WhatsApp that did not go is not one.
 */
const THE_DAYS_OWN_LIMITS: ReadonlySet<string> = new Set([NOT_TODAY, THEY_SAID_NOT_NOW, NOT_TURNED_ON_QUIETLY, THEY_HAD_ONE_TODAY]);

/**
 * THE MORNING SWEEP. One message a lead, by the channel decision 120 names. Returns how many were tried (sent, held for the morning or refused by a rule).
 * A lead on approved leave, with nothing outstanding, or whose sign-in is gone gets nothing.
 */
export async function sendTheLeadsDailyNudges(deps: TheNudgeDoors, now: Date = new Date(), opts: { onlyTheDirectMorningAt7?: boolean } = {}): Promise<{ tried: number }> {
  const { prisma } = deps;
  const release = await theEngagementMoment(prisma, now).catch(() => null);
  const leads = await theLeadsAndTheirCheckIns(prisma);
  const turnedOn = await organisationsThatTurnedWhatsAppOn(prisma, deps.whatsapp as any, leads.map((l) => l.organizationId));
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  const link = `${base}/today`;
  let tried = 0;
  for (const lead of leads) {
    try {
      /* Only on a day one of her check-ins works, where her organisation is (one calendar for each check-in, 29 October). */
      const zoneHere = await theOrganisationsZone(prisma, lead.organizationId).catch(() => null);
      if (!lead.grounds.some((g) => isAWorkingDay(now, g.workingDays, zoneHere))) continue;
      const user = await prisma.user.findUnique({ where: { id: lead.userId }, select: { firstName: true, email: true, phoneNumber: true, deletedAt: true, isActive: true } });
      if (!user || user.deletedAt || user.isActive === false) continue;
      if (fallsInLeave(now, await theirApprovedLeave(prisma, lead.userId, lead.organizationId))) continue;
      /*
       * THE DIRECT MORNING (the-direct-morning.ts), where the organisation's switch is on: the target, what needs her, what is about to
       * close and her team, by seven in the morning where the organisation is, and never twice in a day. Off, everything below runs as before.
       */
      const direct = await theDirectMorningIsOn(prisma, lead.organizationId);
      if (opts.onlyTheDirectMorningAt7 && !direct) continue;
      if (direct) {
        const went = await sendTheDirectMorningTo(deps, lead, user, now, { onlyAt7: !!opts.onlyTheDirectMorningAt7 });
        if (went === 'sent') { tried++; continue; }
        if (went === 'not-now' || opts.onlyTheDirectMorningAt7) continue;
      }
      const fromTheRecord = await whatIsOutstandingFor(prisma, lead, { boards: deps.boards, release }, now);
      /* What her board says too, in the same three parts (Hafsah, 19 October, point 1): never a single minor line when the board has more. */
      const everything = deps.board ? withWhatTheBoardsSay(fromTheRecord, await theLeadsBoards(deps.board, lead, prisma).catch(() => [])) : fromTheRecord;
      everything.needsYou.sort((a, b) => (a.group ?? 9) - (b.group ?? 9) || (b.late ?? 0) - (a.late ?? 0));
      /* What is said once (decision 136) is left out once it has been said. */
      const toldBefore = new Set<string>();
      for (const t of everything.risks) if (t.onceKey && await hasBeenToldOnce(prisma, t.onceKey)) toldBefore.add(t.onceKey);
      const found: WhatIsOutstanding = { ...everything, risks: everything.risks.filter((t) => !t.onceKey || !toldBefore.has(t.onceKey)) };
      if (!theseAreOutstanding(found)) continue;
      const markTold = async (said: WhatIsOutstanding, went: any = 'sent', to?: string) => {
        for (const t of said.risks.slice(0, said.risks.length <= AT_MOST ? AT_MOST : AT_MOST - 1)) if (t.onceKey) await nowToldOnce(prisma, t.onceKey, went, to ? { sender: NUDGE_SENDER, to } : undefined);
      };
      const outstanding = withPlacesWhereTheyTellApart(found);

      /* On WhatsApp when there is a number and WhatsApp is on for them, and they have not said stop. */
      const entry = await theirRosterEntry(prisma, lead.organizationId, lead.userId, { phone: true }).catch(() => null);
      const phone: string | null = entry?.phone ?? user.phoneNumber ?? null;
      const stopped = phone && deps.whatsapp.hasSaidStop ? await deps.whatsapp.hasSaidStop(phone).catch(() => false) : false;
      const phoneFacts = withPlacesWhereTheyTellApart(theseForAPhone(found));
      if (phone && !stopped && turnedOn.has(lead.organizationId) && theseAreOutstanding(phoneFacts)) {
        /* "You can open your board for the full picture here {{3}}": the template says the board, so {{3}} is the board (Drop Access short run, item 11). The message inside the 24 hours says "You can see everything here", which is Today. */
        const template = theTemplateParagraph(user.firstName, phoneFacts, theBoardTheMessageIsAbout(base, lead.grounds, phoneFacts));
        const window = theWindowForm(user.firstName, phoneFacts, link);
        /* The words a person reads inside the 24 hours are the window form; outside it, the template with its one paragraph. */
        const result: any = await deps.whatsapp.sendFor(lead.organizationId, phone, window, { kind: NUDGE_KIND, params: template.params });
        if (result?.sent !== false) { await markTold(phoneFacts); tried++; continue; }
        /* Held back by a rule of the day (one a day, "Not now", WhatsApp not turned on) means nothing more today. Any other reason it did not go: she is owed it by email instead. */
        if (THE_DAYS_OWN_LIMITS.has(String(result?.error ?? ''))) { tried++; continue; }
      }
      if (await isAlreadyHeld(prisma, NUDGE_SENDER, user.email)) continue;
      const went = await deps.email.sendTheLeadsDailyNudge(user.email, theNudgeSubject(outstanding), theNudgeParts(outstanding), user.firstName, 'See everything', link);
      await markTold(outstanding, went, user.email);
      if (went !== 'suppressed') tried++;
    } catch {
      /* One lead's nudge that could not be put together never stops the others. */
    }
  }
  return { tried };
}


/** The day's key for the direct morning, once a lead and a day. */
export const theDirectMorningsKey = (userId: string, day: string) => `direct-morning.${userId}.${day}`;
const theDayIn7 = (now: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const theHourIn = (now: Date, zone: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(now));

/**
 * THE DIRECT MORNING, SENT (Hafsah, 20 October 2026). One message, the lead's one routine message that day: on WhatsApp where she has a
 * number, WhatsApp is on for her organisation and she has not said stop, else by email when WhatsApp cannot take it (the same rule as
 * the summary above). The template lead_daily_summary is unchanged: its {{2}} carries the four parts, cut by priority, never in the
 * middle of a sentence, and its {{3}} is her board. As the very first message to her number it goes as groundwork_first_contact, with
 * the same four parts cut to fit that template. Inside the 24 hours it is a message of its own, each part on its own lines.
 * 'sent' when it went (or was held for the morning), 'not-now' when a rule of the day holds it back, 'nothing' when there is nothing
 * to say (a lead with no check-in it reads), so the summary as before goes instead.
 */
export async function sendTheDirectMorningTo(
  deps: TheNudgeDoors,
  lead: { userId: string; organizationId: string; grounds: any[] },
  user: { firstName?: string | null; email: string; phoneNumber?: string | null },
  now: Date,
  opts: { onlyAt7?: boolean } = {},
): Promise<'sent' | 'not-now' | 'nothing'> {
  const { prisma } = deps;
  const zone = (await theOrganisationsZone(prisma, lead.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  /* By seven where the organisation is: the early sweep sends it in the quarter hour from seven; the 9am sweep only if it has not gone. */
  if (opts.onlyAt7 && theHourIn(now, zone) !== 7) return 'not-now';
  const key = theDirectMorningsKey(lead.userId, theDayIn7(now, zone));
  if (await hasBeenToldOnce(prisma, key)) return 'not-now';
  if (!deps.board) return 'nothing';
  const mornings: TheDirectMorning[] = [];
  for (const g of lead.grounds.filter((x) => !isEvaluationCheckIn(x.scenario))) {
    /*
     * A NEW DAY IS SOMETHING NEW IN THE RECORD (final real-model check, items 3 and 5). A check-in that opened and was not done, and a
     * promise that passed its day, change each person's record without anybody checking in. Built only when the record behind it changed,
     * once a morning, before the morning reads it, so My work, the board and the summary say the same count.
     */
    await rebuildThePersonsRecords(prisma, g.id, now).catch(() => 0);
    const board = await deps.board.get(g.id, lead.userId).catch(() => null);
    if (!board) continue;
    const m = await theDirectMorningFor(prisma, { groundId: g.id, leadUserId: lead.userId, board, now }).catch(() => null);
    if (m && m.parts.some((p) => p.lines.length)) mornings.push(m);
  }
  if (!mornings.length) return 'nothing';
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  const link = `${base}/grounds/${mornings[0].groundId}/board`;
  const subject = theSubject(user.firstName, mornings);
  const body = TEMPLATES[NUDGE_KIND].body;
  const first = user.firstName?.trim() || 'there';

  const entry = await theirRosterEntry(prisma, lead.organizationId, lead.userId, { phone: true }).catch(() => null);
  const phone: string | null = entry?.phone ?? user.phoneNumber ?? null;
  const stopped = phone && deps.whatsapp.hasSaidStop ? await deps.whatsapp.hasSaidStop(phone).catch(() => false) : false;
  const turnedOn = await organisationsThatTurnedWhatsAppOn(prisma, deps.whatsapp as any, [lead.organizationId]).catch(() => new Set<string>());
  const forAPhone = mornings.filter((m) => !m.keptInTheApp);
  if (phone && !stopped && turnedOn.has(lead.organizationId) && forAPhone.length) {
    const fixed = body.replace(/\{\{\d+\}\}/g, '').length + oneLine(first).length + oneLine(link).length;
    /* The template may carry 1,024 characters in all. */
    const paragraph = theParagraph(forAPhone, A_TEMPLATE_BODY_LIMIT - fixed - 4).text;
    const params = [first, oneLine(paragraph), link];
    /* As the first message to the number, groundwork_first_contact carries the whole template's words in at most 800: cut by priority, never mid-sentence. */
    const shortRoom = ITS_OWN_WORDS_AT_MOST - fixed - 4;
    const shortParams = [first, oneLine(theParagraph(forAPhone, shortRoom).text), link];
    const firstContact = body.replace(/\{\{(\d+)\}\}/g, (_m, n) => shortParams[Number(n) - 1] ?? '');
    const window = [`Good morning ${first}.`, ...theEmailParts(forAPhone).map((p) => [p.heading, ...p.lines].join('\n')), `Your board is here ${link}`].join('\n\n');
    const result: any = await deps.whatsapp.sendFor(lead.organizationId, phone, window, { kind: NUDGE_KIND, params, paramsFor: { groundwork_first_contact: [firstContact] } } as any);
    if (result?.sent !== false) { await nowToldOnce(prisma, key, 'sent'); return 'sent'; }
    if (THE_DAYS_OWN_LIMITS.has(String(result?.error ?? ''))) { await nowToldOnce(prisma, key, 'held'); return 'not-now'; }
  }
  if (await isAlreadyHeld(prisma, NUDGE_SENDER, user.email)) return 'not-now';
  if (!deps.email.sendTheDirectMorning) return 'nothing';
  const went = await deps.email.sendTheDirectMorning(user.email, subject, user.firstName, theEmailParts(mornings), 'Open your board', link);
  await nowToldOnce(prisma, key, went as any, { sender: NUDGE_SENDER, to: user.email });
  return 'sent';
}
