import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { isSuiteOffMessage, SuiteOffMessage } from './suite-is-off'

/**
 * B-122 (deep page audit, 9 October): the server ends every off-suite sentence with "An admin
 * switches it on under Suites." (`a-suite-that-is-off-says-what-to-do.ts`), not "...is not switched
 * on." as this file used to look for. Checked against that stale ending, an admin - the one person
 * who can switch a suite on - read the server's sentence as plain text, with nothing to press: a
 * dead end. A member still reads the plain sentence, since only an admin may switch a suite on.
 */
const OFF = 'The leave suite is not switched on. An admin switches it on under Suites.'

describe('a suite that is off, read by whoever can do something about it', () => {
  it('recognises the server’s real ending', () => {
    expect(isSuiteOffMessage(OFF)).toBe(true)
  })

  /*
   * B-214 (said why in the commit): an admin reading "An admin switches it on" was being told what
   * somebody else could do, not what they themself could do - said as "you" for the one reader who
   * actually can switch it on.
   */
  it('gives an admin a working link to Suites, said as "you", not "an admin"', () => {
    render(<MemoryRouter><SuiteOffMessage message={OFF} role="ADMIN" /></MemoryRouter>)
    expect(screen.getByText(/The leave suite is not switched on\. You can switch it on under/)).toBeInTheDocument()
    expect(screen.queryByText(/An admin switches it on/)).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Suites' })
    expect(link).toHaveAttribute('href', '/settings/suites')
  })

  it('gives a lead or a member the plain sentence, with no link', () => {
    render(<MemoryRouter><SuiteOffMessage message={OFF} role="LEAD" /></MemoryRouter>)
    expect(screen.getByText(OFF)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('gives a member the plain sentence too', () => {
    render(<MemoryRouter><SuiteOffMessage message={OFF} role="MEMBER" /></MemoryRouter>)
    expect(screen.getByText(OFF)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('leaves a message that is not about an off suite alone', () => {
    const other = 'Only an admin or a lead can open the suites.'
    expect(isSuiteOffMessage(other)).toBe(false)
    render(<MemoryRouter><SuiteOffMessage message={other} role="ADMIN" /></MemoryRouter>)
    expect(screen.getByText(other)).toBeInTheDocument()
  })
})
