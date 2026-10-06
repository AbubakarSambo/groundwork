import { GroundStatus } from '@prisma/client';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { theEngagementMoment } from './the-engagement-release-moment';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { aNumberInWords } from './a-number-in-words';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from './a-message-sent-once';
import { theNextCheckInFor, theSuggestionSaid } from './the-next-check-in-from-what-happened';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * THE FOLLOW-UP AFTER A REPORT (decision 109; spec sections 11 and 36, journey 6).
 *
 * The email that was meant for a lead sitting on a report asked for a status (REPORT_READY) that has not been written since June, so it never went. This
 * replaces it. A week after a report went out, if the lead has not opened a next session, she is sent ONE message, once, that says what changed since
 * and what has not: things people said they would do that were done, handoffs cleared, handoffs still waiting, things still open. Counts only, from the
 * record. It then suggests one next check-in, from what the record shows (the-next-check-in-from-what-happened.ts).
 *
 * EXISTING CLIENTS ONLY GET BETTER (decision 109 item 2): only a report released at or after the release moment is followed up, and never one on a check-in
 * that has stalled, ended or is held.
 */
export const REPORT_FOLLOW_UP_SENDER = 'sendTheReportFollowUp';
export const A_WEEK = 7;
const DAY = 86_400_000;

export interface WhatChangedSinceTheReport { done: number; cleared: number; waiting: number; open: number; scenario?: string | null; daysSinceTheReport?: number }

/** A long name cut at a word, never in the middle of one. */
export function cutAtAWord(label: string, max: number): string {
  if (label.length <= max) return label;
  const cut = label.slice(0, max);
  /* The cut falls exactly at the end of a word: keep it whole. */
  if (label[max] === ' ') return `${cut.trimEnd()}...`;
  const at = cut.lastIndexOf(' ');
  return `${(at > 8 ? cut.slice(0, at) : cut).trimEnd()}...`;
}

const things = (n: number, one: string, many: string) => `${aNumberInWords(n)} ${n === 1 ? one : many}`;
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

export function theFollowUpWords(firstName: string | null | undefined, label: string, wentOut: Date, c: WhatChangedSinceTheReport) {
  const changed: string[] = [];
  if (c.done > 0) changed.push(`${things(c.done, 'thing people said they would do was', 'things people said they would do were')} done`);
  if (c.cleared > 0) changed.push(`${things(c.cleared, 'handoff was', 'handoffs were')} cleared`);
  const stillThere: string[] = [];
  if (c.waiting > 0) stillThere.push(`${things(c.waiting, 'handoff is', 'handoffs are')} still waiting`);
  if (c.open > 0) stillThere.push(`${things(c.open, 'thing people said they would do is', 'things people said they would do are')} still open`);
  /* A subject that carries the finding and stays short (under about a hundred characters): counts in words, the check-in's name cut if it is long. */
  const name = cutAtAWord(label, 30);
  const moved = c.done + c.cleared;
  const subject = moved > 0 && c.waiting > 0
    ? `${capital(things(moved, 'thing', 'things'))} on "${name}" moved after the report, and ${things(c.waiting, 'handoff still waits', 'handoffs still wait')}`
    : moved > 0
      ? `${capital(things(moved, 'thing', 'things'))} on "${name}" moved after the report went out`
      : c.waiting > 0
        ? `${capital(things(c.waiting, 'handoff', 'handoffs'))} on "${name}" still ${c.waiting === 1 ? 'waits' : 'wait'}, and nothing has been marked done since the report`
        : `Nothing has been marked done or cleared on "${name}" since the report went out`;
  const lines = [
    `Hello ${firstName?.trim() || 'there'}. The report for "${label}" went out on ${whenItWas(wentOut, 'day')}.`,
    changed.length ? `Since then, ${changed.join(' and ')}.` : 'Since then, nothing has been marked done or cleared.',
    ...(stillThere.length ? [`${capital(stillThere.join(' and '))}.`] : []),
    theSuggestionSaid(theNextCheckInFor(c)),
  ];
  return { subject, lines, linkLabel: 'See where it stands' };
}

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];

export async function sendTheReportFollowUps(
  deps: { prisma: any; email: { sendTheReportFollowUp: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown> }; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  let release: Date;
  try { release = await theEngagementMoment(prisma, now); } catch { return { tried: 0 }; }
  const reports: any[] = await everyRowAPageAtATime((page: any) => prisma.report.findMany({
    where: { releasedAt: { gte: release, lte: new Date(now.getTime() - A_WEEK * DAY) }, ground: { status: { notIn: TERMINAL } } },
    select: { groundId: true, releasedAt: true, ground: { select: { label: true, scenario: true, initiatorId: true, initiator: { select: { email: true, firstName: true, deletedAt: true, isActive: true } } } } },
    orderBy: { releasedAt: 'asc' },
    ...page,
  }), 500);
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const r of reports) {
    try {
      const lead = r.ground?.initiator;
      if (!lead?.email || lead.deletedAt || lead.isActive === false) continue;
      const once = `report-follow-up:${r.groundId}`;
      if (await hasBeenToldOnce(prisma, once) || await isAlreadyHeld(prisma, REPORT_FOLLOW_UP_SENDER, lead.email)) continue;
      /* She has opened a next session: the work went on, so there is nothing to follow up. */
      const next = await prisma.checkIn.findFirst({ where: { groundId: r.groundId, createdAt: { gt: r.releasedAt } }, select: { id: true } });
      if (next) continue;
      const since = { gte: r.releasedAt as Date, lte: now };
      const [done, cleared, waiting, open] = await Promise.all([
        prisma.groundCommitment.count({ where: { groundId: r.groundId, status: 'DONE', settledAt: since } }),
        prisma.groundDependency.count({ where: { groundId: r.groundId, status: 'CLEARED', clearedAt: since } }),
        prisma.groundDependency.count({ where: { groundId: r.groundId, status: { not: 'CLEARED' } } }),
        prisma.groundCommitment.count({ where: { groundId: r.groundId, status: 'UNKNOWN' } }),
      ]);
      const w = theFollowUpWords(lead.firstName, r.ground.label, r.releasedAt, { done, cleared, waiting, open, scenario: r.ground.scenario, daysSinceTheReport: Math.floor((now.getTime() - new Date(r.releasedAt).getTime()) / DAY) });
      const went = await deps.email.sendTheReportFollowUp(lead.email, w.subject, w.lines, w.linkLabel, `${base}/grounds/${r.groundId}/board`);
      await nowToldOnce(prisma, once, went, { sender: REPORT_FOLLOW_UP_SENDER, to: lead.email });
      if (went !== 'suppressed') tried++;
    } catch {
      /* One lead's follow-up that could not be put together never stops the others. */
    }
  }
  return { tried };
}
