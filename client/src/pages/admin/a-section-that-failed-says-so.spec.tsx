/**
 * Three panels returned null on a failed fetch, so WhatsApp, pricing and feedback simply were not
 * on the console — which reads as a feature that does not exist rather than one that failed to
 * load. A platform admin cannot support a customer from a page that hides its own failures.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { SectionFailed, Section } from './a-section-that-failed-says-so'

const axiosish = (status: number, message?: string) => ({ response: { status, data: { message } } })

describe('a section that failed says so', () => {
  it('names the section and offers a way back', () => {
    let tried = 0
    render(<SectionFailed what="Pricing" error={axiosish(500)} retry={() => { tried++ }} />)
    expect(screen.getByText(/Pricing did not load/i)).toBeTruthy()
    screen.getByRole('button', { name: /try again/i }).click()
    expect(tried).toBe(1)
  })

  it('says you are not allowed rather than that it is broken', () => {
    render(<SectionFailed what="Pricing" error={axiosish(403)} />)
    expect(screen.getByText(/not allowed to read this/i)).toBeTruthy()
  })

  it('says it is not on this deployment for a 404, which is the honest answer', () => {
    render(<SectionFailed what="WhatsApp" error={axiosish(404)} />)
    expect(screen.getByText(/not available on this deployment/i)).toBeTruthy()
  })

  it('prefers the server\'s own sentence', () => {
    render(<SectionFailed what="Feedback" error={axiosish(400, 'That key is not configured.')} />)
    expect(screen.getByText(/That key is not configured/)).toBeTruthy()
  })

  it('offers no retry button where there is nothing to retry with', () => {
    render(<SectionFailed what="Pricing" error={axiosish(403)} />)
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })
})

describe('Section', () => {
  it('renders nothing while loading, so a console does not flash', () => {
    const { container } = render(<Section what="Pricing" isLoading error={null} data={undefined}><b>rows</b></Section>)
    expect(container.textContent).toBe('')
  })

  it('renders the failure rather than the children when data never arrived', () => {
    render(<Section what="Pricing" isLoading={false} error={axiosish(500)} data={undefined}><b>rows</b></Section>)
    expect(screen.getByText(/did not load/i)).toBeTruthy()
    expect(screen.queryByText('rows')).toBeNull()
  })

  it('renders the section when it loaded', () => {
    render(<Section what="Pricing" isLoading={false} error={null} data={{ ok: true }}><b>rows</b></Section>)
    expect(screen.getByText('rows')).toBeTruthy()
  })
})

describe('and the admin console no longer hides a failed panel', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'AdminPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('has no "loading or no data, render nothing" left', () => {
    expect(src).not.toMatch(/if \(isLoading \|\| !data\) return null/)
  })

  it('and the three panels each say when they failed', () => {
    for (const what of ['WhatsApp', 'Pricing', 'Feedback']) {
      expect(src).toContain(`SectionFailed what="${what}"`)
    }
  })
})
