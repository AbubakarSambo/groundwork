/**
 * A QUESTION IS ANSWERED, FROM THE DOCUMENTS, TO THE PERSON WHO ASKED (pilots, 13 October 2026, problem 1).
 *
 * Njeri asked "When is the Kamau defence due?" and Grace asked "What's the price of 40 units?", and Ask offered
 * each question back as a line for everybody in the check-in: "Shall I add 'What's the price of 40 units?' to this
 * check-in's context as a note? Everybody in this check-in will read it." A question is not a line. It is asked of
 * Groundwork, and the answer is the asker's alone (questions to Ask Groundwork are private, always).
 *
 * WHAT IS READ. Only the documents this person may open, by the one rule every document read uses
 * (documentWhereFor): on the check-in they asked about, or on every check-in they are in when they asked from
 * Today or the Chat page.
 *
 * WHAT IS SAID. The model finds the answer; the product checks it. Every figure in the answer has to be in one of
 * those documents, written the same way, so a number and its unit reach the person exactly as the document wrote
 * them ("KES 12,400", "16%", "KES 466,450.00"). An answer that carries a figure no document holds is not said.
 */
import { documentWhereFor } from '../documents/who-can-see-a-document';

/** Whether a message asks something, rather than tells something. Read by its shape, never by a model. */
const STARTS_A_QUESTION = /^\s*(?:(?:and|so|but|also|please|ok|okay)[\s,]+)?(?:what|what's|whats|when|where|which|who|whom|whose|why|how|is|are|was|were|does|do|did|can|could|will|would|should|has|have|according to|tell me|do you know)\b/i;

export function isAQuestion(message: string): boolean {
  const m = String(message ?? '').trim();
  if (!m || m.length > 600) return false;
  /* "Ask Brian when he files" is a question for a person, and has its own door. */
  if (/^\s*ask\s+\w+/i.test(m)) return false;
  return /\?\s*$/.test(m) || STARTS_A_QUESTION.test(m);
}

export const ANSWER_FROM_THE_DOCUMENTS_PROMPT = `You answer one question for one person, using only the documents given below.

Rules:
- Answer only from the documents. If they do not say, set found to false and leave answer empty.
- Copy every number exactly as the document writes it, with its currency, unit or percent sign: write "KES 12,400", never "12400" or "12,400 shillings".
- Where the answer needs a sum the document does not state, show it from the document's own figures, for example "40 units are in the 30 to 99 band, at KES 12,400 a unit, so 40 units cost KES 496,000."
- Say which document the answer comes from, by its file name.
- Write plain, full sentences that a person with basic English understands. Speak to the person as "you". No lists, no headings, no colons joining pieces.
- At most three sentences.`;

const ANSWER_SCHEMA = {
  name: 'answer_from_the_documents',
  description: 'The answer to the question, from the documents only.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'True only when the documents answer the question.' },
      answer: { type: 'string', description: 'The answer in plain full sentences, with every figure exactly as written in the document.' },
    },
    required: ['found', 'answer'],
  },
};

export const NOT_IN_THE_DOCUMENTS = 'I could not find the answer to that in the documents you can open. If it is in a file that is not here yet, add it with Choose a file and ask me again.';
export const NO_DOCUMENTS_TO_READ = 'There are no documents here that you can open yet, so I cannot answer that from them. Add one with Choose a file and ask me again.';

const MOST_WE_READ_FROM_ONE = 12_000;
const MOST_WE_READ_IN_ALL = 40_000;

