import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Mark, MarkKey, StageLadder } from './kit'
import { readMark } from './the-mark'

/**
 * A1, LOOK AND LAYOUT: THE MARK AND THE STAGE LADDER, AS A PERSON READS THEM.
 *
 * "A ring is something someone said; a filled mark is proven." Wording is copied from
 * docs/prototype/screens/A1-look-and-layout/design-system.txt and the key in
 * docs/prototype/screens/B4-reports-and-sharing/team-report.txt.
 *
 * The rule that matters most: a mark is shown only when the record carries one. A screen that drew
 * a filled mark by default would be telling a lead something was proven that nobody checked.
 */
const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('Mark', () => {
  it.each([
    ['proven', 'Proven'],
    ['confirmed', 'Confirmed by the person who received it'],
    ['said', 'Only someone’s word'],
    ['memory', 'From memory only'],
    ['none', 'Not reached'],
  ])('%s is drawn, and read aloud as "%s"', (mark, words) => {
    render(<Mark mark={mark} />)
    const m = screen.getByRole('img', { name: words })
    expect(m).toHaveClass('gw-mk', `gw-mk-${mark}`)
  })

  it.each([undefined, null, '', 'verified', 'PIP', 42, {}])('draws nothing at all for %s', (value) => {
    const { container } = render(<Mark mark={value} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reads the engine\'s "not_reached" as not reached, and ignores case and spaces', () => {
    expect(readMark('not_reached')).toBe('none')
    expect(readMark(' Proven ')).toBe('proven')
    expect(readMark('claimed')).toBeNull()
  })

  it('every kind has a shape in the stylesheet, and a proof is filled while a word is a ring', () => {
    for (const k of ['proven', 'confirmed', 'said', 'memory', 'none']) expect(CSS).toContain(`.gw-mk-${k}`)
    expect(CSS).toMatch(/\.gw-mk-proven\s*\{ background: var\(--gw-green-t\); \}/)
    expect(CSS).toMatch(/\.gw-mk-said\s*\{ box-shadow: inset 0 0 0 2px var\(--gw-text\); \}/)
    expect(CSS).toMatch(/\.gw-mk-memory\s*\{ border: 2px dashed/)
  })
})

describe('the key', () => {
  it('says what each mark means, in the prototype\'s words', () => {
    render(<MarkKey />)
    const key = screen.getByRole('list')
    for (const w of ['Proven', 'Confirmed by the person who received it', 'Only someone’s word', 'From memory only']) {
      expect(key).toHaveTextContent(w)
    }
  })
})

describe('the stage ladder', () => {
  const eastside = [
    { name: 'Contacted', mark: 'proven' },
    { name: 'Need', mark: 'proven' },
    { name: 'Pitched', mark: 'said' },
    { name: 'Qualified', mark: 'said' },
    { name: 'Quoted', mark: 'not_reached' },
  ]

  it('reads as the design system shows Eastside Foods', () => {
    render(<StageLadder label="Eastside Foods" stages={eastside} says="Aisha says it’s qualified. The proof shows it up to need." />)
    const ladder = screen.getByRole('group', { name: 'Eastside Foods' })
    const stages = screen.getAllByRole('listitem')
    expect(stages.map(s => s.textContent)).toEqual([
      'Contacted. Proven.',
      'Need. Proven.',
      'Pitched. Only someone’s word.',
      'Qualified. Only someone’s word.',
      'Quoted. Not reached.',
    ])
    expect(ladder).toHaveTextContent('Aisha says it’s qualified. The proof shows it up to need.')
  })

  it('draws each stage\'s mark, and the line into a stage in that stage\'s colour', () => {
    const { container } = render(<StageLadder stages={eastside} />)
    const marks = [...container.querySelectorAll('.gw-ladder-row .gw-mk')].map(m => m.className)
    expect(marks.map(c => c.split(' ').pop())).toEqual(['gw-mk-proven', 'gw-mk-proven', 'gw-mk-said', 'gw-mk-said', 'gw-mk-none'])
    const lines = [...container.querySelectorAll('.gw-ladder-ln')].map(l => l.className.split(' ').pop())
    expect(lines).toEqual(['gw-ladder-ln-proven', 'gw-ladder-ln-said', 'gw-ladder-ln-said', 'gw-ladder-ln-none'])
  })

  it('draws nothing when not one stage carries a mark, rather than a row of empty rings', () => {
    const { container } = render(<StageLadder stages={[{ name: 'Contacted' }, { name: 'Need', mark: '' }]} says="Anything" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing with no stages', () => {
    const { container } = render(<StageLadder stages={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
