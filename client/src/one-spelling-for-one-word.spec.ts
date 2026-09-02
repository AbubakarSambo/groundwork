import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A PERSON SEES ONE SPELLING, NOT TWO, ONE CLICK APART.
 *
 * Settings said "Organization name". People, one click away, said "Everyone with a Groundwork
 * account in your organisation." Same app, same session, two spellings of the same word. Pricing
 * carried three more in its plan descriptions.
 *
 * The product's voice is British throughout - "organisation", "colour", "recognise" - so the
 * American ones were the strays, nine of them, and they clustered exactly where somebody sets their
 * organisation up: the page that greets a new admin.
 *
 * IDENTIFIERS ARE NOT COPY. `organizationId`, `myOrganizations`, `/auth/switch-organization` and
 * the Prisma model are names, not words anybody reads, and renaming them would be a large diff
 * touching an API contract to fix nothing a user can see. This checks only what reaches a screen.
 */
const SRC = join(__dirname)

function files(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.tsx$/.test(e) && !e.includes('.spec.')) out.push(p)
  }
  return out
}

/** Text a person reads: JSX text nodes, and string literals that are not identifiers or routes. */
function copyIn(src: string): string[] {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
  const jsxText = [...stripped.matchAll(/>([^<>{}\n]{4,})</g)].map(m => m[1])
  const literals = [...stripped.matchAll(/'([^'\n]{4,})'/g)].map(m => m[1])
    .filter(s => !/^[\w./:-]+$/.test(s))          // routes, keys, ids
  return [...jsxText, ...literals]
}

describe('one spelling for one word', () => {
  const all = files(SRC)

  it('found the source, so an empty sweep cannot pass', () => {
    expect(all.length).toBeGreaterThan(20)
  })

  it('nothing a person reads says "organization"', () => {
    const offenders: string[] = []
    for (const f of all) {
      for (const line of copyIn(readFileSync(f, 'utf8'))) {
        /*
         * The WORD, not a camelCase identifier. `organizationId` sitting inside a JSX expression
         * is a name a developer reads, not copy a person reads - my first version flagged one and
         * would have had me "fix" an API field.
         *
         * AND THE PLURAL. The version after that read `organization(?![A-Za-z])`, so "organizations"
         * never matched - the `s` is a letter. Three of the nine strings this was written to catch
         * were plurals, in the pricing plan descriptions. The bite-check found it: reverting one of
         * them left the guard green.
         */
        if (/[Oo]rganizations?(?![A-Za-z])/.test(line)) {
          offenders.push(`${f.split('/').pop()}: ${line.trim().slice(0, 60)}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('and the British spelling is the one actually in use', () => {
    const used = all.some(f => /[Oo]rganisation/.test(readFileSync(f, 'utf8')))
    expect(used).toBe(true)
  })
})
