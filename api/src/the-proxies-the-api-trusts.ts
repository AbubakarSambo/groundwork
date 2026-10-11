/**
 * WHICH ADDRESS COUNTS AS THE VISITOR'S (known issue B10).
 *
 * Behind a host's proxy, the address a request arrives from is the proxy's, so every visitor looked like one address and shared one allowance
 * (five sign-ins a minute for everybody at once). The proxy adds the visitor's real address to the end of `X-Forwarded-For`. Express will read it only when
 * told how many proxies stand in front of the API, and only that many from the end are trusted: anything a visitor writes into the header themselves sits
 * further left and is never read. With no proxy in front (a laptop), nothing is trusted, so a made-up header changes nothing.
 *
 * `TRUST_PROXY_HOPS` says how many proxies stand in front of the API. Unset, it is one in production, where the API is always behind its host's proxy, and
 * none anywhere else. A value that is not a whole number from 0 to 5 is ignored. Set it to 0 if the API is ever reached directly.
 */
export function howManyProxiesToTrust(env: { NODE_ENV?: string; TRUST_PROXY_HOPS?: string }): number {
  const said = (env.TRUST_PROXY_HOPS ?? '').trim();
  if (/^[0-5]$/.test(said)) return Number(said);
  return env.NODE_ENV === 'production' ? 1 : 0;
}

/**
 * THE ONE WARNING WHEN NOBODY HAS SAID HOW MANY PROXIES THERE ARE.
 *
 * In production with `TRUST_PROXY_HOPS` unset, the API assumes one proxy. If a content network also sits in front, that is wrong and visitors share one
 * allowance, so whoever runs the hosting is told once, at start, what the setting is and what to set it to. It is a warning, never a refusal: the API
 * always starts. Returns the sentence to log, or nothing when there is nothing to say.
 */
export function theWarningWhenTheProxiesAreNotSaid(env: { NODE_ENV?: string; TRUST_PROXY_HOPS?: string }): string | null {
  if (env.NODE_ENV !== 'production') return null;
  if ((env.TRUST_PROXY_HOPS ?? '').trim() !== '') return null;
  return (
    'TRUST_PROXY_HOPS is not set, so the API assumes exactly one proxy in front of it. ' +
    'It is the number of proxies between visitors and the API (for example a load balancer, plus a content network like Cloudflare), ' +
    'and the rate limits use it to count each visitor by their own address. ' +
    'Set it to that number: 1 for the host\'s proxy alone, 2 if a content network also sits in front, 0 if the API is reached directly. ' +
    'The API is starting anyway.'
  );
}
