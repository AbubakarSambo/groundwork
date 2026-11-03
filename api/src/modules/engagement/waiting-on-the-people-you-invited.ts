import { ABOUT_HOW_LONG } from '../../common/how-long-a-check-in-takes';
import { theDirectMorningIsOnFor } from '../organisation/the-direct-morning-switch';
import { GroundStatus } from '@prisma/client';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { theEngagementMoment } from './the-engagement-release-moment';
import { nameToCall, namesWithTheRestCounted } from './a-name-to-call-them';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { aNumberInWords } from './a-number-in-words';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from './a-message-sent-once';
import { theyHaveStoppedTheseEmails } from './the-ways-to-stop-mail';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * INVITED, AND NOBODY HAS STARTED: THE LEAD IS TOLD WHAT GROUNDWORK IS DOING WHILE IT DOES IT (engagement spec section 5; section 36, journey 3).
 *
 * "Groundwork should own the journey." Until now the lead heard nothing for the first two weeks. The reminders went to the people, and the one message to her
 * came when the reminders were over. Now, on the first reminder day, if nobody she invited has started, she is sent this once: who was invited and when, who
 * has already been reminded, when the next reminders go, that she need not chase anyone herself, and words she may send if she wants to. It makes no claim
 * about why they have not started, and says nothing of anybody's answers, because there are none.
 *
 * It is not sent for a check-in where somebody has started (that is the partial-picture message), for one that stalled, ended or is held, for one the lead
 * turned the reminders or her own notice off for, or for one made before the engagement messages began.
 */
export const WAITING_SENDER = 'sendWaitingOnThePeople';

const DAY = 86_400_000;
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export interface WhoWasInvited {
  label: string;
  /** First names of those invited, the lead not among them. */
  invited: string[];
  invitedOn: Date;
  /** First names of those Groundwork has already sent a reminder to. */
  reminded: string[];
  /** The days after the invitation on which Groundwork will remind them, from today on. */
  remindingAgainOn: Date[];
}

/**
 * `direct`: the direct morning is on for her organisation (email/a-direct-email.ts). Who has not started, who has had a reminder, and when the
 * next goes, and nothing about what Groundwork is doing for her or whether she needs to chase.
 */
export function theWaitingWords(firstName: string | null | undefined, w: WhoWasInvited, direct = false) {
  if (direct) return theWaitingWordsDirectly(firstName, w);
  const n = w.invited.length;
  const named = namesWithTheRestCounted(w.invited, aNumberInWords);
  const who = listed(named);
  const subject = n === 1
    ? `${capital(who)} has not started "${w.label}" yet, and Groundwork is following up`
    : `Nobody has started "${w.label}" yet, and Groundwork is following up`;
  const reminded = namesWithTheRestCounted(w.reminded, aNumberInWords);
  const again = w.remindingAgainOn.length
    ? `It will remind them again on ${listed(w.remindingAgainOn.map((d) => whenItWas(d, 'day')))}.`
    : 'It will not send any more reminders after this, and will tell you when that is so.';
  return {
    subject,
    lines: [
      `Hello ${firstName?.trim() || 'there'}. ${capital(who)} ${n === 1 ? 'was' : 'were'} invited to "${w.label}" on ${whenItWas(w.invitedOn, 'day')}, and nobody has started yet.`,
      reminded.length
        ? `Groundwork has already sent a reminder to ${listed(reminded)}.`
        : 'Groundwork sent each of them the invitation, and is about to remind them.',
      again,
      `You do not need to chase anyone yourself. If you would like to say a word to them as well, you could write, "I would value your view on ${w.label}. It takes ${ABOUT_HOW_LONG}."`,
    ],
    linkLabel: 'See who has started',
  };
}


function theWaitingWordsDirectly(firstName: string | null | undefined, w: WhoWasInvited) {
  const n = w.invited.length;
  const who = listed(namesWithTheRestCounted(w.invited, aNumberInWords));
  const reminded = namesWithTheRestCounted(w.reminded, aNumberInWords);
  return {
    subject: n === 1 ? `${capital(who)} has not started "${w.label}" yet` : `Nobody has started "${w.label}" yet`,
    lines: [
      `Hello ${firstName?.trim() || 'there'}. ${capital(who)} ${n === 1 ? 'was' : 'were'} invited to "${w.label}" on ${whenItWas(w.invitedOn, 'day')}, and nobody has started yet.`,
      reminded.length ? `${capital(listed(reminded))} ${w.reminded.length === 1 ? 'has' : 'have'} had a reminder.` : `${n === 1 ? 'They have' : 'Each of them has'} had the invitation.`,
      ...(w.remindingAgainOn.length ? [`The next reminder goes on ${listed(w.remindingAgainOn.map((d) => whenItWas(d, 'day')))}.`] : []),
      `You could write to them yourself, "I would value your view on ${w.label}. It takes ${ABOUT_HOW_LONG}."`,
    ],
    linkLabel: 'See who has started',
  };
}

