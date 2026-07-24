import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #21: getCodeShareCard called a nonexistent route (/billing/code-share/:id).
 * The real route, per billing.controller.ts, is
 * /billing/contributor-codes/:codeId/share-card - the same one
 * getContributorCodeShareCard already uses correctly. This locks that both
 * functions hit the real route.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'billing.ts'),
  'utf8',
)

describe('#21 getCodeShareCard hits the real contributor-codes route', () => {
  it('does not reference the nonexistent /billing/code-share/ route', () => {
    expect(src).not.toMatch(/\/billing\/code-share\//)
  })

  it('getCodeShareCard uses the real share-card route', () => {
    const block = src.slice(src.indexOf('getCodeShareCard:'))
    expect(block).toMatch(/\/billing\/contributor-codes\/\$\{codeId\}\/share-card/)
  })
})
