import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatBar } from './ChatBar'

/** THE CHAT BAR (journey 6, 23 November 2026): the paperclip, the box, and Send, the one main button. */
describe('the chat bar', () => {
  it('reads its hint in the box, Send as the main button, and the paperclip only when given', () => {
    const { container, rerender } = render(<ChatBar value="" onChange={() => {}} onSend={() => {}} placeholder="Ask about this check-in" />)
    expect(screen.getByPlaceholderText('Ask about this check-in')).toBeInTheDocument()
    expect([...container.querySelectorAll('.ds-btn-main')].map((b) => b.textContent)).toEqual(['Send'])
    expect(screen.queryByRole('button', { name: 'Add a photo or a document' })).toBeNull()
    rerender(<ChatBar value="" onChange={() => {}} onSend={() => {}} onAttach={() => {}} placeholder="Ask a question" />)
    expect(screen.getByRole('button', { name: 'Add a photo or a document' })).toBeInTheDocument()
  })

  it('Enter sends what is written, Shift and Enter does not, and an empty box sends nothing', () => {
    const onSend = vi.fn()
    const { rerender } = render(<ChatBar value="" onChange={() => {}} onSend={onSend} placeholder="Ask a question" />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
    rerender(<ChatBar value="What should I do next?" onChange={() => {}} onSend={onSend} placeholder="Ask a question" />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('while a reply is on its way, nothing can be sent', () => {
    const onSend = vi.fn()
    render(<ChatBar value="Hello" onChange={() => {}} onSend={onSend} disabled placeholder="Ask a question" />)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })
})
