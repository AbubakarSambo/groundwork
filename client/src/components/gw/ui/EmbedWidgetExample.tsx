import { useACheckInTakes } from '@/lib/how-long-setup-takes'
import './gw-ui.css'

/**
 * "THE PANEL ON YOUR OWN PAGE" (F1-connections/tools.txt: "Show Groundwork inside your own tool").
 *
 * BOARD REVIEW, GROUP 1: `IntegrationsPage.tsx` showed `/connect/panel.png` beside the Ops Console
 * picture - an actual screenshot naming a real person ("Hafsah Jumare") and a real company
 * ("Coamana CRM"), to every organisation. Redrawn here in markup, with the same made-up company
 * and people `OpsConsoleExample` uses (Eastside Foods, Aisha), so the two illustrations read as
 * one consistent example rather than two different, unrelated screenshots.
 */
const DEALS: { account: string; stage: 'Proposal' | 'Qualified'; value: string; next: string }[] = [
  { account: 'Riverside Traders', stage: 'Qualified', value: '$4,200', next: 'Send the quote' },
  { account: 'Nyota Foods', stage: 'Proposal', value: '$1,900', next: 'Site visit' },
  { account: 'Kaskazini Stores', stage: 'Qualified', value: '$3,100', next: 'Sign-off' },
]

export function EmbedWidgetExample() {
  /* How long a check-in takes, from the server's one owner (lib/how-long-setup-takes.ts). */
  const takes = useACheckInTakes()
  return (
    <div className="gwui-console" role="img" aria-label="An example of Groundwork's chat panel embedded on the side of a company's own page, next to that company's own deals">
      <div className="gwui-console-head">
        <span>Eastside Foods CRM</span>
        <span>Aisha</span>
      </div>
      <div className="gwui-embed-split">
        <div className="gwui-embed-host">
          <p className="gwui-embed-host-title">Deals this week</p>
          <div className="gwui-embed-table">
            {DEALS.map((d) => (
              <div className="gwui-embed-row" key={d.account}>
                <span className="gwui-embed-cell gwui-embed-cell-name">{d.account}</span>
                <span className={`gwui-embed-cell gwui-embed-cell-stage ${d.stage === 'Qualified' ? 'gwui-embed-cell-stage-on' : ''}`}>{d.stage}</span>
                <span className="gwui-embed-cell">{d.value}</span>
                <span className="gwui-embed-cell">{d.next}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="gwui-embed-widget">
          <div className="gwui-embed-widget-head">
            <span className="gwui-embed-widget-brand">GROUNDWORK</span>
            <span>Aisha</span>
          </div>
          <p className="gwui-embed-widget-msg">
            Your sales check-in for this week is open.{takes ? ` ${takes}, and what you say is shared with the rest of the team once everyone has answered.` : ''}
          </p>
          <div className="gwui-embed-widget-replies">
            <span className="gwui-embed-widget-reply">Start it</span>
            <span className="gwui-embed-widget-reply">What is due?</span>
          </div>
        </div>
      </div>
      <p className="gwui-console-foot">Signed in as Aisha. She sees what she would see in Groundwork, and nothing more.</p>
    </div>
  )
}
