import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from './the-anchor-weekly-check-in';
import { inOurVoice } from '../reports/what-the-record-shows-over-time';

/**
 * THE ANCHOR'S NUDGE (anchor piece 30; section 26; decision 105 item 3).
 *
 * "Groundwork nudges people positively: You mentioned you'd try something with the client this week. I'd love to hear
 * how it went. Or: It's been a few days since we spoke. What's changed on the project?"
 *
 * A nudge may repeat the person's OWN commitment, to that person only, in the app, by email and on WhatsApp. Nobody
 * else's words ever go into a message. So the line is built from the one thing that is theirs: the last thing they said
 * in their own check-in they would do, still open, said back to them in "you". Where there is none, the line asks what
 * has changed, and repeats nothing.
 *
 * Only for a check-in started from the anchor link, and only while the anchor switch is on. Every other nudge is
 * exactly what it was.
 */
export const IT_HAS_BEEN_A_FEW_DAYS = "It's been a few days since we spoke. What's changed since then?";

/** The line, from their own open promise said in "you", or the plain one where there is none. */
export function theAnchorNudgeLine(theirOwnPromise: string | null | undefined): string {
  const what = String(theirOwnPromise ?? '').trim().replace(/[.!?]+$/, '');
  return what ? `You mentioned you would ${what}. I'd love to hear how it went.` : IT_HAS_BEEN_A_FEW_DAYS;
}

/**
 * Their last open promise, from their own check-in only, said back to them: "send your manager the deck". Never a
 * promise a lead wrote or pasted, never one they did not make in their own name, never anybody else's.
 */
export async function theirOwnLastOpenPromise(prisma: any, groundId: string, participantId: string): Promise<string | null> {
  const rows = ((await prisma.groundCommitment?.findMany?.({
    where: { groundId, participantId, status: 'UNKNOWN', source: 'CHECK_IN' },
    orderBy: { createdAt: 'desc' },
    select: { text: true, explicit: true, participantId: true, source: true, status: true },
  })?.catch?.(() => [])) ?? []) as any[];
  const theirs = rows.find((c) => c.participantId === participantId && c.source === 'CHECK_IN' && c.status === 'UNKNOWN' && c.explicit !== false);
  return theirs ? inOurVoice(String(theirs.text ?? ''), 'you') : null;
}

/** The line for this person on this check-in, or null where it is not an anchor check-in or the switch is off. */
export async function theAnchorNudgeFor(prisma: any, ground: { id: string; startedFrom?: string | null }, participantId: string): Promise<string | null> {
  if (ground.startedFrom !== STARTED_FROM_THE_ANCHOR) return null;
  if (!(await theAnchorScenarioIsOn(prisma))) return null;
  return theAnchorNudgeLine(await theirOwnLastOpenPromise(prisma, ground.id, participantId));
}

/**
 * THE SAME NUDGE ON WHATSAPP, IN A TEMPLATE'S SHAPE (proposed `anchor_checkin_follow_up`, docs/whatsapp-templates.md).
 * Built, never sent here: no template is approved, and nothing in this file talks to WhatsApp. The person's own
 * promise is the only words of theirs in it, and it goes to them alone.
 */
export const ANCHOR_FOLLOW_UP_TEMPLATE = 'anchor_checkin_follow_up';
export function theAnchorNudgeOnWhatsApp(firstName: string, checkInName: string, theirOwnPromise: string | null): { template: string; params: string[] } | null {
  const what = String(theirOwnPromise ?? '').trim().replace(/[.!?]+$/, '');
  if (!what) return null;
  return { template: ANCHOR_FOLLOW_UP_TEMPLATE, params: [firstName, what, checkInName] };
}
