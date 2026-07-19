import type { Prisma } from '@prisma/client';

/**
 * Closing-round arc features - the anti-gaming core.
 *
 * DETERMINISTIC FIRST, MODEL SECOND: these features are computed from stored
 * rows (record entries, sessions, documents); the synthesis prompt narrates
 * them, it never decides them. The composite rule requires >= 2 concurring
 * features before the negative tier - a legitimately back-loaded arc (late
 * delivery, honestly documented) trips F1 alone and stays MIXED.
 *
 * Vocabulary rule, enforced by test: the negative tier describes the SHAPE OF
 * THE RECORD, never intent. The words "game/gamed/gaming" appear nowhere.
 */

export interface ArcEntry {
  sessionNumber: number;
  type: string; // RecordEntryType
  recallBased: boolean; // false = anchored to a document
  threadKey: string | null; // dimensionThreadKey - groups a theme across sessions
}

export interface ArcSession {
  sessionNumber: number;
  isFinal: boolean;
  completedAt: Date | null;
}

export interface ArcDoc {
  createdAt: Date;
}

export interface ArcInput {
  entries: ArcEntry[]; // ALL of this party's record entries, all sessions
  sessions: ArcSession[]; // this party's sessions, ascending
  docs: ArcDoc[]; // this party's uploaded documents
  finalCompletedAt: Date | null;
  closingWindowHours?: number; // default 48
}

export type ArcTier = 'CONSISTENT_ARC' | 'MIXED' | 'CONCENTRATED_FINISH';

export interface ArcFeature {
  fired: boolean;
  detail: string;
}

export interface ArcSignals {
  f1_concentration: ArcFeature;
  f2_lateUnsupported: ArcFeature;
  f3_storyShift: ArcFeature & { informational: true }; // never in the composite
  f4_cadenceShape: ArcFeature;
  f5_evidenceTiming: ArcFeature;
  firedCount: number; // composite counts F1, F2, F4, F5 only
  tier: ArcTier;
}

/** Progress-shaped entry types - what "delivery" looks like in the record. */
const DELIVERY_TYPES = new Set(['COMMITMENT', 'SUCCESS_DEFINITION']);

