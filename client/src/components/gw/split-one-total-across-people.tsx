import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi } from '@/api/board'

/**
 * DROP THE EXPORT IN AND GET THE NUMBERS BACK.
 *
 * A chief of staff with ten salespeople and one committed total asked the check-in for each
 * person's number four times. It restated the question twice, then listed the inputs and called
 * them targets, then gave three names out of ten. She ended up with nothing, and typing ten people
 * into a chat box was never the job anyway.
 *
 * So: paste the CSV your CRM already exports, say the total, and read ten numbers with the reason
 * beside each. Nothing is saved. She is going to argue with these in front of the people they
 * belong to, so she changes them first and then sets each one through the ordinary control, which
 * is also what keeps every target something a person chose rather than a formula assigned.
 *
 * WHAT IT READ IS SHOWN BEFORE WHAT IT CONCLUDED. A wrong column is the likeliest thing to go
 * wrong with a pasted file and the hardest to spot in a number, so the count of people it found
 * and anything it could not find sit above the table.
 */
const box: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--gw-border)',
  fontSize: 13, fontFamily: 'inherit', background: 'var(--gw-card)', color: 'var(--gw-text)',
}

/** A pasted CSV or a spreadsheet copy. Tabs and commas both, because both are what people paste. */
export function rowsFromPaste(text: string): (string | number | null)[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim().replace(/^"|"$/g, '')))
}

export function SplitOneTotalAcrossPeople({ groundId }: { groundId: string }) {
  const [total, setTotal] = useState('')
  const [paste, setPaste] = useState('')
  const [open, setOpen] = useState(false)

  const propose = useMutation({
    mutationFn: () => boardApi.proposeObjectives(groundId, { total: Number(total), rows: rowsFromPaste(paste) }),
    onError: () => toast.error('That did not come back. What you pasted is still here - try again.'),
  })
  const out = propose.data

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)',
          cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', marginBottom: 10,
        }}
      >
        Split one total across people
      </button>
    )
  }

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: 16, marginBottom: 10, background: 'var(--gw-card)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 4 }}>Split one total across people</div>
      <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '0 0 12px', lineHeight: 1.55, maxWidth: '68ch' }}>
        Paste the export your CRM already gives you. First row the headings, then one row per
        person: their name, what they closed, and how long they have been doing the job. Nothing is
        saved here.
      </p>

      <div style={{ display: 'grid', gap: 9 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-sub)' }}>
          The number the whole team has to reach
          <input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" placeholder="270" style={{ ...box, width: 140 }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-sub)' }}>
          The export
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={6}
            placeholder={'Sales Rep, Units Closed, Months With Us\nMusa, 31, 4 years\nAmina, 14, 11 months'}
            style={{ ...box, resize: 'vertical' }}
          />
        </label>
        <button
          onClick={() => propose.mutate()}
          disabled={!total.trim() || !paste.trim() || propose.isPending}
          style={{
            justifySelf: 'start', padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700,
            fontFamily: 'inherit', cursor: 'pointer',
            opacity: !total.trim() || !paste.trim() || propose.isPending ? 0.5 : 1,
          }}
        >
          {propose.isPending ? 'Working it out…' : 'Show me the numbers'}
        </button>
      </div>

      {out && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--gw-border)' }}>
          {/* What it read, above what it concluded. A wrong column is the likeliest fault and the
              hardest to see in a number. */}
          {out.readFromTheFile && (
            <p style={{ fontSize: 12, color: out.readFromTheFile.missing.length ? 'var(--gw-amber-t)' : 'var(--gw-sub)', margin: '0 0 10px', lineHeight: 1.5 }}>
              Read {out.readFromTheFile.people} {out.readFromTheFile.people === 1 ? 'person' : 'people'}
              {out.readFromTheFile.skipped ? `, skipped ${out.readFromTheFile.skipped} row${out.readFromTheFile.skipped === 1 ? '' : 's'} with nothing in them` : ''}
              {out.readFromTheFile.missing.length ? `. No column for: ${out.readFromTheFile.missing.join(', ')}.` : '.'}
            </p>
          )}

          <div style={{ display: 'grid', gap: 11 }}>
            {out.shares.map((s) => (
              <div key={s.key}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)' }}>{s.key}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-dark)', fontVariantNumeric: 'tabular-nums' }}>{s.target}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, maxWidth: '68ch' }}>
                  {s.because}
                  {/* Said where it matters: a tenure nobody gave was read as a full year, and that
                      moved this person's number. */}
                  {!s.monthsKnown && <span style={{ color: 'var(--gw-amber-t)' }}> Tenure was not in the file, so this reads them as a full year.</span>}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--gw-text)', marginTop: 12, lineHeight: 1.55, maxWidth: '68ch' }}>{out.saying}</p>
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 6, lineHeight: 1.5, maxWidth: '68ch' }}>
            Add the ones you want below, and say whose each is. Nothing here has been saved.
          </p>
        </div>
      )}
    </div>
  )
}