/* The figures in a text as digits, so "KES 496,000" and "496,000" are the same figure and "16%" is 16. */
const figuresIn = (t: string): string[] => (String(t ?? '').match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((d) => d.replace(/,/g, '').replace(/\.0+$/, ''));

/** True when every figure in the answer appears in at least one of the documents. */
export function everyFigureIsInTheDocuments(answer: string, documents: { content: string }[]): boolean {
  const held = new Set(documents.flatMap((d) => figuresIn(d.content)));
  return figuresIn(answer).every((f) => held.has(f));
}

export interface ADocumentToAnswerFrom { fileName: string; content: string }

/** The documents this person may open: on the named check-in, or on every check-in they are in. */
export async function theDocumentsTheyMayOpen(
  prisma: any,
  input: { organizationId: string; userId: string; groundId?: string | null; contextEnabled?: boolean },
): Promise<ADocumentToAnswerFrom[]> {
  const contextEnabled = input.contextEnabled ?? process.env.CONTEXT_ENABLED !== 'false';
  const grounds = ((await prisma.ground?.findMany?.({
    where: {
      organizationId: input.organizationId,
      ...(input.groundId ? { id: input.groundId } : {}),
      OR: [{ initiatorId: input.userId }, { participants: { some: { userId: input.userId } } }],
    },
    select: { id: true, initiatorId: true, participants: { where: { userId: input.userId }, select: { id: true } } },
  }).catch?.(() => [])) ?? []) as { id: string; initiatorId: string | null; participants: { id: string }[] }[];
  const out: ADocumentToAnswerFrom[] = [];
  for (const g of grounds) {
    const reader = { participantId: g.participants[0]?.id ?? null, isLead: g.initiatorId === input.userId };
    const docs = ((await prisma.groundDocument?.findMany?.({
      where: documentWhereFor(g.id, reader, contextEnabled),
      orderBy: { createdAt: 'desc' },
      select: { fileName: true, content: true, isConversation: true },
    }).catch?.(() => [])) ?? []) as { fileName: string; content: string | null; isConversation?: boolean }[];
    for (const d of docs) {
      if (d.isConversation || !(d.content ?? '').trim()) continue;
      out.push({ fileName: d.fileName, content: String(d.content).slice(0, MOST_WE_READ_FROM_ONE) });
    }
  }
  return out;
}

/** The answer to say, or the sentence that says it is not in the documents. Never offered as a line. */
export async function answerFromTheDocuments(
  deps: { prisma: any; engine: { extract: (system: string, history: any[], tool: any) => Promise<any> } },
  input: { organizationId: string; userId: string; groundId?: string | null; question: string },
): Promise<string> {
  const documents = await theDocumentsTheyMayOpen(deps.prisma, input);
  if (!documents.length) return NO_DOCUMENTS_TO_READ;
  let room = MOST_WE_READ_IN_ALL;
  const given: ADocumentToAnswerFrom[] = [];
  for (const d of documents) {
    if (room <= 0) break;
    given.push({ fileName: d.fileName, content: d.content.slice(0, room) });
    room -= d.content.length;
  }
  const read = await deps.engine.extract(
    ANSWER_FROM_THE_DOCUMENTS_PROMPT,
    [{ role: 'user', content: `${given.map((d) => `DOCUMENT "${d.fileName}":\n${d.content}`).join('\n\n')}\n\nQUESTION: ${input.question.trim()}` }],
    ANSWER_SCHEMA,
  ).catch(() => null);
  const answer = String(read?.answer ?? '').replace(/\s+/g, ' ').trim();
  if (!read?.found || !answer) return NOT_IN_THE_DOCUMENTS;
  /* A figure no document holds is not said: the person would take it as the document's. */
  if (!everyFigureIsInTheDocumentsOrSums(answer, given, input.question)) return NOT_IN_THE_DOCUMENTS;
  return answer;
}

/**
 * A SUM SHOWN FROM THE DOCUMENT'S OWN FIGURES IS ALLOWED: "40 units at KES 12,400 a unit is KES 496,000". A figure
 * the documents do not hold passes only where it is the product or sum of two figures that they do, or of one of
 * them and a number the person asked about.
 */
export function everyFigureIsInTheDocumentsOrSums(answer: string, documents: { content: string }[], question = ''): boolean {
  const held = new Set(documents.flatMap((d) => figuresIn(d.content)));
  const asked = figuresIn(question);
  const heldOrAsked = [...new Set([...held, ...asked])].map(Number).filter((n) => Number.isFinite(n) && n !== 0 && n !== 1);
  return figuresIn(answer).every((f) => {
    if (held.has(f) || asked.includes(f)) return true;
    const v = Number(f);
    /* Small counts in the answer ("40 units", "30 to 99") are read with the question and the bands. */
    if (v < 10) return true;
    return heldOrAsked.some((a) => heldOrAsked.some((b) => Math.abs(a * b - v) < 0.5 || Math.abs(a + b - v) < 0.5));
  });
}
