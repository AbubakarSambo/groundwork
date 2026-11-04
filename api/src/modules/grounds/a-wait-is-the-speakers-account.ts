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
 * (`triedSaid`, anAttemptIsOnRecord). They tried and it is on record, so it is a block. A wait
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
 * WHAT THEY SAID THEY TRIED (Hafsah, 2 November 2026: silence is never a finding). The record's `triedSaid` is the model's reading of
 * what the speaker said they did to unblock it. Where it holds something tried, that is said in full with its day; where it holds
 * nothing, nothing is said beside the claim. "Not backed: no attempt to unblock mentioned" and the word list that read attempts out of
 * the wait's own text are gone: the absence of a word was never evidence about a person.
 */

/*
 * WHAT THEY SAID THEY TRIED FIRST, WHERE THEY SAID ANYTHING (Drop Access, second night run). Peter's "I haven't done anything about that
 * yet" was kept as what he had tried, and My work counted it as something tried first. Words that say nothing was tried are not.
 */
const NOTHING_TRIED = /\b(?:haven['’]t|have not|hasn['’]t|has not|didn['’]t|did not|not yet|nothing|no one|nobody)\b|^\s*no\b|^\s*none\b/i;
export function saidWhatTheyTried(triedSaid: string | null | undefined): boolean {
  const t = String(triedSaid ?? '').trim();
  return !!t && !NOTHING_TRIED.test(t);
}

/** Is the speaker's attempt to unblock it in the record? What they said they did, as the record keeps it. */
export function anAttemptIsOnRecord(w: { triedSaid?: string | null }): boolean {
  return saidWhatTheyTried(w.triedSaid);
}

/**
 * WHAT THEY TRIED, IN A FULL SENTENCE, OR NOTHING: the one note beside a claim about a colleague, on the board, in reports and in
 * messages (Drop Access run 1, item 18). "Joseph said on Friday 23 October, “I've asked Grace about the price.”" Read from every time
 * the wait was said (dedupeDependencies keeps the fullest words and the day).
 */
export function whatTheyTriedInFull(w: { triedSaid?: string | null; triedSaidAt?: Date | string | null; createdAt?: Date | string | null }, by: string | null | undefined): string {
  if (!anAttemptIsOnRecord(w)) return '';
  const who = String(by ?? '').trim() || 'They';
  const Who = /^you$/i.test(who) ? 'You' : who.charAt(0).toUpperCase() + who.slice(1);
  const at = w.triedSaidAt ?? w.createdAt ?? null;
  const day = at ? whenItWas(at, 'weekdayAndDay') : null;
  const words = String(w.triedSaid).replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  return `${Who} said${day ? ` on ${day}` : ''}, “${words.charAt(0).toUpperCase()}${words.slice(1)}.”`;
}
