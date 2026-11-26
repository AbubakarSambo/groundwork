/**
 * WHAT HAPPENED TO THE YEAR-END WORK, ONE ROW EACH (Ebele, increment 4).
 *
 * The five states are separate and each is written only by the thing that knows it:
 *   generated  the files were built from a version                       (here, when a version is made)
 *   queued     Groundwork decided to mail them and handed them to the door (the delivery code)
 *   sent       the mail service took the mail                            (the one door, at the moment it really goes, even if it was held first)
 *   delivered  the provider said it reached the inbox                    (the delivery webhook)
 *   approved   the principal said it is ready                            (the approval code)
 * "Sent" is never written because "generated" or "queued" happened. A person is told only what is in this table.
 *
 * A row is unique on (principal, kind, subject), so trying to say the same thing twice is refused by the database, and a second copy of
 * the API cannot send twice. Rows are never changed.
 */
export type AState = 'generated' | 'queued' | 'sent' | 'delivered' | 'approved' | 'failed' | 'suppressed';

export interface ALogRow {
  organizationId: string;
  principalUserId: string;
  kind: string;
  subject: string;
  version?: number | null;
  recipient?: string | null;
  detail?: string | null;
  data?: Record<string, unknown> | null;
  at?: Date;
}

/** True when this row was written, false when the same thing was already on record. */
export async function writeItOnce(prisma: any, row: ALogRow): Promise<boolean> {
  try {
    await prisma.yearEndLog.create({ data: { ...row, version: row.version ?? null, recipient: row.recipient ?? null, detail: row.detail ?? null, data: (row.data ?? null) as any, at: row.at ?? new Date() } });
    return true;
  } catch (err: any) {
    if (err?.code === 'P2002') return false;
    throw err;
  }
}

/** The one key for one job, one version, one kind of mail and one person. */
export const sendKeyOf = (a: { principalUserId: string; year: number; version: number; kind: 'draft' | 'final' | 'register'; recipient: string; day?: string }): string =>
  `year-end:${a.principalUserId}:${a.year}:v${a.version}:${a.kind}:${a.recipient.trim().toLowerCase()}${a.day ? `:${a.day}` : ''}`;

/** Called by the one door when the mail service takes a year-end mail, now or after it was held. Never throws into a send. */
export async function markTheYearEndFilesSent(prisma: any, sendKey: string | undefined, providerId?: string | null): Promise<void> {
  if (!sendKey || !prisma?.yearEndLog?.findFirst) return;
  try {
    const queued = await prisma.yearEndLog.findFirst({ where: { kind: 'queued', subject: sendKey } });
    if (!queued) return;
    await writeItOnce(prisma, { organizationId: queued.organizationId, principalUserId: queued.principalUserId, kind: 'sent', subject: sendKey, version: queued.version, recipient: queued.recipient, data: { providerId: providerId ?? null } });
  } catch {
    /* A record that cannot be written must not undo a mail that went. The next look at the record says "queued", which is the honest word. */
  }
}

/** Called when the provider says a mail reached the inbox. Only a mail the record says was sent can be delivered. */
export async function markTheYearEndFilesDelivered(prisma: any, providerId: string): Promise<void> {
  if (!providerId || !prisma?.yearEndLog?.findFirst) return;
  try {
    const sent = await prisma.yearEndLog.findFirst({ where: { kind: 'sent', data: { path: ['providerId'], equals: providerId } } });
    if (!sent) return;
    await writeItOnce(prisma, { organizationId: sent.organizationId, principalUserId: sent.principalUserId, kind: 'delivered', subject: sent.subject, version: sent.version, recipient: sent.recipient });
  } catch {
    /* Nothing is lost: "sent" stays the last thing said. */
  }
}

/** The states a version has reached for one person, in the order they happened. */
export async function whatHasHappened(prisma: any, principalUserId: string, version: number): Promise<{ kind: string; recipient: string | null; subject: string; at: Date; detail: string | null }[]> {
  const rows: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId, version, kind: { in: ['generated', 'queued', 'sent', 'delivered', 'approved', 'failed', 'suppressed'] } }, orderBy: { at: 'asc' } })) ?? [];
  return rows.map((r) => ({ kind: r.kind, recipient: r.recipient ?? null, subject: r.subject, at: r.at, detail: r.detail ?? null }));
}
