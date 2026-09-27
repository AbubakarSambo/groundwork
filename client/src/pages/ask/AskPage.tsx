import { AskGroundwork } from '@/components/gw/AskGroundwork'

/**
 * #/chat (D1, ask-on-a-phone.txt): Ask Groundwork as a page of its own, which is how a phone opens
 * it from "Chat" in the bottom bar. On a computer the same panel opens beside any page.
 */
export function AskPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100dvh - var(--gw-bottom-nav, 0px))', boxSizing: 'border-box' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--gw-font-name)', fontSize: 26, fontWeight: 500 }}>Chat</h1>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AskGroundwork />
      </div>
    </div>
  )
}
