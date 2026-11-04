import { theReleaseOneSalesBoardIsOn } from './release-one-sales-board';
import { theStallRuleOnRecord } from './the-stall-rule';
import { notAnsweringSince, hasStalled, theContactOf, theNamesOnOurSide, thePeopleAtEachCustomer } from './a-deal-that-has-stalled';
import { theDealWasDropped } from './a-deal-that-was-dropped';
import { theSalesStages } from './a-sales-aim-is-counted-from-the-deals';
import { cleanText } from '../reports/what-the-record-actually-holds';

/**
 * THE DEALS AT THE STALL RULE, FOR THE LEAD'S MORNING SUMMARY (Drop Access run 1, item 15). The board already says a deal has stalled
 * when the customer has not answered for three working days (a-deal-that-has-stalled.ts); the summary's "Risks" part never read it, and
 * never appeared in ten days. This reads the deals the same way the board does, from the same rows and the same rules, so the two agree:
 * an open deal (not won, not dropped) whose customer has not answered for three working days. The owner is said by name, as the lead's
 * board says it; nothing anybody said is quoted.
 */
export interface AStalledDeal {
  id: string;
  name: string;
  ownerParticipantId: string | null;
  since: Date;
}

export async function theDealsThatHaveStalled(prisma: any, ground: { id: string; organizationId: string; workStages?: unknown }, now: Date): Promise<AStalledDeal[]> {
  /* Only by the lead's own stall rule, behind Release 1's switch (standing decision 4): none set, no deal has stalled. */
  const days: number | null | undefined = (await theReleaseOneSalesBoardIsOn(prisma, ground.organizationId)) ? (await theStallRuleOnRecord(prisma, ground.id)).days : undefined;
  if (days === null) return [];
  const deals: any[] = await Promise.resolve(prisma.workItem?.findMany?.({ where: { groundId: ground.id, kind: 'deal' }, select: { id: true, name: true, stage: true, fields: true, ownerParticipantId: true } }) ?? []).catch(() => []);
  if (!Array.isArray(deals) || !deals.length) return [];
  const lines: any[] = await Promise.resolve(prisma.recordEntry?.findMany?.({ where: { disputedAt: null, participant: { groundId: ground.id } }, select: { id: true, text: true, participantId: true, createdAt: true, disputedAt: true } }) ?? []).catch(() => []);
  const said = (Array.isArray(lines) ? lines : []).map((l) => ({ ...l, text: cleanText(String(l.text ?? '')) }));
  const participants: any[] = await Promise.resolve(prisma.groundParticipant?.findMany?.({ where: { groundId: ground.id }, select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } }) ?? []).catch(() => []);
  const ourSide = await theNamesOnOurSide(prisma, ground.organizationId, Array.isArray(participants) ? participants : []).catch(() => [] as string[]);
  const peopleAt: Map<string, string[]> = await thePeopleAtEachCustomer(prisma, ground.id, deals.map((d) => ({ id: d.id, name: d.name, ownerParticipantId: d.ownerParticipantId })), ourSide).catch(() => new Map<string, string[]>());
  const stages = theSalesStages(ground.workStages);
  const last = (stages[stages.length - 1] ?? 'Won').trim().toLowerCase();
  const out: AStalledDeal[] = [];
  for (const d of deals) {
    if (!String(d.name ?? '').trim() || String(d.stage ?? '').trim().toLowerCase() === last) continue;
    const there = peopleAt.get(d.id) ?? [];
    if (theDealWasDropped({ name: d.name, stage: d.stage, ownerParticipantId: d.ownerParticipantId, fields: d.fields }, lines, { lastStage: stages[stages.length - 1] ?? null, peopleThere: there, saidInTheCheckIn: (d.fields as any)?._dropped ?? null, otherDeals: deals.map((x) => String(x.name ?? '')) })) continue;
    const since = notAnsweringSince(d.name, said, { people: ourSide, contact: theContactOf(d.fields), peopleThere: there });
    if (since && (days === undefined ? hasStalled(since, now) : hasStalled(since, now, days))) out.push({ id: d.id, name: String(d.name).trim(), ownerParticipantId: d.ownerParticipantId ?? null, since });
  }
  return out.sort((a, b) => a.since.getTime() - b.since.getTime());
}
