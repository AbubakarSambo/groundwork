import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { useBackOrFallback } from './a-back-button-never-leaves-groundwork'

/**
 * B-126: opened from an email link or a new tab, there is no history inside Groundwork, and a bare
 * `navigate(-1)` fell through to the browser - often `about:blank`, since a fresh tab's blank
 * starting document can still count towards `window.history.length` even though the app has never
 * navigated anywhere. `location.key` is the honest signal: `'default'` for the very first location
 * an SPA session renders, a real key for anywhere reached by navigating within the app since.
 */
function Target() {
  const back = useBackOrFallback('/grounds', 'Back to your check-ins')
  return <button onClick={back.onClick}>{back.label}</button>
}

describe('a "Back" control that never leaves Groundwork', () => {
  it('names the fallback page when the app has not navigated anywhere yet (a fresh tab)', () => {
    render(
      <MemoryRouter initialEntries={['/target']}>
        <Routes>
          <Route path="/target" element={<Target />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Back to your check-ins')).toBeTruthy()
  })

  it('offers plain "Back" once the app itself has navigated to this page', () => {
    render(
      <MemoryRouter initialEntries={['/elsewhere']}>
        <Routes>
          <Route path="/elsewhere" element={<Link to="/target">Go</Link>} />
          <Route path="/target" element={<Target />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Go'))
    expect(screen.getByText('Back')).toBeTruthy()
  })
})
