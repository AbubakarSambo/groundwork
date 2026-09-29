import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Composer } from './Composer'

/**
 * THE CHECK-IN'S FOOTER BAR (docs/prototype/source/app.css: `.ci-c`, `.ci-sq`; s29.js's
 * `ciFocus`): a "+" square button, "Type, or hold to speak", a navy send button with an up arrow.
 */
describe('Composer', () => {
  it('the field says "Type, or hold to speak", as the prototype does', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} />)
    expect(screen.getByPlaceholderText('Type, or hold to speak')).toBeTruthy()
  })

  it('the "+" is a 48px square, and only appears when offered', () => {
    const { rerender } = render(<Composer value="" onChange={() => {}} onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: /Add a photo/ })).toBeNull()
    rerender(<Composer value="" onChange={() => {}} onSend={() => {}} onPlus={() => {}} />)
    const plus = screen.getByRole('button', { name: 'Add a photo, a document or some text' })
    expect(plus.style.width).toBe('48px')
    expect(plus.style.height).toBe('48px')
  })

  it('the send button is navy, with the up-arrow the prototype uses', () => {
    render(<Composer value="hello" onChange={() => {}} onSend={() => {}} />)
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send.textContent).toBe('↑')
    expect(send.style.background).toBe('var(--gw-navy)')
  })

  it('reports what is typed, and sends on the send button', async () => {
    const onChange = vi.fn()
    const onSend = vi.fn()
    render(<Composer value="" onChange={onChange} onSend={onSend} />)
    await userEvent.type(screen.getByPlaceholderText('Type, or hold to speak'), 'h')
    expect(onChange).toHaveBeenCalledWith('h')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalled()
  })

  it('the + and send are disabled together, and send alone can be disabled separately', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} onPlus={() => {}} disabled />)
    expect(screen.getByRole('button', { name: 'Add a photo, a document or some text' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByPlaceholderText('Type, or hold to speak')).toBeDisabled()
  })

  it('the attach menu is the caller\'s own content, shown above the "+" only while open', async () => {
    const onPlus = vi.fn()
    const { rerender } = render(
      <Composer value="" onChange={() => {}} onSend={() => {}} onPlus={onPlus} plusOpen={false} plusMenu={<div>Add a photo or a document</div>} />,
    )
    expect(screen.queryByText('Add a photo or a document')).toBeNull()
    rerender(
      <Composer value="" onChange={() => {}} onSend={() => {}} onPlus={onPlus} plusOpen plusMenu={<div>Add a photo or a document</div>} />,
    )
    expect(screen.getByText('Add a photo or a document')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Add a photo, a document or some text' }))
    expect(onPlus).toHaveBeenCalled()
  })
})
