/**
 * "ONCE" WITHOUT A NEW TABLE (decision 109). A message that must go to somebody once, about one thing, is remembered in one `platform_settings` row
 * whose key names it. It is written only when the message was really DELIVERED. A message held for the morning is remembered as held, and counts as
 * told only while it is still waiting or once it was sent: a held message that was refused when its time came (they had stopped these emails, or had
 * had their one for the day) is not told, and is tried again another day.
 */
export const KEY = (what: string) => `engagement.once.${what}`;

export type WhatBecameOfIt = 'sent' | 'held' | 'suppressed' | unknown;

export async function hasBeenToldOnce(prisma: any, what: string): Promise<boolean> {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: KEY(what) } });
    if (!row) return false;
    const v: any = row.value;
    if (!v?.held) return true;
    /* Held for the morning: told if it is still waiting, or went. */
    const pending = await prisma.scheduledEmail?.findFirst?.({ where: { sender: v.sender, toAddress: { equals: String(v.to), mode: 'insensitive' }, sentAt: null }, select: { id: true } });
    if (pending) return true;
    const went = await prisma.notification?.findFirst?.({ where: { channel: 'email', sender: v.sender, toAddress: { equals: String(v.to), mode: 'insensitive' }, outcome: 'sent', createdAt: { gte: new Date(v.at) } }, select: { id: true } });
    return !!went;
  } catch { return true; /* unreadable: say nothing rather than twice */ }
}

/** Written after a delivery. `held` is remembered as held, with who it was held for, so the check above can tell what became of it. */
export async function nowToldOnce(prisma: any, what: string, went: WhatBecameOfIt = 'sent', held?: { sender: string; to: string }): Promise<void> {
  if (went === 'suppressed') return;
  const value = went === 'held' && held ? { at: new Date().toISOString(), held: true, sender: held.sender, to: held.to.trim().toLowerCase() } : { at: new Date().toISOString() };
  try { await prisma.platformSetting.create({ data: { key: KEY(what), value, updatedBy: 'engagement' } }); }
  catch { try { await prisma.platformSetting.update({ where: { key: KEY(what) }, data: { value, updatedBy: 'engagement' } }); } catch { /* another copy wrote it */ } }
}

/** Whether a mail of this kind to this address is already held for the morning and not yet sent, so a sweep does not make a second one. */
export async function isAlreadyHeld(prisma: any, sender: string, toAddress: string): Promise<boolean> {
  try { return !!(await prisma.scheduledEmail.findFirst({ where: { sender, toAddress: { equals: toAddress.trim(), mode: 'insensitive' }, sentAt: null }, select: { id: true } })); } catch { return false; }
}
