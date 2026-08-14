/**
 * A ONE BIT SIGNAL SO THE MARKETING SITE STOPS ASKING SIGNED-IN PEOPLE TO SIGN IN.
 *
 * THE PROBLEM. `myground.work` is a static Astro site and `app.myground.work` is the product. The
 * site is built once and served from a CDN, so at render time it cannot know anything about who is
 * reading it, and its header therefore says "Sign in / Get started free" to everybody - including
 * somebody who signed in an hour ago and just clicked the logo to get back. The two obvious fixes
 * are both wrong: localStorage is per-origin, so the marketing origin cannot read the app's session
 * at all, and server-rendering the header would mean giving up the static site.
 *
 * WHAT THIS IS. A cookie on the PARENT domain, which both subdomains can read, carrying one
 * character: `1`. It says "a browser here has a session". It does not say who, and it cannot be
 * used to do anything.
 *
 * WHY IT IS SAFE, AND WHY THE TOKEN STAYS PUT. The access token stays in localStorage on the app
 * origin, where the marketing site cannot reach it and where a cookie's automatic attachment to
 * every request cannot leak it. Putting the token on the parent domain would send it to any future
 * subdomain and to any CDN request that carries cookies, which is exactly the mistake this avoids.
 * The flag is `SameSite=Lax` and readable by script on purpose - the marketing page has to read it -
 * so it must never carry anything that matters. It carries nothing that matters.
 *
 * BEING WRONG IS CHEAP IN ONE DIRECTION ONLY. A stale flag (session expired, cookie outlived it)
 * shows "Go to your grounds" to somebody who then gets asked to sign in - a small annoyance. A
 * missing flag shows the signed-out header to somebody signed in, which is today's behaviour. Since
 * neither reveals anything and neither grants anything, the flag can be wrong without being unsafe.
 * That is the whole reason this is a flag and not a session.
 */
const FLAG = 'gw_in';

/**
 * The parent of `app.myground.work` is `myground.work`. Derived rather than hardcoded so a preview
 * or staging host sets the flag on its own parent instead of a domain it does not own - a cookie
 * write for the wrong domain is silently dropped, which would be a bug nobody could see.
 *
 * Returns null on a hostname with no parent worth using: `localhost`, an IP address, or a bare
 * single-label host. In dev the two servers are different PORTS on localhost, which share cookies
 * anyway, so there is nothing to do.
 */
export function parentDomain(hostname: string): string | null {
  if (!hostname || hostname === 'localhost' || /^[\d.]+$/.test(hostname)) return null;
  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  return parts.slice(1).join('.');
}

export function markSignedIn(hostname = window.location.hostname) {
  const domain = parentDomain(hostname);
  const scope = domain ? `; domain=.${domain}` : '';
  /** Thirty days, and only a hint: the real session decides everything. */
  document.cookie = `${FLAG}=1; path=/${scope}; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearSignedIn(hostname = window.location.hostname) {
  const domain = parentDomain(hostname);
  const scope = domain ? `; domain=.${domain}` : '';
  /**
   * Cleared on BOTH scopes. A flag written with a domain and deleted without one leaves the
   * original in place, so signing out would leave the marketing site still saying "Go to your
   * grounds" - the one version of being wrong that would look like the sign-out failed.
   */
  document.cookie = `${FLAG}=; path=/${scope}; max-age=0; SameSite=Lax`;
  document.cookie = `${FLAG}=; path=/; max-age=0; SameSite=Lax`;
}
