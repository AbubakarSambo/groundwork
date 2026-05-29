import posthog from 'posthog-js'

const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

if (key) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
  })
}

export { posthog }
