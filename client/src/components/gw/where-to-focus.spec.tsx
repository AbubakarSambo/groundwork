import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WhereToFocus } from './where-to-focus'

/** The API has read the direction since 20 Sep 2026; the page never drew it. */
describe('where to focus', () => {
  it('draws the lists with their counts, and where the room split', () => {
    render(
      <WhereToFocus
        direction={{
          outOf: 24,
          regions: [
            { name: 'Kano and Jigawa', namedBy: ['a', 'b', 'c', 'd', 'e'], asSaid: 'Expand into Jigawa. The Hadejia valley.' },
            { name: 'Ogun and Oyo', namedBy: ['s', 't', 'u'] },
          ],
          dataGaps: [{ name: 'weekly paddy price outside Kano', namedBy: ['a', 'c'] }],
          splits: [{ list: 'regions', saying: '5 named Kano and Jigawa; 3 named Ogun and Oyo, and none of them named Kano and Jigawa. Two answers, from two groups with nobody in common.' }],
        }}
      />,
    )
    expect(screen.getByText('Where to focus')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getAllByText(/Kano and Jigawa/).length).toBeGreaterThan(0)
    expect(screen.getByText('Information people do not have')).toBeTruthy()
    expect(screen.getByText('Where the room split')).toBeTruthy()
    expect(screen.getByText(/two groups with nobody in common/)).toBeTruthy()
  })

  it('draws nothing when there is no direction', () => {
    const { container } = render(<WhereToFocus direction={null} />)
    expect(container.innerHTML).toBe('')
    const empty = render(<WhereToFocus direction={{ regions: [], outOf: 3 }} />)
    expect(empty.container.innerHTML).toBe('')
  })
})
