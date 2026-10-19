import { whoHasNotJoinedYet, WHAT_SAYS_SOMEBODY_JOINED } from '../grounds/invited-not-joined-yet';
import { wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';
import { CheckInStatus, GroundStatus } from '@prisma/client';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { isAlreadyHeld } from './a-message-sent-once';
import { theEngagementMoment } from './the-engagement-release-moment';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { theRoundACountIsAbout } from '../board/which-round-is-open';
import { theCheckIn } from '../grounds/which-check-in-it-is';
import { aNumberInWords } from './a-number-in-words';
import { nameToCall, aNameToList } from './a-name-to-call-them';

/**
 * "HERE IS WHAT IS NEW", ONCE, TO A LEAD WHO WAS ALREADY HERE (decision 109 item 2).
 *
 * An existing client is not emailed by surprise (decisions 88 and 90), but decision 109 lets them have the value-first messages, and they start with
 * this one email, built from their own check-ins. It is sent once ever, to a lead with at least one check-in that was made BEFORE the release and is
 * still going. A check-in that stalled, ended or is held is not mentioned, and a lead whose only check-ins are like that is not written to at all.
 * A lead who joined after the release is not sent it: for them nothing is new.
 *
 * It says only what is true of their own check-ins now, and what Groundwork now does that it did not do before. It goes through the one door, so
 * it is the day's one routine message, and a person who turned these emails off does not get it.
 */
export const WHATS_NEW_SENDER = 'sendHeresWhatIsNew';

const TERMINAL: GroundStatus[] = A_GROUND_NO_MESSAGE_IS_ABOUT;

export interface AnExistingCheckIn { label: string; ofHowMany: number; answered: number; notYet: string[]; /** Whether it has a session still to come, which is what the follow-up is for. */ moreToCome?: boolean; /** Set only when another listed check-in has the same name: when this one was started, as the lead reads a date ("3 September"). */ startedOn?: string; groundId?: string; /** Which round the count is about. */ round?: number }

/**
 * WHETHER THIS CHECK-IN HAS A SESSION STILL TO COME. The follow-up (a person's own promise, said back to them) is sent for a session that begins after
 * the release, so it is only true of an existing check-in that will have one: it runs until it is ended, or its planned end is still ahead.
 */
export function thereIsASessionToCome(g: { runsUntilEnded?: boolean | null; endsAt?: Date | null; timelineDays?: number | null; createdAt?: Date | null }, now: Date): boolean {
  if (g.runsUntilEnded) return true;
  const end = g.endsAt ?? (g.createdAt && g.timelineDays ? new Date(g.createdAt.getTime() + g.timelineDays * 86_400_000) : null);
  return !!end && end.getTime() > now.getTime();
}

const people = (n: number) => `${aNumberInWords(n)} ${n === 1 ? 'person' : 'people'}`;
const capLine = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
const cap = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** The check-in by its name, and, when another has the same name, by when its lead started it. */
const calledBy = (c: AnExistingCheckIn) => (c.startedOn ? `"${c.label}", which you started on ${c.startedOn}` : `"${c.label}"`);

/** One check-in, in one sentence, from the count alone. */
export function whereOneStands(c: AnExistingCheckIn): string {
  const In = `In ${calledBy(c)}`;
  /* Which round the count is about, said the way Today and the board say it. */
  const forIt = c.round ? ` for ${theCheckIn(c.round)}` : '';
  if (c.answered <= 0) return `${In}, nobody has checked in${forIt} yet, out of ${people(c.ofHowMany)}.`;
  if (c.answered >= c.ofHowMany) return `${In}, ${c.ofHowMany === 1 ? 'the one person who can answer has' : c.ofHowMany === 2 ? 'both people have' : `all ${aNumberInWords(c.ofHowMany)} people have`} checked in${forIt}.`;
  const named = c.notYet.slice(0, 3);
  const others = c.ofHowMany - c.answered - named.length;
  const who = named.length ? `, and ${listed(others > 0 ? [...named, others === 1 ? 'one other person' : `${aNumberInWords(others)} others`] : named)} ${c.ofHowMany - c.answered === 1 && !named.includes('you') ? 'has' : 'have'} not yet` : '';
  return `${In}, ${aNumberInWords(c.answered)} of ${aNumberInWords(c.ofHowMany)} people ${c.answered === 1 ? 'has' : 'have'} checked in${forIt}${who}.`;
}

/** True only for the check-ins that have a session to come; said for all, for some by name, or not at all. */
function theFollowUpSentence(checkIns: AnExistingCheckIn[]): string | null {
  const some = checkIns.filter((c) => c.moreToCome !== false);
  if (!some.length) return null;
  const where = some.length === checkIns.length ? '' : ` in ${listed(some.map(calledBy))}`;
  return `What is new is that Groundwork now follows up${where} with each person about the thing they said they would do, in their own words and only to them.`;
}

/** The most check-ins listed by name: a lead with many gets the most recent still going, and a count of the rest. */
export const MOST_LISTED = 5;

export function theWhatIsNewWords(firstName: string | null | undefined, checkIns: AnExistingCheckIn[], andMore = 0) {
  const follow = theFollowUpSentence(checkIns);
  /* NOTHING NEW TO SAY, NOTHING SENT (decision 109 review): the one new thing is the follow-up, so a lead with no check-in it applies to is not written to. */
  if (!follow) return null;
  /* The check-in its count is about, as the body says it (messages test, 19 October, finding 17): "Nobody has checked in on "Sales team, Q4" yet"
     was held for Grace on Monday at 21:30, after all five had checked in for the first; the count was about the second. */
  const forIt = checkIns.length === 1 && checkIns[0].round ? ` for ${theCheckIn(checkIns[0].round)}` : '';
  const subject = checkIns.length === 1
    ? (checkIns[0].answered <= 0
      ? `Nobody has checked in${forIt} on "${checkIns[0].label}" yet, and here is what is new`
      : `${cap(aNumberInWords(checkIns[0].answered))} of ${aNumberInWords(checkIns[0].ofHowMany)} people ${checkIns[0].answered === 1 ? 'has' : 'have'} checked in${forIt} on "${checkIns[0].label}", and here is what is new`)
    : `Here is where your ${aNumberInWords(checkIns.length + andMore)} check-ins stand, and what is new`;
  const lines = [
    `Hello ${firstName?.trim() || 'there'}. Here is where your check-ins stand today.`,
    ...checkIns.map(whereOneStands),
    ...(andMore > 0 ? [`${capLine(aNumberInWords(andMore))} more ${andMore === 1 ? 'is' : 'are'} still going.`] : []),
    follow,
    /* The two other things that are new for a lead (engagement spec sections 7 and 24), said so she is not surprised by them. */
    'On Fridays, when your team has done something that week, Groundwork also sends you a short letter about it. The email that tells you a shared picture is ready now says what the picture found.',
    'The link at the bottom of any of these emails stops the ones we decide to send. So does Settings, where you can also turn them back on. Emails you ask for, such as sign-in links and reports, always reach you.',
  ];
  return { subject, lines, linkLabel: 'See your check-ins' };
}

export async function theOpenSession(prisma: any, groundId: string, leadUserId: string): Promise<AnExistingCheckIn | null> {
  const rows: any[] = await prisma.checkIn.findMany({
    where: { groundId },
    select: { status: true, sessionNumber: true, closedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } }, participant: { select: { id: true, ...WHAT_SAYS_SOMEBODY_JOINED, userId: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } } },
  });
  if (!rows.length) return null;
  /* Invited, not joined yet: left out of the count like somebody not let in (decision 8 redone, night run 3). */
  const notJoined = await whoHasNotJoinedYet(prisma, [...new Map(rows.map((r: any) => [r.participant?.id, r.participant])).values()].filter(Boolean)).catch(() => new Set<string>());
  for (const r of rows) if (r.participant && notJoined.has(r.participant.id)) r.participant = { ...r.participant, notJoinedYet: true };
  /* A session the clock closed with nothing said is not an answer. */
  const answeredIt = (r: any) => r.status === CheckInStatus.COMPLETED && !wasAQuietClose(r);
  /* The round the board and Today call open, not whichever is newest: rows for the next round are written ahead. */
  const latest = theRoundACountIsAbout(rows.map((r) => ({ sessionNumber: r.sessionNumber ?? 0, status: r.status })));
  const counted = rows.filter((r) => (r.sessionNumber ?? 0) === latest && !r.participant?.managingOnly && !isNotLetInYet(r.participant));
  if (!counted.length) return null;
  /* A check-in where only the lead is in it has nothing to say about anybody else (decision 109 review). */
  if (!counted.some((r) => r.participant?.userId !== leadUserId)) return null;
  const answered = counted.filter(answeredIt).length;
  const notYet = counted.filter((r) => !answeredIt(r))
    .map((r) => (r.participant?.userId === leadUserId ? 'you' : nameToCall(r.participant)))
    .filter(aNameToList)
    .sort((a: string, b: string) => (a === 'you' ? -1 : b === 'you' ? 1 : 0));
  return { label: '', ofHowMany: counted.length, answered, notYet, round: latest };
}

