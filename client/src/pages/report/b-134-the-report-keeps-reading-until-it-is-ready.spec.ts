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
/* Changed in batch 2, group 5: the session report page went; your own report is drawn in My work by TheCheckInYouJustFinished,
   which now keeps reading the session's own writing until it arrives. */
describe('B-134: your own report keeps reading until it has arrived', () => {
  const SRC = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheCheckInYouJustFinished.tsx'), 'utf8')

  it('reads the session\'s own writing again while it has not come back yet', () => {
    const queryBlock = SRC.slice(SRC.indexOf("queryKey: ['artifact', checkInId]"), SRC.indexOf("queryKey: ['artifact', checkInId]") + 700)
    expect(queryBlock).toMatch(/refetchInterval:/)
  })
})
