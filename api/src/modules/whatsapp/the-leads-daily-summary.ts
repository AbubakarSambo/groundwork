import { whoHasNotJoinedYet } from '../grounds/invited-not-joined-yet';
import { wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';
import { nameToCall, aNameToList } from '../engagement/a-name-to-call-them';
import { createHash } from 'crypto';
import { CheckInStatus, GroundStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill } from './a-message-outside-the-window';
import { formsOfTheSameNumber } from './a-number-whatsapp-can-reach';
import { keptOffThePhone } from './a-check-in-kept-off-the-phone';
import { everyRowAPageAtATime } from './every-row-a-page-at-a-time';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { organisationsThatTurnedWhatsAppOn } from './only-where-whatsapp-is-turned-on';
import { theRoundACountIsAbout } from '../board/which-round-is-open';
import { theCheckIn } from '../grounds/which-check-in-it-is';
import { namesTheyCanTellApart } from '../../common/check-ins-you-can-tell-apart';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { theirApprovedLeave, fallsInLeave } from '../suites/who-is-away';
import { theirRosterEntry } from '../suites/a-roster-entry-and-its-sign-in';
import { type TheBoards } from '../suites/what-waits-for-you-to-decide';
import type { AWaitingRequest } from '../suites/a-request-in-words';

/**
 * THE LEAD'S DAILY SUMMARY ON WHATSAPP (decision 82, item 9; decision 83; template `lead_daily_summary`).
 *
 * Once a day, in the morning in Lagos, each lead with a check-in open gets one message: for each of
 * their open check-ins, how many of the people who can answer have checked in and who has not yet,
 * and anything waiting for them to approve or decline. It is the lead's one message of the day
 * (decision 13), so it goes through `howOftenToday` like every message Groundwork starts, and an
 * approval that could not be told yesterday is carried here.
 *
 * What it never says: anything from a check-in the lead keeps in the app, anybody an admin has not
 * let in yet or anybody who only manages (decision 77), and nothing anybody said. {{2}} is one
 * paragraph in plain full sentences, with no line breaks.
 */

const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const aNumber = (n: number) => (n <= 10 ? NUMBER[n] : String(n));
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export interface ACheckInToday {
  label: string;
  /** People who can answer this session: not managing only, and let in. */
  ofHowMany: number;
  answered: number;
  /** First names of those who have not checked in yet. */
  notYet: string[];
  /** When somebody who can answer last checked in, for this session. Null when nobody has. */
  lastAnswerAt?: Date | null;
  /** Which round it is about, so the count says so and agrees with Today and the board. */
  round?: number;
}

/**
 * IF NOTHING USEFUL HAPPENED, SEND NOTHING (decision 109, spec 26; audit item 9). A summary that says nobody
 * has checked in yet, the same as yesterday, is a message the lead learns to ignore. It goes when something
 * waits for her to decide, or when somebody has checked in since the last one she was sent (or, if she has had
 * none, when anybody has checked in at all).
 */
export function somethingUsefulHappened(checkIns: ACheckInToday[], waiting: AWaitingRequest[], lastSummaryAt: Date | null): boolean {
  if (waiting.length) return true;
  return checkIns.some((c) => c.answered > 0 && (!lastSummaryAt || (!!c.lastAnswerAt && c.lastAnswerAt > lastSummaryAt)));
}

/** One check-in, in one sentence. Null when nobody can answer it yet. */
export function aCheckInInASentence(c: ACheckInToday): string | null {
  if (c.ofHowMany < 1) return null;
  const where = `In "${c.label}"`;
  /* Which round the count is about, said the way Today and the board say it ("for the second check-in"). */
  const forIt = c.round ? ` for ${theCheckIn(c.round)}` : '';
  if (c.answered >= c.ofHowMany) {
    return c.ofHowMany === 1 ? `${where}, the one person who can answer has checked in${forIt}.` : c.ofHowMany === 2 ? `${where}, both people have checked in${forIt}.` : `${where}, all ${c.ofHowMany} people have checked in${forIt}.`;
  }
  if (c.answered === 0) return `${where}, nobody has checked in${forIt} yet, out of ${c.ofHowMany} ${c.ofHowMany === 1 ? 'person' : 'people'}.`;
  /* Up to three by name; anybody else, and anybody with no name known, is counted, so the names never read as everyone. */
  const missing = c.ofHowMany - c.answered;
  const named = c.notYet.slice(0, c.notYet.length > 3 ? 2 : 3);
  const others = missing - named.length;
  /* "you" is the reader herself, so the verb is "have" whenever she is one of those named. */
  const waitingOn = named.length
    ? `, and ${listed(others > 0 ? [...named, others === 1 ? 'one other person' : `${others} others`] : named)} ${missing === 1 && !named.includes('you') ? 'has' : 'have'} not yet`
    : '';
  return `${where}, ${c.answered} of ${c.ofHowMany} people ${c.answered === 1 ? 'has' : 'have'} checked in${forIt}${waitingOn}.`;
}

/** What waits for the lead to decide, in one sentence. Null when nothing does. */
export function whatWaitsInASentence(waiting: AWaitingRequest[]): string | null {
  if (!waiting.length) return null;
  if (waiting.length === 1) {
    const r = waiting[0];
    return r.kind === 'hours'
      ? `${capital(r.thing)} are waiting for you to approve.`
      : `${capital(r.thing)} is waiting for you to approve or decline.`;
  }
  return `${capital(aNumber(waiting.length))} requests are waiting for you to approve or decline.`;
}

/** {{2}}: one paragraph, plain sentences, no line breaks. Null when there is nothing to say. */
export function theSummaryParagraph(checkIns: ACheckInToday[], waiting: AWaitingRequest[]): string | null {
  const said = [...checkIns.map(aCheckInInASentence), whatWaitsInASentence(waiting)].filter((s): s is string => !!s);
  return said.length ? said.join(' ') : null;
}

/** The message as the lead reads it: Hafsah's `lead_daily_summary` with its three blanks filled. */
export function theLeadsDailySummary(firstName: string | null | undefined, paragraph: string, link: string) {
  const params = [firstName?.trim() || 'there', paragraph, link];
  return { kind: 'lead-summary', text: fill(TEMPLATES['lead-summary'].body, params), params };
}

const SAID_KEY = (leadId: string) => `engagement.summary-said.${leadId}`;
const hashOfTheWords = (t: string) => createHash('sha256').update(t.trim().replace(/\s+/g, ' ')).digest('hex').slice(0, 24);
async function lastSaid(prisma: any, leadId: string): Promise<string | null> {
  try { return (await prisma.platformSetting.findUnique({ where: { key: SAID_KEY(leadId) } }))?.value?.hash ?? null; } catch { return null; }
}
async function nowSaid(prisma: any, leadId: string, hash: string): Promise<void> {
  const value = { hash, at: new Date().toISOString() };
  try { await prisma.platformSetting.create({ data: { key: SAID_KEY(leadId), value, updatedBy: 'engagement' } }); }
  catch { try { await prisma.platformSetting.update({ where: { key: SAID_KEY(leadId) }, data: { value, updatedBy: 'engagement' } }); } catch { /* not remembered: the next morning may repeat once */ } }
}

const TERMINAL: GroundStatus[] = A_GROUND_NO_MESSAGE_IS_ABOUT;

/**
 * THE MORNING SWEEP. Every lead with a check-in open, in every organisation, one message each. A lead
 * on approved leave today, with no number, or whose sign-in is gone gets nothing. Returns how many
 * were tried; the sender decides whether each may go.
 */
export async function sendTheLeadsDailySummaries(
  deps: { prisma: PrismaService; whatsapp: WhatsAppService; boards: TheBoards; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  const grounds: any[] = await everyRowAPageAtATime((page) => prisma.ground.findMany({
    where: { status: { notIn: TERMINAL } },
    select: { id: true, label: true, createdAt: true, organizationId: true, overWhatsApp: true, initiatorId: true },
    ...page,
  }), 1000);

  /* Each lead's open check-ins that may go to a phone, per organisation. */
  const turnedOn = await organisationsThatTurnedWhatsAppOn(prisma, deps.whatsapp, grounds.map((g) => g.organizationId));
  const startedOn = new Map<string, Date | null>();
  const byLead = new Map<string, { organizationId: string; leadId: string; checkIns: (ACheckInToday & { groundId: string })[] }>();
  for (const g of grounds) {
    if (keptOffThePhone(g)) continue;
    if (!turnedOn.has(g.organizationId)) continue;
    const today = await theOpenSession(prisma, g.id, now, g.initiatorId);
    if (!today) continue;
    /* Every check-in has a lead: `Ground.initiatorId` is required, so there is no lead-less one to skip. */
    const key = `${g.organizationId}|${g.initiatorId}`;
    const lead = byLead.get(key) ?? { organizationId: g.organizationId as string, leadId: g.initiatorId as string, checkIns: [] as (ACheckInToday & { groundId: string })[] };
    lead.checkIns.push({ ...today, groundId: g.id, label: g.label });
    startedOn.set(g.id, g.createdAt);
    byLead.set(key, lead);
  }
  /* Two of her check-ins with the same name are told apart by when each started. */
  for (const lead of byLead.values()) {
    const said = namesTheyCanTellApart(lead.checkIns.map((c) => ({ id: c.groundId, label: c.label, startedAt: startedOn.get(c.groundId) })));
    lead.checkIns = lead.checkIns.map((c) => ({ ...c, label: said.get(c.groundId) ?? c.label }));
  }

  let tried = 0;
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  for (const lead of byLead.values()) {
    try {
      const user = await prisma.user.findUnique({ where: { id: lead.leadId }, select: { firstName: true, phoneNumber: true, deletedAt: true } });
      if (!user || user.deletedAt) continue;
      if (fallsInLeave(now, await theirApprovedLeave(prisma, lead.leadId, lead.organizationId))) continue;
      const entry = await theirRosterEntry(prisma, lead.organizationId, lead.leadId, { phone: true }).catch(() => null);
      const phone = entry?.phone ?? user.phoneNumber ?? null;
      if (!phone) continue;
      /* WHAT WAITS FOR HER TO APPROVE IS NOT SAID HERE (B-120, decision 92 item 3). Approvals are told straight away and once each morning by their own message,
         with their own count. Said here too, the same lead read two messages about them in the same second, and the two counts could differ (B-121). */
      const waiting: AWaitingRequest[] = [];
      const paragraph = theSummaryParagraph(lead.checkIns, waiting);
      if (!paragraph) continue;
      const last = await (async () => prisma.whatsAppSend.findFirst({ where: { phone: { in: formsOfTheSameNumber(phone) }, kind: { startsWith: 'lead-summary' }, sentAt: { not: null } }, orderBy: { sentAt: 'desc' }, select: { sentAt: true } }))().catch(() => null);
      if (!somethingUsefulHappened(lead.checkIns, waiting, last?.sentAt ?? null)) continue;
      /* THE SAME WORDS TWICE IS NOTHING NEW (decision 109 item 7). The last summary that went to this lead is remembered by its words; one that reads the same is not sent again,
         whatever else is true, so a lead with an approval that has waited a week is not told the same thing every morning (it was, eight mornings running, in a copy of a real database). */
      const said = hashOfTheWords(paragraph);
      if ((await lastSaid(prisma, lead.leadId)) === said) continue;
      /* "You can open your board" opens a board: the check-in the paragraph begins with (engine test, second run, Wanjiru's two check-ins). */
      const link = lead.checkIns.length ? `${base}/grounds/${lead.checkIns[0].groundId}/board` : `${base}/today`;
      const message = theLeadsDailySummary(user.firstName, paragraph, link);
      const result: any = await deps.whatsapp.sendFor(lead.organizationId, phone, message.text, { kind: message.kind, params: message.params });
      /* Remembered only when it really went: one the day's limit, a "not now" or an unapproved template refused is tried again, and says the same thing then. */
      if (result?.sent !== false) await nowSaid(prisma, lead.leadId, said);
      tried++;
    } catch {
      /* One lead's summary that could not be put together never stops the others. */
    }
  }
  return { tried };
}

/**
 * The session open now on a check-in, counted the way every count is (decision 77): only the people
 * who can answer, never anybody only managing or not yet let in. Null when no session is open.
 */
async function theOpenSession(prisma: PrismaService, groundId: string, now: Date, leadUserId: string): Promise<Omit<ACheckInToday, 'label'> | null> {
  const rows: any[] = await prisma.checkIn.findMany({
    where: { groundId, OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
    select: {
      status: true, sessionNumber: true, completedAt: true, closedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } },
      participant: { select: { id: true, partyType: true, cameThroughTheLink: true, userId: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } },
    },
  });
  if (!rows.length) return null;
  /* Invited, not joined yet: left out of the count like somebody not let in (decision 8 redone, night run 3). */
  const notJoined = await whoHasNotJoinedYet(prisma, [...new Map(rows.map((r: any) => [r.participant?.id, r.participant])).values()].filter(Boolean)).catch(() => new Set<string>());
  for (const r of rows) if (r.participant && notJoined.has(r.participant.id)) r.participant = { ...r.participant, notJoinedYet: true };
  /* A session the clock closed with nothing said is not an answer. */
  const answeredIt = (r: any) => r.status === CheckInStatus.COMPLETED && !wasAQuietClose(r);
  /* The round the board and Today call open, not whichever is newest: rows for the next round are written ahead. */
  const latest = theRoundACountIsAbout(rows.map((r) => ({ sessionNumber: r.sessionNumber ?? 0, status: r.status })));
  const session = rows.filter((r) => (r.sessionNumber ?? 0) === latest);
  if (!session.some((r) => r.status === CheckInStatus.NOT_STARTED || r.status === CheckInStatus.IN_PROGRESS)) return null;
  const counted = session.filter((r) => !r.participant?.managingOnly && !isNotLetInYet(r.participant));
  const done = counted.filter(answeredIt);
  const notYet = counted
    .filter((r) => !answeredIt(r))
    /* The lead is one of the people who can answer, and she is "you" to herself, never her own name in the third person. */
    .map((r) => (r.participant?.userId && r.participant.userId === leadUserId ? 'you' : nameToCall(r.participant as any)))
    .filter(aNameToList)
    .sort((a: string, b: string) => (a === 'you' ? -1 : b === 'you' ? 1 : 0));
  const times = done.map((r) => r.completedAt).filter((t: unknown): t is Date => t instanceof Date);
  /* An answer with no time recorded is not evidence that anything happened since the last summary. */
  const lastAnswerAt = times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null;
  return { ofHowMany: counted.length, answered: done.length, notYet, lastAnswerAt, round: latest };
}
