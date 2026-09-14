/**
 * THE MARKS ON THE CONNECT PAGE.
 *
 * "Add a WhatsApp logo, and by the request place add logos for the other things we can connect to
 * so people know."
 *
 * WhatsApp, Slack and Teams are drawn, because those three are things Groundwork talks to by name
 * and a person scanning the page recognises them faster than they read a list. Everything else we
 * connect to is a KIND rather than a product - your HR system, your CRM, your project tracker - and
 * there is no logo for a kind. Those are named tiles. Drawing a made-up mark for "CRM", or a rough
 * copy of somebody's brand from memory, would be worse than a word.
 *
 * Drawn here rather than fetched: an image from somewhere else is a request that can fail, a thing
 * to keep up to date, and a hole in the page on a slow connection.
 */

function Tile({ children, name }: { children?: React.ReactNode; name: string }) {
  return (
    <div
      title={name}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        border: '1px solid var(--gw-border)', borderRadius: 8,
        padding: '6px 10px', background: 'white', fontSize: 12, color: 'var(--gw-text)',
      }}
    >
      {children}
      <span>{name}</span>
    </div>
  )
}

/** The green tile and white handset everybody knows. */
export function WhatsAppMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.1 6.7c-5.1 0-9.3 4.2-9.3 9.3 0 1.6.4 3.2 1.2 4.6L6.6 25.3l4.9-1.3c1.3.7 2.8 1.1 4.3 1.1h.3c5.1 0 9.3-4.2 9.3-9.3s-4.2-9.1-9.3-9.1zm5.4 13.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-.9.2-3-.6-2.5-1-4.1-3.6-4.3-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4-.1.7.5.2.6.8 2 .9 2.1.1.1.1.3 0 .5-.1.2-.2.3-.3.5l-.5.5c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.8.8.3.1.4.2.5.3.1.2.1.7-.1 1.3z"
      />
    </svg>
  )
}

/** Slack's four arms, which are geometric enough to draw exactly. */
function SlackMark({ size = 18 }: { size?: number }) {
  const r = 1.6
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="5.2" y="2" width="3.2" height="9.6" rx={r} fill="#36C5F0" />
      <rect x="2" y="15.6" width="9.6" height="3.2" rx={r} fill="#2EB67D" />
      <rect x="15.6" y="12.4" width="3.2" height="9.6" rx={r} fill="#ECB22E" />
      <rect x="12.4" y="5.2" width="9.6" height="3.2" rx={r} fill="#E01E5A" />
    </svg>
  )
}

export function TheThingsYouCanConnect() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 4px' }}>
      <Tile name="WhatsApp"><WhatsAppMark /></Tile>
      <Tile name="Slack"><SlackMark /></Tile>
      {/* Named, not drawn: a rough copy of somebody's brand is worse than the word. */}
      <Tile name="Microsoft Teams" />
      <Tile name="Your HR system" />
      <Tile name="Your CRM" />
      <Tile name="Your project tracker" />
      <Tile name="Your own product" />
    </div>
  )
}
