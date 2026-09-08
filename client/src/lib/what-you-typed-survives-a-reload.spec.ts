import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { keep, whatWasKept, forget, howLongAgo, A_DRAFT_LASTS_HOURS } from './what-you-typed-survives-a-reload'

/**
 * TEN MINUTES OF SOMEBODY'S CAREFUL WRITING, AGAINST A BACK BUTTON.
 *
 * The creation wizard kept the situation card and nothing else, so a reload at step seven lost the
 * brief, the people, the dates and the remits. These hold the two halves of not doing that again:
 * what comes back, and what must never come back.
 */
const KEY = 'gw-test-draft'

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('what comes back', () => {
  it('what was typed, as it was typed', () => {
    keep(KEY, { brief: 'The renewal is the whole quarter.', people: ['a@b.test'] })
    expect(whatWasKept<any>(KEY).value).toEqual({ brief: 'The renewal is the whole quarter.', people: ['a@b.test'] })
  })

  it('and when, so somebody can be told rather than surprised', () => {
    keep(KEY, { brief: 'x' })
    const at = whatWasKept(KEY).at!
    expect(Math.abs(Date.now() - at.getTime())).toBeLessThan(2000)
  })

  it('nothing, when nothing was kept', () => {
    expect(whatWasKept(KEY)).toEqual({ value: null, at: null })
  })
})

describe('what must never come back', () => {
  it('a draft older than the window, and it is cleared on the way past', () => {
    keep(KEY, { brief: 'last week' })
    const later = new Date(Date.now() + (A_DRAFT_LASTS_HOURS + 1) * 3600_000)
    expect(whatWasKept(KEY, later).value).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('one written by a clock that has since moved backwards', () => {
    keep(KEY, { brief: 'from the future' })
    expect(whatWasKept(KEY, new Date(Date.now() - 3 * 3600_000)).value).toBeNull()
  })

  it('half-written or corrupt storage, without taking the page down with it', () => {
    localStorage.setItem(KEY, '{"at":"2026-09-07T10:00:00Z","value":{"brief"')
    expect(() => whatWasKept(KEY)).not.toThrow()
    expect(whatWasKept(KEY).value).toBeNull()
  })

  it('one written by an older version of the form, with no timestamp', () => {
    localStorage.setItem(KEY, JSON.stringify({ brief: 'no envelope' }))
    expect(whatWasKept(KEY).value).toBeNull()
  })
})

describe('storage refusing is not an error', () => {
  it('keeping does not throw in a private window', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded') })
    expect(() => keep(KEY, { brief: 'x' })).not.toThrow()
    spy.mockRestore()
  })

  it('reading does not throw when site data is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => whatWasKept(KEY)).not.toThrow()
    expect(whatWasKept(KEY).value).toBeNull()
    spy.mockRestore()
  })

  it('and forgetting does not either', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => forget(KEY)).not.toThrow()
    spy.mockRestore()
  })
})

describe('how long ago it reads', () => {
  it('in the words somebody reads on the offer', () => {
    const now = new Date('2026-09-07T12:00:00Z')
    expect(howLongAgo(new Date('2026-09-07T11:58:00Z'), now)).toBe('2 minutes ago')
    expect(howLongAgo(new Date('2026-09-07T11:59:30Z'), now)).toBe('1 minute ago')
    expect(howLongAgo(new Date('2026-09-07T09:00:00Z'), now)).toBe('3 hours ago')
    expect(howLongAgo(new Date('2026-09-06T09:00:00Z'), now)).toBe('yesterday')
  })
})

describe('the wizard uses it, and lets go at the right moment', () => {
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '../pages/grounds/CreateGroundPage.tsx'), 'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('keeps the fields that take ten minutes to write', () => {
    /* The OBJECT, not the effect's dependency array — which names the same fields, so a scan of
       the next few hundred characters passes while the field has been dropped from what is kept. */
    const from = src.indexOf('keep(DRAFT_KEY, {')
    const kept = src.slice(from, src.indexOf('})', from))
    expect(from).toBeGreaterThan(-1)
    /* `myRemit` came off this list with the field itself. It asked "your part in the work" on step
       one, was never sent to the server by either create path, and the chat asks the same thing in
       the session - so keeping it across a reload was preserving an answer that went nowhere.
       `leadRemit` stays: that one is sent at creation. */
    for (const field of ['brief', 'participants', 'leadEmail', 'leadRemit', 'startsOn', 'groundName']) {
      expect(kept, `${field} is not kept`).toContain(field)
    }
  })

  it('and forgets it the moment there is nothing left to come back to', () => {
    /*
     * A draft that outlives the thing it was drafting reappears, gets finished a second time, and
     * invites everybody twice.
     *
     * IT USED TO BE FORGOTTEN WHEN THE CHECK-IN WAS CREATED, in the create mutation's onSuccess.
     * This page does not create anything now - it is a picker that hands the rest to the setup
     * conversation - so the moment there is nothing to return to is the hand-off itself.
     */
    const handOver = src.slice(src.indexOf('function handOverToTheConversation'), src.indexOf('const create') + 1 || undefined)
    expect(handOver).toContain('forget(DRAFT_KEY)')
  })

  it('says it picked something up rather than filling the form in silently', () => {
    expect(src).toContain('Picked up where you left off')
    expect(src).toContain('Start fresh')
  })
})
