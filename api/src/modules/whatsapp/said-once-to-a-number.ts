import { WhatsAppService } from './whatsapp.service';

/**
 * SAID ONCE TO A NUMBER, NEVER AGAIN. A note that something was said to a number is kept in the send log (`WhatsAppSend`, a `told:`
 * kind with nothing sent), written before it is said, so a second message arriving at once does not repeat it. True the first time.
 * Read by the sentence that proof sent here is shared, and by the one reply a number nobody has linked gets (Hafsah, 3 November 2026:
 * "one polite reply asking them to link it from the app (or the link they were sent)"; one reply, not one per message).
 */
export async function theFirstTimeThisIsSaidTo(prisma: any, from: string, kind: string, organizationId: string | null): Promise<boolean> {
  const phone = WhatsAppService.normalize(from);
  try {
    const told = await prisma.whatsAppSend.findFirst({ where: { phone, kind: { startsWith: kind } }, select: { id: true } });
    if (told) return false;
    await prisma.whatsAppSend.create({ data: { organizationId, phone, kind, checkInId: null, sentAt: null, failedAt: null, status: null, error: null } });
    return true;
  } catch {
    /* Not being able to tell is never a reason to say nothing: silence is the one thing this channel cannot answer with. */
    return true;
  }
}

/** The note that a number nobody has linked was told how to link it. */
export const TOLD_THE_NUMBER_IS_NOT_LINKED = 'told:number-not-linked';
