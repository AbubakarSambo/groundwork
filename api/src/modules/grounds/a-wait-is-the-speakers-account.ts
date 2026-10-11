/**
 * A WAIT ON A COLLEAGUE IS THE SPEAKER'S ACCOUNT, NOT A FACT ABOUT THE COLLEAGUE (decision 137;
 * decision 139, must-fix 4).
 *
 * Evaluation profile 5, October 2026. Kevin said every week that he was waiting on Fatuma for the
 * final prices. Fatuma had said, the same morning, that she sent them on 7 October. The record kept
 * Kevin's sentence as a `GroundDependency` row naming Fatuma, and every reader of that row took it
 * as a fact about her: her weekly email said three weeks running that Kevin was waiting for the
 * final prices from her, her board said he "waited on you ... 22 days in all", and the pattern gate
 * held back B5, B11 and K3 from Kevin because he was "waiting on another person here". The only
 * pattern in the check-in landed on Fatuma; Kevin, whose part was late every week, got none.
 *
 * THE RULE. A wait on a named colleague counts against that colleague only when the colleague's own
 * answer, or the record, confirms it. Until then it is the speaker's account: it stays on the
 * board in the speaker's words, and it is never counted against the colleague (no late mark, no
 * email telling them they are the hold-up, no holding a pattern back from the speaker).
 *
 * WHAT CONFIRMS IT, structurally: the colleague's own promise in this check-in names the same thing.
 * They said, in their own check-in, that they will do it, so they agree it is theirs to give. A wait
 * being cleared does not confirm it (the speaker can clear their own row), and the speaker saying it
 * again, louder, or for longer, never confirms it.
 */

export interface AWaitOnSomebody {
  id?: string;
  groundId?: string | null;
  onParticipantId: string | null;
  what: string;
  status?: string | null;
}

export interface TheirOwnPromise {
  groundId?: string | null;
  participantId: string | null;
  text: string;
}

const ORDINARY = new Set([
  'that', 'this', 'with', 'have', 'been', 'from', 'they', 'them', 'then', 'than', 'what', 'when',
  'will', 'would', 'about', 'there', 'their', 'which', 'still', 'need', 'going', 'week', 'next',
  'thing', 'things', 'some', 'more', 'much', 'very', 'just', 'send', 'sent', 'sending', 'give',
  'final', 'last', 'first', 'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday', 'work', 'done', 'finish', 'make', 'sure', 'also', 'into', 'onto',
]);

const stem = (w: string) => w.replace(/ies$/, 'y').replace(/s$/, '').replace(/e$/, '');

const wordsOf = (text: string): Set<string> =>
  new Set(
    (text ?? '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !ORDINARY.has(w))
      .map(stem),
  );

/** Does this colleague's own promise name the thing the speaker says they wait for? */
export function theirOwnPromiseNamesIt(what: string, promise: string): boolean {
  const a = wordsOf(what);
  if (!a.size) return false;
  const b = wordsOf(promise);
  for (const w of a) if (b.has(w)) return true;
  return false;
}

/**
 * Is this wait confirmed by the colleague it names, or by the record?
 *
 * A wait on nobody here (outside the check-in, or a thing) is not about a colleague, so it is not
 * held to this: it returns true, and the callers treat it as before.
 */
export function theWaitIsConfirmed(wait: AWaitOnSomebody, theirPromises: TheirOwnPromise[]): boolean {
  if (!wait.onParticipantId) return true;
  return (theirPromises ?? []).some(
    (p) => p.participantId === wait.onParticipantId
      && (!wait.groundId || !p.groundId || p.groundId === wait.groundId)
      && theirOwnPromiseNamesIt(wait.what, p.text),
  );
}

/** The ids of the waits that are confirmed, read with one query for the colleagues' own promises. */
export async function theConfirmedWaits(
  prisma: any,
  waits: (AWaitOnSomebody & { id: string })[],
): Promise<Set<string>> {
  const onSomebody = waits.filter((w) => !!w.onParticipantId);
  const confirmed = new Set(waits.filter((w) => !w.onParticipantId).map((w) => w.id));
  if (!onSomebody.length) return confirmed;
  const promises: TheirOwnPromise[] = await Promise.resolve(
    prisma?.groundCommitment?.findMany?.({
      where: { participantId: { in: [...new Set(onSomebody.map((w) => w.onParticipantId as string))] } },
      select: { groundId: true, participantId: true, text: true },
    }) ?? [],
  ).catch(() => []);
  for (const w of onSomebody) if (theWaitIsConfirmed(w, Array.isArray(promises) ? promises : [])) confirmed.add(w.id);
  return confirmed;
}

/*
 * THE NOTE BESIDE A CLAIM ABOUT A COLLEAGUE (Hafsah, change 4, 11 October 2026).
 *
 * Every claim about a colleague stays where it shows today, in the speaker's own words. Beside it goes one plain note, read in code from the
 * speaker's own words about it (what they said they did, `triedSaid`, and the stored wait text): what they tried to unblock it, or that they
 * have not said. It is a fact about the record, never a label on either person. The "Tried:" and "Not backed:" forms are Hafsah's own wording.
 */
const AN_ATTEMPT = /\b(nudg\w*|chas\w*|follow\w*[ -]up|followed up|asked (?:again|twice|him|her|them|\w+ again)|re-?asked|remind\w*|call(?:ed)?|phon\w*|rang|email\w*|messag\w*|text\w*|whatsapp\w*|wrote|sent (?:him|her|them|a)\b|raised it|took it (?:to|above)|escalat\w*|spoke (?:to|with)|talked (?:to|with)|went to (?:see|his|her|their))\b/i;

export const NOT_BACKED = 'Not backed: no attempt to unblock mentioned.';

/** The note beside a claim about a colleague: what the speaker said they tried, or that they have not said. */
export function theNoteBesideTheClaim(w: { what?: string | null; triedSaid?: string | null }): string {
  for (const said of [w.triedSaid, w.what]) {
    const text = String(said ?? '').replace(/\s+/g, ' ').trim();
    if (!text || !AN_ATTEMPT.test(text)) continue;
    /* Their words from the attempt on, shortened at a word, said in the third person's place as they said it. */
    const from = text.slice(text.search(AN_ATTEMPT));
    const words = from.split(' ');
    let short = words.slice(0, 12).join(' ').replace(/[.,;:!?\s]+$/, '');
    if (words.length > 12) short = short.replace(/\s+\S*$/, '') || short;
    return `Tried: ${short.charAt(0).toLowerCase() === short.charAt(0) ? short : short.charAt(0).toLowerCase() + short.slice(1)}.`;
  }
  return NOT_BACKED;
}
