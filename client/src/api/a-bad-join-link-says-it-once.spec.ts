import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * GROUP 3'S REVIEW, BATCH A, FAULT 3: A BAD /join LINK SHOWED TWO RED ERROR MESSAGES.
 *
 * `joinApi.preview` (`client/src/api/entry.ts`) did not carry `skipNotFoundToast`, so a 404 from
 * `/entry/join-preview` raised the client's own generic "That is not here any more" toast on top of
 * `JoinPage`'s own sentence (`LinkProblem kind="join"`) - the same double-message bug
 * `participantsApi.preview` was fixed for (see its own comment in `participants.ts`), left unfixed
 * on the sibling call. `entry.ts` only imports `apiClient`, so this reads the one literal call site
 * directly rather than re-implementing the axios interceptor.
 */
const entry = fs.readFileSync(path.join(__dirname, 'entry.ts'), 'utf8')

describe('a bad /join link says it once, not twice', () => {
  it('joinApi.preview skips the global 404 toast, the same way participantsApi.preview does', () => {
    const at = entry.indexOf('preview: (token: string) =>')
    expect(at).toBeGreaterThan(-1)
    const call = entry.slice(at, entry.indexOf('/entry/join-preview', at) + 400)
    expect(call).toMatch(/skipNotFoundToast:\s*true/)
  })

  /**
   * B-213: THE SAME DOUBLE MESSAGE, ON /join/confirm. `joinApi.confirm` (`/entry/join-confirm`) is
   * the call `JoinConfirmPage.tsx` makes the moment it loads - a bad or missing token raised the
   * generic 404 toast on top of that page's own `LinkProblem`, the same fault as `joinApi.preview`
   * above, just missed on the sibling call.
   */
  it('joinApi.confirm skips the global 404 toast too', () => {
    const at = entry.indexOf('confirm: (token: string) =>')
    expect(at).toBeGreaterThan(-1)
    const call = entry.slice(at, entry.indexOf('/entry/join-confirm', at) + 400)
    expect(call).toMatch(/skipNotFoundToast:\s*true/)
  })
})
