import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Composer } from './Composer'
import { readFileSync } from 'fs'
import { join } from 'path'
const PROTO = readFileSync(join(__dirname, '../../../styles/prototype.css'), 'utf8')
const rule = (sel: string) => { const i = PROTO.indexOf(sel + '{'); return i < 0 ? '' : PROTO.slice(i, PROTO.indexOf('}', i)) }

/**
 * THE CHECK-IN'S FOOTER BAR (docs/prototype/source/app.css: `.ci-c`, `.ci-sq`; s29.js's
 * `ciFocus`): a "+" square button, "Type your answer", a navy send button with an up arrow.
 */
describe('Composer', () => {
  it('the field says "Type your answer", as the prototype does', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} />)
    expect(screen.getByPlaceholderText('Type your answer')).toBeTruthy()
  })

  /**
   * REVIEW ROUND 3, ITEM 7: THE PROTOTYPE'S BORDERED WHITE BOX. This field sat transparent,
   * blended into the footer bar's own background - between-check-ins.jpg shows a plain white box
   * with a thin rule border around "Ask, or add a note", the prototype's own `.input` (app.css:
   * `border:1.5px solid var(--rule2);background:var(--surface);border-radius:10px`).
   */
  it('the field is a bordered white box, not a bare, borderless field', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} />)
    /* UPDATED 24 October (Hafsah: "one stylesheet, the prototype's"): the part is drawn with the prototype's own classes, so the
       values are pinned in styles/prototype.css (read here as text, since jsdom applies no stylesheet), not as inline styles. */
    const field = screen.getByPlaceholderText('Type your answer')
    expect(field.className).toBe('input')
    expect(rule('.input')).toMatch(/border:1px solid var\(--rule2-crisp\)/)
    expect(rule('.input')).toMatch(/background:var\(--surface\)/)
    expect(rule('.input')).toMatch(/border-radius:8px/)
  })

  it('the "+" is a 48px square, and only appears when offered', () => {
    const { rerender } = render(<Composer value="" onChange={() => {}} onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: /Add a photo/ })).toBeNull()
    rerender(<Composer value="" onChange={() => {}} onSend={() => {}} onPlus={() => {}} />)
    const plus = screen.getByRole('button', { name: 'Add a photo, a document or some text' })
    expect(plus.className).toBe('btn sec ci-sq')
    expect(rule('.ci-sq')).toMatch(/width:48px;height:48px/)
  })

  it('the send button is navy, with the up-arrow the prototype uses', () => {
    render(<Composer value="hello" onChange={() => {}} onSend={() => {}} />)
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send.textContent).toBe('↑')
    expect(send.className).toBe('btn pri ci-sq')
    expect(PROTO).toMatch(/\.btn\.pri\{background:var\(--navy\)/)
  })

  it('reports what is typed, and sends on the send button', async () => {
    const onChange = vi.fn()
    const onSend = vi.fn()
    render(<Composer value="" onChange={onChange} onSend={onSend} />)
    await userEvent.type(screen.getByPlaceholderText('Type your answer'), 'h')
    expect(onChange).toHaveBeenCalledWith('h')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalled()
  })

  it('the + and send are disabled together, and send alone can be disabled separately', () => {
    render(<Composer value="" onChange={() => {}} onSend={() => {}} onPlus={() => {}} disabled />)
    expect(screen.getByRole('button', { name: 'Add a photo, a document or some text' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByPlaceholderText('Type your answer')).toBeDisabled()
  })

  /**
   * FATIMA ROUND 2, D3 (and fault 7 before it): THE BOX SHOWS ALL OF ITS PLACEHOLDER. At 390px Ask's "Ask about the company, your work or your check-ins." wrapped onto a second
   * line in a box one row high, and read as a box cut in half. While the box is empty its least height is the height of the placeholder at the width it has. jsdom lays nothing
   * out, so the measurement is given (a probe 72px high); the test holds that the box takes it while it is empty, gives it back when there are words, and ignores a short one.
   */
  it('while empty, its least height is the height of its own placeholder; with words in it, the caller\'s own growing takes over', () => {
    const tall = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(72)
    try {
      const { rerender } = render(<Composer value="" onChange={() => {}} onSend={() => {}} placeholder="Ask about the company, your work or your check-ins." />)
      const box = screen.getByPlaceholderText('Ask about the company, your work or your check-ins.') as HTMLTextAreaElement
      expect(box.style.minHeight).toBe('72px')
      rerender(<Composer value="What is outstanding?" onChange={() => {}} onSend={() => {}} placeholder="Ask about the company, your work or your check-ins." />)
      expect(box.style.minHeight).toBe('')
      tall.mockReturnValue(24)
      rerender(<Composer value="" onChange={() => {}} onSend={() => {}} placeholder="Type your answer" />)
      expect((screen.getByPlaceholderText('Type your answer') as HTMLTextAreaElement).style.minHeight).toBe('')
    } finally { tall.mockRestore() }
  })

  it('still hands the box to a caller who asked for it', () => {
    const ref = { current: null as HTMLTextAreaElement | null }
    render(<Composer value="" onChange={() => {}} onSend={() => {}} inputRef={ref} />)
    expect(ref.current).toBe(screen.getByPlaceholderText('Type your answer'))
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
