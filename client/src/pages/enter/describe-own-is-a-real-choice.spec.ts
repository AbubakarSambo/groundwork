import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TheDoor } from './TheDoor'
import { EverySituation } from './EverySituation'

/**
 * DESCRIBING IT IN YOUR OWN WORDS MUST NOT LOOK SWITCHED OFF, OR BE HARD TO FIND.
 *
 * This file used to hold one card: a full-width, navy-edged "describe your own" button above a
 * dropdown of situations, found in the page's source by `setPickedSituation('other')`. It held two
 * lessons: the catch-all once looked disabled (dashed, transparent, grey), and then looked like
 * every other tile at the bottom of a scroll, where nobody found it.
 *
 * REWRITTEN IN U.6 (B1), because that card is gone. The prototype's first screen IS the describe
 * route: one box with its own button, five examples and a link to the list. So the rule has not
 * moved, it has won: describing it yourself is the first and largest thing on the page. On the list
 * of every situation, it is a card ("Work through something else") and a box of its own at the
 * foot ("Describe it"). What this file checks now, on the rendered page:
 *
 *   - the box is the first control on the first screen, and its button is a real button;
 *   - on the list, both ways to describe it go to describing it, never to a card's situation.
 */
describe('describing it in your own words', () => {
  it('is the first thing on the first screen, and its button is a real, full-strength button', () => {
    render(createElement(TheDoor, { signedIn: false, onSend: () => {}, onSeeEverySituation: () => {} }))
    const box = screen.getByRole('textbox')
    const everything = [...document.querySelectorAll('textarea, button, input, a')]
    expect(everything[0]).toBe(box)
    const go = screen.getByRole('button', { name: 'Continue' })
    /*
     * Was `expect(go.className).toBe('gw-btn')`, pinning the old kit's one class. Group 3, piece
     * 4d-1 rebuilt TheDoor.tsx from the shared `Button` (`components/gw/ui`), whose default kind is
     * "primary" - the prototype's one solid navy button, never the dashed/ghost/transparent look
     * this test exists to rule out. Checking the kind class directly keeps that same guarantee
     * without pinning the whole class string, which a shared part is free to add to (e.g. `wide`).
     */
    expect(go.className).toMatch(/\bgwui-btn-primary\b/)
    expect(go.getAttribute('style') ?? '').not.toMatch(/dashed|transparent/)
  })

  it('sends what was typed, and only what was typed', () => {
    const onSend = vi.fn()
    render(createElement(TheDoor, { signedIn: false, onSend, onSeeEverySituation: () => {} }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  We sell tea in Kano.  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onSend).toHaveBeenCalledWith('We sell tea in Kano.')
  })

  it('on the list, "Describe it" and "Work through something else" both go to describing it', () => {
    const onDescribe = vi.fn()
    const onStart = vi.fn()
    render(createElement(EverySituation, { signedIn: false, openerFor: () => 'A sentence.', onSend: () => {}, onStart, onDescribe }))
    fireEvent.click(screen.getByRole('button', { name: 'Describe it' }))
    fireEvent.click(screen.getByRole('button', { name: /^Work through something else/ }))
    expect(onDescribe).toHaveBeenCalledTimes(2)
    expect(onStart).not.toHaveBeenCalled()
  })
})
