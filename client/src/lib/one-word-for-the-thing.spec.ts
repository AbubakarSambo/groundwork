import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * THE FOURTH ATTEMPT AT THIS, AND THE FIRST WITH A GUARD.
 *
 * "There's so many places that still call this a ground." Three passes had already been made and
 * each reported done: strings were changed, the count went down, nobody counted what was left. A
 * later audit found 45 user-visible occurrences still shipping, including the sidebar nav, the
 * list page's own definition of the concept, and six strings in the post-signup walkthrough.
 *
 * THE DECISION THIS ENFORCES. The object a person opens is a "check-in". The thing inside it stays
 * a "session". Both words were needed: renaming everything to "check-in" makes "everyone checks in
 * each check-in" sayable, which is why the earlier attempts kept stalling.
 *
 * WHAT IS DELIBERATELY UNTOUCHED, per the standing constraint: the data model. Tables, columns,
 * migrations, API field names, TypeScript types, class names, variables, functions and filenames
 * all still say `ground`. This checks what a person READS, which is why it strips comments and
 * skips anything that is an identifier rather than a sentence.
 */
const SRC = join(__dirname, '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.(tsx?|ts)$/.test(name) && !name.includes('.spec.') ? [p] : []
  })
}

/** Comments first. This file explains the old copy at length and quotes it while doing so. */
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, m => '\n'.repeat((m.match(/\n/g) ?? []).length))
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, m => '\n'.repeat((m.match(/\n/g) ?? []).length))

/**
 * Two known code references that read like prose to a regex: `!ground` and `(ground as any)`.
 * Listed explicitly rather than loosening the pattern, so a real string can never hide behind a
 * broad exemption.
 */
const CODE_NOT_COPY = [
  /\|\| !ground\) return/,
  /\|\| \(ground as any\)\.status ===/,
  /* CheckInPeopleAndSetup.tsx: `(ground as any).overWhatsApp === false ?` sits inside a `>...<`
     JSX text position (a `value={...}` ternary), which reads to the `>text<` matcher as if it were
     between two tags - it is a boolean comparison against the data model, never shown to anyone. */
  /\(ground as any\)\.overWhatsApp === false \?/,
  /* Same file: the reminders row's day/days pluraliser reads `ground.chaseAfterDays` inside a
     template literal the `>...<` matcher also catches as prose. */
  /\(\(ground as any\)\?\.chaseAfterDays/,
  /* DirectionPage.tsx: the list of check-ins the direction is set for, read from `grounds.data` inside JSX; code, never shown. */
  /\(\(grounds\.data as any\[\]\) \?\? \[\]\)\.filter/,
  /* GroundParticipantPage.tsx: `<ContextPage ground={ground} ...>` passes the record to a component inside JSX; code, never shown. */
  /<ContextPage ground=\{ground\}/,
]