export function computeArcSignals(input: ArcInput): ArcSignals {
  const closingMs = (input.closingWindowHours ?? 48) * 3600_000;
  const finalNumbers = new Set(input.sessions.filter((s) => s.isFinal).map((s) => s.sessionNumber));
  const nonFinal = input.sessions.filter((s) => !s.isFinal);
  const completedNonFinal = nonFinal.filter((s) => s.completedAt != null);

  const delivery = input.entries.filter((e) => DELIVERY_TYPES.has(e.type));
  const finalDelivery = delivery.filter((e) => finalNumbers.has(e.sessionNumber));
  const earlyDelivery = delivery.filter((e) => !finalNumbers.has(e.sessionNumber));
  const earlySessionsWithDelivery = new Set(earlyDelivery.map((e) => e.sessionNumber));
  const finalEntries = input.entries.filter((e) => finalNumbers.has(e.sessionNumber));
  const earlyThreads = new Set(
    input.entries.filter((e) => !finalNumbers.has(e.sessionNumber) && e.threadKey).map((e) => e.threadKey as string),
  );

  // F1 - progress concentration: the bulk of the delivery story first appears
  // in the closing session, despite there having been earlier sessions to
  // tell it in.
  const f1Share = delivery.length ? finalDelivery.length / delivery.length : 0;
  const f1 = {
    fired: completedNonFinal.length >= 2 && delivery.length >= 3 && f1Share > 0.6,
    detail: `${finalDelivery.length} of ${delivery.length} progress-shaped entries first appear in the closing session (${completedNonFinal.length} earlier sessions were completed)`,
  };

  // F2 - late unsupported claims: closing-session claims that are memory-only
  // (recallBased, no document anchor) AND have no earlier entry on the same
  // thread. This is the existing claim-verification vocabulary applied to
  // timing: a final claim nothing earlier supports.
  const lateUnsupported = finalEntries.filter(
    (e) => e.recallBased && (!e.threadKey || !earlyThreads.has(e.threadKey)),
  );
  const f2 = {
    fired: finalEntries.length >= 2 && lateUnsupported.length >= 2 && lateUnsupported.length / finalEntries.length > 0.5,
    detail: `${lateUnsupported.length} of ${finalEntries.length} closing-session entries are memory-only with no earlier thread supporting them`,
  };

  // F3 - story shift (INFORMATIONAL ONLY, never in the composite): closing
  // entries on threads that DID exist earlier but arrive memory-only - the
  // story continued but its evidence did not. Narrated, not scored, because a
  // reversal cannot be established deterministically from these rows.
  const shifted = finalEntries.filter((e) => e.threadKey && earlyThreads.has(e.threadKey) && e.recallBased);
  const f3 = {
    fired: false,
    informational: true as const,
    detail: `${shifted.length} closing-session entries continue an earlier thread without a document anchor`,
  };

  // F4 - cadence shape: the middle of the arc is thin (under half the
  // scheduled sessions actually happened) while the closing session is rich.
  const completionRatio = nonFinal.length ? completedNonFinal.length / nonFinal.length : 1;
  const f4 = {
    fired: nonFinal.length >= 2 && completionRatio < 0.5 && finalEntries.length >= 3,
    detail: `${completedNonFinal.length} of ${nonFinal.length} scheduled sessions completed before a closing session with ${finalEntries.length} entries`,
  };

  // F5 - evidence timing: documents exist, but they overwhelmingly arrived in
  // the closing window rather than along the way.
  const finalAt = input.finalCompletedAt?.getTime() ?? null;
  const lateDocs = finalAt == null ? [] : input.docs.filter((d) => finalAt - d.createdAt.getTime() <= closingMs);
  const f5 = {
    fired: input.docs.length >= 2 && finalAt != null && lateDocs.length / input.docs.length > 0.7,
    detail: `${lateDocs.length} of ${input.docs.length} documents were uploaded inside the closing window`,
  };

  const firedCount = [f1, f2, f4, f5].filter((f) => f.fired).length;
  let tier: ArcTier;
  if (firedCount >= 2) {
    tier = 'CONCENTRATED_FINISH';
  } else if (firedCount === 0 && earlySessionsWithDelivery.size >= 2) {
    tier = 'CONSISTENT_ARC';
  } else {
    tier = 'MIXED';
  }

  return {
    f1_concentration: f1,
    f2_lateUnsupported: f2,
    f3_storyShift: f3,
    f4_cadenceShape: f4,
    f5_evidenceTiming: f5,
    firedCount,
    tier,
  };
}

/** User-facing copy per tier. Record-shape language only - describes what the
 * record shows, attributes no intent. The positive tier is the reward and IS
 * stated; the negative tier is neutral in the shared report and advisory in
 * the admin surface. */
export function tierCopy(tier: ArcTier): { shared: string; advisory: string | null } {
  switch (tier) {
    case 'CONSISTENT_ARC':
      return {
        shared: 'Delivery appears consistently across the record: progress was documented session by session, with evidence attached along the way.',
        advisory: null,
      };
    case 'MIXED':
      return {
        shared: 'The record shows progress in more than one session, with some of the account arriving at the close.',
        advisory: null,
      };
    case 'CONCENTRATED_FINISH':
      return {
        shared: 'Much of the delivery record is concentrated in the closing session; earlier sessions do not mention it.',
        advisory: 'Most of the delivery record for this party appears only in the closing session, without earlier support in the record. Worth asking about the history before treating the final account as settled.',
      };
  }
}

export function arcSignalsToJson(byParticipant: Record<string, ArcSignals>): Prisma.InputJsonValue {
  return byParticipant as unknown as Prisma.InputJsonValue;
}
