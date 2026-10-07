/**
 * A GREETING WITH NO NAME.
 *
 * 24 of the 110 emails an audit run produced opened with "Hi ," — the account was created from an
 * address alone, so there was no first name to put there, and every template interpolated the
 * empty string anyway. It reads as a broken mail-merge, which is exactly what a phishing filter
 * and a cautious reader are both looking for, on the emails that carry sign-in links.
 *
 * One function, so the twelve templates cannot each decide differently.
 */
export function greeting(name?: string | null): string {
  const said = (name ?? '').trim();
  /* Not a name: a whole address in the name slot reads worse than no name at all. */
  /* Nor "Someone", the word a list uses for a person with no name: a person is never greeted "Hi Someone," in a mail to themselves (review of 1678157c). */
  const usable = said && !said.includes('@') && said.toLowerCase() !== 'someone' ? said : '';
  return usable ? `Hi ${usable},` : 'Hi,';
}
