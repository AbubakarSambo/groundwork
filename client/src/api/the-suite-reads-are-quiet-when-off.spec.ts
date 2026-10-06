import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WALK OF THE EXISTING CLIENTS' USE CASES (7 October): a red "That is not here any more" greeted
 * every reader in an organisation with the suites off, because the sidebar and Today read the queue
 * and the person's own requests for everybody. These reads must stay quiet on 404 and 403.
 */
const src = readFileSync(join(__dirname, 'suites.ts'), 'utf8')

describe('the suite reads made on every page are quiet when the suites are off', () => {
  for (const path of ["'/suites/queue'", "'/suites/leave/mine'", "'/suites/spend/mine'"]) {
    it(`${path} skips the not-found and forbidden pop-ups`, () => {
      const line = src.split('\n').find(l => l.includes(`apiClient.get(${path}`)) ?? ''
      expect(line).toContain('skipNotFoundToast: true')
      expect(line).toContain('skipForbiddenToast: true')
    })
  }
})
