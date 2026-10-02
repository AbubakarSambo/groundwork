/**
 * YOUR OWN READ SAYS "YOU" (item 18, the onboarding and project boards, 2 October 2026).
 *
 * A person may read their own row of "Contribution against role" and "Where work is landing" (decision 38), but it was
 * written about a third person. Samuel read about himself: "11 lines taken from what they said ... Their work is read
 * against what being on track means for project management ..." and "Nobody has said anything about this person's
 * work moving elsewhere. Their responsibilities are staying with them." Tobi read the same.
 *
 * On the reader's own row only, those words are said to them: "what you said", "Your work is read against ...",
 * "your work moving elsewhere", "Your responsibilities are staying with you." Nobody else's row is touched.
 */
const SWAPS: [RegExp, string][] = [
  [/\bwhat they said\b/g, 'what you said'],
  [/\bTheir work\b/g, 'Your work'],
  [/\btheir work\b/g, 'your work'],
  [/\bTheir responsibilities are staying with them\b/g, 'Your responsibilities are staying with you'],
  [/\bthis person's work\b/g, 'your work'],
  [/\bThis person's work\b/g, 'Your work'],
  [/\bcredit them\b/g, 'credit you'],
  [/\bthis person\b/g, 'you'],
  [/\bTheir stated role\b/g, 'Your stated role'],
  [/\bSo they are being read\b/g, 'So you are being read'],
  [/\bThis read of their function\b/g, 'This read of your function'],
];

export function yourOwnReadSaysYou(text: string | null | undefined): string | null | undefined {
  if (typeof text !== 'string' || !text) return text;
  return SWAPS.reduce((t, [re, to]) => t.replace(re, to), text);
}

/** The reader's own rows of the two sections, said to them. */
export function yourOwnRowsSayYou<T extends Record<string, any>>(board: T, meParticipantId: string | null): T {
  if (!meParticipantId) return board;
  const out: any = { ...board };
  const mine = (r: any) => r && r.participantId === meParticipantId;
  if (Array.isArray(out.contribution)) {
    out.contribution = out.contribution.map((r: any) => (mine(r) ? { ...r, reason: yourOwnReadSaysYou(r.reason), note: yourOwnReadSaysYou(r.note) } : r));
  }
  if (out.coverage && Array.isArray(out.coverage.reads)) {
    out.coverage = {
      ...out.coverage,
      reads: out.coverage.reads.map((r: any) => (mine(r) ? { ...r, what: yourOwnReadSaysYou(r.what), reasonText: yourOwnReadSaysYou(r.reasonText) } : r)),
    };
  }
  return out;
}
