import { aGroundIsTheAnchors } from '../conversation/the-anchor-weekly-check-in';
import { theAnchorNudgeFor, theAnchorNudgeLine, theirOwnLastOpenPromise } from '../conversation/the-anchor-nudge';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { theEngagementMoment } from './the-engagement-release-moment';

/**
 * THE FOLLOW-UP FOR EVERY CHECK-IN, FROM THE PERSON'S OWN RECORD (decision 109 item 10; decision 105 item 3).
 *
 * Until now only a check-in started from the anchor link could say "last time you said you would send your manager
 * the deck. How did it go?". Now any check-in can, and what it says is only ever the last thing THE PERSON said they
 * would do in their own check-in, still open, said back to them in "you". Never anybody else's words, never a promise
 * a lead wrote.
 *
 * EXISTING CLIENTS ONLY GET BETTER (decision 109 item 2). A check-in that was already running before the release is
 * left exactly as it was: nothing new is written about it, so nobody is written to about a check-in that stalled, or
 * that they had stopped answering, before the release. Only a session that began at or after the release moment is
 * followed up. The anchor's own check-ins keep what they had.
 */

async function beganAfterTheRelease(prisma: any, began: Date | null | undefined): Promise<boolean> {
  if (!began) return false;
  try {
    return began.getTime() >= (await theEngagementMoment(prisma)).getTime();
  } catch {
    /* The moment could not be read: say nothing rather than guess. */
    return false;
  }
}

/** For WhatsApp: the person's own open promise to follow up, or null where the ordinary chase goes. */
export async function theirPromiseToFollowUp(
  prisma: any,
  ground: { id: string; startedFrom?: string | null; scenario?: unknown },
  sessionBeganAt: Date | null | undefined,
  participantId: string,
): Promise<string | null> {
  if (aGroundIsTheAnchors(ground)) {
    return (await theAnchorScenarioIsOn(prisma)) ? theirOwnLastOpenPromise(prisma, ground.id, participantId) : null;
  }
  if (!(await beganAfterTheRelease(prisma, sessionBeganAt))) return null;
  return theirOwnLastOpenPromise(prisma, ground.id, participantId);
}

/** For email: the line the nudge carries, or null where the nudge is what it always was. */
export async function theNudgeLineFor(
  prisma: any,
  ground: { id: string; startedFrom?: string | null; scenario?: unknown },
  sessionBeganAt: Date | null | undefined,
  participantId: string,
): Promise<string | null> {
  if (aGroundIsTheAnchors(ground)) return theAnchorNudgeFor(prisma, ground, participantId);
  const promise = await theirPromiseToFollowUp(prisma, ground, sessionBeganAt, participantId);
  if (promise) return theAnchorNudgeLine(promise);
  /* NO PROMISE, BUT SOMETHING THEY WERE WAITING FOR HAS CLEARED SINCE THEY LAST ANSWERED (engagement spec section 17, "value first, then ask"): "You said you were waiting on
     Lucy for budget approval. That approval is now complete." Their own wait, cleared, and said to them first. */
  if (await beganAfterTheRelease(prisma, sessionBeganAt)) {
    const cleared = await theirWaitThatHasCleared(prisma, ground.id, participantId);
    if (cleared) return `You said you were waiting for "${cleared}". That has now been cleared. Your check-in is open when you are ready to tell me what changed.`;
  }
  /* NO PROMISE, BUT A WAIT OF THEIR OWN (engagement spec sections 17 and 18, journey 8): what they said they were waiting for, still waiting. Their own words, said
     back to them, and a question that helps them act. It is by email only: the WhatsApp template says "last time you said you would", which a wait is not. */
  if (!(await beganAfterTheRelease(prisma, sessionBeganAt))) return null;
  const wait = await theirOwnLastOpenWait(prisma, ground.id, participantId);
  return wait ? `You said you were waiting for "${wait}". I'd love to hear whether that has moved.` : null;
}

/** What they said they were waiting for, still waiting, in their own words and from their own check-in; never anybody else's. */
export async function theirOwnLastOpenWait(prisma: any, groundId: string, participantId: string): Promise<string | null> {
  const rows = ((await prisma.groundDependency?.findMany?.({
    where: { groundId, fromParticipantId: participantId, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { what: true, fromParticipantId: true },
  })?.catch?.(() => [])) ?? []) as any[];
  const mine = rows.find((d) => d.fromParticipantId === participantId && String(d.what ?? '').trim());
  return mine ? String(mine.what).trim().replace(/[.!?]+$/, '') : null;
}

/** What they said they were waiting for that has been cleared since the last time they answered here: their own wait, in their own words. Null where there is none, or they have not answered yet. */
export async function theirWaitThatHasCleared(prisma: any, groundId: string, participantId: string): Promise<string | null> {
  const last = await Promise.resolve(prisma.checkIn?.findFirst?.({ where: { participantId, status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } })).catch(() => null);
  const since: Date | null = (last as any)?.completedAt ?? null;
  if (!since) return null;
  const rows = ((await prisma.groundDependency?.findMany?.({
    where: { groundId, fromParticipantId: participantId, status: 'CLEARED', clearedAt: { gt: since } },
    orderBy: { clearedAt: 'desc' },
    select: { what: true, fromParticipantId: true },
  })?.catch?.(() => [])) ?? []) as any[];
  const mine = rows.find((d) => d.fromParticipantId === participantId && String(d.what ?? '').trim());
  return mine ? String(mine.what).trim().replace(/[.!?]+$/, '') : null;
}
