/**
 * THE FOUR THINGS THIS PRODUCT SAYS ABOUT WHAT HAPPENS TO SOMEBODY'S WORDS.
 *
 * Lifted out of the check-in screen, unchanged, because a second surface now needs to say them: an
 * admin rolling this out to 160 people cannot ask their company to answer questions honestly
 * without being able to show, up front, what will be read and by whom.
 *
 * IN ONE PLACE BECAUSE THIS IS A PRIVACY CLAIM. Two copies of a promise drift, and the version an
 * admin shows their staff before the rollout would end up saying something the product no longer
 * does. The wording here is calibrated: every line is true and testable today, and the last one
 * exists because we are not going to claim the words are unreadable to any human being anywhere
 * while they are stored unencrypted and processed by Google's models. A privacy claim caught being
 * false costs more than one never made.
 *
 * The check-in screen renders these exactly as it did before - this changed where the sentences
 * live, not the screen.
 */
export interface Claim {
  title: string;
  body: string;
  /** The one that is a limitation rather than a promise. Rendered quieter, never dropped. */
  plain?: boolean;
}

export const WHAT_HAPPENS_TO_WHAT_YOU_WRITE: Claim[] = [
  {
    title: 'Nobody you work with reads it',
    body: 'Not your manager, not whoever set this up, not an admin. What they see is the shared report, which is built by comparing everyone\'s accounts. Your own words about your own work can appear in it. Anything you say about somebody else never does, and it never says who said what about whom.',
  },
  {
    title: 'We cannot show it to ourselves either',
    body: 'When we look at a check-in to help with something, we can see whether people checked in and never what they said. That is enforced in the code and tested, not a policy we are asking you to trust.',
  },
  {
    title: 'Nothing here trains a model',
    body: 'Your answers are used to build this record and nothing else.',
  },
  {
    title: 'And the part we are not going to dress up',
    body: 'Your answers are stored on our servers, and they are processed by Google\'s models to build the record. We are not going to tell you they are unreadable to any human being anywhere, because that would not be true yet.',
    plain: true,
  },
];
