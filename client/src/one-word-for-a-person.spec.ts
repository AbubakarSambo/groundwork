import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * ONE WORD FOR A PERSON IN A GROUND, AND IT IS "PARTICIPANT". W8-47.
 *
 * The product called the same person a participant, a contributor and a member
 * depending on the screen. I said in a commit that "contributor" had been retired,
 * having changed two places. Six more were still on screen, including the line
 * under the sign-in form - "Your contributions stay private from other
 * contributors" - which is the first sentence about privacy anyone reads.
 *
 * That overclaim is why this file exists. A rule I have to remember is a rule I
 * have already broken once.
 *
 * WHAT IS STILL ALLOWED, and why each is not the same word:
 *  - "contribution" - what a person puts in. A real and different noun, and the
 *    product's own phrase ("your contribution to this ground is yours").
 *  - "hiddenContributors" - the report's name for somebody whose contribution is
 *    not visible to the people above them. A finding, not a role. It never reaches
 *    the screen: the heading says "People who may be missing".
 *  - identifiers, query keys and comments - not read by anybody using the product.
 */

const SRC = __dirname

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) files(full, out)
    else if (/\.tsx?$/.test(name) && !name.includes('.spec.')) out.push(full)
  }
  return out
}

/** Only the word for a person: "contributor"/"contributors", never "contribution". */
const THE_WORD = /contributors?\b/i

/** Lines where the word is not on screen, or is a different concept. */
function isAllowed(line: string): boolean {
  // The access code kept its identifier; the label a person reads says "access code".
  if (/contributorCode|ContributorCode|contributor-code|redeemContributor|getContributorCode/.test(line)) return true
  // Props, state and payload keys.
  /**
   * These have to be STRUCTURAL, not just "the word appears near a symbol".
   *
   * The first version allowed `contributors[:.]` for object keys and property
   * access - and quietly allowed "...private from other contributors." too,
   * because an English sentence ends in a full stop. The bite-check caught it:
   * I put the word back on the sign-in page and the spec stayed green.
   *
   * So: a key is `contributors:`, property access is `contributors.` followed by
   * an identifier, and the rest are argument or destructuring positions.
   */
  if (/hiddenContributors|HiddenContributors|addingContributor|queueSuggestedContributor|queuedFromSuggestion/.test(line)) return true
  if (/\bcontributors:\s|\bcontributors\.\w|\bcontributors\s*[=?),]|\bcontributors\s*\}/.test(line)) return true
  return false
}

/**
 * Blank out comments before scanning, keeping the line count so offenders still
 * report a real line number.
 *
 * A line-by-line "does it start with //" test was not enough: this codebase's
 * comments are long, so the second and later lines of a block carry no marker at
 * all, and JSX comments open with `{/*`. Six false positives came from that,
 * which would have taught the next person to ignore this spec.
 */
function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, ' '))
}

describe('the product has one word for a person in a ground', () => {
  const offenders: string[] = []
  for (const f of files(SRC)) {
    // The `demoData` exemption is gone with the demo page it was written for: a fictional
    // pitch report is no longer a reason for this rule to have a hole in it.
    withoutComments(readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
      if (THE_WORD.test(line) && !isAllowed(line)) {
        offenders.push(`${f.replace(SRC, 'src')}:${i + 1}  ${line.trim().slice(0, 120)}`)
      }
    })
  }

  it('and it is not "contributor"', () => {
    expect(
      offenders,
      `"contributor" is the product's other word for a participant, and it is on screen here:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('the rule still has something to check', () => {
    // "contribution" must stay legal, or this spec is asserting the wrong thing.
    const anyContribution = files(SRC).some(f => /contribution/i.test(readFileSync(f, 'utf8')))
    expect(anyContribution).toBe(true)
  })
})
