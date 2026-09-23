/**
 * WHAT A COMPLETE ANSWER HOLDS.
 *
 * Hafsah, 23 September 2026, relaying two customers on the same morning: "The report not put things
 * into buckets or perspective, and it really is a bit rubbish... It just lists what people said, is
 * there no analysis function or reasoning or intelligence function."
 *
 * The report was not the fault. A hundred people answered one brief and gave a hundred differently
 * shaped answers, and you cannot count, rank or cross-cut things that are not the same shape - so
 * the only thing left to write was a list, and above a list the only thing left to say is
 * atmosphere. That is what he read.
 *
 * THE DIFFERENCE BETWEEN A SUBJECT AND A FIELD, which is the whole of this module. The brief is
 * already read into SUBJECTS - "the volumes they move" - and a subject is a topic to raise. Two
 * people can both talk about volumes and leave nothing that can be put side by side. A FIELD is the
 * part of the answer that survives being counted: a named place, a quantity with its unit and
 * period, a kind of actor, a count of times something went wrong, one of a few named states of
 * affairs. Thirty-four answers with the same eight fields is a dataset. Thirty-four answers about
 * the same eight subjects is a pile of transcripts.
 *
 * WHY IT IS DERIVED AND NOT CONFIGURED. Nobody is going to fill in a form of field definitions
 * before running a check-in, and the lead has already written down what they want - at length, in
 * their own words. The brief IS the specification; it has never been read as one. What the lead is
 * asked for is thirty seconds of confirmation, which is also the first time this product has ever
 * asked somebody what they want back.
 *
 * WHAT THIS IS NOT ALLOWED TO DO. Invent a subject the brief does not ask about. A field nobody
 * asked for becomes a question a hundred people are made to answer and a column in a report nobody
 * ordered. The brief's own words, or nothing.
 */

/**
 * The shapes an answer can take and still be comparable across a hundred people.
 *
 * Deliberately short. Every one of these can be counted, ranked or cross-cut without a model in the
 * loop, which is the point: once the fields are filled, the findings are arithmetic, and arithmetic
 * cannot be vague or write in parables.
 */
export type FieldShape =
  /* A named place: a state, a market, a corridor. Counted by how many people named it. */
  | 'PLACE'
  /* A named thing traded, grown, made or sold. */
  | 'THING'
  /* A number with its unit and its period: 2,000 tonnes a quarter. */
  | 'QUANTITY'
  /* A kind of person or organisation they need, or a named one. */
  | 'ACTOR'
  /* How many times, how many people, how many of something. */
  | 'COUNT'
  /* By when. */
  | 'DATE'
  /* An amount of money, with its currency. */
  | 'MONEY'
  /* One of a few named states of affairs - the only way a described process becomes countable. */
  | 'CHOICE';

export const EVERY_SHAPE: FieldShape[] = ['PLACE', 'THING', 'QUANTITY', 'ACTOR', 'COUNT', 'DATE', 'MONEY', 'CHOICE'];

export interface AField {
  /** Short, stable, kebab-case. It is a column name and it appears in every report over this brief. */
  id: string;
  /** How the product asks for it, in plain words, in the lead's own vocabulary. */
  asks: string;
  shape: FieldShape;
  /** CHOICE only: the few states of affairs, written so that somebody can be counted into one. */
  oneOf?: string[];
  /** One clause: what having this from everybody lets the reader do. Goes in the report's margin. */
  matters: string;
  /** Null for everybody. Otherwise the kind of respondent it applies to, in the brief's own words. */
  askedOf?: string | null;
  /** False where the brief itself treats it as conditional. A person may always say they cannot answer. */
  required: boolean;
}

/** Fewer than this and there is nothing to compare; more and nobody finishes. */
export const THE_FEWEST_WORTH_HAVING = 3;
export const THE_MOST_ANYBODY_WILL_FILL = 12;

/* ------------------------------------------------------------------------------------------------
 * READING IT OUT OF THE BRIEF
 * ---------------------------------------------------------------------------------------------- */

export const READ_THE_FRAME = [
  'You are given a brief written by the person who called a check-in. Between five and two hundred people will answer it, separately, and the answers have to end up comparable: countable, rankable, and able to be cut by kind of organisation.',
  '',
  'Return the FIELDS that every answer must hold for that to be possible.',
  '',
  'A FIELD IS NOT A TOPIC. This is the whole task, so be strict about it:',
  '  "how they think about expansion"        is a topic. Two people answer it and nothing lines up.',
  '  "the states they want to expand into"   is a field. Everybody names places; the places can be counted.',
  'If two answers to your field could not be put in the same column of a table, it is not a field yet. Make it narrower until they could.',
  '',
  'THE SHAPES, and every field must be exactly one of them:',
  '  PLACE     a named place - a state, a market, a corridor',
  '  THING     a named thing traded, grown, made or sold',
  '  QUANTITY  a number with its unit and its period: 2,000 tonnes a quarter',
  '  ACTOR     a kind of person or organisation they need, or a named one',
  '  COUNT     how many times, how many people, how many of something',
  '  DATE      by when',
  '  MONEY     an amount, with its currency',
  '  CHOICE    one of a few named states of affairs, which you must list',
  '',
  'WHERE THE BRIEF ASKS ABOUT A PROCESS, THE FIELD IS THE COMPARABLE PART OF IT. "How do you vet the people you buy from" is a topic; a hundred descriptions of a process compare to nothing. Make it a CHOICE and write the options so that somebody can be counted into exactly one of them - for instance nothing at all / we go on who vouches for them / we check something ourselves / a written process we follow every time. The count that matters is how many are in the first option, and today that count is thrown away.',
  '',
  'HOW MANY. Between three and twelve, and fewer is better. Every field must be answerable in a sentence or two by somebody with no preparation and no documents in front of them. If the brief asks for more than twelve comparable things, keep the ones the brief spends the most words on and leave the rest - the conversation can still ask about anything; these are only the things it must not finish without.',
  '',
  'NEVER INVENT ONE. Only what this brief asks about. A field nobody asked for becomes a question a hundred people are made to answer and a column in a report nobody ordered.',
  '',
  'WHERE THE BRIEF SINGLES OUT A KIND OF RESPONDENT - "for those working in research and development" - put that phrase in `askedOf`, in the brief\'s own words, and leave `askedOf` empty for everything asked of everybody.',
  '',
  'FOR EACH FIELD:',
  '  id        short, kebab-case, stable. It is a column name.',
  '  asks      how to put it to somebody, in plain words, using the brief\'s own vocabulary. A question, short, no preamble.',
  '  shape     one of the eight above',
  '  oneOf     CHOICE only: the few options, each one a plain phrase somebody would recognise as their own situation',
  '  matters   one clause on what having this from everybody lets the reader do. Not why it is interesting - what it lets them decide.',
  '  askedOf   the kind of respondent, where the brief names one. Otherwise empty.',
  '  required  false only where the brief itself treats it as conditional',
].join('\n');

