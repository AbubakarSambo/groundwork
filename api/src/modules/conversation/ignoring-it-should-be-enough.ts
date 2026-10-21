/**
 * THE INVITATION MAKES A PROMISE THE REMINDERS BREAK.
 *
 * The invitation ends like this, and it means it:
 *
 *     "You are never obligated to take part. If you would rather not, you can simply ignore
 *      this - declining is never shown as a negative."
 *
 * Ignoring it does not work. The nudge goes out three days later, and again after that, and the
 * nudge has no way out of its own - so the only person who can stop being chased is somebody who
 * accepts the invitation, makes an account, opens the check-in and answers a willingness question
 * with a no. You have to join in order to leave.
 *
 * That is worse than an oversight. We told them ignoring was enough, and then chased them for
 * doing exactly what we said they could do. The person it lands on has no account here, did not
 * ask for any of this, and every reminder is from a company they have no relationship with.
 *
 * SO: a link on the invitation and on every reminder, needing no login.
 *
 * WHAT IT IS NOT is the important half. It does not decline for them, and it records nothing about
 * whether they will take part. "Stop reminding me" and "no" are two different sentences: the first
 * is about our behaviour and is theirs to have for the asking, the second is a decision that shows
 * on somebody's board and belongs to them alone. Their invitation keeps working afterwards, which
 * is also why the link is safe to reach by GET - a mail-security scanner that follows it stops
 * some reminders and loses nobody anything, where one that could decline for them would put a
 * false answer in front of their lead.
 */

/** What the link says on the mail. Plain, and it does not thank them for anything. */
/* With the direct morning on (email/a-direct-email.ts) the way out is the link alone, without the note about what is recorded. */
export const STOP_LINE = (url: string, direct = false): string =>
  `<p style="font-size:13px;color:#4E4236;margin-top:22px;">` +
  `Would you rather we stopped reminding you? <a href="${url}" style="color:#4E4236;">Stop the reminders</a>.` +
  (direct ? '' : ` Your invitation keeps working, and nothing is recorded either way.`) +
  `</p>`;

/** And what the page says back, once. It has to be believable to somebody who has had enough. */
export const WHAT_WE_SAY_WHEN_THEY_ASK =
  'No more reminders about this from us. We have recorded nothing about whether you are taking part, ' +
  'and your invitation still works if you change your mind.';

export const ALREADY_STOPPED =
  'We had already stopped. No reminders about this are going to you.';

export const NOT_A_LINK_WE_KNOW =
  'That link does not match anything, which usually means the reminders were already stopped or the ' +
  'check-in has closed. Either way nothing more is going to you from it.';

export type MayWeRemindThem = {
  /** Set the moment they asked us to stop. */
  remindersStoppedAt?: Date | string | null;
};

/**
 * The one question the nudge has to ask before it goes. Returns the reason NOT to, so the caller
 * can say it out loud rather than silently skipping somebody.
 */
export function whyNotRemindThem(party: MayWeRemindThem): string | null {
  return party.remindersStoppedAt
    ? 'they asked us to stop reminding them, which the invitation told them they could do'
    : null;
}
