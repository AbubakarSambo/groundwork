import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Tabs } from './Tabs'

/**
 * TABS, AGAINST THE PROTOTYPE'S OWN SHAPE (app.css: `.tabs`, `.tab`, `.tab.on`).
 *
 * GROUP 3 REVIEW, BATCH B: at 375px the row scrolls sideways, and a reader can open a page with a
 * later tab already chosen - the chosen tab then sits past the right edge, unseen. The chosen tab
 * is scrolled into view as soon as the page opens.
 */
describe('Tabs', () => {
  it('scrolls the chosen tab into view when it is first drawn', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    render(
      <MemoryRouter>
        <Tabs
          label="Check-in"
          active="people"
          items={[
            { key: 'board', label: 'Board', to: '/a' },
            { key: 'checkin', label: 'Check-in', to: '/b' },
            { key: 'context', label: 'Context', to: '/c' },
            { key: 'mywork', label: 'My work', to: '/d' },
            { key: 'people', label: 'People and setup', to: '/e' },
          ]}
        />
      </MemoryRouter>
    )
    expect(scrollIntoView).toHaveBeenCalled()
    const activeTab = screen.getByRole('tab', { name: 'People and setup' })
    expect(activeTab.getAttribute('aria-selected')).toBe('true')
  })

  it('and scrolls it into view again when the choice changes', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const items = [
      { key: 'board', label: 'Board', to: '/a' },
      { key: 'checkin', label: 'Check-in', to: '/b' },
    ]
    const { rerender } = render(
      <MemoryRouter>
        <Tabs label="Check-in" active="board" items={items} />
      </MemoryRouter>
    )
    const calls = scrollIntoView.mock.calls.length
    rerender(
      <MemoryRouter>
        <Tabs label="Check-in" active="checkin" items={items} />
      </MemoryRouter>
    )
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(calls)
  })

  it('only the chosen tab gets the visible underline, same as before', () => {
    render(
      <MemoryRouter>
        <Tabs
          label="Check-in"
          active="checkin"
          items={[
            { key: 'board', label: 'Board', to: '/a' },
            { key: 'checkin', label: 'Check-in', to: '/b' },
          ]}
        />
      </MemoryRouter>
    )
    expect(screen.getByRole('tab', { name: 'Board' }).className).not.toContain('gwui-tab-on')
    expect(screen.getByRole('tab', { name: 'Check-in' }).className).toContain('gwui-tab-on')
  })
})
