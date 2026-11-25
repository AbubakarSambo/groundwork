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
  | 'the way back in'
  /**
   * To our own roster, about the running of the product: an API-access request, a roster alert. Not
   * a customer-facing preference's business - a staff member who unsubscribed from a customer's
   * digest did not ask to stop hearing that a customer is waiting on them (fix plan D13, NL-032).
   */
  | 'operational'
  /**
   * Money, the plan, and what becomes of the record when a plan ends: what the organisation needs in order to pay and keep its
   * work. Treated as `asked for` by every rule here, and the one kind of mail about the work that a pause never stops (Hafsah,
   * 2 November 2026: while Groundwork is paused "people can still sign in, see their data and pay").
   */
  | 'about paying';

/** The kinds a pause leaves alone: getting in, the running of the product, and paying. Everything else waits until they pay. */
export function aPauseStops(kind: WhatKindOfMail): boolean {
  return kind === 'we decided to send it' || kind === 'asked for';
}

export interface WhatTheyWant {
  /** The account-level switch. Undefined where there is no account — a person invited by address. */
  emailNotifications?: boolean | null;
  /** Set when they used the unsubscribe link. Outranks the switch. */
  unsubscribedAt?: Date | null;
  /**
   * THE STOP LINK STOPS EVERYTHING. Set the moment they used the link on a reminder; it used to be
   * read by one of three nudge engines. Undefined when the mail is not about a participant.
   */
  remindersStoppedAt?: Date | string | null;
  /** The per-kind switches on their preference row, which only the digest used to read. */
  wantsDigest?: boolean | null;
  wantsNudges?: boolean | null;
  /**
   * Whether they are still here. A leaver whose address has been reassigned inside their old company
   * must not get the report; the nudges checked this and the broadcasts did not.
   */
  stillHere?: boolean | null;
  /**
   * The last day of approved leave that covers today, when they are away (week 23). Dates only: no
   * reason or kind of leave is ever read. A reminder or a "you have missed" mail does not go to
   * somebody who is away.
   */
  awayUntil?: string | null;
}

export type WhetherToSend = { send: true } | { send: false; because: string };

/** The senders each per-kind switch governs. */
export const GOVERNED_BY_THE_DIGEST_SWITCH: ReadonlySet<string> = new Set(['sendRoundDigest']);
/**
 * THE MAILS THAT CHASE A PERSON TO ANSWER, WHICH DO NOT GO TO SOMEBODY ON APPROVED LEAVE (week 23).
 * A mail that tells the lead something about the ground is not in this list; only the ones that ask
 * the person themselves to do something, or tell them they have missed it.
 */
export const NOT_SENT_WHILE_AWAY: ReadonlySet<string> = new Set([
  'sendNudge', 'sendAbsenceReminder', 'sendSessionReady', 'sendInviteAboutToLapse', 'sendFeedbackRequest', 'sendTheLeadsNudge',
]);

export const GOVERNED_BY_THE_NUDGE_SWITCH: ReadonlySet<string> = new Set(['sendNudge', 'sendAbsenceReminder', 'sendLeadFirstCheckIn', 'sendTheLeadsNudge']);

/**
 * Whether this goes out. The whole decision, in one function, called from one place.
 *
 * THE ORDER IS THE ARGUMENT. Nothing stops a way back in or an operational alert. A leaver gets
 * nothing else. The unsubscribe link stops what we decided to send - and, decided under fix plan D13
 * (NL-031), NOT what they asked for: a consultant who unsubscribed from one customer's digest did not
 * ask to stop hearing about work they took part in for another. Then the stop link, the per-kind
 * switches, and the account-level switch.
 */
