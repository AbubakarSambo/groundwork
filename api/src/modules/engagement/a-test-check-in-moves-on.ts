import { CheckInStatus, GroundStatus } from '@prisma/client';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { theReleaseMoment } from '../grounds/the-release-moment';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';

/**
 * A TEST CHECK-IN MOVES TOWARD ONE SMALL REAL ONE (decision 109 item 8; engagement spec sections 8 and 9).
 *
 * WHAT A TEST CHECK-IN IS, in the two ways Hafsah named: a check-in where ONLY THE LEAD has taken part, a week after it was made, and the anchor's
 * trial, which is a test the same way but is not left a week (three days). Anybody else having taken part makes it real, whatever it was called.
 *
 * WHAT THEY ARE SENT. One email, once, and never a feature list. It starts from what they tried, in their own check-in's name and kind, and asks for
 * the next small thing: one real situation and three to five real people. It does not say "roll it out" and it never mentions the organisation.
 *
 * EXISTING CLIENTS ONLY GET BETTER (decision 109 item 2). Only a check-in made at or after the release is looked at. One that was already running,
 * stalled or not, is left alone.
 */
export const TEST_SENDER = 'sendTestCheckInMovesOn';
export const A_WEEK_DAYS = 7;
export const THE_TRIAL_DAYS = 3;
const DAY = 86_400_000;

export interface TheTestWords { subject: string; lines: string[]; linkLabel: string }

const kindOf = (g: { label: string; scenario?: string | null }): 'sales' | 'project' | 'new hire' | 'other' => {
  if (/\bsales?\b/i.test(g.label)) return 'sales';
  if (g.scenario === 'NEW_HIRE' || g.scenario === 'NEW_MANAGER') return 'new hire';
  if (g.scenario === 'NEW_PROJECT' || g.scenario === 'WORKPLAN_BUDGET' || g.scenario === 'OKR_ALIGNMENT') return 'project';
  return 'other';
};

/** What the lead reads. Built from the name and kind of what she tried, nothing more. */
export function theTestWords(g: { label: string; scenario?: string | null }): TheTestWords {
  const tried = `You tried "${g.label}" on your own, so you have seen how Groundwork works.`;
  switch (kindOf(g)) {
    case 'sales':
      return {
        subject: 'Try this with your real sales team',
        lines: [tried, 'Add 3 to 5 people around one live sales target. Groundwork will privately check whether everyone sees the target, opportunities and blockers the same way.'],
        linkLabel: 'Start with your real sales team',
      };
    case 'project':
      return {
        subject: 'Try it on one live project',
        lines: [tried, 'Choose one project involving several people. Groundwork will show you where delivery is aligned and where the picture differs.'],
        linkLabel: 'Start with one live project',
      };
    case 'new hire':
      return {
        subject: 'Try it with one real new hire',
        lines: [tried, 'Choose one person who has just joined, and add the few people who work with them. Groundwork will privately check how their first weeks look to each of them.'],
        linkLabel: 'Start with one real new hire',
      };
    default:
      return {
        subject: 'Try it now on one real situation',
        lines: [tried, 'Choose one real situation and add 3 to 5 people involved. Groundwork will privately check whether everyone sees it the same way.'],
        linkLabel: 'Start with one real situation',
      };
  }
}

/** Whether this check-in is a test: only the lead took part, and it has been long enough. */
export function isATestCheckIn(
  g: { startedFrom?: string | null; createdAt: Date },
  tookPart: { participantId: string; userId: string | null }[],
  leadUserId: string,
  now: Date,
): boolean {
  const days = g.startedFrom === STARTED_FROM_THE_ANCHOR ? THE_TRIAL_DAYS : A_WEEK_DAYS;
  if (now.getTime() - g.createdAt.getTime() < days * DAY) return false;
  if (!tookPart.length) return false;
  return tookPart.every((p) => p.userId === leadUserId);
}

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];

/**
 * The sweep. One email to a lead, once ever, for the oldest check-in of theirs that is a test. Returns how many were tried. The sender decides
 * whether each may go (the opt-out, the one routine message a day, quiet hours).
 */
export async function sendTheTestCheckInMessages(
  deps: { prisma: any; email: { sendTestCheckInMovesOn: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<unknown> }; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  let release: Date;
  try { release = await theReleaseMoment(prisma, now); } catch { return { tried: 0 }; }
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { status: { notIn: TERMINAL }, createdAt: { gte: release, lte: new Date(now.getTime() - THE_TRIAL_DAYS * DAY) } },
    select: { id: true, label: true, scenario: true, startedFrom: true, createdAt: true, initiatorId: true },
    orderBy: { createdAt: 'asc' },
    ...page,
  }), 1000);
  const seen = new Set<string>();
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const g of grounds) {
    if (seen.has(g.initiatorId)) continue;
    try {
      const rows: any[] = await prisma.checkIn.findMany({
        where: { groundId: g.id, status: { not: CheckInStatus.NOT_STARTED } },
        select: { participantId: true, participant: { select: { userId: true, managingOnly: true, user: { select: { awaitingOrgApproval: true } } } } },
      });
      const tookPart = rows
        .filter((r) => !r.participant?.managingOnly && !isNotLetInYet(r.participant))
        .map((r) => ({ participantId: r.participantId as string, userId: (r.participant?.userId ?? null) as string | null }));
      if (!isATestCheckIn(g, tookPart, g.initiatorId, now)) continue;
      seen.add(g.initiatorId);
      const user = await prisma.user.findUnique({ where: { id: g.initiatorId }, select: { email: true, deletedAt: true } });
      if (!user?.email || user.deletedAt) continue;
      /* Once, ever: a lead who has had this is not written to again. */
      const had = await prisma.notification.findFirst({ where: { channel: 'email', sender: TEST_SENDER, toAddress: user.email.trim().toLowerCase(), outcome: { in: ['sent', 'held'] } }, select: { id: true } });
      if (had) continue;
      const w = theTestWords(g);
      await deps.email.sendTestCheckInMovesOn(user.email, w.subject, w.lines, w.linkLabel, `${base}/start`);
      tried++;
    } catch {
      /* One lead's message that could not be put together never stops the others. */
    }
  }
  return { tried };
}
