import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Section, Panel, PartBoundary } from '@/components/gw/ui'

/**
 * ONE PART FAILING IS NOT THE PAGE FAILING (Hafsah, 15 November 2026). A section or panel that throws while drawing says one plain
 * line in its own place, and the heading above it and every other part of the page stay. The technical message is in the console only.
 */
function Boom(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'includes')")
}

describe('a part of a page that cannot draw', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => vi.restoreAllMocks())

  it('a section says one plain line under its own heading, and the sections beside it are drawn', () => {
    render(<div><Section heading="Blockers"><Boom /></Section><Section heading="Patterns"><p>Two patterns.</p></Section></div>)
    expect(screen.getByRole('heading', { name: 'Blockers' })).toBeTruthy()
    expect(screen.getByText('This part could not be shown.')).toBeTruthy()
    expect(screen.getByText('Two patterns.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Cannot read|TypeError|undefined/)
  })

  it('a panel does the same', () => {
    render(<div><Panel heading="Coaching"><Boom /></Panel><Panel heading="Fine"><p>All good.</p></Panel></div>)
    expect(screen.getByText('This part could not be shown.')).toBeTruthy()
    expect(screen.getByText('All good.')).toBeTruthy()
  })

  it('the technical message goes to the console and nowhere else', () => {
    render(<Section heading="Blockers"><Boom /></Section>)
    const logged = (console.error as any).mock.calls.filter((c: any[]) => String(c[0]).includes('a part of the page failed'))
    expect(logged.length).toBe(1)
    expect((logged[0][1] as Error).message).toMatch(/reading 'includes'/)
  })

  it('a part that is not a section can be wrapped on its own, and quietly draws nothing if asked', () => {
    render(<div><PartBoundary quiet><Boom /></PartBoundary><p>The rest.</p></div>)
    expect(screen.queryByText('This part could not be shown.')).toBeNull()
    expect(screen.getByText('The rest.')).toBeTruthy()
  })

  it('a part that draws fine is untouched', () => {
    render(<Section heading="Fine"><p>Fine.</p></Section>)
    expect(screen.getByText('Fine.')).toBeTruthy()
    expect(screen.queryByText('This part could not be shown.')).toBeNull()
  })
})
