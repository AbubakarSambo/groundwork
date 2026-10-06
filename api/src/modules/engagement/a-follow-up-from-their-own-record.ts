import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';
import { theAnchorNudgeFor, theAnchorNudgeLine, theirOwnLastOpenPromise } from '../conversation/the-anchor-nudge';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { theReleaseMoment } from '../grounds/the-release-moment';

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
    return began.getTime() >= (await theReleaseMoment(prisma)).getTime();
  } catch {
    /* The moment could not be read: say nothing rather than guess. */
    return false;
  }
}

/** For WhatsApp: the person's own open promise to follow up, or null where the ordinary chase goes. */
export async function theirPromiseToFollowUp(
  prisma: any,
  ground: { id: string; startedFrom?: string | null },
  sessionBeganAt: Date | null | undefined,
  participantId: string,
): Promise<string | null> {
  if (ground.startedFrom === STARTED_FROM_THE_ANCHOR) {
    return (await theAnchorScenarioIsOn(prisma)) ? theirOwnLastOpenPromise(prisma, ground.id, participantId) : null;
  }
  if (!(await beganAfterTheRelease(prisma, sessionBeganAt))) return null;
  return theirOwnLastOpenPromise(prisma, ground.id, participantId);
}

/** For email: the line the nudge carries, or null where the nudge is what it always was. */
export async function theNudgeLineFor(
  prisma: any,
  ground: { id: string; startedFrom?: string | null },
  sessionBeganAt: Date | null | undefined,
  participantId: string,
): Promise<string | null> {
  if (ground.startedFrom === STARTED_FROM_THE_ANCHOR) return theAnchorNudgeFor(prisma, ground, participantId);
  const promise = await theirPromiseToFollowUp(prisma, ground, sessionBeganAt, participantId);
  return promise ? theAnchorNudgeLine(promise) : null;
}
