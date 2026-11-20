/**
 * WHAT SHE FORWARDED, HANDED TO THE WORK THAT READS IT (Fatima, increment 6b). Her material is read by nothing outside this folder (see
 * nothing-forwarded-reaches-a-model-or-a-provider.spec.ts), so the payments tracker, the weekly Assembly report and the voice notes in a batch are
 * given to `principal-work/` from here, as plain data, and what it needs from the rest of her material (a document that mentions a payee) is asked
 * for through these functions. Nothing here runs a model, and nothing here sends anything.
 */
import { CONTACT_PREFIX } from './a-team-members-reply';
import { QUIET_FOR_MS } from './the-intake';

export interface AMaterialItem { id: string; kind: string; fileName: string; mimeType: string; text: string | null; state: string; unsure: string[]; insideArchive: string | null; receivedAt: Date; hash: string | null }
export interface ABatchForWork { id: string; organizationId: string; principalUserId: string; fromUserId: string; fromAddress: string; channel: 'email' | 'whatsapp'; sender: { kind: 'principal' | 'delegate' | 'contact'; contactId: string | null }; items: AMaterialItem[] }

const asItem = (r: any): AMaterialItem => ({ id: r.id, kind: r.kind, fileName: r.fileName, mimeType: r.mimeType, text: r.text ?? null, state: r.state, unsure: Array.isArray(r.unsure) ? r.unsure : [], insideArchive: r.insideArchive ?? null, receivedAt: new Date(r.receivedAt), hash: r.hash ?? null });

/** The batches that have gone quiet and have not been answered, with what each holds. The same test as the first picture uses, so the two agree on "quiet". */
export async function quietBatchesForWork(prisma: any, now: Date): Promise<ABatchForWork[]> {
  const batches: any[] = (await prisma.intakeBatch.findMany({ where: { acknowledgedAt: null } })) ?? [];
  const out: ABatchForWork[] = [];
  for (const b of batches) {
    if (now.getTime() - new Date(b.lastItemAt).getTime() < QUIET_FOR_MS) continue;
    const rows: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: b.principalUserId, batchId: b.id } })) ?? [];
    const isContact = String(b.fromUserId).startsWith(CONTACT_PREFIX);
    out.push({
      id: b.id, organizationId: b.organizationId, principalUserId: b.principalUserId, fromUserId: b.fromUserId, fromAddress: b.fromAddress, channel: b.channel,
      sender: { kind: isContact ? 'contact' : b.fromUserId === b.principalUserId ? 'principal' : 'delegate', contactId: isContact ? String(b.fromUserId).slice(CONTACT_PREFIX.length) : null },
      items: rows.map(asItem),
    });
  }
  return out;
}

/** The batch has been answered by the work that read it, so the first picture does not say the same again. Claimed once. */
export async function answeredByTheWork(prisma: any, batchId: string, now: Date): Promise<boolean> {
  const r = await prisma.intakeBatch.updateMany({ where: { id: batchId, acknowledgedAt: null }, data: { acknowledgedAt: now } });
  return !r || r.count !== 0;
}

/**
 * Her kept material that mentions any of these words, newest first: the correspondence a payment or an approval is held up against.
 * Duplicates and unreadable files are left out, and so are the sheets being read, so a tracker is never its own evidence.
 */
export async function materialThatMentions(prisma: any, a: { principalUserId: string; terms: string[]; exceptFiles?: string[] }): Promise<AMaterialItem[]> {
  const terms = a.terms.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3);
  if (!terms.length) return [];
  const rows: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: a.principalUserId } })) ?? [];
  return rows
    .filter((r) => r.state === 'kept' && r.kind !== 'archive' && !(a.exceptFiles ?? []).includes(r.fileName))
    .filter((r) => { const hay = `${r.fileName}\n${r.subject ?? ''}\n${r.text ?? ''}`.toLowerCase(); return terms.some((t) => hay.includes(t)); })
    .sort((x, y) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime())
    .map(asItem);
}

/** The people she named and introduced, who can be asked for what is missing. Never the people she only mentioned. */
export async function theTeamSheNamed(prisma: any, organizationId: string, principalUserId: string): Promise<{ id: string; name: string; email: string | null; phone: string | null }[]> {
  const rows: any[] = (await prisma.outreachContact?.findMany?.({ where: { organizationId, principalUserId, state: 'introduced', kind: 'team' } }).catch(() => [])) ?? [];
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email ? String(r.email).toLowerCase() : null, phone: r.phone ?? null }));
}

export async function theContactWhoWrote(prisma: any, contactId: string): Promise<{ id: string; name: string; email: string | null; phone: string | null } | null> {
  const r: any = await prisma.outreachContact?.findFirst?.({ where: { id: contactId } }).catch(() => null);
  return r ? { id: r.id, name: r.name, email: r.email ? String(r.email).toLowerCase() : null, phone: r.phone ?? null } : null;
}
