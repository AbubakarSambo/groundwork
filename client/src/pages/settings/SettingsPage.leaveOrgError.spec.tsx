import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #18: a failed "leave organisation" call used to fail completely silently -
 * no onError handler existed on the mutation at all. This locks that the
 * mutation surfaces the failure to the person via a toast.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'SettingsPage.tsx'),
  'utf8',
)

describe('#18 leaveOrg surfaces failures', () => {
  it('has an onError handler on the leaveOrg mutation that shows a toast', () => {
    const leaveOrgBlock = src.slice(src.indexOf('const leaveOrg = useMutation('), src.indexOf('function handleNotifToggle'))
    expect(leaveOrgBlock).toMatch(/onError/)
    expect(leaveOrgBlock).toMatch(/toast\.error/)
  })
})
