import { numbersIn, theLineIsTheAim, type ALineOnRecord } from './what-the-record-says-a-number-is';

/**
 * WHAT A PERSON SAID THEY HAD DONE, AGAINST A TARGET (run 5, 18 November; cycle 6).
 *
 * Taa Solar's people said how many lanterns they sold every week, 24 to 29, and every target on the board stayed at 0 and the lead's
 * letter said "nothing is counted against it yet". The cause was not in the letter. "I sold 24 lanterns last week" was read as an aim
 * and kept as a new aim, and the read of numbers off what was said (what-the-record-says-a-number-is) lands only the lead's own numbers,
 * and leaves out every target the deals count, which is every target on a sales board.
 *
 * A number a person gives for what they have done is theirs, said and not proven. It is kept beside the target, one per person, the
 * newest round's: it changes no count, adds nothing to what the deals hold and makes no aim. The model reads which line reports what
 * against which target, as it always has; the code only checks the facts: the line was said by that person, the number is in it, the
 * target is the team's or theirs, and the line is not the aim being stated again.
 */

export interface ATargetToReadAgainst { id: string; name: string; target: number | null; ownerParticipantId?: string | null }
export interface ALineByAPerson extends ALineOnRecord { who: string }
export interface WhatAPersonSaid { objectiveId: string; participantId: string; count: number; said: string }

export const WHAT_PEOPLE_SAID_PROMPT = `You are reading what people on a team said they have done so far, for the targets their lead is tracking.

You will be given the targets, each with its id, its name and whose it is (the team's, or one person's), and the lines people said this round, each with the id of the person who said it.

For each line where a person says how much THEY HAVE DONE, give the target it is a count of, and the number. Work through the lines one at a time.

- "I sold 24 this week" against the team's target "sell 30 lanterns a week" is 24 for that person against that target. It is their own part of the team's number, not the team's total and not a new target.
- Their own target is the target to use where the line is about their own aim and not the team's.
- "I want to sell 30" or "I will aim for 35" is what they are aiming at, not what they have done. Do not read a count from it.
- A number about one customer's order or deal ("Mama Njeri wants 10 units") is that deal's, not a count of what the person has done.
- "I visited 6 shops" is a count only where the target counts shops visited.
- Where a person gives a number for what they have done and says nothing about which target, use the target that counts the same thing. Where none does, leave it out.
- Where one person gives two numbers for the same target, give the later.

Only where a line really reports what that person has done. An empty answer is correct, and a wrong number is worse than none: a lead reads this. Give back, for each: the target's id, the person's id, the number, and the exact line you read it from.`;

export const WHAT_PEOPLE_SAID_SCHEMA = {
  name: 'emit_what_each_person_said_they_have_done',
  description: 'Emit what each person said they have done against a target, and the line it was read from.',
  input_schema: {
    type: 'object',
    properties: {
      said: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            objectiveId: { type: 'string', description: 'The id of the target it is a count of.' },
            participantId: { type: 'string', description: 'The id of the person who said it.' },
            count: { type: 'number', description: 'The number they said they have done.' },
            said: { type: 'string', description: 'The exact line it was read from.' },
          },
          required: ['objectiveId', 'participantId', 'count', 'said'],
        },
      },
    },
    required: ['said'],
  },
};

/** The targets and the lines, as the model is given them. */
export function theQuestionAboutWhatPeopleSaid(targets: ATargetToReadAgainst[], lines: ALineByAPerson[]): string {
  return (
    'TARGETS\n'
    + targets.map((t) => `- id ${t.id}: "${t.name}"${t.target != null ? `, target ${t.target}` : ''}, ${t.ownerParticipantId ? `held by person ${t.ownerParticipantId}` : "the team's"}`).join('\n')
    + '\n\nWHAT PEOPLE SAID THIS ROUND\n'
    + lines.map((l) => `- person ${l.who}: ${l.text}`).join('\n')
  );
}

const plain = (t: string) => (t ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * WHAT HOLDS. The line has to be one that person said (not the lead, whose number the board reads its own way), the number has to be in
 * it, the target has to be the team's or theirs, and a line that only states the target again is not a count. One number per person per
 * target: the last of the person's lines it was read from.
 */
export function onlyWhatAPersonReallySaid(read: { objectiveId: string; participantId: string; count: number; said: string }[], targets: ATargetToReadAgainst[], lines: ALineByAPerson[]): WhatAPersonSaid[] {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const kept = new Map<string, { r: WhatAPersonSaid; at: number }>();
  for (const r of read ?? []) {
    const t = byId.get(r?.objectiveId);
    if (!t || !Number.isFinite(r.count) || !Number.isInteger(r.count) || r.count < 0) continue;
    const s = plain(r.said);
    if (!s) continue;
    const at = lines.findIndex((l) => l.who === r.participantId && !l.saidByTheLead && (plain(l.text).includes(s) || s.includes(plain(l.text))));
    if (at < 0) continue;
    const line = lines[at];
    if (t.ownerParticipantId && t.ownerParticipantId !== r.participantId) continue;
    if (!numbersIn(line.text).has(r.count)) continue;
    /* The kind the record gave the line is not asked: "I sold 30 lanterns last week" came back from the assessment as a SUCCESS_DEFINITION in about a third of
       Taa Solar's rounds (run 6), and a kind-based rejection dropped the person whose number equalled the target. The words are asked. */
    if (theLineIsTheAim(r.count, t, line.text, null)) continue;
    const key = `${r.objectiveId}|${r.participantId}`;
    const before = kept.get(key);
    if (!before || at >= before.at) kept.set(key, { r: { objectiveId: r.objectiveId, participantId: r.participantId, count: r.count, said: line.text }, at });
  }
  return [...kept.values()].map((k) => k.r);
}
