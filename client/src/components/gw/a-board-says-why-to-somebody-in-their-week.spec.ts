import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { WAITING_FOR_AN_ADMINS_YES } from './GroundGone'

/** The board says why only for the server's own sentence, so the two are kept word for word (26 November 2026). */
describe('the board for somebody in their week', () => {
  it('reads the same sentence the server sends', () => {
    const server = readFileSync(join(__dirname, '../../../../api/src/modules/participants/held-for-a-seat.ts'), 'utf8')
    expect(server).toContain(`export const WAITING_FOR_AN_ADMINS_YES = '${WAITING_FOR_AN_ADMINS_YES}';`)
  })
})
