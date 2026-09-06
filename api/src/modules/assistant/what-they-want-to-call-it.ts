/**
 * THE WORKING TITLE, IN THEIR OWN WORDS.
 *
 * "I want to set an objective for onboarding the September companies" becomes
 * "onboarding the September companies" — the asking removed and nothing else
 * changed.
 *
 * NOT A MODEL PARAPHRASE, and that is the point. This becomes the objective's
 * title if the draft survives, and a title nobody typed is one nobody
 * recognises in a list a fortnight later. It is also the one string in this
 * flow that a customer's own text reaches directly, so it is trimmed by rule
 * rather than rewritten by something that could be talked into rewriting it
 * into something else.
 */

/** Null when there is nothing left after the asking, which means they have not said yet. */
export function whatTheyWantToCallIt(message: string): string | null {
  let said = message.trim();

  /* The asking, from the front. Longest first, so "help me set up an" is not
     half-eaten by "help me set". */
  const ASKING = [
    /^(?:can\s+you\s+)?help\s+(?:me|us)\s+(?:to\s+)?(?:set|write|agree|work\s+out)\s+(?:up\s+)?/i,
    /^(?:i|we)\s+(?:want|need|would\s+like)\s+to\s+(?:set|write|create|start|draft|agree)\s+(?:up\s+)?/i,
    /^(?:let'?s|lets)\s+(?:set|write|create|start|draft|agree)\s+(?:up\s+)?/i,
    /^(?:set|write|create|start|draft|agree)\s+(?:up\s+)?/i,
  ];
  for (const pattern of ASKING) {
    const shorter = said.replace(pattern, '');
    if (shorter !== said) {
      said = shorter.trim();
      break;
    }
  }

  /* The noun they used for the thing, and any article in front of it. */
  said = said
    .replace(/^(?:an?|our|my|the|some)\s+/i, '')
    .replace(/^(?:new\s+)?(?:objectives?|okrs?|goals?|targets?)\s*/i, '')
    .replace(/^(?:for|about|on|around|to)\s+/i, '')
    .replace(/^(?:the\s+)?(?:quarter|period)\s*(?:for|about|on)?\s*/i, '')
    .replace(/[?.!,\s]+$/, '')
    .trim();

  if (said.length < 3) return null;

  /* Long enough to be the message rather than a title. Kept whole rather than
     cut mid-word: a title ending in half a word reads as broken software. */
  if (said.length > 120) {
    const cut = said.slice(0, 120);
    said = cut.slice(0, cut.lastIndexOf(' ')) || cut;
  }

  return said;
}
