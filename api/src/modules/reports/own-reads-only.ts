/**
 * A READ OF HOW SOMEBODY IS DOING BELONGS TO THAT PERSON, NOT TO THEIR COLLEAGUES.
 *
 * The shared report carries per-person quality material inside `engagement`, and
 * all of it went to everybody. From Ground 2's real report, six people, eight
 * sessions:
 *
 *   specificityNotes: "Data was vague on evidence in session 8."
 *                     "Delivering Atlas by the end of the quarter was vague on
 *                      commitment in session 8."
 *   finalSynthesis.tiers: every one of the six labelled MIXED.
 *
 * Five dimensions, per person, with a tier attached, in the document their five
 * colleagues open. That is a grade on a person in a shared record - the exact
 * thing this product refuses to produce, arriving through the back door of a
 * field nobody thought of as a verdict.
 *
 * THE SECOND-ORDER HARM IS THE ONE THAT MATTERS. Somebody who works out that
 * their thin week can be read by five peers does not give a thin account next
 * time; they give a managed one. The input this whole product runs on is honest
 * accounts, so a leak here does not just embarrass one person, it quietly
 * degrades every record that follows it.
 *
 * THE RULE, which is the one names already follow:
 *   a participant sees the read of their OWN record and nobody else's;
 *   the lead sees everyone, because leading is what the board is for and they
 *   see these reads there already.
 *
 * Structural, at the read, for the reason two prompt-only guardrails on this
 * product leaked in a single day: a rule that lives in wording holds until the
 * model is tired.
 */

export interface OwnReadsInput {
  /** The label this reader appears under in the report, or null if they have none. */
  viewerLabel: string | null;
  /** The reader's participant id, for the fields keyed that way. */
  viewerParticipantId: string | null;
  /** Leads see everything here; they carry the ground. */
  viewerIsLead: boolean;
}

/** Anything shaped `{ label, ... }`, which is how the per-party reads are stored. */
const keepOwnByLabel = (rows: any, viewerLabel: string | null): any =>
  Array.isArray(rows) ? rows.filter((r) => r?.label && r.label === viewerLabel) : rows;

/** Anything shaped `{ [label]: value }`. */
const keepOwnByKey = (map: any, viewerLabel: string | null): any => {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return map;
  const own: Record<string, any> = {};
  if (viewerLabel && viewerLabel in map) own[viewerLabel] = map[viewerLabel];
  return own;
};

/** Anything keyed by participant id. */
const keepOwnById = (map: any, viewerParticipantId: string | null): any => {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return map;
  const own: Record<string, any> = {};
  if (viewerParticipantId && viewerParticipantId in map) own[viewerParticipantId] = map[viewerParticipantId];
  return own;
};

/**
 * Strip other people's reads out of a report before it reaches a participant.
 *
 * What deliberately STAYS for everybody:
 *   parties[] keeps sessions and whether each person contributed. That is
 *   participation, not quality, and a ground where somebody has not turned up is
 *   something the others are entitled to know - it is why their own account has
 *   nothing to be compared against yet.
 *
 * What goes, for everyone but the reader themselves:
 *   specificityNotes, specificitySignal, recallNotes, the per-party
 *   specificityLabel, and the closing tiers.
 *
 * What goes entirely for a participant:
 *   concernFlags, which is a list of concerns about named parties and has no
 *   business in anybody's hands but the lead's.
 */
