import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickReplies } from './QuickReplies'

/** QUICK REPLIES, AS OUTLINED PILLS (docs/prototype/source/app.css: `.chip`). */
describe('QuickReplies', () => {
  it('draws nothing when there is nothing to suggest', () => {
    const { container } = render(<QuickReplies items={[]} onPick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('draws each item as an outlined pill - white, inset border, not filled', () => {
    render(<QuickReplies items={['Not yet', 'Sent it']} onPick={() => {}} />)
    const pill = screen.getByRole('button', { name: 'Not yet' })
    expect(pill.style.background).toBe('var(--gw-card)')
    expect(pill.style.boxShadow).toContain('inset')
    expect(pill.style.borderRadius).toBe('20px')
    /* 44px since 21 October: a chip is held to the same 44px as a button. */
    expect(pill.style.minHeight).toBe('44px')
  })

  it('reports the exact item picked', async () => {
    const onPick = vi.fn()
    render(<QuickReplies items={['Not yet', 'Sent it']} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sent it' }))
    expect(onPick).toHaveBeenCalledWith('Sent it')
  })

  it('can be disabled, and says so with the group\'s own name', () => {
    render(<QuickReplies items={['Not yet']} onPick={() => {}} disabled label="Suggested answers" />)
    expect(screen.getByRole('group', { name: 'Suggested answers' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeDisabled()
  })
})
