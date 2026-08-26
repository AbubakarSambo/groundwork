import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * ONE REPORT, NOT TWO A CLICK APART.
 *
 * The Report tab held a summary of the report - pattern, areas, an honest close, a collapsed
 * Divergences section - and a button reading "View the full shared report (Venn view)" that left for
 * a page of its own. So the product carried two documents about one check-in, written at different
 * times, with no way to tell which one you had read. Nothing on the tab said the shorter one was
 * short. And the page had its own dark header and its own back-link, because it did not know it was
 * part of a check-in.
 *
 * The page's content is now a component the tab renders. The route redirects to it. The summary is
 * DELETED rather than kept alongside, because a summary nobody can tell is a summary was the defect.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const REPORT = strip(readFileSync(path.join(__dirname, 'ReportPage.tsx'), 'utf8'))
const ADMIN = strip(readFileSync(path.join(__dirname, '../grounds/GroundAdminPage.tsx'), 'utf8'))

describe('one report, not two', () => {
  it('the report body is a component, not a page only', () => {
    expect(REPORT).toMatch(/export function ReportBody\(/)
  })

  it('and the tab renders it', () => {
    expect(ADMIN).toContain('<ReportBody groundId={id!} embedded />')
  })

  /**
   * The link is what made them two. "Venn view" is a word for how one diagram is drawn; it should
   * never have been the name of a destination.
   */
  it('nothing offers to take you to the other one', () => {
    expect(ADMIN).not.toMatch(/View the full shared report/)
    expect(ADMIN).not.toMatch(/View the forming report/)
    expect(ADMIN).not.toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
  })

  /** A dead link to somebody's report is worse than an extra hop, so the old route still resolves. */
  it('the old route redirects rather than 404s', () => {
    expect(REPORT).toMatch(/export function ReportPage\(\)/)
    expect(REPORT).toMatch(/<Navigate to=\{`\/grounds\/\$\{id\}\?tab=report`\} replace \/>/)
  })

  /** And the page it redirects to has to be able to open on that tab, or the redirect is a downgrade. */
  it('and the page opens on the tab the url asks for', () => {
    expect(ADMIN).toContain("searchParams.get('tab')")
  })

  /**
   * Embedded, the surrounding page already says which check-in this is and how to get back, so the
   * full-bleed wrapper and the dark header would be a second set of both.
   */
  it('the page chrome is dropped when embedded', () => {
    expect(REPORT).toMatch(/if \(embedded\) return/)
  })

  /** The header's read and the report's own headline were the same sentence, on one screen. */
  it('the header stops repeating the report headline on that tab', () => {
    expect(ADMIN).toMatch(/\{tab !== 'report' && \(/)
  })
})
