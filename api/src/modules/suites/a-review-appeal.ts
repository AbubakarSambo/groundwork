/**
 * APPEALING A DECIDED REVIEW (decision 113, bug B-024; decision 6 applies to the reviews suite too).
 *
 * The person a review is about can appeal it once it is decided, saying why, and may add to their reasons
 * until it is decided. The appeal goes to an admin who is not the reviewer (whoever decided the review) and
 * is not the person. If there is no such admin, the appeal is saved and stays open, the person is told so
 * plainly, and the reviewer is asked to add a second admin, who then decides it.
 *
 * WHO READS WHAT, decided here and in the-reviews.service.ts, never on the screen:
 *   - the person reads their own appeal, where it stands, and the decision on it with its reasons;
 *   - an admin who may decide it reads the review, the person's side and the appeal, with reasons to add;
 *   - the reviewer reads only that it was appealed and where it stands, until it is decided, and then the
 *     decision on it and its reasons (never the person's reasons while it waits);
 *   - nobody else reads any of it: a lead of the team, a colleague, an admin who is the reviewer or the
 *     person, a guest.
 */

export const APPEAL_OUTCOMES = ['stands', 'changed'] as const;
export type AppealOutcome = (typeof APPEAL_OUTCOMES)[number];

/** The words the server says when it refuses, in plain full sentences. */
export const APPEAL_REFUSED = {
  onlyThePerson: 'Only the person this review is about can appeal it.',
  notDecided: 'This review has not been decided yet, so there is nothing to appeal.',
  alreadyAppealed: 'You have already appealed this decision. You can add to your reasons until it is decided.',
  sayWhy: 'Say why you disagree, in a sentence or two. The admin who decides your appeal reads it.',
  notAppealed: 'This review has not been appealed.',
  alreadyDecided: 'This appeal has already been decided, so nothing more can be added.',
  addSomething: 'Write what you want to add first.',
  tooMany: 'You have added as much as can be kept. Please wait for the admin to decide.',
  onlyAnAdmin: 'Only an admin of this organisation decides an appeal.',
  yourOwnReview: 'This is about your own review, so another admin decides the appeal.',
  yourOwnDecision: 'You decided this review, so another admin decides the appeal.',
  keepOrChange: 'Choose whether the decision stands or is changed.',
  sayWhyToBoth: 'Say why. The person and the reviewer both read your reasons.',
  sayWhatItIsNow: 'Say what the decision is now.',
  appealedAlready: 'This decision has been appealed, so an admin other than you decides it now.',
  wordsKept: 'This decision has been appealed, so the review stays as it was when it was appealed. An admin other than you decides the appeal.',
};

/** Where an appeal stands. */
export type AppealStands = 'with-an-admin' | 'needs-another-admin' | 'decided';

export interface AppealAddition { said: string; at: string }

/** What is stored on the review about its appeal. */
export interface TheStoredAppeal {
  appeal?: string | null;
  appealAdditions?: unknown;
  appealedAt?: Date | string | null;
  appealOutcome?: string | null;
  appealReasons?: string | null;
  appealDecidedById?: string | null;
  appealDecidedAt?: Date | string | null;
  appealDecisionWas?: unknown;
  appealAskedForAdminAt?: Date | string | null;
}

export const wasAppealed = (r: TheStoredAppeal): boolean => !!r.appeal?.trim();
export const wasAppealDecided = (r: TheStoredAppeal): boolean => !!r.appealOutcome;

