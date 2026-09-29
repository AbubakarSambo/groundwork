/**
 * WHAT HAPPENED TO WHAT THEY SAID THEY WOULD DO (week 9 of docs/weekly-plan.md).
 *
 * The next check-in already puts each open commitment to the person: "Ask what happened... Where
 * they say it is done, ask what shows it" (what-the-context-already-holds, whatTheySaidTheyWouldDo).
 * Nothing wrote the answer back, so a commitment stayed UNKNOWN until somebody pressed a button, and
 * "kept 11 of 20" could never be counted. This reads the person's own words from the check-in
 * against the commitments that were open when it started, and settles only what they plainly said:
 *
 *   DONE      they said they did it.
 *   NOT_DONE  they said they did not do it, and gave no new time for it.
 *
 * Everything else stays open. A new date, "still working on it", "partly" and silence are not a
 * miss: GroundCommitment's own rule is that a promise that moved is a different thing from one that
 * was missed, and reading the second as the first is the unfairest mistake this product could make.
 * A commitment a person settled by hand is never touched, and nothing is settled from anybody's
 * words but their own.
 */

export type ASettlement = 'DONE' | 'NOT_DONE';

export const READ_WHAT_HAPPENED = [
  'You are given the things one person said, in an earlier check-in, that they would do, numbered. Then you are given everything that person said in this check-in, in their own words.',
  '',
  'For each numbered thing, say what THEY said happened to it in this check-in:',
  '  - "DONE" only when they plainly said they did it ("I sent it on Tuesday", "that is done").',
  '  - "NOT_DONE" only when they plainly said they did not do it. They also gave no new time for it. For example: "I did not get to it", "I never called her".',
  '  - "OPEN" for everything else: they did not mention it, they gave a new date or time, they said it is in progress or partly done, or you are not sure.',
  '',
  'RULES:',
  '  - Use only this person\'s own words. Never decide from what somebody else did or what the interviewer said.',
  '  - Some answers come with the question they answered, in brackets before them. The question only tells you what a short answer is about ("I have not done anything further" after a question about following up is about the follow-up). Decide from their answer, never from the question.',
  '  - A new date or a new plan for the same thing is OPEN, never NOT_DONE.',
  '  - When in doubt, OPEN.',
].join('\n');

export const WHAT_HAPPENED_SCHEMA = {
  name: 'what_happened_to_what_they_said',
  description: 'For each numbered commitment, whether this person said it was done, not done, or neither.',
  input_schema: {
    type: 'object',
    properties: {
      outcomes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'integer', description: 'The number of the commitment, as given.' },
            happened: { type: 'string', enum: ['DONE', 'NOT_DONE', 'OPEN'] },
          },
          required: ['item', 'happened'],
        },
      },
    },
    required: ['outcomes'],
  },
} as const;

/** One thing they said, with the question it answered where there was one. */
export type AnAnswer = string | { asked?: string | null; said: string };

export function thePrompt(open: readonly { text: string; whenSaid?: string | null }[], said: readonly AnAnswer[]): string {
  const things = open.map((c, i) => `${i + 1}. ${c.text}${c.whenSaid ? ` (${c.whenSaid})` : ''}`).join('\n');
  const answer = (a: AnAnswer) => (typeof a === 'string' ? a : a.asked ? `(Asked: "${a.asked}") ${a.said}` : a.said);
  return `WHAT THEY SAID THEY WOULD DO:\n${things}\n\nWHAT THEY SAID IN THIS CHECK-IN, in order:\n${said.map((x, n) => `${n + 1}. ${answer(x)}`).join('\n')}`;
}

/**
 * THE SAME COMMITMENT, WRITTEN TWICE. Ngozi's "I will follow up with Mr. Adebayo again" and "I will
 * follow up with Mr. Adebayo again by tomorrow." were two rows, both with "by tomorrow" as their
 * time, so her You board listed the one promise twice. The key is the words without their time,
 * their case or their punctuation.
 */
export function aCommitmentKey(text: string, whenSaid?: string | null): string {
  let t = String(text ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const when = String(whenSaid ?? '').toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (when && t.endsWith(` ${when}`)) t = t.slice(0, -when.length).trim();
  return t;
}

/** One of each commitment, the first written kept. */
export function oneOfEach<T extends { text?: string | null; whenSaid?: string | null }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = aCommitmentKey(r.text ?? '', r.whenSaid);
    if (k && seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/**
 * The settlements to write: only rows that were open and put to them, only DONE or NOT_DONE, one
 * each, in the model's numbering (from 1). Anything else is dropped.
 */
export function theSettlements<T extends { id: string; status: string }>(
  open: readonly T[],
  outcomes: readonly { item?: unknown; happened?: unknown }[] | null | undefined,
): { id: string; status: ASettlement }[] {
  const out = new Map<string, ASettlement>();
  for (const o of outcomes ?? []) {
    const n = typeof o?.item === 'number' && Number.isInteger(o.item) ? o.item : NaN;
    const row = open[n - 1];
    if (!row || row.status !== 'UNKNOWN' || out.has(row.id)) continue;
    if (o.happened === 'DONE' || o.happened === 'NOT_DONE') out.set(row.id, o.happened);
  }
  return [...out].map(([id, status]) => ({ id, status }));
}
