import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { Sec } from './kit'

/**
 * ONE SESSION'S SHARED REPORT, IN THE SHAPE WE PROMISED A CLIENT.
 *
 * "I need the forming sessions report(s) to take the same shape we promised the client for each
 * session - specificity, alignment, etc."
 *
 * The same headings every session, in the order the promise makes them, whether it is session one
 * or session nine and whether the round is still open or closed. A section with nothing in it says
 * why rather than disappearing - a heading that comes and goes teaches a client that the product
 * is inconsistent, and "nobody named a risk this session" is itself a finding.
 *
 * Everything here is assembled server-side from what people actually said, typed at extraction.
 * Nothing on this screen was asked of a model.
 */
export function TheSessionsReport({ groundId, sessionNumber }: { groundId: string; sessionNumber: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })

  if (isLoading) return <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Reading this session…</div>
  if (isError || !data) return null

  const final = data.state === 'final'

  return (
    <div>
      {/* WHAT STATE THIS IS IN, said before anything it contains. A forming report and a final one
          are different promises, and a reader who cannot tell them apart cannot use either. */}
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          border: '1px solid var(--gw-border)', borderLeft: `3px solid ${final ? 'var(--gw-green-b)' : 'var(--gw-amber-b)'}`,
          borderRadius: 8, padding: '10px 13px', marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12.5, color: 'var(--gw-text)', fontWeight: 700 }}>
          {final ? `Session ${data.sessionNumber} · final` : `Session ${data.sessionNumber} · still forming`}
        </span>
        <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
          {final
            ? `Closed ${data.takenAt ? new Date(data.takenAt).toLocaleDateString() : ''}. This does not change.`
            : 'People are still answering, so this moves. It never invents agreement that is not there.'}
        </span>
      </div>

      {data.amendedNote && (
        <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, lineHeight: 1.55 }}>
          {data.amendedNote}
        </div>
      )}

      {/*
        WHO THIS REPORT IS COUNTING, at the top, named.

        "You see who's checked in, the report is counting." Before this, the count lived on the tab
        above the report and the reveal state lived in a row that named people by position - "not
        yet, Party 2" - which tells a lead nothing they can act on. Both are here, on the report
        they are about, with the report's own labels.
      */}
      {data.counting.length > 0 && (
        <>
          <Sec title="Who this is counting" src="every party this report waits for" />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
            {data.counting.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
                  padding: '8px 12px', fontSize: 12.5,
                  borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined,
                }}
              >
                <span style={{ color: 'var(--gw-text)' }}>{c.isYou ? `${c.who} (you)` : c.who}</span>
                <span style={{ color: c.answered ? 'var(--gw-green-t)' : 'var(--gw-muted)', flexShrink: 0 }}>
                  {!c.answered
                    ? 'Not answered yet'
                    : c.hasShownTheirs
                      ? 'Answered, and shown theirs'
                      : 'Answered'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Sec title="Where things stand" src="counted from the areas the accounts name" />
      <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 14 }}>
        {data.whereThingsStand.saying}
      </div>

      {data.sharedPicture && (
        <>
          <Sec title="The picture from the accounts" />
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, marginBottom: 14 }}>
            {data.sharedPicture}
          </div>
        </>
      )}

      {data.sections.map((s) => (
        <div key={s.title} style={{ marginBottom: 14 }}>
          <Sec title={s.title} src={s.about} />
          {s.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.items.map((it, i) => (
                <div key={i} style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6, borderBottom: '1px solid var(--gw-border)', paddingBottom: 6 }}>
                  {it.text}
                  {(it.who || it.documented) && (
                    <span style={{ color: 'var(--gw-muted)', fontSize: 11.5 }}>
                      {it.who ? ` — ${it.who}` : ''}
                      {it.documented ? ' · from a document' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{s.saying}</div>
          )}
        </div>
      ))}

      <Sec title="How clear the accounts were" src="a report can only be as specific as what it was given" />
      <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 14 }}>
        {data.howClearThisWas.saying}
      </div>

      {data.theConversationWorthHaving && (
        <>
          <Sec title="The conversation worth having now" />
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, marginBottom: 10 }}>
            {data.theConversationWorthHaving}
          </div>
        </>
      )}

      {!data.showsEverybody && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.6, borderTop: '1px solid var(--gw-border)', paddingTop: 10 }}>
          Until the shared report is out, the words above are your own. The counts are from
          everybody's accounts; nobody else's wording reaches you and yours does not reach them.
        </div>
      )}
    </div>
  )
}
