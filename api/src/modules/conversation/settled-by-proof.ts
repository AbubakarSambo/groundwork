import { namesTheSameThing } from './confirmed-by-who-received-it';
import { COUNTS_AS_A_SOURCE } from '../documents/what-kind-of-thing-a-document-is';

/**
 * PROOF CAN SETTLE A COMMITMENT (week 9 of docs/weekly-plan.md, decision 12: "systems first, then
 * proof, and until then they are the person's word").
 *
 * The first step settles a commitment from what the person says happened to it (what-happened-to-
 * what-they-said.ts). This is the second: a commitment is marked done when one of the same person's
 * own record lines says they delivered it, and that line is
 *
 *   PROVEN     backed by a document the person added themselves (not generated notes, not the lead's
 *              plan, not a colleague's file: the same rule as the "Proven" mark, reports/how-a-line-
 *              is-known.ts), and the line is a thing that happened (PROGRESS), not a plan; or
 *   CONFIRMED  confirmed by the colleague who was waiting on it (conversation/confirmed-by-who-
 *              received-it.ts), which already means the line says it was delivered.
 *
 * and the line names the same thing as the commitment (the same check the confirmation uses), and
 * was written after the commitment was made. A line from before the promise cannot keep it.
 *
 * HOW IT WAS SETTLED IS KEPT (`settledBy`: SAID, PROVEN or CONFIRMED) so a screen can show the mark.
 * A commitment settled DONE on the person's word can be moved up to PROVEN or CONFIRMED by proof that
 * comes later; its status and the date it was settled stay as they were.
 *
 * NEVER "NOT DONE" FROM PROOF. A document can show something was done; nothing here reads the lack of
 * one as a miss. And it is careful the other way too: a wrong "done" tells a lead something nobody
 * showed, so which line matches which commitment is asked of the model, and code checks every pair it
 * gives. When in doubt it stays as it was.
 */

export type HowItWasSettled = 'SAID' | 'PROVEN' | 'CONFIRMED';

export interface ACommitmentProofMaySettle {
  id: string;
  participantId: string | null;
  text: string;
  status: string;
  settledBy?: string | null;
  createdAt: Date | string;
}

export interface ALineThatMayProveIt {
  id: string;
  participantId: string;
  type: string;
  text: string;
  recallBased?: boolean | null;
  anchoredDocumentId?: string | null;
  anchoredOrigin?: string | null;
  confirmedAt?: Date | string | null;
  disputedAt?: Date | string | null;
  createdAt: Date | string;
}

/**
 * What a line can settle a commitment by, or null. `whoAdded` maps each backing document to whoever
 * added it: a document that cannot be found does not count here, unlike on the marks, because a
 * wrong "done" is worse than a line left as their word.
 */
export function whatThisLineProves(line: ALineThatMayProveIt, whoAdded: Map<string, string | null>): 'PROVEN' | 'CONFIRMED' | null {
  if (line.disputedAt) return null;
  const doc = line.anchoredDocumentId ?? null;
  const theirOwnDocument = !!doc && whoAdded.has(doc) && whoAdded.get(doc) === line.participantId;
  const aSource = line.anchoredOrigin == null || COUNTS_AS_A_SOURCE.has(line.anchoredOrigin);
  if (line.recallBased === false && theirOwnDocument && aSource && String(line.type) === 'PROGRESS') return 'PROVEN';
  if (line.confirmedAt) return 'CONFIRMED';
  return null;
}

/** Whether a commitment is one proof may still settle, or move up from their word. */
export function mayBeSettledByProof(c: ACommitmentProofMaySettle): boolean {
  if (c.status === 'UNKNOWN') return true;
  return c.status === 'DONE' && (c.settledBy == null || c.settledBy === 'SAID');
}

export const WHICH_COMMITMENT_A_LINE_KEEPS_PROMPT = `You are given the things one person said they would do, numbered, and some of that same person's record lines, lettered. Each line is something they did, backed by a document or by the colleague who received it.

Pair a line with a thing they said they would do ONLY when the line says that very thing was done, delivered, sent or finished. A line about something else, a line that only plans it, or a line that says it is partly done or in progress is not a pair. Each thing and each line may be used at most once. When in doubt, leave it out. Most of the time there will be few pairs, or none.`;

export const WHICH_COMMITMENT_A_LINE_KEEPS_SCHEMA = {
  name: 'emit_commitments_kept',
  description: 'Each record line that says one of the numbered things was done, with the thing it did.',
  input_schema: {
    type: 'object',
    properties: {
      pairs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            commitment: { type: 'integer', description: 'The number of the thing they said they would do, as given.' },
            line: { type: 'string', description: 'The letter of the line that says it was done, as given.' },
          },
          required: ['commitment', 'line'],
        },
      },
    },
    required: ['pairs'],
  },
} as const;

const letter = (i: number) => String.fromCharCode(65 + i);

export function thePrompt(commitments: readonly { text: string }[], lines: readonly { text: string }[]): string {
  return `WHAT THEY SAID THEY WOULD DO:\n${commitments.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}\n\nWHAT THEY DID, BACKED:\n${lines.map((l, i) => `${letter(i)}. ${l.text}`).join('\n')}`;
}

const at = (d: Date | string) => new Date(d).getTime();

/**
 * The settlements to write, from the model's pairs, each checked here: the commitment may still be
 * settled by proof, the line proves something, it is the same person's, it came after the promise,
 * and it names the same thing. One line keeps one commitment, and a commitment is settled once.
 */
export function theProofSettlements(
  commitments: readonly ACommitmentProofMaySettle[],
  lines: readonly ALineThatMayProveIt[],
  whoAdded: Map<string, string | null>,
  pairs: readonly { commitment?: unknown; line?: unknown }[] | null | undefined,
): { id: string; settledBy: 'PROVEN' | 'CONFIRMED'; lineId: string; wasOpen: boolean }[] {
  const out: { id: string; settledBy: 'PROVEN' | 'CONFIRMED'; lineId: string; wasOpen: boolean }[] = [];
  const usedC = new Set<string>();
  const usedL = new Set<string>();
  for (const p of pairs ?? []) {
    const n = typeof p?.commitment === 'number' && Number.isInteger(p.commitment) ? p.commitment : NaN;
    const c = commitments[n - 1];
    const li = typeof p?.line === 'string' && /^[A-Z]$/.test(p.line.trim().toUpperCase()) ? p.line.trim().toUpperCase().charCodeAt(0) - 65 : -1;
    const l = lines[li];
    if (!c || !l || usedC.has(c.id) || usedL.has(l.id)) continue;
    if (!mayBeSettledByProof(c) || !c.participantId || c.participantId !== l.participantId) continue;
    if (!(at(l.createdAt) > at(c.createdAt))) continue;
    const proves = whatThisLineProves(l, whoAdded);
    if (!proves || !namesTheSameThing(c.text, l.text)) continue;
    usedC.add(c.id);
    usedL.add(l.id);
    out.push({ id: c.id, settledBy: proves, lineId: l.id, wasOpen: c.status === 'UNKNOWN' });
  }
  return out;
}