export const READ_THE_FRAME_SCHEMA = {
  name: 'what_a_complete_answer_holds',
  description: 'The comparable fields every answer to this brief must hold.',
  input_schema: {
    type: 'object',
    properties: {
      fields: {
        type: 'array',
        description: 'Three to twelve fields, in the order the brief raises them.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Short, kebab-case, stable. A column name.' },
            asks: { type: 'string', description: 'How to ask for it, plainly, in the brief\'s own words.' },
            shape: { type: 'string', enum: EVERY_SHAPE as unknown as string[] },
            oneOf: {
              type: 'array',
              description: 'CHOICE only: the few options, each a plain phrase somebody would recognise as their own situation.',
              items: { type: 'string' },
            },
            matters: { type: 'string', description: 'One clause: what this from everybody lets the reader decide.' },
            askedOf: { type: 'string', description: 'The kind of respondent, where the brief names one. Otherwise omit.' },
            required: { type: 'boolean' },
          },
          required: ['id', 'asks', 'shape', 'matters'],
        },
      },
    },
    required: ['fields'],
  },
} as const;

/* ------------------------------------------------------------------------------------------------
 * AND WHAT IS KEPT OF WHAT COMES BACK
 * ---------------------------------------------------------------------------------------------- */

const kebab = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/**
 * THE FRAME, VALIDATED, OR NOTHING.
 *
 * A CHOICE WITH NO OPTIONS IS DROPPED, and it is the only kind of field that is. Every other shape
 * carries its own comparability - a place is a place. A CHOICE is comparable only because somebody
 * wrote the few states of affairs down, and without them it is a topic wearing a field's clothes:
 * it would be asked of a hundred people and then counted into nothing. Keeping it would put back
 * exactly the fault this module exists to remove, so it goes, and it is logged where it goes.
 */
export function theFrameFrom(raw: unknown, note?: (why: string) => void): AField[] {
  const rows = Array.isArray((raw as any)?.fields) ? ((raw as any).fields as any[]) : [];
  const held: AField[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const id = kebab(String(r?.id ?? ''));
    const asks = String(r?.asks ?? '').trim();
    const shape = String(r?.shape ?? '').trim().toUpperCase() as FieldShape;
    const matters = String(r?.matters ?? '').trim();
    if (!id || !asks || !EVERY_SHAPE.includes(shape)) {
      note?.(`a field arrived with no id, no question or an unknown shape: ${JSON.stringify(r).slice(0, 120)}`);
      continue;
    }
    if (seen.has(id)) { note?.(`two fields called ${id}; kept the first`); continue; }
    const oneOf = Array.isArray(r?.oneOf) ? r.oneOf.map((o: any) => String(o ?? '').trim()).filter(Boolean) : [];
    if (shape === 'CHOICE' && oneOf.length < 2) {
      note?.(`${id} is a choice with no options to count people into; dropped`);
      continue;
    }
    seen.add(id);
    held.push({
      id, asks, shape, matters: matters || asks,
      ...(shape === 'CHOICE' ? { oneOf } : {}),
      askedOf: String(r?.askedOf ?? '').trim() || null,
      required: r?.required !== false,
    });
    if (held.length >= THE_MOST_ANYBODY_WILL_FILL) break;
  }
  /* Two fields is not a frame; it is a pair of questions, and the conversation already asks those. */
  return held.length >= THE_FEWEST_WORTH_HAVING ? held : [];
}

/**
 * THE FRAME AS SOMEBODY READS IT: for the lead to confirm, and for the report's own headings.
 *
 * The same words in both places on purpose. The lead confirms "the volumes and period you need" and
 * that is the heading the report puts the counts under, so what they agreed to is what they get.
 */
export function theFrameAsShown(frame: AField[]): string {
  if (!frame.length) return '';
  return frame.map((f, i) => {
    const who = f.askedOf ? ` (asked of ${f.askedOf})` : '';
    const opts = f.oneOf?.length ? `\n     one of: ${f.oneOf.join(' · ')}` : '';
    return `${i + 1}. ${f.asks}${who}\n     so you can: ${f.matters}${opts}`;
  }).join('\n');
}
