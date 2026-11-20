import { createHash } from 'crypto';
import type { KindOfWork } from './the-kind-of-work';

/**
 * THE BOARD'S OWN READ (15 November 2026): the pieces each prototype board holds that only a written read of the record can give.
 *
 * The prototype's boards say things no count can: that a team talks about the matter as if it were proven when nothing shows it, that
 * the meaning of the aim changed between two levels, that a county is behind for a reason that may be its conditions and not its work,
 * that a group of people said they would pay. These are written by the model, from the record this reader is already served, and by no
 * rule. (CLAUDE.md, rule 4: understand, don't match.) What is fixed is only what makes it safe to show:
 *
 *  - THE RECORD IS THE ONLY SOURCE. The model is given the board as this reader is served it, after every wall, so a piece can never
 *    say more than the board already shows this reader. It is served to whoever runs the check-in, as the board's other sections
 *    that read the record to the lead are.
 *  - EVERY SENTENCE CARRIES ITS WORDS. Each sentence names the exact words of the record it rests on, and the code keeps a sentence only
 *    when every one of those words is in the record, word for word. A sentence that cannot show where it comes from is dropped, the way
 *    a report's line is checked against the record before it is shown.
 *  - HOW EACH IS KNOWN. A sentence that rests on a number a system sent or on a line a document backs says "Shown by ..."; one that
 *    rests only on what people said says "Said in the check-ins". The model does not choose this; the record the words came from does.
 *  - NOTHING WHEN THERE IS NOTHING. The model is told to leave a piece out when the record does not support it, and a piece with no
 *    surviving sentence is not drawn. The board says "Not said yet" or nothing, never a filler.
 *  - ONCE PER CHANGE OF THE RECORD. The read is kept, keyed by the record it was written from, so opening the board costs a lookup and
 *    the board changes only when something new comes in (the product's rule for boards and reports).
 */

export interface APiece {
  id: string;
  /** The heading the prototype gives it, in its own words. */
  heading: string;
  /** What the model is asked to write for it, in plain words. */
  ask: string;
  /** "one" is a short passage of one or two sentences; "list" is several lines, one for each thing the record names. */
  form: 'one' | 'list';
  /** Where the screen draws it: near the top, beside where it stands, or after the sections. */
  place: 'top' | 'end';
}

const SAID_ONLY = 'Say it only where the record supports it. Leave it out (an empty list) where it does not.';

export const THE_PIECES: Partial<Record<KindOfWork, APiece[]>> = {
  'a law firm matter': [
    { id: 'moreConfident', place: 'top', form: 'one', heading: 'More confident than the evidence allows', ask: `Where people talk about something as settled or proven but nothing on record shows it, say what they say and what is missing, in one or two sentences. ${SAID_ONLY}` },
    { id: 'mayChangeStrategy', place: 'top', form: 'one', heading: 'This may change the strategy', ask: `If somebody said something that, if it holds, would change what the team should argue or do, say what was said, who said it and what it would change, and say it has not been decided where nobody has decided. ${SAID_ONLY}` },
    { id: 'handover', place: 'end', form: 'one', heading: 'Handover', ask: `If somebody said they are leaving the matter or handing it over, say who hands over to whom and when, and what the person taking over still needs to be told. ${SAID_ONLY}` },
  ],
  'a government programme': [
    { id: 'meaningChanged', place: 'top', form: 'one', heading: 'Where the meaning changed', ask: `The aim is passed down through levels, such as the ministry, the counties and the officers. Where what one level said the aim means differs from what the level above said, name the two levels and what each said, in one or two sentences. ${SAID_ONLY}` },
    { id: 'performanceOrConditions', place: 'end', form: 'one', heading: 'Performance, or different conditions?', ask: `Where one county or group is behind or ahead of the others, say what people said that points to how the work was done, and what they said that points to different conditions such as roads, season, rules or market days, each as said. Do not decide which it is. ${SAID_ONLY}` },
    { id: 'ministryQuestions', place: 'end', form: 'list', heading: 'Questions for the ministry', ask: `Questions or problems that people in more than one county raised that only the ministry can answer, one line each, with how many counties raised it. ${SAID_ONLY}` },
  ],
  'asset loans': [
    { id: 'whyBehind', place: 'top', form: 'one', heading: 'Why people fall behind', ask: `The reason the traders themselves gave for being behind or stopped, and how many gave it, in one or two sentences, in their words. ${SAID_ONLY}` },
  ],
  'MarketView where next': [
    { id: 'whatEachGroupNeeds', place: 'top', form: 'list', heading: 'What each group said it needs', ask: `For each group of people as the lead described them, one line saying what they said they need and whether they said they would pay, with how many of the group said so. Use only counts that are in the record. ${SAID_ONLY}` },
  ],
  'MarketView Q4': [
    { id: 'saidAgainstSystems', place: 'top', form: 'list', heading: 'What people said, and what the systems show', ask: `For each thing people said that a number from a system or a document speaks to, one line saying what was said and what the system or document shows, and whether they match. Use only things where both are in the record. ${SAID_ONLY}` },
  ],
  "founder's own check-in": [
    { id: 'assumptions', place: 'top', form: 'list', heading: 'Assumptions, tested', ask: `Each assumption the founder said they are acting on, one line each, with the test they named and what the result is so far, as said, and "not tested yet" where no test was said. ${SAID_ONLY}` },
  ],
  'trader training programme': [
    { id: 'whereTheyStop', place: 'top', form: 'one', heading: 'Where people stop coming', ask: `At which check-in people stopped coming, in which county or group, and the reason the officers gave, in one or two sentences. ${SAID_ONLY}` },
  ],
};

