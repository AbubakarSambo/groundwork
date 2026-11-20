/**
 * Domain events. Used to decouple modules that would otherwise import each
 * other (e.g. conversation/grounds triggering report generation). Emitters
 * never import the listeners; the listeners live in the reports module.
 */
export const GroundworkEvents = {
  CHECK_IN_COMPLETED: 'checkin.completed',
  /* THE CONVERSATION'S ASSESSMENT IS WRITTEN (conversation/assess-the-conversation.ts). Emitted just after a setup or a check-in
     ends, once its one assessment is ready (or could not be written), on every path that ends one. The readers that moved onto
     the assessment wait for this rather than for the completion, so they never read a conversation before it is assessed. */
  ASSESSMENT_READY: 'assessment.ready',
  /** SOMETHING SETUP GAVE WAS READ, after the save had answered (3 November 2026): the aims and targets it named, then the lead's full
      report. The board listens and is warmed with each as it lands. */
  SETUP_READ: 'ground.setupRead',
  /* THE TEAM IS TOLD. Three things the back office wants to hear about the moment they happen: a
     new organisation, a request for the API, a request for a call or coaching. Listened to in
     back-office/the-team-is-told.service.ts. */
  ORG_SIGNED_UP: 'org.signedUp',
  /* WHAT SOMEBODY SAID ABOUT THEIR TEAM'S SIZE on "Create an organisation" (U.3), asked only while the
     free trial is on. Billing listens, and grants the trial to a team under its size (U.19). */
  ORG_SIZE_SAID: 'org.sizeSaid',
  /* A CHECK-IN WAS STARTED FROM THE ANCHOR LINK, with the anchor switch on (anchor piece 34). Billing listens, and gives
     the anchor's one-month trial while its own setting is on. */
  ANCHOR_CHECK_IN_STARTED: 'anchor.checkInStarted',
  API_ACCESS_ASKED: 'apiAccess.asked',
  CALL_ASKED: 'call.asked',
  /** A session became open to somebody. The moment a host system can tell them, in their own channel. */
  CHECK_IN_OPENED: 'checkin.opened',
  /**
   * EVERY PARTY IS IN FOR A ROUND. Fires once per round, guaranteed by the unique row that records
   * it rather than by anybody remembering to check. This is the event the delivery rule needs -
   * hold a report until the round closes - and it did not exist: the closing rule lived on the
   * client and the server had no idea a round had ended.
   */
  ROUND_COMPLETED: 'round.completed',
  GROUND_ACTIVATED: 'ground.activated',
  /**
   * THE KIND OF WORK WAS READ, WHERE THERE WAS NONE (local test of staging, 15 October). The read runs on its own after a
   * check-in is made, and a lead's first session from /start finishes before it does, so the records that session named
   * (Kevin's Kilimani deal) were never read. The board listens, and reads the finished sessions' records once.
   */
  KIND_OF_WORK_READ: 'ground.kindOfWorkRead',
  /**
   * A HANDOFF WAS NAMED FOR THE FIRST TIME. Only when it clears the board's substance bar, so a
   * passing remark does not become an alert in somebody else's channel.
   */
  BLOCKER_RAISED: 'blocker.raised',
  /** It has been open past the threshold. Fires once per handoff, guaranteed by a stamped column. */
  BLOCKER_ESCALATED: 'blocker.escalated',
  /** A role changed hands and the incoming holder has a brief waiting. */
  HANDOVER_READY: 'handover.ready',
  /** The record suggests a conversation. A human still has to say yes. */
  SCENARIO_PROPOSED: 'scenario.proposed',
  /**
   * AN INVITATION BOUNCED HARD. Recorded correctly for a long time, and then nothing happened: no mail
   * to the lead who invited them, and the sweeps kept writing to the dead address. Listened to in
   * email/invite-bounced.listener.ts.
   */
  INVITE_BOUNCED: 'invite.bounced',
  /** Mail arrived at an organisation's assistant address (not hello@). Handled in public-api/a-forward-from-a-team-member.service.ts. */
  MAIL_FOR_AN_ASSISTANT: 'mail.for.an.assistant',
  /**
   * SOMETHING THEY SAID THEY WOULD DO WAS SETTLED, done or not done (week 9): by the check-in's own
   * words after it finished, or by the person by hand. Settling from a check-in is a model call that
   * finishes after CHECK_IN_COMPLETED has already fired, so anything counted from settled commitments
   * (a suggestion, week 10) listens for this too, or it would always read the record one check-in late.
   */
  COMMITMENTS_SETTLED: 'commitments.settled',
  /**
   * SOMEBODY WAS MADE AN ADMIN of an organisation. The reviews suite listens, so an appeal that waits for an admin
   * other than the reviewer is told to them at once (decision 113, suites/an-appeal-waits-for-a-new-admin.ts).
   */
  ADMIN_MADE: 'admin.made',
} as const;

