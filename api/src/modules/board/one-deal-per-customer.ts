/**
 * ONE DEAL PER CUSTOMER, AND PROOF THAT NAMES THE CUSTOMER COUNTS FOR THE DEAL (pilots, 13 October 2026, problem 2).
 *
 * Kevin sent the Kilele Hotel M-Pesa on day 1, and the board read it correctly. For five days the pipeline still
 * kept Kilele Hotel under "Said to be won, not shown yet", and by day 5 it listed the customer four times:
 * "Kilele Hotel", "Kilele", "Kilele 40" and "Kilele M-Pesa". Two things were wrong, both in code:
 *
 *  - A deal was matched only on its exact name, so every new way of saying the customer made a new deal.
 *    The customer is the deal: "Kilele 40" and "Kilele M-Pesa" are the Kilele deal said with an amount and a
 *    payment method, and "Greenfield" is "Greenfield Supermarket" said short.
 *  - A deal took its proof only from the one line it was last written from. The proof was on another line
 *    ("Proof of payment. The M-Pesa message from Kilele.", backed by Kevin's own screenshot). Any line that names
 *    the customer and is backed by the speaker's own document now shows the deal.
 */
const squash = (s: string) => (s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

/* Words that say how a deal was paid or counted, never who the customer is. */
const NOT_THE_CUSTOMER = /^(?:\d[\d,.]*|m-?pesa|mpesa|payment|paid|order|orders|deal|units?|pcs|invoice|receipt|ksh|kes|deposit|ltd|limited|plc|inc|co|company|llc)$/;
/* "KILELE HOTEL LTD", as an M-Pesa message names the payer, is Kilele Hotel (pilots after fixes, A3). */

/** The customer a deal's name names: its words, without a leading article and without amounts or payment words at the end. */
export function theCustomerIn(name: string | null | undefined): string[] {
  const words = squash(String(name ?? '')).replace(/^(?:a|an|the)\s+/, '').split(' ').filter(Boolean);
  while (words.length > 1 && NOT_THE_CUSTOMER.test(words[words.length - 1])) words.pop();
  return words;
}

/** True when two deal names name the same customer: one name's words begin the other's ("Kilele" and "Kilele Hotel"). */
export function theSameCustomer(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = theCustomerIn(a);
  const y = theCustomerIn(b);
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  /* A single short word is too common to be a customer on its own ("new", "shop"). */
  if (short.length === 1 && short[0].length < 4) return x.join(' ') === y.join(' ');
  return short.every((w, i) => long[i] === w);
}

/**
 * True when a line names this deal's customer, as whole words: the whole name, or its start said short, the
 * way people say it ("Kilele" for Kilele Hotel), by the same rule as theSameCustomer.
 */
export function aLineNamesTheCustomer(line: string, dealName: string): boolean {
  const who = theCustomerIn(dealName);
  if (!who.length) return false;
  const words = squash(line).split(' ');
  for (let i = 0; i < words.length; i++) {
    let n = 0;
    while (n < who.length && words[i + n] === who[n]) n++;
    if (n === who.length || (n > 0 && theSameCustomer(who.slice(0, n).join(' '), who.join(' ')))) return true;
  }
  return false;
}

/** Whether any line this reader may read, naming the customer, is backed by the speaker's own document. */
export function proofNamesTheDeal(dealName: string, lines: { text: string; mark: string; documentBy?: string | null }[], dealOwnerId?: string | null): boolean {
  /*
   * And a line backed by the deal owner's own document, whoever said it (pilots after fixes, A3): Kevin's M-Pesa photo
   * ("Ksh496,000.00 received from KILELE HOTEL LTD") was put under Grace's "Kevin sold Kilele 40 units, paid", so no line
   * was "the speaker's own document" and Kilele stayed "Said to be won, not shown yet" for five days. Proof given counts
   * (Hafsah, 12 October).
   */
  return lines.some((l) => (l.mark === 'proven' || (!!dealOwnerId && l.documentBy === dealOwnerId)) && aLineNamesTheCustomer(l.text, dealName));
}
