/**
 * WHAT THE LEAD SAID AT SET-UP, FROM ONE PLACE (existing customers, 22 November 2026).
 *
 * The kind of work and the targets given at set-up are read from what the lead said when she set the check-in up. A check-in set up in
 * the chat keeps an empty brief and end state, so those are not it. Her own words are kept in lead_setup_words. A check-in saved before
 * that was kept for every save (721b352e6: a save resumed from the save card sent none of her words) holds them nowhere, only in the
 * set-up read-back she saved: what Groundwork said it understood, the targets agreed, and the people named. So that is read where her
 * own words are not, and said as what it is, never as her words.
 */
export async function whatTheLeadSaidAtSetUp(prisma: any, groundId: string): Promise<string> {
  const own = await Promise.resolve(prisma.leadSetupWords?.findUnique?.({ where: { groundId }, select: { text: true } })).catch(() => null);
  if (String(own?.text ?? '').trim()) return `What the lead typed when setting it up:\n${String(own.text).trim()}`;
  const ground = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { initiatorId: true } })).catch(() => null);
  const lead = ground?.initiatorId
    ? await Promise.resolve(prisma.groundParticipant?.findFirst?.({ where: { groundId, userId: ground.initiatorId }, select: { id: true } })).catch(() => null)
    : null;
  const first = lead
    ? await Promise.resolve(prisma.checkIn?.findFirst?.({ where: { participantId: lead.id }, orderBy: { sessionNumber: 'asc' }, select: { sessionReport: true } })).catch(() => null)
    : null;
  return theSetUpReadBackInWords((first?.sessionReport as any)?.reportTheyRead ?? null);
}

/** The set-up read-back she saved, as plain lines: what Groundwork understood, what was agreed, and who was named. Empty where there is none. */
export function theSetUpReadBackInWords(r: any): string {
  if (!r || typeof r !== 'object') return '';
  const lines = [
    String(r.yourRole ?? '').trim(),
    String(r.whatGroundworkSaw ?? '').trim(),
    ...((Array.isArray(r.alignmentReached) ? r.alignmentReached : []) as any[]).map((a) => String(a?.note ?? a?.title ?? '').trim()),
    ...((Array.isArray(r.mentionedPeople) ? r.mentionedPeople : []) as any[]).map((p) => [p?.name, p?.context].filter(Boolean).join(': ').trim()),
  ].filter(Boolean);
  return lines.length ? `What Groundwork said back to the lead at set-up, and she saved:\n${lines.join('\n')}` : '';
}
