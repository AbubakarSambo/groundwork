import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * NO-FABRICATED-NAME guard for the shared report's party handles. Used to
 * render the email local-part as if it were the person's name. Now uses
 * participantLabel() (real name -> roleAsDescribed -> "a teammate"), same
 * helper as every other name-display surface.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ReportPage.tsx'),
  'utf8',
)

describe('ReportPage: party handles use participantLabel, not email.split', () => {
  it('imports participantLabel', () => {
    expect(src).toMatch(/import \{ participantLabel \} from '@\/lib\/utils'/)
  })

  it('adminHandle/partHandle are built from participantLabel, not the email local-part', () => {
    expect(src).toMatch(/adminHandle = adminParty \? participantLabel\(adminParty\)/)
    expect(src).toMatch(/partHandle = partParty \? participantLabel\(partParty\)/)
    expect(src).not.toMatch(/\.email\?\.split\('@'\)\[0\]/)
  })
})