describe('one word for the thing a person opens', () => {
  const offenders: string[] = []

  for (const file of walk(SRC)) {
    const code = strip(readFileSync(file, 'utf8'))
    code.split('\n').forEach((line, idx) => {
      const hits: string[] = []
      for (const m of line.matchAll(/>([^<>{}]*\b[Gg]rounds?\b[^<>{}]*)</g)) hits.push(m[1].trim())
      /**
       * TEMPLATE LITERALS, WHICH THE QUOTE MATCHER NEVER LOOKED AT.
       *
       * Only ' and " were matched, so `${awaiting.length} grounds have been set up` sat on the
       * list page through the whole sweep. The hole is filled by stripping the ${...} and reading
       * what is left, which is the sentence.
       */
      for (const m of line.matchAll(/`([^`\n]*\b[Gg]rounds?\b[^`\n]*)`/g)) {
        /**
         * Strip the ${...} holes BEFORE looking for the word, not after. `${grounds.length}` is the
         * data model reaching into a sentence, and counting it would have this file demanding that a
         * variable be renamed - the one thing the standing constraint forbids.
         */
        const t = m[1].replace(/\$\{[^}]*\}/g, ' ').trim()
        if (/\b[Gg]rounds?\b/.test(t) && /[a-z] [a-z]/.test(t)) hits.push(t)
      }
      for (const m of line.matchAll(/['"]([^'"\n]*\b[Gg]rounds?\b[^'"\n]*)['"]/g)) {
        const t = m[1].trim()
        if (!t) continue
        /** Identifiers, paths and query keys are the data model, which stays. */
        if (/^[/@a-z0-9_\-:${}.[\]]+$/.test(t)) continue
        if (!/[a-z] [a-z]/.test(t) && t !== 'Grounds' && t !== 'New ground') continue
        hits.push(t)
      }
      /**
       * THE BLIND SPOT THAT LET SIXTY STRINGS THROUGH.
       *
       * Everything above needs BOTH delimiters on one line - `>text<` for JSX, or a pair of quotes.
       * Real copy is wrapped prose: a tag opens on one line, the sentence runs across two or three, and
       * the closing tag is somewhere below. None of those lines has a `>` or a `<` on it, so this file
       * could not see them and reported clean while the list page's own definition of the concept -
       * "A check-in is a shared space where two or more parties check in privately" - shipped.
       *
       * That is the fourth time this has happened, and this file's own header describes the pattern:
       * "strings were changed, the count went down, nobody counted what was left."
       *
       * So a bare prose line counts too. A line with no bracket and no brace, starting with a letter,
       * is either wrapped copy or a comment - and the comments are already stripped above.
       */
      const bare = line.trim()
      /**
       * STRIP THE MARKUP, DO NOT REJECT THE LINE. The third hole in this file.
       *
       * The test used to skip any line containing `<`, `>`, `{` or `}`, on the theory that those lines
       * are handled by the `>text<` matcher. They are not: that matcher needs a `>` BEFORE the text and
       * a `<` after it, on the same line. A line of wrapped prose whose last token is a tag -
       *
       *     Groundwork board · confidential · generated from the ground.<br />
       *
       * has the `<` and no `>` before it, so the matcher missed it and the reject rule hid it. Two of
       * those shipped in the board footer and I found them by reading the rendered page, which is the
       * one method that has caught every hole in this file.
       *
       * So markup and `${...}` holes are removed and what REMAINS is tested. Broader, and the code
       * exclusions below are what keep it honest.
       */
      const prose = bare
        .replace(/<[^>]*>/g, ' ')
        .replace(/\$?\{[^{}]*\}/g, ' ')
        /** Template literals are routes far more often than sentences here. */
        .replace(/`[^`]*`/g, ' ')
        /** Any token with a slash in it is a path - `/grounds/:id` is the data model and stays. */
        .replace(/\S*\/\S*/g, ' ')
        .trim()
      const isBareProse =
        // A leading symbol is still copy: "+ Open a ground", "← Back to grounds".
        /^[^A-Za-z0-9]{0,3}[A-Za-z]/.test(prose) &&
        /\bgrounds?\b/i.test(prose) &&
        /**
         * TWO LOWERCASE WORDS IN A ROW, the same prose signal the quote matcher uses. Without it,
         * stripping markup left API route builders looking like sentences and this reported twenty
         * false positives on `/grounds/:id` paths - which are the data model and must never change.
         */
        /[a-z] [a-z]/.test(prose) &&
        // Code that reads like prose to a regex: keys, paths, property access, statements.
        !/queryKey|navigate\(|window\.location|sessionStorage|localStorage|setQueryData|\(ground as any\)|ground\?\.|ground\.\w|^(import|export|const|let|return|if|type|interface|await|function)\b|^\w+[:.]|id="|to: '|grounds as any|grounds\.length|grounds\.map/g
          .test(bare)
      if (isBareProse) hits.push(prose)

      for (const h of hits) {
        /**
         * MASK THE BRAND, DO NOT SKIP THE LINE. A fourth hole, found the same way as the others.
         *
         * `if (h.includes('Groundwork')) continue` threw away the whole hit, so a sentence carrying
         * BOTH words was exempt - and the board footer read "Groundwork board · confidential ·
         * generated from the ground." That line was protected by the brand it also violated.
         */
        if (!/\bgrounds?\b/.test(h.replace(/Groundwork/g, ' '))) continue
        if (CODE_NOT_COPY.some(re => re.test(line))) continue
        offenders.push(`${file.replace(SRC, '')}:${idx + 1}  ${h.slice(0, 90)}`)
      }
    })
  }

  it('nothing a person reads calls it a ground', () => {
    expect(offenders).toEqual([])
  })
})

describe('and the two words stay distinct', () => {
  /* NAV_ITEMS moved out of AppShell.tsx into nav-items.tsx (group 1 rebuild) - see
     the-rebuilt-pages-use-only-the-new-parts.spec.ts. Behaviour is unchanged; only where the nav
     item list itself is written moved. */
  const shell = readFileSync(join(SRC, 'components/gw/nav-items.tsx'), 'utf8')

  it('the nav names the object', () => {
    /* Renamed to "All check-ins": the rail above it is already a list of check-ins, so the item
       and the thing it sat under were called the same word. The word under test is still ours. */
    expect(shell).toContain("label: 'All check-ins'")
  })

  it('"session" is still the word for the thing inside one', () => {
    /**
     * The half of the decision that is easy to lose. If a later sweep renames sessions to
     * check-ins as well, the product can no longer say "your check-in has three sessions" and
     * every sentence about cadence becomes ambiguous.
     *
     * U.8 REVIEW: the bare `Session ${sessionNumber}` this pinned is gone from the bottom bar - an
     * ordinary session says nothing there now (docs/prototype/screens/B3-the-check-in/*.txt never
     * print a lone session number either; see the U.8 review). The word itself did not go with it:
     * `privacyLabel` still says "Closing session ${sessionNumber}" and "Correcting session
     * ${correctingSession}" for the two cases that DO have something to say about the session, so
     * this now pins one of those instead of the sentence that was removed.
     */
    /* Changed 3 November evening: the check-in page no longer says anything about the session (Hafsah: no explanation lines), so the
       word is pinned where a person still reads it, on the finished check-in: "Session 3 of 12". */
    const finished = readFileSync(join(SRC, 'components/gw/TheCheckInYouJustFinished.tsx'), 'utf8')
    expect(finished).toContain('{`Session ${sessionNumber}${d?.plannedSessions ? ` of ${d.plannedSessions}` : \'\'}`}')
  })
})
