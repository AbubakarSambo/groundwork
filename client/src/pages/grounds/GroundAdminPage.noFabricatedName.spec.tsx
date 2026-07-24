import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * NO-FABRICATED-NAME display guard. The initiator's own roster and the
 * shared-solo-report label used to show a raw email / email-local-part
 * instead of the participant's actual name (or roleAsDescribed / "a
 * teammate" fallback) - the one existing helper for this, participantLabel(),
 * was bypassed on these two surfaces. Source-level: both call sites must use
 * participantLabel, and neither may render a raw email-local-part as a name.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundAdminPage.tsx'),
  'utf8',
)

describe('GroundAdminPage: roster and shared-report label use participantLabel, not a raw email', () => {
  it('imports participantLabel', () => {
    expect(src).toMatch(/import \{ participantLabel \} from '@\/lib\/utils'/)
  })

  it('the roster row name uses participantLabel(p), not the raw email', () => {
    expect(src).toMatch(/\{participantLabel\(p\)\}/)
  })

  it('the shared-report label uses participantLabel(p), not email.split', () => {
    expect(src).toMatch(/\{participantLabel\(p\)\}'s private report/)
    expect(src).not.toMatch(/p\.email\.split\('@'\)\[0\]/)
  })
})
