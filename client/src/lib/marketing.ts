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
/** This app's own root. When the mark goes here, this build has no marketing site to send anyone to. */
export const OUR_OWN_ROOT = '/'

export const MARKETING_URL = whereTheMarkGoes(import.meta.env.VITE_MARKETING_URL)

/**
 * WHERE THE MARK GOES, AND NOT ACROSS ENVIRONMENTS.
 *
 * The production domain was the default for every build that was not told otherwise, and only the
 * root route checked whether that was right. So the logo in the rail, on a local or staging build,
 * sent a signed-in lead in the middle of setting up a check-in to the LIVE marketing site, whose
 * "Go to your check-ins" then took her to the live sign-in (milestone 1's smoke run, 3 November
 * 2026). The root route had been fixed; the logo, reading the same constant, had not.
 *
 * So the decision is made here, once, for everything that reads `MARKETING_URL`: the address it was
 * told, else the production site only on the production app, else this app's own root. That root
 * is Today for somebody signed in and this build's own front door for anybody else (App.tsx), so
 * nothing on a test build ever leaves it for the live product.
 *
 * Read off the browser rather than an env var, because the env var being unset is the situation
 * being handled. `||`, not `??`: `client/.env` carries `VITE_MARKETING_URL=` with nothing after
 * it, the empty string, which once made every logo `href=""`.
 */
export function whereTheMarkGoes(told: string | undefined, host: string = typeof location === 'undefined' ? '' : location.hostname): string {
  return told || (host === 'app.myground.work' ? 'https://myground.work' : OUR_OWN_ROOT)
}

