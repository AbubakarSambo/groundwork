import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-134: Esther finished session 1 and My work said "Your report is ready", while opening it said
 * "Your report is still being written. Your answers are saved; this fills in as soon as it is
 * ready." - and never did, because the query behind it never read again on its own. The promise
 * "fills in as soon as it is ready" was false until this page polls while the report has not
 * arrived yet, the same way the shared report below it already polls while it is behind.
 */
describe('B-134: the session report keeps reading until it has arrived', () => {
  const SRC = readFileSync(join(__dirname, 'SessionReportPage.tsx'), 'utf8')

  it('polls the session report while it has not come back yet', () => {
    const queryBlock = SRC.slice(
      SRC.indexOf("queryKey: ['session-report', checkInId]"),
      SRC.indexOf("queryKey: ['session-report', checkInId]") + 1200,
    )
    expect(queryBlock).toMatch(/refetchInterval:/)
  })
})
