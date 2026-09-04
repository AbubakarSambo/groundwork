/**
 * THE LIVE DOMAIN, IN ONE PLACE, BECAUSE TWO PLACES DISAGREED.
 *
 * astro.config.mjs said https://www.groundwork.app and Layout.astro hardcoded
 * https://myground.work. The sitemap integration reads the config, so every URL
 * submitted to search engines pointed at a domain that does not resolve at all -
 * four dead links - while the canonical tags on the very same pages were right.
 *
 * That is the worst combination available: a crawler following the sitemap gets
 * nowhere, and nothing about the site as a person browses it looks wrong, so nobody
 * finds out.
 *
 * A plain module rather than importing the config into the layout, which was the
 * first attempt: pulling astro.config.mjs into a page drags vite and tailwind into
 * the page bundle and the build refuses.
 */
export const SITE = 'https://myground.work';

/**
 * WHAT WE SELL THAT IS NOT A SUBSCRIPTION, WITH THE NUMBER IN ONE PLACE.
 *
 * Coaching and integration support are bought alongside a plan and invoiced by hand. Nothing in
 * `pricing_plans` charges them, Stripe never sees them, and the seat cap does not apply - so the
 * database cannot be the source of truth for them the way it is for a plan price.
 *
 * That makes them exactly the numbers most likely to drift, and they already have: the retainer
 * lived in three files at two different prices before this. The page reads these, and the app's
 * price guard reads these, so changing one changes it everywhere it is said.
 */
export const SERVICES = {
  /* Twelve sessions, retained. About $625 a session against the hourly rate. */
  coachingRetainer: '$7,500',
  coachingHourly: '$700',
  /**
   * INTEGRATION SUPPORT, NOT INTEGRATION. Anybody can connect Groundwork themselves - the API and
   * its keys are part of the subscription, and most engineering teams will not want help. This is
   * for the ones that do, and it is priced from rather than at, because a two-system sync and a
   * whole HR platform are not the same week of work.
   */
  integrationSupportFrom: '$2,200',
  /* Somebody to get you running and train your team, in the first month. */
  handsOnFirstMonth: '$1,500',
};
