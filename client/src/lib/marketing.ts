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
