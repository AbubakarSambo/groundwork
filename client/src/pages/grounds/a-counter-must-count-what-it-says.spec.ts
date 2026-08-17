import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "REPORTS READY 0" ABOVE A GROUND THAT SAYS "4 AGREED, 2 STILL OPEN".
 *
 * Found by signing in as the lead of a real org and reading her own grounds list. The tile was
 * labelled "Reports ready" and counted something else: reports waiting for THIS PERSON to open,
 * from which the initiator is deliberately exempt because they released it and can always read it.
 * Both halves were defensible alone. Together, on one screen, they told her nothing was ready while
 * the ground beneath printed its report's own summary.
 *
 * It is the same defect as "0 of 3 checked in" over a finished report, which this product already
 * fixed once: a counter whose label promises one thing and whose value measures another. A leader
 * cannot act on a page that argues with itself.
 *
 * The second finding came out of fixing the first. `needsAttention` and the urgency sort both tested
 * `status === 'REPORT_READY'` - a status nothing has written since report release began
 * auto-activating to ACTIVE, as the schema's own comment records. So the banner could only fire on
 * an overdue check-in, and a released report nobody had read could not raise its hand at all.
 */
const SRC = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the tile says what it counts', () => {
  it('is no longer labelled "Reports ready"', () => {
    expect(CODE).not.toMatch(/label: 'Reports ready'/)
  })

  it('and names the thing it actually measures', () => {
    expect(CODE).toMatch(/label: 'Waiting for you to read'/)
  })

  it('while still counting the live signal, not the dead status', () => {
    /**
     * The value was already correct and had been fixed once - the old version counted grounds in
     * REPORT_READY and sat permanently at zero. This must not regress to that.
     */
    expect(CODE).toMatch(/const reportsReady = grounds\.filter\(g => \(g as any\)\.reportWaitingForMe\)\.length/)
  })
})

describe('a report nobody has read can raise its hand', () => {
  it('the attention filter reads the live signal', () => {
    expect(CODE).toMatch(/reportWaitingForMe \|\| g\.status === 'REPORT_READY' \|\| \(g\.overdue \?\? 0\) > 0/)
  })

  it('and so does the ordering, so it sorts to the top', () => {
    const sort = CODE.slice(CODE.indexOf('const urgency ='))
    expect(sort.slice(0, 200)).toMatch(/reportWaitingForMe/)
  })

  it('but the legacy status still counts, because old rows carry it', () => {
    /**
     * Deliberately kept rather than deleted. Grounds written before the release change really are
     * REPORT_READY, and dropping the test would silently stop surfacing them.
     */
    expect(CODE).toMatch(/g\.status === 'REPORT_READY'/)
  })

  it('an overdue check-in still surfaces too', () => {
    /** The control: this was the only thing that worked before, and it must keep working. */
    expect(CODE).toMatch(/\(g\.overdue \?\? 0\) > 0/)
  })
})
