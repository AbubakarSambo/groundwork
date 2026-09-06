/**
 * DISCUSSED, AGREED, SIGNED, IN FORCE — FOUR MOMENTS THAT COLLAPSE INTO
 * "SOMETHING SOMEBODY SAID".
 *
 * Somebody's meeting note records that both sides were happy for Delta to use the
 * model. Six months later that note is the reason one side believes the client
 * list changed and the other believes nothing changed, and both are being honest.
 * The note is real; what it is not is an amendment.
 *
 * These four are kept apart because the difference between them is the entire
 * argument:
 *
 *   DISCUSSED — it came up. Somebody wrote it down. Nothing follows from it, and a
 *   product that treats a meeting note as a change to a contract is the fastest
 *   way to make a disagreement worse.
 *
 *   AGREED — both sides say, each in their own words, that this is what they want.
 *   Still not the agreement: people agree to things and then their lawyers do not.
 *
 *   SIGNED — it was executed. A date, and who says so.
 *
 *   IN FORCE — signed AND its start date has arrived. An amendment signed in
 *   October that starts in January governs nothing in November.
 *
 * WHAT MAY BE JUDGED AGAINST WHAT IS THE POINT OF THE FILE. Only what is in force
 * governs the period it covers. Everything earlier is a record of where the two
 * sides had got to, which is worth keeping and worth never confusing with the
 * agreement.
 */

export type Standing =
  /** It came up and was written down. */
  | 'discussed'
  /** Both sides say this is what they want. */
  | 'agreed, not signed'
  /** Executed. */
  | 'signed'
  /** Signed, and its day has come. */
  | 'in force'
  /** A later one took over. It still governs the period it covered. */
  | 'replaced';

/** Whether anything at all may be settled against a version in this standing. */
export function mayBeJudgedAgainst(standing: Standing): boolean {
  /* Only what governed the period. "Replaced" still governed its own period, and
     that is usually the period being argued about. */
  return standing === 'in force' || standing === 'replaced';
}

export function whyThisCannotGovern(standing: Standing): string | null {
  switch (standing) {
    case 'discussed':
      return 'This was discussed and written down. Nothing has been agreed or signed, so nothing can be settled against it.';
    case 'agreed, not signed':
      return 'Both sides say this is what they want, and it has not been signed. Until it is, the agreement is still the one that was.';
    case 'signed':
      return 'This is signed but its start date has not arrived. Until then the previous version still governs.';
    default:
      return null;
  }
}

/**
 * Where a version stands, worked out rather than stored — so a version cannot sit
 * in a standing its own facts contradict.
 *
 * A row that says "in force" while its start date is in December is a row somebody
 * set by hand, and it will be believed.
 */
export function whereItStands(v: {
  agreedBy: string[];
  signedAt: Date | null;
  inForceFrom: Date;
  inForceTo: Date | null;
}, on: Date = new Date()): Standing {
  const day = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const today = day(on);

  if (!v.signedAt) return v.agreedBy.length >= 2 ? 'agreed, not signed' : 'discussed';
  if (v.inForceTo && day(v.inForceTo) < today) return 'replaced';
  if (day(v.inForceFrom) > today) return 'signed';
  return 'in force';
}

/** How it reads, with the distinction said out loud rather than left to be inferred. */
export function howItStands(standing: Standing, from: Date): string {
  const day = from.toISOString().slice(0, 10);
  switch (standing) {
    case 'discussed':
      return `Discussed, and written down. Not agreed and not signed — it would start on ${day} if it were.`;
    case 'agreed, not signed':
      return `Both sides say this is what they want. Not signed, so the agreement is still the one that was. It would start on ${day}.`;
    case 'signed':
      return `Signed, and it starts on ${day}. Until then the previous version governs.`;
    case 'in force':
      return `In force since ${day}.`;
    case 'replaced':
      return `Replaced by a later version. It still governs the period from ${day} that it covered.`;
  }
}

/** Given to any synthesis that reads a version or a meeting note about one. */
export const A_NOTE_IS_NOT_AN_AMENDMENT =
  'A CONVERSATION IS NOT A CHANGE TO THE AGREEMENT. Something recorded in a meeting note, however '
  + 'clearly both sides seemed to agree it, is discussed and nothing more. Never write that the '
  + 'agreement now permits, requires or covers something on the strength of what somebody said or '
  + 'wrote down. Say what was discussed, say what is in force, and where they differ say that the '
  + 'two have not been brought into line — which is a thing worth doing rather than a fault.';
