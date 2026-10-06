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
