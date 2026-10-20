import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
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
 * They said, in their own check-in, that they will do it, so they agree it is theirs to give. Or the
 * speaker's attempt to unblock it is in the record (Hafsah, 12 October): what they said they did
 * (`triedSaid`) or their own words of the wait name an attempt, read with the same check the note
 * beside the claim uses (anAttemptIsOnRecord). They tried and it is on record, so it is a block. A wait
 * being cleared does not confirm it (the speaker can clear their own row), and the speaker saying it
 * again, louder, or for longer, never confirms it.
 */

export interface AWaitOnSomebody {
  id?: string;
  groundId?: string | null;
  onParticipantId: string | null;
  what: string;
  status?: string | null;
  /** What the speaker said they did to unblock it. An attempt on record confirms the wait (Hafsah, 12 October). */
  triedSaid?: string | null;
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
  if (anAttemptIsOnRecord(wait)) return true;
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
  /*
   * OR THEY SAID IT IS THEIRS, IN THEIR OWN WORDS (messages test, fourth run). Joseph's week on Thursday 15 October said "Mercy Wairimu says
   * the work is waiting for "the sample units he promised" from you ... That is what Mercy Wairimu said, and you have not said it yourself."
   * On Wednesday he had said "I wish I had remembered the samples for Mercy. I've had them ready since Monday." A line of the colleague's own
   * that names the thing and the person waiting confirms it.
   */
  const left = onSomebody.filter((w) => !confirmed.has(w.id));
  if (!left.length) return confirmed;
  try {
    const fromOf = new Map<string, string | null>(left.filter((w) => (w as any).fromParticipantId).map((w) => [w.id, (w as any).fromParticipantId]));
    const unknown = left.filter((w) => !fromOf.has(w.id)).map((w) => w.id);
    if (unknown.length) {
      const rows: any[] = (await Promise.resolve(prisma?.groundDependency?.findMany?.({ where: { id: { in: unknown } }, select: { id: true, fromParticipantId: true } })).catch(() => [])) ?? [];
      for (const r of Array.isArray(rows) ? rows : []) fromOf.set(r.id, r.fromParticipantId ?? null);
    }
    const fromIds = [...new Set([...fromOf.values()].filter((x): x is string => !!x))];
    if (!fromIds.length) return confirmed;
    const people: any[] = (await Promise.resolve(prisma?.groundParticipant?.findMany?.({ where: { id: { in: fromIds } }, select: { id: true, nameGiven: true, user: { select: { firstName: true } } } })).catch(() => [])) ?? [];
    const firstOf = new Map<string, string>((Array.isArray(people) ? people : []).map((p) => [p.id, String(p.user?.firstName ?? p.nameGiven ?? '').trim().split(/\s+/)[0] ?? '']));
    const lines: any[] = (await Promise.resolve(prisma?.recordEntry?.findMany?.({ where: { participantId: { in: [...new Set(left.map((w) => w.onParticipantId as string))] }, disputedAt: null }, select: { participantId: true, text: true } })).catch(() => [])) ?? [];
    for (const w of left) {
      const first = firstOf.get(fromOf.get(w.id) ?? '') ?? '';
      if (first.length < 2) continue;
      const them = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if ((Array.isArray(lines) ? lines : []).some((l) => l.participantId === w.onParticipantId && them.test(String(l.text ?? '')) && theirOwnPromiseNamesIt(w.what, String(l.text ?? '')))) confirmed.add(w.id);
    }
  } catch {
    /* Not being able to read it confirms nothing. */
  }
  return confirmed;
}

/*
 * THE NOTE BESIDE A CLAIM ABOUT A COLLEAGUE (Hafsah, change 4, 11 October 2026).
 *
 * Every claim about a colleague stays where it shows today, in the speaker's own words. Beside it goes one plain note, read in code from the
 * speaker's own words about it (what they said they did, `triedSaid`, and the stored wait text): what they tried to unblock it, or that they
 * have not said. It is a fact about the record, never a label on either person. The "Tried:" and "Not backed:" forms are Hafsah's own wording.
 */
