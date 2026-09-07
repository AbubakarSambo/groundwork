import posthog from 'posthog-js'

/**
 * ANALYTICS THAT CANNOT READ THE RECORD.
 *
 * `posthog-js` defaults `autocapture` to TRUE, and autocapture sends the text of the element
 * somebody clicked. Inside this product that is not a page name: it is a suggestion chip carrying
 * a question about somebody's work, a paragraph of a shared report, a person's name in a
 * participant list. The whole claim of the product is that nobody outside a check-in reads what is
 * in it, and the default configuration of an analytics library was quietly making that untrue —
 * to a third party, and to any member of staff with a PostHog login.
 *
 * Session recording is off by default in the library and is also refused here, because "off by
 * default" is a setting somebody can flip in a dashboard without touching this file. The masking
 * flags are set for the same reason: they cost nothing while recording is off and they are the
 * difference between a mistake and an incident if it is ever turned on.
 *
 * WHAT IS STILL SENT, deliberately: which pages were opened, and who the person is. A URL here
 * carries opaque ids (`/grounds/<uuid>/report`) and no content. Identity is what makes "did anybody
 * come back after signing up" answerable at all, and it is information somebody gave us when they
 * signed up rather than something they wrote in a check-in.
 */
const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

if (key) {
  posthog.init(key, {
    api_host: host,
    /* Page opens: a URL, no content. */
    capture_pageview: true,
    capture_pageleave: true,
    /* THE ONE THAT MATTERED. Element text from a chat, a report or a roster is customer content. */
    autocapture: false,
    /* And no recording of the screen, whatever a dashboard says. */
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
  })
}

export { posthog }