export const THE_BOARDS_OWN_READ_SCHEMA = {
  name: 'emit_the_boards_own_read',
  description: 'Emit the pieces of the board that rest on the record, each sentence with the exact words of the record it rests on.',
  input_schema: {
    type: 'object',
    properties: {
      pieces: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The id of the piece asked for, exactly.' },
            sentences: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  says: { type: 'string', description: 'One plain, full sentence for the reader.' },
                  words: { type: 'array', items: { type: 'string' }, description: 'One to three phrases copied word for word from the record that this sentence rests on, each at least three words long.' },
                },
                required: ['says', 'words'],
              },
            },
          },
          required: ['id', 'sentences'],
        },
      },
    },
    required: ['pieces'],
  },
};

export function theReadPrompt(kind: KindOfWork): string {
  const pieces = THE_PIECES[kind] ?? [];
  return `You are writing parts of a board a lead reads about ${kind === 'MarketView Q4' ? 'a quarter’s numbers' : 'one check-in'}. You are given the record: what people said in their check-ins, the records and numbers on file, the open waits and decisions, and where people differ. Write the pieces asked for below, from the record and from nothing else.

Rules, which are not hints.
- Write plain, full sentences that a person with basic English understands. Use people’s first names as the record gives them and call the reader "you" where the record says "You". No clipped phrases, no arrows, no colons joining pieces, no work jargon.
- Say only what the record says. Never add a figure, a name, a date or a reason that is not in it. Never work out or round a number.
- What people said is said, not proven. Write "said", "says" or "told" for what people said. Say "is shown by" only for a number a system sent or a line a document backs.
- Never label a person, give a person a score, or say what should happen to a person. Say what happened, why, and what would change it.
- For every sentence, give one to three phrases copied word for word from the record that it rests on, each at least three words long. A sentence with no phrase from the record is not allowed.
- Where the record does not support a piece, give it no sentences. An empty piece is right. A sentence that fills a gap is wrong.

The pieces to write, by id.
${pieces.map((p) => `- ${p.id} (${p.form === 'list' ? 'one sentence for each thing the record names' : 'one or two sentences'}): ${p.ask}`).join('\n')}`;
}

/* ------------------------------------------------------------------------------------------------
 * THE RECORD THE MODEL IS GIVEN, AND HOW EACH LINE OF IT IS KNOWN
 * ---------------------------------------------------------------------------------------------- */

export interface ASegment { text: string; shown: boolean }

const asText = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim();
const normal = (s: string): string => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '').trim();

/**
 * THE RECORD FROM THE BOARD AS THIS READER IS SERVED IT. Only fields the board already serves to this reader are read here, so no
 * wall can be crossed. A line is "shown" where a system or a document stands behind it, and "said" where only a person does.
 */
