import type { AClaim, WhatTheRecordHoldsForClaims } from './a-claim-the-record-does-not-hold';
import { whoWasReallyRemindedToCheckIn } from '../email/a-reminder-really-sent';
import { itWasTakenFurther } from '../reports/what-they-said-they-did-about-it';
import { TAKEN_FURTHER_MEANS } from './the-assessment';

/**
 * WHAT ONE CHECK-IN'S RECORD HOLDS, FOR THE CLAIMS a-claim-the-record-does-not-hold READS (decision 139, must-fix 3).
 *
 * Looked up only for the kinds of claim a text makes (`theKindsOfClaimIn`), so an ordinary turn or report costs nothing. Each kind is read
 * from the record and nowhere else:
 *
 *   a reminder sent   the record of messages holds a reminder to check in, to somebody in this check-in, in the last seven days.
 *   an escalation     a wait in this check-in was taken above the person it was with, or round them, as the assessment read the
 *                     person's words (`takenFurther`). Never the product's own overnight stamp (`escalatedAt`). Inside a live check-in,
 *                     where what was just said is not on a wait yet, the model reads their words here with the same meaning.
 *   a target          the texts a target may be read from: the check-in's target rows, the organisation's objectives and targets, the
 *                     lead's setup (the brief, each person's role and remit as given, the lead's notes), and what people said.
 *
 * Nothing read here is shown to anybody; it is only what a sentence is checked against. A kind that could not be read is left out, so the
 * check never cuts on a lookup that failed.
 */
const WEEK = 7 * 86_400_000;

export const TOOK_IT_HIGHER_PROMPT = `You read what one person said in their check-in, below. Say whether they took something higher: true only when ${TAKEN_FURTHER_MEANS} Return JSON only.`;
export const TOOK_IT_HIGHER_SCHEMA = {
  name: 'emit_took_it_higher',
  description: 'Whether the person said they took something above the person it was with.',
  input_schema: { type: 'object', properties: { tookItHigher: { type: 'boolean' } }, required: ['tookItHigher'] },
} as const;

export async function whatTheRecordHoldsForClaims(
  prisma: any,
  input: { groundId: string; kinds: Set<AClaim>; now?: Date; wordsSaidHere?: readonly string[]; engine?: { extract: (p: string, h: { role: 'user'; content: string }[], t: any, o?: any) => Promise<any> } | null },
): Promise<WhatTheRecordHoldsForClaims> {
  const { groundId, kinds } = input;
  const now = input.now ?? new Date();
  const said = (input.wordsSaidHere ?? []).map((w) => String(w ?? '')).filter(Boolean);
  const held: WhatTheRecordHoldsForClaims = {};
  if (!groundId || !kinds.size) return held;

  const theLinesOfTheRecord = async (): Promise<string[]> =>
    ((await prisma.recordEntry?.findMany?.({ where: { participant: { groundId } }, select: { text: true }, take: 2000 })) ?? [])
      .map((r: any) => String(r?.text ?? '')).filter(Boolean);

  if (kinds.has('a reminder sent')) {
    try {
      const people = (await prisma.groundParticipant?.findMany?.({ where: { groundId }, select: { email: true } })) ?? [];
      const sent = await whoWasReallyRemindedToCheckIn(prisma, people.map((p: any) => p?.email ?? ''), new Date(now.getTime() - WEEK), now);
      held.remindersSent = sent.size > 0;
    } catch { /* not read, so not checked */ }
  }

  /*
   * SOMEBODY TOOK IT HIGHER: from the waits, as the assessment read them; and inside a live check-in, where what was just said is not on
   * a wait yet, from their words here, read by the model with the same meaning (TAKEN_FURTHER_MEANS). No word list. Not read, not checked.
   */
  if (kinds.has('an escalation')) {
    try {
      const waits = (await prisma.groundDependency?.findMany?.({ where: { groundId }, select: { takenFurther: true } })) ?? [];
      const onAWait = waits.some((d: any) => itWasTakenFurther(d));
      if (onAWait || !said.length) held.somebodySaidTheyTookItHigher = onAWait;
      else if (input.engine) {
        const read = await input.engine.extract(TOOK_IT_HIGHER_PROMPT, [{ role: 'user', content: said.map((w) => `- ${w.slice(0, 800)}`).join('\n') }], TOOK_IT_HIGHER_SCHEMA);
        if (typeof read?.tookItHigher === 'boolean') held.somebodySaidTheyTookItHigher = read.tookItHigher;
      }
    } catch { /* not read, so not checked */ }
  }

  if (kinds.has('a target')) {
    try {
      const ground = await prisma.ground?.findUnique?.({
        where: { id: groundId },
        select: {
          brief: true, organizationId: true,
          participants: { select: { roleAsDescribed: true, remitAsGiven: true } },
          leadContextNotes: { select: { text: true } },
        },
      });
      const rows = (await prisma.groundObjective?.findMany?.({ where: { groundId }, select: { name: true, target: true } })) ?? [];
      const subjects = ground?.organizationId
        ? ((await prisma.subject?.findMany?.({ where: { organizationId: ground.organizationId }, select: { title: true, measure: true, target: true }, take: 500 }).catch?.(() => [])) ?? [])
        : [];
      held.targetsMayComeFrom = [
        ...rows.map((o: any) => `${o?.target ?? ''} ${o?.name ?? ''}`),
        ...subjects.map((s: any) => [s?.target, s?.measure, s?.title].filter(Boolean).join(' ')),
        ground?.brief ?? '',
        ...((ground?.participants ?? []) as any[]).flatMap((p) => [p?.roleAsDescribed ?? '', p?.remitAsGiven ?? '']),
        ...((ground?.leadContextNotes ?? []) as any[]).map((n) => n?.text ?? ''),
        ...(await theLinesOfTheRecord()),
        ...said,
      ].map((t) => String(t ?? '').trim()).filter(Boolean);
    } catch { /* not read, so not checked */ }
  }
  if (kinds.has('a status the record does not hold')) {
    try {
      /* Only lines a document backs or a colleague confirmed: somebody's word, or the conversation, is never proof. */
      const rows = (await prisma.recordEntry?.findMany?.({
        where: { participant: { groundId }, disputedAt: null, OR: [{ anchoredDocumentId: { not: null } }, { confirmedAt: { not: null } }] },
        select: { text: true, documentSays: true }, take: 2000,
      })) ?? [];
      held.shownOrConfirmed = rows.flatMap((r: any) => [r?.text ?? '', r?.documentSays ?? '']).map((t: string) => String(t).trim()).filter(Boolean);
    } catch { /* not read, so not checked */ }
  }
  return held;
}
