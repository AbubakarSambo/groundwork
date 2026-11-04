import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SlowStep, CLOSING_STEPS } from './SlowStep'

/**
 * THE WAIT HAS TO SAY WHAT IT IS DOING. W8-16.
 *
 * Closing a session runs two model calls before it answers - about half a
 * minute. The entry flow said what was happening; the signed-in finish, which is
 * the path everybody is on from session two onwards, said "Saving…" and then
 * nothing for thirty seconds, which reads as a hang.
 */

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('the slow step', () => {
  it('starts on the first honest thing it is doing', () => {
    render(<SlowStep steps={['One', 'Two', 'Three']} everyMs={1000} />)
    expect(screen.getByText('One…')).toBeTruthy()
  })

  it('moves on, so half a minute is not one unchanging word', () => {
    render(<SlowStep steps={['One', 'Two', 'Three']} everyMs={1000} />)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByText('Two…')).toBeTruthy()
  })

  it('and never runs off the end into nothing', () => {
    // The work can take longer than the steps describe. Sitting on the last real
    // step is honest; an empty line or a fifth invented one is not.
    render(<SlowStep steps={['One', 'Two']} everyMs={1000} />)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(screen.getByText('Two…')).toBeTruthy()
  })

  it('never claims to be nearly done', () => {
    // No percentage, no "almost there". Nothing here knows how far along it is.
    expect(CLOSING_STEPS.join(' ')).not.toMatch(/almost|nearly|%|finishing up/i)
  })

  /* Hafsah, 30 October 2026: plain language for an impatient first-time lead. */
  it('says each step in plain words, and never how long it takes', () => {
    expect(CLOSING_STEPS).toEqual(['Reading what you said', 'Finding what is still open', 'Writing your report'])
    expect(CLOSING_STEPS.join(' ')).not.toMatch(/stand on|record|minute|seconds/i)
  })
})

describe('both places that close a session use it', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('the signed-in finish, which used to say only Saving', () => {
    expect(read('../../pages/chat/ChatPage.tsx')).toContain('<SlowStep steps={CLOSING_STEPS} />')
  })

  it('and the entry flow, which is where it started', () => {
    expect(read('../../pages/enter/EntryChatPage.tsx')).toContain('<SlowStep steps={CLOSING_STEPS} />')
  })
})
