import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE REPORT LEADS WITH WHAT IS UNRESOLVED. W13-7.
 *
 * From the audit: the board opens with where accounts differ and the question it turns on; the
 * report opened with a paragraph. The board is the better-written document and the report is the
 * product, so a person opening the thing this whole system exists to produce read a summary
 * first and found the gaps three screens down.
 *
 * Nothing was removed. The order changed: where things stand, what is still open, what is
 * agreed, then the full account for anybody who wants it.
 *
 * Checked as source order rather than by rendering, because what is pinned IS the order, and a
 * render test would need a whole report fixture to assert one thing about sequence.
 */
const SRC = readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8')

/** Position of a section heading inside the shared-report card. */
const at = (needle: string) => {
  const i = SRC.indexOf(needle)
  expect(i, `${needle} is not in ReportPage any more - this file is asserting an order that no longer exists`).toBeGreaterThan(0)
  return i
}

describe('the order of the shared report', () => {
  it('what is still open comes before the prose', () => {
    expect(at("<SecH>What's still open</SecH>")).toBeLessThan(at('label="What we heard"'))
  })

  it('what everyone agrees comes before the prose too', () => {
    expect(at('<SecH>Alignment reached</SecH>')).toBeLessThan(at('label="What we heard"'))
  })

  it('and where things stand is still first of all', () => {
    // The one-line state stays at the top: it is the shortest true thing on the page.
    expect(at('<SecH>Where things stand</SecH>')).toBeLessThan(at("<SecH>What's still open</SecH>"))
  })

  it('the page does not OPEN with the prose either', () => {
    /**
     * THE HALF I MISSED. I reordered the card, updated the legend, wrote this file - and the
     * page still opened with the same paragraph, because the hero block prints `sharedPicture`
     * too. Found by opening the page, not by the test I had just written.
     *
     * The hero now says what the report holds: how many things are open, how many agreed.
     */
    // Anchored on strings that exist: my first attempt sliced to '{ground.label,' which is
    // written with a newline between the brace and the name, so the slice was empty and the
    // test failed against a correct file.
    const hero = SRC.slice(
      SRC.indexOf("Where everyone's accounts agree or differ."),
      SRC.indexOf('releasedDate ?'),
    )
    expect(hero.length, 'the hero block moved - re-anchor this check').toBeGreaterThan(200)
    expect(hero).not.toContain('report.sharedPicture')
    expect(hero).toMatch(/still open/)
  })

  it('the prose is still there - this was a reorder, not a deletion', () => {
    expect(SRC).toContain('label="What we heard" content={report.sharedPicture}')
  })

  it('and the reading guide does not still say the report opens with it', () => {
    /**
     * The legend at the top of the page promised "every report OPENS with what runs across
     * everyone's answers". A legend that describes a different page is worse than no legend,
     * and it would have survived the reorder silently.
     */
    expect(SRC).not.toMatch(/Every report opens with what runs across/)
    expect(SRC).toMatch(/leads with what is still unresolved/)
  })
})
