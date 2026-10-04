import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { plainWordsByPerson, oneWithNoName, atTheStart } from './a-colleague'
import { peopleLabels, participantLabel, personLabel, firstNameOrLabel } from './utils'

/**
 * THE SCREENS SAY WHAT THE ENGINE SAYS ABOUT SOMEBODY WITH NO NAME. Request 36, 27 September 2026.
 *
 * Hafsah: "Fix it the simple way: the label never uses the lead's description; with no name, use a
 * plain neutral label." The engine's words are "a colleague" for one, "one colleague", "another
 * colleague", "a third colleague" for several, and "the lead" / "your lead". This runs the client's
 * copy and the engine's own wording function on the same people and checks they give the same words.
 *
 * MIRROR, NOT AN IMPORT: the client cannot statically import api/src/modules/reports/party-labels.ts
 * (it pulls in `@prisma/client`, which a client-only install, the one staging's build runs, never
 * has - see end-state-mirror.spec.ts for the same pattern). Instead this reads the engine's wording
 * function out of its source file as text and runs it verbatim with `new Function`, so the actual
 * code deciding the words is what is compared, not a second hand-written copy of it. If that
 * function's name, shape or wording moves in the server file, extraction or the comparison below
 * fails.
 */
const SERVER_FILE = resolve(__dirname, '../../../api/src/modules/reports/party-labels.ts')
const serverSrc = readFileSync(SERVER_FILE, 'utf8')

function extract(re: RegExp, what: string): string {
  const m = re.exec(serverSrc)
  if (!m) throw new Error(`could not find ${what} in party-labels.ts - the mirror has drifted`)
  return m[0]
}

/**
 * The body of a function whose signature starts at `nameRe` (its own typed parameter list and
 * return type are TypeScript, which `new Function` cannot parse - only the body, which is plain
 * statements, is taken). Finds the `{` that opens the function and the `}` that closes it by
 * counting braces, so a nested block inside the body (the `forEach` below has one) does not cut it
 * short the way a non-greedy regex would.
 */
function extractBody(nameRe: RegExp, what: string): string {
  const start = nameRe.exec(serverSrc)
  if (!start) throw new Error(`could not find ${what} in party-labels.ts - the mirror has drifted`)
  const open = serverSrc.indexOf('{', start.index)
  let depth = 0
  for (let i = open; i < serverSrc.length; i++) {
    if (serverSrc[i] === '{') depth++
    else if (serverSrc[i] === '}') {
      depth--
      if (depth === 0) return serverSrc.slice(open + 1, i)
    }
  }
  throw new Error(`unbalanced braces reading ${what} out of party-labels.ts`)
}

