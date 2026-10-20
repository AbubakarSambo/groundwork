import './pictured-board.css'
import { useState } from 'react'

/**
 * THE DIRECT MORNING AT THE TOP OF THE LEAD'S BOARD (Hafsah, 20 October 2026; api engagement/the-direct-morning.ts).
 *
 * The link in her morning summary opens her board, and the board opens at the same picture: the same four parts, in the same order
 * (the target, what needs you, what is about to close, your team), then the rest of the board as it is. The server serves
 * `theMorning` only to the lead who runs the check-in, and only where her organisation's switch is on; with it absent nothing here is
 * drawn and the board reads as before. Every deal is one tap away: customer, who has it, amount, stage and close date.
 */
type Any = any

export interface TheMorningServed {
  groundId: string
  kind: 'sales' | 'collections' | 'matter'
  parts: { key: 'target' | 'needsYou' | 'closing' | 'team'; heading: string; lines: string[] }[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const aDay = (iso: string | null | undefined): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : null
}

/** The deals as the board serves them to the lead, one row each: customer, who has it, amount, stage and close date. */
export function theDealsInOneList(b: Any): { name: string; owner: string; amount: string; stage: string; closes: string }[] {
  const rows: Any[] = ((b?.workRecords ?? []) as Any[]).filter((s) => s?.section === 'Deal grid').flatMap((s) => s.rows ?? []).filter((r: Any) => (r.kind ?? 'deal') === 'deal')
  return rows.map((r) => ({
    name: String(r.name ?? ''),
    owner: String(r.owner ?? '').trim().split(/\s+/)[0] || 'Nobody yet',
    amount: String(r.value ?? r.fields?.Value ?? r.fields?.Quoted ?? '').trim() || 'Not said',
    stage: String(r.stage ?? '').trim() || 'Not said',
    closes: aDay(r.buyingDate) ?? (/^won$/i.test(String(r.stage ?? '')) ? 'Closed' : 'Not said'),
  }))
}

export function TheMorningAtTheTop({ m, b }: { m: TheMorningServed; b: Any }) {
  const [open, setOpen] = useState(false)
  const deals = m.kind === 'sales' ? theDealsInOneList(b) : []
  return (
    <section className="pb pb-morning" aria-label="This morning" data-the-morning={m.kind}>
      {m.parts.map((p, i) => (
        <div key={p.key} className="pb-morning-part" data-part={p.key}>
          {i === 0 ? <p className="pb-q">{p.heading}</p> : <h2 className="pb-card-h">{p.heading}</h2>}
          {p.lines.map((l) => <p key={l} className={i === 0 ? 'pb-answer' : 'gwui-panel-text'}>{l}</p>)}
        </div>
      ))}
      {deals.length > 0 && (
        <div className="pb-morning-deals">
          <button type="button" className="gwui-btn" aria-expanded={open} onClick={() => setOpen((x) => !x)}>
            {open ? 'Hide the deals' : `See all ${deals.length} deals`}
          </button>
          {open && (
            <div className="pb-grid">
              <table>
                <thead>
                  <tr><th>Customer</th><th>Who has it</th><th>Amount</th><th>Stage</th><th>Closes</th></tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.name}><td>{d.name}</td><td>{d.owner}</td><td>{d.amount}</td><td>{d.stage}</td><td>{d.closes}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
