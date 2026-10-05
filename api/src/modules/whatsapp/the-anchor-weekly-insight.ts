import { GroundStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill } from './a-message-outside-the-window';
import { keptOffThePhone } from './a-check-in-kept-off-the-phone';
import { organisationsThatTurnedWhatsAppOn } from './only-where-whatsapp-is-turned-on';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { theirApprovedLeave, fallsInLeave } from '../suites/who-is-away';
import { theirRosterEntry } from '../suites/a-roster-entry-and-its-sign-in';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';
import { readTheMonthRecord, type TheMonthRecord } from '../board/the-anchor-month-record';
import { aContributionSaid, aWaitInAWords, aNumber, capital } from '../board/the-anchor-month-board';

/**
 * THE WEEKLY LEAD WHATSAPP INSIGHT (anchor piece 28; section 23; decision 105 item 2).
 *
 * "Every week, WhatsApp delivers a useful insight, not a notification." It follows the spec, names included ("Lucy
 * surfaced a customer risk nobody else had raised"), and on one chosen day a week (Friday) it replaces that day's
 * daily summary: it goes at half past six in Lagos, before the summary, and it counts as Groundwork writing first, so
 * `howOftenToday` holds the summary back that day. Only to the lead, only where the organisation has WhatsApp on.
 *
 * WHAT IT HOLDS, AND WHAT IT NEVER HOLDS. Only what the lead already reads on the month board: counts, the people in
 * that check-in by name for one thing each did (the same sentence as the board, piece 22), and one thing still in the
 * way. Never anybody's words quoted: a person's promise is said in our voice, as a sentence about what they did.
 * Never a name of somebody outside that check-in.
 */
export const THE_INSIGHT_KIND = 'anchor-weekly-insight';

/** The paragraph, from the month's record. Null when nobody has checked in, because there is nothing worth a message. */
export function theWeeklyInsightParagraph(r: TheMonthRecord): string | null {
  if (r.checkedIn === 0) return null;
  const out: string[] = [];
  const moved = r.saidWhatTheyWillDo > 0 || r.commitmentsDone > 0;
  if (moved) out.push('Your team is starting to move.');
  out.push(`This week, ${aNumber(r.checkedIn)} of ${aNumber(r.ofHowMany)} ${r.ofHowMany === 1 ? 'person' : 'people'} checked in${r.saidWhatTheyWillDo > 0 ? `, and ${aNumber(r.saidWhatTheyWillDo)} ${r.saidWhatTheyWillDo === 1 ? 'has' : 'have'} said what they will do themselves` : ''}.`);
  const named = (r.doneByPerson ?? [])[0];
  if (named) out.push(aContributionSaid(named.name, named.clause, named.settledBy));
  const stuck = r.waiting[0];
  if (stuck) {
    out.push(`One thing still needs attention. ${aWaitInAWords(stuck)}`);
    out.push('Groundwork is working on that with them.');
  }
  return out.map((s) => capital(s)).join(' ');
}

/** The message as the lead reads it, in the proposed `anchor_weekly_insight` template with its three blanks filled. */
export function theWeeklyInsight(firstName: string | null | undefined, paragraph: string, link: string) {
  const params = [firstName?.trim() || 'there', paragraph, link];
  return { kind: THE_INSIGHT_KIND, text: fill(TEMPLATES[THE_INSIGHT_KIND].body, params), params };
}

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];

/** Friday's sweep: one message per anchor check-in's lead, only while the anchor switch is on. Returns how many were tried. */
export async function sendTheAnchorWeeklyInsights(
  deps: { prisma: PrismaService; whatsapp: WhatsAppService; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  if (!(await theAnchorScenarioIsOn(prisma))) return { tried: 0 };
  const grounds: any[] = await (prisma as any).ground.findMany({
    where: { startedFrom: STARTED_FROM_THE_ANCHOR, status: { notIn: TERMINAL } },
    select: { id: true, organizationId: true, overWhatsApp: true, initiatorId: true, startedFrom: true },
  });
  const anchor = grounds.filter((g) => g.startedFrom === STARTED_FROM_THE_ANCHOR && !keptOffThePhone(g));
  const turnedOn = await organisationsThatTurnedWhatsAppOn(prisma, deps.whatsapp, anchor.map((g) => g.organizationId));
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const g of anchor) {
    try {
      if (!turnedOn.has(g.organizationId)) continue;
      const user = await prisma.user.findUnique({ where: { id: g.initiatorId }, select: { firstName: true, phoneNumber: true, deletedAt: true } });
      if (!user || user.deletedAt) continue;
      if (fallsInLeave(now, await theirApprovedLeave(prisma, g.initiatorId, g.organizationId))) continue;
      const entry = await theirRosterEntry(prisma, g.organizationId, g.initiatorId, { phone: true }).catch(() => null);
      const phone = entry?.phone ?? user.phoneNumber ?? null;
      if (!phone) continue;
      const paragraph = theWeeklyInsightParagraph(await readTheMonthRecord(prisma, g.id, 1));
      if (!paragraph) continue;
      const message = theWeeklyInsight(user.firstName, paragraph, `${base}/grounds/${g.id}/board`);
      await deps.whatsapp.sendFor(g.organizationId, phone, message.text, { kind: message.kind, params: message.params });
      tried++;
    } catch {
      /* One lead's insight that could not be put together never stops the others. */
    }
  }
  return { tried };
}