const theLeadsLabel = extract(/export const THE_LEADS_LABEL = '([^']+)';/, 'THE_LEADS_LABEL')
const theLeadsLabelValue = /'([^']+)'/.exec(theLeadsLabel)![1]
const afterTheSecond = extract(/const AFTER_THE_SECOND = \[([\s\S]*?)\];/, 'AFTER_THE_SECOND')
const plainWordsForTheUnnameableBody = extractBody(
  /export function plainWordsForTheUnnameable\(/,
  'plainWordsForTheUnnameable',
  // The body is otherwise plain JavaScript; `new Map<string, string>()` is the one spot with a type
  // argument, which only TypeScript understands, so it is reduced to the plain `new Map()` it runs
  // as. Nothing about which words are chosen is touched.
).replace(/new Map<[^>]*>\(/g, 'new Map(')

// Runs the engine's own code for these words, taken verbatim from its source file (only the type
// annotations on the function's own signature are not plain JavaScript, so this supplies its own,
// untyped signature and drops in the real body unchanged) - so what is compared below is the actual
// code deciding the wording, not a second hand-written copy of it.
const plainWordsForTheUnnameable = new Function(
  'known',
  'visible',
  'viewerLabel',
  `${theLeadsLabel.replace(/^export\s+/, '')}\n${afterTheSecond}\n${plainWordsForTheUnnameableBody}`,
) as (known: string[], visible: Map<string, string>, viewerLabel: string | null) => Map<string, string>

const when = (d: number) => new Date(Date.UTC(2026, 8, d)).toISOString()
const person = (id: string, d: number, extra: Record<string, unknown> = {}) =>
  ({ id, partyType: 'PARTICIPANT', createdAt: when(d), user: null, nameGiven: null, email: null, ...extra })

const CASES: { what: string; people: any[] }[] = [
  { what: 'one person with no name', people: [person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace' } }), person('a', 2)] },
  { what: 'two people with no name', people: [person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace' } }), person('a', 2), person('b', 3)] },
  {
    what: 'four people with no name, given out of order, one named between them',
    people: [person('d', 9), person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace' } }), person('b', 4), person('n', 3, { nameGiven: 'Tunde' }), person('a', 2), person('c', 5)],
  },
  { what: 'a lead with no name', people: [person('lead', 1, { partyType: 'INITIATOR' }), person('a', 2, { user: { firstName: 'Amina' } })] },
  { what: 'fourteen people with no name', people: Array.from({ length: 14 }, (_, i) => person(`p${i}`, i + 2)) },
]

/**
 * What `plainWordsByPerson` in party-labels.ts does before handing off to the wording function: put
 * everybody with no visible name in createdAt order, the lead's label is THE_LEADS_LABEL, and
 * everybody else's label just needs to be unique. The letter-assignment part of `labelsForParties`
 * is not re-tested here - only the words themselves, which is what this spec is about.
 */
function engineWordsByPerson(people: any[]): Map<string, string> {
  const ordered = [...people].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const named = (p: any) => !!(p.user?.firstName || p.nameGiven)
  const labelOf = new Map<string, string>()
  for (const p of ordered) {
    if (named(p)) continue
    labelOf.set(p.id, p.partyType === 'INITIATOR' ? theLeadsLabelValue : `label-${p.id}`)
  }
  const phrases = plainWordsForTheUnnameable([...labelOf.values()], new Map(), null)
  const out = new Map<string, string>()
  for (const [id, label] of labelOf) {
    const phrase = phrases.get(label)
    if (phrase) out.set(id, phrase)
  }
  return out
}

describe('the client and the engine call a person with no name the same thing', () => {
  for (const c of CASES) {
    it(c.what, () => {
      const engine = engineWordsByPerson(c.people)
      const client = plainWordsByPerson(c.people, { named: (p: any) => !!(p.user?.firstName || p.nameGiven) })
      expect(Object.fromEntries(client)).toEqual(Object.fromEntries(engine))
    })
  }
})

describe('and the screens read them in sentences', () => {
  const lead = person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace', lastName: 'Obi' } })

  it('one person with no name is "a colleague"; a lead with no name is "the lead", or "your lead" to someone in it', () => {
    expect(participantLabel(person('a', 2))).toBe('a colleague')
    expect(participantLabel(person('l', 1, { partyType: 'INITIATOR' }))).toBe('the lead')
    expect(oneWithNoName({ partyType: 'INITIATOR' }, true)).toBe('your lead')
  })

  it('several are "one colleague", "another colleague", "a third colleague", and you are never counted', () => {
    const me = person('me', 2)
    const labels = peopleLabels([lead, me, person('a', 3), person('b', 4), person('c', 5)], { readerId: 'me', readerIsInIt: true })
    expect(labels.get('lead')).toBe('Grace Obi')
    expect(labels.get('a')).toBe('one colleague')
    expect(labels.get('b')).toBe('another colleague')
    expect(labels.get('c')).toBe('a third colleague')
  })

  it('a capital only at the start of a line', () => {
    expect(atTheStart('another colleague')).toBe('Another colleague')
  })

  it('a first-name slot never takes "a" out of "a colleague"', () => {
    expect(firstNameOrLabel(person('a', 2))).toBe('a colleague')
    expect(firstNameOrLabel(lead)).toBe('Grace')
  })

  it('the lead’s own view still uses the address they typed before plain words', () => {
    expect(personLabel(person('a', 2, { email: 'david.okafor@harvestline.test' }))).toBe('David Okafor')
  })
})
