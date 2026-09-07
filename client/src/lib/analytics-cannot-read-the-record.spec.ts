/**
 * ANALYTICS THAT COULD READ THE RECORD.
 *
 * `posthog-js` defaults `autocapture` to TRUE, and autocapture sends the TEXT of the element
 * somebody clicked. Inside this product that is not a page name: it is a suggestion chip carrying a
 * question about somebody's work, a paragraph of a shared report, a person's name in a roster. So
 * the library's default was quietly sending customer content to a third party — readable by any
 * member of staff with a PostHog login — in a product whose whole claim is that nobody outside a
 * check-in reads what is in it.
 *
 * The marketing site now makes that claim in public. This is what stops a dependency default from
 * making it false again. See PRIVACY-AND-AI-AUDIT.md.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SRC = fs
  .readFileSync(path.join(__dirname, 'posthog.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('analytics cannot read the record', () => {
  it('turns autocapture off explicitly, rather than trusting a default', () => {
    expect(SRC).toContain('autocapture: false')
  })

  it('refuses session recording in code, not in a dashboard', () => {
    /* "Off by default" is a setting somebody can flip without touching this file. */
    expect(SRC).toContain('disable_session_recording: true')
  })

  it('and masks, so a future toggle is a mistake rather than an incident', () => {
    expect(SRC).toContain('maskAllInputs: true')
    expect(SRC).toContain("maskTextSelector: '*'")
  })

  it('still captures page opens, which carry opaque ids and no content', () => {
    expect(SRC).toContain('capture_pageview: true')
  })

  it('and initialises nothing at all without a key', () => {
    /* A missing key must not mean "send to the default host". */
    expect(SRC).toContain('if (key)')
  })
})

describe('and nothing else ships a session recorder', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  it('no other analytics or replay library is installed', () => {
    for (const lib of ['@fullstory/browser', 'rrweb', 'logrocket', 'hotjar', '@sentry/replay', 'mixpanel-browser']) {
      expect({ lib, installed: Object.keys(deps).includes(lib) }).toEqual({ lib, installed: false })
    }
  })
})

describe('and what identity is sent is a deliberate list', () => {
  const AUTH = fs
    .readFileSync(path.join(__dirname, '..', 'stores', 'auth.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  it('identifies a person by fields they gave us at sign-up, and nothing from a check-in', () => {
    const at = AUTH.indexOf('posthog.identify(')
    expect(at).toBeGreaterThan(-1)
    const call = AUTH.slice(at, AUTH.indexOf('})', at))
    /* Sign-up facts only. A label, a report field or a check-in id here would be content. */
    for (const field of ['email', 'firstName', 'lastName', 'role', 'organizationId']) {
      expect(call).toContain(field)
    }
    for (const never of ['groundId', 'checkIn', 'report', 'sharedPicture', 'brief']) {
      expect(call).not.toContain(never)
    }
  })

  it('and forgets them on sign-out', () => {
    expect(AUTH).toContain('posthog.reset()')
  })
})
