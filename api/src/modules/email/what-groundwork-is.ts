/**
 * WHAT GROUNDWORK IS, ON THE MAILS WHERE SOMEBODY MIGHT NOT KNOW.
 *
 * Of the 110 emails a hundred audited journeys produced, not one named the organisation the
 * check-in belonged to, and 54 never said who can see what the reader writes. That is not a copy
 * problem: half of these mails go to somebody who has met the product once, for ten minutes, and
 * what they believe happens to their words decides what they write down. A record built on a
 * misunderstanding about privacy is a worse record.
 *
 * SO IT IS APPENDED BY THE SENDER, NOT WRITTEN INTO EACH TEMPLATE. Forty-two senders means
 * forty-two chances to forget, and the ones that forgot were exactly the ones nobody had read
 * recently.
 *
 * AND NOT ON EVERY MAIL. A sign-in link does not need a paragraph about who reads a check-in — a
 * person clicking one is not writing anything, and a footer on a one-line mail is noise that
 * teaches people to skip footers. `WHAT_EACH_MAIL_IS` already classifies every sender for the
 * opt-out rule, and it happens to draw exactly the right line: "the way back in" is a door, and
 * everything else is about the work.
 */
import { whatThisMailIs } from './nothing-goes-out-that-was-turned-off';
import { whoSeesWhatYouSayIn } from './who-sees-what-you-say';

/** The public page that says where answers are kept and who processes them (marketing/src/pages/privacy-and-ai.astro). */
export const HOW_GROUNDWORK_HANDLES_YOUR_ANSWERS_URL = 'https://myground.work/privacy-and-ai';

/** True where this footer belongs. */
/**
 * MAIL THAT IS NOT ABOUT WHAT SOMEBODY SAID IN ONE CHECK-IN (decision 109 review; existing-users check, section 15). The paragraph tells a person who can read what
 * they write in a check-in, which is untrue to say under the participant's own week ("Only you can read this") and beside the point on a lead's message about how many
 * have answered, what is new, or what to do next. Those leave it off.
 */
export const NOT_ABOUT_ONE_CHECK_INS_ANSWERS: ReadonlySet<string> = new Set([
  'sendYourWeek', 'sendHeresWhatIsNew', 'sendTestCheckInMovesOn', 'sendLeadFirstCheckIn', 'sendTheReportFollowUp', 'sendWhoHasGoneQuiet', 'sendWaitingOnThePeople', 'sendTheLeadsWeeklyLetter', 'sendTheLeadsDailyNudge',
]);

/**
 * MAIL THAT IS NOT ABOUT WHAT ANYBODY SAID, OR THAT IS NOT WRITTEN TO THE PERSON WHO SAID IT (engagement review, 8 October).
 *
 * The paragraph says "The people in this check-in, including your manager, can see what you say in it." That is true under a reminder to answer. It is not
 * true under a review appeal that goes to an admin, under a message to the back-office team, under a bill, an API decision, a request somebody decided, a
 * person let into the organisation, or a lead's notice that somebody has checked in (the lead is not the person who said it). Those leave it off, and a
 * mail that is not listed here and is not "the way back in" still carries it, as before.
 */
export const NOT_WRITTEN_TO_THE_PERSON_WHO_SAID_IT: ReadonlySet<string> = new Set([
  /* To the back-office team, and to an admin about a review appeal or an admin added after one (suites/a-review-appeal-told.service.ts). */
  'sendTeamAlert',
  /* To the lead or an admin, about somebody else. */
  'sendParticipantCheckedIn', 'sendWhoHasNotStarted', 'sendMoreTimeAsked', 'sendSomebodyIsWaiting', 'sendParticipantBlockedNudge',
  /* About a request, an approval, a seat or the organisation. */
  'sendApprovalsSummary', 'sendRequestDecided', 'sendGroundApproved', 'sendGroundDeclined', 'sendYouAreInNow', 'sendTheyAreInNow', 'sendTheyWereNotLetIn',
  'sendInviteBounced', 'sendInviteLapsed',
  /* About the API and the running of the product. Mail about money is its own kind ('about paying') and is left off below, by its kind. */
  'sendCoachRequestReceived',
  'sendApiAccessApproved', 'sendApiAccessDeclined', 'sendApiAccessWithdrawn', 'sendWebhookEndpointDying',
]);

export function shouldSayWhatGroundworkIs(sender: string | undefined): boolean {
  if (!sender) return false;
  if (NOT_ABOUT_ONE_CHECK_INS_ANSWERS.has(sender)) return false;
  if (NOT_WRITTEN_TO_THE_PERSON_WHO_SAID_IT.has(sender)) return false;
  /* A bill, a plan, a free month and its four weeks are not about anybody's answers (2 November 2026: every mail about paying, by its kind). */
  if (whatThisMailIs(sender) === 'about paying') return false;
  /* Mail to our own roster about the running of the product is never about a check-in's answers. */
  if (whatThisMailIs(sender) === 'operational') return false;
  /* A door does not need explaining, and a person opening one is not writing anything down. */
  return whatThisMailIs(sender) !== 'the way back in';
}

/**
 * One short paragraph, in the same words the product uses on screen. The sentence about who sees what a person writes is the
 * invitation's own (whoSeesWhatYouSay): what people say in a check-in can be read by the people in it, or only by whoever runs it
 * where the people taking part do not see each other (a cohort, a review). It used to say "What you write is not shown to anybody
 * until the record is released to everybody at the same time, and the record does not quote you", which is not true (decision 4).
 */
export function whatGroundworkIs(whoSees: string): string {
  return '<p style="font-size:13px;color:#4E4236;line-height:1.6;margin-top:20px;border-top:1px solid #EDE5D6;padding-top:12px;">' +
    'Groundwork is where the people involved in a piece of work each say how it is going in their own words, and get one shared record back. ' +
    `${whoSees.replace(/&/g, '&amp;').replace(/</g, '&lt;')} ` +
    `<a href="${HOW_GROUNDWORK_HANDLES_YOUR_ANSWERS_URL}">How Groundwork handles your answers</a></p>`;
}

/** With the wording for a team check-in, for a mail that knows nothing about which check-in it is. */
export const WHAT_GROUNDWORK_IS = whatGroundworkIs(whoSeesWhatYouSayIn(null));

export function withWhatGroundworkIs(html: string, sender: string | undefined, whoSees?: string): string {
  if (!shouldSayWhatGroundworkIs(sender)) return html;
  /* Not twice. Three mails say it in their own words already, and a second copy underneath reads
     as a template that does not know what it has said. */
  if (/Groundwork is where the people involved/.test(html)) return html;
  return html + (whoSees ? whatGroundworkIs(whoSees) : WHAT_GROUNDWORK_IS);
}
