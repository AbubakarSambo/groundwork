import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * WHETHER AN INVITE LINK STILL OPENS. One rule, asked wherever a token is presented.
 *
 * Two doors take an invite token: accepting the invitation, and attaching a document before the
 * account exists. The first asked both questions below; the second asked neither, so a token that
 * had been used or had expired months ago still uploaded a file onto the ground. The rule moved
 * here so that both doors ask it, and so that a third door added later has one place to look.
 */
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
      'We do not recognise that link. If you have already joined, sign in with the password you set. Your setup link is in your email. If you have not joined yet, ask the person who added you for a new invite.',
    );
  }
  // Skip expiry for participants who already accepted - they can always return via their link.
  const alreadyAccepted = !!participant.userId;
  /**
   * Ninety days, and only for an invite nobody ever accepted.
   *
   * Fourteen days was short enough to expire on ordinary human timescales - annual leave, a quarter
   * that slipped, a ground set up ahead of a start date - and the reward for being late was a dead
   * link and an instruction to go and ask a colleague to resend it. Nobody should have to chase
   * someone to get into their own record.
   */
  if (!alreadyAccepted && participant.inviteTokenExpiresAt && participant.inviteTokenExpiresAt < new Date()) {
    throw new BadRequestException(
      'This invite link is very old and has expired. Use the "send me a new link" option, or ask whoever added you to invite you again.',
    );
  }
  return participant;
}