export function withoutOtherPeoplesReads<T extends Record<string, any>>(
  report: T,
  { viewerLabel, viewerParticipantId, viewerIsLead }: OwnReadsInput,
): T {
  /**
   * WHAT A PERSON WAS PRIVATELY ADVISED TO SAY IS NOBODY ELSE'S, INCLUDING THE LEAD'S.
   *
   * `postReportGuides` is a map of participantId -> the private preparation written for that one
   * person: the line they might open with, what to take seriously in the other account, the
   * question to carry. The report page renders it under a promise in plain words - "Yours alone,
   * and not part of the shared report. Nobody else is shown this."
   *
   * It shipped to everybody. The page was innocent: it picks out the reader's own guide by id and
   * renders only that. The whole map rode along inside `engagement`, so a lead fetching the report
   * received the participant's opening line for the conversation they were about to have WITH the
   * lead. Verified against a real report before this was written.
   *
   * This is stripped BEFORE the lead's early return below, and that is the point. The rule this
   * file already states - the lead sees everyone's reads, because leading is what the board is for
   * - is about how somebody is DOING. A private rehearsal is a different kind of thing: knowing it
   * gives the other side of a conversation the other side's notes. Nothing about running a
   * check-in requires that, and a person who suspects it stops using the guide honestly, which is
   * the same second-order harm this file was written about.
   *
   * The single correct guide still reaches its owner: `get()` reads it out by id into a top-level
   * `postReportGuide` before this runs.
   */
  const withoutGuides = ((): T => {
    const eng = report.engagement && typeof report.engagement === 'object'
      ? { ...(report.engagement as Record<string, any>) }
      : null;
    if (!eng || !('postReportGuides' in eng)) return report;
    delete eng.postReportGuides;
    return { ...report, engagement: eng };
  })();

  if (viewerIsLead) return withoutGuides;

  const engagement = withoutGuides.engagement && typeof withoutGuides.engagement === 'object'
    ? { ...(withoutGuides.engagement as Record<string, any>) }
    : null;

  if (engagement) {
    if ('specificityNotes' in engagement) engagement.specificityNotes = keepOwnByLabel(engagement.specificityNotes, viewerLabel);
    if ('recallNotes' in engagement) engagement.recallNotes = keepOwnByLabel(engagement.recallNotes, viewerLabel);
    if ('specificitySignal' in engagement) engagement.specificitySignal = keepOwnByKey(engagement.specificitySignal, viewerLabel);
    /* Keyed by label the same way, and missed the same way: a per-person confidence band. */
    if ('pictureConfidence' in engagement) engagement.pictureConfidence = keepOwnByKey(engagement.pictureConfidence, viewerLabel);
    if ('specificityCauses' in engagement) engagement.specificityCauses = keepOwnByLabel(engagement.specificityCauses, viewerLabel);
    // Concerns about people. Not a participant's to read about anyone, including
    // themselves - a concern is raised with a person, never delivered to them in
    // a document alongside their colleagues' names.
    delete engagement.concernFlags;
    // Per-party quality label lives on parties[] too. Participation stays.
    if (Array.isArray(engagement.parties)) {
      engagement.parties = engagement.parties.map((p: any) =>
        p?.label === viewerLabel ? p : { ...p, specificityLabel: undefined },
      );
    }
  }

  const finalSynthesis = withoutGuides.finalSynthesis && typeof withoutGuides.finalSynthesis === 'object'
    ? { ...(withoutGuides.finalSynthesis as Record<string, any>) }
    : null;
  if (finalSynthesis && 'tiers' in finalSynthesis) {
    finalSynthesis.tiers = keepOwnById(finalSynthesis.tiers, viewerParticipantId);
  }

  /**
   * LEADERSHIP GAPS ARE ABOUT HOW ONE PERSON IS LEADING, AND THEY WERE GOING TO
   * EVERYBODY.
   *
   * The synthesis routes findings here on purpose - a deferred conversation, a
   * commitment nobody was held to, a contribution not seen - and its own prompt
   * says the two surfaces are "read on different surfaces for different
   * purposes". Nothing implemented that split: get() returned leadershipGaps to
   * every party, and ReportPage.tsx does not reference the field at all, so the
   * most sensitive thing the synthesis produces was being handed to five
   * colleagues by an API nobody was rendering.
   *
   * It stays with the lead until there is a considered answer about how a team
   * should see a read of the person leading them. Silently shipping it to
   * everyone is not that answer.
   */
  const out: Record<string, any> = {
    ...withoutGuides,
    ...(engagement ? { engagement } : {}),
    ...(finalSynthesis ? { finalSynthesis } : {}),
  };
  delete out.leadershipGaps;
  return out as T;
}
