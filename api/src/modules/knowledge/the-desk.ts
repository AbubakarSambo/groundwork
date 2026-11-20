import { createHash } from 'crypto';
import { documentKeyOf } from './a-document-is-not-a-card';

/**
 * THE DESK'S DOCUMENTS (S7, 20 November 2026): the organisation's policies, handbook, procedures and documents, each with
 * the short summary written when it was added.
 *
 * ONE OWNER FOR EACH THING. The words are the knowledge cards (one document is the cards under its key, split by
 * `chunk`), so Ask, the check-ins and the Desk all read the same words. The summary, the title and who added it are the
 * `desk_documents` row, written by `KnowledgeService.ingestDocument` and nowhere else.
 */

/** What is in a document, said by the model before anything else, and kept with it as its summary. */
export const WHAT_IS_IN_IT_PROMPT = 'Say in two or three short, plain sentences what this document holds: what it is, and the facts in it that matter. No introduction, no headings, no lists, no advice. Use "you" for the reader if you need to, never "the user".';

/** How much of a document the summary is written from. The opening of a long handbook says what it is. */
export const MOST_CHARS_SUMMARISED = 6_000;

/** The longest summary kept. Two or three sentences fit well inside it. */
export const MOST_CHARS_IN_A_SUMMARY = 600;

/** Who may add a document to the Desk: an admin, or a lead (a manager). Checked on the server on every way in. */
export function mayAddToTheDesk(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'LEAD';
}

