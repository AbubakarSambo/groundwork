/**
 * WHAT KIND OF STRIPE KEY IS SET, FROM THE KEY'S OWN PREFIX (clean-install run, 6 October).
 *
 * The back office said "A Stripe key is set ... Live" for the placeholder test key that the clean install
 * ran with. A secret key whose second part is `test` is Stripe's test mode, one whose second part is `live`
 * takes real money, and one made of dots, the word "placeholder", "xxx" or the like is not a key at all.
 * The key itself is never returned, only this word.
 */
export type TheKindOfKey = 'none' | 'placeholder' | 'test' | 'live' | 'unknown';

export function theKindOfStripeKey(key: string | null | undefined): TheKindOfKey {
  const k = (key ?? '').trim();
  if (!k) return 'none';
  const m = /^(?:sk|rk)_(test|live)_(.*)$/.exec(k);
  if (!m) return 'unknown';
  const rest = m[2];
  /* Real keys are long runs of letters and digits; a placeholder is dots, a word, or too short to be one. */
  /* Only when the WHOLE remainder is placeholder-like: a real key that happens to hold "xxx" somewhere is a real key. */
  if (rest.length < 16 || /^(x+|\.+|\*+|placeholder|your.*key.*|changeme|example|replace.*)$/i.test(rest)) return 'placeholder';
  return m[1] as 'test' | 'live';
}

/** What the back office reads, and the short word beside it. */
export function whatTheStripeKeyIs(kind: TheKindOfKey): { says: string; badge: string } {
  switch (kind) {
    case 'live':
      return { says: 'A live Stripe key is set. Checkout and subscriptions reach Stripe and take real money.', badge: 'Live' };
    case 'test':
      return { says: 'A Stripe test key is set. Checkout and subscriptions reach Stripe, but no real money moves.', badge: 'Test' };
    case 'placeholder':
      return { says: 'The Stripe key that is set is a placeholder, not a real key, so nothing can be charged. Prices below can still be edited. They will apply when a real key is set.', badge: 'Not a real key' };
    case 'unknown':
      return { says: 'A Stripe key is set, but it does not look like a Stripe secret key, so it may not work. Check it before anyone is asked to pay.', badge: 'Check the key' };
    default:
      return { says: 'No Stripe key is set here, so nothing can be charged. Prices below can still be edited. They will apply when a key is set.', badge: 'No key set' };
  }
}