/** The sweep. Returns how many were tried; the sender decides whether each may go. */
export async function sendHeresWhatIsNew(
  deps: { prisma: any; email: { sendHeresWhatIsNew: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<unknown> }; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  let release: Date;
  try { release = await theEngagementMoment(prisma, now); } catch { return { tried: 0 }; }
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    /* Made before the release, and still going: stalled, ended and held ones are never mentioned. */
    where: { status: { notIn: TERMINAL }, createdAt: { lt: release } },
    select: { id: true, label: true, initiatorId: true, runsUntilEnded: true, endsAt: true, timelineDays: true, createdAt: true },
    ...page,
  }), 1000);
  const byLead = new Map<string, any[]>();
  for (const g of grounds) byLead.set(g.initiatorId, [...(byLead.get(g.initiatorId) ?? []), g]);
  const link = `${(deps.frontendUrl || '').replace(/\/$/, '')}/grounds`;
  let tried = 0;
  for (const [leadId, theirs] of byLead) {
    try {
      const user = await prisma.user.findUnique({ where: { id: leadId }, select: { email: true, firstName: true, deletedAt: true, isActive: true } });
      if (!user?.email || user.deletedAt || user.isActive === false) continue;
      const had = await prisma.notification.findFirst({ where: { channel: 'email', sender: WHATS_NEW_SENDER, toAddress: user.email.trim().toLowerCase(), outcome: 'sent' }, select: { id: true } });
      if (had || await isAlreadyHeld(prisma, WHATS_NEW_SENDER, user.email)) continue;
      const stands: AnExistingCheckIn[] = [];
      /* Each check-in once, by its own id (two check-ins that share a name are two, and both count), the most recent first, and only the most recent few by name. */
      const seenIds = new Set<string>();
      const byId = new Map<string, any>(theirs.map((g: any) => [g.id, g]));
      const newestFirst = [...theirs].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      let beyond = 0;
      for (const g of newestFirst) {
        if (seenIds.has(g.id)) continue;
        /* A check-in left open with nothing more to come is dead, and is never mentioned (decision 109 item 2). */
        if (!thereIsASessionToCome(g, now)) continue;
        const s = await theOpenSession(prisma, g.id, leadId);
        if (!s) continue;
        seenIds.add(g.id);
        if (stands.length >= MOST_LISTED) { beyond++; continue; }
        stands.push({ ...s, label: g.label, moreToCome: true, groundId: g.id });
      }
      if (!stands.length) continue;
      /* Two check-ins with the same name are told apart by something the lead already knows: when each was started. */
      const nameCount = new Map<string, number>();
      for (const x of stands) nameCount.set(x.label.trim().toLowerCase(), (nameCount.get(x.label.trim().toLowerCase()) ?? 0) + 1);
      for (const x of stands) {
        if ((nameCount.get(x.label.trim().toLowerCase()) ?? 0) < 2) continue;
        const made = byId.get(x.groundId ?? '')?.createdAt;
        if (made) x.startedOn = whenItWas(made, 'dayAndMonthLong', 'UTC');
      }
      const w = theWhatIsNewWords(user.firstName, stands, beyond);
      if (!w) continue;
      await deps.email.sendHeresWhatIsNew(user.email, w.subject, w.lines, w.linkLabel, link);
      tried++;
    } catch {
      /* One lead's email that could not be put together never stops the others. */
    }
  }
  return { tried };
}