/* "asked Grace about the price" is an attempt too (Drop Access run 1, item 18: Joseph's "I've asked Grace about the price" was read as nothing tried). */
/* "I've tried Paul a couple of times" and "a reply to my calls" are attempts too (Drop Access, second night run, Kevin); "I haven't tried" is not. */
const AN_ATTEMPT = /\b(nudg\w*|chas\w*|follow\w*[ -]up|followed up|asked (?:again|twice|him|her|them|\w+ again|(?!for\b|if\b|whether\b|me\b|us\b|to\b)\w+ (?:about|for|if|whether|to)\b)|re-?asked|remind\w*|call(?:ed|s)?|phon\w*|rang|email\w*|messag\w*|text\w*|whatsapp\w*|wrote|sent (?:him|her|them|a)\b|raised it|took it (?:to|above)|escalat\w*|spoke (?:to|with)|talked (?:to|with)|went to (?:see|his|her|their)|(?<!(?:n['’]t|not|never)\s)tried (?!nothing\b|anything\b)\w+)\b/i;

export const NOT_BACKED = 'Not backed: no attempt to unblock mentioned.';

/** The speaker's words of an attempt to unblock it, from what they said they did, then their own words of the wait; null when there are none. */
function theAttemptSaid(w: { what?: string | null; triedSaid?: string | null }): string | null {
  for (const said of [w.triedSaid, w.what]) {
    const text = String(said ?? '').replace(/\s+/g, ' ').trim();
    if (text && AN_ATTEMPT.test(text)) return text;
  }
  return null;
}

/*
 * WHAT THEY SAID THEY TRIED FIRST, WHERE THEY SAID ANYTHING (Drop Access, second night run). Peter's "I haven't done anything about that
 * yet" was kept as what he had tried, and My work counted it as something tried first. Words that say nothing was tried are not.
 */
const NOTHING_TRIED = /\b(?:haven['’]t|have not|hasn['’]t|has not|didn['’]t|did not|not yet|nothing|no one|nobody)\b|^\s*no\b|^\s*none\b/i;
export function saidWhatTheyTried(triedSaid: string | null | undefined): boolean {
  const t = String(triedSaid ?? '').trim();
  return !!t && !NOTHING_TRIED.test(t);
}

/** Is the speaker's attempt to unblock it in the record? The same check the note uses, so a wait the note says they tried is confirmed. */
export function anAttemptIsOnRecord(w: { what?: string | null; triedSaid?: string | null }): boolean {
  return theAttemptSaid(w) !== null;
}

/**
 * Who the note names, each already as this reader may read them: "You" or "you" for the reader, a name where the reader may read it,
 * "a colleague" where not. Left out, the plain words stand in: "They", "the colleague", "the lead".
 */
export interface WhoTheNoteNames {
  /** The speaker, who says the work is waiting. */
  by?: string | null;
  /** The colleague they say they wait on. */
  on?: string | null;
  /** The person who runs the check-in. */
  lead?: string | null;
}

const theSame = (a: string, b: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** "Hassan Mwenda could have messaged Amina Otieno, asked again, or raised it with Esther Awuor." What anybody could do, never a label. */
export function whatTheyCouldHaveDone(names: WhoTheNoteNames = {}): string {
  const plain = (x: string | null | undefined) => String(x ?? '').replace(/\s+/g, ' ').trim();
  let by = plain(names.by) || 'They';
  by = /^you$/i.test(by) ? 'You' : by.charAt(0).toUpperCase() + by.slice(1);
  let on = plain(names.on) || 'the colleague';
  on = /^you$/i.test(on) ? 'you' : /^(?:A|Another|One) colleague\b/.test(on) ? on.charAt(0).toLowerCase() + on.slice(1) : on;
  let lead = plain(names.lead) || 'the lead';
  lead = /^you$/i.test(lead) ? 'you' : lead;
  /* The lead is the one waited on, or the one waiting: there is nobody above them here to raise it with. */
  if (theSame(on, lead) || theSame(by, lead)) return `${by} could have messaged ${on} or asked again.`;
  return `${by} could have messaged ${on}, asked again, or raised it with ${lead}.`;
}

/**
 * WHAT THEY TRIED, IN A FULL SENTENCE, OR NOTHING: the note a MESSAGE carries (Drop Access run 1, item 18). Grace's Friday letter read
 * "Joseph says the work is waiting on you for a decision on the KES 4,500 price for Juja Hardware. Not backed: no attempt to unblock
 * mentioned. Joseph could have messaged you or asked again." It was clipped, it judged, and it was untrue: Joseph had said "I've asked
 * Grace about the price" and "I asked her already" about the same wait, said again in other words. Read from every time the wait was
 * said (dedupeDependencies keeps the fullest words and the day), a message says what was tried in the speaker's own words with the
 * day, "Joseph said on Friday 23 October, “I've asked Grace about the price.”", or says nothing beside the claim. The board keeps
 * Hafsah's "Tried:" and "Not backed:" note (change 4) until she says otherwise.
 */
export function whatTheyTriedInFull(w: { what?: string | null; triedSaid?: string | null; triedSaidAt?: Date | string | null; createdAt?: Date | string | null }, by: string | null | undefined): string {
  const text = theAttemptSaid(w);
  if (!text) return '';
  const who = String(by ?? '').trim() || 'They';
  const Who = /^you$/i.test(who) ? 'You' : who.charAt(0).toUpperCase() + who.slice(1);
  const at = w.triedSaidAt ?? w.createdAt ?? null;
  const day = at ? whenItWas(at, 'weekdayAndDay') : null;
  const words = text.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  return `${Who} said${day ? ` on ${day}` : ''}, “${words.charAt(0).toUpperCase()}${words.slice(1)}.”`;
}

/**
 * The note beside a claim about a colleague: what the speaker said they tried, or, where they said nothing of trying, that it is not
 * backed and what they could have done to unblock it themselves (Hafsah, 12 October: the claim always stays, and this goes beside it).
 */
export function theNoteBesideTheClaim(w: { what?: string | null; triedSaid?: string | null }, names: WhoTheNoteNames = {}): string {
  const text = theAttemptSaid(w);
  if (text) {
    /* Their words from the attempt on, shortened at a word, said in the third person's place as they said it. */
    const from = text.slice(text.search(AN_ATTEMPT));
    const words = from.split(' ');
    let short = words.slice(0, 12).join(' ').replace(/[.,;:!?\s]+$/, '');
    if (words.length > 12) short = short.replace(/\s+\S*$/, '') || short;
    return `Tried: ${short.charAt(0).toLowerCase() === short.charAt(0) ? short : short.charAt(0).toLowerCase() + short.slice(1)}.`;
  }
  return `${NOT_BACKED} ${whatTheyCouldHaveDone(names)}`;
}
