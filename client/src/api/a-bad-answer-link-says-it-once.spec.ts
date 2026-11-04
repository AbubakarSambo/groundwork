import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * B-207: A BROKEN /answer?t= LINK SHOWED TWO STACKED RED TOASTS.
 *
 * `openLinkApi.whatThisIs` (`client/src/api/entry.ts`) did not carry `skipNotFoundToast`, so a 404
 * from `/entry/open` raised the client's own generic 404 toast ("That is not here any more", with
 * the server's own sentence repeated underneath it as the description) on top of AnswerFirstPage's
 * own screen, which already says "That link didn't work" with that same sentence under it - the
 * same double-message bug `participantsApi.preview` and `joinApi.preview` were fixed for (see
 * a-bad-join-link-says-it-once.spec.ts), left unfixed on this sibling call. `entry.ts` only imports
 * `apiClient`, so this reads the one literal call site directly rather than re-implementing the
 * axios interceptor.
 */
const entry = fs.readFileSync(path.join(__dirname, 'entry.ts'), 'utf8')

describe('a bad /answer link says it once, not twice', () => {
  it('openLinkApi.whatThisIs skips the global 404 toast, the same way the other preview calls do', () => {
    const at = entry.indexOf('whatThisIs: (token: string) =>')
    expect(at).toBeGreaterThan(-1)
    const call = entry.slice(at, entry.indexOf('/entry/open', at) + 400)
    expect(call).toMatch(/skipNotFoundToast:\s*true/)
  })
})
