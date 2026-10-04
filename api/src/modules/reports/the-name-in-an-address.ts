/**
 * THE NAME IN AN ADDRESS, FOR SOMEBODY INVITED BY ADDRESS WHO HAS NOT GIVEN ONE.
 *
 * The Context tab named a colleague "Amani Wekesa" from "amani.wekesa@..." while the board called the
 * same person "One colleague". The client (`theNameOrAddress`) and the documents reader
 * (`theNameWeUseFor`) already read the name out of the address; the board and the reports did not.
 * This is the same read, in one place, for them.
 *
 * Only where the address holds a first and a last name in letters ("amani.wekesa@"); "sam@" is a handle and no name is made up from it. A desk ("info@", "accounts@"), an address with
 * digits in it ("zawadi.u8@") and the placeholder address of somebody never invited by address all
 * give nothing, and the reader gets the plain words ("a colleague") as before. The person's own
 * name, and the name they were given when invited, always come first.
 */
const NOT_A_PERSON = new Set([
  'info', 'hello', 'admin', 'sales', 'support', 'contact', 'team', 'office', 'accounts', 'finance',
  'hr', 'billing', 'help', 'enquiries', 'inquiries', 'noreply', 'no reply', 'mail', 'post',
]);

export function theNameInAnAddress(email: string | null | undefined): string | null {
  const address = (email ?? '').trim();
  if (!address || address.toLowerCase().endsWith('@unclaimed.invalid')) return null;
  const words = (address.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim();
  if (words.length < 2 || NOT_A_PERSON.has(words.toLowerCase()) || /[^\p{L}\s]/u.test(words)) return null;
  /* A first and a last name, each of two letters or more. A single word ("sam@") is a handle, and no first name is made up from it. */
  const parts = words.split(/\s+/);
  if (parts.length < 2 || parts.some((w) => w.length < 2)) return null;
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
