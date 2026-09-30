import './gw-ui.css'

/**
 * "HOW IT LOOKS INSIDE YOUR TOOL" (F1-connections, tools.jpg and connections.jpg).
 *
 * BOARD REVIEW, GROUP 1: the two pages that carried this illustration (`ConnectionsPage.tsx`,
 * `IntegrationsPage.tsx`) both showed `/connect/ops-panel.png` - an actual screenshot of a real
 * person's real operations console - to every organisation, under the note "An example:
 * <the reader's own organisation>'s own operations console". That named a real person, a real
 * company, and falsely claimed the picture was the reader's own tool.
 *
 * The prototype's own screens draw this as an illustration, not a photograph: a made-up company
 * ("Baridi Ops Console"), a made-up person ("Grace Achieng"), and made-up deals ("Eastside
 * Foods", "Westgate Deli", "Green Mart", each with its own salesperson). This redraws exactly
 * that, in markup, from `gw-ui.css`'s own classes - so it is honestly an illustration, and never
 * depends on which organisation is looking at it.
 */
const STAGES = ['Contacted', 'Need', 'Pitched', 'Qualified', 'Quoted']

const DEALS: { company: string; person: string; stagesReached: number }[] = [
  { company: 'Eastside Foods', person: 'Aisha', stagesReached: 4 },
  { company: 'Westgate Deli', person: 'Miriam', stagesReached: 2 },
  { company: 'Green Mart', person: 'Miriam', stagesReached: 4 },
]

export function OpsConsoleExample() {
  return (
    <div className="gwui-console" role="img" aria-label="An example operations console, showing Groundwork's sales team check-in alongside a company's own orders, stock, deliveries and customers">
      <div className="gwui-console-head">
        <span>Baridi Ops Console</span>
        <span>Grace Achieng</span>
      </div>
      <div className="gwui-console-body">
        <nav className="gwui-console-nav">
          <span className="gwui-console-nav-item">Orders</span>
          <span className="gwui-console-nav-item">Stock</span>
          <span className="gwui-console-nav-item">Deliveries</span>
          <span className="gwui-console-nav-item">Customers</span>
          <span className="gwui-console-nav-item gwui-console-nav-item-active">Team check-ins</span>
        </nav>
        <div className="gwui-console-main">
          <div className="gwui-console-main-head">
            <p className="gwui-console-main-title">Sales team, Q3</p>
            <span className="gwui-console-main-from">From Groundwork</span>
          </div>
          <p className="gwui-console-main-sub">23 of 25 sales, on what the proof shows today.</p>
          {DEALS.map((d) => (
            <div className="gwui-console-deal" key={d.company}>
              <p className="gwui-console-deal-company">{d.company}</p>
              <p className="gwui-console-deal-person">{d.person}</p>
              <div className="gwui-console-dots">
                {STAGES.flatMap((s, i) => [
                  <span key={s} className={`gwui-console-dot ${i < d.stagesReached ? 'gwui-console-dot-on' : ''}`} />,
                  i < STAGES.length - 1 && (
                    <span key={`${s}-line`} className={`gwui-console-dot-line ${i < d.stagesReached - 1 ? 'gwui-console-dot-line-on' : ''}`} />
                  ),
                ])}
              </div>
              <div className="gwui-console-stage-names">
                {STAGES.map((s) => <span className="gwui-console-stage-name" key={s}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="gwui-console-foot">Signed in as Grace Achieng. She sees what she would see in Groundwork, and nothing more.</p>
    </div>
  )
}
