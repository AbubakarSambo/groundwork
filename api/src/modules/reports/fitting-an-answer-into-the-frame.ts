/**
 * FITTING ONE PERSON'S ANSWER INTO THE FRAME.
 *
 * The frame says what a complete answer holds - a named place, a quantity with its period, which of
 * a few named situations somebody is in. This puts one person's conversation into it, so that a
 * hundred conversations become a hundred rows of the same shape and the findings become arithmetic.
 *
 * WHY IT READS THE TRANSCRIPT AND NOT THE RECORD. The record is typed lines somebody may quote in a
 * report - it is deliberately conservative and it drops anything that was not stated plainly. A fit
 * is a different question: not "what did they state for the record" but "which of these seven things
 * did they tell us, in whatever words". On the hundred-person run the records held six entries a
 * person and the transcripts held everything.
 *
 * `couldNotSay` IS AN ANSWER AND THE MOST VALUABLE ONE HERE. Somebody who was asked how they vet a
 * new supplier and said they have no way to do it has answered the question. Twenty-nine of those is
 * the product specification for a data business, and until now it was thrown away as an empty field.
 */
import type { AField } from '../conversation/what-a-complete-answer-holds';

export interface AFittedValue {
  fieldId: string;
  /** The comparable value, normalised: a place name, "2,000 tonnes a quarter", an option. */
  value: string | null;
  /** CHOICE only: which option they are in, exactly as the frame words it. */
  option?: string | null;
  /** Their own words, so every count can be traced back to somebody's sentence. */
  said?: string | null;
  /** They were asked and said they do not know, do not do it, or have no way to. */
  couldNotSay?: boolean;
}

export interface AFittedAnswer {
  participantId: string;
  who: string | null;
  organisation: string | null;
  kind: string | null;
  values: AFittedValue[];
  /** Fields with a value, over fields they were asked. The honest version of "were they specific". */
  completeness: number;
  /** What the conversation measured turn by turn, where it ran. Never an opinion written later. */
  specificity: number | null;
  gaveEvidence: boolean;
}

export function theFitInstruction(frame: AField[], kindOfThing?: string | null): string {
  return [
    'You are given one person\'s check-in conversation and a set of FIELDS. Put what they said into those fields.',
    '',
    'THE FIELDS:',
    ...frame.map((f) => [
      `  ${f.id} (${f.shape})${f.askedOf ? ` - only for ${f.askedOf}` : ''}: ${f.asks}`,
      f.oneOf?.length ? `      one of: ${f.oneOf.map((o) => `"${o}"`).join(' | ')}` : '',
    ].filter(Boolean).join('\n')),
    '',
    'FOR EACH FIELD, RETURN ONE OF THREE THINGS AND NOTHING ELSE:',
    '  a value        where they said it, in whatever words. Normalise the shape, never the content: a PLACE is the place names they gave, a QUANTITY is the number with its unit and period as they gave it, a CHOICE is exactly one of the options listed above, copied word for word.',
    '  couldNotSay    where they were asked and said they do not know, do not do it, or have no way to do it. This is an answer, not a blank.',
    '  nothing        where the conversation never got to it. Leave the field out entirely.',
    '',
    'THE DIFFERENCE BETWEEN THE LAST TWO IS THE WHOLE POINT OF THIS. "We have no way of checking anybody" is a finding. "Nobody asked them" is a hole in our own work. Never turn one into the other.',
    '',
    'FOR A CHOICE, PICK THE OPTION THEIR SITUATION IS ACTUALLY IN, not the one their words resemble. Somebody who says "we just go on who our existing suppliers vouch for, nothing formal" is in the option about vouching, not the one about a formal process, even though they used the word formal.',
    '',
    'ALWAYS INCLUDE `said`: their own sentence, trimmed, for every field you fill. Every number in the report has to be traceable to somebody\'s words. Never your paraphrase.',
    '',
    'NEVER INFER. If they talked about Kano and never said they wanted to expand there, that is not the expansion field. A wrong fit is worse than an empty one: it becomes a number in a report that nobody said.',
    kindOfThing ? `\nTHIS PERSON'S ORGANISATION, as they described it: ${kindOfThing}. Use it only to decide whether a field marked for one kind of respondent applies to them.` : '',
  ].filter(Boolean).join('\n');
}