export function theRecordFromTheBoard(board: Record<string, any>): ASegment[] {
  const out: ASegment[] = [];
  const add = (text: unknown, shown = false) => { const t = asText(text); if (t) out.push({ text: t, shown }); };
  for (const o of (board.objectives ?? []) as any[]) add(o.name);
  for (const row of (board.whoOwnsWhat ?? []) as any[]) {
    for (const it of (row.items ?? []) as any[]) add(`${row.name ?? 'A colleague'} said: ${asText(it.text)}`);
    for (const it of (row.items ?? []) as any[]) add(it.text, it.mark === 'proven');
  }
  for (const sec of (board.workRecords ?? []) as any[]) {
    for (const r of (sec.rows ?? []) as any[]) {
      const proven = r.mark === 'proven';
      add(r.name, proven);
      add(r.said, proven);
      for (const [label, value] of Object.entries(r.fields ?? {})) add(`${r.name}. ${label}: ${asText(value)}`, proven);
      for (const [, value] of Object.entries(r.fields ?? {})) add(value, proven);
      if (r.next) add(r.next);
      if (r.stage) add(`${r.name} is at ${r.stage}`, proven);
    }
  }
  for (const b of (board.blockers ?? []) as any[]) add(b.name);
  for (const d of (board.decisions ?? []) as any[]) { add(d.question); add(d.why); }
  for (const d of (board.divergence?.items ?? []) as any[]) add(typeof d === 'string' ? d : d?.says ?? d?.text ?? d?.topic);
  for (const t of (board.divergence?.stillOpen ?? []) as any[]) add(t);
  for (const n of (board.whatTheSystemsShow?.numbers ?? board.whatTheVisitLogShows?.numbers ?? []) as any[]) add(n.says, true);
  for (const r of (board.whereWhatWasSaidAndTheSystemsDiffer?.rows ?? []) as any[]) { add(r.said); add(r.documentSays, true); }
  for (const l of (board.whatChangedThisWeek?.lines ?? []) as any[]) add(l.text, l.mark === 'proven');
  for (const g of (board.byWhoTheyAre?.groups ?? []) as any[]) add(`${g.group}. ${g.says}`);
  for (const l of (board.whatEachLevelUnderstood?.levels ?? []) as any[]) { for (const s of (l.said ?? []) as any[]) add(`${l.who} said: ${asText(s)}`); for (const s of (l.said ?? []) as any[]) add(s); }
  for (const c of (board.theCounties?.counties ?? []) as any[]) { add(c.said); add(c.says); }
  return out;
}

/** The record as the one block of text the model reads. */
export const theRecordAsText = (segments: ASegment[]): string => [...new Set(segments.map((s) => s.text))].join('\n');

/** The key a read is kept under: the kind, the instructions and the record, so a changed record is a new read and an unchanged one is a lookup. */
export function theReadsKey(kind: KindOfWork, record: string): string {
  return `board-read:${createHash('sha256').update(`${kind}\u0000${theReadPrompt(kind)}\u0000${record}`).digest('hex')}`;
}

/* ------------------------------------------------------------------------------------------------
 * KEEPING ONLY WHAT THE RECORD HOLDS
 * ---------------------------------------------------------------------------------------------- */

export interface AServedSentence { says: string; how: 'said' | 'shown' }
export interface AServedPiece { id: string; heading: string; form: 'one' | 'list'; place: 'top' | 'end'; sentences: AServedSentence[] }
export interface TheBoardsOwnRead { pieces: AServedPiece[]; howKnown: string }

const THE_WORDS_ARE_THIS_LONG = 3;
const A_SENTENCE_IS_NO_LONGER_THAN = 420;

/**
 * THE QUOTE CHECK. A sentence is kept only when it gives words from the record and every one of them is in the record, word for word
 * (ignoring capitals, spacing, curly quotes and the stop at the end), and when it is a sentence a person can read. Whether it is
 * "shown" or "said" comes from the record line the words are in: shown only where all its words are in lines a system or document backs.
 */
