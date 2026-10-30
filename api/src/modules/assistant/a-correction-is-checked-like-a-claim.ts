/**
 * A CORRECTION, IN ANY WORDS, IS CHECKED LIKE A CLAIM (the first principle, 22 October; Hafsah, 27 October 2026; fix plan, pattern 2).
 *
 * "That's not right, I sent the Kilele proof on Monday." Groundwork checks the record and the proof, asks for the proof naturally when it
 * is not there, never accuses, and when it holds up says plainly what it changed. What changes is the record itself, not a line kept
 * beside it: a promise it holds is marked done or not done, or a line of theirs is taken off, and every page reads the record, so the
 * board, the lead's morning, My work and Ask all say the new thing, and it is never said again. A number Groundwork worked out is
 * answered with how it was counted and from what; where the person is right, the thing it was counted from is corrected, and the
 * count follows. Nothing they type in Ask is written to the record as their words (Ask is private, always).
 *
 * The model reads; the product writes. Only an id from the list the model was handed can be changed, only on a verdict of "backed",
 * and only in the two ways above.
 */

export interface APromiseTheyMade { id: string; table: 'commitment' | 'todo'; text: string; status: 'DONE' | 'NOT_DONE' | 'UNKNOWN'; checkIn: string; madeOn: string }
export interface ALineOfTheirs { id: string; text: string; checkIn: string; on: string; proof: boolean }
export interface ANumberShownThem { name: string; says: string; howItIsCounted: string }
/** A wait the person is in: somebody waiting on them, or them waiting on somebody. */
export interface AWaitOfTheirs { id: string; says: string; since: string }

export interface WhatTheRecordHolds {
  promises: APromiseTheyMade[];
  lines: ALineOfTheirs[];
  numbers: ANumberShownThem[];
  /** Waits still open that they are in (two-week check: "Aisha is waiting on you for FN-007" months after it was paid). */
  waits?: AWaitOfTheirs[];
  /** Documents they added recently, by name and day. */
  documents: { name: string; on: string }[];
  firstName: string;
}

export type AVerdict = 'backed' | 'contradicted' | 'needs_proof' | 'unclear';

export interface TheCorrectionChecked {
  verdict: AVerdict;
  /** What Ask says back to them, in plain full sentences, as "you". */
  reply: string;
  /** Only on "backed": the promise of theirs whose state is now known. */
  promise?: { id: string; nowIs: 'DONE' | 'NOT_DONE' } | null;
  /** Only on "backed": a line of theirs that is not true and comes off the record. */
  lineOff?: string | null;
  /** Only on "backed": a wait that is over. */
  waitOver?: string | null;
}

export const CORRECTION_PROMPT_KEY = 'ask.check-a-correction';
export const CORRECTION_PROMPT = `Somebody has told Groundwork, a work assistant, that something it showed them is wrong, or given the true fact or figure instead. You check it against their own record, the way a good manager would: calmly, without accusing anybody, and only from what the record holds.

Decide one verdict:
- backed: the record or a document they added already shows what they say. Say plainly what you found and what changes.
- needs_proof: nothing on record shows it yet. Ask, naturally and in one sentence, for the thing that would show it (the payment message, the signed order, the email, the photo), and say it will be put right once that is in.
- contradicted: the record clearly says otherwise. Quote where and when it says so, kindly, and ask what is true now.
- unclear: you cannot tell what they mean is wrong. Ask which line or number they mean.

When they question a number, say how it was counted and from what (you are given this), then decide as above.

Only on "backed", you may name one promise of theirs whose state is now known (its id, and DONE or NOT_DONE), one line of theirs that is not true (its id), or one wait that is over (its id), from the lists you are given. Never any other id.

Write the reply to them as "you", in short, plain, full sentences that people with basic English understand. Use names. No lists, no colons, no work jargon. Never more than four sentences.`;

export const CORRECTION_SCHEMA = {
  name: 'the_correction_checked',
  description: 'The verdict on a correction, the reply to the person, and the one thing on record it changes, if backed.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['backed', 'contradicted', 'needs_proof', 'unclear'] },
      reply: { type: 'string' },
      promiseId: { type: 'string' },
      promiseIs: { type: 'string', enum: ['DONE', 'NOT_DONE'] },
      lineOffId: { type: 'string' },
      waitOverId: { type: 'string' },
    },
    required: ['verdict', 'reply'],
  },
};

/** What the model is handed: the message, and their own record, numbered by id. */
export function theCorrectionAsked(message: string, r: WhatTheRecordHolds): string {
  const promises = r.promises.map((p) => `- ${p.id}: "${p.text}", said in ${p.checkIn} on ${p.madeOn}, now ${p.status === 'DONE' ? 'done' : p.status === 'NOT_DONE' ? 'not done' : 'open'}`).join('\n') || '- none';
  const lines = r.lines.map((l) => `- ${l.id}: "${l.text}", in ${l.checkIn} on ${l.on}${l.proof ? ', with a document' : ''}`).join('\n') || '- none';
  const numbers = r.numbers.map((n) => `- ${n.name}: ${n.says} Counted from ${n.howItIsCounted}`).join('\n') || '- none';
  const docs = r.documents.map((d) => `- ${d.name}, added on ${d.on}`).join('\n') || '- none';
  const waits = (r.waits ?? []).map((w) => `- ${w.id}: ${w.says}, since ${w.since}`).join('\n') || '- none';
  return `${r.firstName} wrote: "${String(message).slice(0, 1200)}"

Their promises:
${promises}

What they said in their check-ins:
${lines}

Numbers Groundwork showed them, and how each was counted:
${numbers}

Documents they added:
${docs}

Waits still open that they are in:
${waits}`;
}

/** What the model said, made safe: an id it was not handed is dropped, and nothing changes unless the verdict is "backed". */
export function theVerdictMadeSafe(raw: any, r: WhatTheRecordHolds): TheCorrectionChecked | null {
  if (!raw || typeof raw !== 'object' || typeof raw.reply !== 'string' || !raw.reply.trim()) return null;
  const verdicts: AVerdict[] = ['backed', 'contradicted', 'needs_proof', 'unclear'];
  const verdict = verdicts.includes(raw.verdict) ? (raw.verdict as AVerdict) : 'unclear';
  const reply = raw.reply.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).slice(0, 4).join(' ');
  const backed = verdict === 'backed';
  const promise = backed && typeof raw.promiseId === 'string' && r.promises.some((p) => p.id === raw.promiseId) && (raw.promiseIs === 'DONE' || raw.promiseIs === 'NOT_DONE')
    ? { id: raw.promiseId as string, nowIs: raw.promiseIs as 'DONE' | 'NOT_DONE' } : null;
  const lineOff = backed && typeof raw.lineOffId === 'string' && r.lines.some((l) => l.id === raw.lineOffId) ? (raw.lineOffId as string) : null;
  const waitOver = backed && typeof raw.waitOverId === 'string' && (r.waits ?? []).some((w) => w.id === raw.waitOverId) ? (raw.waitOverId as string) : null;
  return { verdict, reply, promise, lineOff, waitOver };
}

export async function checkTheCorrection(
  engine: { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> },
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  message: string,
  record: WhatTheRecordHolds,
): Promise<TheCorrectionChecked | null> {
  const version = await prompts?.getActive(CORRECTION_PROMPT_KEY).catch(() => null);
  const raw = await engine.extract(version?.content ?? CORRECTION_PROMPT, [{ role: 'user', content: theCorrectionAsked(message, record) }], CORRECTION_SCHEMA).catch(() => null);
  return theVerdictMadeSafe(raw, record);
}
