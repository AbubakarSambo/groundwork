import { DependencyStatus, GroundStatus } from '@prisma/client';
import { A_GROUND_NO_MESSAGE_IS_ABOUT, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';
import { organisationsThatTurnedWhatsAppOn } from '../whatsapp/only-where-whatsapp-is-turned-on';
import { A_TEMPLATE_BODY_LIMIT, TEMPLATES, oneLine } from '../whatsapp/a-message-outside-the-window';
import { ITS_OWN_WORDS_AT_MOST } from '../whatsapp/the-first-message-to-a-number';
import { whatWaitsForYouToDecide, type TheBoards } from '../suites/what-waits-for-you-to-decide';
import { whatWaitsInASentence } from '../whatsapp/the-leads-daily-summary';
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
import { oneBlockerPerThingWaitedOn, theyNamedWhatTheyAreWaitingOn } from '../board/a-blocker-with-nothing-in-it-is-the-same-blocker';
import { startsWithAPronoun } from '../grounds/a-blocker-that-says-her-or-his';
import { theWaitSaid } from '../board/a-wait-said-in-full';
import { ESCALATE_AFTER_DAYS } from '../webhooks/a-handoff-that-has-sat-too-long';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { nameToCall, SOMEONE } from './a-name-to-call-them';
import { aNumberInWords } from './a-number-in-words';
import { theEngagementMoment } from './the-engagement-release-moment';
import { theQuietIn, quietIn } from './who-has-gone-quiet';
import { isAlreadyHeld } from './a-message-sent-once';

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
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** One thing that is outstanding, said as a full sentence. `late` orders the overdue ones; `keptInTheApp` keeps it off a phone. */
export interface AThingOutstanding {
  text: string;
  late?: number;
  /** Within "Needs you": what waits for her to approve comes first (0), then a decision she owes (1), then her own commitments that are late (2). */
  group?: number;
  keptInTheApp?: boolean;
  /** The check-in it is about. Said (" in \u201cSales team, Q3\u201d" at the {in} mark) only when the lead is being told about more than one. */
  place?: string;
}

const THE_PLACE_MARK = '{in}';

/** Puts the check-in's name where {in} stands when, and only when, the things told are about more than one check-in. */
export function withPlacesWhereTheyTellApart(o: WhatIsOutstanding): WhatIsOutstanding {
  const all = [...o.needsYou, ...o.overdueOnYourTeam, ...o.risks];
  const several = new Set(all.map((t) => t.place).filter(Boolean)).size > 1;
  const say = (t: AThingOutstanding): AThingOutstanding => ({ ...t, text: t.text.split(THE_PLACE_MARK).join(several && t.place ? ` in ${quoted(t.place)}` : '') });
  return { needsYou: o.needsYou.map(say), overdueOnYourTeam: o.overdueOnYourTeam.map(say), risks: o.risks.map(say) };
}

export interface WhatIsOutstanding {
  needsYou: AThingOutstanding[];
  overdueOnYourTeam: AThingOutstanding[];
  risks: AThingOutstanding[];
}

export const theseAreOutstanding = (o: WhatIsOutstanding): boolean => o.needsYou.length + o.overdueOnYourTeam.length + o.risks.length > 0;

/** The same facts without anything from a check-in kept in the app: what a phone may be given. */
export const theseForAPhone = (o: WhatIsOutstanding): WhatIsOutstanding => ({
  needsYou: o.needsYou.filter((t) => !t.keptInTheApp),
  overdueOnYourTeam: o.overdueOnYourTeam.filter((t) => !t.keptInTheApp),
  risks: o.risks.filter((t) => !t.keptInTheApp),
});

/** At most three lines. When there are more, the third says how many are not listed. */
export function atMostThreeLines(things: AThingOutstanding[]): string[] {
  const lines = things.map((t) => sentence(t.text.split(THE_PLACE_MARK).join('')));
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
  if (n) bits.push(`${aNumberInWords(n)} ${n === 1 ? 'thing needs' : 'things need'} you`);
  if (t) bits.push(`${aNumberInWords(t)} ${t === 1 ? 'is' : 'are'} overdue on your team`);
  if (r) bits.push(`${aNumberInWords(r)} ${r === 1 ? 'risk is' : 'risks are'} open`);
  const joined = bits.length < 2 ? bits.join('') : `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
  return capital(joined);
}

/**
 * The message as an ordinary WhatsApp message, for a lead who wrote to Groundwork in the last 24 hours: each part on its own, each line on its own line.
 */
export function theWindowForm(firstName: string | null | undefined, o: WhatIsOutstanding, link: string): string {
  const p = theNudgeParts(o);
  const blocks: string[] = [`Good morning ${firstName?.trim() || 'there'}. Here is what is outstanding today.`];
  for (const key of ['needsYou', 'overdueOnYourTeam', 'risks'] as const) if (p[key].length) blocks.push([HEADINGS[key], ...p[key]].join('\n'));
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
  const lead: Record<keyof TheNudgeParts, string> = { needsYou: 'These need you.', overdueOnYourTeam: 'These are overdue on your team.', risks: 'These are risks.' };
  const pieces: string[] = [];
  let used = 0;
  let left = false;
  outer: for (const key of ['needsYou', 'overdueOnYourTeam', 'risks'] as const) {
    let opened = false;
    for (const line of p[key]) {
      /* "Three more are not listed here" is for the message with lines; this one has its own closing sentence. */
      if (/ more are not listed here\.$/.test(line)) { left = true; continue; }
      const add = `${opened ? '' : `${lead[key]} `}${oneLine(line)}`;
      /* Keep room for the closing sentence whenever something has to be left out. */
      if (used + add.length + 1 > room - more.length - 1) { left = true; break outer; }
      pieces.push(add);
      used += add.length + 1;
      opened = true;
    }
  }
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
export async function whatIsOutstandingFor(
  prisma: any,
  lead: { userId: string; organizationId: string; grounds: { id: string; label: string; scenario: any; overWhatsApp: boolean | null; timelineDays: number | null; cadence: any }[] },
  deps: { boards: TheBoards; release: Date | null },
  now: Date,
): Promise<WhatIsOutstanding> {
  const out: WhatIsOutstanding = { needsYou: [], overdueOnYourTeam: [], risks: [] };
  const today = theDayIn('Africa/Lagos', now);
  const grounds = lead.grounds.filter((g) => !isEvaluationCheckIn(g.scenario));
  const ids = grounds.map((g) => g.id);
  const labelOf = new Map(grounds.map((g) => [g.id, g.label]));
  const kept = (groundId: string) => keptOffThePhone(grounds.find((g) => g.id === groundId));

  /* NEEDS YOU, first: what waits for her to approve. */
  const waiting = await whatWaitsForYouToDecide({ userId: lead.userId, organizationId: lead.organizationId }, deps.boards).catch(() => []);
  const approvals = whatWaitsInASentence(waiting);
  if (approvals) out.needsYou.push({ text: approvals, group: 0 });

  /* Who is on her check-ins, and what is open on each of them. */
  const mine = ids.length
    ? await prisma.groundParticipant.findMany({ where: { groundId: { in: ids }, partyType: { not: 'INITIATOR' }, leftAt: null }, select: { id: true, groundId: true, ...PERSON } }).catch(() => [])
    : [];
  const people = new Map<string, any>((mine as any[]).map((p) => [p.id, p]));
  const letIn = (p: any) => !!p && !p.managingOnly && !p.leftAt && !isNotLetInYet(p);
  const herself = ids.length
    ? await prisma.groundParticipant.findMany({ where: { groundId: { in: ids }, userId: lead.userId }, select: { id: true, groundId: true } }).catch(() => [])
    : [];
  const hers = new Set<string>((herself as any[]).map((p) => p.id));

  /* WHAT HAS NO DAY IS NEVER LATE. Promises with a real date that has passed, hers first. */
  const promises: any[] = await prisma.personObjective.findMany({
    where: {
      status: 'OPEN', kind: { in: ['COMMITMENT', 'TODO'] }, dueDate: { lt: today },
      OR: [
        { participant: { userId: lead.userId, ground: { status: { notIn: [...TERMINAL, ...HELD] }, organizationId: lead.organizationId } } },
        ...(ids.length ? [{ groundId: { in: ids } }] : []),
      ],
    },
    select: { text: true, dueDate: true, groundId: true, authoredBy: true, seenBySubject: true, participantId: true, participant: { select: { ground: { select: { id: true, label: true, scenario: true, overWhatsApp: true } }, ...PERSON } } },
  }).catch(() => []);
  for (const pr of promises) {
    const g = pr.participant?.ground;
    if (!g || isEvaluationCheckIn(g.scenario) || !pr.text?.trim()) continue;
    const late = daysLate(pr.dueDate, today);
    if (late < 1) continue;
    const text = (who: string) => `${theyCommitted(who, pr.text)}${THE_PLACE_MARK} by ${theDay(pr.dueDate)}, and it is ${lateWords(late)}.`;
    /* "Someone" is the word for a person nobody has a name for (decision 115): a lead cannot act on it, so it is not told. */
    if (pr.participant?.userId !== lead.userId && nameToCall(pr.participant) === SOMEONE) continue;
    if (pr.participant?.userId === lead.userId) out.needsYou.push({ text: text('You'), late, group: 2, keptInTheApp: keptOffThePhone(g), place: g.label });
    else if (ids.includes(pr.groundId) && letIn(pr.participant) && (pr.authoredBy === 'self' || pr.seenBySubject)) out.overdueOnYourTeam.push({ text: text(nameToCall(pr.participant)), late, keptInTheApp: keptOffThePhone(g), place: g.label });
  }

  /* Waits on her people's work: open, named, in her check-ins. */
  const waits: any[] = ids.length
    ? await prisma.groundDependency.findMany({
        where: { groundId: { in: ids }, status: { in: OPEN_WAIT }, clearedAt: null },
        select: {
          id: true, groundId: true, what: true, namedTheThing: true, onLabel: true, status: true, createdAt: true, dueOn: true, blockerKind: true, fromParticipantId: true, onParticipantId: true,
          fromParticipant: { select: PERSON }, onParticipant: { select: PERSON },
        },
      }).catch(() => [])
    : [];
  const real = oneBlockerPerThingWaitedOn(dedupeDependencies(waits as any)).filter(blockerHasSubstance) as any[];
  const saidWait = (w: any, isAre: string): string => {
    const from = hers.has(w.fromParticipantId) ? 'You' : nameToCall(w.fromParticipant);
    const on = hers.has(w.onParticipantId) ? 'you' : w.onParticipant ? nameToCall(w.onParticipant) : (w.onLabel ?? '').trim();
    const verb = from === 'You' ? (isAre === 'has been' ? 'have been' : 'are') : isAre;
    return theWaitSaid(from, verb, on, w.what).replace(/\.$/, '');
  };
  const counted = new Set<string>();
  for (const w of real) {
    if (!letIn(w.fromParticipant) && !hers.has(w.fromParticipantId)) continue;
    if (!aWaitReadsAsASentence(w)) continue;
    if ((!hers.has(w.fromParticipantId) && nameToCall(w.fromParticipant) === SOMEONE) || (w.onParticipant && !hers.has(w.onParticipantId) && nameToCall(w.onParticipant) === SOMEONE)) continue;
    const onHer = hers.has(w.onParticipantId);
    const late = daysLate(w.dueOn, today);
    /* A decision she owes: somebody is waiting for her to decide it. */
    if (onHer && w.blockerKind === 'DECISION') {
      const since = `since ${theDay(w.createdAt)}`;
      out.needsYou.push({ text: `${saidWait(w, 'is')}${THE_PLACE_MARK} ${since}.`, late: late > 0 ? late : 0, group: 1, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId) });
      counted.add(w.id);
      continue;
    }
    if (late < 1) continue;
    const text = `${saidWait(w, 'is')}${THE_PLACE_MARK}, which was due on ${theDay(w.dueOn)} and is ${lateWords(late)}.`;
    if (onHer) out.needsYou.push({ text, late, group: 2, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId) });
    else if (w.onParticipant && letIn(w.onParticipant)) out.overdueOnYourTeam.push({ text, late, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId) });
    else continue;
    counted.add(w.id);
  }
  /* A decision that is hers in the plan: owned by her, with its day gone by and not done. */
  const entry = await theirRosterEntry(prisma, lead.organizationId, lead.userId, { externalId: true }).catch(() => null);
  if (entry?.externalId) {
    const decisions: any[] = await prisma.subject.findMany({
      where: { organizationId: lead.organizationId, type: 'DECISION', ownerExternalId: entry.externalId, sourceDeletedAt: null, dueDate: { lt: today } },
      select: { title: true, dueDate: true, status: true },
    }).catch(() => []);
    for (const d of decisions) {
      if (/^(done|decided|closed|complete|completed|met|dropped|cancelled|canceled)$/i.test((d.status ?? '').trim()) || !d.title?.trim()) continue;
      const late = daysLate(d.dueDate, today);
      if (late < 1) continue;
      out.needsYou.push({ text: `The decision ${quoted(d.title.trim())} is yours, and it was due on ${theDay(d.dueDate)}, so it is ${lateWords(late)}.`, late, group: 1 });
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
      out.risks.push({ text: `The target ${quoted(o.name.trim())} in ${quoted(g.label)} ${is}. ${sentence(stands.says)}`, late: 1_000_000, keptInTheApp: keptOffThePhone(g), place: g.label });
    }
  }
  /* A wait that has gone on too long, the oldest first, if it is not already said as overdue. */
  const tooLong = real
    .filter((w) => !counted.has(w.id) && aWaitReadsAsASentence(w) && letIn(w.fromParticipant) && (hers.has(w.fromParticipantId) || nameToCall(w.fromParticipant) !== SOMEONE) && !(w.onParticipant && !hers.has(w.onParticipantId) && nameToCall(w.onParticipant) === SOMEONE) && Math.floor((now.getTime() - new Date(w.createdAt).getTime()) / DAY) >= ESCALATE_AFTER_DAYS)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const w of tooLong) {
    out.risks.push({ text: `${saidWait(w, 'has been')}${THE_PLACE_MARK} since ${theDay(w.createdAt)}.`, keptInTheApp: kept(w.groundId), place: labelOf.get(w.groundId) });
  }
  /* A check-in where people have gone quiet. Not about a check-in that began before the engagement messages did. */
  if (deps.release) {
    for (const g of grounds) {
      const rows: any[] = await prisma.checkIn.findMany({
        where: { groundId: g.id },
        select: { participantId: true, sessionNumber: true, status: true, createdAt: true, availableFrom: true, participant: { select: { userId: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } } },
      }).catch(() => []);
      const away = await Promise.resolve(whoOnACheckInIsAway(prisma, g.id, now)).catch(() => new Map());
      const q = theQuietIn(rows, g.label, lead.userId, now, deps.release, new Set([...(away as Map<string, unknown>).keys()]));
      const n = q ? quietIn(q) : 0;
      if (!q || n < 1) continue;
      const who = n >= q.ofHowMany
        ? (q.ofHowMany === 1 ? 'The one person who can answer' : q.ofHowMany === 2 ? 'Both people' : `All ${aNumberInWords(q.ofHowMany)} people`)
        : `${capital(aNumberInWords(n))} of the ${aNumberInWords(q.ofHowMany)} people`;
      out.risks.push({ text: `${who} in ${quoted(g.label)} ${n === 1 ? 'has' : 'have'} not answered the latest check-in for more than a week.`, keptInTheApp: keptOffThePhone(g) });
    }
  }

  /* Most important first within a part: in "Needs you" what waits for her to approve, then a decision she owes, then her own late commitments; always the most overdue first. */
  const byLate = (a: AThingOutstanding, b: AThingOutstanding) => (b.late ?? 0) - (a.late ?? 0);
  out.needsYou.sort((a, b) => (a.group ?? 9) - (b.group ?? 9) || byLate(a, b));
  out.overdueOnYourTeam.sort(byLate);
  return out;
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
): Promise<{ needsYou: string[]; overdueOnYourTeam: string[]; risks: string[] } | null> {
  const grounds: any[] = await prisma.ground.findMany({
    where: { initiatorId: reader.userId, organizationId: reader.organizationId, status: { notIn: [...TERMINAL, ...HELD, GroundStatus.AWAITING_APPROVAL] } },
    select: { id: true, label: true, scenario: true, organizationId: true, overWhatsApp: true, initiatorId: true, timelineDays: true, cadence: true },
  });
  if (!grounds.length) return null;
  const release = await theEngagementMoment(prisma, now).catch(() => null);
  const found = await whatIsOutstandingFor(prisma, { userId: reader.userId, organizationId: reader.organizationId, grounds }, { boards: deps.boards, release }, now);
  if (!theseAreOutstanding(found)) return null;
  const said = withPlacesWhereTheyTellApart(found);
  const lines = (things: AThingOutstanding[]) => things.map((t) => sentence(t.text));
  return { needsYou: lines(said.needsYou), overdueOnYourTeam: lines(said.overdueOnYourTeam), risks: lines(said.risks) };
}

/** Each lead, from every check-in that is running: who runs what. */
async function theLeadsAndTheirCheckIns(prisma: any) {
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { status: { notIn: [...TERMINAL, ...HELD, GroundStatus.AWAITING_APPROVAL] } },
    select: { id: true, label: true, scenario: true, organizationId: true, overWhatsApp: true, initiatorId: true, timelineDays: true, cadence: true, workingDays: true },
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
  email: { sendTheLeadsDailyNudge: (to: string, subject: string, parts: TheNudgeParts, firstName: string | null | undefined, linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown> };
  boards: TheBoards;
  frontendUrl: string;
}

/** Why a message to a phone did not go, in the cases where the lead is still owed her nudge, by email. */
const WHEN_THE_PHONE_CANNOT_BE_USED = /Outside the 24-hour service window|first message to this number|said STOP|not approved/i;

/**
 * THE MORNING SWEEP. One message a lead, by the channel decision 120 names. Returns how many were tried (sent, held for the morning or refused by a rule).
 * A lead on approved leave, with nothing outstanding, or whose sign-in is gone gets nothing.
 */
export async function sendTheLeadsDailyNudges(deps: TheNudgeDoors, now: Date = new Date()): Promise<{ tried: number }> {
  const { prisma } = deps;
  const release = await theEngagementMoment(prisma, now).catch(() => null);
  const leads = await theLeadsAndTheirCheckIns(prisma);
  const turnedOn = await organisationsThatTurnedWhatsAppOn(prisma, deps.whatsapp as any, leads.map((l) => l.organizationId));
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  const link = `${base}/today`;
  let tried = 0;
  for (const lead of leads) {
    try {
      /* A team that said which days it works is not nudged on the others. */
      if (lead.grounds.every((g) => (g.workingDays ?? []).length > 0 && !isAWorkingDay(now, g.workingDays))) continue;
      const user = await prisma.user.findUnique({ where: { id: lead.userId }, select: { firstName: true, email: true, phoneNumber: true, deletedAt: true, isActive: true } });
      if (!user || user.deletedAt || user.isActive === false) continue;
      if (fallsInLeave(now, await theirApprovedLeave(prisma, lead.userId, lead.organizationId))) continue;
      const found = await whatIsOutstandingFor(prisma, lead, { boards: deps.boards, release }, now);
      if (!theseAreOutstanding(found)) continue;
      const outstanding = withPlacesWhereTheyTellApart(found);

      /* On WhatsApp when there is a number and WhatsApp is on for them, and they have not said stop. */
      const entry = await theirRosterEntry(prisma, lead.organizationId, lead.userId, { phone: true }).catch(() => null);
      const phone: string | null = entry?.phone ?? user.phoneNumber ?? null;
      const stopped = phone && deps.whatsapp.hasSaidStop ? await deps.whatsapp.hasSaidStop(phone).catch(() => false) : false;
      const phoneFacts = withPlacesWhereTheyTellApart(theseForAPhone(found));
      if (phone && !stopped && turnedOn.has(lead.organizationId) && theseAreOutstanding(phoneFacts)) {
        const template = theTemplateParagraph(user.firstName, phoneFacts, link);
        const window = theWindowForm(user.firstName, phoneFacts, link);
        /* The words a person reads inside the 24 hours are the window form; outside it, the template with its one paragraph. */
        const result: any = await deps.whatsapp.sendFor(lead.organizationId, phone, window, { kind: NUDGE_KIND, params: template.params });
        if (result?.sent !== false) { tried++; continue; }
        /* Not sent for a reason that means the phone cannot be used today: she is owed it by email instead. Held back by a rule of the day (one a day, "not now") means nothing more today. */
        if (!WHEN_THE_PHONE_CANNOT_BE_USED.test(String(result?.error ?? ''))) { tried++; continue; }
      }
      if (!user.email || (await isAlreadyHeld(prisma, NUDGE_SENDER, user.email))) continue;
      const went = await deps.email.sendTheLeadsDailyNudge(user.email, theNudgeSubject(outstanding), theNudgeParts(outstanding), user.firstName, 'See everything', link);
      if (went !== 'suppressed') tried++;
    } catch {
      /* One lead's nudge that could not be put together never stops the others. */
    }
  }
  return { tried };
}
