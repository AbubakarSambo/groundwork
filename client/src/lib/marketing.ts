/**
 * WHERE THE MARKETING SITE IS, DECLARED ONCE.
 *
 * `import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'` was written out in four files, and
 * two more pages had the production URL typed in with no env var at all - so on a staging build the
 * logo in the rail went to staging and the logo on the entry chat went to production.
 *
 * Her rule: the logo and the mark always take you back to the marketing page. That is one destination,
 * so it is one constant.
 */
/**
 * `||`, NOT `??`, AND THIS IS THE WHOLE BUG.
 *
 * `client/.env` carries `VITE_MARKETING_URL=` with nothing after it. That is the empty STRING, not
 * undefined, so `??` does not fall back - every logo rendered `href=""`, which links to the page you
 * are already on. The rail's wordmark has been going nowhere for as long as that line has been in the
 * env file, and it looks identical to working: the cursor changes, the click does nothing visible.
 *
 * Caught by reading the attribute off the running page instead of trusting the expression.
 */
export const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || 'https://myground.work'

/**
 * WHETHER THIS BUILD WAS TOLD WHERE ITS OWN MARKETING SITE IS.
 *
 * The line above defaults to the PRODUCTION domain, which is right for the production app and wrong
 * everywhere else - and "wrong" here means a person opening staging is silently moved to the live
 * site. They then sign in there, on production data, believing they are testing. Nothing says it
 * happened; the address bar just changes.
 *
 * There is no staging deployment of the marketing site at all today - nothing in CI builds
 * `marketing/` - so on staging this is always false, which is exactly the case worth handling.
 */
export const MARKETING_URL_WAS_CONFIGURED = Boolean(import.meta.env.VITE_MARKETING_URL)

/**
 * Is this the production app, where sending somebody to the production marketing site is correct?
 *
 * Read off the browser rather than an env var, because the env var being unset is the situation
 * being detected - asking it "are you production?" is asking the thing that has already not been
 * told. `localhost` counts as not-production for the same reason: a developer's root should not
 * throw them onto the live site either.
 */
export function thisIsTheProductionApp(host: string = typeof location === 'undefined' ? '' : location.hostname): boolean {
  return host === 'app.myground.work'
}
