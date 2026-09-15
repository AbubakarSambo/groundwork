import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/*
 * TWENTY SPECS IN THIS FOLDER READ THE API'S OWN SOURCE.
 *
 * They are right to: the fault they catch is a screen and a server quietly disagreeing about a
 * field name, and testing either side alone never finds it. The cost is that an ordinary API edit
 * can turn a CLIENT test red, and somebody who runs only the API suite will not see it.
 *
 * That is not hypothetical. On 15 September 2026 a select in conversation.service.ts moved into a
 * shared constant, the API suite stayed green at 7,738, and a spec under pages/chat stayed red for
 * the rest of the day because nobody ran it.
 *
 * This spec cannot make anybody run the other suite. What it can do is keep the coupling visible
 * and countable, so a person who sees this number knows the API is not testable on its own.
 */
const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.spec\.tsx?$/.test(entry)) out.push(p)
  }
  return out
}

const readsTheServer = walk(join(__dirname)).filter((p) => {
  const t = readFileSync(p, 'utf8')
  return /['"`][^'"`]*\.\.\/api\/src|['"`][^'"`]*\/api\/src/.test(t)
})

describe('the client tests the server, so both suites are one suite', () => {
  it('there are specs here that read the API source, and this says how many', () => {
    expect(readsTheServer.length).toBeGreaterThan(10)
  })

  it('and the script that runs both exists, named so nobody has to be told', () => {
    const script = readFileSync(join(__dirname, '..', '..', 'both-suites-or-neither.sh'), 'utf8')
    expect(script).toMatch(/npx jest/)
    expect(script).toMatch(/npx vitest run/)
  })

  it('the script says why, because a rule with no reason gets deleted by whoever finds it', () => {
    const script = readFileSync(join(__dirname, '..', '..', 'both-suites-or-neither.sh'), 'utf8')
    expect(script).toMatch(/READ THE API'S OWN SOURCE/)
    expect(script).toMatch(/7,738/)
  })
})