export interface AdminMadeEvent {
  organizationId: string;
  userId: string;
}

export interface CommitmentsSettledEvent {
  groundId: string;
  participantId: string;
}

export interface InviteBouncedEvent {
  participantId: string;
  email: string;
  detail: string | null;
}

export interface CheckInCompletedEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
  /** Absent when a person completed it. The sweep says 'auto-close'; the backstop re-emitting a lost event says 'repair', so a listener can tell news from a retry. */
  source?: 'auto-close' | 'repair';
}

export interface AssessmentReadyEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
  howItEnded: 'finished by the person' | 'closed by the clock' | 'declined' | 'setup saved' | 'missed';
}

export interface CheckInOpenedEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
  /** The customer's own id for the person, when the roster knows them. Null otherwise. */
  personExternalId: string | null;
}

export interface RoundCompletedEvent {
  groundId: string;
  sessionNumber: number;
  /** Who the round was waiting on, as it stood when it closed. */
  participantCount: number;
  /**
   * From the record, for what a person reads (reviewer, 14 October): how many the session waited on
   * once leave was taken off, and how many of them actually gave an account (a refusal or a session
   * the clock closed with nothing said is not one). The digest said "Everyone has checked in... 3
   * people took part" when only the lead had.
   */
  waitedOn?: number;
  accountsGiven?: number;
}

export interface GroundActivatedEvent {
  groundId: string;
}

export interface KindOfWorkReadEvent {
  groundId: string;
}

/**
 * Carries ids and nothing else on purpose. What a handoff is about is verbatim something a person
 * said, and who it sits between names two people - neither belongs in an event that a listener may
 * forward outside the boundary. A listener that needs more can read it under authorisation.
 */
export interface ScenarioProposedEvent {
  candidateId: string;
  organizationId: string;
  scenario: string;
}

export interface HandoverReadyEvent {
  roleAssignmentId: string;
  organizationId: string;
  /** Whether the role genuinely had nothing outstanding - different from a brief that failed. */
  empty: boolean;
}

export interface BlockerEvent {
  blockerId: string;
  groundId: string;
  /** Only on an escalation. */
  waitingDays?: number;
}

/* A plain constant for the one file that may not carry the product's name (see
   nobody-connects-without-being-let-in.spec: no exemption for us anywhere in the access gate). */
export const API_ACCESS_ASKED_EVENT = 'apiAccess.asked';

export interface AnchorCheckInStartedEvent {
  organizationId: string;
  groundId: string;
}

export interface OrgSizeSaidEvent {
  organizationId: string;
  said: 'fewer' | 'more';
  /** The team size they were shown, which is the trial's size at the moment they answered. */
  line: number;
}

export interface OrgSignedUpEvent {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
  /** True when the organisation was made by a sign-up that never asks the team's size, whether it was named on the form or left blank (decision 121, item 3). */
  namedOnTheForm?: boolean;
}

export interface ApiAccessAskedEvent {
  organizationId: string;
  askedByUserId: string;
  whatFor: string;
}

/**
 * One event for "somebody asked to talk to us", whichever door they came through. A signed-in
 * request carries the organisation and the user; a request from the public talk-to-us page carries
 * neither, only a name, an address and the organisation name they typed. Widened rather than given
 * a sibling (fix plan F12): a second event for the same fact is how a coaching request came to be
 * written to a table nobody was told about.
 */
export interface CallAskedEvent {
  organizationId: string | null;
  askedByUserId: string | null;
  /** Who asked, when there is no account to look up. */
  requester?: { name: string; email: string; orgName: string } | null;
  /** CALL, COACHING, HANDS_ON or INTEGRATION. */
  subject: string;
  note: string | null;
}

export interface SetupReadEvent {
  groundId: string;
}