export function whetherToSend(kind: WhatKindOfMail, they: WhatTheyWant | null, sender?: string): WhetherToSend {
  /* Nobody to ask. A participant invited by address has no account and no preference, and refusing
     to write to them would mean nobody could ever be invited. */
  if (!they) return { send: true };

  if (kind === 'the way back in' || kind === 'operational') return { send: true };

  if (they.stillHere === false) {
    return { send: false, because: 'they have left, or their sign-in was deactivated' };
  }

  if (kind !== 'we decided to send it') return { send: true };

  if (they.awayUntil && sender && NOT_SENT_WHILE_AWAY.has(sender)) {
    return { send: false, because: `they are on approved leave until ${they.awayUntil}, and a reminder does not go to somebody who is away` };
  }

  if (they.unsubscribedAt) {
    return {
      send: false,
      because: 'they used the unsubscribe link, which turns off everything we decide to send',
    };
  }

  if (they.remindersStoppedAt) {
    return { send: false, because: 'they asked us to stop reminding them, which the invitation told them they could do' };
  }

  if (sender && GOVERNED_BY_THE_DIGEST_SWITCH.has(sender) && they.wantsDigest === false) {
    return { send: false, because: 'they turned the round digest off' };
  }
  if (sender && GOVERNED_BY_THE_NUDGE_SWITCH.has(sender) && they.wantsNudges === false) {
    return { send: false, because: 'they turned nudges off' };
  }

  if (they.emailNotifications === false) {
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
  /* Added to another organisation, by an admin there (Hafsah, 12 October): an invitation, like sendUserInvite. */
  sendAddedToAnotherOrganisation: 'the way back in',
  sendParticipantInvite: 'the way back in',
  /* It is one of the two invites, picked by the situation. Classified as the invite it delegates to. */
  sendTheInviteThisGroundSends: 'the way back in',
  /* Somebody's own manager asking them one question: the same kind of mail as any other invite, and
     without it there is no link to answer on. See one-line-one-link-one-report. */
  sendTeamUpdateAsk: 'the way back in',
  sendLeadInvite: 'the way back in',
  sendContributorCode: 'the way back in',
  /* A one-time code for an operation that cannot be undone. Nothing may stop it, and saying so
     here is the difference between a decision and a cast past the type. */
  sendAdminOtp: 'the way back in',
  /* To our own roster, about the running of the product. Exempt from the customer-facing preference:
     an API-access request has to reach somebody. */
  sendTeamAlert: 'operational',
  /* Groundwork's own morning list of what did not go out yesterday, to the one platform address set for it (engagement/the-daily-delivery-alert.ts). */
  sendTheDailyDeliveryAlert: 'operational',
  /* Groundwork's own daily usage summary, to the back-office team (back-office/the-daily-usage-summary.ts). */
  sendTheDailyUsageSummary: 'operational',

  /* They took part; this is the outcome. */
  sendReportReady: 'asked for',
  /* The moment everybody has answered, which is the whole promise of that card. */
  sendTeamUpdateAllIn: 'asked for',
  sendGroundApproved: 'asked for',
  /* The decision on a request the person made themselves (decision 106 item 7). */
  sendRequestDecided: 'asked for',
  /* What waits for the person to approve, said once. An approval is never stopped by the opt-out (decision 109 item 5); the request is also on Today. */
  sendApprovalsSummary: 'asked for',
  sendGroundDeclined: 'asked for',
  /* Both are answers to something the person or their lead set in motion, so neither is a mail we
     decided to send - and the way-back-in class is for account recovery, which this is not. */
  sendYouAreInNow: 'asked for',
  sendTheyWereNotLetIn: 'asked for',
  sendTheyAreInNow: 'asked for',
  sendSomebodyIsWaiting: 'asked for',
  /* A person in the check-in asked the lead for it; the lead gets their request (U.3). */
  sendMoreTimeAsked: 'asked for',
  sendGroundClosed: 'asked for',
  sendResolutionProposal: 'asked for',
  sendLateCorrectionNotice: 'asked for',
  sendParticipantCheckedIn: 'asked for',
  sendCoachRequestReceived: 'asked for',
  sendRecordPortabilityNotice: 'about paying',
  sendBillingChangeNotification: 'about paying',
  sendPaymentRequestEmail: 'about paying',
  sendPaymentFailed: 'about paying',
  /* A chase Groundwork decided to send, told to the lead at the end of the reminders: routine, so the one-a-day rule counts it and her own opt-out stops it (8 October). */
  sendWhoHasNotStarted: 'we decided to send it',
  /* They sent the invitation; this is what became of it. */
  sendInviteBounced: 'asked for',
  sendInviteLapsed: 'asked for',
  /* They asked for the API; this is the answer, whichever it is. */
  sendApiAccessApproved: 'asked for',
  sendApiAccessDeclined: 'asked for',
  sendApiAccessWithdrawn: 'asked for',

  /* MONEY AND THE ACCOUNT'S ABILITY TO KEEP WORKING.
     A warning that the plan is about to stop working is not a nudge, even though nobody asked for
     it this morning: suppressing it means the wall arrives as a surprise, on the day somebody has
     work to do. Found by the guard below rather than by me — eight senders I had not classified. */
  sendSubscriptionConfirmed: 'about paying',
  sendSubscriptionCancelled: 'about paying',
  sendSubscriptionPaymentFailed: 'about paying',
  sendSubscriptionRenewal: 'about paying',
  sendApproachingSessionLimit: 'about paying',
  sendMemberCapWarning: 'about paying',
  sendCareFeeConfirmation: 'about paying',

  /* Nobody asked this morning. Every one of these stops when somebody says stop. */
  sendNudge: 'we decided to send it',
  /* The lead pressed "Remind": still a reminder, so the person's own opt-out stops it, but never counted or held for the day's one. */
  sendNudgeFromAPress: 'we decided to send it',
  /* The lead pressed "Nudge Peter" (engagement/the-leads-own-nudge.ts): one message from her by name, about Peter's one thing today. A
     reminder, so his own stop link and opt-out stop it and it waits for quiet hours to end; never counted or held as the day's one routine
     message (it is not in ROUTINE_EMAILS), and never sent to somebody on approved leave. */
  sendTheLeadsNudge: 'we decided to send it',
  /* "Send me that" from the assistant: they asked for it. */
  sendMeThat: 'asked for',
  sendInviteAboutToLapse: 'we decided to send it',
  /* Their integration has stopped receiving and only our logs knew. An admin decision to make,
     so it is ours to send — but it is about their system rather than about their team. */
  sendWebhookEndpointDying: 'asked for',
  sendAbsenceReminder: 'we decided to send it',
  sendSessionReady: 'we decided to send it',
  sendActivationReminder: 'we decided to send it',
  sendFeedbackRequest: 'we decided to send it',
  sendStalledNotification: 'we decided to send it',
  /*
   * BOTH SIDES OF RUNNING OUT OF TIME, and both are ours to send rather than asked for.
   *
   * The warning is the one that matters: every check-in that ever stalled did so with no notice at
   * all, and somebody who has switched reminders off has switched off being chased about answering
   * - not being told that the thing they are running is about to shut. Classified honestly all the
   * same, so the switch decides it rather than me.
   */
  sendTimeRunningOut: 'we decided to send it',
  sendReopenedNotification: 'we decided to send it',
  sendParticipantBlockedNudge: 'we decided to send it',
  /* About a code whose time is running out: billing, so the opt-out never stops it (decision 109 item 5). */
  sendCodeExpiryReminder: 'about paying',
  /* The free month ending (15 October): billing, so the opt-out never stops it (decision 109 item 5), but it is still the admin's one
     routine message that day, and the sweep sends it only in the organisation's working day. */
  sendFreeMonthEndsSoon: 'about paying',
  /* The four weeks after the free month (2 November): how long is left before Groundwork pauses, and how to pay. Billing, so the
     opt-out never stops it, and never held back by the day's one routine message: a countdown that waits a day says the wrong day. */
  sendGroundworkPausesSoon: 'about paying',
  sendRoundDigest: 'we decided to send it',
  /* The lead's weekly letter on the anchor check-ins. Nobody asked this morning, so the stop link stops it. */
  sendTheLeadsWeeklyLetter: 'we decided to send it',
  /* Nobody asked for it: a lead who has only tried her own check-in is shown one small real next step, once. */
  sendTestCheckInMovesOn: 'we decided to send it',
  /* The one email an existing client gets about what is new, from their own check-ins. */
  sendHeresWhatIsNew: 'we decided to send it',
  /* A person's own week, from their own board. Nobody asked for it this morning. */
  sendYourWeek: 'we decided to send it',
  /* The lead who set a check-in up and added nobody. */
  sendLeadFirstCheckIn: 'we decided to send it',
  /* A week after a report, if the lead has not opened a next session. */
  sendTheReportFollowUp: 'we decided to send it',
  /* Invited, and nobody has started: what Groundwork is doing, told to the lead once while it does it. */
  sendWaitingOnThePeople: 'we decided to send it',
  /* People have stopped answering: told to the lead once a week as an insight. */
  sendWhoHasGoneQuiet: 'we decided to send it',
  /* Decision 136's notice: unclassified it was already treated this way; now it says so. */
  sendMissedCheckIns: 'we decided to send it',
  /* What is outstanding for a lead, once each morning when something is (decision 120). */
  sendTheLeadsDailyNudge: 'we decided to send it',
  /* The direct morning (behind organizations.direct_morning_on): the lead's daily summary in its four parts. It is sent under the daily nudge's name, so it is still her one routine message of the day. */
  sendTheDirectMorning: 'we decided to send it',
  /* A message WhatsApp could not take, by email instead (whatsapp/by-email-instead.ts): the day's routine one and a notice are ours to send; the thank-you and the report follow the person's own check-in. */
  sendTheRoutineMessageByEmail: 'we decided to send it',
  sendTheMessageByEmail: 'we decided to send it',
  sendTheAnswerByEmail: 'asked for',
  /* The answer to something a team member forwarded to their assistant: they did something, and this is the reply. */
  sendTheAssistantsReply: 'asked for',
  /* The year-end files: the principal's own work, handed over (Fatima, increment 4). Held for quiet hours, never the day's routine message. */
  sendTheYearEndFiles: 'asked for',
  /* An introduction somebody asked for by adding a person or naming a contact, with their go-ahead (executive-onboarding). */
  sendTheIntroduction: 'asked for',
  /* A short note that there is new coverage, a gap or a decision: Groundwork decides to send it, so it is the day's routine message. */
  sendTheYearEndProgress: 'we decided to send it',
};

export function whatThisMailIs(sender: string): WhatKindOfMail {
  return WHAT_EACH_MAIL_IS[sender] ?? 'we decided to send it';
}