/** The columns of a check-in that `whoIsWaitedOn` reads. */
export const WHAT_WAITING_READS = {
  id: true, label: true, initiatorId: true, chaseAfterDays: true,
  participants: {
    select: {
      id: true, userId: true, email: true, managingOnly: true, nameGiven: true, invitedAt: true, createdAt: true, lastNudgedAt: true,
      user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } },
      checkIns: { select: { status: true } },
    },
  },
} as const;

/**
 * WHO THE LEAD IS WAITING ON, from a check-in's own rows (screens request 198, b): the one place the facts behind "Nobody has started X yet, and Groundwork is
 * following up" are found, so the mail and Today (GET /today) say the same thing for the same check-in. Null where the message is not true: nobody was invited,
 * somebody has started, the reminders have not begun or are over, or nobody can be reminded by email. Whether it has been sent already is not decided here.
 */
export async function whoIsWaitedOn(prisma: any, g: any, now: Date): Promise<WhoWasInvited | null> {
  const others = (g.participants as any[]).filter((p) => p.userId !== g.initiatorId && !p.managingOnly && !isNotLetInYet(p) && !/@unclaimed\.invalid$/i.test(p.email ?? ''));
  if (!others.length) return null;
  /* Somebody has started: it is a partial picture, said by another message. */
  if (others.some((p) => (p.checkIns as any[]).some((c) => c.status !== 'NOT_STARTED'))) return null;
  const invitedOn = new Date(Math.min(...others.map((p) => new Date(p.invitedAt ?? p.createdAt).getTime())));
  const days = Math.floor((now.getTime() - invitedOn.getTime()) / DAY);
  const chaseDays: number[] = [...(g.chaseAfterDays ?? [])].sort((a: number, b: number) => a - b);
  const first = chaseDays[0];
  const last = chaseDays[chaseDays.length - 1];
  /* From the first reminder day, and until the reminders are over, when the end-of-reminders message takes over. */
  if (first === undefined || days < first || days >= last + 1) return null;
  /* A promise to remind is not made about people who will not be reminded by email. If nobody can be, there is nothing to say; if only some cannot, nothing is
     said about which, and the message promises the schedule and not each person. */
  let reachable = 0;
  for (const p of others) if (!(await theyHaveStoppedTheseEmails(prisma, p.email))) reachable += 1;
  if (!reachable) return null;
  return {
    label: g.label,
    invited: others.map((p) => nameToCall(p)),
    invitedOn,
    reminded: others.filter((p) => p.lastNudgedAt).map((p) => nameToCall(p)),
    remindingAgainOn: chaseDays.filter((d) => d > days).map((d) => new Date(invitedOn.getTime() + d * DAY)),
  };
}

const TERMINAL: GroundStatus[] = A_GROUND_NO_MESSAGE_IS_ABOUT;

/** The sweep. Returns how many were tried. The sender decides whether each may go (the opt-out, the one routine message a day, quiet hours). */
export async function sendWhatGroundworkIsDoing(
  deps: { prisma: any; email: { sendWaitingOnThePeople: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown> }; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  let release: Date;
  try { release = await theEngagementMoment(prisma, now); } catch { return { tried: 0 }; }
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { status: { notIn: TERMINAL }, createdAt: { gte: release }, chasingStopped: false, tellTheLead: true },
    select: { ...WHAT_WAITING_READS, initiator: { select: { email: true, firstName: true, deletedAt: true, isActive: true } } },
    orderBy: { id: 'asc' },
    ...page,
  }), 500);
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const g of grounds) {
    try {
      const lead = g.initiator;
      if (!lead?.email || lead.deletedAt || lead.isActive === false) continue;
      const facts = await whoIsWaitedOn(prisma, g, now);
      if (!facts) continue;
      const once = `waiting-on-the-people:${g.id}`;
      if (await hasBeenToldOnce(prisma, once) || await isAlreadyHeld(prisma, WAITING_SENDER, lead.email)) continue;
      const w = theWaitingWords(lead.firstName, facts, await theDirectMorningIsOnFor(prisma, g.id));
      const went = await deps.email.sendWaitingOnThePeople(lead.email, w.subject, w.lines, w.linkLabel, `${base}/grounds/${g.id}`);
      await nowToldOnce(prisma, once, went, { sender: WAITING_SENDER, to: lead.email });
      if (went !== 'suppressed') tried++;
    } catch {
      /* One lead's message that could not be put together never stops the others. */
    }
  }
  return { tried };
}