export const THE_FIT_SCHEMA = {
  name: 'fit_this_answer',
  description: 'What this one person said, put into the fields a complete answer holds.',
  input_schema: {
    type: 'object',
    properties: {
      values: {
        type: 'array',
        description: 'One entry per field they answered or explicitly could not answer. Fields the conversation never reached are left out.',
        items: {
          type: 'object',
          properties: {
            fieldId: { type: 'string', description: 'The field id, exactly as given.' },
            value: { type: 'string', description: 'The comparable value. Omit where couldNotSay is true.' },
            option: { type: 'string', description: 'CHOICE fields only: one of the listed options, word for word.' },
            said: { type: 'string', description: 'Their own sentence. Never a paraphrase.' },
            couldNotSay: { type: 'boolean', description: 'True where they were asked and said they do not know, do not do it, or have no way to.' },
          },
          required: ['fieldId'],
        },
      },
      organisation: { type: 'string', description: 'The organisation they answer for, where they said it.' },
      kind: { type: 'string', description: 'What kind of organisation it is, in a few words, from what they said: aggregator, input dealer, research institute, funder, distributor, trader.' },
    },
    required: ['values'],
  },
} as const;

/** Only options the frame actually offers, only fields the frame actually has. */
export function theFitFrom(raw: unknown, frame: AField[], note?: (why: string) => void): AFittedValue[] {
  const byId = new Map(frame.map((f) => [f.id, f]));
  const out: AFittedValue[] = [];
  const seen = new Set<string>();
  for (const r of (Array.isArray((raw as any)?.values) ? (raw as any).values : []) as any[]) {
    const fieldId = String(r?.fieldId ?? '').trim();
    const field = byId.get(fieldId);
    if (!field) { note?.(`a value arrived for ${fieldId || '(no field)'}, which is not in the frame`); continue; }
    if (seen.has(fieldId)) continue;
    const couldNotSay = r?.couldNotSay === true;
    const said = String(r?.said ?? '').trim() || null;
    let value = String(r?.value ?? '').trim() || null;
    let option: string | null = null;
    if (field.shape === 'CHOICE') {
      const offered = field.oneOf ?? [];
      const asked = String(r?.option ?? r?.value ?? '').trim();
      const hit = offered.find((o) => o.toLowerCase() === asked.toLowerCase())
        ?? offered.find((o) => asked && (o.toLowerCase().includes(asked.toLowerCase()) || asked.toLowerCase().includes(o.toLowerCase())));
      if (!hit && !couldNotSay) { note?.(`${fieldId}: "${asked}" is not one of the options; dropped`); continue; }
      option = hit ?? null;
      value = hit ?? null;
    }
    if (!couldNotSay && !value) { note?.(`${fieldId}: neither a value nor an admission; dropped`); continue; }
    seen.add(fieldId);
    out.push({ fieldId, value, ...(option ? { option } : {}), said, ...(couldNotSay ? { couldNotSay } : {}) });
  }
  return out;
}

/** Fields with a real value over fields this person was asked for. Not an opinion about them. */
export function howCompletely(values: AFittedValue[], frame: AField[], theirKind: string | null): number {
  const theirs = frame.filter((f) => !f.askedOf || (theirKind ?? '').toLowerCase().split(/\W+/).some((w) => w.length > 3 && f.askedOf!.toLowerCase().includes(w)));
  const asked = theirs.length || frame.length;
  const filled = values.filter((v) => !v.couldNotSay && v.value).length;
  return Math.min(1, Math.round((filled / asked) * 100) / 100);
}
