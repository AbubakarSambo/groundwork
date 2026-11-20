import { mayReadTheLine, EVERYBODY } from '../conversation/who-may-read-a-line';
/**
 * WHAT THE LEAD WROTE ABOUT A PERSON IS FOR THE LEAD ALONE (U.6 review, tightened in the U.7 review).
 *
 * `roleAsDescribed` is mostly the lead's own sentence about someone, typed when they were added:
 * "Daniel - Your sales manager, who you said is not meeting his agreed targets for pipeline
 * building and coaching." Read live on Daniel's invitation, under "Your part in this". It judges
 * him, it speaks to the lead ("who you said"), and it is the lead's private note, which a
 * participant never reads (the settled privacy rules).
 *
 * Until the U.7 review it also went to every admin of the organisation, as "someone who runs the
 * check-in". Read live: Otieno, an admin who is not in Wanjiru's check-in, opened its Context page
 * and read "Baraka. Your note: Baraka is a member of the team...". It was not his note, and a lead's
 * private notes are private, always. The row does not record who typed it, so it is served only to
 * the check-in's lead (its initiator), who is the person it is written by and for. Everyone else,
 * admins included, gets nothing in its place.
 *
 * REQUEST 83'S QUESTION, ANSWERED: HOW TO TELL THE LEAD'S WORDS FROM THE PERSON'S OWN. Since
 * decision 30 (commits f39940dc, ae2b5a9e), a person's own statement of their own role never lands
 * in this column, on any row, from any door: `participants.service.ts#updateRole` writes it to
 * `User.jobTitle` when the caller is editing their own row, and the join flow
 * (`entry.service.ts#joinConfirm`) writes what somebody typed about themselves on the join page
 * (`PendingJoin.roleAsDescribed`, "for example 'I sell fridges in Kilimani'") to `User.jobTitle` as
 * well, never to `GroundParticipant.roleAsDescribed`. So the two are not told apart by inspecting a
 * row at read time - there is nothing left to tell apart. `GroundParticipant.roleAsDescribed` is
 * always the lead's own words: about somebody else on that row, or about themselves on their own
 * INITIATOR row (`aRoleInTheirOwnWords`, below). `theLeadsWordsAbout` serving it to the lead alone,
 * on every row, is already the complete rule; a person's own words reach them through `jobTitle`,
 * which is a different surface with no privacy question of this kind (it is exactly what the person
 * themselves typed, about themselves).
 */
export function theLeadsWordsAbout(p: { roleAsDescribed?: string | null }, readerLeadsThisCheckIn: boolean): string | null {
  return readerLeadsThisCheckIn ? (p.roleAsDescribed ?? null) : null;
}

/**
 * AND IN THAT PERSON'S OWN SESSION, THE MODEL IS NOT HANDED THEM EITHER (request 36, route 3).
 *
 * The session prompt carried `roleAsDescribed` three times: "The person who set this up described
 * this person's part in it as: …", `PRIOR_CONTEXT`, and "who described their role as" in the plan
 * for the session. For somebody the lead invited, that is the lead's sentence about them, and a model
 * that has it can say it back to the very person it is about. The row does not record who wrote it,
 * so only the lead's own row counts as their own words: it is written from their own setup. Anybody
 * else is asked, and what they say goes on the record in their own words.
 */
export function aRoleInTheirOwnWords(p: { roleAsDescribed?: string | null; partyType?: string | null } | null | undefined): string | null {
  if (!p || p.partyType !== 'INITIATOR') return null;
  return p.roleAsDescribed ?? null;
}

/**
 * THE READ-SIDE NET (decision 30, run 19 and goals-1, 30 September 2026 - narrowed the same day
 * once the seniorhire sentence turned out not to be a leak: "own the relationships with the five
 * largest clients" is in `toldToParticipants`, an unowned `ground_objectives` row, `whatTheRoomIsAbout`'s
 * aims and Amina's and Tobi's own record entries, so it is shareable under decision 4 however
 * similar it reads to the lead's private `roleAsDescribed`).
 *
 * Structural fixes stop a private description being HANDED to something that writes for a wider
 * reader. This is the second guard, for whatever gets past that - but a private description and a
 * legitimately shared sentence can share the same words, because both are about the same person and
 * the same work. So this does not drop a sentence on overlap with the description alone: it drops a
 * sentence only when that same run of words is NOT found anywhere the reader may already read -
 * what they were told, the shared brief, the check-in's shared targets and aims, and what people
 * said in their own check-ins (decision 4). Never for the lead.
 *
 * "Long run" is six words in a row, case- and punctuation-insensitive, because a short overlap
 * ("own the relationships") is ordinary language two independent sentences can share; six words
 * running together is the description being said back.
 */
const A_GIVEAWAY_RUN = 6;

function normalisedWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function theGiveawayRunsIn(description: string | null | undefined): string[] {
  const words = normalisedWords(description ?? '');
  if (words.length < A_GIVEAWAY_RUN) return [];
  const runs: string[] = [];
  for (let i = 0; i + A_GIVEAWAY_RUN <= words.length; i++) {
    runs.push(words.slice(i, i + A_GIVEAWAY_RUN).join(' '));
  }
  return runs;
}

