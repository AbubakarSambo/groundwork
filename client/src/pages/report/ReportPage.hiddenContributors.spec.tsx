import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * #1b/#1c: hiddenContributors is computed server-side (reports.service.ts REPORT_SCHEMA, nested
 * under Report.engagement.hiddenContributors) and is read by the board as `b.hiddenContributors`.
 * This locks that it is surfaced with a real action, and that the action branches correctly by
 * role: the initiator (who can call groundsApi.addParticipant for real) gets a real add; a
 * participant (who cannot add anyone themselves) gets the ParticipantRequest flow instead.
 *
 * MOVED FROM THE DEAD REPORT BODY. This used to read `HiddenContributorsSection` out of the old
 * `ReportBody` (`ReportPage.tsx`), which nothing has rendered since the Report tab became a list of
 * sessions - so it only ever locked the behaviour of dead code. The board reads
 * `report.engagement.hiddenContributors` the same way (through `b.hiddenContributors`) and is where
 * a lead actually sees this, so the assertions now point at `HiddenContributorRow` in
 * `BoardPage.tsx`, the live component with the same add-or-request behaviour.
 */
const src = readFileSync(join(__dirname, '..', 'board', 'BoardPage.tsx'), 'utf8')

describe('#1b/#1c hidden contributors are surfaced with a real action', () => {
  it('imports participantRequestsApi', () => {
    expect(src).toMatch(/import \{ participantRequestsApi \} from '@\/api\/participantRequests'/)
  })

  it('reads hiddenContributors off the board read', () => {
    expect(src).toMatch(/b\.hiddenContributors/)
  })

  it('HiddenContributorRow calls addParticipant for the initiator, and participantRequestsApi.create otherwise', () => {
    const block = src.slice(src.indexOf('function HiddenContributorRow'), src.indexOf('export function BoardPage'))
    expect(block).toMatch(/groundsApi\.addParticipant/)
    expect(block).toMatch(/participantRequestsApi\.create/)
    expect(block).toMatch(/isInitiator/)
  })
})
