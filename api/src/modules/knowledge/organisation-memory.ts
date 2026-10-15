import { askNameOf } from '../assistant/ask-name';
import type { PrismaService } from '../prisma/prisma.service';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { iHaveKept, shallIKeep, sourceLineOn, NOTHING_WAITING, type Keepable } from './what-the-organisation-keeps';

const sameWords = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() === b.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * ORGANISATION MEMORY THAT A LEAD CONFIRMED (week 20). The rules are in what-the-organisation-keeps.ts;
 * this is the part that touches the database.
 *
 * WHERE IT SITS. Beside the knowledge cards ("how we do it here", KnowledgeService), which the
 * assistant's `how_we_work` lane and the check-in's process block already read, and which it does
 * not replace. A card is what the company wrote down and a person's account is held up against it;
 * this is what a lead said in setup, confirmed, and it is only ever context. Putting it among the
 * cards would have made every rule the lead mentioned something a participant's account is
 * compared with, in front of them, as "what the written process says".
 *
 * A ROW IS OFFERED UNTIL THE LEAD SAYS YES. Offered rows are never read by anything that serves or
 * prompts; a no deletes the row, so a declined sentence is not kept anywhere.
 */

export const MOST_KEPT_IN_A_PROMPT = 12;

export interface KeptItem { id: string; kind: string; text: string; sourceLine: string; keptAt: Date | null }

/** Asks the lead. Writes only the offer, never the memory. */
export async function offerToKeep(
  prisma: PrismaService,
  input: { organizationId: string; groundId: string; userId: string; item: Keepable; now?: Date },
): Promise<{ offerId: string; say: string }> {
  /* Only ever one question waiting per lead and check-in: the newest replaces the older one. */
  await prisma.organizationMemory.deleteMany({
    where: { organizationId: input.organizationId, groundId: input.groundId, offeredById: input.userId, status: 'OFFERED' },
  });
  const row = await prisma.organizationMemory.create({
    data: {
      organizationId: input.organizationId, groundId: input.groundId, offeredById: input.userId,
      kind: input.item.kind, text: input.item.text,
      sourceLine: sourceLineOn(whenItWas(input.now ?? new Date(), 'dayAndMonthLong')),
    },
    select: { id: true },
  });
  return { offerId: row.id, say: shallIKeep(input.item, await askNameOf(prisma, input.organizationId)) };
}

/**
 * WHETHER THIS RULE HAS BEEN OFFERED BEFORE (decision 75, item 29): offered once per rule, and never
 * again once the lead said no. Read from what already exists, so a no still keeps nothing new:
 *   - an offer still waiting, or the words already kept for the organisation;
 *   - the question itself earlier in this conversation (the old route's history holds every turn);
 *   - a no to it through Ask Groundwork, which keeps its own record of every proposal and its answer.
 */
export async function offeredBefore(
  prisma: PrismaService,
  input: { organizationId: string; item: Keepable; history?: { role: string; content: string }[] },
): Promise<boolean> {
  const asked = shallIKeep(input.item, await askNameOf(prisma, input.organizationId));
  if ((input.history ?? []).some((h) => h.role === 'assistant' && (h.content ?? '').includes(asked))) return true;
  const rows = ((await (prisma.organizationMemory.findMany({
    where: { organizationId: input.organizationId, kind: input.item.kind, status: { in: ['OFFERED', 'KEPT'] } } as any,
    select: { text: true },
  }) as Promise<{ text: string }[]>).catch(() => [])) ?? []) as { text: string }[];
  if (rows.some((r) => sameWords(r.text ?? '', input.item.text))) return true;
  const saidNo = await ((prisma as any).assistantProposal?.findFirst?.({
    where: { organizationId: input.organizationId, kind: 'context', state: 'DECLINED', summary: asked },
    select: { id: true },
  }) ?? Promise.resolve(null)).catch(() => null);
  return !!saidNo;
}

/** The lead's yes. The caller has already checked the lead may confirm setup on the check-in. */
export async function keepWhatWasOffered(
  prisma: PrismaService,
  input: { organizationId: string; groundId: string; offerId: string; userId: string; now?: Date },
): Promise<{ kept: boolean; say: string }> {
  const row = await prisma.organizationMemory.findFirst({
    where: { id: input.offerId, organizationId: input.organizationId, groundId: input.groundId, status: 'OFFERED', offeredById: input.userId },
  });
  if (!row) return { kept: false, say: NOTHING_WAITING };
  /* The same words kept twice are one memory, not two. */
  const already = await prisma.organizationMemory.findFirst({
    where: { organizationId: input.organizationId, status: 'KEPT', kind: row.kind, text: row.text },
    select: { id: true },
  });
  if (already) {
    await prisma.organizationMemory.delete({ where: { id: row.id } });
    return { kept: true, say: iHaveKept(row, await askNameOf(prisma, input.organizationId)) };
  }
  await prisma.organizationMemory.update({
    where: { id: row.id },
    data: { status: 'KEPT', keptById: input.userId, keptAt: input.now ?? new Date() },
  });
  return { kept: true, say: iHaveKept(row, await askNameOf(prisma, input.organizationId)) };
}

/** The lead's no. The offer is deleted, so nothing of it is kept anywhere. */
export async function dropWhatWasOffered(prisma: PrismaService, input: { organizationId: string; offerId: string; userId: string }): Promise<void> {
  /* Only the person who was asked can answer the question. */
  await prisma.organizationMemory.deleteMany({ where: { id: input.offerId, organizationId: input.organizationId, status: 'OFFERED', offeredById: input.userId } });
}

/** Everything kept for the organisation, newest first. Never an offer that was not answered. */
export async function keptForTheOrganisation(prisma: PrismaService, organizationId: string, limit = 50): Promise<KeptItem[]> {
  const rows = await prisma.organizationMemory.findMany({
    where: { organizationId, status: 'KEPT' },
    orderBy: { keptAt: 'desc' },
    take: limit,
    select: { id: true, kind: true, text: true, sourceLine: true, keptAt: true },
  });
  return rows as KeptItem[];
}

/**
 * WHO MAY READ WHAT WAS KEPT: an admin, a lead, and anybody who runs a check-in here. A person who
 * only takes part in check-ins reads none of it, on the Company page or from Ask Groundwork. (Sessions
 * are given it as context to understand people with, never to show it.)
 */
export async function mayReadWhatIsKept(
  prisma: PrismaService,
  reader: { userId: string; organizationId: string; role: string | null | undefined },
): Promise<boolean> {
  if (reader.role === 'ADMIN' || reader.role === 'LEAD') return true;
  if (!reader.role || reader.role === 'GUEST') return false;
  const runs = await prisma.ground.findFirst({
    where: { organizationId: reader.organizationId, initiatorId: reader.userId },
    select: { id: true },
  });
  return !!runs;
}

/** The words that best match a question, for Ask Groundwork. A few, never the whole list. */
export function keptThatTouches(kept: KeptItem[], question: string, limit = 3): KeptItem[] {
  const words = (question ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4);
  if (!words.length) return [];
  return kept
    .map((k) => {
      const hay = ` ${k.text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
      const hits = new Set(words.filter((w) => hay.includes(` ${w}`) || hay.includes(` ${w.slice(0, Math.max(4, w.length - 3))}`)));
      return { k, score: hits.size };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.k);
}
