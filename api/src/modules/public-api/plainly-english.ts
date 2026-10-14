/**
 * A MESSAGE THAT IS PLAINLY ENGLISH IS READ AS ENGLISH (5 Oct 2026, WhatsApp journeys run oct5b).
 *
 * Kesi wrote, in English, "This week I signed the Naivas order for 600,000 shillings, and the Quickmart
 * one is still waiting for their buyer." The one-word language read answered Swahili, so her report came
 * to her phone translated into Swahili although every word she wrote was English. Kenyan shop names and
 * "shillings" are not Swahili; "this", "I", "the", "and", "for", "is" and "their" are English.
 *
 * So the model is asked only when the message is not plainly English. Plainly English means at least
 * four words, of which at least a quarter are among the commonest English words. A message mostly in
 * Swahili, Hausa, Yoruba or another language has few of these and still goes to the model.
 */
const COMMON_ENGLISH = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'i', 'we', 'you', 'he', 'she', 'it',
  'they', 'my', 'our', 'your', 'his', 'her', 'their', 'this', 'that', 'these', 'those', 'to', 'of', 'in', 'on', 'for', 'with',
  'at', 'by', 'from', 'will', 'would', 'have', 'has', 'had', 'not', 'no', 'do', 'did', 'does', 'so', 'because', 'still', 'what',
  'who', 'when', 'all', 'can', 'could', 'need', 'about', 'next', 'week', 'yes',
]);

export function plainlyEnglish(text: string): boolean {
  const words = (text.toLowerCase().match(/[a-z']+/g) ?? []).map((w) => w.replace(/'.*$/, ''));
  if (words.length < 4) return false;
  const common = words.filter((w) => COMMON_ENGLISH.has(w)).length;
  return common / words.length >= 0.25;
}

/**
 * THE LANGUAGE A PERSON IS ANSWERED IN FOLLOWS THEIR OWN MESSAGES (reviewer, 14 October). What they wrote in this
 * check-in, taken together, that is plainly English is English, whatever one early read stored.
 */
export function theLanguageOfTheirOwnWords(theirWords: string[], stored: string | null | undefined): string | null {
  const all = theirWords.map((w) => (w ?? '').trim()).filter(Boolean).join(' ');
  if (all && plainlyEnglish(all)) return 'en';
  return stored ?? null;
}
