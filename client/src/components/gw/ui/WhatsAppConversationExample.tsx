import './gw-ui.css'

/**
 * "A CHECK-IN OVER WHATSAPP" (F1-connections/connections.txt: "What these look like / On
 * WhatsApp").
 *
 * GROUP 1 RE-REVIEW, FAULT A: `/connect/whatsapp.png` was still an actual screenshot, showing
 * what look like a real organisation's real check-in answers ("Agent Network", "79 active, 18
 * signed", "a split incentive would be fair") to every organisation. Redrawn here in markup, word
 * for word from the prototype's own made-up exchange (connections.txt), the same way
 * `OpsConsoleExample` and `EmbedWidgetExample` redrew the other two screenshots.
 */
const TURNS: { mine: boolean; text: string }[] = [
  { mine: false, text: 'Hi Miriam, your sales check-in is open until 6pm. Yesterday you said Green Mart wanted a quote. What happened?' },
  { mine: true, text: 'Sent it. They want January' },
  { mine: false, text: 'Can you send a photo of the quote? It makes it proof.' },
  { mine: true, text: '📷 quote.jpg' },
  { mine: false, text: 'Got it. It’s on Green Mart now. Did anything else change with your sales today?' },
]

export function WhatsAppConversationExample() {
  return (
    <div className="gwui-wa" role="img" aria-label="A check-in over WhatsApp">
      <div className="gwui-wa-head">
        <span className="gwui-wa-avatar" aria-hidden>B</span>
        <span>
          <p className="gwui-wa-org">Baridi Appliances</p>
          <p className="gwui-wa-sub">Business account</p>
        </span>
      </div>
      <div className="gwui-wa-body">
        {TURNS.map((t, i) => (
          <p key={i} className={`gwui-wa-bubble ${t.mine ? 'gwui-wa-bubble-mine' : 'gwui-wa-bubble-them'}`}>{t.text}</p>
        ))}
      </div>
    </div>
  )
}
