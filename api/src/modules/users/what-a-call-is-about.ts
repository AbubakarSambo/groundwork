/**
 * FOUR THINGS SOMEBODY MIGHT WANT TO TALK ABOUT, AND ONE REQUEST.
 *
 * Coaching, setup help and integration support are not products with buy buttons. Each is a
 * person's time, priced from rather than at, and none of them can be quoted from a form: a
 * two-system sync and a whole HR platform are not the same week of work. So all three end the same
 * way - somebody asks for a call, our team talks to them, and what they agreed is invoiced
 * afterwards by hand.
 *
 * THE SUBJECT IS NOT A PERMISSION. It says what the call is about so whoever picks it up knows
 * before ringing back, and it does nothing else. Nothing here is gated on a subscription: the
 * services are for subscribers, our team says so on the call, and the person deciding whether to
 * subscribe at all is exactly the person who should be able to ask a question. Nothing is charged
 * automatically, so an unqualified request costs a phone call and no money.
 */

export type Subject = 'CALL' | 'COACHING' | 'HANDS_ON' | 'INTEGRATION';

export const SUBJECTS: Subject[] = ['CALL', 'COACHING', 'HANDS_ON', 'INTEGRATION'];

/** What each is, in the words the person asking would use. Shown in the queue, not to them. */
export const WHAT_IT_IS_ABOUT: Record<Subject, string> = {
  CALL: 'Something else',
  COACHING: 'A coach in the room',
  HANDS_ON: 'Setting them up and training the team',
  INTEGRATION: 'Connecting Groundwork to their systems',
};

export function isASubject(value: unknown): value is Subject {
  return typeof value === 'string' && (SUBJECTS as string[]).includes(value);
}

/**
 * ONE OPEN REQUEST PER SUBJECT, WHICH THE ORIGINAL RULE GOT RIGHT FOR THE WRONG NUMBER OF THINGS.
 *
 * It was one open request per organisation, correct when there was one thing to ask about. With
 * four, it means asking for a coach silently swallows a later request for integration help: the
 * second click reports success, nothing new is written down, and nobody ever rings back about the
 * second thing.
 *
 * Clicking the SAME one twice is still somebody checking the first click worked, and still must not
 * put the same company in the queue twice.
 */
export function alreadyOpen<T extends { kind: string }>(subject: Subject, open: T[]): T | undefined {
  return open.find((o) => o.kind === subject);
}
