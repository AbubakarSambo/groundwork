import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A FAILURE IS NEVER A SUCCESS.
 *
 * SaveCard's onError was byte-for-byte its onSuccess: a request that failed wrote the storage keys and
 * sent the person to "check your email" for a mail that never went. Ten more screens had a shape of
 * the same thing - a mutation with no onError, so a failure was a button that spun for ever or did
 * nothing, or a query whose failure rendered as a clean bill of health.
 *
 * This sweeps every useMutation in pages/ and components/ and requires an onError. The ones that do
 * not have one yet are named below, so the number can only shrink: a new mutation must either handle
 * its failure or be added here with a reason, and each of these still owes one or the other.
 */
const ROOTS = [join(__dirname), join(__dirname, '..', 'components')]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.tsx') && !name.includes('.spec.')) out.push(full)
  }
  return out
}

/** Every `useMutation({ ... })` object literal in a file, by the name it was assigned to. */
function mutationsIn(src: string): { name: string; block: string }[] {
  const out: { name: string; block: string }[] = []
  const re = /useMutation\(\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 1
    while (i < src.length && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++ }
    const nameMatch = /(\w+)\s*=\s*useMutation$/.exec(src.slice(Math.max(0, m.index - 80), m.index + 11).replace(/\($/, ''))
    out.push({ name: nameMatch?.[1] ?? '?', block: src.slice(m.index, i) })
  }
  return out
}

/**
 * NOT YET REVIEWED. Each of these lacks an onError today. None has been judged deliberately silent;
 * they are listed so this guard can exist now rather than after somebody reviews thirty screens.
 * Taking one off this list means giving it an onError - or moving it to a "deliberately silent"
 * entry with the reason written beside it.
 */
const NOT_YET_REVIEWED = new Set([
  'org/IntegrationsPage.tsx#askForAccess', 'org/IntegrationsPage.tsx#replay',
  'admin/AdminPage.tsx#toggle', 'admin/AdminPage.tsx#markAnswered', 'admin/AdminPage.tsx#markRead',
  'admin/ApiAccessPage.tsx#clearFlag',
  'ops/OpsResourcesPage.tsx#recheck', 'ops/OpsCompanyPages.tsx#open', 'ops/OpsCompanyPages.tsx#decide',
  'ops/OpsCompanyPages.tsx#push', 'ops/OpsPeoplePage.tsx#change', 'ops/OpsPeoplePage.tsx#setActive',
  'ops/OpsBoardPage.tsx#close', 'ops/OpsBoardPage.tsx#decide', 'ops/OpsForm.tsx#save', 'ops/OpsForm.tsx#move',
  '../components/InferenceReviewPanel.tsx#clarifyMut',
  '../components/gw/ExpectationsPanel.tsx#markShown', '../components/gw/ContextPage.tsx#deleteDoc',
])

const key = (file: string, name: string) => `${file.replace(join(__dirname) + '/', '').replace(join(__dirname, '..', 'components') + '/', '../components/')}#${name}`

describe('every mutation says what happened when it failed', () => {
  const silent: string[] = []
  for (const root of ROOTS) for (const f of walk(root)) {
    for (const { name, block } of mutationsIn(readFileSync(f, 'utf8'))) {
      if (!/onError/.test(block)) silent.push(key(f, name))
    }
  }

  it('or is on the not-yet-reviewed list, which can only shrink', () => {
    const unlisted = silent.filter((k) => !NOT_YET_REVIEWED.has(k))
    expect(unlisted).toEqual([])
  })

  it('and the list names nothing that has since been fixed', () => {
    const fixed = [...NOT_YET_REVIEWED].filter((k) => !silent.includes(k))
    expect(fixed).toEqual([])
  })
})

describe('the five this batch fixed stay fixed', () => {
  it.each([
    ['grounds/GroundAdminPage.tsx', 'dismissRequest'],
    ['grounds/GroundAdminPage.tsx', 'remind'],
    /* U.18: switching WhatsApp on or off, and disconnecting it, moved to their own pages. */
    ['connections/WhatsAppSetupPage.tsx', 'turn'],
    ['connections/ConnectionsPage.tsx', 'disconnect'],
    ['billing/PricingPage.tsx', 'subscribeMut'],
  ])('%s#%s has an onError', (file, name) => {
    const src = readFileSync(join(__dirname, file), 'utf8')
    const m = mutationsIn(src).find((x) => x.name === name)
    expect(m, `${file}#${name} not found`).toBeTruthy()
    expect(m!.block).toMatch(/onError/)
  })
})

describe('SaveCard', () => {
  const src = readFileSync(join(__dirname, 'home/SaveCard.tsx'), 'utf8')
  const save = mutationsIn(src).find((x) => x.name === 'saveSession')!

  it('on failure stays on the card, says so, and does not navigate or write the "sent" keys', () => {
    const onError = save.block.slice(save.block.indexOf('onError'))
    expect(onError).toMatch(/setEmailError\(/)
    expect(onError).not.toMatch(/navigate\(/)
    expect(onError).not.toMatch(/Storage\.setItem/)
  })

  it('builds invite links from a real origin', () => {
    expect(src).toMatch(/import\.meta\.env\.VITE_APP_URL \|\| window\.location\.origin/)
  })
})
