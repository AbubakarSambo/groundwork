import { theRelease1bTabsAreOn } from '../grounds/release-1b-tabs';
import { readsAsAPayment, readsAsASignedOrder } from '../board/a-deals-four-criteria';
import { theWordsNameTheDeal } from '../board/a-deals-proof-is-about-that-deal';
import { aLineNamesTheCustomer } from '../board/one-deal-per-customer';
import { KINDS_THAT_ARE_NOT_WORK } from '../board/the-kind-of-work';
import { weCouldNotReadIt } from './a-document-we-could-not-read-is-not-a-source';
import { aCollectionsCheckInWithRelease2 } from '../grounds/release-2-collections';
import { BILL, LOAN_OWED, F, aBillIsNamed } from '../board/the-collections-record';

/**
 * PROOF ADDED IN A CHECK-IN IS FILED ON ITS ITEM (Release 1B, pull request 2 of 3; Hafsah, 18 October 2026: "Proof added in a
 * check-in is read, filed on its item as evidence, and shown on the board beside that item"; references-upload-in-check-in.txt).
 *
 * WHEN. Once, as a document someone added in their check-in arrives (on the web, or sent on WhatsApp), after the existing
 * reading of it has taken its words out (`DocumentsService.upload`; a photo is read into words there). Only while the
 * organisation's Release 1B switch is on. A document added anywhere else (References and resources, a plan, Ask) is a
 * document, not evidence, and is never filed here. Never on opening a page.
 *
 * WHAT IT DECIDES, FROM THE DOCUMENT'S OWN WORDS, WITH NO MODEL CALL:
 *  - what it is: a signed order, a payment, a quote (the board's own rules, a-deals-four-criteria.ts), else a photo or a
 *    document;
 *  - whether it counts as proof: an order, a payment or a quote does; a photo of a visit, or a document with none of those in
 *    it, does not ("a visit photo isn't proof of a sale");
 *  - which item it belongs to: the one item of this check-in its words name (a deal by its customer or the person there, the
 *    same rule as the board's proof, a-deals-proof-is-about-that-deal.ts), the person's own first. Where the document names
 *    none, the person's last words in their check-in, said in the last fifteen minutes, are read the same way. Where two
 *    items are named, or none, it is kept as evidence on no item: never a guess.
 * The document keeps its own visibility. This row only says where it was filed, and the board and References and resources
 * read it from there.
 */

export type AReading = { readAs: 'A signed order' | 'A payment' | 'A quote' | 'A photo' | 'A document'; countsAsProof: boolean };

const A_QUOTE = /\bquot(?:e|ation|ed)\b|\bproforma\b|\bpro-forma\b/i;

