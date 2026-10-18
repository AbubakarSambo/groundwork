import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-221: THE "YOURS TO KEEP" EMAIL'S LINK OPENS SETTINGS AT "YOUR DATA" - EVEN SIGNED OUT.
 *
 * The email now sends `/settings#your-data` (request 224). A signed-out visitor is bounced to
 * `/auth?next=<dest>` by one of three guards in this file (`RequireAuth`, `RequirePlatformAdmin`,
 * `RequireOrgSetup` - `/settings` is wrapped in the last one), and `AuthPage` sends them on to
 * `next` once they are in.
 *
 * All three built `dest` as `window.location.pathname + window.location.search` - dropping the
 * hash. So the round trip through sign-in landed back on `/settings`, at the top of the page, with
 * no sign that "Your data" was ever asked for. This locks that all three now carry the hash too,
 * so the fragment a link asked for is still there once you are signed in.
 */
const APP = readFileSync(join(__dirname, 'App.tsx'), 'utf8')

describe('every "sign in first" redirect keeps the hash', () => {
  it('no guard builds `dest` from only the pathname and the search', () => {
    // The old, lossy form - if this ever comes back, a hash-anchored link like
    // `/settings#your-data` is dropped again on the way through sign-in.
    expect(APP).not.toMatch(/const dest = window\.location\.pathname \+ window\.location\.search\s*$/m)
  })

  it('every `dest` built for the sign-in redirect includes window.location.hash', () => {
    const matches = APP.match(/const dest = window\.location\.pathname \+ window\.location\.search \+ window\.location\.hash/g) ?? []
    // RequireAuth, RequirePlatformAdmin, RequireOrgSetup - the three doors a signed-out person can
    // meet on the way to any protected page, `/settings` among them.
    expect(matches.length).toBe(3)
  })
})
