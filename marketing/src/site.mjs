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
  /*
   * COACHING. The month leads, because a month at a time is how most people start.
   *
   * Priced by the month rather than by the hour: an hourly rate makes the thing being bought an
   * hour of somebody's time, and it is not - it is having a coach for as long as the work needs
   * one. Her call, 11 September.
   *
   * The annual plan is twelve sessions for $7,500 — $625 a month, which is the discount for
   * committing to the year — and it may be held by a team, attached to one scenario, or belong to
   * one person.
   */
  coachingPerMonth: '$700',
  coachingRetainer: '$7,500',
  coachingMonthly: '$625',
  /**
   * INTEGRATION SUPPORT, NOT INTEGRATION. Anybody can connect Groundwork themselves - the API and
   * its keys are part of the subscription, and most engineering teams will not want help. This is
   * for the ones that do: one dedicated engineer, for the month your team has time.
   */
  integrationSupport: '$3,500',
  /* Setup support, by the month: two two-hour sessions, and we come to you. */
  setupMonthly: '$500',
};
