import { withoutComparisonsBetweenPeople } from './no-comparison-between-people';
import { onlyWhoIsActuallyOutside } from '../board/somebody-carrying-work-with-no-account';
import { WHERE_IT_BELONGS } from './the-four-reports';
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
 * THE RULE, since 28 September 2026: a reader is sent the read of their OWN
 *   answers and nobody else's, the lead and an org admin included. Hafsah's
 *   decision; see below.
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
  /** A lead or org admin. They keep leadershipGaps; like everyone, only their own rating, and no concernFlags. */
  viewerIsLead: boolean;
  /** Everybody on the check-in, by name. Lets the lead's list of people outside the room be cut the way the board cuts it. */
  partyNames?: string[];
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
 * Strip other people's ratings out of a report before it reaches any reader, the lead included.
 *
 * What deliberately STAYS for everybody:
 *   parties[] keeps sessions and whether each person contributed. That is
 *   participation, not quality, and a ground where somebody has not turned up is
 *   something the others are entitled to know - it is why their own account has
 *   nothing to be compared against yet.
 *
 * What goes, for every reader but the person it is about, the lead and an org admin included:
 *   specificityNotes, specificitySignal, pictureConfidence, specificityCauses,
 *   recallNotes, the per-party specificityLabel, and the closing tiers.
 *
 * What goes entirely for a participant:
 *   concernFlags, which is a list of concerns about named parties and has no
 *   business in anybody's hands but the lead's.
 */
export function withoutOtherPeoplesReads<T extends Record<string, any>>(report: T, input: OwnReadsInput): T {
  /* And no sentence that ranks a person against others, for any reader (no-comparison-between-people.ts). */
  return withoutComparisonsBetweenPeople(withoutOtherPeoplesRatings(report, input));
}

function withoutOtherPeoplesRatings<T extends Record<string, any>>(
  report: T,
  { viewerLabel, viewerParticipantId, viewerIsLead, partyNames }: OwnReadsInput,
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

  /*
   * NO READER IS SENT ANYONE'S RATING. Hafsah's decision, 28 September 2026: "leads and admins are
   * never sent how anyone's answers were rated. Ratings may be used inside the engine to build
   * reports, but are never served to any reader." Until then the lead returned here with every
   * person's reads, on the rule this file used to state ("the lead sees everyone"), which
   * contradicted CLAUDE.md. So other people's ratings come off for every reader, the lead and an
   * org admin included, and before the lead's early return. Nothing on any report screen reads them.
   *
   * A reader keeps the read of their OWN answers, which is the decision of 1 September 2026 (see
   * specificity-is-yours-to-see.spec.ts) and the Done page's "Only you see it". A lead who gave an
   * account keeps theirs; an org admin with no account of their own keeps none.
   */
  const engagement = withoutGuides.engagement && typeof withoutGuides.engagement === 'object'
    ? { ...(withoutGuides.engagement as Record<string, any>) }
    : null;

  if (engagement) {
    for (const k of ['specificityNotes', 'recallNotes', 'specificityCauses']) {
      if (k in engagement) engagement[k] = keepOwnByLabel(engagement[k], viewerLabel);
    }
    for (const k of ['specificitySignal', 'pictureConfidence']) {
      if (k in engagement) engagement[k] = keepOwnByKey(engagement[k], viewerLabel);
    }
    /* The per-party label goes too. Participation (sessions, whether they contributed) stays. */
    if (Array.isArray(engagement.parties)) {
      engagement.parties = engagement.parties.map((p: any) =>
        p?.label && p.label === viewerLabel ? p : { ...p, specificityLabel: undefined, confidence: undefined },
      );
    }
  }

  const finalSynthesis = withoutGuides.finalSynthesis && typeof withoutGuides.finalSynthesis === 'object'
    ? { ...(withoutGuides.finalSynthesis as Record<string, any>) }
    : null;
  if (finalSynthesis && 'tiers' in finalSynthesis) {
    finalSynthesis.tiers = keepOwnById(finalSynthesis.tiers, viewerParticipantId);
  }

  /*
   * B-110: `concernFlags` says, per named person, how thin or generic their answers were ("significantly
   * fewer and less specific entries than others on the same ground"). That is a rating of how a person's
   * answers were rated, so it goes for every reader, the lead and an org admin included (CLAUDE.md, and
   * the Hafsah decision that a lead reads only the plain forms). The engine still builds it and may use it inside.
   */
  if (engagement) delete engagement.concernFlags;

  const withoutRatings: Record<string, any> = {
    ...withoutGuides,
    ...(engagement ? { engagement } : {}),
    ...(finalSynthesis ? { finalSynthesis } : {}),
  };

  if (viewerIsLead) {
    /* The lead keeps the people carrying work outside the room, cut the way the board cuts it. */
    if (engagement && Array.isArray(engagement.hiddenContributors)) {
      engagement.hiddenContributors = onlyWhoIsActuallyOutside(engagement.hiddenContributors, partyNames ?? []).keep;
    }
    return withoutRatings as T;
  }

  /* Every field the map marks lead-only is the lead's alone. Stripped here, on the server, for
     everybody else, so a member's API call never carries it (the-four-reports, leadOnly). */
  if (engagement) {
    for (const [field, placed] of Object.entries(WHERE_IT_BELONGS)) if (placed.leadOnly) delete engagement[field];
  }

  /* Concerns about people. Not a participant's to read about anyone, including themselves - a
     concern is raised with a person, never delivered to them in a document alongside their
     colleagues' names. */
  /* `engagement` is this call's own copy, and the lead has already returned with it. */
  if (engagement) delete engagement.concernFlags;

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
  const out: Record<string, any> = { ...withoutRatings };
  delete out.leadershipGaps;
  for (const [field, placed] of Object.entries(WHERE_IT_BELONGS)) if (placed.leadOnly) delete out[field];
  return out as T;
}
