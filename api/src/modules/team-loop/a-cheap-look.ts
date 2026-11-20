import { isACorrection } from '../assistant/a-correction-said-in-ask';

/**
 * THE CHEAP LOOK FIRST, so a model reads only words that could be about the team loop. It decides nothing. Whether words are a standing instruction
 * is no longer looked for by a list of words (round 1, I-08): the model reads what she means (the-team-mind.ts), and code checks it
 * (standing-instructions.ts).
 */
export const mightBeACorrection = (message: string): boolean => isACorrection(message);
