import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-201 (review round 2): GW-PRI-04 says a stranger holding a link to a real check-in that is not
 * theirs (403) must read exactly the same thing as one holding a made-up id (404) - the point is
 * that neither can tell whether something real sits behind the link.
 *
 * ChatPage, EndingPage and RoundReportPage already render one shared "gone" screen for both
 * statuses (ChatPage's own GroundGone branch; EndingPage's and RoundReportPage's `definitelyGone`),
 * but three of the requests those pages make still carried neither skip flag, so the client's
 * global 403/404 handler raised its own toast on top of the shared screen - and that toast DOES
 * name which of the two it was ("not yours to open" against "not here any more"), undoing the
 * unification the screen itself was built for. A real check-in opened by a stranger showed three
 * toasts naming the 403; a made-up id showed three toasts naming the 404. Fixed by adding
 * `skipForbiddenToast`/`skipNotFoundToast` to each of the three calls below, the same way
 * `groundsApi.get` and `boardApi.get` already carry both (board-refusals-say-their-own-sentence.spec.ts).
 */
describe('a stranger reads no second toast on top of the one shared screen', () => {
  it('conversationApi.open (POST /check-ins/:id/open) skips both toasts', () => {
    const src = readFileSync(join(__dirname, 'conversation.ts'), 'utf8')
    const at = src.indexOf('/check-ins/${checkInId}/open')
    const line = src.slice(at, src.indexOf('\n', at))
    expect(line).toContain('skipForbiddenToast: true')
    expect(line).toContain('skipNotFoundToast: true')
  })

  it('conversationApi.transcript (GET /check-ins/:id/transcript) skips both toasts', () => {
    const src = readFileSync(join(__dirname, 'conversation.ts'), 'utf8')
    const at = src.indexOf('/check-ins/${checkInId}/transcript')
    const line = src.slice(at, src.indexOf('\n', at))
    expect(line).toContain('skipForbiddenToast: true')
    expect(line).toContain('skipNotFoundToast: true')
  })

  it('suggestionsApi.onCheckIn (GET /grounds/:id/suggestions), read by EndingPage, skips both toasts', () => {
    const src = readFileSync(join(__dirname, 'suggestions.ts'), 'utf8')
    const at = src.indexOf('/grounds/${groundId}/suggestions')
    const line = src.slice(at, src.indexOf('\n', at))
    expect(line).toContain('skipForbiddenToast: true')
    expect(line).toContain('skipNotFoundToast: true')
  })

  it('resolutionApi.get (GET /grounds/:id/resolution), read by EndingPage, skips both toasts', () => {
    const src = readFileSync(join(__dirname, 'resolution.ts'), 'utf8')
    const at = src.indexOf('/grounds/${groundId}/resolution')
    const line = src.slice(at, src.indexOf('\n', at))
    expect(line).toContain('skipForbiddenToast: true')
    expect(line).toContain('skipNotFoundToast: true')
  })
})
