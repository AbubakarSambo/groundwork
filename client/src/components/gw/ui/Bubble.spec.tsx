import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Bubble } from './Bubble'
import { readFileSync } from 'fs'
import { join } from 'path'
const PROTO = readFileSync(join(__dirname, '../../../styles/prototype.css'), 'utf8')
const rule = (sel: string) => { const i = PROTO.indexOf(sel + '{'); return i < 0 ? '' : PROTO.slice(i, PROTO.indexOf('}', i)) }

/**
 * THE CONVERSATION BUBBLE, AGAINST THE PROTOTYPE'S OWN VALUES (docs/prototype/source/app.css:
 * `.bub`, `.bub.them`, `.bub.me`).
 */
describe('Bubble', () => {
  it('Groundwork\'s turn: cream, left-aligned, bottom-left corner squared', () => {
    render(<Bubble mine={false}>Hello</Bubble>)
    /* UPDATED 24 October (Hafsah: "one stylesheet, the prototype's"): the part is drawn with the prototype's own classes, so the
       values are pinned in styles/prototype.css (read here as text, since jsdom applies no stylesheet), not as inline styles. */
    const el = screen.getByText('Hello')
    expect(el.className).toBe('bub them')
    expect(rule('.bub.them')).toMatch(/background:var\(--chat\)/)
    expect(rule('.bub.them')).toMatch(/border-bottom-left-radius:4px/)
    expect(rule('.bub.them')).toMatch(/align-self:flex-start/)
    expect(rule('.bub')).toMatch(/border-radius:12px/)
  })

  it('the person\'s turn: ink (not navy, which the prototype never puts a bubble on), right-aligned, bottom-right corner squared', () => {
    render(<Bubble mine>Hi back</Bubble>)
    const el = screen.getByText('Hi back')
    expect(el.className).toBe('bub me')
    expect(rule('.bub.me')).toMatch(/background:var\(--ink\)/)
    expect(rule('.bub.me')).toMatch(/border-bottom-right-radius:4px/)
    expect(rule('.bub.me')).toMatch(/align-self:flex-end/)
  })

  it('never uses --gw-paper-2, which is the page colour and would make it invisible', () => {
    render(<Bubble mine={false}>Cream check</Bubble>)
    const el = screen.getByText('Cream check')
    expect(el.style.background).toBe('')
    expect(rule('.bub.them')).not.toMatch(/--paper/)
  })

  it('a turn still arriving can be shown at partial opacity', () => {
    render(<Bubble mine={false} opacity={0.5}>Loading</Bubble>)
    expect(screen.getByText('Loading').style.opacity).toBe('0.5')
  })
})
