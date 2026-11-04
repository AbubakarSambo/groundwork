/**
 * ANYTHING IT CAN SAY, IT CAN SEND.
 *
 * Forty-odd kinds of mail are built and the assistant could reach none of them,
 * so everything it produced went back into the chat and died there. Somebody who
 * wanted what they had just been told — in an inbox, to forward, to read on a
 * train — had to copy it out of a box.
 *
 * THREE RULES, AND THE FIRST TWO ARE ABOUT NOT DOING HARM.
 *
 *   IT GOES TO THEM AND NOBODY ELSE. Sending to a colleague is publishing, and
 *   publishing what an assistant said about somebody's work is a different act
 *   with different consequences. Wanting it is reasonable; it is not this.
 *
 *   IT IS ALWAYS CONFIRMED. Mail leaves the building and cannot be recalled, so
 *   it is never inferred from a sentence that merely sounded like a request.
 *   "Can you send me that" is a question in some rooms.
 *
 *   IT SENDS WHAT WAS ACTUALLY SAID. Not a summary, not a rewrite. Somebody
 *   asking for what they were told should receive what they were told, or the
 *   mail and the conversation disagree and only one of them is in front of them.
 */

/** What the assistant last said, as it was said. */
export interface SomethingToSend {
  /** The reply being sent. */
  body: string;
  /** The question it answered, for the subject line and for the person's memory. */
  about: string;
  /** Which capability produced it, so a reader knows what kind of answer it was. */
  lane: string;
}

export interface WhoItGoesTo {
  displayName: string | null;
  email: string | null;
}

/**
 * Why this cannot be sent, or null.
 *
 * The two refusals a person can act on, said in words that name the fix.
 */
export function whyThisCannotBeSent(
  latest: SomethingToSend | null,
  to: WhoItGoesTo,
): string | null {
  if (!latest) {
    return 'There is nothing to send yet - ask me something first and then say "email me that".';
  }
  if (!to.email) {
    return 'Your organisation has not given me an email address for you, so there is nowhere to send it. Whoever set Groundwork up can add one.';
  }
  return null;
}

/** What to ask before sending. Never a yes/no on something already gone. */
export function askBeforeSending(latest: SomethingToSend, to: WhoItGoesTo): string {
  return `I will email you what I said about "${shorten(latest.about)}", to ${to.email}. Nobody else is copied. Send it?`;
}

/**
 * The mail itself.
 *
 * The subject says what it is about rather than "Groundwork": an inbox full of
 * mail from one sender all called the same thing is an inbox somebody stops
 * opening.
 */
export function theMail(latest: SomethingToSend, to: WhoItGoesTo): { subject: string; text: string } {
  return {
    subject: `Groundwork - ${shorten(latest.about)}`,
    text: [
      to.displayName ? `${to.displayName},` : 'Hello,',
      '',
      `You asked: ${latest.about}`,
      '',
      latest.body,
      '',
      '---',
      'You asked for this in the Groundwork assistant. Nobody else was sent it.',
    ].join('\n'),
  };
}

/** Long enough to recognise, short enough for a subject line. */
function shorten(said: string): string {
  const clean = said.replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '');
  return clean.length <= 60 ? clean : `${clean.slice(0, clean.lastIndexOf(' ', 60))}…`;
}
