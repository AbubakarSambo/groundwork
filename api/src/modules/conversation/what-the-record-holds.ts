import { theKindsOfClaimInAnything } from './a-claim-the-record-does-not-hold';
import { whatTheRecordHoldsForClaims } from './what-the-record-holds-for-claims';
import { mayStateAColleaguesFault, whatTheRecordHoldsForBlame } from './a-colleagues-fault-is-the-speakers-account';
import type { WhatTheRecordHolds } from './the-final-check';

/**
 * WHAT ONE CHECK-IN'S RECORD HOLDS, FOR THE FINAL CHECK (the-final-check). One lookup for every place Groundwork's own words are stored
 * or served: a report before it is stored, coaching, Today and You lines, the daily message and the weekly letter.
 *
 *   the claims       a reminder, an escalation, a target, a status (what-the-record-holds-for-claims), only for the kinds the text makes.
 *   the blame        who waits on whom, and each person's own lines (what-the-record-holds-for-blame), with the labels a report is stored in.
 *   the texts        the record's lines, the targets, the lead's setup, and WHAT THE CODE ITSELF WROTE beside the text (`codeWrote`):
 *                    a count, date or name the product worked out from the record is the record's value, so it is never cut.
 *   their own words  each person's lines, and the code's own lines, so a status the record or the code holds stands.
 *
 * Nothing read here is shown to anybody. A lookup that fails is left out, so the check never cuts on a lookup that failed.
 */
export async function whatTheRecordHolds(
  prisma: any,
  input: {
    groundId: string;
    /** The text, or stored value, about to be checked: only the claims it makes are looked up. */
    value: unknown;
    /** Strings and numbers the product worked out itself and serves beside the text. */
    codeWrote?: unknown;
    asLabels?: boolean;
    reader?: { participantId?: string | null; name?: string | null } | null;
    checkInsAnswered?: number | null;
  },
): Promise<WhatTheRecordHolds> {
  const { groundId } = input;
  if (!groundId) return {};
  const strings = (v: unknown, out: string[] = [], nums: number[] = []): { out: string[]; nums: number[] } => {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'number' && Number.isFinite(v)) nums.push(v);
    else if (Array.isArray(v)) v.forEach((x) => strings(x, out, nums));
    else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v as Record<string, unknown>).forEach((x) => strings(x, out, nums));
    return { out, nums };
  };
  const code = strings(input.codeWrote);
  const kinds = theKindsOfClaimInAnything(input.value);
  const claims: WhatTheRecordHolds = kinds.size ? await whatTheRecordHoldsForClaims(prisma, { groundId, kinds }).catch(() => ({})) : {};
  const anyText = strings(input.value).out.join('\n');
  const blame = await whatTheRecordHoldsForBlame(prisma, groundId, {
    asLabels: !!input.asLabels,
    speakerParticipantId: input.reader?.participantId ?? null,
    speakerIsTheReader: !!input.reader?.participantId,
  }).catch(() => null);
  let setup: string[] = [];
  try {
    const ground = await prisma.ground?.findUnique?.({
      where: { id: groundId },
      select: { brief: true, label: true, participants: { select: { roleAsDescribed: true, remitAsGiven: true } }, objectives: { select: { name: true, target: true } } },
    });
    setup = [
      ground?.brief ?? '', ground?.label ?? '',
      ...((ground?.participants ?? []) as any[]).flatMap((p) => [p?.roleAsDescribed ?? '', p?.remitAsGiven ?? '']),
      ...((ground?.objectives ?? []) as any[]).map((o) => `${o?.target ?? ''} ${o?.name ?? ''}`),
    ];
  } catch { /* not read */ }
  /* The people were not read: the record was not read either, so nothing but the claims is checked. */
  if (!blame?.people.length) return { ...claims, checkInsAnswered: input.checkInsAnswered ?? null };
  const ownWords = blame.theirOwnWords ?? [];
  /* "Two people gave two different limits": a count of people up to how many are in it is the record's to say. */
  const countsOfPeople = Array.from({ length: blame.people.length }, (_, i) => i + 1);
  return {
    ...claims,
    blame: mayStateAColleaguesFault(anyText) ? blame : null,
    texts: [...ownWords.map((w) => w.text), ...(claims.targetsMayComeFrom ?? []), ...setup, ...code.out].filter(Boolean),
    numbers: [...code.nums, ...countsOfPeople],
    theirOwnWords: [...ownWords, ...code.out.map((text) => ({ name: 'the record', text }))],
    people: [...blame.people],
    reader: input.reader?.name ?? null,
    checkInsAnswered: input.checkInsAnswered ?? null,
  };
}
