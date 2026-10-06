import { AskGroundwork } from '@/components/gw/AskGroundwork'
import { useAskStore } from '@/stores/ask'

/**
 * #/chat (D1, ask-on-a-phone.txt): Ask Groundwork as a page of its own, which is how a phone opens
 * it from "Chat" in the bottom bar. On a computer the same panel opens beside any page.
 *
 * PHONE CHECK, ITEM 1: a question typed elsewhere (the header's "Ask", the board's own Ask bar, a
 * Company page button) is kept in `pendingMessage` and handed in here as `initialMessage`, the same
 * way AppShell's desktop drawer already does - AppShell redirects here instead of opening that
 * drawer once the screen is phone width. Read and consumed once, so it is never re-sent.
 */
export function AskPage() {
  const pendingAskMessage = useAskStore(s => s.pendingMessage)
  const consumePendingAskMessage = useAskStore(s => s.consumePendingMessage)
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100dvh - var(--gw-bottom-nav, 0px))', boxSizing: 'border-box' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--gw-font-name)', fontSize: 26, fontWeight: 500 }}>Chat</h1>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AskGroundwork initialMessage={pendingAskMessage} onSentInitialMessage={consumePendingAskMessage} />
      </div>
    </div>
  )
}
