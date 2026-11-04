import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * WHETHER AN INVITE LINK STILL OPENS. One rule, asked wherever a token is presented.
 *
 * Two doors take an invite token: accepting the invitation, and attaching a document before the
 * account exists. The first asked both questions below; the second asked neither, so a token that
 * had been used or had expired months ago still uploaded a file onto the ground. The rule moved
 * here so that both doors ask it, and so that a third door added later has one place to look.
 */
/** Said wherever an expired invitation is presented. It no longer promises an option that did not exist. */
export const INVITATION_HAS_EXPIRED =
  'This invitation link has expired. Invitation links last 14 days. Open the link again and ask for a fresh one, or ask the person who invited you.';

/** Whether an invitation nobody accepted has run out. */
export function hasExpired(participant: { userId: string | null; inviteTokenExpiresAt: Date | null }, now: Date = new Date()): boolean {
  return !participant.userId && !!participant.inviteTokenExpiresAt && participant.inviteTokenExpiresAt < now;
}

export function assertInviteLinkStillOpens<T extends { userId: string | null; inviteTokenExpiresAt: Date | null }>(participant: T | null): T {
  if (!participant) {
    /**
     * The link is genuinely dead, and that is deliberate - the token is cleared on first use so an
     * emailed invite cannot serve as a permanent way in (see invite-single-use.spec.ts). Nothing here
     * should hand a used link any access.
     *
     * We cannot tell "used" from "never existed", because the row is found by the token and the
     * token is gone - so the message covers both without guessing, and points to the way forward in
     * each case rather than saying "invalid", which reads as something being broken or as an
     * accusation.
     */
    throw new NotFoundException(
      /* Not "already been used": the token deliberately survives use, so that is no longer a state this
         sentence can be describing. The row is simply not found; say that, and what to do. */
      'I do not recognise that link. Have you already joined? Then sign in as you usually do. Have you not joined yet? Ask the person who added you to send you a new invite.',
    );
  }
  // Skip expiry for participants who already accepted - they can always return via their link.
  const alreadyAccepted = !!participant.userId;
  /**
   * Fourteen days (how-long-an-invite-lasts.ts), and only for an invite nobody ever accepted. The
   * way on is a fresh link from the expired-link page, which is what this sentence says.
   */
  if (!alreadyAccepted && participant.inviteTokenExpiresAt && participant.inviteTokenExpiresAt < new Date()) {
    throw new BadRequestException(INVITATION_HAS_EXPIRED);
  }
  return participant;
}
