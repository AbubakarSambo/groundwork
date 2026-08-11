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
