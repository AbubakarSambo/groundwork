/**
 * A CORRECTION IS KEPT ON THE ITEM IT CORRECTS: THE ONE OWNER OF CORRECTIONS MADE (F4, 3 November 2026).
 *
 * Every correction, wherever it is made, is a step in the history of the assessment item it is about: in a check-in (the assessment's
 * own `corrections`, kept by thePreviousWithItsCorrections), and in Ask, on a line the person was shown ("That's not right"). Each step
 * says when, where, who, what the item said before, what it says now, and whether it held up. Every page reads the item as it now says
 * (theFactsIn), so a correction that held up is right everywhere and never said again; one that did not hold up is kept as unproven and
 * changes nothing anybody reads. Counted from here and nowhere else (correctionsMade).
 */
import { theAssessmentIn, theColumnWith, THE_ITEM_SECTIONS, type AHistoryStep, type AnItem, type TheAssessment } from './the-assessment';

function theItem(a: TheAssessment, itemId: string): AnItem | null {
  for (const s of THE_ITEM_SECTIONS) for (const i of ((a as any)[s] ?? []) as AnItem[]) if (i.id === itemId) return i;
  for (const s of Object.keys((a as any).setup ?? {})) for (const i of (((a as any).setup[s] ?? []) as AnItem[])) if (i.id === itemId) return i;
  return null;
}

export async function keepTheCorrectionOnItsItem(
  prisma: any,
  c: { checkInId: string; itemId: string; nowSays: string; backed: boolean; by: string | null; on?: Date; where?: 'check-in' | 'ask' },
): Promise<boolean> {
  const row = await prisma.checkIn.findUnique({ where: { id: c.checkInId }, select: { sessionReport: true } }).catch(() => null);
  const a = theAssessmentIn(row?.sessionReport);
  if (!a) return false;
  const copy = JSON.parse(JSON.stringify(a)) as TheAssessment;
  const item = theItem(copy, c.itemId);
  if (!item || !c.nowSays.trim()) return false;
  const before = [...(item.history ?? [])].filter((h) => h.backed).pop()?.nowSays ?? item.words ?? '';
  const step: AHistoryStep = { on: (c.on ?? new Date()).toISOString(), inCheckInId: c.checkInId, said: String(before), nowSays: c.nowSays.trim(), backed: c.backed, by: c.by, where: c.where ?? 'ask' };
  item.history = [...(item.history ?? []), step];
  await prisma.checkIn.update({ where: { id: c.checkInId }, data: { sessionReport: { ...(row?.sessionReport as object), ...theColumnWith(copy, row?.sessionReport) } as any } });
  return true;
}

/**
 * A REPLY TO THE READ-BACK THAT CORRECTS A LINE IS PART OF THE CONVERSATION'S ASSESSMENT (batch 2, group 4): its message is numbered on,
 * and read as a correction of the item it names, so the assessment has read everything they said and the close keeps it, with the
 * correction on its item, rather than reading the conversation again. Pure.
 */
export function withTheReplyToTheReadBack(column: unknown, reply: { turnId: string; words: string; at: Date; itemId: string; nowSays: string; backed: boolean }): unknown {
  const a = theAssessmentIn(column);
  if (!a) return column;
  const n = Math.max(0, ...(a.messages ?? []).map((m) => m.n)) + 1;
  const correction: AnItem = {
    id: `readBack.${n}`, words: reply.words.trim(), from: [n], whoMaySee: 'the people in this check-in', saidWordForWord: true,
    shouldSay: reply.nowSays, backed: reply.backed, correctsItem: reply.itemId,
  };
  return { ...(column as object), messages: [...(a.messages ?? []), { n, turnId: reply.turnId, where: 'check-in', at: reply.at.toISOString() }], corrections: [...(a.corrections ?? []), correction] };
}

export interface ACorrectionMade { checkInId: string; itemId: string; on: string; where: 'check-in' | 'ask'; by: string | null; before: string; after: string; heldUp: boolean }

/** Every correction kept on the items of these assessments: who, which line, before, after, and whether it held up. */
export function correctionsMade(assessments: (TheAssessment | null)[]): ACorrectionMade[] {
  const out: ACorrectionMade[] = [];
  for (const a of assessments) {
    if (!a) continue;
    const items = [
      ...THE_ITEM_SECTIONS.flatMap((s) => ((a as any)[s] ?? []) as AnItem[]),
      ...Object.values((a as any).setup ?? {}).flatMap((v) => (Array.isArray(v) ? v : []) as AnItem[]),
    ];
    for (const i of items) for (const h of i.history ?? []) {
      out.push({ checkInId: a.about.checkInId, itemId: i.id, on: h.on, where: h.where ?? 'check-in', by: h.by ?? null, before: h.said, after: h.nowSays, heldUp: h.backed });
    }
  }
  return out;
}
