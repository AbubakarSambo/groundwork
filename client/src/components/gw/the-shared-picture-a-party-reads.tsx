import { TwoAccountsSideBySide, Folded } from './two-accounts-side-by-side'
import { WhatToSettleTogether } from './what-to-settle-together'

/**
 * THE SHARED REPORT, FOR THE PEOPLE IN IT.
 *
 * Every example report on the marketing page closes with "If you are one of the people in it, this
 * is your report too. The same one." It was not true. Once the report released, the party's Report
 * tab returned null: a button to the board and a list of their own sessions, and no report.
 *
 * So this renders the shared half - the picture, what is agreed, where accounts differ with both
 * sides and the evidence, and the one thing to settle. Nothing lead-only is here and nothing
 * lead-only is filtered here either: the server strips leadershipGaps, softSpots and the arc
 * advisories before the payload leaves, and it must stay that way. A client-side filter would mean
 * a person's browser receives findings about themselves and chooses not to draw them, which is
 * worse than the blank page this replaces.
 */
/* U.9 RE-REVIEW, ITEM A: a plain heading, not a shout ("WHAT CAME OUT OF IT"). */
const LABEL: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--gw-sub-d)', marginBottom: 10,
}
import { WhatTheNetworkSaid } from './WhatTheNetworkSaid'

const PROSE: React.CSSProperties = { fontSize: 13, lineHeight: 1.65, color: 'var(--gw-text)', maxWidth: '68ch' }

export function TheSharedPictureAPartyReads({ report }: { report: any }) {
  const agreements: any[] = report?.agreements ?? []
  const divergences: any[] = report?.divergences ?? []
  const picture: string | null = report?.sharedPicture ?? null
  /*
   * A HUNDRED ACCOUNTS COME FIRST, WHERE THERE ARE A HUNDRED.
   *
   * The block below is an alignment read - agreements and the gap - and it is capped at five
   * hundred words because that is right for two people. Where enough separate organisations
   * answered, the API writes a second read with its own shape and its own room, and that is the
   * one somebody opens the report for. It goes above, not below. See a-hundred-accounts-are-not-
   * two.ts and WhatTheNetworkSaid.
   */
  const network: any = report?.networkPicture ?? null
  if (!picture && !agreements.length && !divergences.length && !network) return null

  /* An agreement arrives as a string on some paths and an object on others, and either half of the
     object can itself be a list. A page must not assume which shape arrived. */
  const flat = (v: any): string => (typeof v === 'string' ? v.trim()
    : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ').trim() : '')
  /* U.9 re-review, item A: two clauses as one sentence, not joined with a dash. */
  const textOf = (a: any) => {
    if (typeof a === 'string') return a
    const topic = flat(a?.topic)
    const note = flat(a?.note)
    if (topic && note) return `${topic}${/[.!?]$/.test(topic) ? '' : '.'} ${note}`
    return topic || note
  }

  return (
    <>
    {network && <WhatTheNetworkSaid picture={network} />}
    {(picture || agreements.length || divergences.length) && (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>The shared picture</div>
        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 2 }}>
          Built from what each person said. If you are one of the people in it, this is your report too, and everyone reads the same one.
        </div>
      </div>

      {picture && (
        <div style={{ padding: '16px 20px' }}>
          <div style={LABEL}>What came out of it</div>
          <div style={PROSE}>{picture}</div>
        </div>
      )}

      {divergences.length > 0 && (
        <div style={{ padding: '4px 20px 16px' }}>
          <div style={{ ...LABEL, marginTop: 12 }}>
            Where answers differ ({divergences.length})
          </div>
          {divergences.map((d, i) => (
            <TwoAccountsSideBySide key={i} difference={d} />
          ))}
        </div>
      )}

      {agreements.length > 0 && (
        <div style={{ padding: '0 20px 8px' }}>
          <Folded summary={`${agreements.length} ${agreements.length === 1 ? 'thing you already see' : 'things you already see'} the same way`}>
            {agreements.map((a, i) => (
              <div key={i} style={{ ...PROSE, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                {textOf(a)}
              </div>
            ))}
          </Folded>
        </div>
      )}

      {flat(report?.centralQuestion) && (
        <div style={{ padding: '16px 20px', background: 'var(--gw-blue-bg)', borderTop: '1px solid var(--gw-border)' }}>
          <WhatToSettleTogether question={flat(report.centralQuestion)} />
        </div>
      )}
    </div>
    )}
    </>
  )
}
