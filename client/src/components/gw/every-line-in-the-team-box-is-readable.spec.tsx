import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TheTeamBox } from './TheTeamBox'

/**
 * EVERY LINE IN THE TEAM BOX IS READABLE (round 7, the law firm lead at 390px: "the list of people I just put in is still cut off").
 *
 * The box was as many rows as lines (at most ten), and a line with a name, an email and a phone number wraps onto two or three rows in
 * the side panel (300px wide at 1440 and 1000) or on a phone, so most of what she typed sat behind a scroll inside a small box. The box is
 * now as tall as what it holds: its height is set from its own content height, with no cap, every time the words or its width change.
 * The page has no layout here, so the content height is given the way a browser gives it: about 23px for each row a line wraps onto.
 */
vi.mock('@/api/entry', () => ({ entryApi: { peopleOnLines: vi.fn() } }))
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => true }))

const HER_FOUR = [
  'Kwame Karanja, kwame@law-r7kyf3.test, +254722127727',
  'Fatuma Ahmed, fatuma@law-r7kyf3.test, +254733657824',
  'David Muthoka, david@law-r7kyf3.test, +254700987921',
  'Grace Wanjiru, grace@law-r7kyf3.test, +254711238018',
].join('\n')

/* Each line wraps onto three rows at a narrow width, as at 390px or in the 300px side panel. */
const ROW = 23
const wrappedRows = (v: string) => v.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 20)), 0)
const real = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
beforeAll(() => {
  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, get() { return wrappedRows((this as HTMLTextAreaElement).value) * ROW } })
})
afterAll(() => {
  delete (HTMLTextAreaElement.prototype as any).scrollHeight
  if (real) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', real)
})

describe('the team box with her four lines', () => {
  it('is as tall as every row her four lines wrap onto, with no cap', () => {
    render(<TheTeamBox prefilled={[]} text={HER_FOUR} onText={() => {}} />)
    const box = screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement
    expect(parseInt(box.style.height, 10)).toBeGreaterThanOrEqual(wrappedRows(HER_FOUR) * ROW)
    expect(box.rows).toBeGreaterThanOrEqual(5)
  })

  it('grows again as she adds a line', () => {
    let text = HER_FOUR
    const { rerender } = render(<TheTeamBox prefilled={[]} text={text} onText={(t) => { text = t }} />)
    const box = screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement
    const before = parseInt(box.style.height, 10)
    fireEvent.change(box, { target: { value: `${HER_FOUR}\nAkinyi Onyango, akinyi@law-r7kyf3.test, +254700000001` } })
    rerender(<TheTeamBox prefilled={[]} text={text} onText={(t) => { text = t }} />)
    expect(parseInt(box.style.height, 10)).toBeGreaterThan(before)
  })
})
