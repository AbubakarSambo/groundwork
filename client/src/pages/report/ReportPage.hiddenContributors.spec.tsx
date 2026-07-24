import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #1b/#1c: hiddenContributors is computed server-side (reports.service.ts
 * REPORT_SCHEMA, nested under Report.engagement.hiddenContributors) but was
 * never rendered anywhere on ReportPage - dead data with zero UI callers.
 * This locks that it is now surfaced, and that the action branches correctly
 * by role: the initiator (who can call groundsApi.addParticipant for real,
 * since the ground already exists here) gets a real add; a participant
 * (who cannot add anyone themselves) gets the ParticipantRequest flow instead
 * - the previously-orphaned participantRequestsApi.create() finally has a
 * caller.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ReportPage.tsx'),
  'utf8',
)

describe('#1b/#1c hidden contributors are surfaced with a real action', () => {
  it('imports participantRequestsApi (previously had zero callers anywhere)', () => {
    expect(src).toMatch(/import \{ participantRequestsApi \} from '@\/api\/participantRequests'/)
  })

  it('reads hiddenContributors from the correct nested location (engagement.hiddenContributors)', () => {
    expect(src).toMatch(/report as any\)\.engagement\?\.hiddenContributors/)
    expect(src).toMatch(/report as any\)\.engagement\.hiddenContributors/)
  })

  it('HiddenContributorsSection calls addParticipant for the initiator, and participantRequestsApi.create otherwise', () => {
    const block = src.slice(src.indexOf('function HiddenContributorsSection'), src.indexOf('export function ReportPage'))
    expect(block).toMatch(/groundsApi\.addParticipant/)
    expect(block).toMatch(/participantRequestsApi\.create/)
    expect(block).toMatch(/isInitiator/)
  })
})
