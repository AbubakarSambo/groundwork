/**
 * ASK YOUR TEAM ONE THING: THE FOUR FIELDS, AND WHY THIS ONE IS NOT A CONVERSATION.
 *
 * Every other situation in the product opens a chat, because every other situation needs something
 * worked out: what the aim is, who carries which part, what was agreed. This one needs four answers
 * and none of them is a judgement call - who, what you want to know, how often, send.
 *
 * Hafsah, 18 September 2026, and the whole claim rests on it: "two-minute setup with a same-week
 * payoff". An interview cannot be two minutes, and asking somebody what success looks like before
 * they may ask their team one question is the thing that would kill this card.
 *
 * THE LEAD ASKS, THEY DO NOT ANSWER. "You write one line about what you want to know... they answer
 * on their own link, and the updates come back to you as one picture." So the ground is committed
 * managingOnly: the lead gets the report rather than a session of their own. Somebody who wants to
 * answer their own question can add themselves on Setup afterwards, which is one click and not a
 * question worth spending a field on.
 */

/** Emails as somebody actually pastes them: commas, semicolons, newlines, spaces, or a mix. */
export function theEmailsIn(pasted: string): string[] {
  return [...new Set(
    (pasted ?? '')
      .split(/[\s,;]+/)
      .map((s) => s.trim().replace(/^[<"']+|[>"']+$/g, ''))
      .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s))
      .map((s) => s.toLowerCase()),
  )]
}

/** What somebody typed that was meant to be an email and is not one, so the page can say which. */
export function whatIsNotAnEmail(pasted: string): string[] {
  return (pasted ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s))
}

export type HowOften = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'ONE_TIME'

/** The three rhythms she named, plus the one-off, in the words the lead reads. */
export const HOW_OFTEN: { value: HowOften; label: string }[] = [
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'FORTNIGHTLY', label: 'Every two weeks' },
  { value: 'ONE_TIME', label: 'Just once, by a date' },
]

/**
 * A NAME FOR THE THING, TAKEN FROM THE QUESTION RATHER THAN ASKED FOR.
 *
 * A fifth field would be a fifth reason to abandon this. The lead's own line is the best name it
 * could have, and it is theirs to rename on Setup.
 *
 * THE WHOLE QUESTION, NEVER ITS FIRST WORDS (U.6 review). It took the first six words, so "What
 * moved this week, and what is stuck?" was named "What moved this week, and what" on the lead's
 * header and in the rail. A question cut off in the middle is not a name. A question too long to
 * be a name is named after the topic instead, and a second one with the same name gets ", from
 * <date>" on the API side (four-check-ins-with-the-same-name).
 */
export const THE_TOPIC_NAME = 'Get updates from your team'
export const A_NAME_AT_MOST = 80

export function aNameFromTheQuestion(theOneLine: string): string {
  const whole = (theOneLine ?? '').trim().replace(/\s+/g, ' ')
  if (!whole || whole.length > A_NAME_AT_MOST) return THE_TOPIC_NAME
  return whole
}

/**
 * YOUR OWN EMAIL, SO NOBODY HAS TO SIGN IN FIRST.
 *
 * Hafsah, 18 September 2026: "add your email too so you don't have to sign-in, we will send you a
 * login password." Somebody who has never used this should be able to fill in five things and be
 * done; the way in arrives afterwards, by email, rather than standing between them and sending.
 * Somebody already signed in has answered this already, so the field is filled for them.
 */
export function theOneEmail(typed: string): string | null {
  const one = theEmailsIn(typed)
  return one.length === 1 ? one[0] : null
}

type TheFields = { pasted: string; theOneLine: string; howOften: HowOften; by: string; yourEmail: string }

/** Whether the fields are answered. Nothing else gates sending. */
export function readyToSend(v: TheFields): boolean {
  if (!theEmailsIn(v.pasted).length) return false
  if (v.theOneLine.trim().length < 8) return false
  if (v.howOften === 'ONE_TIME' && !v.by.trim()) return false
  if (!theOneEmail(v.yourEmail)) return false
  return true
}

/** What is still missing, in the order the fields appear, so the page can say it in one line. */
export function whatIsStillNeeded(v: TheFields): string | null {
  if (!theEmailsIn(v.pasted).length) return 'Add at least one email address.'
  if (v.theOneLine.trim().length < 8) return 'Write the one thing you want to ask them.'
  if (v.howOften === 'ONE_TIME' && !v.by.trim()) return 'Pick the date you want it back by.'
  if (!theOneEmail(v.yourEmail)) return 'Add your own email, so the report has somewhere to go.'
  return null
}
