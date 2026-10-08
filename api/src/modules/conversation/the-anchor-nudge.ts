import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { aGroundIsTheAnchors } from './the-anchor-weekly-check-in';
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
 * "will review the Q4 pipeline with James" is said back as "you would will review". A promise that begins with the word that makes it a promise
 * ("will", "'ll", "going to", "shall") is said without it; one with nothing left after it is not said at all.
 */
const NOT_A_VERB_AFTER_TO = /^(?:the|a|an|my|your|our|his|her|their|its|this|that|these|those|him|them|me|us|it|each|every|all|some|any|no|one|two|three)\b/i;
const NOT_ABOUT_THEM = /^(?:he|she|they|it|his|her|their|its|him|them|someone|somebody|everyone|everybody|nobody|one of)\b/i;

/**
 * WHETHER THE WORDS ARE THE PERSON'S OWN PROMISE ABOUT THEMSELVES. Said back as "you mentioned you would ...", a promise that begins with somebody else
 * ("Amina to send the contract", "they will approve it", "she is going to call") is untrue, so it is not said. A first person ("I", "we"), a plain
 * action ("send the deck to Kofi") and "you will ..." are theirs. When unsure, it is not said: nothing is better than a false line.
 */
export function isSaidOfThemselves(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^(?:i|we)\b/i.test(t) || /^you\b/i.test(t)) return true;
  if (NOT_ABOUT_THEM.test(t)) return false;
  /* A name, then "to" and a verb: "Amina to send the contract". The word after "to" is lower case and is not a determiner or a pronoun. */
  const m = /^[A-Z][\w'-]*\s+to\s+(\S+)/.exec(t);
  if (m && /^[a-z]/.test(m[1]) && !NOT_A_VERB_AFTER_TO.test(m[1])) return false;
  return true;
}

/**
 * A PROMISE THAT NAMES NOBODY BUT "HER" CANNOT BE SAID BACK. "I will ask her tomorrow" was said by Neema about Zawadi in the conversation; sent alone, as
 * "last time you said you would ask her. I'd love to hear how it went.", it leaves her wondering who (anchor walk, 8 October). With a name anywhere in the
 * words it stands on its own; without one, the plain line is sent instead.
 */
export function standsOnItsOwn(raw: string): boolean {
  const t = String(raw ?? '');
  if (!/\b(?:her|him|them)\b/i.test(t)) return true;
  return /(?:^|[^.!?]\s)[A-Z][a-z]+/.test(t.replace(/^\s*I\b/, 'i'));
}

export function withoutALeadingWill(said: string | null): string | null {
  if (!said) return null;
  /* A PROMISE STORED IN THE THIRD PERSON IS NOT SAID BACK (decision 109 review): "amina will send the contract" is somebody else's promise, or a promise about somebody
     else, and "you mentioned you would amina will send the contract" is neither true nor English. Where the one who would do it is not the speaker, it is not said. */
  if ((/^(?:[\w-]+\s+){1,3}(?:will|would|shall|should|must|is going to|are going to|has to|needs to)\b/i.test(said) || /^(?:[\w-]+\s+){0,2}[\w-]+'ll\b/i.test(said)) && !/^(?:i|we|you)\b/i.test(said)) return null;
  const rest = said.replace(/^(?:i|you)(?:'ll|\s+will|\s+shall|\s+am going to|\s+are going to)(?:\s+|$)/i, '').replace(/^(?:am\s+|are\s+|'m\s+|'re\s+)?(?:will|'ll|shall|going to)(?:\s+|$)/i, '').trim();
  return rest ? rest[0].toLowerCase() + rest.slice(1) : null;
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
  return theirs && isSaidOfThemselves(String(theirs.text ?? '')) && standsOnItsOwn(String(theirs.text ?? '')) ? withoutALeadingWill(inOurVoice(String(theirs.text ?? ''), 'you')) : null;
}

/** The line for this person on this check-in, or null where it is not an anchor check-in or the switch is off. */
export async function theAnchorNudgeFor(prisma: any, ground: { id: string; startedFrom?: string | null; scenario?: unknown }, participantId: string): Promise<string | null> {
  if (!aGroundIsTheAnchors(ground)) return null;
  if (!(await theAnchorScenarioIsOn(prisma))) return null;
  return theAnchorNudgeLine(await theirOwnLastOpenPromise(prisma, ground.id, participantId));
}

/**
 * THE SAME NUDGE ON WHATSAPP. It is sent by the morning WhatsApp job (grounds.cron.ts, sendWhatsAppRemindersInner) in
 * place of the chase on an anchor check-in, through the sender every other first message goes through, as the
 * template `anchor_checkin_follow_up` (whatsapp/what-goes-to-a-phone.ts, itFollowsUpTheirPromise). Kept here only as
 * the name, for the docs and the specs.
 */
export const ANCHOR_FOLLOW_UP_TEMPLATE = 'anchor_checkin_follow_up';
