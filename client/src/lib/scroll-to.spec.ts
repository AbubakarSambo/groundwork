import { describe, it, expect, vi, afterEach } from 'vitest'
import { scrollTo } from './scroll-to'

/**
 * A "JUMP TO IT" CONTROL HAS TO ARRIVE.
 *
 * Every such control called `scrollIntoView({ behavior: 'smooth' })`, and in a real Chrome that call
 * moved the page by nothing at all - while the same element scrolled correctly with `behavior` left
 * off. I chased the wrong suspects first: a missing anchor, then a handler not firing. Both were
 * fine. Calling scrollIntoView by hand in the console did nothing either, which is what named it.
 *
 * `prefers-reduced-motion` was the obvious explanation and that browser reported it false, so the
 * honest rule is that smooth is not guaranteed anywhere: request it, then make sure you got there.
 */
function withReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') && reduce,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('scrolling to something', () => {
  it('is smooth when motion is welcome', () => {
    withReducedMotion(false)
    const el = {
      scrollIntoView: vi.fn(),
      parentElement: null,
      getBoundingClientRect: () => ({ top: 2479, bottom: 2781 }),
    }
    scrollTo(el as any)
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  /** The whole point. It still has to ARRIVE; the animation was only the manner of it. */
  it('jumps straight away when somebody has asked for less motion', () => {
    withReducedMotion(true)
    const el = { scrollIntoView: vi.fn() }
    scrollTo(el as any)
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
    expect(el.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  /**
   * THE ONE THAT MATTERS. A browser that ignores smooth leaves the page exactly where it was, and
   * the control has to notice and finish the job rather than sit there looking broken.
   */
  it('jumps when the smooth scroll turns out to move nothing', async () => {
    vi.useFakeTimers()
    withReducedMotion(false)
    const el = {
      scrollIntoView: vi.fn(),
      parentElement: null,
      getBoundingClientRect: () => ({ top: 2479, bottom: 2781 }),
    }
    scrollTo(el as any)
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    vi.advanceTimersByTime(200)
    expect(el.scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'center' })
    vi.useRealTimers()
  })

  /** And stays out of the way of a browser that does animate. */
  it('leaves a working smooth scroll alone', async () => {
    vi.useFakeTimers()
    withReducedMotion(false)
    const el = {
      scrollIntoView: vi.fn(() => { (window as any).scrollY = 1974 }),
      parentElement: null,
      getBoundingClientRect: () => ({ top: 2479, bottom: 2781 }),
    }
    ;(window as any).scrollY = 0
    scrollTo(el as any)
    vi.advanceTimersByTime(200)
    expect(el.scrollIntoView).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  /** A horizontal strip scrolls on the other axis. Dropping this turns a nudge into a jump. */
  it('carries inline through for a sideways scroll', () => {
    withReducedMotion(false)
    const el = {
      scrollIntoView: vi.fn(),
      parentElement: null,
      getBoundingClientRect: () => ({ top: 2479, bottom: 2781 }),
    }
    scrollTo(el as any, { block: 'nearest', inline: 'nearest' })
    expect(el.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  })

  it('does nothing at all when there is nothing to scroll to', () => {
    withReducedMotion(false)
    expect(() => scrollTo(null)).not.toThrow()
  })

  /**
   * A ref callback that throws takes the whole page down. One call site guarded this with `?.` and
   * I dropped the guard when the call moved into here - a blank screen, from a scroll.
   */
  it('does not throw when the element cannot scroll', () => {
    withReducedMotion(false)
    expect(() => scrollTo({} as any)).not.toThrow()
  })
})

describe('nothing reaches for the raw call any more', () => {
  /**
   * The rule is only worth anything if it is the only route. A single direct
   * `scrollIntoView({ behavior: 'smooth' })` anywhere is the bug back.
   */
  it('no source file calls scrollIntoView with smooth directly', async () => {
    const { readFileSync, readdirSync, statSync } = await import('fs')
    const { join } = await import('path')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const full = join(dir, f)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.tsx?$/.test(f) && !f.endsWith('.spec.ts') && !full.endsWith('scroll-to.ts')) {
          if (/scrollIntoView\(\{[^}]*smooth/.test(readFileSync(full, 'utf8'))) offenders.push(full)
        }
      }
    }
    walk(join(__dirname, '..'))
    expect(offenders).toEqual([])
  })
})
