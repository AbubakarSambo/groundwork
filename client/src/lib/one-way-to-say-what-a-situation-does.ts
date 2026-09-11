/**
 * WHAT CHOOSING A SITUATION DOES, SAID ONE WAY.
 *
 * Two surfaces open the same job and opened it differently. The entry chat asked "What brings you
 * here? Describe it in your own words, or choose a situation to set the context for what you want
 * people to check in on or provide updates about." The wizard's situation step said "Pick the
 * closest fit: it sets the questions people are asked and how often."
 *
 * Read side by side they are two products. The second is also the framing she had already rejected
 * on the first: asking somebody to pick the closest fit asks them to classify themselves, which is a
 * question about us, and leaves them guessing what picking one would do. What it actually does is
 * set the context the people they invite will be asked about, so both say that now.
 *
 * ONE CONSTANT RATHER THAN TWO MATCHING STRINGS, because two matching strings in two files is the
 * state these were already in the last time one of them was improved and the other was not.
 */
export const DESCRIBE_YOUR_OWN = 'Describe it in your own words'

export const OR_CHOOSE_A_SITUATION =
  'choose a situation to set the context for what you want people to check in on or provide updates about'

/** The whole invitation, for a surface that opens on it. */
export const HOW_A_SITUATION_IS_CHOSEN = `${DESCRIBE_YOUR_OWN}, or ${OR_CHOOSE_A_SITUATION}.`