export function onlyWhatTheRecordHolds(kind: KindOfWork, raw: unknown, segments: ASegment[]): AServedPiece[] {
  const asked = THE_PIECES[kind] ?? [];
  const pieces: any[] = Array.isArray((raw as any)?.pieces) ? (raw as any).pieces : [];
  const lines = segments.map((s) => ({ n: normal(s.text), shown: s.shown })).filter((l) => l.n);
  const kept: AServedPiece[] = [];
  for (const piece of asked) {
    const given = pieces.find((p) => p?.id === piece.id);
    const sentences: AServedSentence[] = [];
    for (const s of Array.isArray(given?.sentences) ? given.sentences : []) {
      const says = asText(s?.says);
      const words: string[] = (Array.isArray(s?.words) ? s.words : []).map((w: unknown) => normal(asText(w))).filter(Boolean);
      if (!says || says.length > A_SENTENCE_IS_NO_LONGER_THAN || !words.length) continue;
      if (words.some((w) => w.split(' ').length < THE_WORDS_ARE_THIS_LONG)) continue;
      const homes = words.map((w) => lines.filter((l) => l.n.includes(w)));
      if (homes.some((h) => !h.length)) continue;
      sentences.push({ says, how: homes.every((h) => h.some((l) => l.shown)) ? 'shown' : 'said' });
    }
    if (sentences.length) kept.push({ id: piece.id, heading: piece.heading, form: piece.form, place: piece.place, sentences: piece.form === 'one' ? sentences.slice(0, 2) : sentences.slice(0, 8) });
  }
  return kept;
}

export const HOW_THE_READ_IS_KNOWN = 'Written from what people said in their check-ins and from the records and numbers on file. Each sentence says whether a system or a document shows it, or whether it is only what people said.';

/* ------------------------------------------------------------------------------------------------
 * ASKING, ONCE PER CHANGE OF THE RECORD
 * ---------------------------------------------------------------------------------------------- */

const beingRead = new Map<string, Promise<AServedPiece[]>>();
const THE_MODEL_HAS_THIS_LONG_MS = 25000;

/**
 * THE BOARD'S OWN READ FOR THIS READER, or nothing. Read from the store where this record has been read before; otherwise the model is
 * asked once, its answer is checked against the record and the checked answer kept. Never throws: a model that fails, a store that
 * cannot be read, or a kind with no pieces leaves the board exactly as it was, with no piece drawn (best effort, like every wording pass).
 */
export async function theBoardsOwnReadFor(
  prisma: any,
  anthropic: { extract?: (system: string, history: { role: 'user' | 'assistant'; content: string }[], tool: any, options?: any) => Promise<any> } | null | undefined,
  kind: KindOfWork | null,
  board: Record<string, any>,
): Promise<TheBoardsOwnRead | null> {
  if (!kind || !(THE_PIECES[kind] ?? []).length) return null;
  const segments = theRecordFromTheBoard(board);
  /* Nothing has been said or sent yet, so there is nothing to read. */
  if (segments.length < 3) return null;
  const record = theRecordAsText(segments);
  const key = theReadsKey(kind, record);
  const finish = (pieces: AServedPiece[]): TheBoardsOwnRead | null => (pieces.length ? { pieces, howKnown: HOW_THE_READ_IS_KNOWN } : null);
  try {
    const kept = await prisma?.wordedLine?.findUnique?.({ where: { key }, select: { text: true } }).catch(() => null);
    if (kept?.text) {
      const parsed = JSON.parse(kept.text);
      /* A kept read is checked again against this record, as a wording is guarded on every read, cached or not. */
      return finish(onlyWhatTheRecordHolds(kind, parsed, segments));
    }
    if (!anthropic?.extract) return null;
    let asking = beingRead.get(key);
    if (!asking) {
      asking = (async () => {
        const answer = await Promise.race([
          anthropic.extract!(theReadPrompt(kind), [{ role: 'user', content: record }], THE_BOARDS_OWN_READ_SCHEMA, { temperature: 0 }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), THE_MODEL_HAS_THIS_LONG_MS)),
        ]);
        if (!answer) return [];
        const checked = onlyWhatTheRecordHolds(kind, answer, segments);
        /* What was asked is kept as the model gave it, so the next read checks it afresh; an empty read is kept too, so a record with nothing in it is not asked about again. */
        await prisma?.wordedLine?.upsert?.({ where: { key }, create: { key, text: JSON.stringify(answer) }, update: { text: JSON.stringify(answer) } })?.catch?.(() => undefined);
        return checked;
      })();
      beingRead.set(key, asking);
    }
    try { return finish(await asking); } finally { if (beingRead.get(key) === asking) beingRead.delete(key); }
  } catch {
    return null;
  }
}
