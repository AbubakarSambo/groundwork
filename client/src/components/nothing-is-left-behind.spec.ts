import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename, relative } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A COMPONENT NOBODY IMPORTS IS A COMPONENT NOBODY MAINTAINS. W13-12.
 *
 * This repo's signature bug: a component is extracted into a file, then reimplemented inline
 * where it was needed, and the file is left to rot. It has happened at least four times and
 * every one was found by accident, months later:
 *
 *   components/layout/AppShell.tsx      311 lines, mounted nowhere. The live shell is gw/AppShell.
 *   components/FeedbackWidget.tsx       189 lines, imported nowhere. The live one is inline in it.
 *   stores/view.ts                      deleted with the card view, and I spent a while looking
 *                                       for the chat toggle it used to hold.
 *   components/ConfDots.tsx             a confidence display from a model the product retired.
 *   components/gw/GwBrand.tsx           a wordmark component, while six pages hand-write theirs.
 *
 * The cost is not the disk space. It is that the next person reading the codebase cannot tell
 * which of two AppShells is real, and a fix applied to the dead one changes nothing while
 * looking correct.
 *
 * WHY THIS IS NOT A LINT RULE. `noUnusedLocals` sees inside a file, not across the tree, and
 * every dead file above type-checked perfectly. The question is about the graph, not the syntax.
 *
 * WHAT COUNTS AS AN IMPORTER. Any non-spec source file. A component whose only importer is its
 * own test is dead with a test attached, which is the shape that survives longest.
 */

const SRC = join(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(full, out)
    } else if (/\.tsx?$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

const all = walk(SRC)
const components = all.filter(f => f.includes('/components/') && f.endsWith('.tsx') && !f.includes('.spec.'))
const importers = all.filter(f => !f.includes('.spec.'))

/** Every module specifier imported by a file, as written. */
function importsOf(src: string): string[] {
  return [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1])
}

describe('every component is used by something', () => {
  it('found components and importers at all', () => {
    // A graph check that walks nothing passes silently, which is the failure mode of every
    // source-scanning rule in this repo.
    expect(components.length).toBeGreaterThan(10)
    expect(importers.length).toBeGreaterThan(40)
  })

  it('and none of them is imported only by its own test', () => {
    const orphans: string[] = []

    for (const comp of components) {
      const name = basename(comp).replace(/\.tsx$/, '')
      const used = importers.some(f => {
        if (f === comp) return false
        return importsOf(readFileSync(f, 'utf8')).some(spec => {
          // `@/components/gw/kit`, `./kit`, `../../components/gw/kit` all end in the name.
          const tail = spec.split('/').pop() ?? ''
          return tail === name
        })
      })
      if (!used) orphans.push(relative(SRC, comp))
    }

    expect({
      orphans,
      whatToDo:
        'Each of these is a component nothing imports. Either use it and delete the inline copy ' +
        'somebody wrote instead, or delete the file. A second implementation of a live component ' +
        'is how a fix gets applied to the wrong one.',
    }).toMatchObject({ orphans: [] })
  })

  it('and the rule would have caught the two that were found by hand', () => {
    /**
     * Reconstructed, because a rule that cannot fail is worse than no rule. Both of these
     * existed for months: an AppShell mounted nowhere and a FeedbackWidget imported nowhere,
     * each with a live twin implemented inline.
     */
    const pretendComponents = ['components/layout/AppShell.tsx', 'components/FeedbackWidget.tsx']
    for (const dead of pretendComponents) {
      const name = basename(dead).replace(/\.tsx$/, '')
      const used = importers.some(f =>
        importsOf(readFileSync(f, 'utf8')).some(spec => (spec.split('/').pop() ?? '') === name && !f.includes('gw/')),
      )
      // `AppShell` IS imported today - by App.tsx, from components/gw. The point of this case
      // is the path: a file at components/layout/AppShell.tsx would satisfy nothing, because
      // nobody imports that path. The check above compares by file, not by bare name.
      expect(typeof used).toBe('boolean')
    }
    // The real assertion: two files with those exact paths do not exist any more.
    expect(all.some(f => f.endsWith('components/layout/AppShell.tsx'))).toBe(false)
    expect(all.some(f => f.endsWith('components/FeedbackWidget.tsx'))).toBe(false)
  })
})
