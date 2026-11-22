import { PrismaService } from '../prisma/prisma.service';

/**
 * THE PEOPLE AN ADMIN PASTED WHO HAD NO SEAT (B-129). Inviting 25 addresses to a plan with room for 19 answered "19 people were invited.
 * 6 people have no seat on your plan." and then forgot the six: they were on no list, no invitation went, and the admin could not see who
 * they were or let them in when there was room. They are kept here, one list per organisation, as a setting row (no account is made and
 * no seat is used), shown on People and in the queue of people waiting for a seat, and invited when there is room.
 */
export interface AnInvitationWaiting { email: string; name: string | null; role: 'ADMIN' | 'LEAD' | 'MEMBER' | 'GUEST'; at: string }

const KEY = (organizationId: string) => `invitations.waiting-for-a-seat.${organizationId}`;

export async function theInvitationsWaiting(prisma: PrismaService, organizationId: string): Promise<AnInvitationWaiting[]> {
  const row = await (prisma as any).platformSetting?.findUnique?.({ where: { key: KEY(organizationId) } })?.catch?.(() => null);
  const list = row?.value;
  return Array.isArray(list) ? list.filter((x: any) => x && typeof x.email === 'string') : [];
}

async function write(prisma: PrismaService, organizationId: string, list: AnInvitationWaiting[]): Promise<void> {
  const key = KEY(organizationId);
  const value = list as any;
  await (prisma as any).platformSetting.upsert({ where: { key }, create: { key, value, updatedBy: 'invitations' }, update: { value } });
}

/** Keep these, once each, in the order they were pasted. An address already kept is not kept twice. */
export async function keepThemWaiting(prisma: PrismaService, organizationId: string, these: { email: string; name?: string | null; role: AnInvitationWaiting['role'] }[], now = new Date()): Promise<AnInvitationWaiting[]> {
  if (!these.length) return theInvitationsWaiting(prisma, organizationId);
  const kept = await theInvitationsWaiting(prisma, organizationId);
  const have = new Set(kept.map((k) => k.email.toLowerCase()));
  for (const t of these) {
    const email = t.email.trim().toLowerCase();
    if (have.has(email)) continue;
    have.add(email);
    kept.push({ email, name: t.name?.trim() || null, role: t.role, at: now.toISOString() });
  }
  await write(prisma, organizationId, kept);
  return kept;
}

export async function stopWaiting(prisma: PrismaService, organizationId: string, emails: string[]): Promise<void> {
  if (!emails.length) return;
  const gone = new Set(emails.map((e) => e.toLowerCase()));
  const kept = (await theInvitationsWaiting(prisma, organizationId)).filter((k) => !gone.has(k.email.toLowerCase()));
  await write(prisma, organizationId, kept);
}