const day = (d: Date | string): string => new Date(d).toISOString().slice(0, 10);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const aDaySaid = (d: Date | string): string => {
  const x = new Date(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
};

export const theAdditions = (r: TheStoredAppeal): AppealAddition[] =>
  (Array.isArray(r.appealAdditions) ? (r.appealAdditions as any[]) : [])
    .filter((a) => a && typeof a.said === 'string' && a.said.trim())
    .map((a) => ({ said: String(a.said), at: String(a.at ?? '') }));

/** What the person reads when the review is decided and they have not appealed. */
export function youMayAppealSaid(reviewerFirstName: string | null): string {
  const who = reviewerFirstName?.trim() || 'the person who decided it';
  return `If you disagree with this decision, you can appeal it. An admin other than ${who} reads the review, your side and your reasons, and decides.`;
}

/** What the person reads once they have appealed. */
export function yourAppealSaid(stands: AppealStands, reviewerFirstName: string | null, outcome: string | null, deciderFirstName: string | null): string {
  const reviewer = reviewerFirstName?.trim() || 'the person who decided your review';
  if (stands === 'decided') {
    const who = deciderFirstName?.trim() || 'An admin';
    return outcome === 'changed'
      ? `${who}, an admin, has read your appeal and has changed the decision. You can read the new decision and the reasons below.`
      : `${who}, an admin, has read your appeal, and the decision stands. You can read the reasons below.`;
  }
  if (stands === 'needs-another-admin') {
    return `You have appealed this decision, and your appeal is saved. It needs an admin other than ${reviewer}, and there is not one yet. ${reviewer.charAt(0).toUpperCase()}${reviewer.slice(1)} has been asked to add a second admin, and that admin will decide your appeal. You can add to your reasons until then.`;
  }
  return `You have appealed this decision. An admin other than ${reviewer} reads your reasons and decides. You can add to your reasons until then.`;
}

/** What the reviewer reads while the appeal waits: that it was appealed and where it stands, and never the reasons. */
export function theReviewerReadsSaid(stands: AppealStands, personFirstName: string, reviewerIsAnAdmin: boolean, outcome: string | null, deciderFirstName: string | null): string {
  if (stands === 'decided') {
    const who = deciderFirstName?.trim() || 'An admin';
    return outcome === 'changed'
      ? `${personFirstName} appealed your decision. ${who}, an admin, has read the appeal and has changed the decision. You can read the new decision and the reasons below.`
      : `${personFirstName} appealed your decision. ${who}, an admin, has read the appeal, and the decision stands. You can read the reasons below.`;
  }
  if (stands === 'needs-another-admin') {
    return reviewerIsAnAdmin
      ? `${personFirstName} has appealed your decision. It needs an admin other than you to decide it, and there is not one yet. Please add a second admin to Groundwork. Once you have, that admin decides the appeal.`
      : `${personFirstName} has appealed your decision. It needs an admin to decide it, and there is not one other than you yet. Please add a second admin to Groundwork, or ask an admin of your organisation to. Once there is one, that admin decides the appeal.`;
  }
  return `${personFirstName} has appealed your decision. An admin other than you reads the review, ${personFirstName}'s side and the reasons, and decides.`;
}

/** What an admin who may decide it reads. */
export function theAdminReadsSaid(stands: AppealStands, personFirstName: string, reviewerFirstName: string | null, appealedOn: string, deciderFirstName: string | null, outcome: string | null): string {
  const reviewer = reviewerFirstName?.trim() || 'the person who decided it';
  if (stands === 'decided') {
    const who = deciderFirstName?.trim() || 'An admin';
    return outcome === 'changed'
      ? `${personFirstName} appealed the decision on ${appealedOn}. ${who}, an admin, read the appeal and changed the decision.`
      : `${personFirstName} appealed the decision on ${appealedOn}. ${who}, an admin, read the appeal, and the decision stands.`;
  }
  return `${personFirstName} appealed ${reviewer}'s decision on ${appealedOn}. You are an admin who did not decide this review, so you decide the appeal. ${personFirstName} and ${reviewer} both read your reasons. If you change the decision, your reasons become the reasons for the new decision, and everyone who may read the review reads them.`;
}

// -- The messages, to the people who need them. Full sentences; never a word of the review or the reasons.

export interface TheMessage { subject: string; lines: string[]; linkLabel: string }

/** To an admin who may decide it. The person is called by name; "their" is never used for a person who has been named. */
export function anAppealWaitsForYou(adminFirstName: string | null, personFirstName: string, reviewerFirstName: string | null): TheMessage {
  const reviewer = reviewerFirstName?.trim() || 'the person who decided it';
  return {
    subject: `${personFirstName} has appealed a decision on a review`,
    lines: [
      `Hi ${adminFirstName?.trim() || 'there'},`,
      `${personFirstName} has appealed ${reviewer}'s decision on ${personFirstName}'s review. You are an admin who did not decide it, so you decide the appeal.`,
      `Open Groundwork to read the review, ${personFirstName}'s side and the reasons ${personFirstName} gave, and then say whether the decision stands or is changed.`,
    ],
    linkLabel: 'Read the appeal',
  };
}

/** To the reviewer, when there is no other admin. */
export function pleaseAddASecondAdmin(reviewerFirstName: string | null, personFirstName: string, reviewerIsAnAdmin: boolean): TheMessage {
  return {
    subject: `${personFirstName} has appealed your decision, and it needs a second admin`,
    lines: [
      `Hi ${reviewerFirstName?.trim() || 'there'},`,
      `${personFirstName} has appealed your decision on ${personFirstName}'s review. An appeal has to be decided by an admin who is not you, and your organisation does not have another one yet.`,
      reviewerIsAnAdmin
        ? 'Please add a second admin to Groundwork. The appeal is saved and stays open, and that admin decides it as soon as they are added.'
        : 'Please add a second admin to Groundwork, or ask an admin of your organisation to. The appeal is saved and stays open, and that admin decides it as soon as they are added.',
    ],
    linkLabel: 'Open Groundwork',
  };
}

/** To the person and the reviewer, when it is decided: who decided it and what the outcome is, and never the reasons themselves. */
export function theAppealWasDecided(firstName: string | null, whoDecidedFirstName: string | null, forThePerson: boolean, personFirstName: string, outcome: string | null): TheMessage {
  const who = whoDecidedFirstName?.trim() || 'An admin';
  const changed = outcome === 'changed';
  return {
    subject: forThePerson
      ? `Your appeal was decided, and the decision ${changed ? 'was changed' : 'stands'}`
      : `${personFirstName}'s appeal was decided, and your decision ${changed ? 'was changed' : 'stands'}`,
    lines: [
      `Hi ${firstName?.trim() || 'there'},`,
      forThePerson
        ? `${who}, an admin, has read your appeal of the decision on your review. ${changed ? 'The decision has been changed.' : 'The decision stands.'}`
        : `${who}, an admin, has read ${personFirstName}'s appeal of your decision on ${personFirstName}'s review. ${changed ? 'The decision has been changed.' : 'The decision stands.'}`,
      'Open Groundwork to read the decision and the reasons.',
    ],
    linkLabel: 'Read the decision',
  };
}

export { day as dayOfAppeal };
