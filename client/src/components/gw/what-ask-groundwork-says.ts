/**
 * The panel's own words, from the prototype's screens (docs/prototype/screens/D1-ask-groundwork/*.txt).
 * Everything else in the panel is what Ask Groundwork answers, which is the server's.
 */
export const PRIVATE_LINE =
  'Your questions and the answers are private. Only you see them. They are never part of your check-in or a report.'

export const openingLine = (label: string) => `Ask me about ${label}: a deal, a target, or what to do next.`

/**
 * The three questions under the opening line (ask-on-a-phone.txt). The first is the prototype's own; the
 * other two are the prototype's "Why is ... next quarter?" and "Will we reach 25?" made general, because
 * a real check-in has its own deals and numbers.
 */
export const SUGGESTED_QUESTIONS = ['What should I do next?', 'What is due?', 'Will we reach our target?']
