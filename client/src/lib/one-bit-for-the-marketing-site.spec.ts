import { describe, it, expect, beforeEach } from 'vitest'
import { parentDomain, markSignedIn, clearSignedIn } from './signed-in-flag'

/**
 * THE FLAG THAT LETS A STATIC SITE STOP ASKING SIGNED-IN PEOPLE TO SIGN IN.
 *
 * Two things have to hold and they fail in opposite directions, so both are pinned here.
 *
 * IT MUST CARRY NOTHING. The whole reason a cookie on the parent domain is acceptable is that it
 * says "a session exists" and nothing else. The moment anybody puts a token, an email or an id in
 * it, it becomes a credential readable by script on a CDN-served page. So the value is asserted
 * exactly, not loosely.
 *
 * IT MUST BE DELETABLE. A flag that cannot be cleared leaves the marketing site offering "Go to
 * your grounds" after somebody signs out, which reads as the sign-out having failed.
 */
describe('what the flag is allowed to be', () => {
  beforeEach(() => {
    document.cookie = 'gw_in=; path=/; max-age=0'
  })

  it('is one character, and it is not a session', () => {
    markSignedIn('localhost')
    expect(document.cookie).toContain('gw_in=1')
    /** Nothing else. If this ever fails, read what was added before making it pass. */
    const value = document.cookie.split('; ').find(c => c.startsWith('gw_in='))
    expect(value).toBe('gw_in=1')
  })

  it('signing out removes it', () => {
    markSignedIn('localhost')
    expect(document.cookie).toContain('gw_in=1')
    clearSignedIn('localhost')
    expect(document.cookie).not.toContain('gw_in=1')
  })
})

describe('which domain it is written for', () => {
  /**
   * The app is at app.myground.work and the site is at myground.work. The flag has to be scoped to
   * the shared parent or the site cannot read it at all - and a cookie written for a domain the
   * page does not belong to is dropped silently, so getting this wrong looks like nothing
   * happening.
   */
  it('a subdomain writes to its parent', () => {
    expect(parentDomain('app.myground.work')).toBe('myground.work')
  })

  it('and a deploy preview writes to its own parent, not to the real domain', () => {
    expect(parentDomain('gw-19.preview.vercel.app')).toBe('preview.vercel.app')
  })

  it('localhost and bare hosts get no domain, which is correct rather than a gap', () => {
    /** Ports do not separate cookies, so the two dev servers already share one. */
    expect(parentDomain('localhost')).toBeNull()
    expect(parentDomain('myground.work')).toBeNull()
    expect(parentDomain('127.0.0.1')).toBeNull()
  })
})
