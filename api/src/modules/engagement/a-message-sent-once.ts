/**
 * "ONCE" WITHOUT A NEW TABLE (decision 109). A message that must go to somebody once, about one thing, is remembered in one `platform_settings` row
 * whose key names it. Written only after the message was really sent or held for the morning, so a message the opt-out or the day's one refused is
 * tried again another day.
 */
const KEY = (what: string) => `engagement.once.${what}`;

export async function hasBeenToldOnce(prisma: any, what: string): Promise<boolean> {
  try { return !!(await prisma.platformSetting.findUnique({ where: { key: KEY(what) } })); } catch { return true; /* unreadable: say nothing rather than twice */ }
}

export async function nowToldOnce(prisma: any, what: string): Promise<void> {
  try { await prisma.platformSetting.create({ data: { key: KEY(what), value: { at: new Date().toISOString() }, updatedBy: 'engagement' } }); } catch { /* a clash means another copy wrote it */ }
}

/** Whether a mail of this kind to this address is already held for the morning and not yet sent, so a sweep does not make a second one. */
export async function isAlreadyHeld(prisma: any, sender: string, toAddress: string): Promise<boolean> {
  try { return !!(await prisma.scheduledEmail.findFirst({ where: { sender, toAddress: toAddress.trim().toLowerCase(), sentAt: null }, select: { id: true } })); } catch { return false; }
}
