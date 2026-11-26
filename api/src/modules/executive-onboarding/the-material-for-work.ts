/**
 * WHAT SHE FORWARDED, HANDED TO THE WORK THAT READS IT (Ebele, increment 6b). Her material is read by nothing outside this folder (see
 * nothing-forwarded-reaches-a-model-or-a-provider.spec.ts), so the payments tracker, the weekly Assembly report and the voice notes in a batch are
 * given to `principal-work/` from here, as plain data, and what it needs from the rest of her material (a document that mentions a payee) is asked
 * for through these functions. Nothing here runs a model, and nothing here sends anything.
 */
import { CONTACT_PREFIX } from './a-team-members-reply';
import { QUIET_FOR_MS } from './the-intake';

export interface AMaterialItem { id: string; kind: string; fileName: string; mimeType: string; text: string | null; state: string; unsure: string[]; insideArchive: string | null; receivedAt: Date; hash: string | null; /** The file itself, where it is kept, so a workbook can be read as its cells (documents/a-file-as-cells.ts). */ bytes?: Buffer | null }
export interface ABatchForWork { id: string; organizationId: string; principalUserId: string; fromUserId: string; fromAddress: string; channel: 'email' | 'whatsapp'; sender: { kind: 'principal' | 'delegate' | 'contact'; contactId: string | null }; items: AMaterialItem[] }

const asItem = (r: any): AMaterialItem => ({ id: r.id, kind: r.kind, fileName: r.fileName, mimeType: r.mimeType, text: r.text ?? null, state: r.state, unsure: Array.isArray(r.unsure) ? r.unsure : [], insideArchive: r.insideArchive ?? null, receivedAt: new Date(r.receivedAt), hash: r.hash ?? null, bytes: r.bytes ? Buffer.from(r.bytes) : null });

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
 * Her kept material, read once, and a search over it: the correspondence a payment or an approval is held up against (newest first).
 * Duplicates and unreadable files are left out, and so are the sheets being read, so a tracker is never its own evidence. Read once and searched
 * many times (Halden rerun, N11: it was read again for each of 165 payments, 10,415 rows each time, and Today took 40 to 90 seconds).
 */
export async function herMaterialToSearch(prisma: any, a: { principalUserId: string; exceptFiles?: string[] }): Promise<(terms: string[]) => AMaterialItem[]> {
  const rows: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: a.principalUserId } })) ?? [];
  const kept = rows
    .filter((r) => r.state === 'kept' && r.kind !== 'archive' && !(a.exceptFiles ?? []).includes(r.fileName))
    .sort((x, y) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime())
    .map((r) => ({ hay: `${r.fileName}\n${r.subject ?? ''}\n${r.text ?? ''}`.toLowerCase(), item: asItem(r) }));
  return (words: string[]) => {
    const terms = words.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3);
    return terms.length ? kept.filter((k) => terms.some((t) => k.hay.includes(t))).map((k) => k.item) : [];
  };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * HOW A PERSON READS ONE THING ON HER RECORD (Halden rerun, N5: "I already have the file “seed:message:bda211c03150b9d1”"). A message and a voice note are kept
 * with an internal name, so they are named by what they are and the day: "your WhatsApp message of 19 November", "your email “Kilele permit” of 19 November",
 * "your voice note of 19 November". A file is named by its own name. `whose` is "your" for the sender, or a name ("Ahmed's") for anybody else.
 */
export function aThingOnHerRecord(m: { kind?: string | null; fileName?: string | null; channel?: string | null; subject?: string | null; receivedAt?: Date | string | null }, whose = 'your'): string {
  const at = m.receivedAt ? new Date(m.receivedAt) : null;
  const day = at && !Number.isNaN(at.getTime()) ? ` of ${at.getUTCDate()} ${MONTH_NAMES[at.getUTCMonth()]}` : '';
  if (m.kind === 'voice') return `${whose} voice note${day}`;
  if (m.kind === 'message') {
    if (m.channel === 'whatsapp') return `${whose} WhatsApp message${day}`;
    const subject = String(m.subject ?? '').replace(/^\s*(?:re|fwd?|fw)\s*:\s*/i, '').trim();
    return `${whose} email${subject ? ` “${subject}”` : ''}${day}`;
  }
  return `the file “${m.fileName ?? 'with no name'}”${day ? ` from${day.slice(3)}` : ''}`;
}

/** A file's name without its dates, numbers and version words: "States deck week 46 v2.pptx" and "States deck week 47.pptx" are one deck. */
export const theSameFileName = (name: string): string => String(name ?? '').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/g, ' ').replace(/\b(?:week|wk|v|version|final|draft|updated|copy|of)\b/g, ' ').replace(/[^a-z]+/g, ' ').trim();

/** The version of this file kept before it: the same name once dates and versions are taken off, received earlier, the latest of those. */
export async function theEarlierVersionOf(prisma: any, item: AMaterialItem & { principalUserId?: string }, principalUserId: string): Promise<AMaterialItem | null> {
  const want = theSameFileName(item.fileName);
  if (!want) return null;
  const rows: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId, kind: 'file' } }).catch(() => [])) ?? [];
  const earlier = rows.filter((r) => r.id !== item.id && r.state === 'kept' && r.bytes && theSameFileName(r.fileName) === want && new Date(r.receivedAt).getTime() < item.receivedAt.getTime())
    .sort((x, y) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime());
  return earlier.length ? asItem(earlier[0]) : null;
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
