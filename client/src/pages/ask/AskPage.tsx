import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { AskGroundwork } from '@/components/gw/AskGroundwork'
import { useAskStore } from '@/stores/ask'
import { useAuthStore } from '@/stores/auth'
import { askNameFor } from '@/lib/ask-name'

/**
 * #/chat (D1, ask-on-a-phone.txt): Ask Groundwork as a page of its own, which is how a phone opens
 * it from "Chat" in the bottom bar. On a computer the same panel opens beside any page.
 *
 * PHONE CHECK, ITEM 1: a question typed elsewhere (the header's "Ask", the board's own Ask bar, a
 * Company page button) is kept in `pendingMessage` and handed in here as `initialMessage`, the same
 * way AppShell's desktop drawer already does - AppShell redirects here instead of opening that
 * drawer once the screen is phone width. Read and consumed once, so it is never re-sent.
 *
 * "I CAN HELP YOU DO THAT" (docs/answers-from-engine.md, 8 October, point 3 of "the engagement
 * work"): `/chat?about=<check-in id>` opens Ask with a question already put, so a first-insight
 * mail can hand a lead straight into the conversation worth having rather than an empty box.
 * The real finding is read from GET /grounds/:id/report/finding (request 198), the same sentence the
 * mail's subject says. Where the reader has none yet (the picture is not released to them, or it names
 * nothing open), the question stays the neutral one naming the check-in. `about` is read once; a second visit with the same
 * query string (the browser back button) does not ask it again, because `pendingMessage` already
 * carries whatever the panel is showing by then.
 */
export function AskPage() {
  const pendingAskMessage = useAskStore(s => s.pendingMessage)
  const consumePendingAskMessage = useAskStore(s => s.consumePendingMessage)
  const showWith = useAskStore(s => s.showWith)
  const [searchParams] = useSearchParams()
  const about = searchParams.get('about')
  const askedAboutRef = useRef<string | null>(null)
  /*
   * B-163: THIS PAGE'S OWN HEADING SAID "CHAT", WHILE THE PANEL IT OPENS NAMES ITSELF AFTER THE
   * ORGANISATION ("Ask Kijani Foods", decision 100). Read the same way AskGroundwork.tsx already
   * does, from the signed-in person's own organisation, so a reader never sees two different names
   * for the one assistant.
   */
  const authUser = useAuthStore(s => s.user) as any
  const orgName = authUser?.organization?.name?.trim() || authUser?.organizationName || ''
  const askDisplayName = askNameFor(orgName)

  const { data: ground, isFetched } = useQuery({
    queryKey: ['ask-about-ground', about],
    queryFn: () => groundsApi.get(about!),
    enabled: !!about,
    retry: false,
  })
  /* The real finding (request 198), when the shared picture has one for this reader. Without it the question stays the neutral one. */
  const { data: found, isFetched: foundFetched } = useQuery({
    queryKey: ['ask-about-finding', about],
    queryFn: () => groundsApi.finding(about!),
    enabled: !!about,
    retry: false,
  })

  useEffect(() => {
    if (!about || askedAboutRef.current === about || !isFetched || !foundFetched) return
    askedAboutRef.current = about
    if (found?.finding) {
      showWith(`Help me with what the shared picture found about ${found.label || ground?.label || 'this conversation'}. ${found.finding}`)
      return
    }
    const name = ground?.label ? `the conversation about ${ground.label}` : 'this conversation'
    showWith(`Help me prepare for ${name}.`)
  }, [about, isFetched, foundFetched, ground, found, showWith])

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100dvh - var(--gw-bottom-nav, 0px))', boxSizing: 'border-box' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--gw-font-name)', fontSize: 26, fontWeight: 500 }}>{askDisplayName}</h1>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AskGroundwork initialMessage={pendingAskMessage} onSentInitialMessage={consumePendingAskMessage} />
      </div>
    </div>
  )
}