/**
 * Takes out any sentence of `text` that carries six or more of a private description's own words in
 * a row, UNLESS that same run of words already appears in something this reader may read anyway.
 *
 * `descriptions` is every private description on the ground (every party's `roleAsDescribed` and
 * `remitAsGiven`) - the reader is not who is being described, so this cannot know which one a given
 * sentence might be echoing. `shareable` is everything this reader may already read regardless of
 * the description: see `theShareableTextFor`, built once per read. Returns `text` unchanged for the
 * lead who wrote the descriptions.
 */
export function withoutTheLeadsDescriptionOfAnyone(
  text: string | null | undefined,
  descriptions: (string | null | undefined)[],
  readerLeadsThisCheckIn: boolean,
  shareable: (string | null | undefined)[] = [],
): string | null {
  if (!text) return text ?? null;
  if (readerLeadsThisCheckIn) return text;
  const privateRuns = new Set(descriptions.flatMap(theGiveawayRunsIn));
  if (!privateRuns.size) return text;
  const shareableRuns = new Set(shareable.flatMap(theGiveawayRunsIn));
  const runs = [...privateRuns].filter((r) => !shareableRuns.has(r));
  if (!runs.length) return text;
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const kept = sentences.filter((s) => {
    const words = normalisedWords(s).join(' ');
    return !runs.some((r) => words.includes(r));
  });
  const result = kept.join(' ').replace(/\s+/g, ' ').trim();
  return result || null;
}

/**
 * EVERYTHING A NON-LEAD READER MAY ALREADY READ, BUILT ONCE PER READ.
 *
 * What they were told about the check-in (`toldToParticipants`, falling back to the brief where it
 * is null - the same fallback the product uses when serving it), the check-in's shared targets
 * (`ground_objectives.name`) and aims (`whatTheRoomIsAbout.aims`, which is read when a round closes
 * and served on the board to every reader - see board.service.ts), and what people said in their own
 * check-ins (`RecordEntry.text`, decision 4). Never the lead's private descriptions themselves -
 * this is what the net checks a private run AGAINST, so it must not include the thing being checked.
 *
 * Optional-chained throughout, like every other read that touches a client a test may double: a
 * failed query gives an empty list here, which only means the net falls back to being stricter, not
 * that it breaks.
 */
/**
 * THE SAME NET, WALKED OVER A STRUCTURE RATHER THAN ONE STRING (decision 5, clarified 29 September:
 * an admin who does not run the check-in reads no field built from the lead's private description).
 *
 * `theJudgement` is not a paragraph. It is the model's structured output - an object of arrays of
 * objects of sentences - and the room judgement is handed "taken on for: <role>", where `role` is
 * `remitAsGiven ?? roleAsDescribed`, the lead's own words about somebody, typed when they were
 * added. Whatever the model writes back can carry those words, in any of its string fields. An
 * admin who does not run the check-in still reads `theJudgement` in full under decision 5 - only
 * the lead's private description is theirs to keep out - so this walks every string leaf with
 * `withoutTheLeadsDescriptionOfAnyone` and leaves the shape, the numbers and everything else alone.
 *
 * A no-op for the lead, and a no-op for a genuine participant, whose `theJudgement` is already gone
 * by the time this runs (see `whatAParticipantMayRead`).
 */
export function deeplyWithoutTheLeadsDescriptionOfAnyone<T>(
  value: T,
  descriptions: (string | null | undefined)[],
  readerLeadsThisCheckIn: boolean,
  shareable: (string | null | undefined)[] = [],
): T {
  if (readerLeadsThisCheckIn || value == null) return value;
  if (typeof value === 'string') {
    return (withoutTheLeadsDescriptionOfAnyone(value, descriptions, false, shareable) ?? '') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => deeplyWithoutTheLeadsDescriptionOfAnyone(v, descriptions, false, shareable)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      out[k] = deeplyWithoutTheLeadsDescriptionOfAnyone(v, descriptions, false, shareable);
    }
    return out as T;
  }
  return value;
}

export async function theShareableTextFor(
  prisma: {
    recordEntry?: { findMany?: (args: any) => Promise<any[]> };
    groundObjective?: { findMany?: (args: any) => Promise<any[]> };
  },
  ground: { id: string; brief?: string | null; toldToParticipants?: string | null; whatTheRoomIsAbout?: unknown },
): Promise<string[]> {
  const read = <T,>(f: () => Promise<T> | undefined, fallback: T): Promise<T> =>
    Promise.resolve().then(() => f() ?? fallback).catch(() => fallback);
  const [entries, objectives] = await Promise.all([
    /* Only what everybody may read makes words sayable to a member (who-may-read-a-line.ts). */
    read(() => prisma.recordEntry?.findMany?.({ where: { participant: { groundId: ground.id } }, select: { text: true, aboutParticipantId: true, standing: true } }), [] as any[]).then((rows: any[]) => (Array.isArray(rows) ? rows : []).filter((r) => mayReadTheLine(r, EVERYBODY))),
    read(() => prisma.groundObjective?.findMany?.({ where: { groundId: ground.id }, select: { name: true } }), [] as any[]),
  ]);
  const room = ground.whatTheRoomIsAbout as { aims?: { aim?: string }[] } | null | undefined;
  const aims = Array.isArray(room?.aims) ? room!.aims.map((a) => a?.aim) : [];
  return [
    ground.toldToParticipants ?? ground.brief,
    ...(Array.isArray(entries) ? entries : []).map((e: any) => e?.text),
    ...(Array.isArray(objectives) ? objectives : []).map((o: any) => o?.name),
    ...aims,
  ].filter((s): s is string => typeof s === 'string' && !!s.trim());
}
