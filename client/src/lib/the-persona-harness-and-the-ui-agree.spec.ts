import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE HARNESS CLICKS TEXT. THE PRODUCT RENAMES TEXT. NOTHING CONNECTED THE TWO.
 *
 * On 26 August a commit changed one line of the entry page:
 *
 *     -  Save my ground →
 *     +  Save my check-in →
 *
 * It touched no file in `groundwork_local_test/`. The persona harness kept clicking the old label,
 * Playwright waited thirty seconds for an element that would never appear, and the step that threw
 * was `provision_ground` - the one that produces the signed-in user everything else needs.
 *
 * FIVE SUITES WENT RED FROM ONE LABEL, and the log made it look like five problems: `suite_s`
 * reported all eighteen create-picker cards missing, because the page had never loaded at all.
 *
 * This is the same shape as the schema-versus-database drift and the client's copy of the scenario
 * list: two places that must agree, maintained separately, with nothing reconciling them. The
 * scenario list has a mirror test, which is why adding a scenario failed here in seconds. The
 * harness had none, which is why a copy change disarmed five browser suites silently.
 *
 * WHAT THIS COSTS WHEN IT FAILS: a few seconds, and a message naming the string. What its absence
 * cost: a thirty-second timeout per suite, a red CI nobody could read, and - because CI could not
 * get a runner - three days before anybody saw it.
 */

/**
 * WHAT THIS DELIBERATELY DOES NOT COVER, so nobody reads it as more than it is.
 *
 * The harness also selects on placeholders - `input[placeholder*='your@email']`, `placeholder*='org'`
 * and nine others. They are substring matches by design and every one currently resolves, so they
 * are far more robust than an exact text match: 'org' survives almost any rewording of "Organisation
 * name". Pinning them would add false failures without removing real ones - `'name'` alone matches
 * half the forms in the app, so the check would pass whatever anybody renamed.
 *
 * The selectors that broke are the exact-text ones, and those are what is pinned. If a placeholder
 * ever does break, the honest fix is to pin that one rather than all of them.
 */
const ROOT = resolve(__dirname, '../../..')
const HARNESS = join(ROOT, 'groundwork_local_test/_ui_strings.py')

/** The pinned strings, read from the harness itself so the two cannot drift apart. */
const PINNED: string[] = (() => {
  const src = readFileSync(HARNESS, 'utf8')
  const block = src.slice(src.indexOf('PINNED = ['), src.indexOf(']', src.indexOf('PINNED = [')))
  const names = [...block.matchAll(/^\s{4}([A-Z_]+),/gm)].map(m => m[1])
  return names.map(name => {
    const m = new RegExp(`^${name} = "((?:[^"\\\\]|\\\\.)*)"`, 'm').exec(src)
    if (!m) throw new Error(`${name} is in PINNED but has no value in _ui_strings.py`)
    return m[1]
  })
})()

/** Every component the app renders. Specs excluded - a string that only exists in a test is not UI. */
function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) sources(p, out)
    else if (/\.(tsx|ts)$/.test(e) && !/\.spec\.|\.test\./.test(e)) out.push(p)
  }
  return out
}

/**
 * The client source as the BROWSER would read it, which is the comparison that matters.
 *
 * Two things would otherwise produce false failures, and both bit me while writing this:
 *
 *   `Invite &amp; finish` in JSX renders as "Invite & finish". A raw substring search says the
 *   string is missing; the browser disagrees, and the harness has been clicking it happily.
 *
 *   `Invited ({invited.length})` renders as "Invited (2)". Interpolation means no literal to find.
 *   Handled by pinning only the stable prefix - see the note in _ui_strings.py.
 */
const RENDERED = sources(join(ROOT, 'client/src'))
  .map(f => readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/&rsquo;|&#39;/g, "'")
  /* JSX splits text across lines and indents it. The browser collapses that whitespace, so this
     does too - otherwise a label that happens to wrap reads as missing. */
  .replace(/\s+/g, ' ')

/**
 * The eighteen create-picker labels `suite_s` pins, read from the suite rather than copied here.
 *
 * A second list with the same problem, and it had drifted twice more: "Board & leadership strategy"
 * became "Board or leadership strategy", and "Something's off track" was split into two scenarios.
 * Neither crashed anything - the check reported cards missing that were on screen under different
 * words, which is worse than a crash because it reads as a broken page.
 */
const CREATE_CARDS: string[] = (() => {
  const src = readFileSync(join(ROOT, 'groundwork_local_test/run_suite_s_scenarios.py'), 'utf8')
  const from = src.indexOf('CREATE_CARDS = [')
  const block = src.slice(from, src.indexOf(']', from))
  return [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1])
})()

describe('the persona harness and the UI agree', () => {
  it('reads a real list, so a rename cannot empty this file out', () => {
    /* Without this, a refactor of _ui_strings.py that breaks the parse makes PINNED empty and every
       assertion below passes over nothing - the failure mode this whole file exists to prevent. */
    expect(PINNED.length).toBeGreaterThanOrEqual(8)
    expect(PINNED).toContain('Save my check-in')
  })

  it('every string the harness clicks or waits for still exists in the product', () => {
    const missing = PINNED.filter(s => !RENDERED.includes(s.replace(/\s+/g, ' ')))
    expect(missing, [
      'The persona harness waits for text the product no longer renders.',
      'In the browser this is a 30-second Playwright timeout, and every suite downstream of',
      'provision_ground dies with it - which reads in CI as several unrelated failures.',
      '',
      'Usually the harness is wrong and the product is right: copy improves, and that is not a',
      'regression. Update groundwork_local_test/_ui_strings.py, not the component - unless the',
      'rename was itself the accident, which the diff will tell you.',
    ].join('\n')).toEqual([])
  })

  it('and every create-picker label it pins is still on the picker', () => {
    expect(CREATE_CARDS.length).toBeGreaterThanOrEqual(15)
    const missing = CREATE_CARDS.filter(c => !RENDERED.includes(c.replace(/\s+/g, ' ')))
    expect(missing, [
      'run_suite_s_scenarios.py pins create-picker labels the product no longer renders.',
      'This does not crash the suite - it reports the cards as missing, which reads as a broken',
      'page when the cards are on screen under different words.',
      'Fix the list in the suite, not the component.',
    ].join('\n')).toEqual([])
  })

  it('and the suites use the shared constants rather than typing the text again', () => {
    /*
     * The guard is only worth having if the strings it checks are the strings the suites use. A
     * suite with its own inline copy is outside it, which is exactly how this broke.
     */
    const suites = readdirSync(join(ROOT, 'groundwork_local_test'))
      .filter(f => f.startsWith('run_suite_') && f.endsWith('.py'))
    const offenders: string[] = []
    for (const f of suites) {
      const src = readFileSync(join(ROOT, 'groundwork_local_test', f), 'utf8')
      for (const s of PINNED) {
        if (src.includes(`"${s}"`)) offenders.push(`${f}: "${s}" typed inline instead of imported`)
      }
    }
    expect(offenders).toEqual([])
  })
})
