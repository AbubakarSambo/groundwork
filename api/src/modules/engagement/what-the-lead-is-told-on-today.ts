import { GroundStatus } from '@prisma/client';
import { A_GROUND_NO_MESSAGE_IS_ABOUT, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { theEngagementMoment } from './the-engagement-release-moment';
import { theWaitingWords, whoIsWaitedOn, WHAT_WAITING_READS } from './waiting-on-the-people-you-invited';
import { theRestOfTheWeekIn, type AWeekInOneCheckIn } from '../email/the-leads-weekly-letter';
import { whatTheLeadsWeeklyReportSays } from './the-leads-own-weekly-report';
import { saysTheSame } from './a-sentence-said-twice';

/**
 * WHAT A LEAD IS TOLD ON TODAY THAT THE MAIL ALSO TELLS HER (screens request 198, b).
 *
 * Two facts reached a lead only by email: that nobody she invited has started and Groundwork is following up (the first-reminder message), and what Groundwork
 * would do this week (the Friday letter and the first-insight mail). Today now carries them, from the same functions that write the mail
 * (`theWaitingWords`, `theRestOfTheWeekIn` over the weekly report's own "for you to do next week"), so Today and the mail can never disagree.
 *
 * A LEAD ONLY, for the check-ins she runs. Nothing for a participant, and nothing that is not hers. A sentence that Today already says (its own cards, or the
 * daily nudge's page, GET /today/outstanding) is not said again.
 */
export interface WhatTheLeadIsToldOnToday {
  /** Check-ins where everybody invited is still to start and Groundwork is reminding them: the mail's own subject, sentences and link words. */
  nobodyHasStarted: { groundId: string; label: string; subject: string; lines: string[]; linkLabel: string; to: string }[];
  /** What Groundwork would do this week, for each check-in she runs that has something: "Here is what I would do this week." and then each thing, in the Friday letter's words. */
  whatIWouldDoThisWeek: { groundId: string; label: string; lines: string[] }[];
}

const norm = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export async function whatTheLeadIsToldOnToday(
  prisma: any,
  reader: { userId: string; role?: string | null; organizationId: string },
  deps: {
    /** Everything Today already says to her, as sentences: its cards, and the daily nudge's page. */
    alreadySaid: string[];
    /** The weekly report as she is served it (TheWeeklyReportService.read), or absent. */
    weeklyReport?: (groundId: string, now: Date) => Promise<any>;
  },
  now: Date = new Date(),
): Promise<WhatTheLeadIsToldOnToday | null> {
  const grounds: any[] = await prisma.ground.findMany({
    where: { initiatorId: reader.userId, organizationId: reader.organizationId, status: { notIn: [...A_GROUND_NO_MESSAGE_IS_ABOUT, ...A_GROUND_IS_HELD, GroundStatus.AWAITING_APPROVAL] } },
    select: { ...WHAT_WAITING_READS, createdAt: true, chasingStopped: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!grounds.length) return null;
  const said = deps.alreadySaid.filter(Boolean);
  const isNew = (line: string) => !said.some((s) => norm(s) === norm(line) || saysTheSame(s, line));
  const me = await prisma.user.findUnique({ where: { id: reader.userId }, select: { firstName: true } }).catch(() => null);
  const release = await theEngagementMoment(prisma, now).catch(() => null);

  const nobodyHasStarted: WhatTheLeadIsToldOnToday['nobodyHasStarted'] = [];
  const whatIWouldDoThisWeek: WhatTheLeadIsToldOnToday['whatIWouldDoThisWeek'] = [];
  for (const g of grounds) {
    try {
      /* The mail is for check-ins made after the engagement messages began, and not for one whose reminders the lead stopped. */
      if (release && new Date(g.createdAt) >= release && !g.chasingStopped) {
        const facts = await whoIsWaitedOn(prisma, g, now);
        if (facts) {
          const w = theWaitingWords(me?.firstName, facts);
          /* The mail opens "Hello Wairimu."; Today has already greeted her ("Morning, Wairimu"), so a card on it does not greet her again (test bed copy a, 9 October). */
          const hello = `Hello ${me?.firstName?.trim() || 'there'}. `;
          const lines = w.lines.map((l, i) => (i === 0 && l.startsWith(hello) ? l.slice(hello.length) : l));
          if (isNew(w.subject)) nobodyHasStarted.push({ groundId: g.id, label: g.label, subject: w.subject, lines, linkLabel: w.linkLabel, to: `/grounds/${g.id}` });
        }
      }
      const read = await deps.weeklyReport?.(g.id, now).catch(() => null);
      const says = whatTheLeadsWeeklyReportSays(read, now);
      if (says?.toDo.length) {
        const week: AWeekInOneCheckIn = { groundId: g.id, label: g.label, ofHowMany: 0, checkedIn: 0, notYet: [], saidWhatNext: 0, done: 0, waiting: 0, toDo: says.toDo.filter((t) => isNew(`${t.do} ${t.why ?? ''}`)) };
        const lines = week.toDo!.length ? theRestOfTheWeekIn(week, 3) : [];
        if (lines.length) whatIWouldDoThisWeek.push({ groundId: g.id, label: g.label, lines });
      }
    } catch {
      /* One check-in that could not be read never stops the others, and never fails Today. */
    }
  }
  return nobodyHasStarted.length || whatIWouldDoThisWeek.length ? { nobodyHasStarted, whatIWouldDoThisWeek } : null;
}
