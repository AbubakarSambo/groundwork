/**
 * THE OPT-OUT WAS HONOURED IN THREE PLACES OUT OF NINE.
 *
 * `User.emailNotifications` is checked by the manual nudge, the scheduled nudge and the reveal
 * reminder. It is not checked by the session-ready mail, the return nudge, the activation
 * reminder, the feedback request or the report-ready mail — and the comment above one of those
 * claims it uses "the same opt-out as every other reminder in this sweep", which is false about
 * the two items directly above it.
 *
 * That is not a bug anybody was going to find by reading, because every one of those files looks
 * right on its own. It is what a rule enforced by remembering always becomes.
 *
 * ==========================================================================
 * SO THE DECISION MOVES TO THE ONE DOOR EVERY EMAIL GOES THROUGH.
 * ==========================================================================
 *
 * Each sender declares what KIND of mail it is, and this file decides. A sender that forgets to
 * declare gets the careful answer — see `ASKED_FOR` — rather than the permissive one, so the
 * failure mode of forgetting is an email not sent rather than an email somebody switched off.
 *
 * TWO KINDS, AND THE LINE BETWEEN THEM IS WHO STARTED IT.
 *
 *   ASKED FOR — they did something and this is the answer: a verification link, a password reset,
 *   an invitation they are the subject of, a report they took part in. Turning off "email
 *   notifications" cannot stop these without breaking the product for the person who asked. A
 *   forgotten password with the reset mail suppressed is an account nobody can get back into.
 *
 *   WE DECIDED TO SEND IT — nudges, reminders, digests, requests for feedback. Nobody asked for
 *   these this morning. These are what the switch is about, and every one of them is stopped by
 *   it.
 *
 * AND AN UNSUBSCRIBE OUTRANKS EVERYTHING IT CAN. Somebody who used the link in the footer has said
 * something stronger than a preference toggle, so it stops both kinds except the ones that would
 * lock them out of their own account — and that exception is named, one by one, below.
 */

export type WhatKindOfMail =
  /** They did something; this is the answer. */
  | 'asked for'
  /** Nobody asked this morning. The switch is about these. */
  | 'we decided to send it'
  /** Asked for AND unstoppable: without it somebody cannot get into their own account. */
  | 'the way back in';

export interface WhatTheyWant {
  /** The account-level switch. Undefined where there is no account — a person invited by address. */
  emailNotifications?: boolean | null;
  /** Set when they used the unsubscribe link. Outranks the switch. */
  unsubscribedAt?: Date | null;
}

export type WhetherToSend = { send: true } | { send: false; because: string };

/**
 * Whether this goes out. The whole decision, in one function, called from one place.
 */
export function whetherToSend(kind: WhatKindOfMail, they: WhatTheyWant | null): WhetherToSend {
  /* Nobody to ask. A participant invited by address has no account and no preference, and refusing
     to write to them would mean nobody could ever be invited. */
  if (!they) return { send: true };

  if (kind === 'the way back in') return { send: true };

  if (they.unsubscribedAt) {
    return {
      send: false,
      because: 'they used the unsubscribe link, which turns off everything except getting back into their account',
    };
  }

  if (kind === 'we decided to send it' && they.emailNotifications === false) {
    return { send: false, because: 'they turned off check-in reminders' };
  }

  return { send: true };
}

/**
 * WHAT EACH SENDER IS, BY NAME.
 *
 * Written here rather than at each call site, so that adding a sender means adding a line to a list
 * somebody reviews — and so a guard can hold that the list and the senders are the same set. A
 * sender missing from this list is treated as `we decided to send it`, which is the careful
 * direction: it will be suppressed for somebody who opted out, and that is a complaint rather than
 * a lockout.
 */
export const WHAT_EACH_MAIL_IS: Record<string, WhatKindOfMail> = {
  /* Getting into your own account. Nothing may stop these. */
  sendVerificationEmail: 'the way back in',
  sendMagicLinkEmail: 'the way back in',
  sendSignInLinkEmail: 'the way back in',
  sendAddPasswordEmail: 'the way back in',
  sendPasswordResetEmail: 'the way back in',
  sendJoinConfirmation: 'the way back in',
  sendUserInvite: 'the way back in',
  sendParticipantInvite: 'the way back in',
  sendLeadInvite: 'the way back in',
  sendContributorCode: 'the way back in',
  /* A one-time code for an operation that cannot be undone. Nothing may stop it, and saying so
     here is the difference between a decision and a cast past the type. */
  sendAdminOtp: 'the way back in',
  /* To our own roster, about something outside asking for us. Nobody outside asked for the mail. */
  sendTeamAlert: 'we decided to send it',

  /* They took part; this is the outcome. */
  sendReportReady: 'asked for',
  sendGroundApproved: 'asked for',
  sendGroundDeclined: 'asked for',
  /* Both are answers to something the person or their lead set in motion, so neither is a mail we
     decided to send - and the way-back-in class is for account recovery, which this is not. */
  sendYouAreInNow: 'asked for',
  sendTheyWereNotLetIn: 'asked for',
  sendSomebodyIsWaiting: 'asked for',
  sendGroundActivated: 'asked for',
  sendGroundClosed: 'asked for',
  sendResolutionProposal: 'asked for',
  sendLateCorrectionNotice: 'asked for',
  sendParticipantCheckedIn: 'asked for',
  sendCoachRequestReceived: 'asked for',
  sendRecordPortabilityNotice: 'asked for',
  sendBillingChangeNotification: 'asked for',
  sendPaymentRequestEmail: 'asked for',
  sendPaymentFailed: 'asked for',
  sendWhoHasNotStarted: 'asked for',

  /* MONEY AND THE ACCOUNT'S ABILITY TO KEEP WORKING.
     A warning that the plan is about to stop working is not a nudge, even though nobody asked for
     it this morning: suppressing it means the wall arrives as a surprise, on the day somebody has
     work to do. Found by the guard below rather than by me — eight senders I had not classified. */
  sendSubscriptionConfirmed: 'asked for',
  sendSubscriptionCancelled: 'asked for',
  sendSubscriptionPaymentFailed: 'asked for',
  sendSubscriptionRenewal: 'asked for',
  sendFreeExtensionClaimed: 'asked for',
  sendApproachingSessionLimit: 'asked for',
  sendMemberCapWarning: 'asked for',
  sendCareFeeConfirmation: 'asked for',

  /* Nobody asked this morning. Every one of these stops when somebody says stop. */
  sendNudge: 'we decided to send it',
  /* Their integration has stopped receiving and only our logs knew. An admin decision to make,
     so it is ours to send — but it is about their system rather than about their team. */
  sendWebhookEndpointDying: 'we decided to send it',
  sendAbsenceReminder: 'we decided to send it',
  sendSessionReady: 'we decided to send it',
  sendActivationReminder: 'we decided to send it',
  sendActivationRevealReminder: 'we decided to send it',
  sendFeedbackRequest: 'we decided to send it',
  sendStalledNotification: 'we decided to send it',
  sendParticipantBlockedNudge: 'we decided to send it',
  sendCodeExpiryReminder: 'we decided to send it',
  sendRoundDigest: 'we decided to send it',
};

export function whatThisMailIs(sender: string): WhatKindOfMail {
  return WHAT_EACH_MAIL_IS[sender] ?? 'we decided to send it';
}
