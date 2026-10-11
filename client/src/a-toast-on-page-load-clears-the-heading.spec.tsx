import { describe, it, expect } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { Toaster, toast } from 'sonner'

/**
 * B-042: a toast that fires the moment a page loads (a switched-off suite's "That is not here
 * any more") used to sit right on top of the page's own heading and subtitle - visible on every
 * suite board with a two-line subtitle (Time sheets, Onboarding, Leaving, Roles, To-dos, Customers
 * and deals). App.tsx's `<Toaster>` now carries `offset={{ top: 150 }}` and
 * `mobileOffset={{ top: 170 }}`, clearing the heading area on both a desktop width and a phone
 * (where the toast also spans the width and a subtitle can wrap to three lines), without touching
 * the left/right/bottom sides sonner also offsets by default.
 *
 * This reads the same two props App.tsx passes, rather than mounting the whole app (which needs
 * every provider App.tsx sets up), so a future change to these two numbers - or to the shape of
 * the offset object - is caught here even though nothing else in the app renders a toast on load
 * in a unit test.
 */
describe('the Toaster clears the page heading', () => {
  it('offsets the toast well below where a page title and subtitle sit, on both widths', async () => {
    render(<Toaster position="top-right" richColors offset={{ top: 150 }} mobileOffset={{ top: 170 }} />)
    /* sonner only renders `[data-sonner-toaster]` (and its CSS variables) once there is an actual
       toast to show, the same as `client.ts` firing one on a page's first, automatic 404 - an
       empty Toaster renders only its aria-live region. */
    act(() => { toast.error('That is not here any more', { description: 'The time sheets suite is not switched on.' }) })
    const toaster = await waitFor(() => {
      const el = document.querySelector('[data-sonner-toaster]') as HTMLElement | null
      expect(el).toBeTruthy()
      return el!
    })
    const style = toaster.style
    expect(style.getPropertyValue('--offset-top')).toBe('150px')
    expect(style.getPropertyValue('--mobile-offset-top')).toBe('170px')
    /* Only the top offset moved. Left/right/bottom stay at sonner's own default (24px, same as
       before B-042) - a number for `offset`/`mobileOffset` would have set every side to that same
       number, squeezing the toast into a sliver a few pixels wide on a phone, which is what
       happened the first time this was tried. */
    expect(style.getPropertyValue('--offset-right')).toBe('24px')
    expect(style.getPropertyValue('--offset-left')).toBe('24px')
    expect(style.getPropertyValue('--offset-bottom')).toBe('24px')
    expect(style.getPropertyValue('--mobile-offset-right')).toBe('16px')
    expect(style.getPropertyValue('--mobile-offset-left')).toBe('16px')
    expect(style.getPropertyValue('--mobile-offset-bottom')).toBe('16px')
  })
})