/** The key a document added on the Desk or through Ask is kept under: the same title again replaces the earlier version. */
export function aDeskKeyFor(title: string): string {
  const slug = (title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return `desk:${slug || 'document'}`;
}

/** The words a summary was written from, so the same words sent again are not summarised again. */
export function aHashOf(text: string): string {
  return createHash('sha256').update((text ?? '').trim()).digest('hex');
}

/** A summary as it is kept: one paragraph, no longer than two or three sentences need. */
export function aSummaryAsKept(said: string | null | undefined): string | null {
  const s = String(said ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, MOST_CHARS_IN_A_SUMMARY) : null;
}

type Titled = { key: string; title: string };
type Card = Titled & { body: string };
type Row = { key: string; title: string; summary: string | null; addedByUserId: string | null; createdAt: Date; updatedAt: Date };

export interface ADeskDocument {
  key: string;
  title: string;
  summary: string | null;
  addedByUserId: string | null;
  addedOn: Date | null;
}

/** The document a card belongs to: its key before the `#`, or the card's own key when it was put whole. */
export function theDocumentOf(cardKey: string): string {
  return documentKeyOf(cardKey) ?? cardKey;
}

/** A card's place in its document, for reading the parts back in order. */
function placeOf(cardKey: string): number {
  const at = cardKey.lastIndexOf('#');
  const n = at > 0 ? Number(cardKey.slice(at + 1)) : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * A document's title where no row was kept for it (a card written before the Desk kept rows): the title of a part that
 * has no section after it, or the first part's title before its section.
 */
function aTitleFromItsCards(cards: Titled[]): string {
  const whole = cards.find((c) => !c.title.includes(' - '));
  if (whole) return whole.title;
  const first = [...cards].sort((a, b) => placeOf(a.key) - placeOf(b.key))[0];
  return first.title.split(' - ')[0].trim() || first.title;
}

/** Every document on the Desk, newest first: each kept row, and any document whose cards came before the rows did. */
export function theDocumentsOnTheDesk(cards: Titled[], rows: Row[]): ADeskDocument[] {
  const byDocument = new Map<string, Titled[]>();
  for (const c of cards) {
    const k = theDocumentOf(c.key);
    byDocument.set(k, [...(byDocument.get(k) ?? []), c]);
  }
  const kept = new Map(rows.map((r) => [r.key, r]));
  const out: ADeskDocument[] = [];
  for (const [key, its] of byDocument) {
    const r = kept.get(key);
    out.push({
      key,
      title: r?.title ?? aTitleFromItsCards(its),
      summary: r?.summary ?? null,
      addedByUserId: r?.addedByUserId ?? null,
      addedOn: r?.updatedAt ?? null,
    });
  }
  return out.sort((a, b) => (b.addedOn?.getTime() ?? 0) - (a.addedOn?.getTime() ?? 0) || a.title.localeCompare(b.title));
}

/** A document's words in full, read back from its cards in order, each section's heading on its own line. */
export function aDocumentInFull(title: string, cards: Card[]): string {
  const parts = [...cards].sort((a, b) => placeOf(a.key) - placeOf(b.key));
  const out: string[] = [];
  let heading: string | null = null;
  for (const c of parts) {
    const h = c.title.startsWith(`${title} - `) ? c.title.slice(title.length + 3).trim() : null;
    if (h && h !== heading) out.push(h);
    heading = h ?? heading;
    out.push(c.body.trim());
  }
  return out.join('\n\n');
}

/** Read from the database: the cards and kept rows of one organisation. Only that organisation's. */
export async function readTheDesk(prisma: any, organizationId: string): Promise<ADeskDocument[]> {
  const [cards, rows] = await Promise.all([
    /* Titles only: the list never needs a document's words, and the check-ins read this on every turn. */
    prisma.knowledgeCard.findMany({ where: { organizationId, effectiveTo: null }, select: { key: true, title: true } }),
    Promise.resolve(prisma.deskDocument?.findMany?.({ where: { organizationId } })).then((r: any) => r ?? []).catch(() => []),
  ]);
  return theDocumentsOnTheDesk(cards ?? [], rows ?? []);
}

/** One document of one organisation, in full, or null when there is no such document there. */
export async function readOneDocument(prisma: any, organizationId: string, key: string): Promise<{ key: string; title: string; summary: string | null; text: string } | null> {
  const cards: Card[] = await prisma.knowledgeCard.findMany({
    where: { organizationId, effectiveTo: null, OR: [{ key }, { key: { startsWith: `${key}#` } }] },
    select: { key: true, title: true, body: true },
  });
  const its = (cards ?? []).filter((c) => theDocumentOf(c.key) === key);
  if (!its.length) return null;
  const row = await Promise.resolve(prisma.deskDocument?.findUnique?.({ where: { organizationId_key: { organizationId, key } } })).catch(() => null);
  const title = row?.title ?? aTitleFromItsCards(its);
  return { key, title, summary: row?.summary ?? null, text: aDocumentInFull(title, its) };
}

/**
 * ASK ANSWERS A COMPANY QUESTION FROM THE DESK (round 2, T4, 20 November 2026). Found in the browser: Wairimu added the
 * leave policy and asked "how many sick days do we get"; Ask looked only in her check-ins. Grace asked the same and was
 * given the whole document pasted under "msingi-leave-policy". Now anybody in the organisation is answered from the
 * Desk's passages in a plain sentence or two that names the document by its title: "You get 10 paid sick days a year.
 * This is from the leave policy." Everyone in the organisation may read the Desk, so nothing more is filtered here; a
 * guest never reaches this (ask.service.ts answers guests on its own).
 */
export const ANSWER_FROM_THE_DESK_PROMPT = [
  'Answer the question from these passages of the organisation\'s own documents, and from nothing else.',
  'Write one or two short, plain sentences to the person asking, as "you". Then say which document it is from, by its title, as a sentence, for example "This is from the leave policy." Use the title in ordinary words, not a file name.',
  'No introduction, no lists, no headings, no quotation marks, no advice.',
  'If the passages do not answer the question, reply with exactly NOTHING.',
].join(' ');

/** "Msingi leave policy", from "msingi-leave-policy.pdf": the readable title a file is given when no title is typed. */
export function aReadableTitle(fileName: string): string {
  const t = (fileName ?? '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? `${t[0].toUpperCase()}${t.slice(1)}` : 'The document';
}

type Retrieved = { key: string; title: string; body: string };

/** The passages, each with its document's title as the Desk keeps it, for the model to answer from. */
export function thePassagesWithTheirTitles(cards: Retrieved[], titles: Map<string, string>): string {
  return cards.map((c) => {
    const doc = theDocumentOf(c.key);
    const title = titles.get(doc) ?? c.title.split(' - ')[0];
    return `Document: ${aReadableTitle(title)}\n${c.body.trim()}`;
  }).join('\n\n');
}

export async function answerFromTheDesk(
  deps: { prisma: any; engine: { respond: (system: string, history: { role: 'user' | 'assistant'; content: string }[]) => Promise<string> }; knowledge: { retrieve: (org: string, who: string, q: string) => Promise<{ cards: any[] }> } },
  input: { organizationId: string; who: string; question: string },
): Promise<string | null> {
  const { cards } = await deps.knowledge.retrieve(input.organizationId, input.who, input.question).catch(() => ({ cards: [] as any[] }));
  if (!cards.length) return null;
  const keys = [...new Set((cards as Retrieved[]).map((c) => theDocumentOf(c.key)))];
  const rows: { key: string; title: string }[] = (await Promise.resolve(deps.prisma.deskDocument?.findMany?.({ where: { organizationId: input.organizationId, key: { in: keys } }, select: { key: true, title: true } })).catch(() => [])) ?? [];
  const titles = new Map(rows.map((r) => [r.key, r.title]));
  const said = await deps.engine.respond(ANSWER_FROM_THE_DESK_PROMPT, [
    { role: 'user', content: `${thePassagesWithTheirTitles(cards as Retrieved[], titles)}\n\nQuestion: ${input.question}` },
  ]).catch(() => '');
  const answer = String(said ?? '').replace(/\s+/g, ' ').trim();
  return answer && !/^NOTHING\.?$/i.test(answer) ? answer : null;
}