export function whatTheProofIs(words: string, mimeType: string | null | undefined): AReading {
  if (readsAsASignedOrder(words)) return { readAs: 'A signed order', countsAsProof: true };
  if (readsAsAPayment(words)) return { readAs: 'A payment', countsAsProof: true };
  if (A_QUOTE.test(words)) return { readAs: 'A quote', countsAsProof: true };
  if (/^image\//i.test(String(mimeType ?? ''))) return { readAs: 'A photo', countsAsProof: false };
  return { readAs: 'A document', countsAsProof: false };
}

export interface AnItem { id: string; kind: string; name: string; ownerParticipantId?: string | null; fields?: Record<string, string> | null }

/** The one item these words name, the person's own first; null where none or more than one. */
export function theItemItNames(words: string, items: AnItem[], participantId: string | null): AnItem | null {
  /* A fee note or an invoice by its number, else its client (Release 2); a loan is the one loan of the person who added it. */
  const ownLoans = items.filter((i) => i.kind === LOAN_OWED && !!participantId && i.ownerParticipantId === participantId);
  if (ownLoans.length === 1) return ownLoans[0];
  const named = items.filter((i) => !KINDS_THAT_ARE_NOT_WORK.includes(i.kind) && i.kind !== LOAN_OWED && (String(i.name ?? '').trim().length >= 3 || i.kind === BILL)).filter((i) =>
    i.kind === 'deal' ? theWordsNameTheDeal(words, { name: i.name, fields: i.fields ?? null }) : i.kind === BILL ? aBillIsNamed(words, i) : aLineNamesTheCustomer(words, i.name));
  /* A bill named by its own number is the one: Njeri's slip reads "From: Kasarani Foods Ltd ... Reference: FN-004", which names FN-004 by its
     number and the client's row only by its name, and was filed on nothing (final real-model check, item 9). */
  const byNumber = named.filter((i) => i.kind === BILL && /\d/.test(String(i.fields?.[F.number] ?? i.name ?? '')) && aBillIsNamed(words, { name: /\d/.test(i.name) ? i.name : '', fields: { [F.number]: i.fields?.[F.number] ?? '' } }));
  if (byNumber.length === 1) return byNumber[0];
  const theirs = named.filter((i) => participantId && i.ownerParticipantId === participantId);
  if (theirs.length === 1) return theirs[0];
  if (theirs.length > 1) return null;
  return named.length === 1 ? named[0] : null;
}

/** One short line of what it shows, from its own words. */
export function whatItShows(content: string | null | undefined): string | null {
  if (weCouldNotReadIt(content)) return null;
  const t = String(content ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const first = (t.match(/^.{20,240}?[.!?](?=\s|$)/) ?? [t.slice(0, 200)])[0].trim();
  return first.length < t.length && !/[.!?]$/.test(first) ? `${first}...` : first;
}

export async function fileTheProofOnItsItem(
  prisma: any,
  doc: { id: string; groundId: string; participantId: string | null; fileName: string; mimeType: string; uploaderNote?: string | null; content: string },
  now: Date = new Date(),
): Promise<{ id: string; itemName: string | null } | null> {
  const ground = await prisma?.ground?.findUnique?.({ where: { id: doc.groundId }, select: { organizationId: true } }).catch(() => null);
  /* Or on a "Collect what's owed" check-in with Release 2 on, where a slip or a message is what makes a bill paid (Release 2). */
  if (!ground || !((await theRelease1bTabsAreOn(prisma, ground.organizationId)) || (await aCollectionsCheckInWithRelease2(prisma, doc.groundId)))) return null;
  const words = [doc.fileName, doc.uploaderNote, weCouldNotReadIt(doc.content) ? '' : doc.content].filter((x) => String(x ?? '').trim()).join(' ');
  const reading = whatTheProofIs(words, doc.mimeType);
  const items: AnItem[] = (await prisma.workItem?.findMany?.({
    where: { groundId: doc.groundId },
    select: { id: true, kind: true, name: true, ownerParticipantId: true, fields: true },
  }).catch(() => [])) ?? [];
  let item = theItemItNames(words, items, doc.participantId);
  if (!item && doc.participantId) {
    const said: any = await prisma.conversationTurn?.findFirst?.({
      where: { role: 'PERSON', createdAt: { gte: new Date(now.getTime() - 15 * 60000) }, checkIn: { groundId: doc.groundId, participantId: doc.participantId } },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    }).catch(() => null);
    if (said?.content) item = theItemItNames(String(said.content), items, doc.participantId);
  }
  const made = await prisma.itemEvidence.create({
    data: {
      groundId: doc.groundId,
      documentId: doc.id,
      participantId: doc.participantId,
      workItemId: item?.id ?? null,
      itemName: item?.name ?? null,
      readAs: reading.readAs,
      countsAsProof: reading.countsAsProof,
      shows: whatItShows(doc.content),
    },
    select: { id: true, itemName: true },
  });
  return made;
}

/**
 * PROOF SENT BEFORE ITS DEAL WAS ON RECORD IS FILED ON IT ONCE IT IS (polish round 1, 26 October 2026). Kevin sent the M-Pesa message
 * for Kilele Hotel's 40 units at 11:03, and the check-in put Kilele Hotel on the record at 11:06. The proof was filed on nothing, and
 * Grace's board read "0 of 120 sold" all week. After each check-in's records are kept, proof filed on no item is read again against
 * the items now on record, by the same rule: the one item its words name, the person's own first, never a guess.
 */
export async function fileProofThatWasFiledOnNothing(prisma: any, groundId: string): Promise<number> {
  const orphans: any[] = (await Promise.resolve(prisma.itemEvidence?.findMany?.({
    where: { groundId, workItemId: null, countsAsProof: true },
    select: { id: true, documentId: true, participantId: true },
  })).catch(() => [])) ?? [];
  if (!orphans.length) return 0;
  const items: AnItem[] = (await Promise.resolve(prisma.workItem?.findMany?.({
    where: { groundId },
    select: { id: true, kind: true, name: true, ownerParticipantId: true, fields: true },
  })).catch(() => [])) ?? [];
  let filed = 0;
  for (const o of orphans) {
    const doc: any = await Promise.resolve(prisma.groundDocument?.findUnique?.({ where: { id: o.documentId }, select: { fileName: true, uploaderNote: true, content: true } })).catch(() => null);
    if (!doc) continue;
    const words = [doc.fileName, doc.uploaderNote, weCouldNotReadIt(doc.content) ? '' : doc.content].filter((x) => String(x ?? '').trim()).join(' ');
    const item = theItemItNames(words, items, o.participantId ?? null);
    if (!item) continue;
    await prisma.itemEvidence.update({ where: { id: o.id }, data: { workItemId: item.id, itemName: item.name } }).catch(() => undefined);
    filed++;
  }
  return filed;
}
