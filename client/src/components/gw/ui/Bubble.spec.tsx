import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Bubble } from './Bubble'

/**
 * THE CONVERSATION BUBBLE, AGAINST THE PROTOTYPE'S OWN VALUES (docs/prototype/source/app.css:
 * `.bub`, `.bub.them`, `.bub.me`).
 */
describe('Bubble', () => {
  it('Groundwork\'s turn: cream, left-aligned, bottom-left corner squared', () => {
    render(<Bubble mine={false}>Hello</Bubble>)
    const el = screen.getByText('Hello')
    expect(el.style.background).toBe('var(--gw-bg)')
    expect(el.style.color).toBe('var(--gw-text)')
    expect(el.style.alignSelf).toBe('flex-start')
    expect(el.style.borderRadius).toBe('16px 16px 16px 4px')
    expect(el.style.maxWidth).toBe('82%')
  })

  it('the person\'s turn: ink (not navy, which the prototype never puts a bubble on), right-aligned, bottom-right corner squared', () => {
    render(<Bubble mine>Hi back</Bubble>)
    const el = screen.getByText('Hi back')
    expect(el.style.background).toBe('var(--gw-ink)')
    expect(el.style.color).toBe('white')
    expect(el.style.alignSelf).toBe('flex-end')
    expect(el.style.borderRadius).toBe('16px 16px 4px 16px')
  })

  it('never uses --gw-paper-2, which is the page colour and would make it invisible', () => {
    render(<Bubble mine={false}>Cream check</Bubble>)
    const el = screen.getByText('Cream check')
    expect(el.style.background).not.toBe('var(--gw-paper-2)')
  })

  it('a turn still arriving can be shown at partial opacity', () => {
    render(<Bubble mine={false} opacity={0.5}>Loading</Bubble>)
    expect(screen.getByText('Loading').style.opacity).toBe('0.5')
  })
})
